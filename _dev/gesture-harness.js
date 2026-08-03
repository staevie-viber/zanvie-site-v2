// Arnes de gestos de scroll para a unificacao da maquina de estados.
// Observacao apenas: nao modifica o site, so le estado da instancia da logica.
// Funciona identicamente no codigo antigo (campos) e no novo (getters).
const { chromium } = require('playwright');
const fs = require('fs');

const OUT = process.argv[2] || 'trace';
const URL = 'http://localhost:8752/index.html';
const VP = { width: 1440, height: 900 };

// Overrides de props por variavel de ambiente, para rodar a suite inteira numa
// configuracao diferente sem tocar no site:
//   ZV_PROPS='{"timelineFreeScroll":true}' node gesture-harness.js saida
// Usa __dcSetProps, o canal oficial (support.js:1670). Mutar inst.props direto
// nao funciona: __userProps() devolve um objeto novo e a mutacao e descartada no
// proximo re-render. Desligado por padrao -- sem a variavel, nada muda.
const PROPS = process.env.ZV_PROPS ? JSON.parse(process.env.ZV_PROPS) : null;

// Instala window.__zv com a instancia e um amostrador por rAF que registra
// somente TRANSICOES (nao todo frame), para o traco ser robusto a jitter.
const PROBE = () => {
  const root = document.getElementById('dc-root');
  const key = Object.keys(root).find(k => k.startsWith('__reactContainer$') || k.startsWith('__reactFiber$'));
  const seen = new Set();
  const stack = [root[key]];
  let inst = null;
  while (stack.length) {
    const f = stack.pop();
    if (!f || seen.has(f)) continue;
    seen.add(f);
    const lg = f.stateNode && typeof f.stateNode === 'object' ? f.stateNode.logic : null;
    if (lg && typeof lg === 'object' && '_globeState' in lg) { inst = lg; break; }
    if (f.child) stack.push(f.child);
    if (f.sibling) stack.push(f.sibling);
  }
  if (!inst) throw new Error('instancia nao encontrada');

  const z = {
    inst,
    globeStates: [],   // sequencia de valores distintos de _globeState
    // timestamp (ms desde o inicio da amostragem) de cada mudanca de estado.
    // Permite medir quanto tempo cada estado ficou em exibicao -- necessario
    // para provar que o encadeamento nao "atravessa" os estados sem o usuario ver.
    globeStateTs: [],
    lockCycles: 0,     // contagem de false->true de _snapAnimating
    servCycles: 0,     // contagem de false->true de _servAnimating
    // INVARIANTE: serv=true significa que _animServ ou _navGo esta no ar, e
    // ambos setam _snapAnimating no MESMO instante. Logo (serv && !lock) so
    // ocorre se um timer velho abriu a trava com o dono ainda animando --
    // ou seja, e a assinatura exata da corrida de cross-unlock.
    // No modelo novo isso e estruturalmente impossivel: _servAnimating deriva
    // de _anim.owner, entao serv=true implica _anim!=null implica lock=true.
    inconsistent: 0,
    // Trava total: quantos frames a pagina passou travada e qual o maior desvio
    // de scrollY em relacao ao ponto de trava. Sob trava total o desvio tem de
    // ser 0 -- qualquer valor > 0 significa que algo furou a trava.
    lockedFrames: 0,
    maxDriftWhileLocked: 0,
    // Maior scrollY observado por rAF. Comparado com wTop, e a medida direta de
    // "a Timeline subiu?" durante a aproximacao ao ponto de pin.
    maxScrollY: 0,
    events: [],        // marcos com rotulo, para depuracao
    t0: performance.now(),
  };
  let prevGS = null, prevLock = null, prevServ = null;
  const tick = () => {
    z.raf = requestAnimationFrame(tick);
    const gs = inst._globeState == null ? 0 : inst._globeState;
    const lock = !!inst._snapAnimating;
    const serv = !!inst._servAnimating;
    if (gs !== prevGS) { z.globeStates.push(gs); z.globeStateTs.push(Math.round(performance.now() - z.t0)); prevGS = gs; }
    if (lock && prevLock === false) z.lockCycles++;
    if (serv && prevServ === false) z.servCycles++;
    if (serv && !lock) z.inconsistent++;
    if (window.scrollY > z.maxScrollY) z.maxScrollY = window.scrollY;
    if (inst._scrollLocked) {
      z.lockedFrames++;
      const drift = Math.abs(window.scrollY - inst._lockY);
      if (drift > z.maxDriftWhileLocked) z.maxDriftWhileLocked = drift;
    }
    prevLock = lock; prevServ = serv;
  };
  z.raf = requestAnimationFrame(tick);
  window.__zv = z;
};

const snapshot = () => {
  const z = window.__zv, i = z.inst;
  const stops = typeof i._snapStops === 'function' ? i._snapStops() : [0, 0];
  const y = window.scrollY;
  let nearest = 'fora';
  if (Math.abs(y - stops[0]) < 3) nearest = 'gTop';
  else if (Math.abs(y - stops[1]) < 3) nearest = 'wTop';
  else if (y < stops[0]) nearest = 'acimaDeGTop';
  else if (y > stops[1]) nearest = 'abaixoDeWTop';
  return {
    globeStates: z.globeStates.slice(),
    globeStateTs: z.globeStateTs.slice(),
    lockCycles: z.lockCycles,
    servCycles: z.servCycles,
    inconsistent: z.inconsistent,
    finalGlobeState: i._globeState == null ? 0 : i._globeState,
    finalLock: !!i._snapAnimating,
    finalServAnimating: !!i._servAnimating,
    finalServCovered: !!i._servCovered,
    scrollBehavior: document.documentElement.style.scrollBehavior,
    scrollY: Math.round(y),
    restingAt: nearest,
    stops: stops.map(Math.round),
    // Trava total
    lockedFrames: z.lockedFrames,
    maxDriftWhileLocked: Math.round(z.maxDriftWhileLocked),
    maxScrollY: Math.round(z.maxScrollY),
    scrollLockedAoFim: !!i._scrollLocked,
    // Vazamento de estilo: os 3 tem de voltar a "" quando destravado.
    estilosResiduais: {
      overflow: document.documentElement.style.overflow,
      touchAction: document.documentElement.style.touchAction,
      overscrollBehavior: document.documentElement.style.overscrollBehavior,
      paddingRight: document.documentElement.style.paddingRight,
    },
  };
};

async function newPage(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: VP, hasTouch: !!opts.touch });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
  page.__errors = errors;
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  if (PROPS) {
    // Antes do PROBE: o override dispara re-render, e queremos amostrar ja na
    // configuracao final.
    await page.evaluate((p) => window.__dcSetProps(window.__dcRootName(), p), PROPS);
    await page.waitForTimeout(500);
    // _layoutStack NAO e chamado por _applyAllTweaks -- so no mount, no resize e
    // pelo ResizeObserver. Sem este empurrao, um tweak de GEOMETRIA (ex.:
    // servicosFreeScroll) ficaria setado mas sem efeito, e a corrida mediria o
    // layout antigo achando que testou o novo. Em producao nao ocorre: o default
    // ja esta no data-props quando _layoutStack roda no mount.
    await page.evaluate(() => {
      const root = document.getElementById('dc-root');
      const key = Object.keys(root).find(k => k.startsWith('__reactContainer$') || k.startsWith('__reactFiber$'));
      const seen = new Set(); const stack = [root[key]];
      while (stack.length) {
        const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f);
        const lg = f.stateNode && typeof f.stateNode === 'object' ? f.stateNode.logic : null;
        if (lg && '_globeState' in lg) { if (lg._layoutStack) lg._layoutStack(); return; }
        if (f.child) stack.push(f.child); if (f.sibling) stack.push(f.sibling);
      }
    });
    await page.waitForTimeout(400);
  }
  await page.evaluate(PROBE);
  // Confirma que o override pegou de fato -- prop silenciosamente descartada
  // invalidaria a corrida inteira sem dar sinal.
  if (PROPS) {
    const vivo = await page.evaluate((ks) => {
      const o = {}; for (const k of ks) o[k] = window.__zv.inst.props[k]; return o;
    }, Object.keys(PROPS));
    for (const k of Object.keys(PROPS)) {
      if (JSON.stringify(vivo[k]) !== JSON.stringify(PROPS[k])) {
        throw new Error('override de prop nao pegou: ' + k + ' esperado ' +
          JSON.stringify(PROPS[k]) + ', lido ' + JSON.stringify(vivo[k]));
      }
    }
  }
  return page;
}

// Posiciona no stop de entrada do globo (gTop) sem usar gestos.
async function toGlobeEntry(page) {
  await page.evaluate(() => {
    const s = window.__zv.inst._snapStops();
    window.scrollTo(0, s[0]);
  });
  await page.waitForTimeout(700);
  // zera o historico acumulado no posicionamento
  await page.evaluate(() => {
    const z = window.__zv;
    z.globeStates.length = 0; z.globeStateTs.length = 0;
    z.lockCycles = 0; z.servCycles = 0; z.inconsistent = 0;
    z.t0 = performance.now();
    z.globeStates.push(z.inst._globeState == null ? 0 : z.inst._globeState);
    z.globeStateTs.push(0);
  });
}

const scenarios = {
  // A: wheel lento e deliberado, descendo pelos 4 estados e voltando.
  async A(browser) {
    const page = await newPage(browser);
    for (let i = 0; i < 2; i++) { await page.mouse.wheel(0, 600); await page.waitForTimeout(1000); }
    for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 500); await page.waitForTimeout(1100); }
    await page.mouse.wheel(0, 600); await page.waitForTimeout(1200);
    // volta
    for (let i = 0; i < 5; i++) { await page.mouse.wheel(0, -600); await page.waitForTimeout(1100); }
    const s = await page.evaluate(snapshot);
    s.errors = page.__errors; await page.context().close(); return s;
  },

  // B: rajada real de 10 wheel no MESMO tick (despacho sintetico em pagina).
  // Com page.mouse.wheel o roundtrip do CDP (~80ms/evento) estoura a janela de
  // trava de 890ms e o resultado fica nao-deterministico; o despacho sintetico
  // testa de fato "rajada mais rapida que a trava".
  async B(browser) {
    const page = await newPage(browser);
    await toGlobeEntry(page);
    await page.evaluate(() => {
      for (let i = 0; i < 10; i++) {
        window.dispatchEvent(new WheelEvent('wheel', { deltaY: 500, bubbles: true, cancelable: true }));
      }
    });
    await page.waitForTimeout(2500);
    const s = await page.evaluate(snapshot);
    s.errors = page.__errors; await page.context().close(); return s;
  },

  // C: wheel disparado no meio de uma transicao de estado do globo.
  async C(browser) {
    const page = await newPage(browser);
    await toGlobeEntry(page);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(100);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(2000);
    const s = await page.evaluate(snapshot);
    s.errors = page.__errors; await page.context().close(); return s;
  },

  // D: clique na navbar durante _globeGo ativo + wheel na janela de cross-unlock.
  // No codigo antigo o timer do globo (dur+40=790ms) destrava enquanto _navGo
  // (1300ms) ainda anima; o wheel em 900ms cai nessa fresta.
  async D(browser) {
    const page = await newPage(browser);
    await toGlobeEntry(page);
    await page.mouse.wheel(0, 500);          // inicia _globeGo
    await page.waitForTimeout(100);
    await page.click('#zv-pill-2');           // inicia _navGo por cima
    await page.waitForTimeout(800);           // t~900ms: dentro da fresta antiga
    const midFlight = await page.evaluate(() => ({
      lock: !!window.__zv.inst._snapAnimating,
      serv: !!window.__zv.inst._servAnimating,
      sb: document.documentElement.style.scrollBehavior,
    }));
    await page.mouse.wheel(0, 500);           // seria aceito no codigo antigo
    await page.waitForTimeout(2500);
    const s = await page.evaluate(snapshot);
    s.midFlight = midFlight;
    s.errors = page.__errors; await page.context().close(); return s;
  },

  // D2: a corrida de cross-unlock propriamente dita.
  // Com os defaults (globo 850ms -> trava ate 890ms; nav 550ms) a sobreposicao
  // nao produz divergencia observavel. Mas AMBAS as duracoes sao tweaks
  // editaveis; nesta config -- globo no minimo (200) e nav no maximo (3000),
  // dentro do range permitido de cada uma -- o timer do globo (240ms) dispara
  // no meio da animacao do nav (3000ms):
  //   ANTIGO: o timer velho zera _snapAnimating => trava aberta em pleno voo.
  //   NOVO:   _endAnim(tokenGlobo) e ignorado (token nao confere) => trava mantida.
  async D2(browser) {
    const page = await newPage(browser);
    // Canal oficial do runtime (o mesmo que o editor usa). Mutar inst.props
    // direto NAO funciona: __userProps() devolve objeto novo a cada render e
    // a mutacao e descartada no primeiro re-render.
    // globo=800 (timer em 840ms) e nav=3000: a latencia do page.click varia
    // entre ~50 e ~300ms, entao o nav comeca no maximo em ~350ms e termina em
    // ~3350ms. O timer do globo em 840ms cai com folga DENTRO desse voo em
    // qualquer cenario de latencia -- diferente de globo=200 (timer em 240ms),
    // que ora caia antes ora depois do inicio do nav e produzia resultado
    // nao-deterministico. Ambos os valores seguem dentro do range do editor.
    await page.evaluate(() => {
      window.__dcSetProps(window.__dcRootName(), {
        globeStateTransitionDuration: 800,
        navScrollDuration: 3000,
      });
    });
    await page.waitForTimeout(400);
    // confirma que o override pegou de fato
    const applied = await page.evaluate(() => ({
      globe: window.__zv.inst.props.globeStateTransitionDuration,
      nav: window.__zv.inst.props.navScrollDuration,
    }));
    if (applied.globe !== 800 || applied.nav !== 3000) {
      await page.context().close();
      throw new Error('override de props nao aplicou: ' + JSON.stringify(applied));
    }
    await toGlobeEntry(page);
    const gTop = await page.evaluate(() => window.__zv.inst._snapStops()[0]);
    await page.mouse.wheel(0, 500);      // _globeGo, timer em dur+40 = 240ms
    await page.waitForTimeout(50);
    await page.click('#zv-pill-3');       // _navGo por cima, dura 3000ms
    // Sintoma visivel: com a trava aberta em pleno voo, a trava dura do
    // _onScroll puxa a pagina de volta a gTop a cada frame e o nav nao anda.
    // Amostra o avanco do scroll no meio do voo do nav.
    await page.waitForTimeout(1500);
    const midNavScrollY = await page.evaluate(() => Math.round(window.scrollY));
    await page.waitForTimeout(3000);
    const s = await page.evaluate(snapshot);
    s.gTop = Math.round(gTop);
    s.midNavScrollY = midNavScrollY;
    s.navProgrediuNoMeioDoVoo = midNavScrollY > Math.round(gTop) + 10;
    s.errors = page.__errors; await page.context().close(); return s;
  },

  // E: ArrowDown repetido em alta frequencia.
  async E(browser) {
    const page = await newPage(browser);
    await toGlobeEntry(page);
    for (let i = 0; i < 8; i++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(50); }
    await page.waitForTimeout(2500);
    const s = await page.evaluate(snapshot);
    s.errors = page.__errors; await page.context().close(); return s;
  },

  // F: swipes de toque consecutivos.
  async F(browser) {
    const page = await newPage(browser, { touch: true });
    await toGlobeEntry(page);
    const cdp = await page.context().newCDPSession(page);
    const swipe = async () => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 700, y: 600 }] });
      for (const y of [520, 440, 360, 300]) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 700, y }] });
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    for (let i = 0; i < 3; i++) { await swipe(); await page.waitForTimeout(1100); }
    await page.waitForTimeout(1500);
    const s = await page.evaluate(snapshot);
    s.errors = page.__errors; await page.context().close(); return s;
  },

  // G: round-trip completo ate o rodape e de volta ao topo.
  async G(browser) {
    const page = await newPage(browser);
    for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, 700); await page.waitForTimeout(700); }
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(900);
    const atBottom = await page.evaluate(snapshot);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1400);
    const s = await page.evaluate(snapshot);
    s.atBottom = { globeState: atBottom.finalGlobeState, servCovered: atBottom.finalServCovered, sb: atBottom.scrollBehavior };
    s.errors = page.__errors; await page.context().close(); return s;
  },

  // ===== Cenarios da TRAVA TOTAL =====

  // I: rajada de 20 wheel no mesmo tick sobre o ponto de pin. Analogo testavel
  // do bug 1 (PC, scroll rapido): a pagina nao pode andar um pixel e o globo
  // deve avancar EXATAMENTE um estado.
  async I(browser) {
    const page = await newPage(browser);
    await toGlobeEntry(page);
    await page.evaluate(() => {
      for (let i = 0; i < 20; i++) {
        window.dispatchEvent(new WheelEvent('wheel', { deltaY: 600, bubbles: true, cancelable: true }));
      }
    });
    await page.waitForTimeout(2500);
    const s = await page.evaluate(snapshot);
    s.errors = page.__errors; await page.context().close(); return s;
  },

  // J: scroll programatico forcado durante a trava (aproximacao grosseira de
  // inercia -- nao substitui o teste em aparelho real). A pagina nao pode sair
  // do ponto de trava.
  async J(browser) {
    const page = await newPage(browser);
    await toGlobeEntry(page);
    const travouAntes = await page.evaluate(() => !!window.__zv.inst._scrollLocked);
    await page.evaluate(() => {
      const alvo = window.__zv.inst._lockY + 900;
      for (let i = 0; i < 10; i++) window.scrollTo(0, alvo);
    });
    await page.waitForTimeout(600);
    const yDepois = await page.evaluate(() => Math.round(window.scrollY));
    const s = await page.evaluate(snapshot);
    s.travouAoChegar = travouAntes;
    s.scrollYAposForcar = yDepois;
    s.errors = page.__errors; await page.context().close(); return s;
  },

  // K: descer a sequencia inteira, liberar, e voltar subindo. Ataca o bug 3:
  // ao reentrar por baixo o globo tem de assumir o estado 3 deterministicamente.
  async K(browser) {
    const page = await newPage(browser);
    await toGlobeEntry(page);
    const wheel = (dy) => page.evaluate((d) => {
      window.dispatchEvent(new WheelEvent('wheel', { deltaY: d, bubbles: true, cancelable: true }));
    }, dy);
    // 4 gestos: estados 0->1->2->3 (o 1o gesto ja chega com estado 0 travado)
    for (let i = 0; i < 3; i++) { await wheel(600); await page.waitForTimeout(1100); }
    const aposSequencia = await page.evaluate(() => window.__zv.inst._globeState);
    // 4o gesto para baixo: esgota a sequencia => libera + snap ate a Timeline
    await wheel(600);
    await page.waitForTimeout(1800);
    const aposLiberar = await page.evaluate(() => ({
      gs: window.__zv.inst._globeState,
      y: Math.round(window.scrollY),
      travado: !!window.__zv.inst._scrollLocked,
    }));
    // Agora sobe de volta cruzando o ponto de pin
    await page.evaluate(() => window.scrollTo(0, window.__zv.inst._snapStops()[0] - 300));
    await page.waitForTimeout(900);
    const aoReentrarPorBaixo = await page.evaluate(() => ({
      gs: window.__zv.inst._globeState,
      travado: !!window.__zv.inst._scrollLocked,
      y: Math.round(window.scrollY),
    }));
    const s = await page.evaluate(snapshot);
    s.aposSequencia = aposSequencia;
    s.aposLiberar = aposLiberar;
    s.aoReentrarPorBaixo = aoReentrarPorBaixo;
    s.errors = page.__errors; await page.context().close(); return s;
  },

  // L: clique na navbar durante a trava -- tem de destravar e navegar,
  // sem deixar a pagina presa nem estilo residual.
  async L(browser) {
    const page = await newPage(browser);
    await toGlobeEntry(page);
    const travouAntes = await page.evaluate(() => !!window.__zv.inst._scrollLocked);
    await page.click('#zv-pill-3');
    await page.waitForTimeout(2000);
    const s = await page.evaluate(snapshot);
    s.travouAntesDoClique = travouAntes;
    s.errors = page.__errors; await page.context().close(); return s;
  },

  // M: rajada REAL de roda cruzando o ponto de pin, vindo da Hero.
  // Diferente do cenario I (dispatchEvent sintetico, que nao rola a pagina),
  // aqui page.mouse.wheel rola de verdade -- e o unico jeito de exercitar a
  // corrida entre o evento wheel e o evento scroll, que e a causa do bug de
  // desktop. Asserçao central: maxScrollY nunca alcanca wTop, ou seja, a
  // Timeline nao chegou a subir.
  async M(browser) {
    const page = await newPage(browser);
    const st = await page.evaluate(() => window.__zv.inst._snapStops());
    const [gTop, wTop] = st;

    // M1: um unico wheel de delta grande, saltando gTop de uma vez
    await page.evaluate((y) => window.scrollTo(0, y), gTop - 200);
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const z = window.__zv;
      // globeStateTs e servCycles TAMBEM precisam ser zerados: sem isso o
      // vetor de timestamps fica dessincronizado de globeStates (M reportava
      // [1,2] com 3 timestamps) e servCycles carrega contagem do setup.
      z.globeStates.length = 0; z.globeStateTs.length = 0;
      z.lockCycles = 0; z.servCycles = 0; z.inconsistent = 0;
      z.maxScrollY = 0; z.maxDriftWhileLocked = 0;
      z.t0 = performance.now();
    });
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(1200);
    const m1 = await page.evaluate(() => ({
      y: Math.round(window.scrollY),
      travado: !!window.__zv.inst._scrollLocked,
      gs: window.__zv.inst._globeState,
      maxY: Math.round(window.__zv.maxScrollY),
    }));

    // M2: rajada curta de wheels REAIS com a trava JA ENGATADA.
    // A travessia do pin fica por conta de M1; aqui o foco e a rajada em si.
    // Antes eram 6 wheels partindo de gTop-600, mas com a liberacao antecipada
    // isso virou nao-deterministico: cada page.mouse.wheel custa ~100-125ms de
    // roundtrip CDP, os primeiros eram consumidos pela travessia (a trava so
    // engata no evento de scroll seguinte) e os demais cruzavam os 382,5ms de R
    // -- globeStates oscilava entre [1] e [1,2] conforme a carga.
    // Reduzir para 2 partindo de longe tambem nao serve: nenhum gesto chegava a
    // _lockedStep e o cenario perdia a cobertura (globeStates ficava vazio).
    // Com a trava ja engatada, 3 wheels vao a ~250ms -- ~130ms de folga abaixo
    // de R: o 1o e honrado, os outros dois descartados. Deterministico e com a
    // semantica preservada ("rajada rapida nao atravessa os estados").
    // Alongar com pausas inverteria a assercao central: honrando todos os
    // gestos a sequencia chegaria ao estado 3, o proximo dispararia
    // _releaseGlobeSeq e a Timeline subiria de fato.
    await page.evaluate(() => { const i = window.__zv.inst; i._unlockScroll(); i._globeReleased = false; });
    await toGlobeEntry(page);
    await page.evaluate(() => { window.__zv.maxScrollY = 0; });
    for (let i = 0; i < 3; i++) await page.mouse.wheel(0, 400);
    await page.waitForTimeout(1500);
    const m2 = await page.evaluate(() => ({
      y: Math.round(window.scrollY),
      travado: !!window.__zv.inst._scrollLocked,
      gs: window.__zv.inst._globeState,
      maxY: Math.round(window.__zv.maxScrollY),
    }));

    const s = await page.evaluate(snapshot);
    s.gTop = Math.round(gTop); s.wTop = Math.round(wTop);
    s.m1 = m1; s.m2 = m2;
    s.timelineNaoSubiu = m1.maxY < wTop && m2.maxY < wTop;
    s.errors = page.__errors; await page.context().close(); return s;
  },

  // N: reproducao DETERMINISTICA do defeito, sem depender da corrida de tempo.
  // O cenario M nao consegue reproduzir: page.mouse.wheel tem ~80ms de roundtrip
  // CDP e o evento de scroll sempre dispara entre as rodadas. Entao aqui montamos
  // diretamente o ESTADO que a corrida produz -- sequencia do Globo em andamento,
  // pagina fora do ponto de pin, trava nao engatada e a borda de cruzamento ja
  // consumida (_lastScrollY alem de gTop) -- e perguntamos: a pagina consegue
  // escapar ate a Timeline?
  //   ANTIGO: nada reancora => wheel rola livre => Timeline sobe.
  //   NOVO:   clausula de recuperacao trava em gTop => Timeline nao sobe.
  async N(browser) {
    const page = await newPage(browser);
    const st = await page.evaluate(() => window.__zv.inst._snapStops());
    const [gTop, wTop] = st;

    await page.evaluate((g) => {
      const i = window.__zv.inst;
      i._unlockScroll();
      i._globeReleased = false;
      i._setGlobeState(1);        // sequencia ja iniciada (estado 1 de 3)
      // +600 poe a pagina ALEM do ponto medio entre gTop e wTop. E onde uma
      // rajada real deposita o scroll, e e o que importa: passando do meio,
      // _nearestStop devolve o ultimo stop e _onWheel sai sem preventDefault
      // (linha "idx >= last && dir > 0"), devolvendo o scroll ao browser.
      window.scrollTo(0, g + 600); // pagina escapou do pin
      i._lastScrollY = g + 600;    // borda de cruzamento consumida
    }, gTop);
    await page.waitForTimeout(400);

    const aposEscape = await page.evaluate(() => ({
      y: Math.round(window.scrollY),
      travado: !!window.__zv.inst._scrollLocked,
      gs: window.__zv.inst._globeState,
    }));

    // Agora tenta escapar rolando para baixo, como o usuario faria.
    // Sao 3 (nao 5) pelo mesmo motivo de M: com a liberacao antecipada do input
    // (R=382,5ms) uma rajada de 5 mouse.wheel a ~100-125ms cada vai a ~500ms e
    // CRUZA a fronteira -- globeStates oscilava entre [1,2] e [1,2,3] conforme a
    // carga. Com 3 o vao fica em ~250ms, abaixo de R, e o resultado e estavel.
    // A MONTAGEM do estado da corrida acima permanece intacta; muda so a fase
    // de tentativa de escape. Verificado que 3 wheels ainda sao suficientes
    // para o escape ocorrer no codigo defeituoso (pre-5a0c381).
    await page.evaluate(() => { window.__zv.maxScrollY = 0; });
    for (let i = 0; i < 3; i++) await page.mouse.wheel(0, 500);
    await page.waitForTimeout(1200);

    const aposTentarEscapar = await page.evaluate(() => ({
      y: Math.round(window.scrollY),
      travado: !!window.__zv.inst._scrollLocked,
      gs: window.__zv.inst._globeState,
      maxY: Math.round(window.__zv.maxScrollY),
    }));

    const s = await page.evaluate(snapshot);
    s.gTop = Math.round(gTop); s.wTop = Math.round(wTop);
    s.aposEscape = aposEscape;
    s.aposTentarEscapar = aposTentarEscapar;
    s.timelineNaoSubiu = aposTentarEscapar.maxY < wTop;
    s.errors = page.__errors; await page.context().close(); return s;
  },

  // ===== Cenarios da LIBERACAO ANTECIPADA DO INPUT =====
  // R = min(dur, max(250, dur*0.45)). Com dur=850 => 382ms.
  // Usam dispatchEvent sintetico: e deterministico (sem os ~80ms de roundtrip
  // do page.mouse.wheel, que tornariam os intervalos imprecisos justamente
  // onde a precisao importa).

  // O: 3 gestos encadeados a R+10ms. Deve percorrer 0->1->2->3 sem pular, e
  // cada estado deve ficar em exibicao tempo suficiente para ser percebido.
  async O(browser) {
    const page = await newPage(browser);
    await toGlobeEntry(page);
    const R = await page.evaluate(() => { const d = window.__zv.inst.props.globeStateTransitionDuration ?? 750; return Math.min(d, Math.max(250, d * 0.45)); });
    const wheel = () => page.evaluate(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: 600, bubbles: true, cancelable: true })));
    // Margem de 90ms sobre R: setTimeout garante atraso MINIMO, nao exato --
    // sob carga do rAF do three.js o timer de 382,5ms chega a disparar em
    // ~391ms (medido). Margens de 5-10ms ficavam abaixo desse jitter e tornavam
    // o resultado nao-deterministico. A assercao semantica nao muda.
    for (let i = 0; i < 3; i++) { await wheel(); await page.waitForTimeout(Math.round(R) + 90); }
    await page.waitForTimeout(1500);
    const s = await page.evaluate(snapshot);
    s.R = Math.round(R);
    // tempo de exibicao de cada estado = diferenca entre timestamps consecutivos
    s.dwell = s.globeStateTs.slice(1).map((t, i) => t - s.globeStateTs[i]);
    s.dwellMin = s.dwell.length ? Math.min(...s.dwell) : null;
    s.errors = page.__errors; await page.context().close(); return s;
  },

  // P: gesto na janela JA liberada (R+5ms). Deve ser HONRADO.
  // No codigo antigo (bloqueio 890ms) seria descartado -> divergencia exigida.
  async P(browser) {
    const page = await newPage(browser);
    await toGlobeEntry(page);
    const R = await page.evaluate(() => { const d = window.__zv.inst.props.globeStateTransitionDuration ?? 750; return Math.min(d, Math.max(250, d * 0.45)); });
    const wheel = () => page.evaluate(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: 600, bubbles: true, cancelable: true })));
    await wheel();
    // +90ms (nao +5): ver nota sobre o jitter do setTimeout nos cenarios
    // encadeados. Com +5 este cenario era cara-ou-coroa, embora o codigo
    // estivesse correto -- comprovado por instrumentacao direta.
    await page.waitForTimeout(Math.round(R) + 90);
    await wheel();
    await page.waitForTimeout(1600);
    const s = await page.evaluate(snapshot);
    s.R = Math.round(R);
    s.segundoGestoHonrado = s.globeStates.length >= 3;
    s.errors = page.__errors; await page.context().close(); return s;
  },

  // Q: gesto ANTES de R (R-50ms). Deve continuar DESCARTADO nas duas versoes.
  async Q(browser) {
    const page = await newPage(browser);
    await toGlobeEntry(page);
    const R = await page.evaluate(() => { const d = window.__zv.inst.props.globeStateTransitionDuration ?? 750; return Math.min(d, Math.max(250, d * 0.45)); });
    const wheel = () => page.evaluate(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: 600, bubbles: true, cancelable: true })));
    await wheel();
    await page.waitForTimeout(Math.max(0, Math.round(R) - 50));
    await wheel();
    await page.waitForTimeout(1600);
    const s = await page.evaluate(snapshot);
    s.R = Math.round(R);
    s.segundoGestoDescartado = s.globeStates.length === 2;
    s.errors = page.__errors; await page.context().close(); return s;
  },

  // R_LOCK: invariante da trava durante o encadeamento (nome evita colisao com
  // a constante R). A trava nao pode piscar nem derivar em nenhum frame.
  async R_LOCK(browser) {
    const page = await newPage(browser);
    await toGlobeEntry(page);
    const R = await page.evaluate(() => { const d = window.__zv.inst.props.globeStateTransitionDuration ?? 750; return Math.min(d, Math.max(250, d * 0.45)); });
    // amostra _scrollLocked por frame durante todo o encadeamento
    await page.evaluate(() => {
      window.__lockSamples = []; window.__lockRaf = requestAnimationFrame(function t() {
        window.__lockRaf = requestAnimationFrame(t);
        window.__lockSamples.push(!!window.__zv.inst._scrollLocked);
      });
    });
    const wheel = () => page.evaluate(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: 600, bubbles: true, cancelable: true })));
    // Margem de 90ms sobre R: setTimeout garante atraso MINIMO, nao exato --
    // sob carga do rAF do three.js o timer de 382,5ms chega a disparar em
    // ~391ms (medido). Margens de 5-10ms ficavam abaixo desse jitter e tornavam
    // o resultado nao-deterministico. A assercao semantica nao muda.
    for (let i = 0; i < 3; i++) { await wheel(); await page.waitForTimeout(Math.round(R) + 90); }
    await page.waitForTimeout(1200);
    const lk = await page.evaluate(() => { cancelAnimationFrame(window.__lockRaf); const s = window.__lockSamples; return { total: s.length, destravados: s.filter(x => !x).length }; });
    const s = await page.evaluate(snapshot);
    s.R = Math.round(R);
    s.framesAmostrados = lk.total;
    s.framesDestravados = lk.destravados;
    s.errors = page.__errors; await page.context().close(); return s;
  },

  // S: token unico -- nunca mais de um _endAnim pendente, tokens crescentes.
  async S(browser) {
    const page = await newPage(browser);
    await toGlobeEntry(page);
    const R = await page.evaluate(() => { const d = window.__zv.inst.props.globeStateTransitionDuration ?? 750; return Math.min(d, Math.max(250, d * 0.45)); });
    await page.evaluate(() => {
      const i = window.__zv.inst;
      window.__tk = { begins: 0, endsEfetivos: 0, endsIgnorados: 0, tokens: [], maxPendentes: 0 };
      const ob = i._beginAnim.bind(i), oe = i._endAnim.bind(i);
      i._beginAnim = (owner) => { const t = ob(owner); window.__tk.begins++; window.__tk.tokens.push(t);
        window.__tk.maxPendentes = Math.max(window.__tk.maxPendentes, window.__tk.begins - window.__tk.endsEfetivos); return t; };
      i._endAnim = (tok) => { const antes = i._anim; oe(tok);
        if (antes && antes.token === tok) window.__tk.endsEfetivos++; else window.__tk.endsIgnorados++; };
    });
    const wheel = () => page.evaluate(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: 600, bubbles: true, cancelable: true })));
    // Margem de 90ms sobre R: setTimeout garante atraso MINIMO, nao exato --
    // sob carga do rAF do three.js o timer de 382,5ms chega a disparar em
    // ~391ms (medido). Margens de 5-10ms ficavam abaixo desse jitter e tornavam
    // o resultado nao-deterministico. A assercao semantica nao muda.
    for (let i = 0; i < 3; i++) { await wheel(); await page.waitForTimeout(Math.round(R) + 90); }
    await page.waitForTimeout(1400);
    const tk = await page.evaluate(() => window.__tk);
    const s = await page.evaluate(snapshot);
    s.R = Math.round(R);
    s.tokens = tk;
    s.tokensCrescentes = tk.tokens.every((v, i, a) => i === 0 || v > a[i - 1]);
    s.errors = page.__errors; await page.context().close(); return s;
  },

  // T: encadear ate o estado 3 e dar mais um gesto -> _releaseGlobeSeq.
  async T(browser) {
    const page = await newPage(browser);
    await toGlobeEntry(page);
    const R = await page.evaluate(() => { const d = window.__zv.inst.props.globeStateTransitionDuration ?? 750; return Math.min(d, Math.max(250, d * 0.45)); });
    const wheel = () => page.evaluate(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: 600, bubbles: true, cancelable: true })));
    // Margem de 90ms sobre R: setTimeout garante atraso MINIMO, nao exato --
    // sob carga do rAF do three.js o timer de 382,5ms chega a disparar em
    // ~391ms (medido). Margens de 5-10ms ficavam abaixo desse jitter e tornavam
    // o resultado nao-deterministico. A assercao semantica nao muda.
    for (let i = 0; i < 3; i++) { await wheel(); await page.waitForTimeout(Math.round(R) + 90); }
    await page.waitForTimeout(1000);
    const antesDoUltimo = await page.evaluate(() => ({ gs: window.__zv.inst._globeState, travado: !!window.__zv.inst._scrollLocked, y: Math.round(window.scrollY) }));
    await wheel();                       // esgota a sequencia -> libera
    await page.waitForTimeout(2000);
    const s = await page.evaluate(snapshot);
    s.R = Math.round(R);
    s.antesDoUltimoGesto = antesDoUltimo;
    s.errors = page.__errors; await page.context().close(); return s;
  },

  // H: resize no meio de uma transicao de estado.
  async H(browser) {
    const page = await newPage(browser);
    await toGlobeEntry(page);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(200);
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.waitForTimeout(1800);
    await page.setViewportSize(VP);
    await page.waitForTimeout(1200);
    const s = await page.evaluate(snapshot);
    s.errors = page.__errors; await page.context().close(); return s;
  },

  // ===== Cenarios de ANCORAGEM (geometria da Hero x trava do Globo) =====
  // Nenhum dos 21 anteriores cobria isto: K chega perto ("descer tudo, liberar,
  // voltar subindo") mas nao afirma o ESTADO de reentrada, e T cobre o
  // esgotamento, nao a subida.

  // U: reentrada por baixo do pin. Subindo de qualquer ponto entre gTop e wTop,
  // o cruzamento para cima reengata a trava e assume o estado 3 (o ultimo).
  // Comportamento PROJETADO, nao defeito -- este cenario existe para travar essa
  // semantica: se um dia ela mudar, tem de ser por decisao explicita.
  async U(browser) {
    const page = await newPage(browser);
    const st = await page.evaluate(() => window.__zv.inst._snapStops());
    const [gTop] = st;
    const linhas = [];
    for (const off of [60, 150, 300, 600]) {
      await page.evaluate(() => {
        const i = window.__zv.inst;
        i._unlockScroll(); i._globeReleased = true; i._setGlobeState(3);
      });
      await page.evaluate((y) => window.scrollTo(0, y), gTop + off);
      await page.waitForTimeout(500);
      await page.evaluate((y) => window.scrollTo(0, y), gTop - 120);
      await page.waitForTimeout(600);
      linhas.push(await page.evaluate(() => ({
        travado: !!window.__zv.inst._scrollLocked,
        estado: window.__zv.inst._globeState,
        y: Math.round(window.scrollY),
      })));
    }
    const s = await page.evaluate(snapshot);
    s.reentradas = linhas;
    s.gTop = Math.round(gTop);
    // todas devem reengatar no estado 3, ancoradas em gTop
    s.reentradaConsistente = linhas.every(l => l.travado && l.estado === 3 && Math.abs(l.y - gTop) < 3);
    s.errors = page.__errors; await page.context().close(); return s;
  },

  // V: alinhamento entre o limiar do navHidden e o topo do Globo. O limiar era
  // absoluto (innerHeight - 72) e ficou para tras quando a Hero encurtou: a
  // 0,85 o header sumia 48px DEPOIS de o Globo encher a tela. Deve sumir ANTES,
  // com folga proxima de 72px.
  async V(browser) {
    const page = await newPage(browser);
    const r = await page.evaluate(async () => {
      const hero = document.getElementById('inicio');
      // fim da Hero medido no topo da pagina: o Globo e sticky e, uma vez
      // grudado, o rect dele devolve a posicao GRUDADA, nao a de fluxo.
      window.scrollTo(0, 0);
      await new Promise(r2 => setTimeout(r2, 120));
      const heroFim = Math.round(hero.getBoundingClientRect().top + window.scrollY + hero.offsetHeight);
      const gTop = Math.round(window.__zv.inst._snapStops()[0]);
      const espera = (ms) => new Promise(r2 => setTimeout(r2, ms));
      let yHeader = null;
      for (let y = 0; y <= gTop + 40; y += 4) {
        window.scrollTo(0, y); await espera(8);
        if (yHeader === null && window.__zv.inst.state.navHidden) { yHeader = y; break; }
      }
      return { heroFim, gTop, yHeader };
    });
    const s = await page.evaluate(snapshot);
    s.heroFim = r.heroFim; s.yHeaderSome = r.yHeader; s.gTopMedido = r.gTop;
    s.antecipacao = r.yHeader === null ? null : r.heroFim - r.yHeader;
    // o header tem de sumir ANTES do fim da Hero, com folga entre 40 e 110px
    s.antecipacaoOk = s.antecipacao !== null && s.antecipacao >= 40 && s.antecipacao <= 110;
    s.errors = page.__errors; await page.context().close(); return s;
  },

  // W: subida a partir de EXATAMENTE gTop. O engate exige prev > gTop estrito,
  // entao repousando no ponto de pin a comparacao e falsa e a trava nao
  // reengata -- a pagina precisa subir livre. Este cenario existe para provar
  // que ela sobe de fato, e nao fica presa.
  async W(browser) {
    const page = await newPage(browser);
    const st = await page.evaluate(() => window.__zv.inst._snapStops());
    const [gTop] = st;
    // chega ao pin pelo cruzamento normal e esgota a sequencia para cima
    await page.evaluate((y) => window.scrollTo(0, y - 150), gTop);
    await page.waitForTimeout(400);
    await page.evaluate((y) => window.scrollTo(0, y + 30), gTop);
    await page.waitForTimeout(700);
    const noPin = await page.evaluate(() => ({
      travado: !!window.__zv.inst._scrollLocked,
      y: Math.round(window.scrollY),
      estado: window.__zv.inst._globeState,
    }));
    const wheel = (d) => page.evaluate((dy) =>
      window.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, bubbles: true, cancelable: true })), d);
    for (let k = 0; k < 5; k++) { await wheel(-600); await page.waitForTimeout(480); }
    const apos = await page.evaluate(() => ({ y: Math.round(window.scrollY), travado: !!window.__zv.inst._scrollLocked }));
    await page.evaluate(() => window.scrollBy(0, -300));
    await page.waitForTimeout(600);
    const fim = await page.evaluate(() => ({
      y: Math.round(window.scrollY),
      travado: !!window.__zv.inst._scrollLocked,
      estado: window.__zv.inst._globeState,
    }));
    const s = await page.evaluate(snapshot);
    s.gTop = Math.round(gTop); s.noPin = noPin; s.aposEsgotar = apos; s.aposSubir = fim;
    // depois de esgotar para cima a pagina tem de SUBIR, nao ficar presa no pin
    s.subiuDeFato = fim.y < apos.y - 10 && !fim.travado;
    s.errors = page.__errors; await page.context().close(); return s;
  },
};

// Filtro opcional: node gesture-harness.js <saida> D2,A
const ONLY = (process.argv[3] || '').split(',').filter(Boolean);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const all = {};
  const names = ONLY.length ? ONLY : Object.keys(scenarios);
  for (const name of names) {
    process.stdout.write(`cenario ${name} ... `);
    try {
      all[name] = await scenarios[name](browser);
      console.log('ok' + (all[name].errors.length ? ` (${all[name].errors.length} erros!)` : ''));
    } catch (e) {
      all[name] = { failed: String(e && e.message || e) };
      console.log('FALHOU: ' + all[name].failed);
    }
  }
  await browser.close();
  fs.writeFileSync(`${OUT}/traces.json`, JSON.stringify(all, null, 2));
  console.log(`\nTraco salvo em ${OUT}/traces.json`);
})();
