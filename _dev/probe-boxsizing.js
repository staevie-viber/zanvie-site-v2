// Mede o impacto de box-sizing:border-box no #zv-globe-center, nos 4 estados do
// globo e nas 4 larguras mobile. Simula por injecao de estilo -- NAO edita o
// arquivo. Objetivo: descobrir se o bloco c serve so aos estados 0/3 ou tambem
// aos 1/2, e quanto cada conteudo se desloca.
const { chromium } = require('playwright');

const LARGURAS = [[320, 800], [360, 800], [393, 852], [430, 932]];

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

const medirEstado = () => {
  const g = (id) => {
    const el = document.getElementById(id);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), op: cs.opacity };
  };
  const c = document.getElementById('zv-globe-center');
  return {
    vh: window.innerHeight,
    centerBox: getComputedStyle(c).boxSizing,
    center: g('zv-globe-center'),
    titulo: g('zv-globe-h'),
    sub: g('zv-globe-sub'),
    ladoEsq: g('zv-globe-side-left'),
    ladoDir: g('zv-globe-side-right'),
    blurCentro: g('zv-globe-blur-center'),
    blurSub: g('zv-globe-blur-center-sub'),
  };
};

const dentro = (o, vh) => o && o.top >= 0 && o.bottom <= vh;

(async () => {
  const browser = await chromium.launch();
  for (const [w, h] of LARGURAS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    await page.goto('http://localhost:8752/index.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1300);
    await page.evaluate(achaInst);
    await page.evaluate(() => window.scrollTo(0, window.__i._snapStops()[0]));
    await page.waitForTimeout(700);

    console.log(`================= ${w}x${h} =================`);
    for (const fase of ['ANTES', 'DEPOIS']) {
      if (fase === 'DEPOIS') {
        // simula a correcao: box-sizing border-box + re-executa o layout mobile
        await page.evaluate(() => {
          document.getElementById('zv-globe-center').style.boxSizing = 'border-box';
          window.__i._applyGlobeCenterLayout();
          window.__i._updateGlobeTextBlur(0, 'linear');
        });
        await page.waitForTimeout(250);
      }
      console.log(`  --- ${fase} (box-sizing esperado: ${fase === 'ANTES' ? 'content-box' : 'border-box'}) ---`);
      for (const st of [0, 1, 2, 3]) {
        await page.evaluate((s) => { window.__i._setGlobeState(s); window.__i._updateGlobeTextBlur(0, 'linear'); }, st);
        await page.waitForTimeout(220);
        const m = await page.evaluate(medirEstado);
        const usaCentro = m.center.op !== '0';
        const alvo = st === 1 ? m.ladoEsq : st === 2 ? m.ladoDir : m.sub;
        const rotAlvo = st === 1 ? 'ladoEsq' : st === 2 ? 'ladoDir' : 'subtitulo';
        console.log(
          `    estado ${st}: center[box=${m.centerBox} top=${String(m.center.top).padStart(4)} h=${String(m.center.h).padStart(4)} op=${m.center.op}]` +
          `  ${rotAlvo}[top=${String(alvo.top).padStart(4)} bottom=${String(alvo.bottom).padStart(4)} op=${alvo.op}]` +
          `  ${usaCentro ? 'USA bloco c' : 'nao usa c '}  ${dentro(alvo, m.vh) ? 'DENTRO da viewport' : '*** FORA da viewport ***'}`
        );
      }
      // volta ao estado 0
      await page.evaluate(() => window.__i._setGlobeState(0));
      await page.waitForTimeout(150);
    }
    console.log('');
    await ctx.close();
  }
  await browser.close();
})();
