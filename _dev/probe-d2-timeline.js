// Amostragem fina da linha do tempo do cenario D2, para entender por que
// midFlight.lock continua true. So observa; nao altera o site.
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto('http://localhost:8752/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);

  await page.evaluate(() => {
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
    // Espiona as chamadas que mexem na trava, sem alterar comportamento.
    window.__calls = [];
    const t0 = () => performance.now() - window.__T0;
    for (const m of ['_globeGo', '_navGo', '_snapGo', '_animServ', '_renderGlobeState', '_servTransition']) {
      if (typeof inst[m] === 'function') {
        const orig = inst[m].bind(inst);
        inst[m] = (...a) => { window.__calls.push({ t: Math.round(t0()), fn: m, args: a.map(x => (typeof x === 'object' ? '{}' : String(x))) }); return orig(...a); };
      }
    }
  });

  await page.evaluate(() => {
    window.__dcSetProps(window.__dcRootName(), { globeStateTransitionDuration: 200, navScrollDuration: 3000 });
  });
  await page.waitForTimeout(400);
  console.log('props aplicadas:', await page.evaluate(() => ({
    globe: window.__i.props.globeStateTransitionDuration, nav: window.__i.props.navScrollDuration })));

  await page.evaluate(() => { const s = window.__i._snapStops(); window.scrollTo(0, s[0]); });
  await page.waitForTimeout(700);

  // inicia amostragem por rAF
  await page.evaluate(() => {
    window.__T0 = performance.now();
    window.__samples = [];
    const tick = () => {
      window.__raf = requestAnimationFrame(tick);
      window.__samples.push({
        t: Math.round(performance.now() - window.__T0),
        lock: !!window.__i._snapAnimating,
        serv: !!window.__i._servAnimating,
        gs: window.__i._globeState,
        sb: document.documentElement.style.scrollBehavior,
        y: Math.round(window.scrollY),
      });
    };
    window.__raf = requestAnimationFrame(tick);
  });

  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(50);
  await page.click('#zv-pill-3');
  await page.waitForTimeout(1200);

  const out = await page.evaluate(() => {
    cancelAnimationFrame(window.__raf);
    // compacta: so registra quando algo muda
    const changes = [];
    let prev = null;
    for (const s of window.__samples) {
      const sig = `${s.lock}|${s.serv}|${s.gs}|${s.sb}`;
      if (sig !== prev) { changes.push(s); prev = sig; }
    }
    return { changes, calls: window.__calls, total: window.__samples.length };
  });

  console.log('\n--- chamadas ---');
  out.calls.forEach(c => console.log(`  t=${c.t}ms  ${c.fn}(${c.args.join(', ')})`));
  console.log('\n--- mudancas de estado (lock|serv|globeState|scrollBehavior) ---');
  out.changes.forEach(s => console.log(`  t=${String(s.t).padStart(5)}ms  lock=${String(s.lock).padEnd(5)} serv=${String(s.serv).padEnd(5)} gs=${s.gs}  sb="${s.sb}"  y=${s.y}`));

  await browser.close();
})();
