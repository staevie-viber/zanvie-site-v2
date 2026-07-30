# Contexto do projeto — Landing page Zanvie

Este arquivo existe para que uma nova sessão do Claude Code consiga retomar o
trabalho sem o histórico da conversa anterior. Leia antes de qualquer tarefa.

---

## O projeto

Landing page da Zanvie (agência de publicidade e tráfego pago, Santa Maria/RS).

- **Site estático**: um único `index.html` (~1700 linhas) + assets. Sem build.
- **Stack de referência**: exportado do Claude Design (Vite + React + TypeScript
  + Tailwind + Framer Motion), mas o entregue é estático.
- **Repositório**: `staevie-viber/zanvie-site-v2`, branch `main`.
- **Deploy**: Vercel, automático a cada push. O usuário testa em aparelho real
  pela URL da Vercel.
- **Cores**: roxo `#544993` / `#7B6FE0`, laranja `#FF5A2E`. Tipografia: Onest.
- **Sistema de tweaks**: ~60 parâmetros editáveis via `data-props` na linha 299
  do `index.html`. Muitos ajustes são feitos por slider no editor, sem código.

### Estrutura das seções, em ordem

Header/navbar → Hero → Globo (Three.js, com estados internos e trava total de
scroll) → Timeline "Da estratégia à conversão real" → "O que fazemos"
(carrossel) → FAQ (accordion) → CTA + Footer.

---

## Como trabalhar neste projeto

Estas regras foram estabelecidas pelo usuário e existem porque já houve
regressões por não segui-las. **Siga-as sem exceção.**

1. **Um problema de cada vez.** Identificar → corrigir → testar → commitar →
   próximo. Mudanças agrupadas já causaram regressões.
2. **Manual mode sempre.** Mostre cada edição em diff e espere aprovação
   explícita antes de gravar. Nunca auto-accept em nada não-trivial.
3. **Plan mode antes de lógica nova.** Qualquer mudança de comportamento (não
   só cor/texto) exige plano apresentado *antes* de editar.
4. **Validação com números, nunca "confia em mim".** Antes de qualquer commit,
   apresente as tabelas reais do arnês e do baseline de screenshots. Já houve
   casos de interpretação errada da própria saída — sempre mostre o dado.
5. **Escopo restrito e verificado.** Toda mudança toca só o necessário.
   Confirme com `git diff` mostrando apenas as funções afetadas.
6. **Rede de segurança.** Cada tarefa vira um commit isolado e reversível.
   Nada de push sem aval explícito.

### Modelo e esforço

- **Opus, esforço alto** → lógica complexa, auditoria, qualquer coisa que toque
  scroll, estados ou timing.
- **Sonnet, esforço médio** → tarefas mecânicas: cor, texto, valores, commits.

---

## Padrões de falha já identificados neste projeto

Aprendizados que custaram rodadas de depuração. Verifique-os proativamente.

### Vazamento de estilo inline entre mobile e desktop

`_applyResponsiveHeader` e funções afins escrevem estilo inline. Estilo inline
persiste no elemento. Se o ramo mobile escreve uma propriedade que o ramo
desktop não reseta, ela **vaza** ao redimensionar de mobile para desktop sem
reload — e o desktop quebra.

Já aconteceu duas vezes (`display`, depois `opacity`/`visibility`/`transition`).
**Sempre que uma nova propriedade passar a ser escrita inline no ramo mobile,
verifique se o ramo desktop a reseta.** O reset correto é devolver ao valor
que o desktop tem hoje — se a propriedade não é declarada em lugar nenhum,
o reset é `""` (remove a declaração), não um valor inventado.

O teste que expõe isso: capturar screenshots com **reload limpo por largura**,
usando contexto novo. Redimensionar o mesmo contexto mascara o vazamento.

### Saídas mudas em handlers de gesto

Handlers que retornam sem `preventDefault` devolvem o gesto ao browser. No iOS,
uma vez que o compositor recebe o gesto, nenhum `preventDefault` posterior
cancela o fling. Foi a causa do furo de inércia no globo, e é a causa provável
do problema pendente em Serviços (ver abaixo).

### Timers que não são exatos

`setTimeout` garante atraso **mínimo**, não exato. Sob carga do rAF do three.js,
um timer de 382ms dispara em ~391ms. Cenários de teste com margens de 5–10ms
viram cara-ou-coroa. **Use margens de 80–100ms** em asserções de timing.

### Cenários de teste que tangenciam fronteiras

Rajadas de `page.mouse.wheel` custam ~100–125ms de roundtrip CDP cada. Se o vão
total da rajada ficar perto do limiar sendo testado, o resultado oscila entre
execuções. **Sempre verifique determinismo com 3 execuções** antes de confiar
num cenário como baseline. Já corrigimos M e N por isso.

### Medição de geometria do globo

O canvas do globo mede ~1551px de altura (extrapola a viewport). A esfera
desenhada tem ~310px de diâmetro. **Medir o bounding box do canvas dá erro de
~1240px.** Calcule a esfera pela projeção:
`r = tan(asin(S/d)) / tan(fov/2) * (H/2)`, aplicando o transform CSS.

### Profiling que se contamina

Ler `getBoundingClientRect` dentro do loop de profiling infla os números
(layout thrash induzido pela própria medição). Meça sem leitura de geometria
por frame.

---

## O que já foi feito (histórico de commits)

Em ordem cronológica. Os cinco primeiros são a refatoração estrutural.

| Commit | O quê |
|---|---|
| `1f93d90` | Estado inicial — versão exportada do Claude Design |
| `d0faee5` | Baseline de screenshots de referência |
| `c4db8b6` | Remove código morto comprovadamente inerte |
| `fc87511` | Reconcilia props órfãs do sistema de tweaks |
| `e6e4373` | Consolida os 8 listeners de resize num despachante único |
| `ad734dc` | Consolida parsing de hex duplicado |
| `7c7f242` | **Máquina de estados de scroll unificada** (token de geração) |
| `69d7a0a` | **Trava total de scroll na sequência do globo** |
| `5a0c381` | Fecha furo da trava no desktop (roda de mouse) |
| `ff1a730` | Navbar: pill mobile completo, sincronizado com header |
| `95d9667` | Globo: `box-sizing: border-box` no bloco central mobile |
| `e9accd0` | Libera input a 45% da animação do globo (382ms vs 890ms) |
| `4496a74` | Globo mobile +14,3% nos estados centrados, reposicionado |
| `0a124e8` | Versiona arnês, baselines e utilitários em `_dev/` |
| `b9e4613` | Este arquivo de contexto |
| (P2) | Desliga `backdrop-filter` dos filhos durante a animação de Serviços |

### Sistemas críticos — não mexer sem necessidade absoluta

**Máquina de estados por token** (`7c7f242`). `this._anim = null | {owner, token}`.
`_beginAnim(owner)` adquire, `_endAnim(token)` só libera se o token conferir —
um timer velho não destrava animação nova. Getters derivados: `_snapAnimating`,
`_servAnimating`. Escritor único de estado: `_setGlobeState(n)`.

**Trava total de scroll do globo** (`69d7a0a` + `5a0c381`). Três camadas:
`touch-action:none` + `overscroll-behavior:none` (impede o pan de nascer),
`overflow:hidden` no `<html>` (documento não-rolável de fato, único recurso que
mata um fling em voo), e `preventDefault` incondicional nos 4 handlers.
Engate por **cruzamento** do ponto de pin, com estado inicial pela direção da
travessia. Compensação de largura de barra via JS, contida na trava.

**Liberação antecipada do input** (`e9accd0`). `R = Math.min(dur, Math.max(250,
dur * 0.45))` → 382ms com `dur=850`. A animação visual continua em 850ms (é
transição CSS, independente do timer). Validado em aparelho real.

Toda mudança nova deve **preservar** esses comportamentos. Se um ajuste visual
arriscar tocá-los, avise antes.

---

## Ambiente de testes (`_dev/`)

O arnês de gestos tem **21 cenários** validando a máquina de estados, a trava de
scroll e as transições. Junto vem o baseline de screenshots comparadas por hash.

Ver `_dev/README.md` para instruções de execução.

### Como interpretar os resultados

- **`Cenarios com problema: 0`** — nenhum com `incon > 0`, `drift > 0`,
  vazamento de estilo residual ou erro de console.
- **`Cenarios que mudaram vs validacao anterior: 0`** — nada de comportamento
  observável mudou.
- **Screenshots**: o padrão saudável é **12/20 idênticas**. As 8 divergentes são
  sempre os frames do globo, que variam por fase de rotação contínua
  (não-determinística por natureza). As 6 estáticas de cada viewport (Hero,
  Timeline, Serviços, FAQ, CTA) devem bater **byte a byte**.
- **Isolamento**: além do baseline, compare contra as capturas do commit
  imediatamente anterior. Separa o que a mudança atual causou do ruído herdado.

### Ruído conhecido: o cenário `N`

`N` alterna entre `globeStates [1,2]` e `[0,1,2]` **sem nenhuma mudança de
código** — é corrida entre o início da amostragem por rAF e o `_setGlobeState(1)`
do próprio setup do cenário, então o `0` inicial é capturado ou não. É do probe,
não do site.

**Provado que precede a Etapa 1**: 5 execuções no build com a mudança (3× `[1,2]`,
2× `[0,1,2]`) e 5 num worktree de `8f3e3f1` sem ela (4× `[1,2]`, 1× `[0,1,2]`).

Ao comparar, **ignore o primeiro elemento de `globeStates` em `N`**. Os campos
estáveis e que valem como asserção são `maxScrollY`, `inconsistent`,
`finalGlobeState` e `restingAt`. Estabilizar o probe é tarefa separada, do
arnês — não misturar com mudanças no site.

### Aviso sobre o baseline mobile

O `baseline/` mobile está **defasado** desde o commit da navbar (`ff1a730`).
Seis telas mobile divergem por motivo já aprovado. Enquanto não for regenerado,
use sempre o isolamento contra o commit anterior para separar o que é novo.
Regenerar o baseline é uma pendência aberta.

### O que o ambiente headless NÃO cobre

Confirme sempre em aparelho real:
- Inércia de trackpad e momentum do iOS Safari / Chrome Android
- Se `overflow:hidden` preserva `scrollTop` no Safari real
- Sensação de "um gesto = um estado" com o dedo
- Costura de 1px em telas com `dpr >= 2` (headless roda em `dpr=1`)
- Compensação de largura de barra em navegador com barra clássica visível

---

## Trabalho em andamento

### Scroll livre no lugar do snap — Etapa 1 de 5 concluída

Plano de 5 etapas aprovado para trocar o scroll-snap por scroll livre entre
Globo→Timeline e Timeline→Serviços, mantendo a cobertura visual.

**Achado que reenquadrou a tarefa:** a sobreposição da Timeline sobre o Globo
**já é dirigida por scroll e não depende do snap** — o `#globo` é
`position: sticky; top: 0` e `_layoutStack` dá altura extra ao `#zv-globe-wrap`
com `marginTop` negativo no `#zv-secoes-wrap`. O snap só fazia o scroll *pular*
de `gTop` a `wTop`. Metade do pedido se resolve desligando o snap; só Serviços
exige construção.

**Etapa 1 — FEITA.** Tweak `timelineFreeScroll` (booleano, **default `false`**):
faz os 4 ramos destravados de snap retornarem cedo e neutraliza o `_snapGo` de
`_releaseGlobeSeq` nos dois sentidos. **Nada foi removido** — com o tweak em
`false` o comportamento é bit a bit o anterior (validado: `problema: 0`,
`mudaram: 0` contra `8f3e3f1`). Em `_onKeySnap` o corte é mais abaixo que nos
outros três handlers, porque ali o trecho de Serviços está entremeado com o de
snap e cortar antes desligaria Serviços no teclado.

**Etapas 2-5 pendentes**, na ordem do mapa:
2. O "gesto morto" pós-liberação — o gesto que esgota a sequência é
   `preventDefault`-ado, então destravar não move a página e é preciso um segundo
   gesto. O `_snapGo` mascarava isso. Decidir depois de sentir no aparelho.
3. **Serviços por `position: sticky`** — a mais arriscada: mexe em
   `_layoutStack`, que alimenta `wTop`, âncora do clamp de `gTop` e da fronteira
   do `_onScroll`. Com sticky, **P3 deixa de ser bug a corrigir e passa a ser bug
   a deletar** (some `_animServ`, `_servZone`, `_reconcileServ`,
   `_servTransition`, `_servCovered`, o spacer) — e a correção de P2 vira código
   morto, porque não há mais camada fixa animando.
4. Remover o código morto do snap e de `_animServ`. Commit puramente subtrativo.
5. Arnês: recalibrar `A`/`G`/`K`/`L`/`T` e criar cenários para o scroll livre e
   para a cobertura de Serviços com inércia.

Testar em aparelho real **entre todas** as etapas.

### Diagnóstico concluído: transição Timeline → Serviços (3 problemas)

**P2 CORRIGIDO. P1 e P3 abertos.** Ordem recomendada do que resta: P3.

**~~1º~~ — P2: travadas nas animações. FEITO.** Causa confirmada:
`backdrop-filter` ativo no `zv-carousel-track` (blur 16px sobre 982x372 =
365k px) mais os `zv-carousel-prev`/`next` (blur 10px), re-rasterizando a cada
frame — `_animServ` desligava o blur no `#servicos` mas não nos filhos.

Corrigido por **classe CSS**, não por escrita inline: `#servicos.zv-serv-anim *`
com `backdrop-filter: none !important`, classe adicionada em `_animServ` e
removida no corpo do commit. Escrever inline nos filhos seria destrutivo — o
blur deles vive na declaração inline do HTML e não há regra de folha de estilo
para cair, então sobrescrevê-la (ou resetar com `""`) apagaria o blur em
definitivo. Ganho medido em A/B controlado: desktop +98% de vazão (~21 → ~43fps)
e frames >33ms de 14 para 6; mobile +22% de vazão.

**Não resolveu P1** — ver pendências. Duas coisas continuam abertas e estão
registradas lá: a causa de P1 e o pior frame de ~96ms no desktop.

**P1: linha branca entre Timeline e Serviços.** Aberto, com causa provável
identificada e as duas hipóteses antigas (blur, subpixel) **descartadas por
medição** — ver pendências.

**P3: Serviços não anima no mobile.** O mais arriscado. O caminho de toque
existe (`_onTouchEnd` linha 760) e chama `_servTransition`, mas `_touchDelta` só
é setado em `_onTouchMove` se a checagem de zona casar — fora dela, a linha 740
**retorna sem `preventDefault`**, gerando scroll nativo e momentum. Além disso,
`_animServ` **não tem trava de scroll**: `_beginAnim("serv")` destrava por ser
dono ≠ `"globe"`, e a animação depende só de `position:fixed` + `scrollTo`, que
a inércia atropela (medido: ultrapassou `coverY` em 108px).

É o mesmo defeito que o globo tinha antes da trava total; a correção nunca foi
aplicada aqui. **Exige tocar máquina de estados, trava de scroll e regra de
posse de token.** Fazer isolado, com cenários novos no arnês para o caminho de
toque na zona de Serviços (os 21 atuais cobrem o globo, não esta transição).

Problema pré-existente: `git log -S'_servTransition'` retorna apenas o commit
inicial. Nenhum dos commits recentes tocou essas rotinas.

### Pendências registradas, sem ação

- **`sectionHeight: 130`** — a seção do globo mede 130% da viewport; sob a trava,
  os ~256px inferiores ficam permanentemente inacessíveis. Espaço morto. Pode
  ser intencional; decidir.
- **Texto lateral 7px fora da viewport em 320×800, estado 2.** Pré-existente,
  só na largura mais estreita.
- **`globeFastRotationSpeed` (0.35) < `globeRotationSpeed` (0.4)** — o modo
  "rápido" gira mais devagar que o normal. Investigação iniciada e interrompida
  a pedido do usuário; nenhuma alteração feita. Provável ajuste só de slider.
- **Baseline mobile defasado** desde `ff1a730` (ver acima).
- **P1 — causa provável identificada, sem correção.** É o
  `border-top: 1px solid rgba(255,255,255,0.6)` que o `#servicos` tem **por
  design** na linha 187: 60% de branco encostando no preto da Timeline.
  **Hipóteses de blur e de subpixel foram descartadas por medição**: o mesmo
  frame congelado, com e sem o `backdrop-filter` dos filhos, produz séries de
  luminância byte a byte idênticas (`probe-p1-costura.js`). Logo P1 e P2 não
  compartilham causa. Se for corrigir, mexe numa decisão de design, não num
  artefato de renderização.
- **Pior frame do desktop na transição de Serviços: ~96ms, sem causa
  identificada.** Contra 18ms de baseline. Desligar o blur dos filhos derrubou a
  vazão de ~21fps para ~43fps e os frames >33ms de 14 para 6, mas mexeu só 6%
  nesse frame isolado — então o blur não era a causa dele. Candidatos não
  investigados: os 3 slides com `will-change: transform, opacity` sempre
  promovidos, e o `box-shadow` de 60px de raio do `#servicos`.
- **Engate por cruzamento não reengata partindo exatamente de `gTop`.** Com
  `timelineFreeScroll` ligado, a liberação da sequência deixa a página repousando
  **em** `gTop`. O engate exige `prev > gTop` **estrito**
  (`cruzouSubindo = prev > gTop && y <= gTop`), e `1100 > 1100` é falso — então um
  gesto para cima a partir dali **não reengata a trava**: o globo reseta para 0
  pela cláusula de reentrada e a página sobe livre. Antes isso não aparecia porque
  o `_snapGo` empurrava para `wTop`, e `2070 > 1100` era verdadeiro.
  **Medido** no cenário `K`. Não é regressão — é consequência direta e esperada
  da Etapa 1 —, mas **pode precisar de ajuste conforme o teste no aparelho**.
  Junto com o cenário `M` (onde o scroll nativo faz a cláusula de recuperação
  travar, proteção *mais* forte), é a face concreta do risco "cláusula de
  recuperação vs. scroll livre" marcado como alto no mapa.
- **Pior frame do mobile piorou** com a correção de P2: 31,5ms → 34,9ms
  (consistente em 3 execuções), em troca de +22% de vazão. Aceito na época;
  registrado por não ser ganho puro.

---

## Comunicação

O usuário se comunica em **português brasileiro** e prefere orientação direta e
prática. Ele revisa cada diff e cada tabela de validação antes de aprovar.
Quando algo não puder ser provado no ambiente headless, **diga isso
explicitamente** em vez de inferir — ele testa em aparelho real e prefere saber
o que ainda não foi verificado.
