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
  renderDivHistorico();
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
  let aguardando=0;
  let auditoriasHoje=0, investigacoesAbertas=0, investigacoesResolvidas=0;
  let ultimaAuditoria=null;

  conferenciasValidas.forEach(conf=>{
    const r = getAuditoriaResumoConferencia(conf);
    if(r.total===0) return;
    if(!r.concluida && r.validados===0 && r.resolvidas===0 && r.emInvestigacao===0) aguardando++;
  });

  AUDITORIA_HISTORICO.forEach(a=>{
    if((a.dataHora||'').startsWith(hojeStr)) auditoriasHoje++;
    if(a.investigacao){
      if(a.investigacao.status==='Em Investigação') investigacoesAbertas++;
      if(a.investigacao.status==='Resolvido') investigacoesResolvidas++;
    }
    if(!ultimaAuditoria || a.dataHora > ultimaAuditoria.dataHora) ultimaAuditoria = a;
  });

  // [SIMPLIFICADO] Tirei "Em Andamento" e "Concluídas" — eram conceitos por CONFERÊNCIA,
  // sobra da tela antiga, e não batem mais com a lógica por ITEM. Ficam só os 4 números
  // que realmente dizem algo de cara: quanto está esperando, quanto foi hoje, e o estado
  // das investigações — os mesmos filtros que já existem na ficha por item logo abaixo.
  const cards = [
    {label:'Aguardando', val: aguardando, cor:'var(--text3)'},
    {label:'Hoje', val: auditoriasHoje, cor:'var(--accent)'},
    {label:'Investig. Abertas', val: investigacoesAbertas, cor:'var(--red)'},
    {label:'Investig. Resolvidas', val: investigacoesResolvidas, cor:'var(--green)'}
  ];
  el.innerHTML = cards.map(c=>`
    <div style="background:var(--bg3);border-radius:var(--radius-sm);padding:6px 8px;text-align:center">
      <div style="font-size:15px;font-weight:800;color:${c.cor}">${c.val}</div>
      <div style="font-size:8px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.03em;margin-top:1px">${c.label}</div>
    </div>`).join('')
    + (ultimaAuditoria ? `<div style="grid-column:1/-1;font-size:9px;color:var(--text3);margin-top:1px">Última: <b>${ultimaAuditoria.dataHora}</b> por <b>${ultimaAuditoria.supervisor}</b></div>` : '');
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
  const saldoFisico = (local==='Almox 30' || local==='Almox 2') ? (it.almox30||0) : (it.almox3||0);
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

// Painel de "resolver direto" — cod do auditKey que está com o painel aberto na
// linha do tempo (permite resolver sem precisar reabrir o modal de Validar Saldo)
let _auditResolvendoKey = null;
let _auditRecontandoKey = null;

function abrirResolverDireto(auditKey){
  _auditResolvendoKey = (_auditResolvendoKey === auditKey) ? null : auditKey;
  _auditRecontandoKey = null;
  renderDivHistorico();
}
function abrirRecontarDireto(auditKey){
  _auditRecontandoKey = (_auditRecontandoKey === auditKey) ? null : auditKey;
  _auditResolvendoKey = null;
  renderDivHistorico();
}

// Resolve uma investigação direto da ficha do item com AJUSTE DE SISTEMA — pede o
// novo saldo como campo numérico estruturado (não só texto livre), pra dar pra
// mostrar "saldo mudou de X para Y" e usar em relatórios depois.
function resolverInvestigacaoDireto(auditKey){
  if(!podeAuditarEstoque()){ toast('⛔ Apenas o Supervisor Sistema pode encerrar investigações.'); return; }
  const existente = AUDITORIA_HISTORICO.find(a=>a.auditKey===auditKey);
  if(!existente || !existente.investigacao){ toast('Não há investigação em aberto para este item.'); return; }
  const saldoInput = document.getElementById('resolverSaldo_'+auditKey);
  const saldoAjustado = saldoInput && saldoInput.value !== '' ? Number(saldoInput.value) : null;
  if(saldoAjustado===null){ toast('⚠️ Informe o novo saldo do sistema antes de confirmar o ajuste.'); return; }
  const obsFinal = (document.getElementById('resolverObs_'+auditKey)||{}).value || '';

  const nome = (USUARIO_LOGADO && USUARIO_LOGADO.nome) || '—';
  const registro = Object.assign({}, existente, {
    investigacao: {
      motivo: MOTIVO_AJUSTE_ERP,
      observacao: existente.investigacao.observacao,
      status: 'Resolvido',
      resolvidoPor: nome,
      resolvidoDataHora: nowFull(),
      saldoAjustado,
      obsFinal
    }
  });
  _salvarRegistroAuditoria(registro);
  _auditResolvendoKey = null;
  toast('✔ Sistema ajustado para ' + saldoAjustado);
}

// "Material recontado": fecha a divergência como erro de contagem (não mexe no
// sistema) e já compara na hora com o saldo do sistema que já conhecíamos — se
// bater, o item já fica validado (verde) na mesma ação, sem passo extra.
function confirmarRecontagemDireto(auditKey){
  if(!podeAuditarEstoque()){ toast('⛔ Apenas o Supervisor Sistema pode encerrar investigações.'); return; }
  const existente = AUDITORIA_HISTORICO.find(a=>a.auditKey===auditKey);
  if(!existente || !existente.investigacao){ toast('Não há investigação em aberto para este item.'); return; }
  const saldoInput = document.getElementById('recontarSaldo_'+auditKey);
  if(!saldoInput || saldoInput.value===''){ toast('⚠️ Informe o novo saldo contado na recontagem.'); return; }
  const novoFis = Number(saldoInput.value);
  const nome = (USUARIO_LOGADO && USUARIO_LOGADO.nome) || '—';

  // Fecha o registro divergente antigo como "recontado"
  const fechado = Object.assign({}, existente, {
    investigacao: {
      motivo: MOTIVO_RECONTAGEM,
      observacao: existente.investigacao.observacao,
      status: 'Resolvido',
      resolvidoPor: nome,
      resolvidoDataHora: nowFull(),
      obsFinal: 'Recontagem apurou ' + novoFis + ' (contagem original: ' + existente.saldoFisico + ')'
    }
  });
  const idx = AUDITORIA_HISTORICO.findIndex(a=>a.auditKey===fechado.auditKey);
  if(idx>=0) AUDITORIA_HISTORICO[idx] = fechado;
  salvarAuditoriaLocal();
  salvarAuditoriaSheets(fechado);

  // Já compara com o saldo do sistema conhecido (bate = validado na hora)
  const bateu = novoFis === existente.saldoInformado;
  const novoRegistro = {
    auditKey: existente.auditKey + '_reconta_' + Date.now(),
    numConf: existente.numConf, almoxarifado: existente.almoxarifado, cod: existente.cod, nome: existente.nome,
    saldoFisico: novoFis, saldoInformado: existente.saldoInformado,
    saldoInformadoEmpresa1: existente.saldoInformadoEmpresa1, saldoInformadoEmpresa9: existente.saldoInformadoEmpresa9,
    resultado: bateu ? 'Validado' : 'Divergência',
    supervisor: nome, supervisorUsuario: (USUARIO_LOGADO&&USUARIO_LOGADO.usuario)||'—',
    dataHora: nowFull(),
    investigacao: bateu ? null : { motivo:'Erro de contagem', observacao:'Divergiu de novo após recontagem', status:'Em Investigação' }
  };
  AUDITORIA_HISTORICO.unshift(novoRegistro);
  salvarAuditoriaLocal();
  salvarAuditoriaSheets(novoRegistro);

  _auditRecontandoKey = null;
  renderConfHistorico(); renderDivergencias(); renderDivHistorico();
  toast(bateu ? '✔ Recontagem bateu com o sistema — validado!' : '⚠️ Recontagem ainda divergiu, nova investigação aberta');
}

// Exclui um registro de auditoria/investigação por completo — pra quando não vai
// dar tempo de investigar e não faz sentido continuar cobrando aquele item.
// Some da lista e do Sheets; não pode ser desfeito.
function excluirInvestigacaoAuditoria(auditKey){
  if(!podeAuditarEstoque()){ toast('⛔ Apenas o Supervisor Sistema pode excluir investigações.'); return; }
  const existente = AUDITORIA_HISTORICO.find(a=>a.auditKey===auditKey);
  if(!existente) return;
  const confirmado = confirm('Excluir esta auditoria (' + existente.cod + ' — ' + existente.numConf + ')?\n\nIsso não pode ser desfeito.');
  if(!confirmado) return;

  AUDITORIA_HISTORICO = AUDITORIA_HISTORICO.filter(a=>a.auditKey!==auditKey);
  salvarAuditoriaLocal();
  removerAuditoriaSheets(auditKey);
  toast('🗑️ Auditoria excluída');
  renderDivergencias();
  renderDivHistorico();
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

// ── Monitoramento por Item (histórico permanente reorganizado) ──────
// Cada CÓDIGO é único: uma ficha por item, com a linha do tempo completa de
// todas as auditorias dele (em qualquer conferência/local). Resolve o problema
// de "ajustei o sistema ontem e hoje não lembro se já foi ajustado": os ajustes
// de ERP ficam marcados com 🔧 na linha do tempo, então uma divergência DEPOIS
// de um ajuste é claramente um problema novo.
let _auditItemExpandido = null; // cod do item atualmente expandido
let _auditItemTimelineExpandida = {}; // cod -> true quando "Mostrar mais" foi clicado
let _auditFiltroSit = 'todos';  // filtro de situação: todos | pend | inv | adj | nunca | reinc
let _auditItemFiltroProduto = ''; // id do filtro rápido de produto ativo (vazio = nenhum)
let _auditOrdenacao = 'situacao'; // situacao | diferenca
let _auditAgrupado = false; // agrupar por almoxarifado na lista
let _auditSelecionados = new Set(); // cods marcados pra ação em massa
let _auditoriasAbertasKeys = new Set(); // chaves de pendência onde "Abrir auditoria" já foi clicado
let _auditLogExclusoes = []; // {quem, quando, cod, nome, motivo}
const MOTIVO_AJUSTE_ERP = 'Erro no sistema (ERP) — saldo ajustado';
const MOTIVO_RECONTAGEM = 'Erro de contagem — material recontado';
const AUDIT_TIMELINE_LIMITE = 5; // quantas auditorias mostrar antes do "Mostrar mais"

// Filtros rápidos de produto — reaproveita exatamente os mesmos filtros da Conferência
// (mesma planilha FILTROS_RAPIDOS, mesma regra de permissão por perfil)
function renderFiltrosRapidosAuditItem(){
  const container = document.getElementById('auditItemFiltrosRapidos');
  if(!container) return;
  const pf = perfil();
  const permitidos = pf.confFiltros || (pf.podeAdmin ? CONF_FILTROS_CONFIG.map(f=>f.id) : []);
  container.innerHTML = '';
  CONF_FILTROS_CONFIG.forEach(f => {
    if(!permitidos.includes(f.id)) return;
    const btn = document.createElement('button');
    btn.className = 'btn';
    const ativo = _auditItemFiltroProduto === f.id;
    btn.style.cssText = 'height:28px;font-size:10px;padding:0 10px' + (ativo ? ';background:var(--accent);border-color:var(--accent);color:#fff' : '');
    btn.textContent = f.label;
    if(f.title) btn.title = f.title;
    btn.onclick = () => {
      _auditItemFiltroProduto = ativo ? '' : f.id;
      renderFiltrosRapidosAuditItem();
      renderDivHistorico();
    };
    container.appendChild(btn);
  });
}
function _itemPassaFiltroProduto(cod){
  if(!_auditItemFiltroProduto) return true;
  if(CONF_FILTROS_MODO === 'planilha'){
    const marcados = FILTROS_ITEM_MAP[cod.toUpperCase()];
    return !!(marcados && marcados.has(_auditItemFiltroProduto));
  }
  // Modo legado (sem planilha configurada): busca por nome, igual à Conferência
  const invItem = (CONF_ITEMS||[]).find(i=>i.cod===cod) || (ITEMS||[]).find(i=>i.cod===cod);
  const nome = (invItem && invItem.name || '').toLowerCase();
  const f = CONF_FILTROS_CONFIG.find(x=>x.id===_auditItemFiltroProduto);
  return f ? nome.includes((f.keyword||f.id).toLowerCase()) : true;
}

function _parseDataHoraBR(s){
  if(!s) return 0;
  const m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if(m) return new Date(m[3], m[2]-1, m[1], m[4]||0, m[5]||0, m[6]||0).getTime();
  return new Date(s).getTime() || 0;
}

function _diasAberta(dataHoraStr){
  const ms = _parseDataHoraBR(dataHoraStr);
  if(!ms) return '';
  const dias = Math.floor((Date.now() - ms) / 86400000);
  if(dias <= 0) return 'aberta hoje';
  if(dias === 1) return 'aberta há 1 dia';
  return 'aberta há ' + dias + ' dias';
}

function toggleAuditItem(cod){
  _auditItemExpandido = (_auditItemExpandido === cod) ? null : cod;
  renderDivHistorico();
}
function toggleTimelineCompleta(cod){
  _auditItemTimelineExpandida[cod] = !_auditItemTimelineExpandida[cod];
  renderDivHistorico();
}

function setAuditFiltroSituacao(f){
  _auditFiltroSit = f;
  renderDivHistorico();
}
function auditItemFiltroHoje(){
  const hoje = new Date().toISOString().slice(0,10);
  const i = document.getElementById('auditDtIni'); if(i) i.value = hoje;
  const f = document.getElementById('auditDtFim'); if(f) f.value = hoje;
  renderDivHistorico();
}
function auditLimparDatas(){
  const i = document.getElementById('auditDtIni'); if(i) i.value = '';
  const f = document.getElementById('auditDtFim'); if(f) f.value = '';
  renderDivHistorico();
}

function setAuditOrdenacao(v){ _auditOrdenacao = v; renderDivHistorico(); }
function toggleAuditAgrupado(checked){ _auditAgrupado = checked; renderDivHistorico(); }

// Contagem ainda não comparada com o sistema: fica neutra no histórico até alguém
// decidir auditar (clicar aqui) — não entra mais automaticamente numa fila urgente.
function abrirAuditoriaItem(key){
  _auditoriasAbertasKeys.add(key);
  renderDivHistorico();
}

function toggleAuditSelecao(cod){
  if(_auditSelecionados.has(cod)) _auditSelecionados.delete(cod); else _auditSelecionados.add(cod);
  atualizarBarraAcaoMassaAudit();
}
function atualizarBarraAcaoMassaAudit(){
  const barra = document.getElementById('auditBarraAcaoMassa');
  if(!barra) return;
  const n = _auditSelecionados.size;
  barra.style.display = n>0 ? 'flex' : 'none';
  const txt = document.getElementById('auditTxtSelecionados');
  if(txt) txt.textContent = n + (n>1?' itens selecionados':' item selecionado');
}
function limparSelecaoAudit(){ _auditSelecionados.clear(); renderDivHistorico(); atualizarBarraAcaoMassaAudit(); }

// Ação em massa 1: abre a auditoria (revela o botão de validar saldo) pra todas as
// pendências dos itens selecionados de uma vez, em vez de item por item.
function abrirAuditoriaSelecionados(){
  if(!podeAuditarEstoque()){ toast('⛔ Você não tem permissão para abrir auditorias.'); return; }
  const { pendPorItem } = _calcularAuditoriaFiltrada();
  let n = 0;
  _auditSelecionados.forEach(cod=>{
    (pendPorItem[cod]||[]).forEach(p=>{ _auditoriasAbertasKeys.add(p.key); n++; });
  });
  if(n===0){ toast('Nenhum item selecionado tem contagem pendente de auditoria.'); return; }
  toast('Auditoria aberta para ' + n + ' contagem(ns)');
  limparSelecaoAudit();
}
// Ação em massa 2: exclui a divergência em aberto (mais recente) dos itens
// selecionados, registrando cada uma no log de exclusões.
function excluirDivergenciasSelecionadas(){
  if(!podeAuditarEstoque()){ toast('⛔ Você não tem permissão para excluir divergências.'); return; }
  const { porItem } = _calcularAuditoriaFiltrada();
  const alvos = Array.from(_auditSelecionados).filter(cod=>{
    const r0 = (porItem[cod]||[])[0];
    return r0 && r0.investigacao && r0.investigacao.status!=='Resolvido';
  });
  if(alvos.length===0){ toast('Nenhum item selecionado tem divergência em aberto.'); return; }
  if(!confirm('Excluir a divergência em aberto de ' + alvos.length + ' item(ns)? Isso não pode ser desfeito.')) return;
  alvos.forEach(cod=>{
    const registro = (porItem[cod]||[])[0];
    _auditLogExclusoes.unshift({
      quem:(USUARIO_LOGADO&&USUARIO_LOGADO.nome)||'—', quando:nowFull(),
      cod, nome:registro.nome, motivo:(registro.investigacao&&registro.investigacao.motivo)||'—'
    });
    AUDITORIA_HISTORICO = AUDITORIA_HISTORICO.filter(a=>a.auditKey!==registro.auditKey);
    removerAuditoriaSheets(registro.auditKey);
  });
  salvarAuditoriaLocal();
  limparSelecaoAudit();
  renderDivergencias();
}

function toggleLogExclusoesAudit(){
  const el = document.getElementById('auditPainelLogExclusoes');
  if(!el) return;
  const abrir = el.style.display !== 'block';
  el.style.display = abrir ? 'block' : 'none';
  const btn = document.getElementById('auditBtnLogExclusoes');
  if(btn) btn.textContent = abrir ? 'Esconder registro de exclusões ▴' : 'Ver registro de exclusões ▾';
  if(abrir) renderLogExclusoesAudit();
}
function renderLogExclusoesAudit(){
  const el = document.getElementById('auditListaLogExclusoes');
  if(!el) return;
  if(_auditLogExclusoes.length===0){ el.innerHTML = '<div style="text-align:center;padding:12px;color:var(--text3);font-size:12px">Nenhuma exclusão registrada ainda</div>'; return; }
  el.innerHTML = _auditLogExclusoes.map(l=>`
    <div style="padding:8px 0;border-top:1px solid var(--bg4);font-size:12px">
      <b>${escapeHTML(l.cod)}</b> <span style="color:var(--text2)">${escapeHTML(l.nome||'')}</span>
      <div style="color:var(--text3);font-size:11px;margin-top:2px">Excluído por <b>${escapeHTML(l.quem)}</b> em ${l.quando} · motivo original: ${escapeHTML(l.motivo)}</div>
    </div>`).join('');
}

function _atualizarChipsSituacao(){
  document.querySelectorAll('#auditChipsSituacao button').forEach(b=>{
    const ativo = b.dataset.sit === _auditFiltroSit;
    b.style.background = ativo ? 'var(--accent)' : '';
    b.style.color = ativo ? '#fff' : '';
    b.style.borderColor = ativo ? 'var(--accent)' : '';
  });
}

// Selo de status sem emoji (cores mantidas) — versão calma do auditStatusBadgeHTML,
// usada só nesta tela. O selo padrão com emoji continua nas outras telas.
function _auditBadgeCalmo(status){
  const m = AUDIT_STATUS_MAP[status] || AUDIT_STATUS_MAP.nao_auditado;
  return `<span class="status-badge" style="background:${m.bg};color:${m.txt}">${m.label}</span>`;
}

// Contagens salvas que AINDA NÃO foram auditadas, agrupadas por item.
// Cada linha auditável de cada conferência que não tem registro em
// AUDITORIA_HISTORICO é uma pendência — e ganha botão "Validar saldo"
// que abre o MESMO modal de sempre (abrirValidarSaldo), sem mudar o fluxo.
//
// [REGRA] Só entram conferências de ONTEM pra hoje (mesmo corte que já existia
// no painel antigo por conferência). Conferência mais velha que isso não entra
// na fila — o estoque físico já mudou desde então, não tem mais como validar
// aquele saldo específico, então não faz sentido continuar cobrando.
// Contagens já descartadas da fila (o supervisor decidiu que não vale auditar) —
// persistido localmente; a contagem continua no histórico normal, só sai da fila.
let _auditDescartados = new Set();
try{ _auditDescartados = new Set(JSON.parse(localStorage.getItem('audit_descartados')||'[]')); }catch(e){}
function _salvarDescartados(){ try{ localStorage.setItem('audit_descartados', JSON.stringify(Array.from(_auditDescartados))); }catch(e){} }

function _pendenciasAuditoriaPorItem(){
  const ontem = new Date(); ontem.setHours(0,0,0,0); ontem.setDate(ontem.getDate()-1);
  const mapa = {};
  (CONF_HISTORICO||[]).forEach(conf => {
    const dtConf = parseDateBR(conf.data || conf.dataHora);
    if(dtConf && dtConf < ontem) return; // conferência velha demais — não entra na fila
    const linhas = listarLinhasAuditaveis(conf);
    linhas.forEach(l => {
      const key = getAuditKey(conf.numero, l.cod, l.local);
      if(AUDITORIA_HISTORICO.some(a=>a.auditKey===key)) return;
      if(_auditDescartados.has(key)) return;
      if(!mapa[l.cod]) mapa[l.cod] = [];
      mapa[l.cod].push({
        key, numConf: conf.numero, local: l.local, nome: l.nome,
        conferente: conf.nomeUsuario || conf.usuario || '',
        fis: l.saldoFisico,
        dh: conf.dataHora || conf.data || '',
        dhMs: _parseDataHoraBR(conf.dataHora || conf.data || '')
      });
    });
  });
  Object.values(mapa).forEach(arr => arr.sort((a,b)=>b.dhMs-a.dhMs));
  return mapa;
}
function descartarContagemAuditoria(key){
  if(!podeAuditarEstoque()) return;
  if(!confirm('Descartar esta contagem da fila de auditoria? Ela continua no histórico normal, só sai daqui.')) return;
  _auditDescartados.add(key);
  _salvarDescartados();
  toast('Contagem descartada da fila');
  renderDivHistorico();
}
// Quem digitou o número físico do registro — auditoria já feita usa a conferência
// original (numConf) pra achar o conferente; pendências já trazem isso pronto.
function _conferenteDoRegistro(r){
  if(!r) return '';
  if(r.conferente) return r.conferente;
  const conf = (CONF_HISTORICO||[]).find(c=>c.numero===r.numConf);
  return conf ? (conf.nomeUsuario || conf.usuario || '') : '';
}

// Badge vermelho na aba "Conferência" com o total de investigações abertas —
// mesmo padrão visual do badge de Pendências. Atualizado toda vez que a ficha
// por item é renderizada, então nunca fica desatualizado.
function atualizarBadgeInvestigacoes(){
  const badge = document.getElementById('auditInvestBadge');
  if(!badge) return;
  const total = (AUDITORIA_HISTORICO||[]).filter(a=>a.investigacao && a.investigacao.status!=='Resolvido').length;
  badge.textContent = total;
  badge.style.display = total > 0 ? 'inline-flex' : 'none';
}

// Resumo por almoxarifado: mostra onde as divergências estão concentradas,
// calculado sobre os itens JÁ FILTRADOS na tela (respeita busca/produto/situação/data).
// Resumo geral de saúde do estoque — números rápidos calculados sobre TODO o
// cadastro (não só o que está filtrado na tela), pra dar uma visão de conjunto.
function renderResumoGeralAuditoria(){
  const el = document.getElementById('auditResumoGeral');
  if(!el) return;
  const todosItens = (CONF_ITEMS && CONF_ITEMS.length ? CONF_ITEMS : ITEMS) || [];
  const pendPorItem = _pendenciasAuditoriaPorItem();
  const porItem = {};
  AUDITORIA_HISTORICO.forEach(a=>{ if(a&&a.cod){ (porItem[a.cod]=porItem[a.cod]||[]).push(a); } });

  let nuncaAuditados=0, comDivergenciaAberta=0, reincidentes=0, validos=0, totalComparados=0;
  todosItens.forEach(it=>{
    const regs = (porItem[it.cod]||[]).slice().sort((a,b)=>_parseDataHoraBR(b.dataHora)-_parseDataHoraBR(a.dataHora));
    const pend = pendPorItem[it.cod]||[];
    if(regs.length===0 && pend.length===0){ nuncaAuditados++; return; }
    if(regs[0] && regs[0].investigacao && regs[0].investigacao.status!=='Resolvido') comDivergenciaAberta++;
    if(_ehReincidente(regs)) reincidentes++;
    regs.forEach(r=>{ totalComparados++; if(r.resultado==='Validado') validos++; });
  });
  const pctAcuracia = totalComparados>0 ? Math.round(validos/totalComparados*100) : null;

  const cards = [
    {label:'Itens no cadastro', val: todosItens.length, cor:'var(--text)'},
    {label:'Nunca auditados', val: nuncaAuditados, cor:'var(--text2)'},
    {label:'Divergência aberta', val: comDivergenciaAberta, cor:'var(--red)'},
    {label:'Reincidentes (30d)', val: reincidentes, cor:'var(--red)'},
    {label:'Acurácia geral', val: pctAcuracia!=null ? pctAcuracia+'%' : '—', cor: pctAcuracia==null?'var(--text3)':pctAcuracia>=90?'var(--green)':pctAcuracia>=70?'var(--orange)':'var(--red)'}
  ];
  el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:12px">
    ${cards.map(c=>`<div style="background:var(--bg3);border-radius:var(--radius-sm);padding:8px 6px;text-align:center">
      <div style="font-size:16px;font-weight:800;color:${c.cor}">${c.val}</div>
      <div style="font-size:8px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.02em;margin-top:2px">${c.label}</div>
    </div>`).join('')}
  </div>`;
}

// Exporta em CSV exatamente a lista filtrada na tela (mesmos filtros do PDF) —
// pra quem quiser fazer tabela dinâmica ou cruzar com outros dados fora do sistema.
function exportarCSVAuditoriaItens(){
  const { cods, porItem, pendPorItem } = _calcularAuditoriaFiltrada();
  if(cods.length === 0){ toast('Nenhum item para exportar. Verifique os filtros.'); return; }
  const linhas = [['Codigo','Nome','Status','Auditorias','Divergencias','Saldo Fisico','Saldo Sistema','Diferenca','Conferente','Ultima Auditoria','Sistema Ajustado Em']];
  cods.forEach(cod=>{
    const regs = porItem[cod]||[]; const pend = pendPorItem[cod]||[];
    const r0 = regs[0];
    const nuncaAuditado = regs.length===0 && pend.length===0;
    let status = nuncaAuditado ? 'Nunca auditado' : pend.length>0 ? 'Contado, nao auditado'
      : !r0 ? '—' : !r0.investigacao ? 'Validado' : r0.investigacao.status==='Resolvido' ? 'Resolvido' : 'Em investigacao';
    const totalDiv = regs.filter(r=>r.resultado==='Divergência').length;
    const dif = r0 && r0.saldoInformado!=null ? (Number(r0.saldoFisico)||0)-(Number(r0.saldoInformado)||0) : '';
    const ultimoAjuste = regs.find(r=>r.investigacao && r.investigacao.status==='Resolvido' && r.investigacao.motivo===MOTIVO_AJUSTE_ERP);
    linhas.push([
      cod, (r0&&r0.nome)||(pend[0]&&pend[0].nome)||'', status, regs.length, totalDiv,
      r0?r0.saldoFisico:'', r0?r0.saldoInformado:'', dif,
      r0?_conferenteDoRegistro(r0):(pend[0]&&pend[0].conferente)||'',
      r0?r0.dataHora:'', ultimoAjuste?(ultimoAjuste.investigacao.resolvidoDataHora||'').split(' ')[0]:''
    ]);
  });
  const csv = linhas.map(l=>l.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\r\n');
  const blob = new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'auditoria_estoque_' + new Date().toISOString().slice(0,10) + '.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('📄 CSV exportado');
}

function renderResumoAlmoxAuditoria(){
  const el = document.getElementById('auditResumoAlmox');
  if(!el) return;
  const { cods, porItem } = _calcularAuditoriaFiltrada();

  const porLocal = {};
  let totalDiv = 0;
  cods.forEach(cod => {
    (porItem[cod]||[]).forEach(r=>{
      if(r.resultado !== 'Divergência') return;
      totalDiv++;
      porLocal[r.almoxarifado] = (porLocal[r.almoxarifado]||0) + 1;
    });
  });

  if(totalDiv === 0){ el.innerHTML = ''; return; }

  const linhas = Object.entries(porLocal).sort((a,b)=>b[1]-a[1]);
  el.innerHTML = `
    <div style="font-size:10px;color:var(--text2);font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">Divergências por almoxarifado</div>
    <div style="display:flex;flex-direction:column;gap:4px">
      ${linhas.map(([local,qtd])=>{
        const pct = Math.round(qtd/totalDiv*100);
        return `<div style="display:flex;align-items:center;gap:8px;font-size:11px">
          <span style="width:130px;flex-shrink:0;color:var(--text)">${escapeHTML(local)}</span>
          <div style="flex:1;background:var(--bg4);border-radius:4px;height:14px;overflow:hidden">
            <div style="width:${pct}%;background:var(--red-mid);height:100%"></div>
          </div>
          <span style="width:70px;text-align:right;color:var(--text2)">${qtd} (${pct}%)</span>
        </div>`;
      }).join('')}
    </div>`;
}

// Calcula a lista de itens já filtrada (busca/produto/almox/conferente/situação/data)
// e ordenada. Usado tanto pra desenhar a tela quanto pra gerar PDF/CSV — garante que
// tudo bate. Itens SEM nenhuma auditoria e SEM nenhuma pendência (nunca auditados)
// entram no MESMO mapa — assim aparecem na busca geral também, não só num filtro à parte.
function _calcularAuditoriaFiltrada(){
  const pendPorItem = _pendenciasAuditoriaPorItem();
  const busca = ((document.getElementById('auditItemBusca')||{}).value||'').trim().toLowerCase();
  const dtIniV = (document.getElementById('auditDtIni')||{}).value || '';
  const dtFimV = (document.getElementById('auditDtFim')||{}).value || '';
  const dtIni = dtIniV ? new Date(dtIniV+'T00:00:00').getTime() : null;
  const dtFim = dtFimV ? new Date(dtFimV+'T23:59:59').getTime() : null;

  const porItem = {};
  AUDITORIA_HISTORICO.forEach(a=>{
    if(!a || !a.cod) return;
    if(!porItem[a.cod]) porItem[a.cod] = [];
    porItem[a.cod].push(a);
  });
  Object.keys(pendPorItem).forEach(cod => { if(!porItem[cod]) porItem[cod] = []; });
  // Itens do cadastro sem nenhum registro nem pendência — nunca auditados, mas
  // continuam pesquisáveis normalmente junto com o resto.
  const todosItensCadastro = (CONF_ITEMS && CONF_ITEMS.length ? CONF_ITEMS : ITEMS) || [];
  todosItensCadastro.forEach(it=>{ if(!porItem[it.cod]) porItem[it.cod] = []; });

  const filtroAlmox = (document.getElementById('auditItemFiltroAlmox')||{}).value || '';
  const filtroConf = ((document.getElementById('auditItemFiltroConf')||{}).value||'').trim().toLowerCase();
  const filtroConferente = ((document.getElementById('auditItemFiltroConferente')||{}).value||'').trim().toLowerCase();
  const cods = Object.keys(porItem).filter(cod => {
    const regs = porItem[cod];
    const pend = pendPorItem[cod] || [];
    const invItem = todosItensCadastro.find(i=>i.cod===cod);
    const nome = ((regs[0] && regs[0].nome) || (pend[0] && pend[0].nome) || (invItem && invItem.name) || '').toLowerCase();
    if(busca && !cod.toLowerCase().includes(busca) && !nome.includes(busca)) return false;
    if(!_itemPassaFiltroProduto(cod)) return false;
    if(filtroAlmox && !regs.some(r=>r.almoxarifado===filtroAlmox) && !pend.some(p=>p.local===filtroAlmox)) return false;
    if(filtroConf && !regs.some(r=>(r.numConf||'').toLowerCase().includes(filtroConf)) && !pend.some(p=>(p.numConf||'').toLowerCase().includes(filtroConf))) return false;
    if(filtroConferente && !regs.some(r=>_conferenteDoRegistro(r).toLowerCase().includes(filtroConferente)) && !pend.some(p=>(p.conferente||'').toLowerCase().includes(filtroConferente))) return false;
    if(_auditFiltroSit==='pend' && pend.length===0) return false;
    if(_auditFiltroSit==='inv' && !regs.some(r=>r.investigacao && r.investigacao.status!=='Resolvido')) return false;
    if(_auditFiltroSit==='adj' && !regs.some(r=>r.investigacao && r.investigacao.status==='Resolvido' && r.investigacao.motivo===MOTIVO_AJUSTE_ERP)) return false;
    if(_auditFiltroSit==='nunca' && (regs.length>0 || pend.length>0)) return false;
    if(_auditFiltroSit==='reinc' && !_ehReincidente(regs)) return false;
    if(dtIni || dtFim){
      if(regs.length===0 && pend.length===0) return false; // nunca auditado não tem data pra filtrar
      const datas = regs.map(r=>_parseDataHoraBR(r.dataHora)).concat(pend.map(p=>p.dhMs));
      if(!datas.some(t => (!dtIni || t>=dtIni) && (!dtFim || t<=dtFim))) return false;
    }
    return true;
  });

  cods.forEach(cod => porItem[cod].sort((a,b)=>_parseDataHoraBR(b.dataHora)-_parseDataHoraBR(a.dataHora)));

  // Ordenação: por padrão prioriza o que precisa de ação (divergência aberta primeiro);
  // "maior diferença" ordena pelo tamanho do gap físico×sistema do registro mais recente.
  if(_auditOrdenacao === 'diferenca'){
    const dif = cod => {
      const r = porItem[cod][0];
      if(!r || r.saldoInformado==null) return -1;
      return Math.abs((Number(r.saldoFisico)||0)-(Number(r.saldoInformado)||0));
    };
    cods.sort((a,b)=> dif(b)-dif(a));
  } else {
    cods.sort((a,b)=>{
      const ord = cod => {
        const regs = porItem[cod], pend = pendPorItem[cod]||[];
        const r0 = regs[0];
        if(r0 && r0.investigacao && r0.investigacao.status!=='Resolvido') return 0; // precisa ajustar
        if(r0 && r0.investigacao && r0.investigacao.status==='Resolvido') return 1;  // ajustado/recontado
        if(r0 && r0.resultado==='Validado') return 2;                                // validado
        if(pend.length>0) return 3;                                                  // contado, sem decisão
        return 4;                                                                     // nunca auditado
      };
      const oa = ord(a), ob = ord(b);
      if(oa !== ob) return oa - ob;
      const ua = porItem[a][0] ? _parseDataHoraBR(porItem[a][0].dataHora) : ((pendPorItem[a]||[{}])[0].dhMs||0);
      const ub = porItem[b][0] ? _parseDataHoraBR(porItem[b][0].dataHora) : ((pendPorItem[b]||[{}])[0].dhMs||0);
      return ub - ua;
    });
  }

  // Agrupar por almoxarifado: reordena mantendo a ordenação escolhida DENTRO de cada
  // grupo, só juntando os do mesmo local — o cabeçalho de seção é inserido no render.
  if(_auditAgrupado){
    const almoxDoItem = cod => {
      const regs = porItem[cod], pend = pendPorItem[cod]||[];
      return (regs[0] && regs[0].almoxarifado) || (pend[0] && pend[0].local) || 'Sem local definido';
    };
    const porAlmox = {};
    cods.forEach(cod=>{ const a=almoxDoItem(cod); (porAlmox[a]=porAlmox[a]||[]).push(cod); });
    const codsAgrupados = Object.keys(porAlmox).sort().flatMap(a=>porAlmox[a]);
    return { cods: codsAgrupados, porItem, pendPorItem, almoxDoItem };
  }

  return { cods, porItem, pendPorItem };
}

function _ehReincidente(regs){
  const agora = Date.now(); const DIAS30 = 30*24*60*60*1000;
  return regs.filter(r=>r.resultado==='Divergência' && (agora-_parseDataHoraBR(r.dataHora))<=DIAS30).length >= 2;
}

function renderDivHistorico() {
  atualizarBadgeInvestigacoes();
  const list = document.getElementById('auditItemList');
  const empty = document.getElementById('divHistEmpty');
  if(!list) return;
  _atualizarChipsSituacao();

  const todosItensCadastro = (CONF_ITEMS && CONF_ITEMS.length ? CONF_ITEMS : ITEMS) || [];
  if(todosItensCadastro.length === 0) {
    if(empty) empty.style.display = 'block';
    list.innerHTML = '';
    const ra = document.getElementById('auditResumoAlmox'); if(ra) ra.innerHTML = '';
    const rg = document.getElementById('auditResumoGeral'); if(rg) rg.innerHTML = '';
    return;
  }
  if(empty) empty.style.display = 'none';

  const { cods, porItem, pendPorItem, almoxDoItem } = _calcularAuditoriaFiltrada();
  renderResumoAlmoxAuditoria();
  renderResumoGeralAuditoria();
  atualizarBarraAcaoMassaAudit();
  const agora = Date.now();
  const DIAS30 = 30*24*60*60*1000;

  list.innerHTML = '';
  if(cods.length === 0){
    list.innerHTML = '<div style="text-align:center;padding:20px 0;color:var(--text3);font-size:12px">Nenhum item para esse filtro/busca</div>';
    return;
  }

  const podeValidar = podeAuditarEstoque();
  let almoxAnterior = null;

  cods.forEach(cod => {
    if(_auditAgrupado && almoxDoItem){
      const a = almoxDoItem(cod);
      if(a !== almoxAnterior){
        almoxAnterior = a;
        const header = document.createElement('div');
        header.style.cssText = 'font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.04em;margin:14px 0 6px;padding-bottom:4px;border-bottom:1px solid var(--border2)';
        header.textContent = a;
        list.appendChild(header);
      }
    }

    const regs = porItem[cod];
    const pend = pendPorItem[cod] || [];
    const maisRecente = regs[0] || null;
    const invItemCad = todosItensCadastro.find(i=>i.cod===cod);
    const nomeItem = (maisRecente && maisRecente.nome) || (pend[0] && pend[0].nome) || (invItemCad && invItemCad.name) || '';
    const totalAud = regs.length;
    const totalDiv = regs.filter(r=>r.resultado==='Divergência').length;
    const emInvestigacao = regs.some(r=>r.investigacao && r.investigacao.status!=='Resolvido');
    const ultimoAjuste = regs.find(r=>r.investigacao && r.investigacao.status==='Resolvido' && (r.investigacao.motivo===MOTIVO_AJUSTE_ERP));
    const ultimoBateu = regs.find(r=>r.resultado === 'Validado');
    const reincidencias30d = regs.filter(r=>r.resultado==='Divergência' && (agora-_parseDataHoraBR(r.dataHora))<=DIAS30).length;
    const nuncaAuditado = regs.length===0 && pend.length===0;

    const invItem = (CONF_ITEMS||[]).find(i=>i.cod===cod) || (ITEMS||[]).find(i=>i.cod===cod);
    const saldoSist = invItem ? (Number(invItem.saldo3)||0)+(Number(invItem.saldo30)||0) : null;
    let ultCont = null;
    (CONF_HISTORICO||[]).forEach(c=>{
      if(c.itens && c.itens[cod]){
        const t = _parseDataHoraBR(c.dataHora || c.data || '');
        if(!ultCont || t > ultCont.t) ultCont = { t, qtd: c.itens[cod].total, data: (c.data||c.dataHora||'').split(' ')[0], por: c.nomeUsuario||c.usuario||'' };
      }
    });

    // Status do cabeçalho: pendência agora é NEUTRA (não é mais fila urgente automática —
    // só vira ação quando alguém abre a auditoria de propósito)
    let statusBadge;
    if(nuncaAuditado){
      statusBadge = `<span class="status-badge" style="background:var(--bg4);color:var(--text2)">Nunca auditado</span>`;
    } else if(pend.length > 0){
      statusBadge = `<span class="status-badge" style="background:var(--bg4);color:var(--text2)">Contado, não auditado${pend.length>1?' ('+pend.length+')':''}</span>`;
    } else if(maisRecente){
      const statusAtual = !maisRecente.investigacao ? 'validado'
        : (maisRecente.investigacao.status==='Resolvido' ? 'resolvido' : 'em_investigacao');
      statusBadge = _auditBadgeCalmo(statusAtual);
      if(statusAtual === 'em_investigacao'){
        statusBadge += ` <span style="font-size:10px;color:var(--red);font-weight:700">(${_diasAberta(maisRecente.dataHora)})</span>`;
      }
    } else {
      statusBadge = '';
    }

    const expandido = _auditItemExpandido === cod;
    const marcado = _auditSelecionados.has(cod);
    const card = document.createElement('div');
    const corBordaCard = emInvestigacao ? 'var(--red-mid)' : 'var(--border)';
    card.style.cssText = 'background:#fff;border:1px solid ' + corBordaCard + ';border-radius:var(--radius-sm);overflow:hidden;margin-bottom:8px';

    let headerHTML = `
      <div style="padding:10px 14px;cursor:pointer;display:flex;flex-direction:column;gap:4px${expandido?';background:var(--accent-dim)':''}" onclick="toggleAuditItem('${cod}')">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          ${podeValidar ? `<input type="checkbox" ${marcado?'checked':''} onclick="event.stopPropagation();toggleAuditSelecao('${cod}')" style="width:15px;height:15px;flex-shrink:0">` : ''}
          <span style="font-weight:700;font-size:13px">${escapeHTML(cod)}</span>
          <span style="font-size:11px;color:var(--text2);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(nomeItem)}</span>
          ${reincidencias30d>=2 ? `<span class="status-badge" style="background:var(--red-dim);color:var(--red);border:1px solid var(--red-mid)">${reincidencias30d} divergências em 30 dias</span>` : ''}
          ${statusBadge}
        </div>
        ${!nuncaAuditado ? `<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:10px;color:var(--text2);background:var(--bg3);border-radius:5px;padding:4px 8px">
          ${saldoSist!=null ? `<span>Saldo sistema: <b>${saldoSist}</b></span>` : ''}
          ${ultCont ? `<span>Última contagem: <b>${ultCont.qtd}</b> em ${ultCont.data} (${escapeHTML(ultCont.por)})</span>` : '<span style="color:var(--text3)">Sem contagem registrada</span>'}
          ${ultimoBateu
            ? `<span style="color:var(--green)">Última vez que bateu: <b>${ultimoBateu.dataHora.split(' ')[0]}</b></span>`
            : (regs.length>0 ? `<span style="color:var(--text3)">Nunca bateu certinho até hoje</span>` : '')}
        </div>` : `<div style="font-size:11px;color:var(--text3)">Almoxarifado: ${escapeHTML((invItemCad&&(invItemCad.temAlmox3?'Almox 3':invItemCad.temAlmox30?'Almox 30':''))||'—')} · nenhuma contagem ou auditoria registrada até hoje</div>`}
        ${!nuncaAuditado ? `<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-size:10px;color:var(--text3)">
          <span>${totalAud} auditoria${totalAud!==1?'s':''} · ${totalDiv} divergência${totalDiv!==1?'s':''}</span>
          ${maisRecente ? `<span>Última auditoria: ${maisRecente.dataHora}</span>` : ''}
          ${ultimoAjuste ? `<span style="background:var(--orange-dim);color:var(--orange);border-radius:4px;padding:1px 7px;font-weight:700">🔧 Sistema ajustado em ${(ultimoAjuste.investigacao.resolvidoDataHora||ultimoAjuste.dataHora).split(' ')[0]}</span>` : ''}
          <span style="margin-left:auto;color:var(--accent);font-weight:700">${expandido?'Recolher ▴':'Ver linha do tempo ▾'}</span>
        </div>` : ''}
      </div>`;

    let timelineHTML = '';
    if(expandido && !nuncaAuditado){
      timelineHTML = '<div style="border-top:1px solid var(--border);padding:10px 14px;display:flex;flex-direction:column;gap:8px">';
      timelineHTML += _graficoEvolucaoSVG(regs);

      // Pendências: agora são NEUTRAS — só mostram "Validar saldo" depois de alguém
      // clicar em "Abrir auditoria" de propósito. Tem também a opção de descartar.
      pend.forEach(p => {
        const auditoriaAberta = _auditoriasAbertasKeys.has(p.key);
        timelineHTML += `
          <div style="border-left:3px solid var(--border2);padding:6px 10px;background:var(--bg3);border-radius:0 5px 5px 0;font-size:11px">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <b>${p.dh}</b>
              <span style="color:var(--text2)">· ${p.numConf} · ${p.local}</span>
              <span style="color:var(--text2)">Físico contado: <b>${p.fis}</b></span>
              ${p.conferente ? `<span style="color:var(--text3)">${escapeHTML(p.conferente)}</span>` : ''}
            </div>
            <div style="color:var(--text3);margin-top:4px">Contado, ainda sem auditoria aberta — fica no histórico normalmente, só entra em comparação se alguém decidir auditar.</div>
            ${podeValidar ? (auditoriaAberta
              ? `<div style="margin-top:6px"><button class="btn btn-primary" style="height:24px;padding:0 10px;font-size:10px" onclick="event.stopPropagation();abrirValidarSaldo('${p.numConf}','${cod}','${p.local}')">Validar saldo</button></div>`
              : `<div style="margin-top:6px;display:flex;gap:6px">
                   <button class="btn btn-outline" style="height:24px;padding:0 10px;font-size:10px;background:#fff;border:1px solid var(--border2);border-radius:4px" onclick="event.stopPropagation();abrirAuditoriaItem('${p.key}')">Abrir auditoria</button>
                   <button class="btn" style="height:24px;padding:0 10px;font-size:10px;color:var(--text3);border-color:var(--border2)" onclick="event.stopPropagation();descartarContagemAuditoria('${p.key}')">Descartar</button>
                 </div>`
            ) : ''}
          </div>`;
      });

      if(regs.length===0 && pend.length===0){
        timelineHTML += '<div style="text-align:center;padding:6px 0;color:var(--text3);font-size:11px">Nenhuma auditoria ainda</div>';
      }

      const timelineCompleta = !!_auditItemTimelineExpandida[cod];
      const regsVisiveis = timelineCompleta ? regs : regs.slice(0, AUDIT_TIMELINE_LIMITE);
      const ocultos = regs.length - regsVisiveis.length;

      regsVisiveis.forEach(r => {
        const st = !r.investigacao ? 'validado' : (r.investigacao.status==='Resolvido' ? 'resolvido' : 'em_investigacao');
        const dif = (Number(r.saldoFisico)||0) - (Number(r.saldoInformado)||0);
        const ehAjuste = r.investigacao && r.investigacao.status==='Resolvido' && r.investigacao.motivo===MOTIVO_AJUSTE_ERP;
        const ehRecontagem = r.investigacao && r.investigacao.status==='Resolvido' && r.investigacao.motivo===MOTIVO_RECONTAGEM;
        const corBorda = ehAjuste ? 'var(--orange)' : ehRecontagem ? 'var(--accent)' : r.resultado==='Divergência' ? 'var(--red)' : 'var(--green)';
        const saldoErpDisplay = (r.saldoInformadoEmpresa1!=null || r.saldoInformadoEmpresa9!=null)
          ? `${r.saldoInformado} <span style="color:var(--text3)">(E1:${r.saldoInformadoEmpresa1||0} + E9:${r.saldoInformadoEmpresa9||0})</span>`
          : r.saldoInformado;

        timelineHTML += `
          <div style="border-left:3px solid ${corBorda};padding:6px 10px;background:var(--bg3);border-radius:0 5px 5px 0;font-size:11px">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px">
              <b>${r.dataHora}</b>
              <span style="color:var(--text3)">· ${r.numConf} · ${r.almoxarifado}</span>
              ${_auditBadgeCalmo(st)}
              ${ehAjuste ? '<span style="background:var(--orange-dim);color:var(--orange);border-radius:4px;padding:1px 7px;font-size:10px;font-weight:700">🔧 Sistema ajustado aqui</span>' : ''}
              ${ehRecontagem ? '<span style="background:var(--accent-dim);color:var(--accent);border-radius:4px;padding:1px 7px;font-size:10px;font-weight:700">Material recontado</span>' : ''}
            </div>
            <div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:2px">
              <span>Físico: <b>${r.saldoFisico}</b></span>
              <span>ERP: <b>${saldoErpDisplay}</b></span>
              <span style="color:${dif===0?'var(--green)':'var(--red)'}">Diferença: <b>${dif>0?'+':''}${dif}</b></span>
              <span style="color:var(--text3)">${escapeHTML(_conferenteDoRegistro(r)||r.supervisor||'—')}</span>
            </div>
            ${r.investigacao ? `
              <div style="margin-top:4px;padding-top:4px;border-top:1px dashed var(--border)">
                <span style="color:var(--text2)">Motivo: <b>${escapeHTML(r.investigacao.motivo||'—')}</b></span>
                ${r.investigacao.observacao ? `<br><span style="color:var(--text3)">Obs. inicial: ${escapeHTML(r.investigacao.observacao)}</span>` : ''}
                ${r.investigacao.status==='Resolvido'
                  ? `<br><span style="color:${ehAjuste?'var(--orange)':ehRecontagem?'var(--accent)':'var(--green)'}">${ehAjuste?'Sistema ajustado':ehRecontagem?'Recontado':'Resolvido'} por <b>${escapeHTML(r.investigacao.resolvidoPor||'—')}</b> em ${r.investigacao.resolvidoDataHora||'—'}</span>
                     ${r.investigacao.saldoAjustado!=null ? `<br><span style="color:var(--text2)">Saldo mudou de <b>${r.saldoInformado}</b> para <b>${r.investigacao.saldoAjustado}</b></span>` : ''}
                     ${r.investigacao.obsFinal?`<br><span style="color:var(--text2)">Conclusão: ${escapeHTML(r.investigacao.obsFinal)}</span>`:''}`
                  : `<br><span style="color:var(--red);font-weight:700">Investigação em aberto — ${_diasAberta(r.dataHora)}</span>
                     ${podeValidar ? `
                       <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
                         <button class="btn btn-primary" style="height:24px;padding:0 10px;font-size:10px" onclick="event.stopPropagation();abrirResolverDireto('${r.auditKey}')">Informar saldo ajustado</button>
                         <button class="btn" style="height:24px;padding:0 10px;font-size:10px;background:#fff;border:1px solid var(--border2);border-radius:4px" onclick="event.stopPropagation();abrirRecontarDireto('${r.auditKey}')">Material recontado</button>
                         <button class="btn" style="height:24px;padding:0 10px;font-size:10px;color:var(--red);border-color:var(--red-mid)" onclick="event.stopPropagation();excluirInvestigacaoAuditoria('${r.auditKey}')">Excluir</button>
                       </div>
                       ${_auditResolvendoKey === r.auditKey ? `
                         <div style="margin-top:6px;background:var(--bg2);border:1px solid var(--border2);border-radius:5px;padding:8px" onclick="event.stopPropagation()">
                           <div class="fld" style="margin-bottom:6px"><label>Novo saldo do sistema (após o ajuste)</label><input type="number" id="resolverSaldo_${r.auditKey}" placeholder="Ex: ${r.saldoFisico}" style="height:30px"></div>
                           <div style="font-size:10px;color:var(--text2);margin-bottom:4px">O que foi feito (opcional)</div>
                           <textarea id="resolverObs_${r.auditKey}" rows="2" style="width:100%;font-size:11px;font-family:inherit;border:1px solid var(--border2);border-radius:4px;padding:6px;box-sizing:border-box" placeholder="Ex: ERP corrigido conforme contagem física."></textarea>
                           <div style="display:flex;gap:6px;margin-top:6px">
                             <button class="btn btn-primary" style="height:24px;padding:0 10px;font-size:10px" onclick="resolverInvestigacaoDireto('${r.auditKey}')">Confirmar ajuste</button>
                             <button class="btn" style="height:24px;padding:0 10px;font-size:10px" onclick="abrirResolverDireto('${r.auditKey}')">Cancelar</button>
                           </div>
                         </div>` : ''}
                       ${_auditRecontandoKey === r.auditKey ? `
                         <div style="margin-top:6px;background:var(--bg2);border:1px solid var(--border2);border-radius:5px;padding:8px" onclick="event.stopPropagation()">
                           <div style="font-size:10px;color:var(--text2);margin-bottom:4px">O conferente errou na contagem — informe o novo número contado. Isso fecha essa divergência como recontagem (sem mexer no sistema) e já compara com o saldo do sistema que já conhecemos.</div>
                           <div class="fld"><label>Novo saldo contado (recontagem)</label><input type="number" id="recontarSaldo_${r.auditKey}" placeholder="Ex: ${r.saldoInformado}" style="height:30px"></div>
                           <div style="display:flex;gap:6px;margin-top:6px">
                             <button class="btn btn-primary" style="height:24px;padding:0 10px;font-size:10px" onclick="confirmarRecontagemDireto('${r.auditKey}')">Confirmar recontagem</button>
                             <button class="btn" style="height:24px;padding:0 10px;font-size:10px" onclick="abrirRecontarDireto('${r.auditKey}')">Cancelar</button>
                           </div>
                         </div>` : ''}
                     ` : ''}`
                }
              </div>` : ''}
          </div>`;
      });
      if(ocultos > 0){
        timelineHTML += `<div style="text-align:center;padding:4px 0">
          <span style="color:var(--accent);font-weight:700;font-size:11px;cursor:pointer" onclick="toggleTimelineCompleta('${cod}')">Mostrar mais ${ocultos} auditoria${ocultos!==1?'s':''} antiga${ocultos!==1?'s':''} ▾</span>
        </div>`;
      } else if(timelineCompleta && regs.length > AUDIT_TIMELINE_LIMITE){
        timelineHTML += `<div style="text-align:center;padding:4px 0">
          <span style="color:var(--accent);font-weight:700;font-size:11px;cursor:pointer" onclick="toggleTimelineCompleta('${cod}')">Mostrar menos ▴</span>
        </div>`;
      }
      timelineHTML += '</div>';
    }

    card.innerHTML = headerHTML + timelineHTML;
    list.appendChild(card);
  });
}

// Gráfico simples (SVG puro, sem biblioteca) da evolução físico × sistema ao
// longo das auditorias do item, mais antiga primeiro. Só desenha quando há
// pelo menos 2 pontos com saldo informado — senão não acrescenta nada de útil.
function _graficoEvolucaoSVG(regs){
  const pontos = regs.filter(r=>r.saldoInformado!=null).slice().reverse();
  if(pontos.length < 2) return '';
  const W = 560, H = 90, PAD = 24;
  const vals = pontos.flatMap(r=>[Number(r.saldoFisico)||0, Number(r.saldoInformado)||0]);
  const min = Math.min(...vals, 0), max = Math.max(...vals, 1);
  const x = i => PAD + (i*(W-2*PAD)/(pontos.length-1||1));
  const y = v => H-PAD - ((v-min)/((max-min)||1))*(H-2*PAD);
  const linha = campo => pontos.map((r,i)=>`${x(i)},${y(Number(r[campo])||0)}`).join(' ');
  const pts = campo => pontos.map((r,i)=>`<circle cx="${x(i)}" cy="${y(Number(r[campo])||0)}" r="2.5" fill="${campo==='saldoFisico'?'#1B5C7A':'#B85C00'}"/>`).join('');
  return `<div style="background:var(--bg3);border-radius:6px;padding:10px 12px">
    <div style="font-size:10px;color:var(--text2);margin-bottom:4px">Evolução do saldo — <span style="color:#1B5C7A;font-weight:700">físico</span> × <span style="color:#B85C00;font-weight:700">sistema</span></div>
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px">
      <polyline points="${linha('saldoFisico')}" fill="none" stroke="#1B5C7A" stroke-width="2"/>
      <polyline points="${linha('saldoInformado')}" fill="none" stroke="#B85C00" stroke-width="2" stroke-dasharray="4,3"/>
      ${pts('saldoFisico')}${pts('saldoInformado')}
    </svg>
  </div>`;
}

