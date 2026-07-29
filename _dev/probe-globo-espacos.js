// Mede os espacos em branco acima/abaixo do GLOBO (esfera desenhada, nao o
// bounding box do canvas) no estado 0, em 4 larguras mobile. Nao altera nada.
const { chromium } = require('playwright');

const LARG = [[320, 800], [360, 800], [393, 852], [430, 932]];

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

// Geometria da esfera projetada em pixels de tela.
// A esfera tem raio 1 na geometria e recebe group.scale = S, ficando na origem.
// A camera perspectiva esta em z=d olhando para a origem. O contorno visto e um
// circulo de raio angular asin(S/d); em pixels isso vira
//   r_px = tan(asin(S/d)) / tan(vFOV/2) * (H/2)
// Depois o CSS transform scale(sc) amplia em torno do centro do canvas.
const medir = () => {
  const i = window.__i;
  const cv = document.getElementById('zv-globe-canvas');
  const h = document.getElementById('zv-globe-h');
  const sub = document.getElementById('zv-globe-sub');
  const g = i._globe;
  if (!g) return { erro: 'globo nao inicializado' };

  const S = g.group.scale.x;            // raio da esfera em unidades de mundo
  const d = g.camera.position.z;
  const vFOV = g.camera.fov * Math.PI / 180;
  const rc = cv.getBoundingClientRect();   // JA inclui o transform CSS
  const cs = getComputedStyle(cv);

  // dimensoes SEM o transform (layout), para calcular a projecao
  const layoutH = cv.clientHeight, layoutW = cv.clientWidth;
  const rPxSemCss = Math.tan(Math.asin(Math.min(0.999, S / d))) / Math.tan(vFOV / 2) * (layoutH / 2);

  // extrai a escala efetiva da matrix computada
  const mm = cs.transform.match(/matrix\(([^)]+)\)/);
  const p = mm ? mm[1].split(',').map(Number) : [1, 0, 0, 1, 0, 0];
  const scX = p[0], scY = p[3], txPx = p[4], tyPx = p[5];

  const centroY = rc.top + rc.height / 2;      // centro do canvas ja transformado
  const rPx = rPxSemCss * scY;

  const rh = h.getBoundingClientRect();
  const rs = sub.getBoundingClientRect();

  return {
    vh: window.innerHeight,
    S: +S.toFixed(4), d, fovDeg: g.camera.fov,
    layoutW, layoutH,
    scaleCss: +scY.toFixed(4), tyPx: Math.round(tyPx),
    canvasTop: Math.round(rc.top), canvasBottom: Math.round(rc.bottom), canvasH: Math.round(rc.height),
    esferaCentroY: Math.round(centroY),
    esferaRaioPx: Math.round(rPx),
    esferaTopo: Math.round(centroY - rPx),
    esferaBase: Math.round(centroY + rPx),
    tituloBase: Math.round(rh.bottom),
    subtituloTopo: Math.round(rs.top),
    espacoAcima: Math.round((centroY - rPx) - rh.bottom),
    espacoAbaixo: Math.round(rs.top - (centroY + rPx)),
  };
};

(async () => {
  const browser = await chromium.launch();
  const linhas = [];
  for (const [w, hh] of LARG) {
    const ctx = await browser.newContext({ viewport: { width: w, height: hh } });
    const page = await ctx.newPage();
    await page.goto('http://localhost:8752/index.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.evaluate(achaInst);
    await page.evaluate(() => window.scrollTo(0, window.__i._snapStops()[0]));
    await page.waitForTimeout(900);
    const m = await page.evaluate(medir);
    linhas.push([w, hh, m]);

    // verificacao VISUAL: desenha marcadores no topo/base calculados da esfera
    await page.evaluate((mm) => {
      const mk = (y, cor, rot) => {
        const el = document.createElement('div');
        el.style.cssText = 'position:fixed;left:0;right:0;top:' + y + 'px;height:2px;background:' + cor + ';z-index:9999;pointer-events:none';
        const lb = document.createElement('div');
        lb.textContent = rot;
        lb.style.cssText = 'position:fixed;left:4px;top:' + (y + 3) + 'px;color:' + cor + ';font:11px monospace;z-index:9999;pointer-events:none';
        document.body.appendChild(el); document.body.appendChild(lb);
      };
      mk(mm.tituloBase, '#00ff00', 'base titulo');
      mk(mm.esferaTopo, '#ff00ff', 'topo esfera (calc)');
      mk(mm.esferaBase, '#ff00ff', 'base esfera (calc)');
      mk(mm.subtituloTopo, '#00ff00', 'topo subtitulo');
    }, m);
    await page.screenshot({ path: `globo-medida-${w}.png` });
    await ctx.close();
  }
  await browser.close();

  console.log('=== ESTADO 0 — espacos em branco (esfera projetada, nao o canvas) ===');
  console.log('');
  console.log('larg | viewport | canvas(top..bottom,h)  | esfera centroY raio | topo  base  | ESPACO ACIMA | ESPACO ABAIXO | difer.');
  console.log('-----+----------+------------------------+---------------------+-------------+--------------+---------------+-------');
  for (const [w, hh, m] of linhas) {
    console.log(
      String(w).padEnd(4) + ' | ' + String(hh).padEnd(8) + ' | ' +
      (m.canvasTop + '..' + m.canvasBottom + ', ' + m.canvasH).padEnd(22) + ' | ' +
      (String(m.esferaCentroY).padStart(7) + ' ' + String(m.esferaRaioPx).padStart(4)).padEnd(19) + ' | ' +
      (String(m.esferaTopo).padStart(5) + ' ' + String(m.esferaBase).padStart(5)).padEnd(11) + ' | ' +
      String(m.espacoAcima).padStart(12) + ' | ' + String(m.espacoAbaixo).padStart(13) + ' | ' +
      String(m.espacoAcima - m.espacoAbaixo).padStart(6)
    );
  }
  console.log('');
  console.log('parametros three.js: S(raio mundo)=' + linhas[0][2].S + '  camera.z=' + linhas[0][2].d + '  fov=' + linhas[0][2].fovDeg + '  escalaCSS=' + linhas[0][2].scaleCss + '  tyPx=' + linhas[0][2].tyPx);
})();
