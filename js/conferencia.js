// ===== Aba Conferência: contagem física, material rasgado e histórico de conferências =====
// ─── CONFERÊNCIA ──────────────────────────────────────────────────
// Conjunto de itens selecionados para conferir (por código)
let CONF_ITENS_SEL = new Set();
let CONF_MODO = 'selecao'; // 'selecao' | 'conferencia'

function globalSearch(){
  const q = document.getElementById('mainSearch').value.toLowerCase();
  renderItems();
  if(document.getElementById('pg-conferencia').classList.contains('active')) {
    filtrarItensConf();
    if(CONF_MODO === 'conferencia') renderConferencia();
  }
  if(document.getElementById('pg-hist').classList.contains('active')) renderHist();
}

function toggleModoCego(){
  MODO_CEGO=document.getElementById('modoCego').checked;
  renderConferencia();
}

// Renderiza lista de itens no painel de seleção
// Melhoria 3: retorna a última contagem do item a partir do histórico de conferências
function ultimaContagemItem(cod){
  if(!CONF_HISTORICO || CONF_HISTORICO.length === 0) return null;
  const cp = confPerm();
  // Buscar o item para saber a quais locais ele pertence
  const invItem = (CONF_ITEMS.length > 0 ? CONF_ITEMS : ITEMS).find(i => i.cod === cod);
  // Percorrer do mais recente para o mais antigo
  for(let i = CONF_HISTORICO.length - 1; i >= 0; i--){
    const conf = CONF_HISTORICO[i];
    if(!conf.itens || !conf.itens[cod]) continue;
    const c = conf.itens[cod];
    // Determinar em qual local esta contagem foi feita
    // Se tem almox3 > 0: pode ser Almox3, Rejunte ou Separação (todos usam o campo almox3)
    // Se tem almox30 > 0: foi no Almox 30
    const foiAlmox3    = (c.almox3 > 0) && invItem && invItem.temAlmox3    && !invItem.temRejunte && !invItem.temSeparacao && !invItem.temAlmox1 && !invItem.temAlmox2;
    const foiAlmox30   = (c.almox30 > 0) && invItem && invItem.temAlmox30;
    const foiRejunte   = (c.almox3 > 0) && invItem && invItem.temRejunte;
    const foiSeparacao = (c.almox3 > 0) && invItem && invItem.temSeparacao && !invItem.temRejunte;
    const foiAlmox1    = (c.almox3 > 0) && invItem && invItem.temAlmox1;
    const foiAlmox2    = (c.almox3 > 0) && invItem && invItem.temAlmox2 && !invItem.temAlmox1;
    // Verificar se o perfil atual tem permissão para ver este local
    const podeVer = cp.acessoTotal
      || (foiAlmox3    && cp.podeContarAlmox3)
      || (foiAlmox30   && cp.podeContarAlmox30)
      || (foiRejunte   && cp.podeContarRejunte)
      || (foiSeparacao && cp.podeContarSeparacao)
      || (foiAlmox1    && cp.podeContarAlmox1)
      || (foiAlmox2    && cp.podeContarAlmox2);
    if(!podeVer) continue;
    return {
      data: conf.data || (conf.dataHora ? conf.dataHora.split(' ')[0] : ''),
      conferente: conf.nomeUsuario || conf.usuario || ''
    };
  }
  return null;
}
// Melhoria 1: renderiza apenas os filtros permitidos pelo perfil logado
// [NOVA FUNCIONALIDADE] Configuração padrão (fallback) — usada até a planilha
// carregar (ou se a aba FILTROS_RAPIDOS não existir/estiver vazia). Depois do
// login, carregarFiltrosRapidosSheets() pode substituir esse array pelo que
// estiver cadastrado na planilha, sem precisar mexer em código.
let CONF_FILTROS_CONFIG = [
  { id:'COLAFIX',     label:'COLAFIX',        keyword:'COLAFIX',     title:'' },
  { id:'BAUTECH',     label:'BAUTECH',        keyword:'BAUTECH',     title:'' },
  { id:'POZOSUL',     label:'POZOSUL',        keyword:'POZOSUL',     title:'' },
  { id:'PY',          label:'EXPORTAÇÃO PY',  keyword:'PY',          title:'Exportação Paraguai' },
  { id:'UY',          label:'EXPORTAÇÃO UY',  keyword:'UY',          title:'Exportação Uruguai' },
  { id:'FILME',       label:'FILMES',         keyword:'FILME',       title:'Filmes plásticos' },
  { id:'SACARIA',     label:'SACARIAS',       keyword:'SACARIA',     title:'Sacarias' },
];
function renderFiltrosRapidosConf(){
  const container = document.getElementById('confFiltrosRapidosContainer');
  if(!container) return;
  const pf = perfil();
  const permitidos = pf.confFiltros || (pf.podeAdmin ? CONF_FILTROS_CONFIG.map(f=>f.id) : []);
  container.innerHTML = '';
  CONF_FILTROS_CONFIG.forEach(f => {
    if(!permitidos.includes(f.id)) return;
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.style.cssText = 'height:28px;font-size:10px;padding:0 10px';
    btn.textContent = f.label;
    if(f.title) btn.title = f.title;
    btn.onclick = () => confFiltroRapido(f.id);
    container.appendChild(btn);
  });
}
// Alteração 3: filtro rápido por descrição (COLAFIX, BAUTECH, POZOSUL, EXPORTAÇÃO PY, EXPORTAÇÃO UY)
let _confFiltroColafix = false; // flag especial para o filtro COLAFIX
let _confFiltroAtivo = ''; // id do último filtro rápido ativado (vazio = nenhum)
function confFiltroRapido(id){
  const inp = document.getElementById('confSearch');
  // Melhoria 2: desmarcar itens do filtro anterior antes de trocar
  if(_confFiltroAtivo && id !== _confFiltroAtivo) {
    _desselecionarItensFiltro(_confFiltroAtivo);
  }
  if(id === ''){
    _confFiltroColafix = false;
    if(inp){ inp.value = ''; }
    _confFiltroAtivo = '';
    filtrarItensConf();
    return;
  }
  const f = CONF_FILTROS_CONFIG.find(x => x.id === id);
  if(!f) return;
  if(CONF_FILTROS_MODO === 'planilha'){
    // Modo planilha: filtro por categoria (matriz item×filtro) — não usa a busca por texto
    _confFiltroColafix = false;
    if(inp){ inp.value = ''; }
  } else if(f.id === 'COLAFIX'){
    _confFiltroColafix = true;
    if(inp){ inp.value = ''; }
  } else {
    _confFiltroColafix = false;
    if(inp){ inp.value = f.keyword || f.id; }
  }
  _confFiltroAtivo = f.id;
  filtrarItensConf();
  // Melhoria 2: selecionar automaticamente todos os itens visíveis do filtro
  if(id) { _selecionarItensFiltro(); }
}
// Melhoria 2: seleciona todos os itens atualmente visíveis na lista de seleção
function _selecionarItensFiltro(){
  const rows = document.querySelectorAll('#confItemSelList > div');
  rows.forEach(row => {
    const cod = row.dataset.cod;
    if(cod) CONF_ITENS_SEL.add(cod);
  });
  filtrarItensConf();
}
// Melhoria 2: desmarca itens que pertencem ao filtro que está sendo desativado
function _desselecionarItensFiltro(idAnterior){
  const fAnterior = CONF_FILTROS_CONFIG.find(x => x.id === idAnterior);
  const keywordAnterior = fAnterior ? (fAnterior.keyword || fAnterior.id) : idAnterior;
  const fonte = CONF_ITEMS.length > 0 ? CONF_ITEMS : ITEMS;
  fonte.forEach(item => {
    let pertence = false;
    if(CONF_FILTROS_MODO === 'planilha'){
      const marcados = FILTROS_ITEM_MAP[item.cod.toUpperCase()];
      pertence = !!(marcados && marcados.has(idAnterior));
    } else if(idAnterior === 'COLAFIX'){
      const n = item.name.toLowerCase();
      pertence = !n.includes('bautech') && !n.includes('pozosul') && !n.includes(' py') && !n.includes('py ') && !n.includes(' uy') && !n.includes('uy ');
    } else {
      pertence = item.name.toLowerCase().includes(keywordAnterior.toLowerCase());
    }
    if(pertence) CONF_ITENS_SEL.delete(item.cod);
  });
}
// Oculta nos selects de almoxarifado as opções que o perfil logado não pode acessar
function atualizarSelectsConferencia(){
  const cp = confPerm();
  // Mapeamento: valor da option -> flag de permissão
  const permissoes = {
    'almox3':    cp.acessoTotal || cp.podeContarAlmox3,
    'almox30':   cp.acessoTotal || cp.podeContarAlmox30,
    'rejunte':   cp.acessoTotal || cp.podeContarRejunte,
    'separacao': cp.acessoTotal || cp.podeContarSeparacao,
    'almox1':    cp.acessoTotal || cp.podeContarAlmox1,
    'almox2':    cp.acessoTotal || cp.podeContarAlmox2
  };
  ['confAlmox','confLocal'].forEach(id => {
    const sel = document.getElementById(id);
    if(!sel) return;
    Array.from(sel.options).forEach(opt => {
      if(opt.value === 'todos') return; // sempre visível
      const permitido = permissoes[opt.value];
      opt.style.display = permitido ? '' : 'none';
      opt.disabled = !permitido;
    });
    // Se o valor atual não está mais permitido, resetar para 'todos'
    if(sel.value !== 'todos' && !permissoes[sel.value]){
      sel.value = 'todos';
    }
  });
}

function filtrarItensConf(){
  const q = (document.getElementById('confSearch')||{value:''}).value.toLowerCase();
  // Regra central de permissões
  const cp = confPerm();
  const filtroForcado = confPerfilFiltro();
  const selectAlmox = document.getElementById('confAlmox');
  if(filtroForcado && selectAlmox){ selectAlmox.value = filtroForcado; selectAlmox.disabled = true; }
  else if(selectAlmox){ selectAlmox.disabled = false; }
  const almoxFiltro = filtroForcado || (selectAlmox ? selectAlmox.value : 'todos');
  const list = document.getElementById('confItemSelList');
  const vazio = document.getElementById('confSelVazio');
  if(!list) return;
  list.innerHTML = '';
  let visiveis = 0;

  const fonte = CONF_ITEMS.length > 0 ? CONF_ITEMS : ITEMS;

  fonte.forEach((item) => {
    // Filtro por almoxarifado + permissão de perfil
    if(almoxFiltro === 'almox3'     && !item.temAlmox3)     return;
    if(almoxFiltro === 'almox30'    && !item.temAlmox30)    return;
    if(almoxFiltro === 'rejunte'    && !item.temRejunte)    return;
    if(almoxFiltro === 'separacao'  && !item.temSeparacao)  return;
    if(almoxFiltro === 'almox1'     && !item.temAlmox1)     return;
    if(almoxFiltro === 'almox2'     && !item.temAlmox2)     return;
    // Segurança: nunca exibir item de local sem permissão
    // Regra: verificar se o perfil tem permissão para PELO MENOS UM dos locais do item
    if(!cp.acessoTotal){
      const temPermAlmox3    = item.temAlmox3    && cp.podeContarAlmox3;
      const temPermAlmox30   = item.temAlmox30   && cp.podeContarAlmox30;
      const temPermRejunte   = item.temRejunte   && cp.podeContarRejunte;
      const temPermSeparacao = item.temSeparacao && cp.podeContarSeparacao;
      const temPermAlmox1    = item.temAlmox1    && cp.podeContarAlmox1;
      const temPermAlmox2    = item.temAlmox2    && cp.podeContarAlmox2;
      // Se o item não pertence a nenhum local com permissão, ocultar
      if(!temPermAlmox3 && !temPermAlmox30 && !temPermRejunte && !temPermSeparacao && !temPermAlmox1 && !temPermAlmox2) return;
    }
    if(q && !item.cod.toLowerCase().includes(q) && !item.name.toLowerCase().includes(q)) return;
    // Filtro rápido: modo "planilha" (matriz item×filtro) usa pertencimento direto;
    // modo "legado" (sem planilha configurada) mantém a busca por palavra-chave de sempre.
    if(_confFiltroAtivo){
      if(CONF_FILTROS_MODO === 'planilha'){
        const marcados = FILTROS_ITEM_MAP[item.cod.toUpperCase()];
        if(!marcados || !marcados.has(_confFiltroAtivo)) return;
      } else if(_confFiltroColafix){
        const n = item.name.toLowerCase();
        if(n.includes('bautech') || n.includes('pozosul') || n.includes(' py') || n.includes(' uy') || n.endsWith(' py') || n.endsWith(' uy') || n.includes('py ') || n.includes('uy ')) return;
      }
    }
    visiveis++;
    const sel = CONF_ITENS_SEL.has(item.cod);
    const s3 = getSt(item.saldo3, item.min3);
    const spp = getSacsPorPal(item.cod);
    const palSist3 = Math.floor(item.saldo3 / spp);
    const palSist30 = Math.floor(item.saldo30 / spp);
    // Saldos visíveis: usar confPerm() como única regra
    const verAlmox3  = cp.podeContarAlmox3  && !item.temRejunte && !(item.temAlmox30 && !item.temAlmox3);
    const verAlmox30 = cp.podeContarAlmox30 && item.temAlmox30 && !item.temRejunte;
    const verRejunte = cp.podeContarRejunte && item.temRejunte;
    const lblLocal = localLabel(item);
    const corLocal = item.temRejunte ? 'var(--purple,#7B5EA7)' : item.temAlmox1 ? 'var(--orange,#E07B39)' : item.temAlmox2 ? 'var(--purple,#7B5EA7)' : item.temAlmox30 && !item.temAlmox3 ? 'var(--green)' : 'var(--accent)';
    const saldoVis = item.temRejunte ? item.saldo3 : item.temAlmox30 && !item.temAlmox3 ? item.saldo30 : item.saldo3;
    const palVis   = item.temRejunte ? palSist3 : item.temAlmox30 && !item.temAlmox3 ? palSist30 : palSist3;

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:flex-start;gap:10px;padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border);transition:background .12s;' + (sel ? 'background:var(--accent-dim)' : 'background:#fff');
    row.dataset.cod = item.cod; // Melhoria 2: identificador para seleção automática
    row.onclick = () => confToggleItem(item.cod);
    // Exibir checkbox + código + descrição + tipo operacional + última contagem
    const uc = ultimaContagemItem(item.cod);
    const ucHtml = uc
      ? `<div style="font-size:9px;color:var(--text3);margin-top:2px">\uD83D\uDCC5 Última contagem: <b>${uc.data}</b> – ${uc.conferente}</div>`
      : `<div style="font-size:9px;color:var(--text3);margin-top:2px">Sem histórico</div>`;
    const badgeSel = tipoOpBadge(item);
    row.innerHTML = `
      <div style="width:18px;height:18px;border:2px solid ${sel ? 'var(--accent)' : 'var(--border2)'};border-radius:4px;background:${sel ? 'var(--accent)' : '#fff'};display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff;flex-shrink:0;transition:all .15s;margin-top:2px">${sel ? '\u2713' : ''}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:10px;color:var(--text3);font-weight:700;letter-spacing:.05em">${escapeHTML(item.cod)}</div>
        <div style="font-size:12px;font-weight:600;word-break:break-word;white-space:normal;line-height:1.4">${escapeHTML(item.name)}</div>
        ${badgeSel ? `<div style="margin-top:3px">${badgeSel}</div>` : ''}
        ${ucHtml}
      </div>
    `;
    list.appendChild(row);
  });

  if(visiveis === 0){
    list.style.display='none';
    vazio.style.display='block';
  } else {
    list.style.display='block';
    vazio.style.display='none';
  }
  atualizarBadgeSelConf();
}

function confToggleItem(cod){
  if(CONF_ITENS_SEL.has(cod)) CONF_ITENS_SEL.delete(cod);
  else CONF_ITENS_SEL.add(cod);
  filtrarItensConf();
}

function confSelecionarTodos(){
  const q = (document.getElementById('confSearch')||{value:''}).value.toLowerCase();
  const cp = confPerm();
  const filtroForcado = confPerfilFiltro();
  const almoxFiltro = filtroForcado || (document.getElementById('confAlmox')||{value:'todos'}).value;
  const fonte = CONF_ITEMS.length > 0 ? CONF_ITEMS : ITEMS;
  fonte.forEach(item => {
    if(almoxFiltro === 'almox3'  && !item.temAlmox3)  return;
    if(almoxFiltro === 'almox30' && !item.temAlmox30) return;
    if(almoxFiltro === 'rejunte' && !item.temRejunte) return;
    if(almoxFiltro === 'almox1'  && !item.temAlmox1)  return;
    if(almoxFiltro === 'almox2'  && !item.temAlmox2)  return;
    // Segurança: nunca selecionar item de local sem permissão
    if(!cp.acessoTotal){
      if(item.temRejunte  && !cp.podeContarRejunte)  return;
      if(item.temAlmox1   && !cp.podeContarAlmox1)   return;
      if(item.temAlmox2   && !cp.podeContarAlmox2)   return;
      if(item.temAlmox30 && !item.temAlmox3 && !cp.podeContarAlmox30) return;
      if(!item.temAlmox30 && !item.temRejunte && !item.temAlmox1 && !item.temAlmox2 && !cp.podeContarAlmox3) return;
    }
    if(!q || item.cod.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)){
      CONF_ITENS_SEL.add(item.cod);
    }
  });
  filtrarItensConf();
}

function confLimparSelecao(){
  CONF_ITENS_SEL.clear();
  filtrarItensConf();
}

function atualizarBadgeSelConf(){
  const badge = document.getElementById('confSelBadge');
  const btnIniciar = document.getElementById('btnIniciarConf');
  if(badge){
    if(CONF_ITENS_SEL.size > 0){
      badge.style.display='inline';
      badge.textContent = CONF_ITENS_SEL.size + (CONF_ITENS_SEL.size===1?' selecionado':' selecionados');
    } else {
      badge.style.display='none';
    }
  }
}

function confIniciarConferencia(){
  if(CONF_ITENS_SEL.size === 0){ toast('Selecione ao menos um item para conferir.'); return; }
  CONF_MODO = 'conferencia';
  const selCard = document.getElementById('confSelCard');
  const painelConf = document.getElementById('confPainelConf');
  if(selCard) selCard.style.display = 'none';
  if(painelConf) painelConf.style.display = 'block';
  // Número provisório
  const numEl = document.getElementById('confNumDisplay');
  if(numEl) numEl.textContent = '🕐 ' + nowFull() + ' · 👤 ' + ((USUARIO_LOGADO && USUARIO_LOGADO.nome) || '—');
  // [FIX-5] Restaurar autosave do localStorage se existir para os itens selecionados
  try {
    const temp = localStorage.getItem('conf_temp');
    if(temp) {
      const salvo = JSON.parse(temp);
      // Restaurar apenas itens que estão na seleção atual
      CONF_ITENS_SEL.forEach(cod => {
        if(salvo[cod] && !CONFERENCIAS[cod]) {
          CONFERENCIAS[cod] = salvo[cod];
        }
      });
      const qtdRestaurados = Object.keys(CONFERENCIAS).length;
      if(qtdRestaurados > 0) {
        toast('🔄 ' + qtdRestaurados + ' item(s) restaurado(s) do autosave.', 3000);
        console.log('[autosave] Restaurado do localStorage:', JSON.stringify(CONFERENCIAS));
      }
    }
  } catch(e) { console.warn('[autosave] Erro ao restaurar:', e); }
  renderConferencia();
}

function confVoltarSelecao(){
  const temDados = Object.keys(CONFERENCIAS).some(cod=>{
    const c=CONFERENCIAS[cod];
    return(c.pal3>0||c.sac3>0||c.pal30>0||c.sac30>0);
  });
  if(temDados && !confirm('Há contagens preenchidas que serão perdidas. Deseja voltar mesmo assim?')) return;
  CONFERENCIAS={};
  CONF_MODO = 'selecao';
  const selCard = document.getElementById('confSelCard');
  const painelConf = document.getElementById('confPainelConf');
  if(selCard) selCard.style.display = 'block';
  if(painelConf) painelConf.style.display = 'none';
  // Ajuste 2: limpar pesquisa do painel ao voltar
  const ps = document.getElementById('confPainelSearch');
    if(ps) ps.value = '';
  IS_EDITING=false; // Melhoria 5: libera polling ao cancelar
  filtrarItensConf();
}
function renderConferencia(){
  const grid = document.getElementById('confGrid');
  const gridVazio = document.getElementById('confGridVazio');
  if(!grid) return;

  // Se estamos no modo seleção, apenas re-renderizar a lista de seleção
  if(CONF_MODO === 'selecao'){
    filtrarItensConf();
    return;
  }

  // Regra central de permissões
  const cp = confPerm();
  const filtroForcadoConf = confPerfilFiltro();
  const selectLocal = document.getElementById('confLocal');
  if(filtroForcadoConf && selectLocal){ selectLocal.value = filtroForcadoConf; selectLocal.disabled = true; }
  else if(selectLocal){ selectLocal.disabled = false; }
  const local = filtroForcadoConf || (selectLocal ? selectLocal.value : 'todos');
  grid.innerHTML = '';
  let visCount = 0;

  const fonteConf = CONF_ITEMS.length > 0 ? CONF_ITEMS : ITEMS;

  fonteConf.forEach((item) => {
    // Apenas itens selecionados para conferir
    if(!CONF_ITENS_SEL.has(item.cod)) return;

    // Filtro de Local (usa flags booleanas de INVENTARIO_ITENS quando disponível)
    if(local === 'almox3'    && !item.temAlmox3)    return;
    if(local === 'almox30'   && !item.temAlmox30)   return;
    if(local === 'rejunte'   && !item.temRejunte)   return;
    if(local === 'separacao' && !item.temSeparacao) return;
    if(local === 'almox1'    && !item.temAlmox1)    return;
    if(local === 'almox2'    && !item.temAlmox2)    return;

    // Ajuste 2: filtro de pesquisa no painel de conferência
    const qPainel = (document.getElementById('confPainelSearch')||{value:''}).value.toLowerCase();
    if(qPainel && !item.cod.toLowerCase().includes(qPainel) && !item.name.toLowerCase().includes(qPainel)) return;

    visCount++;
    const spp = getSacsPorPal(item.cod);
    const palSist3 = Math.floor(item.saldo3 / spp);
    const sacSist3 = item.saldo3 % spp;
    const palSist30 = Math.floor(item.saldo30 / spp);
    const sacSist30 = item.saldo30 % spp;
    const s3 = getSt(item.saldo3, item.min3);

    const conf = CONFERENCIAS[item.cod] || { pal3: 0, sac3: 0, total3: 0, pal30: 0, sac30: 0, total30: 0 };
    const qtdRasgadaAtual = Number(conf.qtdRasgada)||0;
    const itemRasgado = qtdRasgadaAtual > 0;

    const card = document.createElement('div');
    card.className = 'card';
    card.id = 'confCard_' + item.cod;
    card.style.padding = '14px';
    if(itemRasgado){ card.style.borderColor = 'var(--red)'; card.style.background = 'var(--red-dim)'; }

    // ITEM 7: coloração de divergência removida do card de conferência

    // Regra central: quais blocos este item/perfil pode ver e lançar
    // Cada bloco é mostrado se o item PERTENCE ao local E o perfil TEM permissão
    // Bloco 3  = Almox 3 (temAlmox3) OU Rejunte (temRejunte) OU Separação (temSeparacao) OU Almox 1 — Matéria-Prima (temAlmox1)
    // Bloco 30 = Almox 30 (temAlmox30) OU Almox 2 — Matéria-Prima (temAlmox2)
    // Almox 1/Almox 2 reaproveitam os mesmos "slots" de Almox 3/Almox 30 — um item pode
    // pertencer aos dois ao mesmo tempo (dois estoques físicos separados), exatamente
    // como já acontece hoje com Almox 3 + Almox 30 juntos.
    const podeVerAlmox3    = !!item.temAlmox3    && cp.podeContarAlmox3;
    const podeVerAlmox30   = !!item.temAlmox30   && cp.podeContarAlmox30;
    const podeVerRejunte   = !!item.temRejunte   && cp.podeContarRejunte;
    const podeVerSeparacao = !!item.temSeparacao && cp.podeContarSeparacao;
    const podeVerAlmox1    = !!item.temAlmox1    && cp.podeContarAlmox1;
    const podeVerAlmox2    = !!item.temAlmox2    && cp.podeContarAlmox2;
    // Bloco 3: mostra se pode ver almox3, rejunte, separacao ou almox1
    const mostrarBloco3  = podeVerAlmox3 || podeVerRejunte || podeVerSeparacao || podeVerAlmox1;
    // Bloco 30: mostra se pode ver almox30 ou almox2
    const mostrarBloco30 = podeVerAlmox30 || podeVerAlmox2;
    // Rótulo dinâmico do local — agora por BLOCO (um item pode ter Almox 1 no bloco 3 e Almox 2 no bloco 30 ao mesmo tempo)
    const isRejunte   = !!item.temRejunte;
    const isSeparacao = !!item.temSeparacao;
    const isAlmox1    = !!item.temAlmox1;
    const isAlmox2    = !!item.temAlmox2;
    const isAlmox30Only = !!item.temAlmox30 && !item.temAlmox3 && !isRejunte && !isSeparacao && !isAlmox1 && !isAlmox2;
    // Itens com unidade própria (UN, ROLO etc., sem conversão em massa) não fazem sentido em paletes
    const esconderPaletes = temUnidadePropria(item) && !temConversaoBulk(item);
    const lblBloco3  = (isRejunte && podeVerRejunte) ? 'Rejunte' : (isSeparacao && podeVerSeparacao) ? 'Separação' : (isAlmox1 && podeVerAlmox1) ? 'Almox 1' : 'Almox 3';
    const corBloco3  = (isRejunte && podeVerRejunte) ? 'var(--purple,#7B5EA7)' : (isSeparacao && podeVerSeparacao) ? 'var(--orange,#E07B39)' : (isAlmox1 && podeVerAlmox1) ? 'var(--orange,#E07B39)' : 'var(--accent)';
    const lblBloco30 = (isAlmox2 && podeVerAlmox2) ? 'Almox 2' : 'Almox 30';
    const corBloco30 = (isAlmox2 && podeVerAlmox2) ? 'var(--purple,#7B5EA7)' : 'var(--green)';
    // Mantidos para compatibilidade com trechos que ainda usam o rótulo único do item
    const lblLocalCard = localLabel(item);
    const corLocalCard = corBloco3;
    const saldoCard3 = item.saldo3;
    const saldoCard30 = item.saldo30;

    // Blocos de saldo sistema — ITEM 7: removidos do card de conferência
    const gridCols = (mostrarBloco3 && mostrarBloco30) ? '1fr 1fr' : '1fr';
    const blocoSaldoAlmox3  = ''; // saldo ocultado
    const blocoSaldoAlmox30 = ''; // saldo ocultado

    // Blocos de contagem física com rótulo dinâmico
    const blocoContAlmox3 = mostrarBloco3 ? `
      <div style="margin-bottom:10px;background:var(--bg3);border-radius:8px;padding:10px">
        <div style="font-size:10px;font-weight:700;color:${corBloco3};margin-bottom:6px">✏️ Contagem Física — ${lblBloco3}</div>
        <div style="display:grid;grid-template-columns:${(isRejunte || esconderPaletes) ? '1fr' : '1fr 1fr'};gap:8px">
          ${(!isRejunte && !esconderPaletes) ? `<div class="fld"><label>Paletes Contados</label>
            <input type="number" min="0" value="${conf.pal3 || ''}" placeholder="0"
              oninput="updateConf('${item.cod}', this.value, 'pal3')"
              style="text-align:center;font-weight:700;font-size:15px;height:38px">
          </div>` : ''}
          <div class="fld"><label>${unidAvul(item)}</label>
            <input type="number" min="0" value="${conf.sac3 || ''}" placeholder="0"
              oninput="updateConf('${item.cod}', this.value, 'sac3')"
              style="text-align:center;font-weight:700;font-size:15px;height:38px">
          </div>
        </div>
        <div id="resumoFisico3_${item.cod}" style="margin-top:6px;padding:6px 8px;background:#fff;border-radius:6px;font-size:11px;display:${(conf.total3 > 0)?'block':'none'}">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="color:var(--text2)">${unidTotal(item)} ${lblBloco3}:</span>
            <b style="color:${corBloco3};font-size:13px" id="totalFisico3_${item.cod}">${qtdComConversaoTexto(item, conf.total3 || 0, unidSing(item))}</b>
          </div>
          <!-- diferença vs sistema ocultada -->
          <div id="divTag3_${item.cod}" style="display:none"></div>
        </div>
      </div>` : '';

    const blocoContAlmox30 = mostrarBloco30 ? `
      <div style="background:var(--bg3);border-radius:8px;padding:10px">
        <div style="font-size:10px;font-weight:700;color:${corBloco30};margin-bottom:6px">✏️ Contagem Física — ${lblBloco30}</div>
        <div style="display:grid;grid-template-columns:${esconderPaletes ? '1fr' : '1fr 1fr'};gap:8px">
          ${!esconderPaletes ? `<div class="fld"><label>Paletes Contados</label>
            <input type="number" min="0" value="${conf.pal30 || ''}" placeholder="0"
              oninput="updateConf('${item.cod}', this.value, 'pal30')"
              style="text-align:center;font-weight:700;font-size:15px;height:38px">
          </div>` : ''}
          <div class="fld"><label>${unidAvul(item)}</label>
            <input type="number" min="0" value="${conf.sac30 || ''}" placeholder="0"
              oninput="updateConf('${item.cod}', this.value, 'sac30')"
              style="text-align:center;font-weight:700;font-size:15px;height:38px">
          </div>
        </div>
        <div id="resumoFisico30_${item.cod}" style="margin-top:6px;padding:6px 8px;background:#fff;border-radius:6px;font-size:11px;display:${(conf.total30 > 0)?'block':'none'}">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="color:var(--text2)">Total Físico ${lblBloco30}:</span>
            <b style="color:${corBloco30};font-size:13px" id="totalFisico30_${item.cod}">${qtdComConversaoTexto(item, conf.total30 || 0, 'sc')}</b>
          </div>
          <!-- diferença vs sistema ocultada -->
          <div id="divTag30_${item.cod}" style="display:none"></div>
        </div>
      </div>` : '';

    const badgeTipoOp = tipoOpBadge(item);
    const maxRasgoConf = (Number(conf.total3)||0) + (Number(conf.total30)||0);

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;gap:6px">
        <div style="min-width:0;flex:1">
          <div style="font-weight:700;font-size:12px;color:var(--text)">${escapeHTML(item.cod)}</div>
          <div style="font-size:11px;color:var(--text2);margin-top:1px;word-break:break-word;white-space:normal;line-height:1.4">${escapeHTML(item.name)}</div>
          <div style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap">
            ${badgeTipoOp ? badgeTipoOp : ''}
            <span id="confRasgoBadge_${item.cod}">${itemRasgado ? rasgoTagHTML(qtdRasgadaAtual) : ''}</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          <button class="tap-target-sm" onclick="confRemoverItem('${item.cod}')" style="border:none;background:none;cursor:pointer;color:var(--text3);font-size:14px;padding:0 2px;line-height:1" title="Remover item">✕</button>
        </div>
      </div>

      <!-- SALDO SISTEMA – ocultado (cálculos preservados) -->

      ${blocoContAlmox3}
      ${blocoContAlmox30}

      <div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--border)">
        <div style="display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap">
          <div class="fld" style="width:120px">
            <label>⚠️ Qtd. Rasgada</label>
            <input type="number" inputmode="numeric" min="0" value="${qtdRasgadaAtual || ''}" placeholder="0"
              id="confQtdRasgada_${item.cod}"
              oninput="setQtdRasgadaConf('${item.cod}', this.value)"
              style="text-align:center;font-weight:700;height:34px">
          </div>
          <div style="font-size:10px;color:var(--text3);padding-bottom:8px">separado da contagem acima — não desconta o total</div>
        </div>
        <div id="confRasgoResumo_${item.cod}" style="margin-top:6px;font-size:11px;font-weight:700">${rasgoResumoHTML(qtdRasgadaAtual, maxRasgoConf)}</div>
        <div id="confRasgoObsWrap_${item.cod}" style="display:${itemRasgado?'block':'none'};margin-top:6px">
          <textarea class="rasgo-obs" placeholder="Motivo/Avaria (opcional)" oninput="updateMotivoRasgoConf('${item.cod}', this.value)">${escapeHTML(conf.motivoRasgo||'')}</textarea>
        </div>
        <label style="display:flex;align-items:center;gap:6px;margin-top:10px;font-size:11px;color:var(--text2);cursor:pointer">
          <input type="checkbox" id="confZero_${item.cod}" ${conf.confirmadoZero ? 'checked' : ''} onchange="setConfirmarZeroConf('${item.cod}', this.checked)" style="width:15px;height:15px;cursor:pointer">
          Confirmar contagem zero — contei e não há nenhuma unidade deste item no local
        </label>
      </div>
    `;
    grid.appendChild(card);
  });

  if(gridVazio){
    gridVazio.style.display = visCount === 0 ? 'block' : 'none';
  }
}

function confRemoverItem(cod){
  CONF_ITENS_SEL.delete(cod);
  if(CONF_ITENS_SEL.size === 0){ confVoltarSelecao(); return; }
  renderConferencia();
  atualizarBadgeSelConf();
}

function updateConf(cod, val, type) {
  IS_EDITING=true; // Melhoria 5: bloqueia polling enquanto edita
  // [FIX BUG-10] Garantir inicialização completa do objeto com todos os campos necessários
  if(!CONFERENCIAS[cod]) CONFERENCIAS[cod] = { pal3: 0, sac3: 0, total3: 0, pal30: 0, sac30: 0, total30: 0, total: 0 };
  // [FIX] Garantir que o valor seja sempre um inteiro válido (não NaN, não string)
  const valInt = Math.max(0, parseInt(val) || 0);
  CONFERENCIAS[cod][type] = valInt;
  const spp = getSacsPorPal(cod);
  // [FIX] Recalcular totais garantindo que todos os campos sejam números
  const p3  = parseInt(CONFERENCIAS[cod].pal3)  || 0;
  const s3  = parseInt(CONFERENCIAS[cod].sac3)  || 0;
  const p30 = parseInt(CONFERENCIAS[cod].pal30) || 0;
  const s30 = parseInt(CONFERENCIAS[cod].sac30) || 0;
  CONFERENCIAS[cod].total3  = (p3 * spp) + s3;
  CONFERENCIAS[cod].total30 = (p30 * spp) + s30;
  CONFERENCIAS[cod].total   = CONFERENCIAS[cod].total3 + CONFERENCIAS[cod].total30;

  // [FIX-5] Autosave no localStorage a cada digitação para evitar perda de dados
  try { localStorage.setItem('conf_temp', JSON.stringify(CONFERENCIAS)); } catch(e){}

  const el3 = document.getElementById('totalFisico3_' + cod);
  const el30 = document.getElementById('totalFisico30_' + cod);
  if(el3 || el30){
    const itemConv = CONF_ITEMS.find(i=>i.cod===cod) || ITEMS.find(i=>i.cod===cod);
    if(el3) el3.textContent = qtdComConversaoTexto(itemConv, CONFERENCIAS[cod].total3, unidSing(itemConv));
    if(el30) el30.textContent = qtdComConversaoTexto(itemConv, CONFERENCIAS[cod].total30, 'sc');
  }

    // Mostrar/ocultar resumo (diferença vs sistema ocultada)
  const resumo3 = document.getElementById('resumoFisico3_' + cod);
  const resumo30 = document.getElementById('resumoFisico30_' + cod);
  if(resumo3) resumo3.style.display = CONFERENCIAS[cod].total3 > 0 ? 'block' : 'none';
  if(resumo30) resumo30.style.display = CONFERENCIAS[cod].total30 > 0 ? 'block' : 'none';

  // Atualizar resumo da Qtd. Rasgada (independente da contagem — ficam separados)
  atualizarUIRasgoConf(cod);
}

// [FIX-6] ID único real: timestamp completo + random para evitar colisões
function gerarNumConferencia() {
  return 'CONF-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
}

// ─── AUDITORIA DE ESTOQUE (NOVA FUNCIONALIDADE) ─────────────────────
// Chave única por conferência + item + local, usada tanto pela auditoria
// quanto pela investigação (mesma chave identifica a mesma "linha auditável").
function getAuditKey(numConf, cod, local){
  return numConf + '_' + cod + '_' + String(local).replace(/\s+/g,'').toLowerCase();
}
function getAuditRegistro(numConf, cod, local){
  return AUDITORIA_HISTORICO.find(a => a.auditKey === getAuditKey(numConf, cod, local));
}
// Estados possíveis: nao_auditado | validado | em_investigacao | resolvido
function getAuditStatus(numConf, cod, local){
  const reg = getAuditRegistro(numConf, cod, local);
  if(!reg) return 'nao_auditado';
  if(reg.resultado === 'Validado') return 'validado';
  if(reg.investigacao && reg.investigacao.status === 'Resolvido') return 'resolvido';
  return 'em_investigacao';
}
const AUDIT_STATUS_MAP = {
  nao_auditado:    {emoji:'⚪', label:'Não Auditado',            bg:'var(--bg3)',        txt:'var(--text3)'},
  validado:        {emoji:'🟢', label:'Saldo Validado',          bg:'var(--green-dim)',  txt:'var(--green)'},
  em_investigacao: {emoji:'🔴', label:'Em Investigação',         bg:'var(--red-dim)',    txt:'var(--red)'},
  resolvido:       {emoji:'🔵', label:'Investigação Resolvida',  bg:'var(--accent-dim)', txt:'var(--accent)'}
};
function auditStatusBadgeHTML(status, compacto){
  const m = AUDIT_STATUS_MAP[status] || AUDIT_STATUS_MAP.nao_auditado;
  return `<span class="status-badge" style="background:${m.bg};color:${m.txt}">${m.emoji}${compacto?'':' '+m.label}</span>`;
}
// Lista as "linhas auditáveis" (item + local) de uma conferência, respeitando
// exatamente os mesmos locais já mostrados no histórico para aquele item.
function listarLinhasAuditaveis(conf){
  const cpAud = confPerm();
  const linhas = [];
  Object.entries(conf.itens||{}).forEach(([cod, it]) => {
    const invItemA = CONF_ITEMS.find(i => i.cod === cod) || ITEMS.find(i => i.cod === cod);
    const isRejA  = !!(invItemA && invItemA.temRejunte);
    const isSepA  = !!(invItemA && invItemA.temSeparacao);
    const isA1A   = !!(invItemA && invItemA.temAlmox1);
    const isA2A   = !!(invItemA && invItemA.temAlmox2);
    const isA3A   = !!(invItemA && invItemA.temAlmox3);
    const isA30A  = !!(invItemA && invItemA.temAlmox30);

    // [FIX] Bloco 3 e Bloco 30 são checados de forma INDEPENDENTE agora — antes, um
    // item com Rejunte/Separação/Almox1 "retornava" cedo e nunca chegava a checar se
    // ele TAMBÉM tinha Almox 30 preenchido (caso real: item de Separação que também é
    // contado em Almox 30 — a linha de Almox 30 sumia e o painel mostrava "0" lendo o
    // campo errado). Cada bloco só gera linha se o item realmente tem aquele campo.
    //
    // Bloco 3 (pal3/sac3/it.almox3): Rejunte, Separação, Almox1 OU Almox3-comum — só
    // uma dessas 4 categorias por item nesse bloco específico (são mutuamente exclusivas
    // ENTRE SI, mas não excluem o bloco 30).
    if(isRejA){
      if(cpAud.acessoTotal || cpAud.podeContarRejunte) linhas.push({ cod, nome: it.nome, local: 'Rejunte', saldoFisico: it.almox3||0 });
    } else if(isSepA){
      if(cpAud.acessoTotal || cpAud.podeContarSeparacao) linhas.push({ cod, nome: it.nome, local: 'Separação', saldoFisico: it.almox3||0 });
    } else if(isA1A){
      if(cpAud.acessoTotal || cpAud.podeContarAlmox1) linhas.push({ cod, nome: it.nome, local: 'Almox 1', saldoFisico: it.almox3||0 });
    } else if(isA3A){
      if(cpAud.acessoTotal || cpAud.podeContarAlmox3) linhas.push({ cod, nome: it.nome, local: 'Almox 3', saldoFisico: it.almox3||0 });
    }

    // Bloco 30 (pal30/sac30/it.almox30): Almox2 OU Almox30-comum — independente do
    // bloco 3 acima, só gera linha se o item realmente tem o flag correspondente.
    if(isA2A){
      if(cpAud.acessoTotal || cpAud.podeContarAlmox2) linhas.push({ cod, nome: it.nome, local: 'Almox 2', saldoFisico: it.almox30||0 });
    } else if(isA30A){
      if(cpAud.acessoTotal || cpAud.podeContarAlmox30) linhas.push({ cod, nome: it.nome, local: 'Almox 30', saldoFisico: it.almox30||0 });
    }
  });
  return linhas;
}
// Resumo/progresso de auditoria de uma conferência (painel + semáforo)
function getAuditoriaResumoConferencia(conf){
  const linhas = listarLinhasAuditaveis(conf);
  let validados=0, pendentes=0, emInvestigacao=0, resolvidas=0;
  linhas.forEach(l => {
    const status = getAuditStatus(conf.numero, l.cod, l.local);
    if(status==='validado') validados++;
    else if(status==='em_investigacao') emInvestigacao++;
    else if(status==='resolvido') resolvidas++;
    else pendentes++;
  });
  const total = linhas.length;
  const percentual = total>0 ? Math.round(((validados+resolvidas)/total)*100) : 0;
  const semaforo = emInvestigacao>0 ? 'vermelho' : (pendentes>0 ? 'amarelo' : (total>0 ? 'verde' : 'cinza'));
  const concluida = total>0 && pendentes===0 && emInvestigacao===0;
  return { total, validados, pendentes, emInvestigacao, resolvidas, percentual, semaforo, concluida };
}
function semaforoHTML(semaforo){
  const map = { verde:'🟢', amarelo:'🟡', vermelho:'🔴', cinza:'⚪' };
  return map[semaforo] || '⚪';
}

// ─── MATERIAL RASGADO (QUANTIDADE) — NOVA FUNCIONALIDADE ───────────
// Tag/badge visual reutilizável para indicar quantidade rasgada em qualquer tela
function rasgoTagHTML(qtd){
  const n = Number(qtd)||0;
  return '<span class="rasgo-tag">⚠️ ' + n + ' Rasgado' + (n===1?'':'s') + '</span>';
}
// Monta HTML do resumo — rasgados ficam SEPARADOS fisicamente do estoque bom,
// então a quantidade rasgada não é descontada da contagem, é informativa/adicional
function rasgoResumoHTML(qtd, max){
  const n = Number(qtd)||0;
  if(n<=0) return '';
  const boa = Number(max)||0;
  return '<span style="color:var(--green)">✔ ' + boa + ' contado(s)</span> '
       + '<span style="color:var(--red);margin-left:8px">⚠ +' + n + ' Rasgado' + (n===1?'':'s') + ' (separado, não desconta da contagem)</span>';
}

// ── Conferência: apontamento vinculado ao item dentro de CONFERENCIAS[cod] ──
// Rasgados ficam separados fisicamente da contagem, então não há teto ligado ao total contado
function setQtdRasgadaConf(cod, val){
  if(!CONFERENCIAS[cod]) CONFERENCIAS[cod] = { pal3:0,sac3:0,total3:0,pal30:0,sac30:0,total30:0,total:0 };
  const c = CONFERENCIAS[cod];
  let n = Math.max(0, parseInt(val)||0);
  c.qtdRasgada = n;
  if(n>0){
    c.rasgoApontadoPor = (USUARIO_LOGADO && USUARIO_LOGADO.nome) || '—';
    c.rasgoDataHora = nowFull();
  } else {
    c.motivoRasgo = '';
  }
  try { localStorage.setItem('conf_temp', JSON.stringify(CONFERENCIAS)); } catch(e){}
  atualizarUIRasgoConf(cod);
}
function updateMotivoRasgoConf(cod, val){
  if(!CONFERENCIAS[cod]) CONFERENCIAS[cod] = { pal3:0,sac3:0,total3:0,pal30:0,sac30:0,total30:0,total:0 };
  CONFERENCIAS[cod].motivoRasgo = val;
  try { localStorage.setItem('conf_temp', JSON.stringify(CONFERENCIAS)); } catch(e){}
}
// [NOVA FUNCIONALIDADE] Marca que o conferente realmente contou o item e não achou
// nenhuma unidade — sem isso, um item com todos os campos em 0 fica indistinguível
// de "não contei esse item" e simplesmente não entra na conferência salva.
function setConfirmarZeroConf(cod, marcado){
  if(!CONFERENCIAS[cod]) CONFERENCIAS[cod] = { pal3:0,sac3:0,total3:0,pal30:0,sac30:0,total30:0,total:0 };
  CONFERENCIAS[cod].confirmadoZero = marcado;
  try { localStorage.setItem('conf_temp', JSON.stringify(CONFERENCIAS)); } catch(e){}
}
// Atualiza apenas os elementos do item (sem recriar a lista inteira) para preservar o foco do campo
function atualizarUIRasgoConf(cod){
  const c = CONFERENCIAS[cod] || {};
  const n = c.qtdRasgada || 0;
  const max = (Number(c.total3)||0) + (Number(c.total30)||0);
  const inputEl = document.getElementById('confQtdRasgada_'+cod);
  if(inputEl){
    if(Number(inputEl.value||0) !== n) inputEl.value = n || '';
  }
  const card = document.getElementById('confCard_'+cod);
  if(card){
    card.style.borderColor = n>0 ? 'var(--red)' : 'var(--border)';
    card.style.background  = n>0 ? 'var(--red-dim)' : 'var(--bg2)';
  }
  const badge = document.getElementById('confRasgoBadge_'+cod);
  if(badge) badge.innerHTML = n>0 ? rasgoTagHTML(n) : '';
  const resumo = document.getElementById('confRasgoResumo_'+cod);
  if(resumo) resumo.innerHTML = rasgoResumoHTML(n, max);
  const obsWrap = document.getElementById('confRasgoObsWrap_'+cod);
  if(obsWrap) obsWrap.style.display = n>0 ? 'block' : 'none';
}

// ── Movimentação (fluxo de requisição — st.itens) ──
// Rasgados ficam separados fisicamente do que foi movimentado — não desconta nem tem teto ligado a isso
function setQtdRasgadaMov(i, val){
  const it = st.itens && st.itens[i]; if(!it) return;
  let n = Math.max(0, parseInt(val)||0);
  it.qtdRasgada = n;
  if(n>0){
    it.rasgoApontadoPor = (USUARIO_LOGADO && USUARIO_LOGADO.nome) || '—';
    it.rasgoDataHora = nowFull();
  } else {
    it.motivoRasgo = '';
  }
  syncPendente();
  atualizarUIRasgoMov(i);
}
function updateMotivoRasgoMov(i, val){
  const it = st.itens && st.itens[i]; if(!it) return;
  it.motivoRasgo = val;
  syncPendente();
}
function atualizarUIRasgoMov(i){
  const it = st.itens && st.itens[i]; if(!it) return;
  const n = it.qtdRasgada || 0;
  const max = Number(it.sacos)||0;
  const movido = it.itemStatus==='movido'||it.itemStatus==='validado'||it.itemStatus==='lancado';
  const inputEl = document.getElementById('movQtdRasgada_'+i);
  if(inputEl){
    if(Number(inputEl.value||0) !== n) inputEl.value = n || '';
  }
  const card = document.getElementById('movCard_'+i);
  if(card){
    card.style.borderColor = n>0 ? 'var(--red)' : (movido ? 'var(--green)' : 'var(--border)');
    card.style.background  = n>0 ? 'var(--red-dim)' : (movido ? 'var(--green-dim)' : '#fff');
  }
  const badge = document.getElementById('movRasgoBadge_'+i);
  if(badge) badge.innerHTML = n>0 ? rasgoTagHTML(n) : '';
  const resumo = document.getElementById('movRasgoResumo_'+i);
  if(resumo) resumo.innerHTML = rasgoResumoHTML(n, max);
  const obsWrap = document.getElementById('movRasgoObsWrap_'+i);
  if(obsWrap) obsWrap.style.display = n>0 ? 'block' : 'none';
}

// ── Painel do Operador (PENDENTES) ──
function opRasgoId(reqId, itemIdx){
  return (reqId+'_'+itemIdx).replace(/[^a-zA-Z0-9_-]/g,'_');
}
function setQtdRasgadaOp(reqId, itemIdx, val){
  const p = PENDENTES.find(x=>x.req===reqId); if(!p) return;
  const it = p.itens[itemIdx]; if(!it) return;
  let n = Math.max(0, parseInt(val)||0);
  it.qtdRasgada = n;
  if(n>0){
    it.rasgoApontadoPor = (USUARIO_LOGADO && USUARIO_LOGADO.nome) || 'Operador';
    it.rasgoDataHora = nowFull();
  } else {
    it.motivoRasgo = '';
  }
  salvarRequisicaoSheets(p);
  atualizarUIRasgoOp(reqId, itemIdx);
}
function updateMotivoRasgoOp(reqId, itemIdx, val){
  const p = PENDENTES.find(x=>x.req===reqId); if(!p) return;
  const it = p.itens[itemIdx]; if(!it) return;
  it.motivoRasgo = val;
  salvarRequisicaoSheets(p);
}
function atualizarUIRasgoOp(reqId, itemIdx){
  const p = PENDENTES.find(x=>x.req===reqId); if(!p) return;
  const it = p.itens[itemIdx]; if(!it) return;
  const idKey = opRasgoId(reqId, itemIdx);
  const n = it.qtdRasgada || 0;
  const max = Number(it.sacos)||0;
  const movido = it.itemStatus==='movido'||it.itemStatus==='lancado';
  const inputEl = document.getElementById('opQtdRasgada_'+idKey);
  if(inputEl){
    if(Number(inputEl.value||0) !== n) inputEl.value = n || '';
  }
  const row = document.getElementById('opRow_'+idKey);
  if(row) row.style.borderLeft = '4px solid ' + (n>0 ? 'var(--red)' : (movido ? 'var(--green)' : 'var(--accent)'));
  const badge = document.getElementById('opRasgoBadge_'+idKey);
  if(badge) badge.innerHTML = n>0 ? rasgoTagHTML(n) : '';
  const resumo = document.getElementById('opRasgoResumo_'+idKey);
  if(resumo) resumo.innerHTML = rasgoResumoHTML(n, max);
  const obsWrap = document.getElementById('opRasgoObsWrap_'+idKey);
  if(obsWrap) obsWrap.style.display = n>0 ? 'block' : 'none';
}

// [FIX-2] async para garantir await no salvamento antes de limpar estado
let _salvandoConf=false;
async function salvarConferencia() {
  if(_salvandoConf) return;
  // Validação de sessão e permissão
  if(!sessionValida()){toast('⛔ Sessão inválida. Faça login novamente.');logout(true);return;}
  const pf = perfil();
  if(!pf.podeConferir && !pf.podeAdmin) { toast('⛔ Sem permissão para salvar conferências.'); return; }

  // [FIX-3] Validação robusta: verificar existência de itens com quantidades válidas
  const codsComDados = Object.keys(CONFERENCIAS).filter(cod => {
    const c = CONFERENCIAS[cod];
    return (Number(c.pal3)||0) > 0 || (Number(c.sac3)||0) > 0 ||
           (Number(c.pal30)||0) > 0 || (Number(c.sac30)||0) > 0 ||
           (Number(c.qtdRasgada)||0) > 0 || !!c.confirmadoZero;
  });
  if(codsComDados.length === 0) {
    toast('⚠️ Preencha ao menos um item antes de salvar.');
    console.warn('[salvarConferencia] Tentativa de salvar sem itens preenchidos.');
    return;
  }

  _salvandoConf=true;
  const btnSalvarConf=document.getElementById('btnSalvarConf');
  if(btnSalvarConf){btnSalvarConf.disabled=true;btnSalvarConf.innerHTML='&#128190; Salvando...';}
  try {
  const agora = new Date();
  const dataStr = agora.toLocaleDateString('pt-BR');
  const horaStr = agora.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const num = gerarNumConferencia();
  const nomeUsuario = (USUARIO_LOGADO && USUARIO_LOGADO.nome) || '—';
  const idUsuario = (USUARIO_LOGADO && USUARIO_LOGADO.perfil) || '—';

  const cpSave = confPerm();
  // [FIX-PDF-LOCAL] Determinar o local predominante para salvar no registro
  const localSalvo = (() => {
    if(!cpSave.acessoTotal){
      if(cpSave.podeContarRejunte && !cpSave.podeContarAlmox30 && !cpSave.podeContarAlmox3) return 'Rejunte / Área Líquida';
      if(cpSave.podeContarSeparacao && !cpSave.podeContarAlmox30 && !cpSave.podeContarAlmox3) return 'Separação';
      if(cpSave.podeContarAlmox1 && !cpSave.podeContarAlmox30 && !cpSave.podeContarAlmox3) return 'Almox 1';
      if(cpSave.podeContarAlmox2 && !cpSave.podeContarAlmox30 && !cpSave.podeContarAlmox3) return 'Almox 2';
      if(cpSave.podeContarAlmox30 && !cpSave.podeContarAlmox3) return 'Almox 30';
      if(cpSave.podeContarAlmox3 && !cpSave.podeContarAlmox30) return 'Almox 3';
    }
    return 'Todos';
  })();
  const registro = {
    numero: num,
    data: dataStr,
    hora: horaStr,
    dataHora: dataStr + ' ' + horaStr,
    usuario: idUsuario,
    nomeUsuario: nomeUsuario,
    local: localSalvo,
    itens: {}
  };

  // Trabalhar sobre CÓPIA dos dados para não mutar o estado original
  codsComDados.forEach(cod => {
    const c = Object.assign({}, CONFERENCIAS[cod]);
    // Garantir inteiros válidos
    c.pal3  = parseInt(c.pal3)  || 0;
    c.sac3  = parseInt(c.sac3)  || 0;
    c.pal30 = parseInt(c.pal30) || 0;
    c.sac30 = parseInt(c.sac30) || 0;

    const invItem = CONF_ITEMS.find(i => i.cod === cod) || ITEMS.find(i => i.cod === cod);
    // Flags de localização do item — um item pode pertencer a múltiplos locais
    const itemTemAlmox3    = !!(invItem && invItem.temAlmox3);
    const itemTemAlmox30   = !!(invItem && invItem.temAlmox30);
    const itemTemRejunte   = !!(invItem && invItem.temRejunte);
    const itemTemSeparacao = !!(invItem && invItem.temSeparacao);
    const itemTemAlmox1    = !!(invItem && invItem.temAlmox1);
    const itemTemAlmox2    = !!(invItem && invItem.temAlmox2);

    console.log('[salvarConferencia] item', cod,
      '| almox3:', itemTemAlmox3, '| almox30:', itemTemAlmox30,
      '| rejunte:', itemTemRejunte, '| separacao:', itemTemSeparacao,
      '| almox1:', itemTemAlmox1, '| almox2:', itemTemAlmox2,
      '| perm:', JSON.stringify(cpSave));

    // Zerar cada bloco somente se NENHUMA categoria aplicável ao item tiver permissão.
    // [FIX] Um item pode pertencer a mais de uma categoria ao mesmo tempo (ex: Almox 3 E
    // Separação juntos) — antes, a checagem usava "if/else if" e só validava UMA categoria
    // por prioridade, ignorando que o perfil podia ter permissão por outro caminho válido.
    // Isso zerava a contagem inteira na hora de salvar mesmo com o item corretamente
    // preenchido na tela, com o erro "Nenhum item válido para salvar". Agora é uma soma
    // (OR) de todas as categorias do item, igual já funciona na hora de EXIBIR o card.
    //
    // Bloco 3 (pal3/sac3) é usado por: Almox 3, Rejunte, Separação OU Almox 1 (matéria-prima).
    // Bloco 30 (pal30/sac30) é usado por: Almox 30 OU Almox 2 (matéria-prima).

    const permBloco3 =
      (itemTemAlmox3    && cpSave.podeContarAlmox3) ||
      (itemTemRejunte   && cpSave.podeContarRejunte) ||
      (itemTemSeparacao && cpSave.podeContarSeparacao) ||
      (itemTemAlmox1    && cpSave.podeContarAlmox1);
    if(!permBloco3){ c.pal3 = 0; c.sac3 = 0; }

    const permBloco30 =
      (itemTemAlmox30 && cpSave.podeContarAlmox30) ||
      (itemTemAlmox2  && cpSave.podeContarAlmox2);
    if(!permBloco30){ c.pal30 = 0; c.sac30 = 0; }

    // Recalcular totais APÓS zerar campos não permitidos
    const spp = getSacsPorPal(cod);
    c.total3  = (c.pal3 * spp) + c.sac3;
    c.total30 = (c.pal30 * spp) + c.sac30;
    const totalGeral = c.total3 + c.total30;
    // Rasgados ficam separados fisicamente da contagem — não tem teto ligado ao total contado
    // e não é descontado dele (qtdBoa = total contado, sem subtrair)
    const qtdRasgadaSalva = Math.max(0, Number(c.qtdRasgada)||0);

    if(c.pal3 > 0 || c.sac3 > 0 || c.pal30 > 0 || c.sac30 > 0 || qtdRasgadaSalva > 0 || c.confirmadoZero) {
      registro.itens[cod] = {
        nome: invItem ? invItem.name : cod,
        almox3:  c.total3,
        almox30: c.total30,
        total:   totalGeral,
        pal3:  c.pal3,  sac3:  c.sac3,
        pal30: c.pal30, sac30: c.sac30,
        saldoSistema3:  invItem ? (invItem.saldo3  || 0) : 0,
        saldoSistema30: invItem ? (invItem.saldo30 || 0) : 0,
        dif3:  c.total3  - (invItem ? (invItem.saldo3  || 0) : 0),
        dif30: c.total30 - (invItem ? (invItem.saldo30 || 0) : 0),
        qtdRasgada: qtdRasgadaSalva,
        qtdBoa: totalGeral,
        motivoRasgo: c.motivoRasgo || '',
        rasgoApontadoPor: qtdRasgadaSalva > 0 ? (c.rasgoApontadoPor || nomeUsuario) : '',
        rasgoDataHora: qtdRasgadaSalva > 0 ? (c.rasgoDataHora || (dataStr+' '+horaStr)) : '',
        confirmadoZero: !!c.confirmadoZero
      };
    }
  });

  // [FIX-3] Validação final: impedir salvamento de objeto vazio
  if(Object.keys(registro.itens).length === 0) {
    toast('⚠️ Nenhum item válido para salvar após validação de permissões.');
    console.warn('[salvarConferencia] Nenhum item válido após validação. CONFERENCIAS:', JSON.stringify(CONFERENCIAS));
    return;
  }

  console.log('[salvarConferencia] Iniciando salvamento', registro.numero, '— itens:', Object.keys(registro.itens).length);
  toast('💾 Salvando conferência...', 2000);

  // [FIX-2] await: aguardar conclusão do salvamento antes de qualquer ação
  const ok = await salvarConferenciaSheets(registro);
  if(!ok) {
    // salvamento falhou: manter estado para o usuário tentar novamente
    toast('❌ Falha ao salvar conferência. Verifique a conexão e tente novamente.', 5000);
    console.error('[salvarConferencia] Falha no salvamento. Dados preservados para nova tentativa.');
    return;
  }

  console.log('[salvarConferencia] Salvo com sucesso:', registro.numero);
  console.log('[salvarConferencia] PDF gerado a partir de:', JSON.stringify({numero:registro.numero,itens:Object.keys(registro.itens).length,local:registro.local}));

  // [FIX-5] Limpar autosave do localStorage após confirmar salvamento
  try { localStorage.removeItem('conf_temp'); } catch(e){}

  // Adicionar ao histórico local com cópia profunda (após confirmar sucesso)
  console.log('[salvarConferencia] Registro salvo:', JSON.stringify({numero:registro.numero,data:registro.dataHora,itens:Object.keys(registro.itens).length,local:registro.local}));
  CONF_HISTORICO.unshift(JSON.parse(JSON.stringify(registro)));

  // Notificação por e-mail (NOVA FUNCIONALIDADE) — não bloqueia a UI, roda em segundo plano
  if(typeof notificarEmailSheets === 'function'){
    const temRasgo = Object.values(registro.itens).some(it => (Number(it.qtdRasgada)||0) > 0);
    notificarEmailSheets('contagem', {
      numero: registro.numero, nomeUsuario: registro.nomeUsuario, local: registro.local,
      dataHora: registro.dataHora, qtdItens: Object.keys(registro.itens).length, temRasgo
    });
  }

  // [FIX-2] Limpar estado SOMENTE após salvamento confirmado
  CONFERENCIAS = {};
  CONF_ITENS_SEL.clear();
  CONF_MODO = 'selecao';
  const selCard = document.getElementById('confSelCard');
  const painelConf = document.getElementById('confPainelConf');
  if(selCard) selCard.style.display = 'block';
  if(painelConf) painelConf.style.display = 'none';

  IS_EDITING = false;
  renderConfHistorico();
  console.log('[salvarConferencia] Histórico atualizado:', CONF_HISTORICO.length, 'conferências em memória');
  renderDivergencias();
  filtrarItensConf();
  toast('✅ Conferência ' + registro.numero + ' salva com ' + Object.keys(registro.itens).length + ' item(s)!', 3500);
  } finally {
    _salvandoConf=false;
    if(btnSalvarConf){btnSalvarConf.disabled=false;btnSalvarConf.innerHTML='&#128190; Salvar Conferência';}
  }
}

let _confHistPagina = 5;
function verMaisConfHistorico(){
  _confHistPagina += 5;
  renderConfHistorico();
}
function confHistFiltroHoje(){
  const hoje = new Date().toISOString().slice(0,10);
  const di = document.getElementById('confHistDtInicio');
  const df = document.getElementById('confHistDtFim');
  if(di) di.value = hoje;
  if(df) df.value = hoje;
  _confHistPagina = 5;
  renderConfHistorico();
}
function confHistLimparFiltros(){
  const b=document.getElementById('confHistBusca'); if(b) b.value='';
  const l=document.getElementById('confHistLocal'); if(l) l.value='';
  const r=document.getElementById('confHistRasgo'); if(r) r.value='';
  const di=document.getElementById('confHistDtInicio'); if(di) di.value='';
  const df=document.getElementById('confHistDtFim'); if(df) df.value='';
  _confHistPagina=5;
  renderConfHistorico();
}
// [FIX-HIST] Verificar se uma conferência contém item de um determinado local
function confItemPertenceLocal(conf, local){
  if(!local) return true;
  return Object.keys(conf.itens||{}).some(cod=>{
    const inv = CONF_ITEMS.find(i=>i.cod===cod)||ITEMS.find(i=>i.cod===cod);
    if(local==='almox3')  return !!(inv&&inv.temAlmox3&&!inv.temRejunte&&!inv.temSeparacao);
    if(local==='almox30') return !!(inv&&inv.temAlmox30);
    if(local==='rejunte') return !!(inv&&inv.temRejunte);
    if(local==='separacao') return !!(inv&&inv.temSeparacao);
    if(local==='almox1') return !!(inv&&inv.temAlmox1);
    if(local==='almox2') return !!(inv&&inv.temAlmox2);
    return true;
  });
}
// [FIX-HIST] Converter data pt-BR "DD/MM/AAAA" para Date para comparação
function parseDateBR(str){
  if(!str) return null;
  const parts = str.split(' ')[0].split('/');
  if(parts.length===3) return new Date(parts[2],parts[1]-1,parts[0]);
  return null;
}
function renderConfHistorico() {
  const list = document.getElementById('confHistList');
  const empty = document.getElementById('confHistEmpty');
  const contador = document.getElementById('confHistContador');
  if(!list) return;
  console.log('[renderConfHistorico] Total em memória:', CONF_HISTORICO.length);
  // [FIX] Validar registros do histórico antes de renderizar
  const historicValid = CONF_HISTORICO.filter(c=>{
    if(!c || !c.numero) return false;
    if(!c.itens || typeof c.itens !== 'object') { console.warn('[renderConfHistorico] Registro sem itens:', c.numero); return false; }
    if(Object.keys(c.itens).length === 0) { console.warn('[renderConfHistorico] Registro com itens vazios:', c.numero); return false; }
    return true;
  });
  if(historicValid.length === 0) {
    empty.style.display = 'block';
    list.innerHTML = '';
    if(contador) contador.textContent='';
    return;
  }
    empty.style.display = 'none';
  list.innerHTML = '';

  // Leitura dos filtros da UI
  const busca = ((document.getElementById('confHistBusca')||{}).value||'').toLowerCase().trim();
  const localFiltro = (document.getElementById('confHistLocal')||{}).value||'';
  const dtInicioStr = (document.getElementById('confHistDtInicio')||{}).value||'';
  const dtFimStr = (document.getElementById('confHistDtFim')||{}).value||'';
  const dtInicio = dtInicioStr ? new Date(dtInicioStr) : null;
  const dtFim   = dtFimStr   ? new Date(dtFimStr+'T23:59:59') : null;
  const rasgoFiltro = (document.getElementById('confHistRasgo')||{}).value||'';

  // Correção 2: filtrar histórico por permissão de almoxarifado do conferente logado
  const cpHistFiltro = confPerm();
  const nomeLogado = (USUARIO_LOGADO && USUARIO_LOGADO.nome) || '';
  let confHistFiltrado = historicValid;
  if(!cpHistFiltro.acessoTotal) {
    confHistFiltrado = historicValid.filter(conf => {
      // Sempre exibe conferências realizadas pelo próprio usuário
      if(conf.nomeUsuario === nomeLogado || conf.usuario === nomeLogado) return true;
      // Verifica se a conferência contém ao menos um item do almoxarifado autorizado
      return Object.keys(conf.itens).some(cod => {
        const invItemF = CONF_ITEMS.find(i => i.cod === cod) || ITEMS.find(i => i.cod === cod);
        const isRejF  = !!(invItemF && invItemF.temRejunte);
        const is30F   = !!(invItemF && invItemF.temAlmox30 && !invItemF.temAlmox3);
        const isSepF  = !!(invItemF && invItemF.temSeparacao);
        const isA1F   = !!(invItemF && invItemF.temAlmox1);
        const isA2F   = !!(invItemF && invItemF.temAlmox2);
        if(cpHistFiltro.podeContarRejunte   && isRejF) return true;
        if(cpHistFiltro.podeContarSeparacao && isSepF) return true;
        if(cpHistFiltro.podeContarAlmox1    && isA1F) return true;
        if(cpHistFiltro.podeContarAlmox2    && isA2F) return true;
        if(cpHistFiltro.podeContarAlmox30   && is30F) return true;
        if(cpHistFiltro.podeContarAlmox3    && !isRejF && !is30F && !isSepF && !isA1F && !isA2F) return true;
        return false;
      });
    });
  }

  console.log('[renderConfHistorico] Após filtro de permissão:', confHistFiltrado.length, 'de', CONF_HISTORICO.length);

  // [FIX-HIST] Aplicar filtros de busca, local e data
  if(busca){
    confHistFiltrado = confHistFiltrado.filter(conf =>
      (conf.numero||'').toLowerCase().includes(busca) ||
      (conf.nomeUsuario||'').toLowerCase().includes(busca) ||
      (conf.usuario||'').toLowerCase().includes(busca) ||
      Object.keys(conf.itens||{}).some(cod=>cod.toLowerCase().includes(busca)) ||
      Object.values(conf.itens||{}).some(it=>(it.nome||'').toLowerCase().includes(busca))
    );
  }
  if(localFiltro){
    confHistFiltrado = confHistFiltrado.filter(conf => confItemPertenceLocal(conf, localFiltro));
  }
  if(dtInicio || dtFim){
    confHistFiltrado = confHistFiltrado.filter(conf => {
      const dt = parseDateBR(conf.data || conf.dataHora);
      if(!dt) return true; // sem data: não filtrar
      if(dtInicio && dt < dtInicio) return false;
      if(dtFim   && dt > dtFim)    return false;
      return true;
    });
  }
  if(rasgoFiltro){
    confHistFiltrado = confHistFiltrado.filter(conf => {
      const temRasgado = Object.values(conf.itens||{}).some(it=>(Number(it.qtdRasgada)||0)>0);
      return rasgoFiltro === 'rasgados' ? temRasgado : !temRasgado;
    });
  }

  if(contador) contador.textContent = confHistFiltrado.length + ' conferência(s)' + (busca||localFiltro||dtInicio||dtFim||rasgoFiltro?' (filtrado)':'');

  if(confHistFiltrado.length === 0) {
    empty.style.display = 'block';
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3);font-size:11px">Nenhuma conferência encontrada para os filtros aplicados.</div>';
    return;
  }
  empty.style.display = 'none';

  const visiveis = confHistFiltrado.slice(0, _confHistPagina);
  visiveis.forEach((conf, i) => {
    const qtdItens = Object.keys(conf.itens).length;
    // ITEM 9: contador de divergências removido do histórico

    const div = document.createElement('div');
    div.style.cssText = 'background:#fff;border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;cursor:pointer;transition:all 0.2s;';
    div.onclick = (e) => {
      if(e.target.tagName === 'BUTTON') return;
      const content = div.querySelector('.conf-detail-content');
      if(content) {
        const isHidden = content.style.display === 'none';
        content.style.display = isHidden ? 'block' : 'none';
        div.style.borderColor = isHidden ? 'var(--accent-mid)' : 'var(--border)';
        div.style.background = isHidden ? 'var(--accent-dim)' : '#fff';
      }
    };

    // Item 6: Linha resumo dos itens — ocultar locais sem permissão
    const cpHist = confPerm();
    const podeAuditarHist = podeAuditarEstoque();
    let itensHtml = '';
    Object.entries(conf.itens).forEach(([cod, it]) => {
      const invItemH = CONF_ITEMS.find(i => i.cod === cod) || ITEMS.find(i => i.cod === cod);
      const isRejH  = !!(invItemH && invItemH.temRejunte);
      const isSepH  = !!(invItemH && invItemH.temSeparacao);
      const isA1H   = !!(invItemH && invItemH.temAlmox1);
      const isA2H   = !!(invItemH && invItemH.temAlmox2);
      const is30H   = !!(invItemH && invItemH.temAlmox30 && !invItemH.temAlmox3);
      const isA3H   = !!(invItemH && invItemH.temAlmox3);
      // [FIX] Um item pode pertencer a mais de uma categoria ao mesmo tempo (ex: Almox 3 E
      // Separação juntos) — antes era um "if/else if" que só validava UMA categoria por
      // prioridade e podia esconder o item do próprio histórico de quem o contou.
      // Bloco 3 = Rejunte/Separação/Almox1/Almox3-regular · Bloco 30 = Almox2/Almox30-regular
      // (cada categoria aplicável é verificada independente, com OR entre elas)
      const podeVerRejH   = isRejH && (cpHist.acessoTotal || cpHist.podeContarRejunte);
      const podeVerSepH   = isSepH && (cpHist.acessoTotal || cpHist.podeContarSeparacao);
      const podeVerA1H    = isA1H  && (cpHist.acessoTotal || cpHist.podeContarAlmox1);
      const podeVerA3H    = isA3H  && !is30H && (cpHist.acessoTotal || cpHist.podeContarAlmox3);
      const podeVerA2H    = isA2H  && (cpHist.acessoTotal || cpHist.podeContarAlmox2);
      const podeVerA30H   = !isRejH && !isSepH && !isA1H && (cpHist.acessoTotal || cpHist.podeContarAlmox30);
      const mostrar3H  = podeVerRejH || podeVerSepH || podeVerA1H || podeVerA3H;
      const mostrar30H = podeVerA2H || podeVerA30H;
      if(!mostrar3H && !mostrar30H) return; // ocultar item inteiro se sem permissão
      const lblH3   = podeVerRejH ? 'Rejunte' : podeVerSepH ? 'Separação' : podeVerA1H ? 'Almox 1' : 'Almox 3';
      const cor3H   = podeVerRejH ? 'var(--purple,#7B5EA7)' : podeVerSepH ? 'var(--orange,#E07B39)' : podeVerA1H ? 'var(--orange,#E07B39)' : 'var(--accent)';
      const lblH30  = podeVerA2H ? 'Almox 2' : 'Almox 30';
      const cor30H  = podeVerA2H ? 'var(--purple,#7B5EA7)' : 'var(--green)';
      const qtdRasgH = Number(it.qtdRasgada)||0;

      // Linha de auditoria por local (Almox 3/Rejunte/Separação e Almox 30), cada uma com seu próprio status
      const linhaAuditoria = (local, saldoFisico) => {
        const status = getAuditStatus(conf.numero, cod, local);
        const key = getAuditKey(conf.numero, cod, local);
        return `<span style="display:inline-flex;align-items:center;gap:4px">
          ${auditStatusBadgeHTML(status)}
          ${podeAuditarHist ? `<button class="btn" style="height:22px;padding:0 8px;font-size:9px" onclick="abrirValidarSaldo('${conf.numero}','${cod}','${local}')" title="Validar saldo — ${local}">✔ Validar Saldo</button>` : ''}
        </span>`;
      };

      itensHtml += `<div style="padding:6px 8px;background:${qtdRasgH>0?'var(--red-dim)':'var(--bg3)'};border:${qtdRasgH>0?'1px solid var(--red-mid)':'none'};border-radius:5px;font-size:10px;margin-bottom:3px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;flex-wrap:wrap">
          <span style="font-weight:700;color:var(--text)">${cod}</span>
          <span style="color:var(--text2);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${it.nome || ''}</span>
          ${it.confirmadoZero ? `<span class="status-badge" style="background:var(--bg4);color:var(--text2)">Contagem zero confirmada</span>` : ''}
          ${qtdRasgH>0 ? rasgoTagHTML(qtdRasgH) : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          ${mostrar3H ? `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="color:${cor3H}">📍 ${lblH3}: <b>${qtdComConversaoTexto(invItemH, it.almox3, isRejH?'fardo':'sc')}</b></span>${linhaAuditoria(lblH3, it.almox3)}</div>` : ''}
          ${mostrar30H ? `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="color:${cor30H}">📍 ${lblH30}: <b>${qtdComConversaoTexto(invItemH, it.almox30, 'sc')}</b></span>${linhaAuditoria(lblH30, it.almox30)}</div>` : ''}
        </div>
        ${qtdRasgH>0 ? `<div style="margin-top:4px;font-size:10px;font-weight:700">${rasgoResumoHTML(qtdRasgH, it.total)}</div>` : ''}
        ${qtdRasgH>0 ? `<div style="margin-top:2px;color:var(--text3);font-size:9px">👤 ${escapeHTML(it.rasgoApontadoPor||'—')} · 🕐 ${it.rasgoDataHora||'—'}</div>` : ''}
        ${qtdRasgH>0 && it.motivoRasgo ? `<div style="margin-top:2px;color:var(--red);font-size:10px">📝 ${escapeHTML(it.motivoRasgo)}</div>` : ''}
      </div>`;
    });

    const resumoAud = getAuditoriaResumoConferencia(conf);
    const painelAuditoriaHTML = resumoAud.total > 0 ? `
      <div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 12px;margin-bottom:10px">
        <div style="font-size:10px;font-weight:800;color:var(--text2);text-transform:uppercase;letter-spacing:.03em;margin-bottom:6px">⚖️ Auditoria da Conferência</div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;font-size:10px;color:var(--text2);margin-bottom:8px">
          <span>Almoxarifado: <b>${conf.local || '—'}</b></span>
          <span>Data: <b>${conf.data || ''}</b></span>
          <span>Total de itens: <b>${resumoAud.total}</b></span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;font-size:10px;font-weight:700;margin-bottom:8px">
          <span style="color:var(--green)">🟢 Auditados: ${resumoAud.validados}</span>
          <span style="color:var(--text3)">⚪ Pendentes: ${resumoAud.pendentes}</span>
          <span style="color:var(--red)">🔴 Em Investigação: ${resumoAud.emInvestigacao}</span>
          <span style="color:var(--accent)">🔵 Resolvidas: ${resumoAud.resolvidas}</span>
        </div>
        <div style="background:var(--border);border-radius:20px;height:8px;overflow:hidden">
          <div style="background:${resumoAud.concluida?'var(--green)':'var(--accent)'};height:100%;width:${resumoAud.percentual}%;transition:width .3s"></div>
        </div>
        <div style="text-align:right;font-size:10px;font-weight:700;color:var(--text2);margin-top:3px">${resumoAud.percentual}%${resumoAud.concluida?' — Auditoria concluída ✔':''}</div>
      </div>` : '';

    div.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:4px">
        <div style="display:flex;align-items:flex-start;gap:6px;flex-wrap:wrap;margin-bottom:4px">
          <span style="font-weight:700;font-size:12px;color:var(--accent)">${conf.numero}</span>
          ${conf.local ? `<span style="font-size:10px;background:var(--accent-dim);color:var(--accent);border-radius:4px;padding:1px 7px;font-weight:700">📍 ${conf.local}</span>` : ''}
          ${(()=>{const tot=Object.values(conf.itens||{}).reduce((a,it)=>a+(Number(it.qtdRasgada)||0),0);return tot>0?rasgoTagHTML(tot):'';})()}
          ${typeof podeAuditarEstoque === 'function' && podeAuditarEstoque() ? `<button class="btn" style="height:24px;padding:0 10px;font-size:10px;margin-left:auto" onclick="event.stopPropagation();abrirAuditoriaPorConferencia('${conf.numero}')">⚖️ Abrir Auditoria</button>` : ''}
          <button class="btn btn-purple" style="height:24px;padding:0 10px;font-size:10px;${typeof podeAuditarEstoque === 'function' && podeAuditarEstoque() ? '' : 'margin-left:auto'}" onclick="gerarPDFConferencia('${conf.numero}')">📄 Gerar PDF</button>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end">
          <div style="font-size:10px;color:var(--text3);line-height:1.4">
            📅 <b>${conf.data||conf.dataHora}</b> &nbsp;·&nbsp; 🕐 <b>${conf.hora||''}</b><br>
            👤 <b>${conf.nomeUsuario||conf.usuario}</b> &nbsp;·&nbsp; 📦 <b>${qtdItens} item(s)</b>
          </div>
          <div style="font-size:10px;color:var(--accent);font-weight:700">Clique para expandir ▾</div>
        </div>
      </div>
      <div class="conf-detail-content" style="display:none;margin-top:10px;border-top:1px solid var(--border);padding-top:10px">
        ${painelAuditoriaHTML}
        ${qtdItens > 0 ? `<div style="display:flex;flex-direction:column;gap:4px">${itensHtml}</div>` : ''}
      </div>
    `;
    list.appendChild(div);
  });

  if(confHistFiltrado.length > _confHistPagina){
    const btnMais = document.createElement('button');
    btnMais.className = 'btn';
    btnMais.style.cssText = 'width:100%;margin-top:8px;font-size:11px';
    btnMais.textContent = '↓ Ver mais (' + (confHistFiltrado.length - _confHistPagina) + ' restantes)';
    btnMais.onclick = verMaisConfHistorico;
    list.appendChild(btnMais);
  }
}
