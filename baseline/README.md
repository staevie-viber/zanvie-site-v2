# Baseline visual — LP Zanvie

Screenshots de referência capturados em 2026-07-24, antes de qualquer refatoração estrutural,
para validar a Regra 3 (nenhuma alteração visual) a cada commit da sessão.

Capturados com Playwright (Chromium headless), servindo `index.html` localmente via um
servidor estático simples. Navegação feita majoritariamente pelo scroll-snap real do site
(eventos de wheel simulados) — as duas exceções (`06` e `08`) usam `scrollIntoView` direto
para garantir o enquadramento exato, já que a simulação de wheel não reproduz com precisão
milimétrica os gatilhos de scroll da página.

## Viewports

- **desktop** — 1440×900
- **mobile** — 390×844 (iPhone 12/13 mini-ish)

## Sequência capturada (mesma para os dois viewports)

| # | Arquivo | O que mostra |
|---|---|---|
| 01 | `*-01-hero.png` | Seção Hero |
| 02 | `*-02-globo-estado0-centro.png` | Globo — Estado 0: centralizado, título + subtítulo laranja |
| 03 | `*-03-globo-estado1-direita-pin.png` | Globo — Estado 1: globo à direita, pin vermelho em Santa Maria/RS, texto à esquerda |
| 04 | `*-04-globo-estado2-esquerda.png` | Globo — Estado 2: globo à esquerda, texto à direita |
| 05 | `*-05-globo-estado3-centro.png` | Globo — Estado 3: globo de volta ao centro, textos do Estado 0 |
| 06 | `*-06-timeline-cobrindo-globo.png` | Timeline "Da estratégia à conversão real." cobrindo o Globo por completo |
| 07 | `*-07-timeline-completa.png` | Fim do scroll livre da Timeline, pouco antes do gatilho de subida de Serviços |
| 08 | `*-08-servicos-cobrindo-timeline.png` | Carrossel "O que fazemos" cobrindo a Timeline por completo (card 1 ativo) |
| 09 | `*-09-faq.png` | Seção FAQ (accordion, primeiro card aberto por padrão) |
| 10 | `*-10-cta-footer.png` | CTA "Fale com a gente" + rodapé |

Nenhum erro de console (`page.on('console')` / `pageerror`) foi observado em nenhuma das
20 capturas.

## Como comparar após uma mudança

Reabrir o site (mesmo procedimento: servidor estático local + Playwright) e recapturar a
mesma sequência, comparando par a par com os arquivos aqui. Qualquer diferença de pixel
fora de anti-aliasing/fontes é candidata a regressão visual e deve ser investigada antes
do commit da tarefa.
