// Diagnostico do subtitulo laranja da secao do Globo em mobile.
// Testa as 5 hipoteses com medicao real. Nao altera nada.
const { chromium } = require('playwright');

const medir = () => {
  const sub = document.getElementById('zv-globe-sub');
  const h = document.getElementById('zv-globe-h');
  const center = document.getElementById('zv-globe-center');
  const sec = document.getElementById('globo');
  const stage = document.getElementById('zv-globe-stage');
  const canvas = document.getElementById('zv-globe-canvas');
  if (!sub) return { existe: false };

  const cs = getComputedStyle(sub);
  const csC = getComputedStyle(center);
  const r = sub.getBoundingClientRect();
  const rc = center.getBoundingClientRect();
  const rh = h.getBoundingClientRect();
  const rsec = sec.getBoundingClientRect();
  const rstage = stage.getBoundingClientRect();

  // quem esta no ponto central do subtitulo?
  const cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
  const noPonto = document.elementFromPoint(cx, cy);

  return {
    existe: true,
    texto: sub.textContent.trim().slice(0, 40),
    // H1: existencia / conteudo
    temTexto: sub.textContent.trim().length > 0,
    // H2: CSS ocultando
    display: cs.display, opacity: cs.opacity, visibility: cs.visibility,
    color: cs.color, fontSize: cs.fontSize, height: cs.height,
    centerDisplay: csC.display, centerOpacity: csC.opacity, centerVisibility: csC.visibility,
    centerOverflow: csC.overflow,
    stageOverflow: getComputedStyle(stage).overflow,
    secOverflow: getComputedStyle(sec).overflow,
    // H4: geometria
    viewportH: window.innerHeight,
    subTop: Math.round(r.top), subBottom: Math.round(r.bottom), subH: Math.round(r.height),
    subLeft: Math.round(r.left), subW: Math.round(r.width),
    hTop: Math.round(rh.top), hBottom: Math.round(rh.bottom),
    centerTop: Math.round(rc.top), centerBottom: Math.round(rc.bottom), centerH: Math.round(rc.height),
    centerPadTop: csC.paddingTop, centerPadBottom: csC.paddingBottom,
    centerJustify: csC.justifyContent, centerFlexDir: csC.flexDirection,
    secTop: Math.round(rsec.top), secBottom: Math.round(rsec.bottom), secH: Math.round(rsec.height),
    stageH: Math.round(rstage.height),
    // H5: empilhamento
    zIndexCenter: csC.zIndex, zIndexCanvas: getComputedStyle(canvas).zIndex,
    elementoNoPontoDoSub: noPonto ? (noPonto.id || noPonto.tagName + '.' + noPonto.className).slice(0, 50) : null,
    subEhOAlvo: !!(noPonto && (noPonto === sub || sub.contains(noPonto))),
    // dentro da viewport?
    dentroDaViewport: r.top >= 0 && r.bottom <= window.innerHeight,
    scrollY: Math.round(window.scrollY),
  };
};

(async () => {
  const browser = await chromium.launch();
  for (const [rot, w, hh] of [['MOBILE 393x852', 393, 852], ['MOBILE 360x800', 360, 800], ['DESKTOP 1440x900', 1440, 900]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: hh } });
    const page = await ctx.newPage();
    await page.goto('http://localhost:8752/index.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1400);
    // leva ate o ponto de pin do globo (estado 0)
    await page.evaluate(() => {
      const root = document.getElementById('dc-root');
      const key = Object.keys(root).find(k => k.startsWith('__reactContainer$') || k.startsWith('__reactFiber$'));
      const seen = new Set(); const stack = [root[key]]; let inst = null;
      while (stack.length) { const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f);
        const lg = f.stateNode && typeof f.stateNode === 'object' ? f.stateNode.logic : null;
        if (lg && '_globeState' in lg) { inst = lg; break; }
        if (f.child) stack.push(f.child); if (f.sibling) stack.push(f.sibling); }
      window.__i = inst;
      window.scrollTo(0, inst._snapStops()[0]);
    });
    await page.waitForTimeout(900);
    const m = await page.evaluate(medir);
    const st = await page.evaluate(() => ({ globeState: window.__i._globeState, travado: !!window.__i._scrollLocked }));
    console.log('==================== ' + rot + ' ====================');
    console.log('  globeState=' + st.globeState + '  travado=' + st.travado + '  scrollY=' + m.scrollY);
    console.log('  [H1] existe no DOM: ' + m.existe + '   texto: "' + m.texto + '"');
    console.log('  [H2] sub  -> display=' + m.display + ' opacity=' + m.opacity + ' visibility=' + m.visibility + ' height=' + m.height + ' color=' + m.color);
    console.log('       pai  -> display=' + m.centerDisplay + ' opacity=' + m.centerOpacity + ' visibility=' + m.centerVisibility + ' overflow=' + m.centerOverflow);
    console.log('       stage overflow=' + m.stageOverflow + '  secao overflow=' + m.secOverflow);
    console.log('  [H4] viewport altura=' + m.viewportH);
    console.log('       secao #globo: top=' + m.secTop + ' bottom=' + m.secBottom + ' altura=' + m.secH + '  (stage=' + m.stageH + ')');
    console.log('       #zv-globe-center: top=' + m.centerTop + ' bottom=' + m.centerBottom + ' altura=' + m.centerH);
    console.log('         flexDir=' + m.centerFlexDir + ' justify=' + m.centerJustify + ' padTop=' + m.centerPadTop + ' padBottom=' + m.centerPadBottom);
    console.log('       titulo  : top=' + m.hTop + ' bottom=' + m.hBottom);
    console.log('       SUBTITULO: top=' + m.subTop + ' bottom=' + m.subBottom + ' altura=' + m.subH + ' largura=' + m.subW);
    console.log('       >>> DENTRO DA VIEWPORT (0.." + m.viewportH + ")? ' + m.dentroDaViewport);
    console.log('  [H5] z-index center=' + m.zIndexCenter + ' canvas=' + m.zIndexCanvas);
    console.log('       elementFromPoint no centro do sub: ' + m.elementoNoPontoDoSub + '  (o sub e o alvo? ' + m.subEhOAlvo + ')');
    console.log('');
    await ctx.close();
  }
  await browser.close();
})();
