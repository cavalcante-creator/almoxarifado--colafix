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
  const btnContagem = document.getElementById('btnModoContagem');
  const btnReceb = document.getElementById('btnModoRecebimento');
  const ativo = { background:'var(--accent)', color:'#fff', borderColor:'var(--accent)' };
  const inativo = { background:'', color:'', borderColor:'' };
  if(modo === 'recebimento'){
    if(wrapContagem) wrapContagem.style.display = 'none';
    if(wrapReceb) wrapReceb.style.display = 'block';
    if(btnContagem) Object.assign(btnContagem.style, inativo);
    if(btnReceb) Object.assign(btnReceb.style, ativo);
  } else {
    if(wrapContagem) wrapContagem.style.display = 'block';
    if(wrapReceb) wrapReceb.style.display = 'none';
    if(btnContagem) Object.assign(btnContagem.style, ativo);
    if(btnReceb) Object.assign(btnReceb.style, inativo);
  }
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

  toast('✅ Recebimento registrado: ' + qtd + ' ' + registro.unidade + ' de ' + item.cod);

  // Reset do formulário
  limparItemRecebimento();
  qtdEl.value = '';
  obsEl.value = '';
  dataEl.value = '';

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
  if(empty) empty.style.display = 'none';

  cont.innerHTML = RECEBIMENTOS.slice(0, 15).map(r => `
    <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg3);border-radius:6px;padding:8px 10px;font-size:11px">
      <div>
        <b>${escapeHTML(r.cod)}</b> — ${escapeHTML(r.nome||'')}
        ${r.observacao ? `<br><span style="color:var(--text3);font-size:10px">📝 ${escapeHTML(r.observacao)}</span>` : ''}
      </div>
      <div style="text-align:right;flex-shrink:0;margin-left:10px">
        <div style="font-weight:700;color:var(--green)">+${r.quantidade} ${escapeHTML(r.unidade||'')}</div>
        <div style="color:var(--text3);font-size:9px">${r.data} · ${escapeHTML(r.nomeUsuario||'')}</div>
      </div>
    </div>`).join('');
}

// Aplica a visibilidade da aba "Recebimento" conforme a permissão do perfil logado
function aplicarVisibilidadeRecebimento(){
  const btnReceb = document.getElementById('btnModoRecebimento');
  const pode = podeRegistrarRecebimento();
  if(btnReceb) btnReceb.style.display = pode ? '' : 'none';
  if(!pode && _confModoAtual === 'recebimento') confMudarModo('contagem');
  const dataEl = document.getElementById('recebData');
  if(dataEl && !dataEl.value) dataEl.value = new Date().toISOString().slice(0,10);
}
