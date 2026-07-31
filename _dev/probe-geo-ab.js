// A/B geometrico: mede gTop e wTop em dois builds lado a lado, por largura, por
// posicao de scroll e por valor de globeEntryScrollGap.
//
//   node probe-geo-ab.js <raizA> <raizB> [rotuloA] [rotuloB]
//
// Sobe um servidor estatico para cada raiz em portas proprias, entao os dois
// builds sao medidos no mesmo processo, sem trocar de servidor no meio.
// O gap importa: o clamp de gTop (offMax = estrTop - vh) so MORDE com o gap
// alto, e e exatamente ai que uma regressao em estrTop apareceria.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const MIME = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.png':'image/png',
  '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml', '.ttf':'font/ttf', '.json':'application/json' };

const sobeServidor = (raiz, porta) => new Promise((res) => {
  const s = http.createServer((req, r) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    fs.readFile(path.join(raiz, p), (err, data) => {
      if (err) { r.writeHead(404); r.end('not found'); return; }
      r.writeHead(200, { 'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream' });
      r.end(data);
    });
  }).listen(porta, () => res(s));
});

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

const medir = (y) => {
  window.scrollTo(0, y);
  const sy = window.scrollY;
  const st = window.__i._snapStops();
  const s2 = document.getElementById('estrategia');
  return {
    y: Math.round(sy),
    gTop: +st[0].toFixed(1),
    wTop: +st[1].toFixed(1),
    grudado: Math.abs(s2.getBoundingClientRect().top) < 1,
  };
};

// mede um build inteiro: larguras x gaps x posicoes
const varre = async (browser, porta, larguras, gaps) => {
  const out = {};
  for (const [w, h] of larguras) {
    for (const gap of gaps) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 768 });
      const p = await ctx.newPage();
      await p.goto('http://localhost:' + porta + '/index.html', { waitUntil: 'networkidle' });
      await p.waitForTimeout(1500);
      await p.evaluate(achaInst);
      // ZV_PROPS aplica-se aos DOIS builds; o gap entra por cima.
      const extra = process.env.ZV_PROPS ? JSON.parse(process.env.ZV_PROPS) : {};
      const over = Object.assign({}, extra, gap !== null ? { globeEntryScrollGap: gap } : {});
      if (Object.keys(over).length) {
        await p.evaluate((o) => window.__dcSetProps(window.__dcRootName(), o), over);
        await p.waitForTimeout(500);
        const vivo = await p.evaluate((ks) => { const r = {}; for (const k of ks) r[k] = window.__i.props[k]; return r; }, Object.keys(over));
        for (const k of Object.keys(over)) {
          // prop ausente no build antigo e esperado: so exige igualdade quando existe
          if (vivo[k] !== undefined && vivo[k] !== over[k]) throw new Error('override nao pegou: ' + k + ' esperado ' + over[k] + ', lido ' + vivo[k]);
        }
        // _layoutStack NAO e chamado por _applyAllTweaks -- so no mount, no
        // resize e pelo ResizeObserver. Sem este empurrao a geometria do tweak
        // nao seria reaplicada e a medicao seria a do layout antigo.
        await p.evaluate(() => { if (window.__i._layoutStack) window.__i._layoutStack(); });
        await p.waitForTimeout(300);
      }
      const base = await p.evaluate(() => window.__i._snapStops());
      // inclui posicoes DEPOIS de wTop, onde o sticky (se houver) estaria grudado
      const alvos = [0, Math.round(base[0]), Math.round(base[1]),
                     Math.round(base[1] + 400), Math.round(base[1] + 800), Math.round(base[1] + 1400)];
      const linhas = [];
      for (const t of alvos) linhas.push(await p.evaluate(medir, t));
      out[w + '|' + gap] = linhas;
      await ctx.close();
    }
  }
  return out;
};

(async () => {
  const [raizA, raizB, rotA = 'A', rotB = 'B'] = process.argv.slice(2);
  if (!raizA || !raizB) { console.error('uso: node probe-geo-ab.js <raizA> <raizB> [rotuloA] [rotuloB]'); process.exit(1); }
  const sA = await sobeServidor(path.resolve(raizA), 8761);
  const sB = await sobeServidor(path.resolve(raizB), 8762);
  const LARGURAS = [[320, 800], [360, 800], [390, 800], [430, 800], [1440, 900]];
  const GAPS = [null, 300];   // null = default do build; 300 = maximo do slider
  const browser = await chromium.launch();
  const A = await varre(browser, 8761, LARGURAS, GAPS);
  const B = await varre(browser, 8762, LARGURAS, GAPS);
  await browser.close();
  sA.close(); sB.close();

  let divergencias = 0;
  for (const chave of Object.keys(A)) {
    const [w, gap] = chave.split('|');
    console.log('======== ' + w + 'px | globeEntryScrollGap=' + (gap === 'null' ? 'default' : gap) + ' ========');
    console.log('   y      | gTop ' + rotA + ' / ' + rotB + '        | wTop ' + rotA + ' / ' + rotB + '        | grudado');
    const la = A[chave], lb = B[chave];
    for (let i = 0; i < la.length; i++) {
      const a = la[i], b = lb[i];
      const dg = +(b.gTop - a.gTop).toFixed(1), dw = +(b.wTop - a.wTop).toFixed(1);
      if (dg !== 0 || dw !== 0) divergencias++;
      console.log('  ' + String(a.y).padStart(5) + '   | ' +
        (String(a.gTop) + ' / ' + String(b.gTop)).padEnd(19) + ' | ' +
        (String(a.wTop) + ' / ' + String(b.wTop)).padEnd(19) + ' | ' +
        (b.grudado ? 'SIM' : ' - ') +
        (dg !== 0 || dw !== 0 ? '   <<< DIVERGE  dgTop=' + dg + ' dwTop=' + dw : ''));
    }
  }
  console.log('');
  console.log('>>> Linhas com gTop ou wTop divergente: ' + divergencias +
    (divergencias === 0 ? '   (geometria da trava identica nos dois builds)' : '   *** ATENCAO ***'));
})();
