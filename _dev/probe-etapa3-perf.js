// Profiling da cobertura Timeline -> Servicos, com servicosFreeScroll ligado e
// desligado, no mesmo processo.
//
// ATENCAO ao que esta sendo comparado -- nao sao a mesma carga:
//   OFF: _servTransition(1) dispara _animServ, uma animacao de 800ms. E o que o
//        usuario ve hoje.
//   ON : nao existe animacao. A cobertura e o proprio scroll, entao rolamos o
//        percurso (riseS = uma viewport) em ~800ms por rAF, para cobrir a mesma
//        distancia no mesmo tempo.
//
// O modo ON fica PESSIMISTA de proposito: o scrollTo por frame roda na main
// thread, custo que um dedo real nao tem (scroll de toque e do compositor). Se
// mesmo assim o ON ganhar, o ganho real e maior que o medido.
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

// libera a sequencia do globo e posiciona no inicio da zona de cobertura
const irParaZona = async (page, on) => {
  await page.evaluate(() => window.scrollTo(0, window.__i._snapStops()[0]));
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__i._releaseGlobeSeq(1));
  await page.waitForTimeout(1600);
  return await page.evaluate((ligado) => {
    if (ligado) {
      // com sticky, a cobertura comeca quando a Timeline gruda: wTop
      const wTop = window.__i._snapStops()[1];
      window.scrollTo(0, wTop);
      return { inicio: Math.round(wTop), percurso: window.innerHeight };
    }
    const serv = document.getElementById('servicos');
    const coverY = serv.getBoundingClientRect().top + window.scrollY;
    const pinY = coverY - window.innerHeight;
    window.scrollTo(0, pinY + 40);
    return { inicio: Math.round(pinY + 40), percurso: window.innerHeight };
  }, on);
};

// Amostrador nao-bloqueante: liga o rAF, deixa o gesto acontecer, colhe depois.
const ligaProf = (page) => page.evaluate(() => {
  window.__prof = []; let prev = performance.now(); const t0 = prev;
  const tick = () => {
    const now = performance.now();
    window.__prof.push(+(now - prev).toFixed(2)); prev = now;
    if (now - t0 < 1500) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
const colhe = (page) => page.evaluate(() => window.__prof);

// Gesto REAL pelo pipeline de entrada do browser (compositor), nao scrollTo por
// frame. E a unica forma de comparar os dois modos com a mesma carga: no OFF o
// gesto dispara _servTransition e a animacao roda; no ON ele so rola.
const gestoReal = async (cdp, page, z, touch) => {
  await cdp.send('Input.synthesizeScrollGesture', {
    x: 200, y: 400,
    xDistance: 0, yDistance: -z.percurso,
    gestureSourceType: touch ? 'touch' : 'mouse',
    speed: Math.round(z.percurso / 0.8),   // percorre a distancia em ~800ms
    preventFling: true,
  });
};

const fmt = (d) => String(d.length).padStart(3) + ' frames | >16.7ms: ' + String(d.filter(x => x > 16.7).length).padStart(3) +
  ' | >33ms: ' + String(d.filter(x => x > 33).length).padStart(2) + ' | pior: ' + Math.max(...d).toFixed(1).padStart(6) + 'ms';
const med = (a) => a.reduce((s, x) => s + x, 0) / a.length;

(async () => {
  const browser = await chromium.launch();
  for (const [rot, w, h] of [['DESKTOP 1440x900', 1440, 900], ['MOBILE 390x800', 390, 800]]) {
    console.log('======================== ' + rot + ' ========================');
    const res = {};
    for (const on of [false, true]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 768 });
      const page = await ctx.newPage();
      await page.goto('http://localhost:8752/index.html', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      if (on) {
        await page.evaluate(() => window.__dcSetProps(window.__dcRootName(), { servicosFreeScroll: true }));
        await page.waitForTimeout(500);
      }
      await page.evaluate(achaInst);
      if (on) { await page.evaluate(() => window.__i._layoutStack()); await page.waitForTimeout(400); }
      const vivo = await page.evaluate(() => !!window.__i.props.servicosFreeScroll);
      if (vivo !== on) throw new Error('prop nao pegou');
      const cdp = await page.context().newCDPSession(page);
      const runs = [];
      for (let r = 0; r < 3; r++) {
        const z = await irParaZona(page, on);
        await page.waitForTimeout(500);
        await ligaProf(page);
        await gestoReal(cdp, page, z, w < 768);
        await page.waitForTimeout(1600);
        runs.push(await colhe(page));
        await page.waitForTimeout(1000);
      }
      const bases = [];
      for (let r = 0; r < 3; r++) {
        await irParaZona(page, on);
        await page.waitForTimeout(500);
        await ligaProf(page);
        await page.waitForTimeout(1600);
        bases.push(await colhe(page));
      }
      console.log('--- servicosFreeScroll = ' + on + (on ? '  (cobertura por scroll)' : '  (gesto -> _animServ 800ms)') + ' ---');
      runs.forEach((d, i) => console.log('    run ' + (i + 1) + ': ' + fmt(d)));
      bases.forEach((d, i) => console.log('    baseline ' + (i + 1) + ' (parado): ' + fmt(d)));
      res[on ? 'on' : 'off'] = {
        frames: med(runs.map(d => d.length)),
        f33: med(runs.map(d => d.filter(x => x > 33).length)),
        pior: med(runs.map(d => Math.max(...d))),
        baseFrames: med(bases.map(d => d.length)),
        basePior: med(bases.map(d => Math.max(...d))),
      };
      await ctx.close();
    }
    const d = (k, c) => {
      const a = res.off[k], b = res.on[k], delta = b - a;
      return a.toFixed(c) + '  ->  ' + b.toFixed(c) + '   (' + (delta >= 0 ? '+' : '') + delta.toFixed(c) + ')';
    };
    console.log('  >>> media de 3 runs, OFF -> ON');
    console.log('      frames em 1500ms : ' + d('frames', 1) + '   (mais = melhor)');
    console.log('      frames >33ms     : ' + d('f33', 1) + '   (menos = melhor)');
    console.log('      pior frame (ms)  : ' + d('pior', 1) + '   (menos = melhor)');
    console.log('      -- controle: baseline PARADO nos dois modos deve ser igual --');
    console.log('      baseline frames  : ' + d('baseFrames', 1));
    console.log('      baseline pior(ms): ' + d('basePior', 1));
    console.log('');
  }
  await browser.close();
})();
