// Sonda: confirma que da pra alcancar a instancia do componente via fiber do React.
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:8752/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const result = await page.evaluate(() => {
    const root = document.getElementById('dc-root');
    if (!root) return { ok: false, why: 'sem #dc-root' };
    const key = Object.keys(root).find(k => k.startsWith('__reactContainer$') || k.startsWith('__reactFiber$'));
    if (!key) return { ok: false, why: 'sem chave de fiber', keys: Object.keys(root).slice(0, 20) };
    const seen = new Set();
    const stack = [root[key]];
    while (stack.length) {
      const f = stack.pop();
      if (!f || seen.has(f)) continue;
      seen.add(f);
      const sn = f.stateNode;
      const lg = sn && typeof sn === 'object' ? sn.logic : null;
      if (lg && typeof lg === 'object' && '_globeState' in lg) {
        return {
          ok: true,
          fiberKey: key,
          globeState: lg._globeState,
          snapAnimating: lg._snapAnimating,
          servAnimating: lg._servAnimating,
          hasSnapStops: typeof lg._snapStops === 'function',
          stops: typeof lg._snapStops === 'function' ? lg._snapStops() : null,
          servCovered: lg._servCovered,
          ctor: lg.constructor && lg.constructor.name,
        };
      }
      if (f.child) stack.push(f.child);
      if (f.sibling) stack.push(f.sibling);
    }
    return { ok: false, why: 'instancia nao encontrada na arvore' };
  });

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
