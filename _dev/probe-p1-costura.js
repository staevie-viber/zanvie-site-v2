// P1: a costura Timeline/Servicos. Mede luminancia por linha ao redor da borda.
//
// NAO tenta fotografar a animacao em voo: page.screenshot leva 100-300ms para
// rasterizar e as coordenadas ficariam defasadas dos pixels. Em vez disso monta
// o MESMO estado de camada fixa que _animServ monta, com transition:none e um
// translateY escolhido -- reproducao estatica de um frame do meio da animacao,
// deterministica. Roda o mesmo frame COM e SEM a classe zv-serv-anim, o que
// isola se o backdrop-filter dos filhos era a causa do artefato branco.
const { chromium } = require('playwright');
const zlib = require('zlib');

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

const irParaZona = async (page, off) => {
  await page.evaluate(() => window.scrollTo(0, window.__i._snapStops()[0]));
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__i._releaseGlobeSeq(1));
  await page.waitForTimeout(1600);
  const z = await page.evaluate((o) => {
    const serv = document.getElementById('servicos');
    const coverY = serv.getBoundingClientRect().top + window.scrollY;
    const pinY = coverY - window.innerHeight;
    window.scrollTo(0, pinY + o);
    return { coverY: Math.round(coverY), pinY: Math.round(pinY) };
  }, off);
  await page.waitForTimeout(600);
  return z;
};

function decodePNG(buf) {
  let p = 8, w = 0, h = 0, ct = 0, bd = 0; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p); const tipo = buf.toString('ascii', p + 4, p + 8);
    const d = buf.slice(p + 8, p + 8 + len);
    if (tipo === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; ct = d[9]; }
    else if (tipo === 'IDAT') idat.push(d);
    else if (tipo === 'IEND') break;
    p += 12 + len;
  }
  if (bd !== 8 || (ct !== 2 && ct !== 6)) throw new Error('PNG inesperado bd=' + bd + ' ct=' + ct);
  const canais = ct === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * canais, out = Buffer.alloc(h * stride);
  let q = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[q++]; const linha = raw.slice(q, q + stride); q += stride;
    const dst = out.slice(y * stride, (y + 1) * stride);
    const ant = y > 0 ? out.slice((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= canais ? dst[x - canais] : 0, b = ant[x], c = x >= canais ? ant[x - canais] : 0;
      let v = linha[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      dst[x] = v & 0xff;
    }
  }
  return { w, h, canais, data: out };
}

const lumPorLinha = (img) => {
  const { w, h, canais, data } = img; const r = [];
  for (let y = 0; y < h; y++) {
    let s = 0;
    for (let x = 0; x < w; x++) {
      const i = y * w * canais + x * canais;
      s += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    }
    r.push(+(s / w).toFixed(1));
  }
  return r;
};

// monta o frame congelado; comClasse decide se o blur dos filhos fica desligado
const congela = ({ comClasse, pctY }) => {
  const serv = document.getElementById('servicos');
  let spacer = document.getElementById('zv-serv-spacer');
  if (!spacer) {
    spacer = document.createElement('div');
    spacer.id = 'zv-serv-spacer';
    spacer.setAttribute('aria-hidden', 'true');
    serv.parentNode.insertBefore(spacer, serv);
  }
  spacer.style.height = serv.offsetHeight + 'px';
  serv.style.position = 'fixed';
  serv.style.left = '0'; serv.style.right = '0'; serv.style.top = '0';
  serv.style.margin = '0'; serv.style.zIndex = '50';
  serv.style.willChange = 'transform';
  serv.style.minHeight = Math.ceil(window.innerHeight + 4) + 'px';
  serv.style.backdropFilter = 'none';
  serv.style.webkitBackdropFilter = 'none';
  if (comClasse) serv.classList.add('zv-serv-anim'); else serv.classList.remove('zv-serv-anim');
  serv.style.transition = 'none';
  serv.style.transform = 'translateY(' + pctY + '%)';
  serv.getBoundingClientRect();   // forca reflow, sem transicao pendente
  return Math.round(serv.getBoundingClientRect().top);
};

(async () => {
  const browser = await chromium.launch();
  for (const [rot, w, h] of [['DESKTOP 1440x900', 1440, 900], ['MOBILE 393x852', 393, 852]]) {
    console.log('==================== ' + rot + ' ====================');
    const colhido = {};
    for (const comClasse of [false, true]) {
      // contexto novo por medida: garante que nenhum estado anterior contamine
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 768 });
      const page = await ctx.newPage();
      await page.goto('http://localhost:8752/index.html', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      await page.evaluate(achaInst);
      await irParaZona(page, 40);
      const borda = await page.evaluate(congela, { comClasse, pctY: 30 });
      await page.waitForTimeout(400);   // deixa rasterizar; nada mais se move
      const bordaConf = await page.evaluate(() =>
        Math.round(document.getElementById('servicos').getBoundingClientRect().top));
      const y0 = Math.max(0, borda - 8);
      const shot = await page.screenshot({ clip: { x: 0, y: y0, width: w, height: 17 } });
      const lums = lumPorLinha(decodePNG(shot));
      console.log('--- ' + (comClasse ? 'COM zv-serv-anim (blur dos filhos OFF)' : 'SEM a classe (blur dos filhos ON, = comportamento antigo)') + ' ---');
      console.log('    borda antes/depois do screenshot: ' + borda + ' / ' + bordaConf +
        (borda === bordaConf ? '  (estatico, medida valida)' : '  *** MOVEU: medida invalida ***'));
      lums.forEach((L, i) => {
        const yy = y0 + i;
        const tag = yy === borda ? ' <borda>' : (yy < borda ? ' Timeline' : ' Servicos');
        console.log('    y=' + String(yy).padStart(4) + tag.padEnd(10) + ' lum=' + String(L).padStart(6));
      });
      const acima = lums.slice(0, borda - y0);          // lado da Timeline
      console.log('    lado Timeline: min=' + Math.min(...acima) + ' max=' + Math.max(...acima));
      colhido[comClasse ? 'com' : 'sem'] = lums;
      await ctx.close();
    }
    // A comparacao que importa: o mesmo frame congelado, com e sem a classe.
    // Se as duas series forem iguais, o backdrop-filter dos filhos nao participa
    // da costura -- e a correcao de P2 nao pode ter resolvido P1.
    const iguais = JSON.stringify(colhido.sem) === JSON.stringify(colhido.com);
    console.log('>>> COM vs SEM a classe: ' + (iguais
      ? 'series de luminancia IDENTICAS -> o blur dos filhos nao afeta a costura; P1 inalterado'
      : 'series DIFERENTES -> o blur dos filhos participa da costura'));
    if (!iguais) {
      colhido.sem.forEach((L, i) => {
        if (L !== colhido.com[i]) console.log('    linha ' + i + ': sem=' + L + ' com=' + colhido.com[i]);
      });
    }
    console.log('');
  }
  await browser.close();
})();
