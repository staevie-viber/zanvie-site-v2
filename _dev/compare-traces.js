// Compara dois tracos campo a campo.
// Regra: todos os campos exigem igualdade estrita, EXCETO 'inconsistent',
// que e contagem de frames (varia com a taxa de quadros) e por isso e
// comparado pelo booleano "corrida presente?" (> 0).
const a = require('./' + (process.argv[2] || 'trace-ref-final') + '/traces.json');
const b = require('./' + (process.argv[3] || 'trace-after') + '/traces.json');

const STRICT = ['globeStates', 'lockCycles', 'servCycles', 'finalGlobeState', 'finalLock',
  'finalServAnimating', 'finalServCovered', 'scrollBehavior', 'scrollY', 'restingAt', 'stops',
  'gTop', 'navProgrediuNoMeioDoVoo'];

let regressoes = 0, corrigidos = 0;
const linhas = [];

for (const k of Object.keys(a)) {
  const A = a[k], B = b[k];
  if (!B) { console.log(`${k}: AUSENTE no segundo traco`); regressoes++; continue; }
  const difs = [];
  for (const f of STRICT) {
    if (!(f in A) && !(f in B)) continue;
    const va = JSON.stringify(A[f]), vb = JSON.stringify(B[f]);
    if (va !== vb) difs.push(`${f}: ${va} -> ${vb}`);
  }
  const raceA = (A.inconsistent || 0) > 0, raceB = (B.inconsistent || 0) > 0;
  const errA = (A.errors || []).length, errB = (B.errors || []).length;
  if (errB > errA) difs.push(`errors: ${errA} -> ${errB}`);

  let veredito;
  if (difs.length) { veredito = 'REGRESSAO'; regressoes++; }
  else if (raceA && !raceB) { veredito = 'CORRIDA CORRIGIDA'; corrigidos++; }
  else if (!raceA && !raceB) veredito = 'identico';
  else if (raceA && raceB) { veredito = 'CORRIDA PERSISTE'; regressoes++; }
  else { veredito = 'CORRIDA INTRODUZIDA'; regressoes++; }

  linhas.push({ k, veredito, difs, incon: `${A.inconsistent || 0} -> ${B.inconsistent || 0}` });
}

console.log('cen | veredito            | inconsistent | diferencas nos campos estritos');
console.log('----+---------------------+--------------+-------------------------------');
for (const l of linhas) {
  console.log(`${l.k.padEnd(3)} | ${l.veredito.padEnd(19)} | ${l.incon.padEnd(12)} | ${l.difs.length ? l.difs.join('; ') : '(nenhuma)'}`);
}
console.log('\n' + '='.repeat(70));
console.log(`Regressoes: ${regressoes}   |   Corridas eliminadas: ${corrigidos}`);
console.log(regressoes === 0 ? 'VEREDITO: nenhuma regressao detectada.' : 'VEREDITO: HA REGRESSAO -- commit bloqueado.');
