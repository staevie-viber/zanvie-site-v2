// Validacao completa da navbar mobile. Cada largura usa um CONTEXTO NOVO com
// reload limpo -- redimensionar o mesmo contexto mascararia vazamento de estilo
// inline entre mobile e desktop, que e exatamente um dos riscos em teste.
const { chromium } = require('playwright');

const LARGURAS = [320, 360, 393, 430];
const URL = 'http://localhost:8752/index.html';

const medir = () => {
  const pill = document.getElementById('zv-navpill');
  const bar = document.getElementById('zv-navbar');
  const cs = getComputedStyle(pill);
  const r = pill.getBoundingClientRect();
  // clicavel = o proprio pill (ou um filho) responde no hit-test do seu centro
  const cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
  const alvo = document.elementFromPoint(cx, cy);
  const clicavel = !!(alvo && (alvo === pill || pill.contains(alvo)));
  const itens = ['zv-pill-1', 'zv-pill-2', 'zv-pill-3'].map(id => {
    const el = document.getElementById(id);
    const rr = el.getBoundingClientRect();
    return { txt: el.textContent.trim(), w: Math.round(rr.width), right: Math.round(rr.right) };
  });
  return {
    box: `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`,
    right: Math.round(r.right),
    opacity: parseFloat(cs.opacity).toFixed(2),
    visibility: cs.visibility,
    display: cs.display,
    clicavel,
    barBottom: Math.round(bar.getBoundingClientRect().bottom),
    scrollW: document.body.scrollWidth,
    clientW: document.documentElement.clientWidth,
    itens,
    // conteudo cabe? (nenhum item ultrapassa a borda direita do pill)
    itensCabem: itens.every(i => i.right <= Math.round(r.right) + 1),
    pillScrollW: pill.scrollWidth,
    pillClientW: pill.clientWidth,
  };
};

(async () => {
  const browser = await chromium.launch();
  console.log('=== 1+2. TRES ESTADOS x LARGURA (contexto novo + reload limpo por largura) ===\n');
  let falhas = 0;
  for (const w of LARGURAS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 700 } });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1100);

    // (a) Hero, header visivel -> pill ausente
    const a = await page.evaluate(medir);
    // (b) header recolhida -> pill presente e completo
    await page.evaluate(() => window.scrollTo(0, window.innerHeight + 50));
    await page.waitForTimeout(1100);
    const b = await page.evaluate(medir);
    // (c) volta a Hero -> pill some
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(900);
    const c = await page.evaluate(medir);

    const linha = (rot, m, espVis) => {
      const okVis = espVis ? (parseFloat(m.opacity) > 0.99 && m.visibility === 'visible' && m.clicavel)
                           : (parseFloat(m.opacity) < 0.01 && m.visibility === 'hidden' && !m.clicavel);
      const okScroll = m.scrollW === m.clientW;
      const okCabe = espVis ? m.itensCabem && m.pillScrollW <= m.pillClientW + 1 : true;
      if (!okVis || !okScroll || !okCabe) falhas++;
      console.log(
        `  ${rot.padEnd(28)} box=${m.box.padEnd(18)} op=${m.opacity} vis=${m.visibility.padEnd(7)} clicavel=${String(m.clicavel).padEnd(5)}` +
        ` | scrollW=${m.scrollW}=clientW=${m.clientW} ${okScroll ? 'OK' : 'FALHA'}` +
        ` | ${okVis ? 'estado OK' : 'ESTADO FALHA'}${espVis ? (okCabe ? ' | itens cabem OK' : ' | ITENS NAO CABEM') : ''}`
      );
    };
    console.log(`--- ${w}px ---`);
    linha('(a) Hero, header visivel', a, false);
    linha('(b) header recolhida', b, true);
    linha('(c) volta a Hero', c, false);
    console.log(`      itens em (b): ${JSON.stringify(b.itens.map(i => i.txt + '=' + i.w + 'px'))}  pill=${b.pillClientW}px conteudo=${b.pillScrollW}px`);
    console.log('');
    await ctx.close();
  }
  console.log(`FALHAS TOTAIS: ${falhas}\n`);
  await browser.close();
})();
