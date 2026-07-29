// Captura frames durante a transicao da header (translateY(-110%), 0.4s) para
// detectar sobreposicao visivel com o pill, que entra instantaneo.
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 393, height: 700 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:8752/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // amostra continua por rAF: geometria da header e do pill
  await page.evaluate(() => {
    window.__T = [];
    window.__t0 = performance.now();
    const tick = () => {
      window.__raf = requestAnimationFrame(tick);
      const bar = document.getElementById('zv-navbar');
      const pill = document.getElementById('zv-navpill');
      const rb = bar.getBoundingClientRect();
      const rp = pill.getBoundingClientRect();
      const csP = getComputedStyle(pill);
      window.__T.push({
        t: Math.round(performance.now() - window.__t0),
        barTop: Math.round(rb.top), barBottom: Math.round(rb.bottom),
        pillDisplay: csP.display,
        pillTop: csP.display === 'none' ? null : Math.round(rp.top),
        pillBottom: csP.display === 'none' ? null : Math.round(rp.bottom),
        pillW: csP.display === 'none' ? null : Math.round(rp.width),
      });
    };
    window.__raf = requestAnimationFrame(tick);
  });

  // dispara a transicao: rola o suficiente para navHidden virar true
  await page.evaluate(() => window.scrollTo(0, window.innerHeight + 50));

  // captura screenshots durante os 400ms da transicao
  const shots = [];
  for (const ms of [0, 60, 120, 180, 240, 320, 420, 600]) {
    await page.waitForTimeout(ms === 0 ? 16 : 60);
    const p = `trans-393-${String(ms).padStart(3, '0')}ms.png`;
    await page.screenshot({ path: p, clip: { x: 0, y: 0, width: 393, height: 120 } });
    shots.push(p);
  }

  const T = await page.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__T; });
  console.log('t(ms) | barTop barBottom | pillDisplay pillTop pillBottom pillW | SOBREPOE?');
  let houve = false;
  for (const s of T) {
    if (s.t > 700) break;
    // sobreposicao = pill visivel E header ainda ocupando area que cruza o pill
    const sobrepoe = s.pillDisplay !== 'none' && s.barBottom > (s.pillTop ?? 1e9);
    if (sobrepoe) houve = true;
    console.log(
      String(s.t).padStart(5) + ' | ' + String(s.barTop).padStart(6) + ' ' + String(s.barBottom).padStart(9) +
      ' | ' + s.pillDisplay.padEnd(11) + ' ' + String(s.pillTop).padStart(7) + ' ' + String(s.pillBottom).padStart(10) +
      ' ' + String(s.pillW).padStart(5) + ' | ' + (sobrepoe ? 'SIM' : '-')
    );
  }
  console.log('\nHouve sobreposicao geometrica em algum frame: ' + (houve ? 'SIM' : 'NAO'));
  console.log('screenshots: ' + shots.join(', '));
  await browser.close();
})();
