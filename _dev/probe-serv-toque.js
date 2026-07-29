// Instrumenta o caminho de TOQUE na zona da Timeline para descobrir por que
// _servTransition nao dispara no mobile. So observa; nao altera o site.
const { chromium } = require('playwright');

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

const instrumentar = () => {
  const i = window.__i;
  window.__L = [];
  const log = (ev, extra) => window.__L.push(Object.assign({ ev }, extra));

  const oST = i._servTransition.bind(i);
  i._servTransition = (dir) => {
    const z = i._servZone();
    const y = window.scrollY;
    const r = oST(dir);
    log('_servTransition', { dir, retorno: r, y,
      zona: z ? { pinY: Math.round(z.pinY), triggerY: Math.round(z.triggerY), coverY: Math.round(z.coverY) } : null,
      servCovered: !!i._servCovered,
      condFrente: z ? (!i._servCovered && dir > 0 && y >= z.triggerY - 2 && y < z.coverY - 2) : null,
      condTras: z ? (i._servCovered && dir < 0 && y <= z.coverY + 2 && y > z.pinY + 2) : null });
    return r;
  };
  const oAS = i._animServ.bind(i);
  i._animServ = (rev, z) => { log('_animServ', { reverse: rev }); return oAS(rev, z); };

  // espelha a logica de _onTouchMove para saber ONDE ele sai
  const oTM = i._onTouchMove;
  i._onTouchMove = (e) => {
    const y = window.scrollY;
    const dyv = i._touchY - e.touches[0].clientY;
    const z = i._servZone && i._servZone();
    const stops = i._snapStops();
    const forade = (y < stops[0] - 2 || y > stops[stops.length - 1] + 2);
    const sd = dyv > 0 ? 1 : -1;
    const condZona = z ? ((!i._servCovered && sd > 0 && y >= z.triggerY - 2 && y < z.coverY - 2) ||
      (i._servCovered && sd < 0 && y <= z.coverY + 2 && y > z.pinY + 2)) : false;
    log('_onTouchMove', { y, dyv: Math.round(dyv), travado: !!i._scrollLocked, servAnim: !!i._servAnimating,
      temZona: !!z, condZonaServ: condZona, foraDaZonaSnap: forade,
      stops: stops.map(Math.round) });
    const r = oTM(e);
    window.__L[window.__L.length - 1].touchDeltaDepois = i._touchDelta;
    return r;
  };
  const oTE = i._onTouchEnd;
  i._onTouchEnd = (e) => {
    log('_onTouchEnd', { touchDeltaAntes: i._touchDelta, travado: !!i._scrollLocked, servAnim: !!i._servAnimating });
    return oTE(e);
  };
  // re-registra os listeners para as versoes instrumentadas valerem
  window.removeEventListener('touchmove', oTM);
  window.removeEventListener('touchend', oTE);
  window.addEventListener('touchmove', i._onTouchMove, { passive: false });
  window.addEventListener('touchend', i._onTouchEnd, { passive: true });
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto('http://localhost:8752/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.evaluate(achaInst);

  // Navega pelo fluxo REAL: um salto direto ate a Timeline cruzaria gTop e a
  // trava do globo reengataria. Primeiro deixa travar em gTop, depois libera a
  // sequencia (que faz o snap ate wTop) e so entao desce ate a zona de Servicos
  // -- descendo a partir de wTop nao ha cruzamento de gTop, entao nao retrava.
  await page.evaluate(() => window.scrollTo(0, window.__i._snapStops()[0]));
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__i._releaseGlobeSeq(1));   // destrava + snap ate a Timeline
  await page.waitForTimeout(1600);
  const z = await page.evaluate(() => {
    const serv = document.getElementById('servicos');
    const coverY = Math.round(serv.getBoundingClientRect().top + window.scrollY);
    const pinY = coverY - window.innerHeight;
    window.scrollTo(0, pinY + 40);
    return { coverY, pinY, alvo: pinY + 40 };
  });
  await page.waitForTimeout(800);
  await page.evaluate(instrumentar);

  const estado = await page.evaluate(() => ({
    y: Math.round(window.scrollY), travado: !!window.__i._scrollLocked,
    servCovered: !!window.__i._servCovered, globeReleased: !!window.__i._globeReleased,
    zona: (() => { const zz = window.__i._servZone(); return zz ? { pinY: Math.round(zz.pinY), triggerY: Math.round(zz.triggerY), coverY: Math.round(zz.coverY) } : null; })(),
    stops: window.__i._snapStops().map(Math.round),
  }));
  console.log('posicao inicial:', JSON.stringify(estado));
  console.log('');

  // swipe para CIMA (arrastar para cima = rolar para baixo = dir > 0)
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 700 }] });
  for (const yy of [640, 570, 500, 430, 360]) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y: yy }] });
    await page.waitForTimeout(30);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(1500);

  const L = await page.evaluate(() => window.__L);
  console.log('=== TRACE DO CAMINHO DE TOQUE ===');
  for (const e of L) {
    if (e.ev === '_onTouchMove') {
      console.log(`  _onTouchMove  y=${e.y} dyv=${e.dyv} travado=${e.travado} temZona=${e.temZona} condZonaServ=${e.condZonaServ} foraDaZonaSnap=${e.foraDaZonaSnap} -> _touchDelta=${e.touchDeltaDepois}`);
    } else if (e.ev === '_onTouchEnd') {
      console.log(`  _onTouchEnd   _touchDelta=${e.touchDeltaAntes} travado=${e.travado}`);
    } else if (e.ev === '_servTransition') {
      console.log(`  _servTransition(dir=${e.dir}) -> ${e.retorno}   y=${e.y} zona=${JSON.stringify(e.zona)} servCovered=${e.servCovered} condFrente=${e.condFrente} condTras=${e.condTras}`);
    } else if (e.ev === '_animServ') {
      console.log(`  _animServ(reverse=${e.reverse})  <<< ANIMACAO DISPAROU`);
    }
  }
  const fim = await page.evaluate(() => ({ y: Math.round(window.scrollY), servCovered: !!window.__i._servCovered }));
  console.log('');
  console.log('posicao final:', JSON.stringify(fim), ' (coverY=' + z.coverY + ')');
  console.log(L.some(e => e.ev === '_animServ') ? 'RESULTADO: animacao DISPAROU' : 'RESULTADO: animacao NAO disparou -- scroll nativo');
  await browser.close();
})();
