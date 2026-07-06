# Gestão de Almoxarifado Colafix

Sistema estático (HTML + CSS + JavaScript puro) de gestão de almoxarifado.
Sem build, sem bundler, sem npm, sem framework — funciona abrindo o
`index.html` diretamente (`file://`) ou hospedado em qualquer servidor
estático, incluindo **GitHub Pages**.

## Como rodar

- **Localmente:** dê duplo-clique em `index.html` (ou abra pelo navegador).
- **Publicado:** faça upload de toda a pasta para o GitHub Pages (ou
  qualquer hospedagem estática). Não é necessário nenhum passo de build.

## Estrutura de pastas

```
/index.html          → shell da aplicação (HTML) + referências a CSS/JS
/manifest.json        → manifesto do PWA (nome, ícones, cores)
/service-worker.js                 → Service Worker (cache do app shell / uso offline)
/css/
  base.css             → variáveis de cor, reset, tipografia, ajustes globais mobile
  layout.css            → estrutura geral: topbar, abas, cards, grids das páginas
  components.css        → formulários, botões, badges, tabelas, modais, painel do operador
  responsive.css        → ajustes específicos de telas menores
/js/
  config-sheets.js       → chaves/URLs de acesso ao Google Sheets e Apps Script
  state.js                 → estado global compartilhado entre os módulos
  permissions.js            → perfis de acesso e regras centrais de permissão
  utils.js                   → funções utilitárias (datas, formatação, toast, navegação)
  estoque.js                  → aba Estoque
  conferencia.js                → aba Conferência (contagem física + material rasgado)
  divergencias.js                 → aba Divergências
  pendentes.js                     → painel de requisições pendentes
  requisicao.js                     → criação, reprovação e aprovação de requisições
  movimentacao.js                    → movimentação física dos itens
  confirmacao-sistema.js               → confirmação da transferência no sistema
  operador.js                           → painel mobile do Operador
  timeline.js                            → linha do tempo do fluxo de requisição
  sync.js                                 → sincronização de estado e navegação entre etapas
  historico.js                             → aba Histórico
  pdf.js                                    → geração de PDFs
  sheets-api.js                              → leitura/gravação no Google Sheets
  expedicao.js                                → aba Expedição (log de emails)
  polling.js                                   → atualização periódica em segundo plano
  auth.js                                       → login / logout / permissões de sessão
  init.js                                        → inicialização da aplicação
  sw-register.js                                  → registro do Service Worker (PWA)
/icons/
  icon-72x72.png ... icon-512x512.png  → conjunto completo de ícones do PWA (Android/desktop)
  apple-touch-icon.png                  → ícone para iOS
  favicon-16x16.png, favicon-32x32.png  → ícone da aba do navegador
  logo.png                              → logotipo (wordmark) usado na tela de login e topbar
```

## Como os módulos se conectam

Cada arquivo em `/js` é carregado via uma tag `<script src="js/arquivo.js">`
comum (sem `type="module"`), na mesma ordem em que aparecem no
`index.html`. Isso é proposital: como são scripts "clássicos", todos
compartilham o mesmo escopo global do navegador — funções e variáveis
declaradas em um arquivo ficam automaticamente disponíveis para os
arquivos carregados depois, exatamente como funcionava no arquivo único
original. **A ordem de carregamento no `index.html` importa** e não deve
ser alterada, pois alguns módulos usam funções/variáveis definidas nos
módulos anteriores.

Optou-se deliberadamente por **não usar `import`/`export` (ES Modules)**
porque módulos ES exigem que o navegador carregue os arquivos via HTTP(S)
— eles são bloqueados por política de CORS quando a página é aberta
diretamente do disco (`file://`), o que quebraria o requisito de "abrir
só o index.html".

## PWA (manifest + service worker)

- `manifest.json` usa caminhos relativos (`./`, `icons/...`) para funcionar
  tanto na raiz de um domínio quanto em um subcaminho do GitHub Pages
  (`usuario.github.io/repositorio/`).
- `service-worker.js` usa Network-First para o HTML (sempre busca a versão mais
  nova quando online, cai para o cache só quando offline) e Cache-First para
  ícones/manifest. Qualquer requisição de outra origem (inclusive
  `sheets.googleapis.com` e `script.google.com`) é ignorada pelo Service
  Worker e vai direto para a rede — esses dados nunca são cacheados.
- `js/sw-register.js` só tenta registrar o Service Worker quando a página
  está em HTTPS ou `localhost`. Ao abrir via `file://`, ele identifica o
  ambiente e simplesmente não registra (sem gerar erro), então o sistema
  continua funcionando normalmente, apenas sem cache offline nesse modo.

## O que NÃO mudou

Nenhuma regra de negócio, fluxo operacional, identidade visual ou
comportamento foi alterado nesta modularização — o código de cada função
foi apenas **movido** para o arquivo correspondente, sem reescrita de
lógica. A aparência e o funcionamento são idênticos à versão em arquivo
único anterior.

