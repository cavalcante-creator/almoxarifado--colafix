// ===== Recebimento de Material: log simples de entrada de estoque (Conferente) =====
// ─── RECEBIMENTO DE MATERIAL (NOVA FUNCIONALIDADE) ──────────────────
// Fluxo simples e independente da Conferência/Auditoria: o Conferente busca
// um item, informa a quantidade recebida e a data, e salva. Vira um log de
// entrada — sem comparação com nota fiscal nem aprovação, exatamente como
// pedido. Reaproveita a busca de item já usada em outras telas.

let _recebItemSelecionado = null;
let _confModoAtual = 'contagem';

// Alterna entre a tela de Contagem (conferência normal) e a de Recebimento —
// as duas ficam em blocos totalmente separados, nunca aparecem juntas.
function confMudarModo(modo){
  _confModoAtual = modo;
  const wrapContagem = document.getElementById('confModoContagemWrap');
  const wrapReceb = document.getElementById('confModoRecebimentoWrap');
  const pgConf = document.getElementById('pg-conferencia');
  const pgDiv = document.getElementById('pg-divergencias');
  const btnContagem = document.getElementById('btnModoContagem');
  const btnReceb = document.getElementById('btnModoRecebimento');
  const btnAudit = document.getElementById('btnModoAuditoria');
  [btnContagem, btnReceb, btnAudit].forEach(b => { if(b) b.classList.remove('active'); });

  if(modo === 'auditoria'){
    if(pgConf) pgConf.classList.remove('active');
    if(pgDiv) pgDiv.classList.add('active');
    if(btnAudit) btnAudit.classList.add('active');
    renderDivergencias();
    if(typeof renderFiltrosRapidosAuditItem === 'function') renderFiltrosRapidosAuditItem();
    renderDivHistorico();
    return;
  }

  if(pgDiv) pgDiv.classList.remove('active');
  if(pgConf) pgConf.classList.add('active');

  if(modo === 'recebimento'){
    if(wrapContagem) wrapContagem.style.display = 'none';
    if(wrapReceb) wrapReceb.style.display = 'block';
    if(btnReceb) btnReceb.classList.add('active');
    if(typeof renderRecebimentos === 'function') renderRecebimentos();
  } else {
    if(wrapContagem) wrapContagem.style.display = 'block';
    if(wrapReceb) wrapReceb.style.display = 'none';
    if(btnContagem) btnContagem.classList.add('active');
    // [FIX] Estas chamadas antes só aconteciam dentro do showPage('pg-conferencia', ...) —
    // como a troca de Contagem/Recebimento/Auditoria não passa mais por showPage(), a lista
    // de itens, os filtros rápidos e o histórico nunca eram carregados ao abrir o app.
    if(CONF_MODO !== 'conferencia'){
      CONF_MODO = 'selecao';
      const sc = document.getElementById('confSelCard');
      const pc = document.getElementById('confPainelConf');
      if(sc) sc.style.display = 'block';
      if(pc) pc.style.display = 'none';
    }
    atualizarSelectsConferencia();
    renderFiltrosRapidosConf();
    filtrarItensConf();
    renderConfHistorico();
  }
}

// Alterna entre os dois grupos principais do topo: Conferência (Contagem/Recebimento/
// Auditoria) e Transferências (Estoque/Pendências/Histórico/Expedição).
let _transfModoAtual = 'pg-estoque';
function mudarGrupoNav(grupo){
  const btnConf = document.getElementById('tab-conf-group');
  const btnTransf = document.getElementById('tab-transf-group');
  const subConf = document.getElementById('subnavConferencia');
  const subTransf = document.getElementById('subnavTransferencias');
  if(grupo === 'conferencia'){
    btnConf.classList.add('active');
    btnTransf.classList.remove('active');
    if(subConf) subConf.style.display = 'flex';
    if(subTransf) subTransf.style.display = 'none';
    document.querySelectorAll('#subnavTransferencias button').forEach(b=>b.classList.remove('active'));
    document.getElementById('pg-estoque').classList.remove('active');
    document.getElementById('pg-pendencias').classList.remove('active');
    document.getElementById('pg-hist').classList.remove('active');
    document.getElementById('pg-expedicao').classList.remove('active');
    confMudarModo(_confModoAtual || 'contagem');
  } else {
    btnTransf.classList.add('active');
    btnConf.classList.remove('active');
    if(subTransf) subTransf.style.display = 'flex';
    if(subConf) subConf.style.display = 'none';
    document.getElementById('pg-conferencia').classList.remove('active');
    document.getElementById('pg-divergencias').classList.remove('active');
    const btnAlvo = document.querySelector('#subnavTransferencias button[data-page="'+(_transfModoAtual||'pg-estoque')+'"]');
    mudarSubTransf(_transfModoAtual || 'pg-estoque', btnAlvo);
  }
}
// Troca de seção dentro do grupo Transferências, reaproveitando showPage() por completo
// (mantém todos os renders que já disparavam por página, só adiciona o destaque visual do botão)
function mudarSubTransf(pageId, btnEl){
  _transfModoAtual = pageId;
  showPage(pageId, document.getElementById('tab-transf-group'));
  document.querySelectorAll('#subnavTransferencias button').forEach(b=>b.classList.remove('active'));
  if(btnEl) btnEl.classList.add('active');
}

function buscarItemRecebimento(termo){
  const wrap = document.getElementById('recebResultados');
  const box = wrap ? wrap.querySelector('div') : null;
  if(!wrap || !box) return;
  const q = (termo||'').trim().toLowerCase();
  if(q.length < 2){ wrap.style.display = 'none'; box.innerHTML=''; return; }

  const base = (CONF_ITEMS && CONF_ITEMS.length ? CONF_ITEMS : ITEMS) || [];
  const encontrados = base.filter(it =>
    itemPermitidoParaContagem(it) &&
    (it.cod.toLowerCase().includes(q) || (it.name||'').toLowerCase().includes(q))
  ).slice(0, 8);

  if(encontrados.length === 0){
    box.innerHTML = '<div style="padding:10px 12px;font-size:11px;color:var(--text3)">Nenhum item encontrado</div>';
    wrap.style.display = 'block';
    return;
  }
  box.innerHTML = encontrados.map(it => `
    <div onclick="selecionarItemRecebimento('${it.cod}')" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border);font-size:11px" onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background='#fff'">
      <b>${escapeHTML(it.cod)}</b> — ${escapeHTML(it.name||'')}
    </div>`).join('');
  wrap.style.display = 'block';
}

function selecionarItemRecebimento(cod){
  const base = (CONF_ITEMS && CONF_ITEMS.length ? CONF_ITEMS : ITEMS) || [];
  const item = base.find(i => i.cod === cod);
  if(!item) return;
  if(!itemPermitidoParaContagem(item)){ toast('⛔ Você não tem permissão para esse item.'); return; }
  _recebItemSelecionado = item;

  const buscaEl = document.getElementById('recebBuscaItem');
  if(buscaEl) buscaEl.value = '';
  const wrap = document.getElementById('recebResultados');
  if(wrap) wrap.style.display = 'none';

  const sel = document.getElementById('recebItemSelecionado');
  if(sel){
    sel.style.display = 'block';
    sel.innerHTML = `📦 <b>${escapeHTML(item.cod)}</b> — ${escapeHTML(item.name||'')} <button class="btn" style="height:20px;padding:0 6px;font-size:9px;margin-left:8px" onclick="limparItemRecebimento()">✕ trocar</button>`;
  }
}

function limparItemRecebimento(){
  _recebItemSelecionado = null;
  const sel = document.getElementById('recebItemSelecionado');
  if(sel){ sel.style.display = 'none'; sel.innerHTML = ''; }
}

function salvarRecebimento(){
  if(!podeRegistrarRecebimento()){ toast('⛔ Você não tem permissão para registrar recebimento.'); return; }
  if(!_recebItemSelecionado){ toast('⚠️ Selecione um item antes de salvar.'); return; }
  const qtdEl = document.getElementById('recebQtd');
  const dataEl = document.getElementById('recebData');
  const obsEl = document.getElementById('recebObs');

  const qtd = Math.max(0, parseInt(qtdEl.value)||0);
  if(qtd <= 0){ toast('⚠️ Informe uma quantidade recebida maior que zero.'); return; }

  const item = _recebItemSelecionado;
  const dataInformada = dataEl.value ? formatarDataBRparaFiltro(dataEl.value) : (new Date()).toLocaleDateString('pt-BR');
  const nome = (USUARIO_LOGADO && USUARIO_LOGADO.nome) || '—';
  const usuario = (USUARIO_LOGADO && USUARIO_LOGADO.usuario) || '—';

  const registro = {
    id: 'REC-' + Date.now() + '-' + Math.floor(Math.random()*1000),
    cod: item.cod,
    nome: item.name || '',
    quantidade: qtd,
    unidade: temUnidadePropria(item) && !temConversaoBulk(item) ? item.unidade : (item.temRejunte ? 'fardo' : 'sc'),
    data: dataInformada,
    dataHora: dataInformada + ' ' + (new Date()).toLocaleTimeString('pt-BR'),
    usuario, nomeUsuario: nome,
    observacao: (obsEl.value||'').trim()
  };

  RECEBIMENTOS.unshift(registro);
  salvarRecebimentosLocal();
  salvarRecebimentoSheets(registro); // sincroniza com o Sheets em segundo plano, não bloqueia a UI

  // Notificação por e-mail (NOVA FUNCIONALIDADE) — não bloqueia a UI, roda em segundo plano
  if(typeof notificarEmailSheets === 'function'){
    notificarEmailSheets('recebimento', {
      cod: registro.cod, nome: registro.nome, quantidade: registro.quantidade, unidade: registro.unidade,
      nomeUsuario: registro.nomeUsuario, data: registro.data, observacao: registro.observacao
    });
  }

  toast('✅ Recebimento registrado: ' + qtd + ' ' + registro.unidade + ' de ' + item.cod);

  // Reset do formulário
  limparItemRecebimento();
  qtdEl.value = '';
  obsEl.value = '';
  dataEl.value = '';

  renderRecebimentos();
}

let _recebItemExpandido = null; // id do recebimento atualmente expandido
let _recebFiltroApontado = 'todos'; // todos | pendentes | apontados

function recebFiltroHoje(){
  const hoje = new Date().toISOString().slice(0,10);
  const i = document.getElementById('recebFiltroDtIni'); if(i) i.value = hoje;
  const f = document.getElementById('recebFiltroDtFim'); if(f) f.value = hoje;
  renderRecebimentos();
}
function recebLimparFiltros(){
  const b = document.getElementById('recebFiltroBusca'); if(b) b.value = '';
  const i = document.getElementById('recebFiltroDtIni'); if(i) i.value = '';
  const f = document.getElementById('recebFiltroDtFim'); if(f) f.value = '';
  _recebFiltroApontado = 'todos';
  renderRecebimentos();
}
function recebToggleFiltroApontado(){
  _recebFiltroApontado = _recebFiltroApontado==='todos' ? 'pendentes' : _recebFiltroApontado==='pendentes' ? 'apontados' : 'todos';
  const btn = document.getElementById('recebFiltroApontBtn');
  if(btn){
    btn.textContent = _recebFiltroApontado==='todos' ? 'Todos' : _recebFiltroApontado==='pendentes' ? '⏳ Não apontados' : '✔ Apontados';
    btn.style.background = _recebFiltroApontado==='todos' ? '' : 'var(--accent)';
    btn.style.color = _recebFiltroApontado==='todos' ? '' : '#fff';
    btn.style.borderColor = _recebFiltroApontado==='todos' ? '' : 'var(--accent)';
  }
  renderRecebimentos();
}
function toggleRecebItem(id){
  _recebItemExpandido = (_recebItemExpandido === id) ? null : id;
  renderRecebimentos();
}

// Marca um recebimento como "apontado" (conferido/lançado no sistema) — só quem
// tem a mesma permissão de auditar estoque (Supervisor Sistema/Admin) pode confirmar.
// Reaproveita a mesma rota de salvamento do Sheets (upsert pelo id).
function marcarRecebimentoApontado(id){
  if(!podeAuditarEstoque()){ toast('⛔ Você não tem permissão para apontar recebimentos.'); return; }
  const r = RECEBIMENTOS.find(x=>x.id===id);
  if(!r) return;
  r.apontado = true;
  r.apontadoPor = (USUARIO_LOGADO && USUARIO_LOGADO.nome) || '—';
  r.apontadoDataHora = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR');
  salvarRecebimentosLocal();
  salvarRecebimentoSheets(r); // upsert pelo id — atualiza a mesma linha no Sheets
  toast('✔ Recebimento marcado como apontado');
  renderRecebimentos();
}
function desmarcarRecebimentoApontado(id){
  if(!podeAuditarEstoque()) return;
  const r = RECEBIMENTOS.find(x=>x.id===id);
  if(!r) return;
  r.apontado = false; r.apontadoPor = ''; r.apontadoDataHora = '';
  salvarRecebimentosLocal();
  salvarRecebimentoSheets(r);
  toast('Apontamento desfeito');
  renderRecebimentos();
}

function renderRecebimentos(){
  const cont = document.getElementById('recebHistorico');
  const empty = document.getElementById('recebHistoricoEmpty');
  if(!cont) return;

  if(!RECEBIMENTOS || RECEBIMENTOS.length === 0){
    cont.innerHTML = '';
    if(empty) empty.style.display = 'block';
    return;
  }

  const busca = ((document.getElementById('recebFiltroBusca')||{}).value||'').trim().toLowerCase();
  const dtIniV = (document.getElementById('recebFiltroDtIni')||{}).value || '';
  const dtFimV = (document.getElementById('recebFiltroDtFim')||{}).value || '';
  const dtIni = dtIniV ? new Date(dtIniV+'T00:00:00').getTime() : null;
  const dtFim = dtFimV ? new Date(dtFimV+'T23:59:59').getTime() : null;

  const filtrados = RECEBIMENTOS.filter(r => {
    if(busca){
      const alvo = (r.cod+' '+(r.nome||'')+' '+(r.nomeUsuario||'')).toLowerCase();
      if(!alvo.includes(busca)) return false;
    }
    if(dtIni || dtFim){
      const t = _parseDataHoraBR(r.dataHora || r.data || '');
      if(dtIni && t < dtIni) return false;
      if(dtFim && t > dtFim) return false;
    }
    if(_recebFiltroApontado==='pendentes' && r.apontado) return false;
    if(_recebFiltroApontado==='apontados' && !r.apontado) return false;
    return true;
  });

  if(filtrados.length === 0){
    cont.innerHTML = '<div style="text-align:center;padding:16px 0;color:var(--text3);font-size:11px">Nenhum recebimento para esse filtro</div>';
    if(empty) empty.style.display = 'none';
    return;
  }
  if(empty) empty.style.display = 'none';

  const podeApontar = podeAuditarEstoque();

  cont.innerHTML = filtrados.map(r => {
    const expandido = _recebItemExpandido === r.id;
    const statusBadge = r.apontado
      ? `<span class="status-badge" style="background:var(--green-dim);color:var(--green)">✔ Apontado</span>`
      : `<span class="status-badge" style="background:var(--yellow-dim);color:var(--yellow)">⏳ Não apontado</span>`;

    let detalhe = '';
    if(expandido){
      detalhe = `
        <div style="border-top:1px solid var(--bg4);margin-top:8px;padding-top:8px;font-size:11px;color:var(--text2);display:flex;flex-direction:column;gap:4px">
          <div>Registrado por <b>${escapeHTML(r.nomeUsuario||'—')}</b> em ${r.dataHora||r.data}</div>
          ${r.observacao ? `<div>Observação: ${escapeHTML(r.observacao)}</div>` : ''}
          ${r.apontado
            ? `<div style="color:var(--green)">Apontado por <b>${escapeHTML(r.apontadoPor||'—')}</b> em ${r.apontadoDataHora||'—'}
                 ${podeApontar ? ` — <span style="color:var(--accent);cursor:pointer;font-weight:700" onclick="event.stopPropagation();desmarcarRecebimentoApontado('${r.id}')">desfazer</span>` : ''}</div>`
            : podeApontar
              ? `<button class="btn btn-primary" style="height:26px;padding:0 12px;font-size:11px;align-self:flex-start" onclick="event.stopPropagation();marcarRecebimentoApontado('${r.id}')">✔ Marcar como apontado</button>`
              : `<div style="color:var(--text3)">Aguardando confirmação do Supervisor Sistema</div>`
          }
        </div>`;
    }

    return `
      <div style="border-bottom:1px solid var(--bg4);padding:10px 4px;cursor:pointer${expandido?';background:var(--bg3)':''}" onclick="toggleRecebItem('${r.id}')">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
          <div style="min-width:0">
            <b>${escapeHTML(r.cod)}</b> <span style="color:var(--text2);font-size:11px">${escapeHTML(r.nome||'')}</span>
          </div>
          <div style="text-align:right;flex-shrink:0;display:flex;align-items:center;gap:8px">
            ${statusBadge}
            <div>
              <div style="font-weight:700;color:var(--green);font-size:12px">+${r.quantidade} ${escapeHTML(r.unidade||'')}</div>
              <div style="color:var(--text3);font-size:9px">${r.data}</div>
            </div>
          </div>
        </div>
        ${detalhe}
      </div>`;
  }).join('');
}

// Aplica a visibilidade de toda a navegação nova (2 grupos + sub-abas) conforme
// as permissões do perfil logado, e decide onde a pessoa cai ao entrar.
function aplicarVisibilidadeNavGrupos(){
  if(typeof atualizarBadgeInvestigacoes === 'function') atualizarBadgeInvestigacoes();
  const p = perfil();
  const abas = p.abas || [];
  const temConf   = abas.includes('pg-conferencia');
  const temAudit  = abas.includes('pg-divergencias');
  const temEstoque= abas.includes('pg-estoque');
  const temPend   = abas.includes('pg-pendencias');
  const temHist   = abas.includes('pg-hist');
  const temExped  = abas.includes('pg-expedicao');
  const temReceb  = temConf && podeRegistrarRecebimento();

  const set = (id, visivel) => { const el = document.getElementById(id); if(el) el.style.display = visivel ? '' : 'none'; };

  set('tab-conf-group', temConf || temAudit);
  set('tab-transf-group', temEstoque || temPend || temHist || temExped);
  set('btnModoContagem', temConf);
  set('btnModoRecebimento', temReceb);
  set('btnModoAuditoria', temAudit);
  set('btnSubEstoque', temEstoque);
  set('btnSubPend', temPend);
  set('btnSubHist', temHist);
  set('btnSubExped', temExped);

  // Se o modo/seção atual não é mais válido pro perfil (ex: perdeu permissão), cai pro primeiro disponível
  if(_confModoAtual === 'recebimento' && !temReceb) _confModoAtual = 'contagem';
  if(_confModoAtual === 'auditoria' && !temAudit) _confModoAtual = 'contagem';
  if(_confModoAtual === 'contagem' && !temConf && temAudit) _confModoAtual = 'auditoria';
  if(!_confModoAtual) _confModoAtual = temConf ? 'contagem' : (temAudit ? 'auditoria' : 'contagem');

  if(!temEstoque || !['pg-estoque','pg-pendencias','pg-hist','pg-expedicao'].includes(_transfModoAtual)
     || (_transfModoAtual==='pg-estoque' && !temEstoque)
     || (_transfModoAtual==='pg-pendencias' && !temPend)
     || (_transfModoAtual==='pg-hist' && !temHist)
     || (_transfModoAtual==='pg-expedicao' && !temExped)){
    _transfModoAtual = temEstoque ? 'pg-estoque' : temPend ? 'pg-pendencias' : temHist ? 'pg-hist' : temExped ? 'pg-expedicao' : 'pg-estoque';
  }

  const dataEl = document.getElementById('recebData');
  if(dataEl && !dataEl.value) dataEl.value = new Date().toISOString().slice(0,10);

  // Decide o grupo inicial ao entrar: prioriza Conferência se o perfil tiver acesso a ela ou à Auditoria
  mudarGrupoNav((temConf || temAudit) ? 'conferencia' : 'transferencias');
}
