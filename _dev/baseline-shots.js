// Baseline screenshot capture for LP Zanvie — não altera o site, só observa.
const { chromium } = require('playwright');

const OUT = process.argv[2] || 'baseline';
const URL = 'http://localhost:8752/index.html';

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

async function wheelSteps(page, n, deltaY = 500, pause = 950) {
  for (let i = 0; i < n; i++) {
    await page.mouse.wheel(0, deltaY);
    await page.waitForTimeout(pause);
  }
}

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('  captured', name);
}

async function run(kind) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORTS[kind] });
  const page = await context.newPage();
  page.on('console', (msg) => { if (msg.type() === 'error') console.log(`[console:${kind}]`, msg.text()); });
  page.on('pageerror', (err) => console.log(`[pageerror:${kind}]`, err.message));

  console.log(`\n=== ${kind} (${VIEWPORTS[kind].width}x${VIEWPORTS[kind].height}) ===`);
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500); // three.js / fontes / globo inicial

  await shot(page, `${kind}-01-hero`);

  // Entra na seção do Globo (scroll-snap deve estacionar no Estado 0)
  await wheelSteps(page, 2, 600, 1000);
  await shot(page, `${kind}-02-globo-estado0-centro`);

  // Avança para Estado 1 (globo à direita, pin em Santa Maria)
  await wheelSteps(page, 1, 500, 1000);
  await shot(page, `${kind}-03-globo-estado1-direita-pin`);

  // Avança para Estado 2 (globo à esquerda)
  await wheelSteps(page, 1, 500, 1000);
  await shot(page, `${kind}-04-globo-estado2-esquerda`);

  // Avança para Estado 3 (globo de volta ao centro)
  await wheelSteps(page, 1, 500, 1000);
  await shot(page, `${kind}-05-globo-estado3-centro`);

  // LIBERA a sequência do Globo antes de descer. Com a trava total, o 5º gesto
  // (estado 3 esgotado) destrava e dispara o snap até a Timeline. Sem este
  // passo, as navegações programáticas abaixo cruzam o ponto de pin e são
  // capturadas pela trava — as capturas 06-10 mostrariam o Globo.
  await wheelSteps(page, 1, 500, 1600);

  // Timeline cobrindo o Globo (navegação direta ao topo da seção "estrategia")
  await page.evaluate(() => document.getElementById('estrategia')?.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(700);
  await shot(page, `${kind}-06-timeline-cobrindo-globo`);

  // Fim da timeline (scroll livre), pouco antes do gatilho de subida de Serviços
  await page.evaluate(() => {
    const serv = document.getElementById('servicos');
    if (serv) window.scrollTo(0, serv.getBoundingClientRect().top + window.scrollY - window.innerHeight - 40);
  });
  await page.waitForTimeout(700);
  await shot(page, `${kind}-07-timeline-completa`);

  // Serviços sobe cobrindo a Timeline (navegação direta ao topo de "servicos")
  await page.evaluate(() => document.getElementById('servicos')?.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(700);
  await shot(page, `${kind}-08-servicos-cobrindo-timeline`);

  // FAQ
  await page.evaluate(() => document.getElementById('faq')?.scrollIntoView());
  await page.waitForTimeout(600);
  await shot(page, `${kind}-09-faq`);

  // CTA + Footer
  await page.evaluate(() => document.getElementById('zv-footer')?.scrollIntoView({ block: 'end' }));
  await page.waitForTimeout(600);
  await shot(page, `${kind}-10-cta-footer`);

  await browser.close();
}

(async () => {
  const fs = require('fs');
  fs.mkdirSync(OUT, { recursive: true });
  await run('desktop');
  await run('mobile');
  console.log('\nDone.');
})();
