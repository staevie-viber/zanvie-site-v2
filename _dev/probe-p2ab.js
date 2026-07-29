// A/B controlado da correcao de P2, na mesma maquina e sessao.
//
// Comparar com os numeros do diagnostico anterior nao serve: o BASELINE mudou
// entre sessoes (>16.7ms era 58, virou ~33 com o mesmo pior frame de ~18ms), o
// que mostra que a contagem >16.7ms e sensivel a carga de fundo. Aqui as duas
// condicoes rodam lado a lado no mesmo processo:
//
//   SEM  = a regra CSS #servicos.zv-serv-anim e REMOVIDA da folha de estilo
//          em runtime -> comportamento identico ao de antes da correcao
//   COM  = a regra ativa -> comportamento novo
//
// Nada mais difere. Contexto novo por condicao, 3 execucoes cada.
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

// remove a regra da correcao; devolve quantas regras removeu (deve ser 1)
const desligaRegra = () => {
  let n = 0;
  for (const sheet of document.styleSheets) {
    let regras;
    try { regras = sheet.cssRules; } catch (e) { continue; }
    for (let i = regras.length - 1; i >= 0; i--) {
      if (regras[i].selectorText && regras[i].selectorText.includes('zv-serv-anim')) {
        sheet.deleteRule(i); n++;
      }
    }
  }
  return n;
};

const irParaZona = async (page, off) => {
  await page.evaluate(() => window.scrollTo(0, window.__i._snapStops()[0]));
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__i._releaseGlobeSeq(1));
  await page.waitForTimeout(1600);
  await page.evaluate((o) => {
    const serv = document.getElementById('servicos');
    const coverY = serv.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, coverY - window.innerHeight + o);
  }, off);
  await page.waitForTimeout(500);
};

const perfil = async (page, dispara) => {
  await irParaZona(page, 40);
  return await page.evaluate((d) => new Promise((res) => {
    const durs = []; let prev = performance.now(); const t0 = prev;
    const tick = () => {
      const now = performance.now();
      durs.push(+(now - prev).toFixed(2)); prev = now;
      if (now - t0 < 1500) requestAnimationFrame(tick); else res(durs);
    };
    if (d) window.__i._servTransition(1);
    requestAnimationFrame(tick);
  }), dispara);
};

const med = (a) => a.reduce((s, x) => s + x, 0) / a.length;

(async () => {
  const browser = await chromium.launch();
  for (const [rot, w, h] of [['DESKTOP 1440x900', 1440, 900], ['MOBILE 393x852', 393, 852]]) {
    console.log('======================== ' + rot + ' ========================');
    const res = {};
    for (const cond of ['SEM', 'COM']) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 768 });
      const page = await ctx.newPage();
      await page.goto('http://localhost:8752/index.html', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      await page.evaluate(achaInst);
      if (cond === 'SEM') {
        const n = await page.evaluate(desligaRegra);
        if (n !== 1) { console.log('  !! esperava remover 1 regra, removeu ' + n + ' -- A/B invalido'); }
      }
      // confirma qual condicao esta valendo, lendo o computado no meio da animacao
      await irParaZona(page, 40);
      const durante = await page.evaluate(() => new Promise((r) => {
        window.__i._servTransition(1);
        setTimeout(() => r(getComputedStyle(document.getElementById('zv-carousel-track')).backdropFilter), 300);
      }));
      await page.waitForTimeout(1600);
      console.log('--- ' + cond + ' a regra | blur do track no meio da animacao: ' + durante + ' ---');

      const runs = [];
      for (let r = 0; r < 3; r++) { runs.push(await perfil(page, true)); await page.waitForTimeout(1200); }
      const base = await perfil(page, false);
      runs.forEach((d, i) => console.log('    run ' + (i + 1) + ': ' + String(d.length).padStart(3) +
        ' frames | >33ms: ' + String(d.filter(x => x > 33).length).padStart(2) +
        ' | pior: ' + Math.max(...d).toFixed(1).padStart(6) + 'ms'));
      console.log('    baseline (sem transicao): ' + base.length + ' frames | >33ms: ' +
        base.filter(x => x > 33).length + ' | pior: ' + Math.max(...base).toFixed(1) + 'ms');
      res[cond] = {
        frames: med(runs.map(d => d.length)),
        f33: med(runs.map(d => d.filter(x => x > 33).length)),
        pior: med(runs.map(d => Math.max(...d))),
      };
      await ctx.close();
    }
    const d = (k, casas) => {
      const a = res.SEM[k], b = res.COM[k];
      const delta = b - a, pct = a ? (delta / a * 100) : 0;
      return a.toFixed(casas) + '  ->  ' + b.toFixed(casas) + '   (' +
        (delta >= 0 ? '+' : '') + delta.toFixed(casas) + ', ' + (pct >= 0 ? '+' : '') + pct.toFixed(0) + '%)';
    };
    console.log('  >>> media de 3 runs, SEM -> COM a correcao');
    console.log('      frames em 1500ms : ' + d('frames', 1) + '   (mais = melhor)');
    console.log('      frames >33ms     : ' + d('f33', 1) + '   (menos = melhor)');
    console.log('      pior frame (ms)  : ' + d('pior', 1) + '   (menos = melhor)');
    console.log('');
  }
  await browser.close();
})();
