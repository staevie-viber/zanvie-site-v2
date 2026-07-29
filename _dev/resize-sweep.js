// Teste de redimensionamento CONTINUO (nao so tamanhos fixos) para a Tarefa 3
// (consolidacao dos 8 listeners de resize num despachante unico).
// Varre a largura em incrementos pequenos, cruzando os dois breakpoints reais
// do componente (1024px timeline, 768px header/contact/faq) varias vezes,
// simulando o usuario arrastando a borda da janela.
const { chromium } = require('playwright');

const OUT = process.argv[2] || 'resize-sweep';
const URL = 'http://localhost:8752/index.html';

async function run() {
  const fs = require('fs');
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`); });
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Sequencia de larguras: desce de 1440 a 320 em passos de 40px, cruzando
  // 1024 (breakpoint da timeline) e 768 (breakpoint de header/contato/faq)
  // varias vezes, depois sobe de volta a 1440.
  const widths = [];
  for (let w = 1440; w >= 320; w -= 40) widths.push(w);
  for (let w = 320; w <= 1440; w += 40) widths.push(w);
  // Um segundo cruzamento dos breakpoints, mais rapido (passos maiores,
  // sem espera entre eles) para estressar disparos de resize em sequencia
  // apertada, mais perto do que acontece ao arrastar a borda da janela.
  const fastWidths = [];
  for (let w = 1440; w >= 320; w -= 80) fastWidths.push(w);
  for (let w = 320; w <= 1440; w += 80) fastWidths.push(w);

  console.log(`Varredura lenta: ${widths.length} larguras (1440->320->1440, passo 40px, pausa 120ms)`);
  for (const w of widths) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(120);
  }

  console.log(`Varredura rapida: ${fastWidths.length} larguras (1440->320->1440, passo 80px, sem pausa)`);
  for (const w of fastWidths) {
    await page.setViewportSize({ width: w, height: 900 });
  }
  await page.waitForTimeout(300);

  // Volta a um tamanho fixo conhecido e verifica se o layout "assentou" certo.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/resize-settle-1440.png` });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/resize-settle-390.png` });

  // Estado do header/pill/timeline nos dois lados de cada breakpoint, capturado
  // logo apos um resize (nao "em repouso"), para pegar problema de ordem/timing.
  const checkpoints = [1440, 1025, 1024, 1023, 769, 768, 767, 500, 390, 320];
  for (const w of checkpoints) {
    await page.setViewportSize({ width: w, height: 900 });
    // Screenshot imediato (sem esperar) -- e exatamente o momento em que um bug
    // de ordem entre handlers apareceria (layout calculado com medidas antigas).
    await page.screenshot({ path: `${OUT}/checkpoint-${w}.png` });
  }

  const summary = {
    widthsVisited: widths.length + fastWidths.length + checkpoints.length,
    errors,
  };
  fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify(summary, null, 2));
  console.log('Erros de console/pagina durante todo o sweep:', errors.length);
  errors.forEach((e) => console.log('  ', e));

  await browser.close();
}

run();
