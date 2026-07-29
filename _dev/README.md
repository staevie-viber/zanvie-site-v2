# `_dev/` — ambiente de validação

Ferramental de teste da landing page. **Nada aqui é servido ao usuário final** —
o site é só o `index.html` da raiz. Esta pasta existe para provar, com número,
que uma mudança não quebrou comportamento.

Leia o [CONTEXTO.md](CONTEXTO.md) antes de qualquer tarefa: ele traz as regras de
trabalho, os sistemas críticos e o estado das pendências.

---

## Instalação

Node 18+ e Playwright (Chromium). A partir desta pasta:

```bash
cd _dev
npm install
npx playwright install chromium
```

O `npm install` traz só `playwright`. O `npx playwright install chromium` baixa
o browser em si (~150 MB, fora do repositório) — **é um passo separado e
obrigatório**; sem ele os scripts falham com "Executable doesn't exist".

`node_modules/` está no `.gitignore` local desta pasta, junto com todos os
diretórios de saída (`trace-*`, `after-*`, `mfix*`, `nfix-*`, `n-bug-*`,
`before-*`). São regenerados a cada execução.

## Servidor local

Todos os scripts carregam `http://localhost:8752/index.html`. Suba o servidor
**antes**, num terminal separado, e deixe rodando:

```bash
cd _dev
node static-server.js      # ou: npm run serve
```

Ele serve a **raiz do projeto** (a pasta acima de `_dev/`), resolvida por
`__dirname` — funciona sendo invocado de qualquer diretório. Porta 8752 fixa;
se ela estiver ocupada o processo morre com `EADDRINUSE` e é preciso liberar
antes de seguir.

Abrir o `index.html` por `file://` **não serve**: o runtime DC injeta React de
origem remota e o carregamento se comporta diferente.

---

## Arnês de gestos — `gesture-harness.js`

O instrumento principal. Roda 21 cenários de gesto contra a máquina de estados
do globo, amostrando o estado por frame de animação (rAF) e conferindo
invariantes ao final.

```bash
node gesture-harness.js <pasta-de-saida>              # os 21 cenários
node gesture-harness.js <pasta-de-saida> D2,M,N       # só alguns
```

O segundo argumento é um filtro por lista de IDs separados por vírgula. A pasta
de saída recebe um `.json` de traço por cenário e é criada se não existir; use
um nome descritivo do momento (`trace-antes-p2`, `trace-depois-p2`).

O harness só grava o traço; quem emite o veredito é o `report.js`.

## Veredito — `report.js`

```bash
node report.js <pasta-do-traco>                    # tabela + contagem
node report.js <pasta-depois> <pasta-antes>        # + o que mudou de comportamento
```

Um cenário conta como **problema** quando:

| Critério | Significado |
|---|---|
| `incon > 0` | invariante violado: Serviços animando sem trava |
| `drift > 0` | a posição derivou enquanto o scroll estava travado |
| `_snapAnimating` ligado ao fim | uma animação nunca fechou |
| vazamento | estilo inline sobreviveu ao **destravamento** |
| erros | exceção ou erro de console durante o cenário |

**Terminar travado não é problema.** Vários cenários repousam no meio da
sequência do globo — `E` no estado 2, `F`/`K`/`O`/`R_LOCK`/`S` no 3 — e ali a
trava *deve* estar engatada. Os `overflow:hidden` / `touch-action:none` /
`overscroll-behavior:none` inline são a própria trava, não resíduo. Só contam
como vazamento se sobreviverem com `scrollLockedAoFim` já em `false`. Confundir
as duas coisas produz 15 falsos positivos.

A coluna `repousa` (`acimaDeGTop` / `gTop` / `wTop` / `abaixoDeWTop`) diz onde a
página parou; ela é o que torna a coluna `travadoF` legível.

As duas linhas que fecham a execução são as que importam:

```
Cenarios com problema: 0
Cenarios que mudaram vs validacao anterior: 0
```

Qualquer número acima de zero é regressão — **não commite**. Todo cenário que
mudou precisa de explicação causal, nunca de recalibração da asserção.

### Margens de tempo

Cenários que dependem da liberação antecipada do input usam margem de **R+90ms**
(`R = 382ms`, com `dur = 850`). Margens menores já causaram cara-ou-coroa:
`setTimeout` garante atraso mínimo, não exato, e sob carga do rAF do three.js um
timer de 382ms dispara em ~391ms. Não reduza essas margens.

### Os 21 cenários

| ID | O que exercita |
|---|---|
| `A` | Wheel lento e deliberado, descendo os 4 estados e voltando. |
| `B` | Rajada de 10 wheel no **mesmo tick**, por despacho sintético em página (evita o roundtrip CDP de ~100ms que tornava o cenário não-determinístico; em troca, `isTrusted:false` — mede a máquina de estados, não o caminho do browser). |
| `C` | Wheel disparado no meio de uma transição de estado do globo. |
| `D` | Clique na navbar durante `_globeGo` ativo, mais wheel na janela de cross-unlock. |
| `D2` | A corrida de cross-unlock isolada, com `globeDuration=800` via `__dcSetProps` para o timer cair folgadamente dentro do voo da navegação. |
| `E` | `ArrowDown` repetido em alta frequência. |
| `F` | Swipes de toque consecutivos. |
| `G` | Round-trip completo até o rodapé e de volta ao topo (termina com `scrollTo(0,0)`, que reengata a trava em `gTop`). |
| `H` | Resize no meio de uma transição de estado. |
| `I` | Rajada de 20 wheel no mesmo tick sobre o ponto de pin. |
| `J` | Scroll programático forçado durante a trava — aproximação grosseira de inércia. |
| `K` | Descer a sequência inteira, liberar e voltar subindo. |
| `L` | Clique na navbar durante a trava: tem de destravar e navegar. |
| `M` | Rajada **real** de roda cruzando o ponto de pin, vindo da Hero. |
| `N` | Reprodução determinística do furo da roda no desktop, sem depender de corrida de tempo. |
| `O` | 3 gestos encadeados a R+90ms: deve percorrer 0→1→2→3 sem pular estado. |
| `P` | Gesto na janela **já liberada**: deve ser honrado. |
| `Q` | Gesto **antes** de R (R−50ms): deve continuar descartado. |
| `R_LOCK` | Invariante da trava durante o encadeamento (nome com sufixo para não colidir com a constante `R`). |
| `S` | Token único: nunca mais de um `_endAnim` pendente, tokens crescentes. |
| `T` | Encadear até o estado 3 e dar mais um gesto → `_releaseGlobeSeq`. |

## Comparação de traços — `compare-traces.js`

Diferença entre duas execuções do arnês, cenário a cenário:

```bash
node compare-traces.js <pasta-antes> <pasta-depois>
```

Diferença bruta, campo a campo. Para o veredito resumido, prefira
`node report.js <depois> <antes>`.

O fluxo padrão de uma mudança é: rodar o arnês **antes** de editar, editar,
rodar **depois**, comparar. Assim se separa o que a mudança causou do ruído
herdado do commit anterior.

---

## Baseline de screenshots

`baseline/` guarda 20 PNGs de referência (10 telas × 2 viewports: desktop 1440
e mobile 393) mais um `README.md` descrevendo cada captura.

```bash
node baseline-shots.js <pasta-de-saida>
```

O script captura com **reload limpo por largura**, em contexto novo. Isso é
deliberado: redimensionar o mesmo contexto mascara vazamento de estilo inline
entre os ramos mobile e desktop — exatamente a classe de bug que já apareceu
duas vezes neste projeto.

A navegação até cada seção inclui um gesto de liberação antes de descer. Sem
ele, o `scrollIntoView` é capturado pelo engate por cruzamento da trava e as
capturas saem todas no globo.

### Comparação

Compare por hash contra `baseline/`. O padrão saudável é **12/20 idênticas**: as
8 divergentes são sempre frames do globo, que variam por fase de rotação
contínua e são não-determinísticos por natureza. As estáticas — Hero, Timeline,
Serviços, FAQ, CTA — devem bater **byte a byte**.

**Aviso:** o baseline mobile está defasado desde `ff1a730` (commit da navbar).
Seis telas mobile divergem por motivo já aprovado. Enquanto não for regenerado,
compare também contra as capturas do commit imediatamente anterior.

---

## Probes de diagnóstico

Scripts de uso pontual, cada um escrito para responder uma pergunta específica.
Só observam — não editam o site. Todos precisam do servidor de pé.

| Script | Pergunta que responde |
|---|---|
| `probe-instance.js` | Como alcançar a instância da lógica caminhando o fiber do React a partir de `#dc-root`. Base de todos os outros. |
| `probe-3problemas.js` | Folga de layout, fluidez e spacer na transição Timeline→Serviços. |
| `probe-final3.js` | Versão corrigida do anterior: profiling **sem** leitura de geometria no loop, mais simulação de inércia competindo com `_animServ`. |
| `probe-serv-toque.js` | Instrumenta o caminho de toque na zona de Serviços para achar onde `_onTouchMove` sai sem setar `_touchDelta`. |
| `probe-serv-toque2.js` | Variante parametrizada do anterior (offset de partida do toque). |
| `probe-d2-timeline.js` | Linha do tempo da corrida de cross-unlock. |
| `probe-d2-trajectory.js` | Trajetória de posição durante essa corrida. |
| `probe-interrupcao.js` | Se uma transição CSS interrompida parte do valor interpolado (parte — verificado empiricamente). |
| `probe-navbar.js` | Geometria do pill e do header no mobile. |
| `probe-transicao.js` | Sobreposição entre as transições de entrada e saída do pill. |
| `probe-boxsizing.js` | Efeito do `box-sizing: border-box` no bloco central do globo. |
| `probe-subtitulo.js` | Por que o subtítulo saía da viewport. |
| `probe-globo-espacos.js` | Espaçamentos ao redor do globo por estado. |
| `probe-rotacao.js` | Velocidade angular real do globo (mediu 20,07°/s no modo "rápido" contra 22,96°/s no normal — a inversão de `globeFastRotationSpeed`). |
| `sim-globo.js` | Simula escala e deslocamento do globo por estado, projetando o raio da esfera. |
| `validar-navbar.js` | Valida os três estados da navbar (header visível, colapsado, desktop). |
| `resize-sweep.js` | Varredura de resize contínuo — o teste do despachante único de resize. |

### Medir o globo

Não meça o bounding box do canvas: ele tem ~1551px de altura e extrapola a
viewport, dando erro de ~1240px contra os ~310px reais da esfera. Calcule pela
projeção, aplicando o transform CSS:

```
r = tan(asin(S/d)) / tan(fov/2) * (H/2)
```

com `S` = `group.scale`, `d` = 3,2 (z da câmera) e `fov` = 45°.

---

## O que este ambiente NÃO cobre

Headless roda em `dpr=1`, sem compositor de toque real e sem barra de rolagem
clássica. Estes pontos **só** se confirmam em aparelho real (o deploy da Vercel
atualiza a cada push):

- **Inércia de trackpad e momentum** do iOS Safari e do Chrome Android. É a
  diferença entre "o gesto foi cancelado" e "o fling continuou voando". O
  cenário `J` só aproxima isso por scroll programático.
- **Se `overflow:hidden` preserva `scrollTop`** no Safari real.
- **A sensação de "um gesto = um estado"** com o dedo — cadência e resposta.
- **Costura de 1px** em telas com `dpr >= 2`. A linha branca entre Timeline e
  Serviços cai em posição fracionária (.031/.328) e é invisível em `dpr=1`.
- **Compensação da largura da barra de rolagem** em navegador com barra clássica
  visível (o headless não tem barra ocupando espaço).
- **Fidelidade do caminho do browser no cenário `B`**, que usa despacho sintético
  (`isTrusted:false`) e portanto mede a máquina de estados, não o pipeline de
  entrada real.

Quando algo cair nesta lista, **diga isso explicitamente** em vez de inferir.
