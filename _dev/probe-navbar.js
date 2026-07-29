// Sonda somente-leitura: mede a geometria real da navbar/pill em varias
// larguras, para localizar com precisao onde o overflow comeca.
const { chromium } = require('playwright');

const widths = [320, 360, 393, 400, 430, 480, 540, 556, 600, 650, 700, 730, 768, 800];

(async () => {
  const browser = await chromium.launch();
  for (const w of widths) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
    const page = await ctx.newPage();
    await page.goto('http://localhost:8752/index.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    const r = await page.evaluate(() => {
      const pill = document.getElementById('zv-navpill');
      const logo = document.getElementById('zv-logo-img');
      const circle = document.getElementById('zv-wa-circle');
      const cs = pill ? getComputedStyle(pill) : null;
      const items = ['zv-pill-1', 'zv-pill-2', 'zv-pill-3'].map(id => {
        const el = document.getElementById(id);
        return el ? { text: el.textContent, w: Math.round(el.getBoundingClientRect().width) } : null;
      });
      return {
        bodyScrollW: document.body.scrollWidth,
        bodyClientW: document.documentElement.clientWidth,
        pillMaxWidth: cs ? cs.maxWidth : null,
        pillRectW: pill ? Math.round(pill.getBoundingClientRect().width) : null,
        pillScrollW: pill ? pill.scrollWidth : null,
        pillOverflowX: cs ? cs.overflowX : null,
        logoW: logo ? Math.round(logo.getBoundingClientRect().width) : null,
        logoH: logo ? Math.round(logo.getBoundingClientRect().height) : null,
        circleW: circle ? Math.round(circle.getBoundingClientRect().width) : null,
        items,
      };
    });
    const overflowPage = r.bodyScrollW > r.bodyClientW;
    const overflowPill = r.pillScrollW > r.pillRectW + 1;
    console.log(
      `w=${String(w).padEnd(4)} pillRect=${String(r.pillRectW).padEnd(4)} pillScroll=${String(r.pillScrollW).padEnd(4)} maxW=${String(r.pillMaxWidth).padEnd(8)} logoW=${String(r.logoW).padEnd(4)} circleW=${String(r.circleW).padEnd(3)} ` +
      `overflowPAGINA=${overflowPage?'SIM':'nao '} overflowPILL=${overflowPill?'SIM':'nao '} itens=${JSON.stringify(r.items.map(i=>i&&i.w))}`
    );
    await ctx.close();
  }
  await browser.close();
})();
