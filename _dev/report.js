// Le um traco do arnes e imprime o veredito.
//
// Um cenario tem "problema" se:
//   - inconsistent > 0          -> violou o invariante (serv animando sem trava)
//   - maxDriftWhileLocked > 0   -> a posicao derivou enquanto travado
//   - finalLock                 -> _snapAnimating ficou ligado; animacao nunca fechou
//   - estilo inline residual COM a trava solta -> vazamento
//   - errors.length > 0         -> erro/excecao de console
//
// Atencao: terminar com scrollLockedAoFim=true NAO e problema. Varios cenarios
// repousam no meio da sequencia do globo (E no estado 2, F/K/O/R_LOCK/S no 3) e
// ali a trava DEVE estar engatada -- os estilos inline sao a propria trava, nao
// residuo. So contam como vazamento quando sobrevivem ao destravamento.
//
//   node report.js <pasta-do-traco> [pasta-anterior]
//
// Com a segunda pasta, compara campo a campo e lista o que mudou de
// comportamento observavel entre as duas execucoes.
const path = require('path');

const CAMPOS = ['globeStates', 'lockCycles', 'servCycles', 'inconsistent', 'finalGlobeState',
  'finalLock', 'finalServAnimating', 'finalServCovered', 'scrollBehavior', 'restingAt',
  'maxDriftWhileLocked', 'scrollLockedAoFim'];

const carrega = (p) => require(path.resolve(process.cwd(), p, 'traces.json'));

const vazou = (c) => !c.scrollLockedAoFim &&
  Object.entries(c.estilosResiduais || {}).filter(([, v]) => v !== '');

const problemas = (c) => {
  const p = [];
  if (c.inconsistent > 0) p.push('incon=' + c.inconsistent);
  if (c.maxDriftWhileLocked > 0) p.push('drift=' + c.maxDriftWhileLocked);
  if (c.finalLock) p.push('_snapAnimating ficou ligado');
  const v = vazou(c);
  if (v && v.length) p.push('VAZAMENTO: ' + v.map(([k, x]) => k + '=' + x).join(' '));
  if (c.errors && c.errors.length) p.push(c.errors.length + ' erro(s) de console');
  return p;
};

const atual = carrega(process.argv[2] || '.');
const anterior = process.argv[3] ? carrega(process.argv[3]) : null;

console.log('cen    | incon | drift | lockC | servC | estadoF | travadoF | repousa        | vaza | erros');
console.log('-------+-------+-------+-------+-------+---------+----------+----------------+------+------');
let comProblema = 0;
for (const [k, c] of Object.entries(atual)) {
  const p = problemas(c);
  if (p.length) comProblema++;
  const v = vazou(c);
  console.log(
    k.padEnd(6) + ' | ' + String(c.inconsistent).padStart(5) + ' | ' +
    String(c.maxDriftWhileLocked).padStart(5) + ' | ' + String(c.lockCycles).padStart(5) + ' | ' +
    String(c.servCycles).padStart(5) + ' | ' + String(c.finalGlobeState).padStart(7) + ' | ' +
    String(c.scrollLockedAoFim).padStart(8) + ' | ' + String(c.restingAt).padEnd(14) + ' | ' +
    (v && v.length ? 'SIM' : '-').padStart(4) + ' | ' +
    String((c.errors || []).length).padStart(5) + (p.length ? '   <<< ' + p.join('; ') : ''));
}
console.log('');
console.log('Cenarios com problema: ' + comProblema);

if (anterior) {
  const mudaram = [];
  for (const [k, c] of Object.entries(atual)) {
    const a = anterior[k];
    if (!a) { mudaram.push(k + ' (novo)'); continue; }
    const difs = CAMPOS.filter(f => JSON.stringify(c[f]) !== JSON.stringify(a[f]));
    if (difs.length) mudaram.push(k + ': ' + difs.map(f =>
      f + ' ' + JSON.stringify(a[f]) + ' -> ' + JSON.stringify(c[f])).join(', '));
  }
  console.log('Cenarios que mudaram vs validacao anterior: ' + mudaram.length);
  mudaram.forEach(m => console.log('  ' + m));
}
