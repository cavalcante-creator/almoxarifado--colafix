// ===== Aba Auditoria de Estoque: validação de saldo pós-conferência (Supervisor Sistema) =====
// ─── AUDITORIA DE ESTOQUE ────────────────────────────────────────────
// [SUBSTITUI o antigo módulo "Divergências"] Mantém a mesma lógica de
// investigação (causa + observação + status), adaptada ao processo real:
// a auditoria é uma ETAPA SEPARADA, feita pelo Supervisor Sistema depois
// que a conferência já foi salva — nunca durante a contagem do conferente.
//
// REGRA ESPECIAL DO ALMOX 3: fisicamente existe um único Almoxarifado 3,
// mas no ERP o saldo dele é dividido contabilmente entre Empresa 1 e
// Empresa 9. Por isso, ao auditar uma linha de "Almox 3", pedimos os dois
// saldos (Empresa 1 + Empresa 9) e comparamos a SOMA com o saldo físico
// único. Para "Almox 30" (e demais locais), pedimos um único saldo,
// implicitamente da Empresa 1. Isso é automático — o Supervisor nunca
// escolhe uma empresa manualmente.
//
// Os nomes das funções abaixo (renderDivergencias, renderDivHistorico,
// atualizarSaldosDivergencias) foram mantidos para não precisar tocar nos
// pontos de integração já existentes (utils.js, conferencia.js, polling.js,
// sheets-api.js) — só o conteúdo/comportamento interno mudou.

async function atualizarSaldosDivergencias() {
  toast('🔄 Buscando saldos...');
  await carregarSheetsData();
  await carregarInventarioItens();
  await carregarConferenciasSheets();
  await carregarAuditoriasSheets();
  renderDivergencias();
  toast('✅ Saldos e auditorias atualizados!');
}

// Regra especial: Rejunte, Separação e Almox 3 são, fisicamente, o MESMO
// almoxarifado (só categorias diferentes de item dentro dele) — então o
// saldo do ERP é dividido entre Empresa 1 e Empresa 9 para todos eles.
// Só o Almox 30 é um local realmente separado, com saldo único.
function ehAlmox3Fisico(local){
  return local === 'Almox 3' || local === 'Rejunte' || local === 'Separação';
}

// ── Painel gerencial: indicadores no topo ───────────────────────────
function renderAuditIndicadores(conferenciasValidas){
  const el = document.getElementById('auditIndicadores');
  if(!el) return;

  const hojeStr = new Date().toLocaleDateString('pt-BR');
  let aguardando=0, emAndamento=0, concluidas=0;
  let auditoriasHoje=0, investigacoesAbertas=0, investigacoesResolvidas=0;
  let ultimaAuditoria=null;

  conferenciasValidas.forEach(conf=>{
    const r = getAuditoriaResumoConferencia(conf);
    if(r.total===0) return;
    if(r.concluida) concluidas++;
    else if(r.validados>0 || r.resolvidas>0 || r.emInvestigacao>0) emAndamento++;
    else aguardando++;
  });

  AUDITORIA_HISTORICO.forEach(a=>{
    if((a.dataHora||'').startsWith(hojeStr)) auditoriasHoje++;
    if(a.investigacao){
      if(a.investigacao.status==='Em Investigação') investigacoesAbertas++;
      if(a.investigacao.status==='Resolvido') investigacoesResolvidas++;
    }
    if(!ultimaAuditoria || a.dataHora > ultimaAuditoria.dataHora) ultimaAuditoria = a;
  });

  const cards = [
    {label:'Aguardando Auditoria', val: aguardando, cor:'var(--text3)'},
    {label:'Em Andamento', val: emAndamento, cor:'var(--yellow)'},
    {label:'Concluídas', val: concluidas, cor:'var(--green)'},
    {label:'Auditorias Hoje', val: auditoriasHoje, cor:'var(--accent)'},
    {label:'Investigações Abertas', val: investigacoesAbertas, cor:'var(--red)'},
    {label:'Investigações Resolvidas', val: investigacoesResolvidas, cor:'var(--accent)'}
  ];
  el.innerHTML = cards.map(c=>`
    <div style="background:var(--bg3);border-radius:var(--radius-sm);padding:10px 12px;text-align:center">
      <div style="font-size:20px;font-weight:800;color:${c.cor}">${c.val}</div>
      <div style="font-size:9px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.03em;margin-top:2px">${c.label}</div>
    </div>`).join('')
    + (ultimaAuditoria ? `<div style="grid-column:1/-1;font-size:10px;color:var(--text3);margin-top:2px">Última auditoria: <b>${ultimaAuditoria.dataHora}</b> por <b>${ultimaAuditoria.supervisor}</b></div>` : '');
}

// ── Painel principal: lista de conferências com semáforo de auditoria ──
function renderDivergencias() {
  const container = document.getElementById('divGroupContainer');
  if(!container) return;
  container.innerHTML = '';

  const filtroCod = (document.getElementById('divFiltroCod')?.value || '').toLowerCase();
  const filtroAlmox = document.getElementById('auditFiltroAlmox')?.value || '';
  const filtroSupervisor = (document.getElementById('auditFiltroSupervisor')?.value || '').toLowerCase();
  const filtroData = document.getElementById('auditFiltroData')?.value || '';
  const filtroStatus = document.getElementById('divFiltroTipo')?.value || 'todas';

  const conferenciasValidas = CONF_HISTORICO
    .filter(c => c && c.numero && c.itens && Object.keys(c.itens).length>0)
    .filter(c => {
      // Auditoria passa a valer só a partir de hoje — conferências mais antigas não entram na fila
      const dt = parseDateBR(c.data || c.dataHora);
      if(!dt) return true; // sem data reconhecível: não filtra, pra não sumir com dado por engano
      const hoje = new Date(); hoje.setHours(0,0,0,0);
      return dt >= hoje;
    });
  renderAuditIndicadores(conferenciasValidas);

  let listaFiltrada = conferenciasValidas.filter(conf=>{
    if(filtroCod && !Object.keys(conf.itens).some(cod=>cod.toLowerCase().includes(filtroCod))) return false;
    if(filtroAlmox && !listarLinhasAuditaveis(conf).some(l=>l.local===filtroAlmox)) return false;
    if(filtroSupervisor){
      const temSupervisor = AUDITORIA_HISTORICO.some(a=>a.numConf===conf.numero && (a.supervisor||'').toLowerCase().includes(filtroSupervisor));
      if(!temSupervisor) return false;
    }
    if(filtroData && (conf.data !== formatarDataBRparaFiltro(filtroData))) return false;
    return true;
  });

  listaFiltrada = listaFiltrada.filter(conf=>{
    const r = getAuditoriaResumoConferencia(conf);
    if(r.total===0) return filtroStatus==='todas';
    if(filtroStatus==='aguardando') return r.validados===0 && r.resolvidas===0 && r.emInvestigacao===0;
    if(filtroStatus==='parcial') return !r.concluida && (r.validados>0 || r.resolvidas>0);
    if(filtroStatus==='concluida') return r.concluida;
    if(filtroStatus==='cominvestigacao') return r.emInvestigacao>0;
    if(filtroStatus==='cominvestigacaoresolvida') return r.resolvidas>0;
    return true;
  });

  document.getElementById('divEmpty').style.display = listaFiltrada.length===0 ? 'block' : 'none';

  listaFiltrada.forEach((conf, idx)=>{
    const r = getAuditoriaResumoConferencia(conf);
    const linhas = listarLinhasAuditaveis(conf);
    const podeAud = podeAuditarEstoque();

    const card = document.createElement('div');
    card.className = 'card';
    card.style.padding = '0';
    card.style.overflow = 'hidden';
    card.style.border = '1px solid var(--border)';

    const isPrimeira = idx===0;

    const linhasHTML = linhas.map(l=>{
      const status = getAuditStatus(conf.numero, l.cod, l.local);
      return `<tr>
        <td><strong>${l.cod}</strong><br><small style="color:var(--text3);display:block;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.nome||''}</small></td>
        <td style="text-align:center"><span style="font-size:9px;background:var(--bg3);padding:2px 6px;border-radius:4px;font-weight:700">${l.local}</span></td>
        <td style="text-align:center;font-weight:700">${l.saldoFisico}</td>
        <td style="text-align:center">${auditStatusBadgeHTML(status)}</td>
        <td>${podeAud ? `<button class="btn" style="height:24px;padding:0 8px;font-size:10px" onclick="abrirValidarSaldo('${conf.numero}','${l.cod}','${l.local}')">✔ Validar Saldo</button>` : ''}</td>
      </tr>`;
    }).join('');

    card.innerHTML = `
      <div style="padding:12px 16px;background:${isPrimeira?'var(--accent-dim)':'var(--bg3)'};cursor:pointer;display:flex;align-items:center;justify-content:space-between" onclick="toggleDivGroup('${conf.numero}')">
        <div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span title="Status geral">${semaforoHTML(r.semaforo)}</span>
            <strong style="color:var(--accent)">${conf.numero}</strong>
            <span style="font-size:10px;color:var(--text3)">${conf.dataHora}</span>
            ${conf.local ? `<span style="font-size:9px;background:var(--bg3);color:var(--text2);border-radius:4px;padding:1px 6px;font-weight:700">📍 ${conf.local}</span>` : ''}
            ${r.concluida ? '<span class="status-badge sb-done">Auditoria concluída</span>' : `<span class="status-badge sb-pending">${r.pendentes+r.emInvestigacao} pendente(s)</span>`}
          </div>
          <div style="font-size:11px;color:var(--text2);margin-top:2px">👤 ${conf.nomeUsuario || conf.usuario} · 📦 ${linhas.length} linha(s) auditável(is) · ${r.percentual}%</div>
        </div>
        <div style="font-size:12px;color:var(--accent);font-weight:700" id="icon-${conf.numero}">${isPrimeira?'▲':'▼'}</div>
      </div>
      <div id="content-${conf.numero}" style="display:${isPrimeira?'block':'none'};padding:10px;border-top:1px solid var(--border)">
        <div style="background:var(--border);border-radius:20px;height:6px;overflow:hidden;margin-bottom:10px">
          <div style="background:${r.concluida?'var(--green)':'var(--accent)'};height:100%;width:${r.percentual}%"></div>
        </div>
        <div style="overflow-x:auto">
          <table class="hist-table">
            <thead><tr><th>Código</th><th>Local</th><th style="text-align:center">Físico</th><th style="text-align:center">Status</th><th>Ação</th></tr></thead>
            <tbody>${linhasHTML}</tbody>
          </table>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function formatarDataBRparaFiltro(isoDate){
  if(!isoDate) return '';
  const [y,m,d] = isoDate.split('-');
  return d+'/'+m+'/'+y;
}
// Filtro rápido "Hoje" — mesmo padrão já usado no Histórico de Conferências
function auditFiltroHoje(){
  const hoje = new Date().toISOString().slice(0,10);
  const el = document.getElementById('auditFiltroData');
  if(el) el.value = hoje;
  renderDivergencias();
}

function toggleDivGroup(num) {
  const content = document.getElementById('content-' + num);
  const icon = document.getElementById('icon-' + num);
  if(content && icon) {
    const isHidden = content.style.display === 'none';
    content.style.display = isHidden ? 'block' : 'none';
    icon.textContent = isHidden ? '▲' : '▼';
  }
}

// ── Modal: Validar Saldo ─────────────────────────────────────────────
function abrirValidarSaldo(numConf, cod, local){
  if(!podeAuditarEstoque()){ toast('⛔ Apenas o Supervisor Sistema pode realizar auditorias.'); return; }
  const conf = CONF_HISTORICO.find(c=>c.numero===numConf);
  if(!conf || !conf.itens[cod]) { toast('Conferência ou item não encontrado.'); return; }
  const it = conf.itens[cod];
  const saldoFisico = local==='Almox 30' ? (it.almox30||0) : (it.almox3||0);
  const auditKey = getAuditKey(numConf, cod, local);
  const existente = AUDITORIA_HISTORICO.find(a=>a.auditKey===auditKey);
  const ehAlmox3 = ehAlmox3Fisico(local);

  _auditAtual = { numConf, cod, nome: it.nome, local, saldoFisico, data: conf.data || conf.dataHora, auditKey, ehAlmox3 };

  // Alerta: este item já teve divergência em alguma OUTRA conferência antes?
  // Ajuda o Supervisor a reconhecer de cara um item que já deu problema antes.
  const alertaEl = document.getElementById('vsAlertaHistorico');
  const historicoItem = buscarHistoricoDivergenciasItem(cod, auditKey);
  if(historicoItem.length > 0){
    const ultima = historicoItem[0];
    const statusUltima = ultima.investigacao && ultima.investigacao.status==='Resolvido' ? 'resolvida' : 'em investigação';
    alertaEl.style.display = 'block';
    alertaEl.innerHTML = `
      <div style="background:var(--yellow-dim);border:1px solid var(--yellow-mid,var(--yellow));border-radius:6px;padding:10px 12px">
        <div style="font-weight:700;color:var(--yellow);font-size:11px">⚠️ Este item já teve divergência antes (${historicoItem.length}x)</div>
        <div style="font-size:10px;color:var(--text2);margin-top:4px">
          Última: <b>${ultima.dataHora}</b> · Conf. ${ultima.numConf} · ${ultima.almoxarifado} · por <b>${ultima.supervisor}</b> — ${statusUltima}
          ${ultima.investigacao && ultima.investigacao.motivo ? `<br>Motivo: ${escapeHTML(ultima.investigacao.motivo)}` : ''}
          ${ultima.investigacao && ultima.investigacao.status==='Resolvido' && ultima.investigacao.obsFinal ? `<br>Ajuste registrado: ${escapeHTML(ultima.investigacao.obsFinal)}` : ''}
        </div>
      </div>`;
  } else {
    alertaEl.style.display = 'none';
    alertaEl.innerHTML = '';
  }

  document.getElementById('vsInfo').innerHTML = `
    <div><b>Almoxarifado:</b> ${local}${ehAlmox3 ? ' <span style="color:var(--text3)">(mesmo prédio físico do Almox 3 — saldo dividido no ERP entre Empresa 1 e Empresa 9)</span>' : ''}</div>
    <div><b>Data da conferência:</b> ${_auditAtual.data}</div>
    <div><b>Produto:</b> ${escapeHTML(cod)} — ${escapeHTML(it.nome||'')}</div>
    <div><b>Saldo físico contado:</b> ${saldoFisico}</div>
  `;

  // Monta os campos de saldo dinamicamente: 2 campos pro Almox 3/Rejunte/Separação (Empresa 1 + Empresa 9), 1 campo pro Almox 30
  const container = document.getElementById('vsSaldoInputsContainer');
  if(ehAlmox3){
    container.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="fld">
          <label>Saldo ${local} — Empresa 1</label>
          <input type="number" id="vsSaldoEmpresa1" min="0" oninput="compararSaldoAuditoria()" placeholder="0">
        </div>
        <div class="fld">
          <label>Saldo ${local} — Empresa 9</label>
          <input type="number" id="vsSaldoEmpresa9" min="0" oninput="compararSaldoAuditoria()" placeholder="0">
        </div>
      </div>
      <div style="font-size:9px;color:var(--text3);margin-top:4px">A soma dos dois valores será comparada ao saldo físico contado (é um único almoxarifado físico).</div>
    `;
    document.getElementById('vsSaldoEmpresa1').value = existente && existente.saldoInformadoEmpresa1 != null ? existente.saldoInformadoEmpresa1 : '';
    document.getElementById('vsSaldoEmpresa9').value = existente && existente.saldoInformadoEmpresa9 != null ? existente.saldoInformadoEmpresa9 : '';
  } else {
    container.innerHTML = `
      <div class="fld">
        <label>Saldo ${local} (sistema/ERP)</label>
        <input type="number" id="vsSaldoUnico" min="0" oninput="compararSaldoAuditoria()" placeholder="Digite o saldo que consta no sistema">
      </div>
    `;
    document.getElementById('vsSaldoUnico').value = existente ? existente.saldoInformado : '';
  }

  const motivoSel = document.getElementById('vsMotivo');
  const obsEl = document.getElementById('vsObservacao');
  const btnResolver = document.getElementById('vsBtnResolver');
  const statusInfo = document.getElementById('vsStatusInfo');

  motivoSel.value = existente && existente.investigacao ? (existente.investigacao.motivo||'') : '';
  obsEl.value = existente && existente.investigacao
    ? (existente.investigacao.status==='Resolvido' ? (existente.investigacao.obsFinal||existente.investigacao.observacao||'') : (existente.investigacao.observacao||''))
    : '';
  document.getElementById('vsResultado').style.display='none';
  document.getElementById('vsInvestigacaoBlock').style.display='none';
  btnResolver.style.display='none';
  statusInfo.textContent='';

  if(existente){
    compararSaldoAuditoria();
    if(existente.investigacao && existente.investigacao.status==='Em Investigação'){
      btnResolver.style.display='inline-block';
      statusInfo.textContent = '🔴 Em investigação desde ' + existente.dataHora + ' — preencha a observação final e clique em "Marcar Resolvido".';
    } else if(existente.investigacao && existente.investigacao.status==='Resolvido'){
      statusInfo.textContent = '🔵 Investigação já resolvida em ' + (existente.investigacao.resolvidoDataHora||'—') + ' por ' + (existente.investigacao.resolvidoPor||'—') + '. Você ainda pode editar e salvar novamente se necessário.';
    }
  }

  document.getElementById('modalValidarSaldo').style.display = 'flex';
}

function fecharModalValidarSaldo(){
  document.getElementById('modalValidarSaldo').style.display = 'none';
  _auditAtual = null;
}

// Busca todas as auditorias anteriores (de QUALQUER conferência) desse mesmo
// item que resultaram em divergência — usado pra avisar o Supervisor que
// "esse item já deu problema antes", mesmo numa conferência diferente da atual.
function buscarHistoricoDivergenciasItem(cod, auditKeyAtual){
  return AUDITORIA_HISTORICO
    .filter(a => a.cod === cod && a.resultado === 'Divergência' && a.auditKey !== auditKeyAtual)
    .sort((a,b) => (b.dataHora||'').localeCompare(a.dataHora||''));
}

// Lê os campos de saldo informado (1 ou 2, dependendo do local) e retorna
// {total, empresa1, empresa9} — total é sempre o valor comparado ao físico.
// Retorna null quando a leitura ainda não está completa (campo vazio) ou é inválida (negativo).
function _lerSaldoInformadoAtual(){
  if(!_auditAtual) return null;
  if(_auditAtual.ehAlmox3){
    const e1El = document.getElementById('vsSaldoEmpresa1');
    const e9El = document.getElementById('vsSaldoEmpresa9');
    if(!e1El || !e9El) return null;
    // Os DOIS campos são obrigatórios no Almox 3 — preencher só um não é suficiente,
    // pois o valor comparado é sempre a soma dos dois.
    if(e1El.value==='' || e9El.value==='') return null;
    const empresa1 = Math.max(0, parseInt(e1El.value)||0);
    const empresa9 = Math.max(0, parseInt(e9El.value)||0);
    return { total: empresa1+empresa9, empresa1, empresa9 };
  }
  const unicoEl = document.getElementById('vsSaldoUnico');
  if(!unicoEl || unicoEl.value==='') return null;
  return { total: Math.max(0, parseInt(unicoEl.value)||0), empresa1: null, empresa9: null };
}

function compararSaldoAuditoria(){
  if(!_auditAtual) return;
  const leitura = _lerSaldoInformadoAtual();
  const resEl = document.getElementById('vsResultado');
  const invBlock = document.getElementById('vsInvestigacaoBlock');
  if(!leitura){ resEl.style.display='none'; invBlock.style.display='none'; return; }
  const divergente = leitura.total !== _auditAtual.saldoFisico;
  resEl.style.display='block';
  if(!divergente){
    resEl.innerHTML = '<div style="background:var(--green-dim);color:var(--green);padding:9px 12px;border-radius:6px;font-weight:700;text-align:center">✔ Saldo Validado</div>';
    invBlock.style.display='none';
  } else {
    const diff = _auditAtual.saldoFisico - leitura.total;
    resEl.innerHTML = '<div style="background:var(--red-dim);color:var(--red);padding:9px 12px;border-radius:6px;font-weight:700;text-align:center">⚠ Divergência Encontrada (' + (diff>0?'+':'') + diff + ')</div>';
    invBlock.style.display='block';
  }
}

function _montarRegistroAuditoria(leitura, divergente, investigacao){
  const nome = (USUARIO_LOGADO && USUARIO_LOGADO.nome) || '—';
  const usuario = (USUARIO_LOGADO && USUARIO_LOGADO.usuario) || '—';
  return {
    auditKey: _auditAtual.auditKey,
    numConf: _auditAtual.numConf,
    almoxarifado: _auditAtual.local,
    cod: _auditAtual.cod,
    nome: _auditAtual.nome,
    saldoFisico: _auditAtual.saldoFisico,
    saldoInformado: leitura.total,
    saldoInformadoEmpresa1: leitura.empresa1,
    saldoInformadoEmpresa9: leitura.empresa9,
    resultado: divergente ? 'Divergência' : 'Validado',
    supervisor: nome,
    supervisorUsuario: usuario,
    dataHora: nowFull(),
    investigacao: divergente ? investigacao : null
  };
}
function _salvarRegistroAuditoria(registro){
  const idx = AUDITORIA_HISTORICO.findIndex(a=>a.auditKey===registro.auditKey);
  if(idx>=0) AUDITORIA_HISTORICO[idx] = registro; else AUDITORIA_HISTORICO.unshift(registro);
  salvarAuditoriaLocal(); // cache local instantâneo (funciona mesmo offline)
  salvarAuditoriaSheets(registro); // envia pro Sheets em segundo plano — não bloqueia a UI
  fecharModalValidarSaldo();
  renderConfHistorico();
  renderDivergencias();
  renderDivHistorico();
}

function salvarValidacaoSaldo(){
  if(!_auditAtual) return;
  const leitura = _lerSaldoInformadoAtual();
  if(!leitura){
    toast(_auditAtual.ehAlmox3
      ? '⚠️ Informe os dois saldos (Empresa 1 e Empresa 9) — os dois são obrigatórios.'
      : '⚠️ Informe o saldo do sistema/ERP.');
    return;
  }
  const divergente = leitura.total !== _auditAtual.saldoFisico;

  if(!divergente){
    _salvarRegistroAuditoria(_montarRegistroAuditoria(leitura, false, null));
    toast('✔ Saldo Validado!');
    return;
  }

  const motivo = document.getElementById('vsMotivo').value;
  const obs = document.getElementById('vsObservacao').value || '';
  if(!motivo){ toast('⚠️ Selecione o motivo da divergência para abrir a investigação.'); return; }

  const existente = AUDITORIA_HISTORICO.find(a=>a.auditKey===_auditAtual.auditKey);
  const investigacaoAnterior = existente && existente.investigacao;
  const investigacao = {
    motivo, observacao: obs,
    status: 'Em Investigação',
    resolvidoPor: investigacaoAnterior ? investigacaoAnterior.resolvidoPor : '',
    resolvidoDataHora: investigacaoAnterior ? investigacaoAnterior.resolvidoDataHora : '',
    obsFinal: investigacaoAnterior ? investigacaoAnterior.obsFinal : ''
  };
  _salvarRegistroAuditoria(_montarRegistroAuditoria(leitura, true, investigacao));
  toast('⚠️ Divergência registrada — Em Investigação.');
}

function resolverInvestigacaoAuditoria(){
  if(!_auditAtual){ return; }
  if(!podeAuditarEstoque()){ toast('⛔ Apenas o Supervisor Sistema pode encerrar investigações.'); return; }
  const existente = AUDITORIA_HISTORICO.find(a=>a.auditKey===_auditAtual.auditKey);
  if(!existente || !existente.investigacao){ toast('Não há investigação em aberto para este item.'); return; }
  const motivo = document.getElementById('vsMotivo').value || existente.investigacao.motivo;
  const obsFinal = document.getElementById('vsObservacao').value || '';
  if(!obsFinal){ toast('⚠️ Preencha a observação final antes de marcar como resolvido.'); return; }

  const nome = (USUARIO_LOGADO && USUARIO_LOGADO.nome) || '—';
  const registro = Object.assign({}, existente, {
    investigacao: {
      motivo,
      observacao: existente.investigacao.observacao,
      status: 'Resolvido',
      resolvidoPor: nome,
      resolvidoDataHora: nowFull(),
      obsFinal
    }
  });
  _salvarRegistroAuditoria(registro);
  toast('✅ Investigação resolvida!');
}

// ── Histórico permanente de auditorias ───────────────────────────────
function renderDivHistorico() {
  const body = document.getElementById('divHistBody');
  const table = document.getElementById('divHistTable');
  const empty = document.getElementById('divHistEmpty');
  if(!body) return;

  if(AUDITORIA_HISTORICO.length === 0) {
    if(empty) empty.style.display = 'block';
    if(table) table.style.display = 'none';
    return;
  }
  if(empty) empty.style.display = 'none';
  if(table) table.style.display = 'table';

  body.innerHTML = '';
  AUDITORIA_HISTORICO.forEach(a=>{
    const status = !a.investigacao ? 'validado' : (a.investigacao.status==='Resolvido' ? 'resolvido' : 'em_investigacao');
    const tr = document.createElement('tr');
    const motivoObs = a.investigacao ? `${a.investigacao.motivo||''}${a.investigacao.observacao?' — '+escapeHTML(a.investigacao.observacao):''}${a.investigacao.status==='Resolvido'&&a.investigacao.obsFinal?' · Final: '+escapeHTML(a.investigacao.obsFinal):''}` : '—';
    const saldoErpDisplay = (a.saldoInformadoEmpresa1!=null || a.saldoInformadoEmpresa9!=null)
      ? `${a.saldoInformado} <span style="color:var(--text3);font-weight:400">(E1:${a.saldoInformadoEmpresa1||0} + E9:${a.saldoInformadoEmpresa9||0})</span>`
      : a.saldoInformado;
    tr.innerHTML = `
      <td><strong style="color:var(--accent)">${a.numConf}</strong></td>
      <td style="white-space:nowrap;font-size:11px">${a.dataHora}</td>
      <td style="font-size:11px">${a.supervisor}</td>
      <td style="text-align:center"><span style="font-size:10px;background:var(--bg3);padding:2px 6px;border-radius:4px;font-weight:700">${a.almoxarifado}</span></td>
      <td style="font-size:11px"><strong>${a.cod}</strong><br><span style="color:var(--text3)">${a.nome||''}</span></td>
      <td style="text-align:center;font-weight:700">${a.saldoFisico}</td>
      <td style="text-align:center;font-weight:700">${saldoErpDisplay}</td>
      <td style="text-align:center;font-weight:700;color:${a.resultado==='Validado'?'var(--green)':'var(--red)'}">${a.resultado}</td>
      <td style="font-size:11px;color:var(--text2)">${motivoObs}</td>
      <td style="text-align:center">${auditStatusBadgeHTML(status)}</td>
    `;
    body.appendChild(tr);
  });
}
