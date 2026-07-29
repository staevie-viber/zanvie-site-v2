// Mede os 3 problemas da transicao Timeline -> Servicos. So observa.
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

const irParaZonaServ = async (page) => {
  await page.evaluate(() => window.scrollTo(0, window.__i._snapStops()[0]));
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__i._releaseGlobeSeq(1));
  await page.waitForTimeout(1600);
  return await page.evaluate(() => {
    const serv = document.getElementById('servicos');
    const coverY = Math.round(serv.getBoundingClientRect().top + window.scrollY);
    const pinY = coverY - window.innerHeight;
    window.scrollTo(0, pinY + 40);
    return { coverY, pinY };
  });
};

// mede a folga entre o fim da Timeline e o inicio de Servicos, com subpixel
const medirFolga = () => {
  const est = document.getElementById('estrategia');
  const serv = document.getElementById('servicos');
  const sp = document.getElementById('zv-serv-spacer');
  const re = est.getBoundingClientRect(), rs = serv.getBoundingClientRect();
  return {
    estBottom: +re.bottom.toFixed(3), servTop: +rs.top.toFixed(3),
    folga: +(rs.top - re.bottom).toFixed(3),
    servPosition: getComputedStyle(serv).position,
    servTransform: getComputedStyle(serv).transform,
    spacerH: sp ? getComputedStyle(sp).height : '(sem spacer)',
    spacerOffsetH: sp ? sp.offsetHeight : null,
    servOffsetH: serv.offsetHeight,
    scrollY: Math.round(window.scrollY),
  };
};

(async () => {
  const browser = await chromium.launch();

  for (const [rot, w, h, touch] of [['DESKTOP 1440', 1440, 900, false], ['MOBILE 393', 393, 852, true]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch });
    const page = await ctx.newPage();
    await page.goto('http://localhost:8752/index.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.evaluate(achaInst);
    const z = await irParaZonaServ(page);
    await page.waitForTimeout(700);

    console.log('==================== ' + rot + ' ====================');
    const antes = await page.evaluate(medirFolga);
    console.log('PROBLEMA 1 — folga Timeline/Servicos');
    console.log('  ANTES  : estBottom=' + antes.estBottom + ' servTop=' + antes.servTop + '  FOLGA=' + antes.folga + 'px  pos=' + antes.servPosition + ' spacer=' + antes.spacerH);

    // dispara a transicao e amostra por frame: folga + duracao de frame (fps)
    const r = await page.evaluate(() => new Promise((res) => {
      const i = window.__i;
      const est = document.getElementById('estrategia'), serv = document.getElementById('servicos');
      const amostras = []; let prev = performance.now(); const t0 = prev;
      const tick = () => {
        const now = performance.now();
        const sp = document.getElementById('zv-serv-spacer');
        const re = est.getBoundingClientRect(), rs = serv.getBoundingClientRect();
        amostras.push({
          t: Math.round(now - t0), dur: +(now - prev).toFixed(2),
          folga: +(rs.top - re.bottom).toFixed(2),
          pos: getComputedStyle(serv).position,
          spacerH: sp ? sp.offsetHeight : null,
          y: Math.round(window.scrollY),
        });
        prev = now;
        if (now - t0 < 1600) requestAnimationFrame(tick); else res(amostras);
      };
      // dispara a transicao para frente
      i._servTransition(1);
      requestAnimationFrame(tick);
    }));

    const lentos = r.filter(s => s.dur > 16.7);
    const muitoLentos = r.filter(s => s.dur > 33);
    console.log('  DURANTE: folga min=' + Math.min(...r.map(s => s.folga)).toFixed(2) + '  max=' + Math.max(...r.map(s => s.folga)).toFixed(2));
    const comFolga = r.filter(s => s.folga > 0.01);
    if (comFolga.length) {
      console.log('  *** FOLGA POSITIVA em ' + comFolga.length + ' frames. Exemplos:');
      comFolga.slice(0, 5).forEach(s => console.log('      t=' + s.t + 'ms folga=' + s.folga + 'px pos=' + s.pos + ' spacerH=' + s.spacerH + ' y=' + s.y));
    } else {
      console.log('  (nenhum frame com folga positiva durante a animacao)');
    }
    const depois = await page.evaluate(medirFolga);
    console.log('  DEPOIS : estBottom=' + depois.estBottom + ' servTop=' + depois.servTop + '  FOLGA=' + depois.folga + 'px  pos=' + depois.servPosition + ' spacer=' + depois.spacerH);
    console.log('  spacer offsetHeight antes/depois: ' + antes.spacerOffsetH + ' / ' + depois.spacerOffsetH + '   (servOffsetH=' + depois.servOffsetH + ')');

    console.log('');
    console.log('PROBLEMA 2 — fluidez (' + r.length + ' frames em ' + r[r.length - 1].t + 'ms)');
    console.log('  frames > 16.7ms: ' + lentos.length + '   frames > 33ms (queda visivel): ' + muitoLentos.length);
    console.log('  pior frame: ' + Math.max(...r.map(s => s.dur)).toFixed(1) + 'ms');
    if (muitoLentos.length) console.log('  momentos dos travos: ' + muitoLentos.map(s => 't=' + s.t + 'ms(' + s.dur + 'ms)').join(', '));
    console.log('');
    await ctx.close();
  }
  await browser.close();
})();
