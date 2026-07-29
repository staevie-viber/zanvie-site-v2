// Simula escala + deslocamento vertical do globo nos estados 0/3 (sem editar
// arquivo) e mede o efeito nos 4 estados, para verificar se os laterais (1 e 2)
// sao afetados. Estado 0/3: espacos vs titulo/subtitulo. Estados 1/2: geometria
// da esfera vs o bloco de texto lateral correspondente.
const { chromium } = require('playwright');

const LARG = [[320, 800], [360, 800], [393, 852], [430, 932]];
const ESC = Number(process.argv[2] || 1.61);
const TY = Number(process.argv[3] || -10.4);

const bootstrap = () => {
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

  // Geometria da esfera projetada, lendo o transform REAL aplicado no canvas.
  window.__esfera = () => {
    const cv = document.getElementById('zv-globe-canvas');
    const g = window.__i._globe;
    const S = g.group.scale.x, d = g.camera.position.z, vFOV = g.camera.fov * Math.PI / 180;
    const rSem = Math.tan(Math.asin(Math.min(0.999, S / d))) / Math.tan(vFOV / 2) * (cv.clientHeight / 2);
    const p = (getComputedStyle(cv).transform.match(/matrix\(([^)]+)\)/) || [0, '1,0,0,1,0,0'])[1].split(',').map(Number);
    const rc = cv.getBoundingClientRect();
    const cx = rc.left + rc.width / 2, cy = rc.top + rc.height / 2;
    const r = rSem * p[3];
    return { cx: Math.round(cx), cy: Math.round(cy), r: Math.round(r),
      topo: Math.round(cy - r), base: Math.round(cy + r),
      esq: Math.round(cx - r), dir: Math.round(cx + r), escala: +p[3].toFixed(3) };
  };
  window.__rect = (id) => {
    const el = document.getElementById(id); if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) };
  };
  // Aplica o transform proposto (so faz sentido nos estados 0/3).
  // transition:none e OBRIGATORIO: _renderGlobeState deixa "transform 850ms" no
  // canvas, entao medir logo apos aplicar pegaria a animacao no meio do caminho
  // (foi o que aconteceu na primeira tentativa: raio 165 em vez de 178).
  window.__aplicar = (o) => {
    const cv = document.getElementById('zv-globe-canvas');
    cv.style.transition = 'none';
    cv.style.transform = 'translate(0%, ' + o.ty + '%) scale(' + o.esc + ')';
    void cv.offsetHeight;   // forca reflow para o valor valer imediatamente
  };
};


(async () => {
  const browser = await chromium.launch();
  const res = {};
  for (const [w, hh] of LARG) {
    const ctx = await browser.newContext({ viewport: { width: w, height: hh } });
    const page = await ctx.newPage();
    await page.goto('http://localhost:8752/index.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.evaluate(bootstrap);
    await page.evaluate(([e, t]) => { window.ESC_G = e; window.TY_G = t; }, [ESC, TY]);
    await page.evaluate(() => window.scrollTo(0, window.__i._snapStops()[0]));
    await page.waitForTimeout(900);
    // ANTES
    const antes = await coletarNoBrowser(page, false);
    // DEPOIS
    const depois = await coletarNoBrowser(page, true);
    res[w] = { antes, depois, vh: hh };
    await ctx.close();
  }
  await browser.close();

  console.log(`=== ESTADOS 0 e 3 (centrado) — escala 1.40 -> ${ESC} (+${Math.round((ESC / 1.4 - 1) * 100)}%), ty 0 -> ${TY}% ===`);
  console.log('larg | ANTES acima/abaixo (dif) | DEPOIS acima/abaixo (dif) | raio antes->depois');
  console.log('-----+--------------------------+---------------------------+-------------------');
  for (const [w] of LARG) {
    const a = res[w].antes[0], b = res[w].depois[0];
    const aA = a.esfera.topo - a.titulo.bottom, aB = a.sub.top - a.esfera.base;
    const bA = b.esfera.topo - b.titulo.bottom, bB = b.sub.top - b.esfera.base;
    console.log(String(w).padEnd(4) + ' | ' + (aA + ' / ' + aB + ' (' + (aA - aB) + ')').padEnd(24) +
      ' | ' + (bA + ' / ' + bB + ' (' + (bA - bB) + ')').padEnd(25) + ' | ' + a.esfera.r + ' -> ' + b.esfera.r);
  }

  console.log('');
  console.log('=== ESTADOS 1 e 2 (laterais) — foram afetados? ===');
  console.log('larg | est | esfera antes (cx,cy,r)   | esfera depois (cx,cy,r)  | texto lateral (top..bottom) | mudou?');
  console.log('-----+-----+--------------------------+--------------------------+-----------------------------+-------');
  for (const [w] of LARG) {
    for (const st of [1, 2]) {
      const a = res[w].antes[st].esfera, b = res[w].depois[st].esfera;
      const txt = st === 1 ? res[w].depois[st].ladoEsq : res[w].depois[st].ladoDir;
      const igual = a.cx === b.cx && a.cy === b.cy && a.r === b.r;
      console.log(String(w).padEnd(4) + ' |  ' + st + '  | ' +
        (a.cx + ',' + a.cy + ',' + a.r).padEnd(24) + ' | ' + (b.cx + ',' + b.cy + ',' + b.r).padEnd(24) +
        ' | ' + (txt.top + '..' + txt.bottom).padEnd(27) + ' | ' + (igual ? 'nao' : 'SIM'));
    }
  }
})();

// coleta rodando dentro do browser com as constantes injetadas
async function coletarNoBrowser(page, aplicar) {
  const out = {};
  for (const st of [0, 1, 2, 3]) {
    await page.evaluate((s) => window.__i._setGlobeState(s), st);
    await page.waitForTimeout(1100);
    if (aplicar && (st === 0 || st === 3)) {
      await page.evaluate(() => window.__aplicar({ esc: window.ESC_G, ty: window.TY_G }));
      await page.waitForTimeout(120);
    }
    out[st] = await page.evaluate(() => ({
      esfera: window.__esfera(),
      titulo: window.__rect('zv-globe-h'),
      sub: window.__rect('zv-globe-sub'),
      ladoEsq: window.__rect('zv-globe-side-left'),
      ladoDir: window.__rect('zv-globe-side-right'),
    }));
  }
  return out;
}
