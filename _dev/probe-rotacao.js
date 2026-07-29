// Mede a velocidade angular REAL do globo (graus/segundo), mobile 393px:
// (a) parado no estado 0, sem gesto recente (spd = globeRotationSpeed)
// (b) durante os 850ms seguintes a uma troca de estado (spd = globeFastRotationSpeed)
// Nao altera nada -- so le group.rotation.y por rAF.
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

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:8752/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.evaluate(achaInst);
  await page.evaluate(() => window.scrollTo(0, window.__i._snapStops()[0]));
  await page.waitForTimeout(900); // assenta no estado 0, _globeFast ja expirou

  const props = await page.evaluate(() => ({
    normal: window.__i.props.globeRotationSpeed,
    fast: window.__i.props.globeFastRotationSpeed,
    dur: window.__i.props.globeStateTransitionDuration,
  }));
  console.log('props reais: globeRotationSpeed=' + props.normal + '  globeFastRotationSpeed=' + props.fast + '  dur=' + props.dur);
  console.log('');

  // (a) velocidade angular em repouso (estado 0, sem gesto recente, _globeFast=false)
  const fastFlagAntes = await page.evaluate(() => !!window.__i._globeFast);
  const a = await page.evaluate(() => new Promise((res) => {
    const g = window.__i._globe.group;
    const t0 = performance.now(); const y0 = g.rotation.y;
    setTimeout(() => {
      const t1 = performance.now(); const y1 = g.rotation.y;
      res({ dt: (t1 - t0) / 1000, dy: y1 - y0, fastDuranteMedicao: !!window.__i._globeFast });
    }, 1000);
  }));
  const degPerSecA = (a.dy / a.dt) * (180 / Math.PI);
  console.log('(a) REPOUSO (estado 0, sem gesto): _globeFast antes da medicao=' + fastFlagAntes + ', durante=' + a.fastDuranteMedicao);
  console.log('    dy=' + a.dy.toFixed(4) + 'rad em dt=' + a.dt.toFixed(3) + 's  =>  ' + degPerSecA.toFixed(2) + ' graus/s');
  console.log('    esperado (spd=' + props.normal + ' rad/s): ' + (props.normal * 180 / Math.PI).toFixed(2) + ' graus/s');
  console.log('');

  // (b) troca de estado e mede a velocidade angular DURANTE os 850ms seguintes
  // (exclui o proprio easing exponencial do estado 1's rotation-lock: usamos a
  // transicao 0->? Na verdade _globeGo(1) ativa o lock, que ANULA spd por
  // completo (usa dt*4 towards target). Para medir _globeFast puro, disparamos
  // a partir do estado 1 -> 2, onde nenhum dos dois tem rotation-lock.
  await page.evaluate(() => window.__i._globeGo(1));
  await page.waitForTimeout(1200); // deixa o rotation-lock do estado 1 assentar por completo
  const antesGo2 = await page.evaluate(() => ({ fast: !!window.__i._globeFast, lock: !!window.__i._globeLockActive }));
  console.log('antes de disparar 1->2: _globeFast=' + antesGo2.fast + '  _globeLockActive=' + antesGo2.lock);

  const b = await page.evaluate(() => new Promise((res) => {
    const g = window.__i._globe.group;
    window.__i._globeGo(2);
    const t0 = performance.now(); const y0 = g.rotation.y;
    const amostras = [];
    const tick = () => {
      amostras.push({ t: performance.now() - t0, y: g.rotation.y, fast: !!window.__i._globeFast, lock: !!window.__i._globeLockActive });
      if (performance.now() - t0 < 900) requestAnimationFrame(tick);
      else res(amostras);
    };
    requestAnimationFrame(tick);
  }));

  // calcula graus/s so na janela em que _globeFast=true e _globeLockActive=false
  let dyFast = 0, dtFast = 0, prev = null;
  for (const s of b) {
    if (prev && s.fast && !s.lock && prev.fast && !prev.lock) {
      dyFast += (s.y - prev.y);
      dtFast += (s.t - prev.t) / 1000;
    }
    prev = s;
  }
  const degPerSecB = dtFast > 0 ? (dyFast / dtFast) * (180 / Math.PI) : null;
  console.log('');
  console.log('(b) DURANTE os 850ms apos troca de estado (1->2, _globeFast=true, sem rotation-lock):');
  console.log('    janela medida dtFast=' + dtFast.toFixed(3) + 's (dentro dos ' + b[b.length - 1].t.toFixed(0) + 'ms amostrados)');
  console.log('    dy=' + dyFast.toFixed(4) + 'rad  =>  ' + (degPerSecB !== null ? degPerSecB.toFixed(2) : 'N/A') + ' graus/s');
  console.log('    esperado (spd=' + props.fast + ' rad/s): ' + (props.fast * 180 / Math.PI).toFixed(2) + ' graus/s');
  console.log('');
  console.log('primeiras/ultimas amostras (fast, lock):');
  console.log('  t=0    fast=' + b[0].fast + ' lock=' + b[0].lock);
  console.log('  t=~850 fast=' + b.find(s => s.t > 830)?.fast + ' lock=' + b.find(s => s.t > 830)?.lock + '  (deve ja ter expirado)');
  console.log('');
  console.log('RAZAO fast/normal medida: ' + (degPerSecB / degPerSecA).toFixed(3) + '   (esperado pelos props: ' + (props.fast / props.normal).toFixed(3) + ')');

  await browser.close();
})();
