// Investiga se _globeGo chamado com animacao em voo cancela limpo ou sobrepoe.
// Amostra o transform COMPUTADO do canvas por rAF, forcando um segundo
// _globeGo no meio do primeiro. Nao altera o site.
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

// extrai translateX(%) e scale da matrix computada
const lerTransform = () => {
  const cv = document.getElementById('zv-globe-canvas');
  const m = getComputedStyle(cv).transform;
  if (!m || m === 'none') return { tx: 0, sc: 1 };
  const n = m.match(/matrix\(([^)]+)\)/);
  if (!n) return { tx: null, sc: null };
  const p = n[1].split(',').map(Number);
  return { sc: +p[0].toFixed(4), tx: Math.round(p[4]) };
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:8752/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  await page.evaluate(achaInst);
  await page.evaluate(() => window.scrollTo(0, window.__i._snapStops()[0]));
  await page.waitForTimeout(800);

  const cfg = await page.evaluate(() => ({
    dur: window.__i.props.globeStateTransitionDuration,
    blockMs: (window.__i.props.globeStateTransitionDuration ?? 750) + 40,
    fastMs: window.__i.props.globeStateTransitionDuration ?? 750,
    fastSpd: window.__i.props.globeFastRotationSpeed,
    normSpd: window.__i.props.globeRotationSpeed,
  }));
  console.log('CONFIG REAL: dur=' + cfg.dur + 'ms  janela de bloqueio=' + cfg.blockMs + 'ms  _globeFast dura=' + cfg.fastMs + 'ms');
  console.log('             rotacao rapida=' + cfg.fastSpd + '  normal=' + cfg.normSpd);
  console.log('');

  // instrumenta: registra token/anim a cada frame + transform
  await page.evaluate(() => {
    window.__L = []; window.__t0 = performance.now();
    window.__lerT = () => {
      const cv = document.getElementById('zv-globe-canvas');
      const m = getComputedStyle(cv).transform;
      if (!m || m === 'none') return { tx: 0, sc: 1 };
      const n = m.match(/matrix\(([^)]+)\)/); if (!n) return { tx: null, sc: null };
      const p = n[1].split(',').map(Number);
      return { sc: +p[0].toFixed(4), tx: Math.round(p[4]) };
    };
    const tick = () => {
      window.__raf = requestAnimationFrame(tick);
      const t = window.__lerT();
      window.__L.push({
        t: Math.round(performance.now() - window.__t0),
        tx: t.tx, sc: t.sc,
        gs: window.__i._globeState,
        token: window.__i._anim ? window.__i._anim.token : null,
        owner: window.__i._anim ? window.__i._anim.owner : null,
        travado: !!window.__i._scrollLocked,
        fast: !!window.__i._globeFast,
      });
    };
    window.__raf = requestAnimationFrame(tick);
  });

  // estado 0 -> 1
  await page.evaluate(() => window.__i._globeGo(1));
  await page.waitForTimeout(300);
  // INTERROMPE no meio: 1 -> 2 (a 300ms de uma animacao de 850ms)
  await page.evaluate(() => window.__i._globeGo(2));
  await page.waitForTimeout(1400);

  const L = await page.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__L; });
  console.log('=== transform COMPUTADO do canvas (interrupcao aos ~300ms) ===');
  console.log('t(ms) | translateX(px) scale  | gs token owner  fast');
  for (const s of L) {
    if (s.t > 1300) break;
    if (s.t % 3 !== 0 && s.t > 60) { /* desamostra levemente */ }
    console.log(String(s.t).padStart(5) + ' | ' + String(s.tx).padStart(13) + ' ' + String(s.sc).padStart(6) +
      ' | ' + s.gs + '  ' + String(s.token).padStart(5) + ' ' + String(s.owner).padEnd(6) + ' ' + s.fast);
  }
  await browser.close();
})();
