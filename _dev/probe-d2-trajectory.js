// Mede a TRAJETORIA do scroll durante o voo do nav no cenario D2, para
// caracterizar com precisao o efeito da trava aberta (em vez de alegar).
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
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
  });
  await page.evaluate(() => window.__dcSetProps(window.__dcRootName(), {
    globeStateTransitionDuration: 200, navScrollDuration: 3000 }));
  await page.waitForTimeout(400);
  await page.evaluate(() => window.scrollTo(0, window.__i._snapStops()[0]));
  await page.waitForTimeout(700);

  await page.evaluate(() => {
    window.__T0 = performance.now(); window.__s = [];
    const tick = () => { window.__raf = requestAnimationFrame(tick);
      window.__s.push({ t: Math.round(performance.now() - window.__T0), y: Math.round(window.scrollY),
        lock: !!window.__i._snapAnimating, serv: !!window.__i._servAnimating, gs: window.__i._globeState }); };
    window.__raf = requestAnimationFrame(tick);
  });

  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(50);
  await page.click('#zv-pill-3');
  await page.waitForTimeout(4200);

  const r = await page.evaluate(() => {
    cancelAnimationFrame(window.__raf);
    const s = window.__s;
    let back = 0, maxBack = 0, prevY = s[0].y;
    const yanks = [];
    for (const p of s) {
      const d = p.y - prevY;
      if (d < -2) { back++; maxBack = Math.max(maxBack, -d); if (yanks.length < 12) yanks.push({ t: p.t, de: prevY, para: p.y, lock: p.lock, serv: p.serv }); }
      prevY = p.y;
    }
    const incon = s.filter(p => p.serv && !p.lock);
    return {
      frames: s.length,
      yInicial: s[0].y, yFinal: s[s.length - 1].y,
      framesComRetrocesso: back, maiorRetrocessoPx: maxBack,
      exemplosDeRetrocesso: yanks,
      framesInconsistentes: incon.length,
      janelaInconsistente: incon.length ? { de: incon[0].t, ate: incon[incon.length - 1].t } : null,
    };
  });
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
})();
