// 1) linha fina: posicao do topo de #servicos vs base da viewport em y=pinY
// 2) fluidez: profiling SEM leitura de geometria no loop (o probe anterior
//    forcava layout por frame e inflava os numeros)
// 3) inercia: scroll programatico competindo com _animServ
const { chromium } = require('playwright');

const achaInst = () => {
  const root = document.getElementById('dc-root');
  const key = Object.keys(root).find(k => k.startsWith('__reactContainer$') || k.startsWith('__reactFiber$'));
  const seen = new Set(); const stack = [root[key]]; let inst = null;
  while (stack.length) {
    const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f);
    const lg = f.stateNode && typeof f.stateNode === 'object' ? f.stateNode.logic : null;
    if (lg && '_globeState' in lg) { inst = lg; break; }
    if (f.child) stack.push(f.child); if (f.sibling) stack.push(f.sibling);
  }
  window.__i = inst;
};

const irParaZona = async (page, offset) => {
  await page.evaluate(() => window.scrollTo(0, window.__i._snapStops()[0]));
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__i._releaseGlobeSeq(1));
  await page.waitForTimeout(1600);
  return await page.evaluate((off) => {
    const serv = document.getElementById('servicos');
    const coverY = serv.getBoundingClientRect().top + window.scrollY;
    const pinY = coverY - window.innerHeight;
    window.scrollTo(0, pinY + off);
    return { coverY: +coverY.toFixed(3), pinY: +pinY.toFixed(3) };
  }, offset);
};

(async () => {
  const browser = await chromium.launch();
  for (const [rot, w, h] of [['DESKTOP 1440x900', 1440, 900], ['MOBILE 393x852', 393, 852]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 768 });
    const page = await ctx.newPage();
    await page.goto('http://localhost:8752/index.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.evaluate(achaInst);
    console.log('==================== ' + rot + ' ====================');

    // ---- PROBLEMA 1: linha fina em y = pinY ----
    await irParaZona(page, 0);
    await page.waitForTimeout(500);
    const linha = await page.evaluate(() => {
      const serv = document.getElementById('servicos');
      const r = serv.getBoundingClientRect();
      const vh = window.innerHeight;
      const cs = getComputedStyle(serv);
      return {
        y: +window.scrollY.toFixed(3), vh,
        servTopViewport: +r.top.toFixed(3),
        pixelsVisiveis: +(vh - r.top).toFixed(3),
        bgServicos: cs.backgroundColor,
        bgTimeline: getComputedStyle(document.getElementById('estrategia')).backgroundColor,
        dpr: window.devicePixelRatio,
      };
    });
    console.log('P1 — em y=pinY: topo de #servicos no viewport = ' + linha.servTopViewport + '  (altura=' + linha.vh + ')');
    console.log('     pixels de Servicos VISIVEIS na base da tela = ' + linha.pixelsVisiveis + 'px   dpr=' + linha.dpr);
    console.log('     cor Servicos=' + linha.bgServicos + '   cor Timeline=' + linha.bgTimeline);

    // ---- PROBLEMA 2: profiling limpo (sem leitura de layout no loop) ----
    await irParaZona(page, 40);
    await page.waitForTimeout(500);
    const prof = await page.evaluate(() => new Promise((res) => {
      const durs = []; let prev = performance.now(); const t0 = prev;
      const tick = () => {
        const now = performance.now();
        durs.push(+(now - prev).toFixed(2)); prev = now;
        if (now - t0 < 1500) requestAnimationFrame(tick); else res(durs);
      };
      window.__i._servTransition(1);
      requestAnimationFrame(tick);
    }));
    const lentos = prof.filter(d => d > 16.7).length, muito = prof.filter(d => d > 33).length;
    console.log('P2 — profiling LIMPO: ' + prof.length + ' frames | >16.7ms: ' + lentos + ' | >33ms: ' + muito + ' | pior: ' + Math.max(...prof).toFixed(1) + 'ms');

    // baseline: mesma janela, SEM transicao (so o rAF do three.js rodando)
    await irParaZona(page, 40);
    await page.waitForTimeout(500);
    const base = await page.evaluate(() => new Promise((res) => {
      const durs = []; let prev = performance.now(); const t0 = prev;
      const tick = () => { const now = performance.now(); durs.push(+(now - prev).toFixed(2)); prev = now;
        if (now - t0 < 1500) requestAnimationFrame(tick); else res(durs); };
      requestAnimationFrame(tick);
    }));
    console.log('     BASELINE (sem transicao): ' + base.length + ' frames | >16.7ms: ' + base.filter(d => d > 16.7).length + ' | >33ms: ' + base.filter(d => d > 33).length + ' | pior: ' + Math.max(...base).toFixed(1) + 'ms');

    // ---- PROBLEMA 3: inercia competindo com _animServ ----
    await irParaZona(page, 40);
    await page.waitForTimeout(500);
    const inercia = await page.evaluate(() => new Promise((res) => {
      const i = window.__i;
      const amostras = []; const t0 = performance.now();
      i._servTransition(1);
      // simula inercia: forca scroll para frente durante a animacao
      let n = 0;
      const empurra = setInterval(() => { window.scrollBy(0, 120); n++; if (n >= 8) clearInterval(empurra); }, 40);
      const tick = () => {
        amostras.push({ t: Math.round(performance.now() - t0), y: Math.round(window.scrollY) });
        if (performance.now() - t0 < 1800) requestAnimationFrame(tick);
        else res({ amostras, servCovered: !!i._servCovered, yFinal: Math.round(window.scrollY) });
      };
      requestAnimationFrame(tick);
    }));
    const ys = inercia.amostras.map(s => s.y);
    console.log('P3 — inercia simulada durante _animServ: y variou de ' + Math.min(...ys) + ' a ' + Math.max(...ys) +
      ' | final=' + inercia.yFinal + ' | servCovered=' + inercia.servCovered);
    console.log('');
    await ctx.close();
  }
  await browser.close();
})();
