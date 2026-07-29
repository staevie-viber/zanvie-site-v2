// Valida a correcao de P2 (backdrop-filter dos filhos desligado por classe
// durante _animServ). Tres medidas:
//   1) backdrop-filter computado do track/prev/next ANTES, DURANTE e DEPOIS
//   2) profiling da transicao SEM leitura de geometria no loop (metodo de
//      probe-final3.js) + baseline na mesma janela, 3 execucoes para variancia
//
// A costura de P1 fica em probe-p1-costura.js: fotografar a animacao em voo nao
// funciona (page.screenshot leva 100-300ms e as coordenadas ficam defasadas dos
// pixels), entao lá o frame e congelado.
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

// Navega pelo fluxo real: travar em gTop, liberar a sequencia, e so entao
// descer ate a zona de Servicos (descer de wTop nao cruza gTop, nao retrava).
const irParaZona = async (page, offset) => {
  await page.evaluate(() => window.scrollTo(0, window.__i._snapStops()[0]));
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__i._releaseGlobeSeq(1));
  await page.waitForTimeout(1600);
  const z = await page.evaluate((off) => {
    const serv = document.getElementById('servicos');
    const coverY = serv.getBoundingClientRect().top + window.scrollY;
    const pinY = coverY - window.innerHeight;
    window.scrollTo(0, pinY + off);
    return { coverY: Math.round(coverY), pinY: Math.round(pinY) };
  }, offset);
  await page.waitForTimeout(500);
  return z;
};

const IDS = ['zv-carousel-track', 'zv-carousel-prev', 'zv-carousel-next'];
const leBlur = (ids) => {
  const o = {};
  for (const id of ids) {
    const el = document.getElementById(id);
    o[id] = el ? getComputedStyle(el).backdropFilter : '(ausente)';
  }
  o['#servicos classList'] = document.getElementById('servicos').className || '(vazia)';
  return o;
};

// --- decoder PNG minimo (8-bit, color type 2 ou 6, sem interlace) ---
function decodePNG(buf) {
  let p = 8, w = 0, h = 0, ct = 0, bd = 0; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p); const tipo = buf.toString('ascii', p + 4, p + 8);
    const dados = buf.slice(p + 8, p + 8 + len);
    if (tipo === 'IHDR') { w = dados.readUInt32BE(0); h = dados.readUInt32BE(4); bd = dados[8]; ct = dados[9]; }
    else if (tipo === 'IDAT') idat.push(dados);
    else if (tipo === 'IEND') break;
    p += 12 + len;
  }
  if (bd !== 8 || (ct !== 2 && ct !== 6)) throw new Error('PNG inesperado: bd=' + bd + ' ct=' + ct);
  const canais = ct === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * canais;
  const out = Buffer.alloc(h * stride);
  let q = 0;
  for (let y = 0; y < h; y++) {
    const filtro = raw[q++];
    const linha = raw.slice(q, q + stride); q += stride;
    const dst = out.slice(y * stride, (y + 1) * stride);
    const ant = y > 0 ? out.slice((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= canais ? dst[x - canais] : 0, b = ant[x], c = x >= canais ? ant[x - canais] : 0;
      let v = linha[x];
      if (filtro === 1) v += a; else if (filtro === 2) v += b;
      else if (filtro === 3) v += (a + b) >> 1;
      else if (filtro === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      dst[x] = v & 0xff;
    }
  }
  return { w, h, canais, data: out };
}

// luminancia media de cada linha do recorte
const lumPorLinha = (img) => {
  const { w, h, canais, data } = img; const res = [];
  for (let y = 0; y < h; y++) {
    let s = 0;
    for (let x = 0; x < w; x++) {
      const i = y * w * canais + x * canais;
      s += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    }
    res.push(+(s / w).toFixed(1));
  }
  return res;
};

(async () => {
  const browser = await chromium.launch();
  for (const [rot, w, h] of [['DESKTOP 1440x900', 1440, 900], ['MOBILE 393x852', 393, 852]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 768 });
    const page = await ctx.newPage();
    await page.goto('http://localhost:8752/index.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.evaluate(achaInst);
    console.log('==================== ' + rot + ' ====================');

    // ---- 1) backdrop-filter antes / durante / depois ----
    await irParaZona(page, 40);
    const antes = await page.evaluate(leBlur, IDS);
    const durante = await page.evaluate((ids) => new Promise((res) => {
      window.__i._servTransition(1);
      // amostra no meio da animacao (dur=750ms)
      setTimeout(() => {
        const o = {};
        for (const id of ids) { const el = document.getElementById(id); o[id] = el ? getComputedStyle(el).backdropFilter : '(ausente)'; }
        o['#servicos classList'] = document.getElementById('servicos').className || '(vazia)';
        res(o);
      }, 300);
    }), IDS);
    await page.waitForTimeout(1600);
    const depois = await page.evaluate(leBlur, IDS);
    console.log('1) backdrop-filter computado');
    for (const k of [...IDS, '#servicos classList']) {
      const ok = antes[k] === depois[k] ? 'IGUAL' : '*** DIFERENTE ***';
      console.log('   ' + k.padEnd(22) + '\n       antes  : ' + antes[k] +
        '\n       durante: ' + durante[k] + '\n       depois : ' + depois[k] + '   -> ' + ok);
    }

    // ---- 2) profiling da transicao (sem leitura de geometria no loop) ----
    const perfil = async (dispara) => {
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
    const fmt = (d) => String(d.length).padStart(3) + ' frames | >16.7ms: ' + String(d.filter(x => x > 16.7).length).padStart(3) +
      ' | >33ms: ' + String(d.filter(x => x > 33).length).padStart(3) + ' | pior: ' + Math.max(...d).toFixed(1).padStart(6) + 'ms';
    console.log('2) profiling (janela de 1500ms, 3 execucoes)');
    const piores = [], p33 = [];
    for (let r = 1; r <= 3; r++) {
      const tr = await perfil(true);
      await page.waitForTimeout(1200);
      console.log('   run ' + r + ' TRANSICAO: ' + fmt(tr));
      piores.push(Math.max(...tr)); p33.push(tr.filter(x => x > 33).length);
    }
    const bl = await perfil(false);
    console.log('     BASELINE : ' + fmt(bl));
    console.log('   >33ms nas 3 runs: [' + p33.join(', ') + ']   pior frame: [' +
      piores.map(x => x.toFixed(1)).join(', ') + ']');
    console.log('');
    await ctx.close();
  }
  await browser.close();
})();
