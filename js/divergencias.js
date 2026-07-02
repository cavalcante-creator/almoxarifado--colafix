// ===== Aba Divergências: comparação sistema x físico e investigação =====
// ─── DIVERGÊNCIAS ─────────────────────────────────────────────────
async function atualizarSaldosDivergencias() {
  toast('🔄 Buscando saldos...');
  await carregarSheetsData();
  await carregarInventarioItens();
  renderDivergencias();
  toast('✅ Saldos atualizados!');
}

function renderDivergencias() {
  const container = document.getElementById('divGroupContainer');
  if(!container) return;
  
  container.innerHTML = '';
  let totalDivergenciasEncontradas = 0;
  
  const filtroCod = (document.getElementById('divFiltroCod')?.value || '').toLowerCase();
  const filtroTipo = document.getElementById('divFiltroTipo')?.value || 'todas';

  // Iterar por todas as conferências do histórico
  CONF_HISTORICO.forEach((conf, idx) => {
    let confDivs = [];
    
    // Coletar divergências desta conferência
    Object.keys(conf.itens).forEach(cod => {
      const confItem = conf.itens[cod];
      // Usar SALDO_BRUTO para buscar o item original (contém todos os itens, não apenas os filtrados)
      const itemOriginal = SALDO_BRUTO.find(i => i.cod === cod) || ITEMS.find(i => i.cod === cod);
      
      // Item 7: filtrar locais sem permissão
      const cpDiv = confPerm();
      const invItemD = CONF_ITEMS.find(i => i.cod === cod) || SALDO_BRUTO.find(i => i.cod === cod) || ITEMS.find(i => i.cod === cod);
      const isRejD  = !!(invItemD && invItemD.temRejunte);
      const is30D   = !!(invItemD && invItemD.temAlmox30 && !invItemD.temAlmox3);
      const lblD3   = isRejD ? 'Rejunte' : 'Almox 3';
      const cssD3   = isRejD ? 'var(--purple-dim,#f3eeff)' : 'var(--accent-dim)';
      const txtD3   = isRejD ? 'var(--purple,#7B5EA7)' : 'var(--accent)';
      const locais = [];
      if(cpDiv.acessoTotal || (isRejD ? cpDiv.podeContarRejunte : !is30D && cpDiv.podeContarAlmox3))
        locais.push({ nome: lblD3, sist: confItem.saldoSistema3 || 0, fis: confItem.almox3 || 0, css: cssD3, txt: txtD3 });
      if(cpDiv.acessoTotal || (!isRejD && cpDiv.podeContarAlmox30))
        locais.push({ nome: 'Almox 30', sist: confItem.saldoSistema30 || 0, fis: confItem.almox30 || 0, css: 'var(--green-dim)', txt: 'var(--green)' });

      locais.forEach(loc => {
        const diff = loc.fis - loc.sist;
        const divKey = conf.numero + '_' + cod + '_' + loc.nome.replace(/\s+/g, '').toLowerCase();
        const investigado = DIV_HISTORICO.find(d => d.divKey === divKey);
        const status = investigado ? investigado.status : 'Aberta';

        // Aplicar Filtros
        if (diff === 0 && filtroTipo !== 'zerada' && filtroTipo !== 'todas') return;
        if (filtroCod && !cod.toLowerCase().includes(filtroCod)) return;
        if (filtroTipo === 'positiva' && diff <= 0) return;
        if (filtroTipo === 'negativa' && diff >= 0) return;
        if (filtroTipo === 'zerada' && diff !== 0) return;
        if (filtroTipo === 'pendentes' && (status === 'Resolvida' || diff === 0)) return;
        if (filtroTipo === 'justificadas' && status !== 'Resolvida') return;
        if (filtroTipo !== 'todas' && filtroTipo !== 'zerada' && filtroTipo !== 'pendentes' && filtroTipo !== 'justificadas' && diff === 0) return;

        confDivs.push({
          cod,
          nome: confItem.nome,
          almox: loc.nome,
          sist: loc.sist,
          fis: loc.fis,
          diff,
          status,
          css: loc.css,
          txt: loc.txt
        });
      });
    });

    if(confDivs.length > 0) {
      totalDivergenciasEncontradas += confDivs.length;
      
      const divCard = document.createElement('div');
      divCard.className = 'card';
      divCard.style.padding = '0';
      divCard.style.overflow = 'hidden';
      divCard.style.border = '1px solid var(--border)';
      
      const isUltima = idx === 0;
      const pendentes = confDivs.filter(d => d.status !== 'Resolvida' && d.diff !== 0).length;
      
      divCard.innerHTML = `
        <div style="padding:12px 16px;background:${isUltima ? 'var(--accent-dim)' : 'var(--bg3)'};cursor:pointer;display:flex;align-items:center;justify-content:space-between" onclick="toggleDivGroup('${conf.numero}')">
          <div>
            <div style="display:flex;align-items:center;gap:8px">
              <strong style="color:var(--accent)">${conf.numero}</strong>
              <span style="font-size:10px;color:var(--text3)">${conf.dataHora}</span>
              ${pendentes > 0 ? `<span class="status-badge sb-pending">${pendentes} pendentes</span>` : `<span class="status-badge sb-done">Tudo resolvido</span>`}
            </div>
            <div style="font-size:11px;color:var(--text2);margin-top:2px">👤 ${conf.nomeUsuario || conf.usuario} · 📦 ${confDivs.length} divergência(s)</div>
          </div>
          <div style="font-size:12px;color:var(--accent);font-weight:700" id="icon-${conf.numero}">${isUltima ? '▲' : '▼'}</div>
        </div>
        <div id="content-${conf.numero}" style="display:${isUltima ? 'block' : 'none'};padding:10px;border-top:1px solid var(--border)">
          <div style="overflow-x:auto">
            <table class="hist-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Almox</th>
                  <th style="text-align:center">Sist.</th>
                  <th style="text-align:center">Fís.</th>
                  <th style="text-align:center">Diff</th>
                  <th style="text-align:center">Status</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                ${confDivs.map(d => {
                  const statusClass = d.status === 'Resolvida' ? 'div-verde' : d.status === 'Em investigação' ? 'div-amarelo' : 'div-vermelho';
                  return `
                    <tr>
                      <td><strong>${d.cod}</strong><br><small style="color:var(--text3);display:block;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.nome}</small></td>
                      <td style="text-align:center"><span style="font-size:9px;background:${d.css};color:${d.txt};padding:2px 6px;border-radius:4px;font-weight:700">${d.almox}</span></td>
                      <td style="text-align:center;font-weight:700">${d.sist}</td>
                      <td style="text-align:center;font-weight:700">${d.fis}</td>
                      <td style="text-align:center;font-weight:700;color:${d.diff < 0 ? 'var(--red)' : d.diff > 0 ? 'var(--green)' : 'var(--text3)'}">${d.diff > 0 ? '+' : ''}${d.diff}</td>
                      <td style="text-align:center"><span class="divergencia-tag ${statusClass}">${d.status}</span></td>
                      <td>
                        <button class="btn" style="height:24px;padding:0 8px;font-size:10px" onclick="abrirInvestigacao('${d.cod}','${d.nome.replace(/'/g,"\\'")}','${d.almox}',${d.sist},${d.fis},${d.diff},'${conf.numero}')">🔍</button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
      container.appendChild(divCard);
    }
  });
  
  document.getElementById('divEmpty').style.display = totalDivergenciasEncontradas === 0 ? 'block' : 'none';
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

function abrirInvestigacao(cod, nome, almox, sist, fis, diff, numConf) {
  // A divKey deve ser única para a combinação de Conferência + Produto + Almoxarifado
  const divKey = numConf + '_' + cod + '_' + almox.replace(/\s+/g, '').toLowerCase();
  _invAtual = { cod, nome, almox, sist, fis, diff, numConf, divKey };
  
  // Buscar se já existe uma investigação para este item nesta conferência específica
  const prev = DIV_HISTORICO.find(d => d.divKey === divKey);
  
  document.getElementById('modalInvTitle').textContent = '🔍 Investigação — ' + cod + ' (' + almox + ')';
  document.getElementById('modalInvInfo').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11px">
      <div><span style="color:var(--text3)">Produto:</span> <strong>${nome}</strong></div>
      <div><span style="color:var(--text3)">Almoxarifado:</span> <strong>${almox}</strong></div>
      <div><span style="color:var(--text3)">Saldo Sistema:</span> <strong>${sist}</strong></div>
      <div><span style="color:var(--text3)">Saldo Físico:</span> <strong>${fis}</strong></div>
      <div><span style="color:var(--text3)">Diferença:</span> <strong style="color:${diff<0?'var(--red)':'var(--green)'}">${diff>0?'+':''}${diff}</strong></div>
      <div><span style="color:var(--text3)">Conferência:</span> <strong>${numConf}</strong></div>
    </div>
  `;
  
  document.getElementById('invFaturado').value = prev ? (prev.faturado || 0) : 0;
  document.getElementById('invTransferencia').value = prev ? (prev.transferencia || 0) : 0;
  document.getElementById('invApontamento').value = prev ? (prev.apontamento || 0) : 0;
	  document.getElementById('invAvaria').value = prev ? (prev.avaria || 0) : 0;
	  document.getElementById('invEmpresa9').value = prev ? (prev.empresa9 || 0) : 0;

	  document.getElementById('invObs').value = prev ? (prev.obs || '') : '';
	  document.getElementById('invStatus').value = prev ? (prev.status || 'Aberta') : 'Aberta';
	  document.getElementById('invStatus').disabled = false;
	  
	  calcResidual();
  document.getElementById('modalInvestigacao').style.display = 'flex';
}

function fecharModalInvestigacao() {
  document.getElementById('modalInvestigacao').style.display = 'none';
  _invAtual = null;
}

function calcResidual() {
  if(!_invAtual) return;
  const diff = Math.abs(_invAtual.diff);
  const fat = parseInt(document.getElementById('invFaturado').value) || 0;
  const tra = parseInt(document.getElementById('invTransferencia').value) || 0;
  const apo = parseInt(document.getElementById('invApontamento').value) || 0;
	  const ava = parseInt(document.getElementById('invAvaria').value) || 0;
	  const emp9 = parseInt(document.getElementById('invEmpresa9').value) || 0;
	  const justTotal = fat + tra + apo + ava + emp9;
  const residual = diff - justTotal;
  
  const el = document.getElementById('invResidual');
  const statusEl = document.getElementById('invStatusAuto');
  const statusSel = document.getElementById('invStatus');
  
  if(el) {
    el.textContent = residual;
    el.style.color = residual <= 0 ? 'var(--green)' : 'var(--red)';
  }
  
	  if(residual <= 0) {
	    if(statusEl) statusEl.textContent = '✅ Diferença residual zerada — Status será marcado como Resolvida';
	    if(statusSel) {
	      statusSel.value = 'Resolvida';
	      statusSel.disabled = true; // Forçar Resolvida se zerado
	    }
	  } else {
	    if(statusEl) statusEl.textContent = 'Diferença residual: ' + residual + ' unidades ainda não justificadas';
	    if(statusSel) {
	      statusSel.disabled = false;
	      if(statusSel.value === 'Resolvida') statusSel.value = 'Em investigação';
	    }
	  }
}

function salvarInvestigacao() {
  if(!_invAtual) return;
  
  const fat = parseInt(document.getElementById('invFaturado').value) || 0;
  const tra = parseInt(document.getElementById('invTransferencia').value) || 0;
  const apo = parseInt(document.getElementById('invApontamento').value) || 0;
	  const ava = parseInt(document.getElementById('invAvaria').value) || 0;
	  const emp9 = parseInt(document.getElementById('invEmpresa9').value) || 0;
	  const obs = document.getElementById('invObs').value || '';
	  let status = document.getElementById('invStatus').value;
	  const justTotal = fat + tra + apo + ava + emp9;
  const residual = Math.abs(_invAtual.diff) - justTotal;
  if(residual <= 0) status = 'Resolvida';
  
  const ultimaConf = CONF_HISTORICO[0];
  const registro = {
    divKey: _invAtual.divKey,
    numConf: _invAtual.numConf,
    dataHora: nowFull(),
    usuario: (USUARIO_LOGADO && USUARIO_LOGADO.usuario) || '—',
    nomeUsuario: (USUARIO_LOGADO && USUARIO_LOGADO.nome) || '—',
    cod: _invAtual.cod,
    nome: _invAtual.nome,
    almox: _invAtual.almox,
    sist: _invAtual.sist,
    fis: _invAtual.fis,
    diferenca: _invAtual.diff,
    faturado: fat,
    transferencia: tra,
    apontamento: apo,
	    avaria: ava,
	    empresa9: emp9,
	    obs,
    residual,
    status
  };
  
  const idx = DIV_HISTORICO.findIndex(d => d.divKey === _invAtual.divKey);
  if(idx >= 0) DIV_HISTORICO[idx] = registro;
  else DIV_HISTORICO.unshift(registro);
  
  fecharModalInvestigacao();
  renderDivergencias();
  renderDivHistorico();
  toast('✅ Investigação salva! Status: ' + status, 3000);
}

function renderDivHistorico() {
  const body = document.getElementById('divHistBody');
  const table = document.getElementById('divHistTable');
  const empty = document.getElementById('divHistEmpty');
  if(!body) return;
  
  if(DIV_HISTORICO.length === 0) {
    if(empty) empty.style.display = 'block';
    if(table) table.style.display = 'none';
    return;
  }
  if(empty) empty.style.display = 'none';
  if(table) table.style.display = 'table';
  
  body.innerHTML = '';
  DIV_HISTORICO.forEach(d => {
    const statusClass = d.status === 'Resolvida' ? 'div-verde' : d.status === 'Em investigação' ? 'div-amarelo' : 'div-vermelho';
	    const justs = [];
	    if(d.faturado > 0) justs.push('Faturado: ' + d.faturado);
	    if(d.transferencia > 0) justs.push('Transf.: ' + d.transferencia);
	    if(d.apontamento > 0) justs.push('Apontam.: ' + d.apontamento);
	    if(d.avaria > 0) justs.push('Avaria: ' + d.avaria);
	    if(d.empresa9 > 0) justs.push('Empresa 9: ' + d.empresa9);
	    
	    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong style="color:var(--accent)">${d.numConf}</strong></td>
      <td style="white-space:nowrap;font-size:11px">${d.dataHora}</td>
      <td style="font-size:11px">${d.nomeUsuario||d.usuario}</td>
      <td style="font-size:11px"><strong>${d.cod}</strong><br><span style="color:var(--text3)">${d.nome}</span></td>
      <td style="text-align:center"><span style="font-size:10px;background:var(--bg3);padding:2px 6px;border-radius:4px;font-weight:700">${d.almox}</span></td>
      <td style="text-align:center;font-weight:700;color:${d.diferenca<0?'var(--red)':'var(--green)'}">${d.diferenca>0?'+':''}${d.diferenca}</td>
      <td style="font-size:11px;color:var(--text2)">${justs.length > 0 ? justs.join(', ') : '—'}${d.obs ? ' · ' + d.obs : ''}</td>
      <td style="text-align:center;font-weight:700;color:${d.residual<=0?'var(--green)':'var(--red)'}">${d.residual}</td>
      <td style="text-align:center"><span class="divergencia-tag ${statusClass}">${d.status}</span></td>
    `;
    body.appendChild(tr);
  });
}

function aprovarDivergencia(cod) {
  const obs = prompt('Observação para o ajuste de estoque:');
  if(obs === null) return;

  const registro = {
    divKey: cod + '_ajuste_' + Date.now(),
    numConf: (CONF_HISTORICO[0] && CONF_HISTORICO[0].numero) || '—',
    dataHora: nowFull(),
    usuario: (USUARIO_LOGADO && USUARIO_LOGADO.usuario) || '—',
    nomeUsuario: (USUARIO_LOGADO && USUARIO_LOGADO.nome) || '—',
    cod: cod,
    nome: (ITEMS.find(i=>i.cod===cod)||{}).name || cod,
    almox: '—', sist: 0, fis: 0, diferenca: 0,
    faturado: 0, transferencia: 0, apontamento: 0, avaria: 0, empresa9: 0,
    obs: obs || 'Ajuste de estoque aprovado manualmente',
    residual: 0,
    status: 'Resolvida'
  };
  DIV_HISTORICO.unshift(registro);

  toast('✅ Divergência de ' + cod + ' aprovada e registrada!');
  delete CONFERENCIAS[cod];
  renderConferencia();
  renderDivergencias();
  renderDivHistorico();
}
