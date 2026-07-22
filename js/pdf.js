// ===== Geração de PDFs (requisição, conferência, lista de contagem) =====
// ─── PDF ─────────────────────────────────────────────────────────
function gerarPDFConferencia(num) {
  // [FIX BUG-11] Buscar por número (não por índice) para garantir correspondência correta
  const conf = CONF_HISTORICO.find(c => c.numero === num);
  if(!conf){
    console.error('[gerarPDF] Conferência não encontrada em memória:', num, 'Total em memória:', CONF_HISTORICO.length);
    toast('⚠️ Conferência não encontrada. Tente atualizar a página.');
    return;
  }
  if(!conf.itens || Object.keys(conf.itens).length === 0){
    console.error('[gerarPDF] Conferência sem itens:', num, JSON.stringify(conf));
    toast('⚠️ Esta conferência não possui itens registrados.');
    return;
  }
  console.log('[gerarPDF] Gerando PDF para', num, '— itens:', Object.keys(conf.itens).length, JSON.stringify(conf.itens));

  // PDF é fiel ao registro gravado no Sheets: mostra todos os itens e quantidades da conferência
  let totalRasgadosPDF = 0;
  const linhas = Object.entries(conf.itens).map(([cod, it]) => {
    const invItem = CONF_ITEMS.find(i => i.cod === cod) || ITEMS.find(i => i.cod === cod);
    const isRej   = !!(invItem && invItem.temRejunte);
    const isSep   = !!(invItem && invItem.temSeparacao);
    const lblA3   = isRej ? 'Rejunte' : isSep ? 'Separação' : 'Almox 3';
    const uPDF    = isRej ? 'fardo' : 'sc';
    const nome    = it.nome || (invItem && invItem.name) || '';
    const tem3    = (it.pal3 > 0) || (it.sac3 > 0) || (it.almox3 > 0);
    const tem30   = (it.pal30 > 0) || (it.sac30 > 0) || (it.almox30 > 0);
    const qtdRasgPDF = Number(it.qtdRasgada)||0;
    totalRasgadosPDF += qtdRasgPDF;
    const celRasgado = qtdRasgPDF > 0
      ? `<span style="color:#B83232;font-weight:700">⚠️ ${qtdRasgPDF} ${uPDF}</span>${it.motivoRasgo ? `<br><small style="color:#5A574F">${it.motivoRasgo}</small>` : ''}`
      : '<span style="color:#9C9888">—</span>';
    if(tem3 && tem30){
      return `<tr>
        <td rowspan="2"><b>${cod}</b><br><small>${nome}</small></td>
        <td style="text-align:center">${lblA3}</td>
        <td style="text-align:center">${it.pal3||0}</td>
        <td style="text-align:center">${it.sac3||0}</td>
        <td rowspan="2" style="text-align:center;font-weight:700">${qtdComConversaoTexto(invItem, it.total||0, uPDF)}</td>
        <td rowspan="2" style="text-align:center">${celRasgado}</td>
      </tr><tr>
        <td style="text-align:center;background:#f9f9f9">Almox 30</td>
        <td style="text-align:center;background:#f9f9f9">${it.pal30||0}</td>
        <td style="text-align:center;background:#f9f9f9">${it.sac30||0}</td>
      </tr>`;
    } else if(tem3){
      return `<tr>
        <td><b>${cod}</b><br><small>${nome}</small></td>
        <td style="text-align:center">${lblA3}</td>
        <td style="text-align:center">${it.pal3||0}</td>
        <td style="text-align:center">${it.sac3||0}</td>
        <td style="text-align:center;font-weight:700">${qtdComConversaoTexto(invItem, it.almox3||0, uPDF)}</td>
        <td style="text-align:center">${celRasgado}</td>
      </tr>`;
    } else if(tem30){
      return `<tr>
        <td><b>${cod}</b><br><small>${nome}</small></td>
        <td style="text-align:center;background:#f9f9f9">Almox 30</td>
        <td style="text-align:center;background:#f9f9f9">${it.pal30||0}</td>
        <td style="text-align:center;background:#f9f9f9">${it.sac30||0}</td>
        <td style="text-align:center;font-weight:700">${qtdComConversaoTexto(invItem, it.almox30||0, 'sc')}</td>
        <td style="text-align:center">${celRasgado}</td>
      </tr>`;
    }
    return '';
  }).join('');

  const tituloPDF = 'CONFERÊNCIA FÍSICA DE ESTOQUE';

  // [FIX-PDF] Determinar o local correto a partir dos itens salvos na conferência
  const locaisPDF = new Set();
  Object.keys(conf.itens||{}).forEach(cod=>{
    const inv = CONF_ITEMS.find(i=>i.cod===cod)||ITEMS.find(i=>i.cod===cod);
    if(inv){
      if(inv.temRejunte)   locaisPDF.add('Rejunte / Área Líquida');
      else if(inv.temSeparacao) locaisPDF.add('Separação');
      else if(inv.temAlmox30 && !inv.temAlmox3) locaisPDF.add('Almox 30');
      else if(inv.temAlmox3)  locaisPDF.add('Almox 3');
    } else {
      // fallback: verificar dados salvos
      const it = conf.itens[cod];
      if((it.pal30>0||it.sac30>0||it.almox30>0) && !(it.pal3>0||it.sac3>0||it.almox3>0)) locaisPDF.add('Almox 30');
      else locaisPDF.add('Almox 3');
    }
  });
  const localPDFLabel = locaisPDF.size > 0 ? Array.from(locaisPDF).join(' + ') : 'Almoxarifado';
  console.log('[gerarPDF] Local calculado:', localPDFLabel, '— locais:', Array.from(locaisPDF));

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Conferência ${conf.numero}</title>
  <style>
    body{font-family:'Segoe UI',sans-serif;margin:36px;color:#1C1C1A;font-size:12px}
    h1{font-size:20px;color:#1B5C7A;text-align:center;margin:0}
    h2{font-size:11px;color:#5A574F;text-align:center;margin:4px 0 16px}
    .rn{font-size:14px;font-weight:700;color:#1B5C7A;text-align:center;margin-bottom:20px;border:2px solid #1B5C7A;display:inline-block;padding:4px 20px;border-radius:6px}
    .ctr{text-align:center}
    hr{border:none;border-top:2px solid #1B5C7A;margin:14px 0}
    table{width:100%;border-collapse:collapse;margin-bottom:14px}
    th{background:#1B5C7A;color:#fff;padding:8px;text-align:center;font-size:10px;text-transform:uppercase}
    td{padding:8px;border:1px solid #DDD9D0}
    .info{display:flex;gap:12px;margin-bottom:14px}
    .ibox{flex:1;border:1px solid #DDD9D0;border-radius:6px;padding:9px}
    .ibox .l{font-size:9px;color:#9C9888;text-transform:uppercase;margin-bottom:2px}
    .ibox .v{font-size:12px;font-weight:600}
    @media print{body{margin:20px}}
  </style></head>
  <body>
    <div style="text-align:center;margin-bottom:12px"><div style="font-size:24px">🔍</div></div>
    <h1>${tituloPDF}</h1>
    <h2>Relatório de Contagem Física</h2>
    <div class="ctr"><div class="rn">${conf.numero} — ${localPDFLabel}</div></div><hr>
    <div class="info">
      <div class="ibox"><div class="l">Data e Hora</div><div class="v">${conf.dataHora}</div></div>
      <div class="ibox"><div class="l">Usuário Responsável</div><div class="v">${conf.nomeUsuario || conf.usuario}</div></div>
      <div class="ibox"><div class="l">Local</div><div class="v">${localPDFLabel}</div></div>
      <div class="ibox"><div class="l">Total de Itens</div><div class="v">${Object.keys(conf.itens).length}</div></div>
      <div class="ibox"><div class="l">Sacos Rasgados</div><div class="v" style="${totalRasgadosPDF>0?'color:#B83232':''}">${totalRasgadosPDF>0?'⚠️ '+totalRasgadosPDF:'—'}</div></div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="text-align:left">Item</th>
          <th>Local</th>
          <th>Paletes</th>
          <th>Sacos</th>
          <th>Total</th>
          <th>Rasgado(s)</th>
        </tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>
    ${totalRasgadosPDF>0 ? '<div style="font-size:10px;color:#5A574F;margin-top:-6px;margin-bottom:14px">⚠️ Os sacos/fardos rasgados ficam separados fisicamente do estoque bom e não foram descontados da coluna "Total" acima.</div>' : ''}
    <script>window.onload=()=>window.print()<\/script>
  </body></html>`;
  const blob = new Blob([html], {type:'text/html'});
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  console.log('[gerarPDF] PDF de conferência gerado com sucesso:', conf.numero, '— local:', localPDFLabel, '— itens:', Object.keys(conf.itens).length);
  toast('📄 PDF gerado para ' + conf.numero);
}

// PDF de lista de contagem em branco (para anotação manual)
// Itens 14, 15: imprimir APENAS itens selecionados (flagados) e visíveis, respeitando permissões
function gerarPDFListaContagem(){
  // Regra central de permissões
  const cpL = confPerm();
  const filtroForcado = confPerfilFiltro();
  const almoxFiltro = filtroForcado || (document.getElementById('confAlmox') ? document.getElementById('confAlmox').value : 'todos');
  const q = (document.getElementById('confSearch')||{value:''}).value.toLowerCase();
  const fonte = CONF_ITEMS.length > 0 ? CONF_ITEMS : ITEMS;

  // Itens 14/15: filtrar APENAS itens que estão selecionados (flagados) E visíveis na tela
  const itensFiltrados = fonte.filter(item => {
    // Deve estar selecionado
    if(!CONF_ITENS_SEL.has(item.cod)) return false;
    // Filtro de almoxarifado
    if(almoxFiltro === 'almox3'    && !item.temAlmox3)    return false;
    if(almoxFiltro === 'almox30'   && !item.temAlmox30)   return false;
    if(almoxFiltro === 'rejunte'   && !item.temRejunte)   return false;
    if(almoxFiltro === 'separacao' && !item.temSeparacao) return false;
    // Segurança: nunca imprimir item de local sem permissão
    // Regra: exibir se o perfil tem permissão para PELO MENOS UM dos locais do item
    if(!cpL.acessoTotal){
      const pA3  = !!item.temAlmox3    && cpL.podeContarAlmox3;
      const pA30 = !!item.temAlmox30   && cpL.podeContarAlmox30;
      const pRej = !!item.temRejunte   && cpL.podeContarRejunte;
      const pSep = !!item.temSeparacao && cpL.podeContarSeparacao;
      if(!pA3 && !pA30 && !pRej && !pSep) return false;
    }
    // Filtro de pesquisa
    if(q && !item.cod.toLowerCase().includes(q) && !item.name.toLowerCase().includes(q)) return false;
    return true;
  });
  const verAlmox3L  = cpL.podeContarAlmox3  || cpL.podeContarRejunte;
  const verAlmox30L = cpL.podeContarAlmox30;

  if(itensFiltrados.length === 0){ toast('Nenhum item para imprimir. Verifique os filtros.'); return; }

  // Ajuste 3: verificar se todos os itens são rejunte (sem paletes)
  const todosSaoRejunte = itensFiltrados.length > 0 && itensFiltrados.every(i => i.temRejunte);
  const unidColHeader = todosSaoRejunte ? 'Fardos' : 'Sacos';

  // Cabeçalho da tabela conforme permissões e tipo de item
  const colsHeader = verAlmox3L && verAlmox30L
    ? `<th>Local</th>${!todosSaoRejunte ? '<th style="width:70px;text-align:center">Paletes</th>' : ''}<th style="width:70px;text-align:center">${unidColHeader}</th><th style="width:120px">Observação</th>`
    : `${!todosSaoRejunte ? '<th style="width:70px;text-align:center">Paletes</th>' : ''}<th style="width:70px;text-align:center">${unidColHeader}</th><th style="width:140px">Observação</th>`;

  // Gerar linhas com rótulo dinâmico do local (item 4)
  const linhas = itensFiltrados.map((item, i) => {
    const bg = i % 2 === 0 ? '#fff' : '#F7F5F0';
    const lblLinha = localLabel(item);
    const isRejL = !!item.temRejunte;
    const unidLinha = isRejL ? 'Fardos' : 'Sacos';
    if(verAlmox3L && verAlmox30L){
      // Acesso completo: duas linhas por item
      return `
        <tr style="background:${bg}">
          <td rowspan="2" style="vertical-align:middle"><b>${item.cod}</b><br><span style="font-size:10px;color:#5A574F">${item.name}</span></td>
          <td style="text-align:center;font-size:10px;font-weight:700">${lblLinha}</td>
          ${!todosSaoRejunte ? '<td style="text-align:center"></td>' : ''}
          <td style="text-align:center"></td>
          <td></td>
        </tr>
        <tr style="background:${bg}">
          <td style="text-align:center;font-size:10px;color:#2E7D32;font-weight:700">Almox 30</td>
          ${!todosSaoRejunte ? '<td style="text-align:center"></td>' : ''}
          <td style="text-align:center"></td>
          <td></td>
        </tr>`;
    } else {
      // Apenas um almoxarifado
      return `
        <tr style="background:${bg}">
          <td><b>${item.cod}</b><br><span style="font-size:10px;color:#5A574F">${item.name}</span></td>
          ${!isRejL ? '<td style="text-align:center"></td>' : ''}
          <td style="text-align:center"></td>
          <td></td>
        </tr>`;
    }
  }).join('');

  const nomeUsuario = (USUARIO_LOGADO && USUARIO_LOGADO.nome) || '—';
  const labelPerfil = perfil().label || '';
  const agora = new Date();
  const dataHoraStr = agora.toLocaleDateString('pt-BR') + ' ' + agora.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  // Título dinâmico da lista (inclui SEPARAÇÃO)
  const almoxLabel = (!cpL.podeContarAlmox3 && !cpL.podeContarRejunte && !cpL.podeContarSeparacao && cpL.podeContarAlmox30)
    ? 'Almox 30'
    : (cpL.podeContarRejunte && cpL.podeContarSeparacao && !cpL.podeContarAlmox30 && !cpL.acessoTotal)
    ? 'Rejunte / Separação'
    : (cpL.podeContarRejunte && !cpL.podeContarSeparacao && !cpL.podeContarAlmox30 && !cpL.acessoTotal)
    ? 'Rejunte / Área Líquida'
    : (cpL.podeContarSeparacao && !cpL.podeContarRejunte && !cpL.podeContarAlmox30 && !cpL.acessoTotal)
    ? 'Separação'
    : (cpL.podeContarAlmox3 && !cpL.podeContarAlmox30 && !cpL.podeContarRejunte && !cpL.podeContarSeparacao)
    ? 'Almox 3'
    : almoxFiltro === 'almox3' ? 'Almox 3'
    : almoxFiltro === 'almox30' ? 'Almox 30'
    : almoxFiltro === 'rejunte' ? 'Rejunte / Área Líquida'
    : almoxFiltro === 'separacao' ? 'Separação'
    : 'Todos os Almoxarifados';

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Lista de Contagem</title>
  <style>
    body{font-family:'Segoe UI',sans-serif;margin:36px;color:#1C1C1A;font-size:12px}
    h1{font-size:20px;color:#1B5C7A;text-align:center;margin:0}
    h2{font-size:11px;color:#5A574F;text-align:center;margin:4px 0 16px}
    .rn{font-size:13px;font-weight:700;color:#1B5C7A;text-align:center;margin-bottom:20px;border:2px solid #1B5C7A;display:inline-block;padding:4px 20px;border-radius:6px}
    .ctr{text-align:center}
    hr{border:none;border-top:2px solid #1B5C7A;margin:14px 0}
    table{width:100%;border-collapse:collapse;margin-bottom:14px}
    th{background:#1B5C7A;color:#fff;padding:8px;text-align:left;font-size:10px;text-transform:uppercase}
    td{padding:9px 8px;border:1px solid #DDD9D0;min-height:28px}
    .info{display:flex;gap:12px;margin-bottom:14px}
    .ibox{flex:1;border:1px solid #DDD9D0;border-radius:6px;padding:9px}
    .ibox .l{font-size:9px;color:#9C9888;text-transform:uppercase;margin-bottom:2px}
    .ibox .v{font-size:12px;font-weight:600}
    .assin{display:flex;gap:20px;margin-top:48px}
    .ab{flex:1;text-align:center}
    .aline{border-top:1px solid #1C1C1A;padding-top:6px;margin-top:56px;font-size:10px;color:#5A574F;line-height:1.5}
    @media print{body{margin:20px}}
  </style></head>
  <body>
    <div style="text-align:center;margin-bottom:12px"><div style="font-size:24px">📋</div></div>
    <h1>LISTA DE CONTAGEM FÍSICA</h1>
    <h2>Conferência de Estoque — Almoxarifado</h2>
    <div class="ctr"><div class="rn">${almoxLabel}</div></div><hr>
    <div class="info">
      <div class="ibox"><div class="l">Data / Hora</div><div class="v">${dataHoraStr}</div></div>
      <div class="ibox"><div class="l">Conferente</div><div class="v">${nomeUsuario}</div></div>
      <div class="ibox"><div class="l">Perfil</div><div class="v">${labelPerfil}</div></div>
      <div class="ibox"><div class="l">Total de Itens</div><div class="v">${itensFiltrados.length}</div></div>
    </div>
    <table>
      <thead><tr><th style="min-width:160px">Item</th>${colsHeader}</tr></thead>
      <tbody>${linhas}</tbody>
    </table>
    <div class="assin">
      <div class="ab"><div class="aline">Conferente<br><strong>${nomeUsuario}</strong></div></div>
      <div class="ab"><div class="aline">Supervisor<br>&nbsp;</div></div>
    </div>
    <script>window.onload=()=>window.print()<\/script>
  </body></html>`;

  const blob = new Blob([html], {type:'text/html'});
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  toast('🖨️ Lista de contagem aberta para impressão');
}

function gerarPDF(){
  const itens=st.itens||[];
  const tp=itens.reduce((a,b)=>a+b.paletes,0),ts=itens.reduce((a,b)=>a+b.sacos,0);
  const iR=itens.map(it=>{
    const spp=getSacsPorPal(it.cod),p=calcPaletes(it.sacos,spp),r=it.sacos-(p*spp);
    const fmt=p===0?it.sacos+' sc':r===0?p+' pal ('+it.sacos+' sc)':p+' pal + '+r+' sc ('+it.sacos+' sc)';
    return`<tr><td>${it.cod}</td><td>${it.name}</td><td>${p}</td><td>${it.sacos}</td><td><strong>${fmt}</strong></td></tr>`;
  }).join('');
  const html=`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${st.req}</title>
  <style>body{font-family:'Segoe UI',sans-serif;margin:36px;color:#1C1C1A;font-size:12px}
  h1{font-size:20px;color:#1B5C7A;text-align:center;margin:0}h2{font-size:11px;color:#5A574F;text-align:center;margin:4px 0 16px}
  .rn{font-size:14px;font-weight:700;color:#1B5C7A;text-align:center;margin-bottom:20px;border:2px solid #1B5C7A;display:inline-block;padding:4px 20px;border-radius:6px}.ctr{text-align:center}
  hr{border:none;border-top:2px solid #1B5C7A;margin:14px 0}table{width:100%;border-collapse:collapse;margin-bottom:14px}
  th{background:#1B5C7A;color:#fff;padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase}
  td{padding:6px 8px;border-bottom:1px solid #DDD9D0}tr:nth-child(even) td{background:#F7F5F0}
  .tot td{background:#E8F2F7;font-weight:700;color:#1B5C7A}.info{display:flex;gap:12px;margin-bottom:14px}
  .ibox{flex:1;border:1px solid #DDD9D0;border-radius:6px;padding:9px}.ibox .l{font-size:9px;color:#9C9888;text-transform:uppercase;margin-bottom:2px}
  .ibox .v{font-size:12px;font-weight:600}.assin{display:flex;gap:20px;margin-top:48px}.ab{flex:1;text-align:center}
  .aline{border-top:1px solid #1C1C1A;padding-top:6px;margin-top:56px;font-size:10px;color:#5A574F;line-height:1.5}
  @media print{body{margin:20px}}</style></head>
  <body><div style="text-align:center;margin-bottom:12px"><div style="font-size:24px">📦</div></div>
  <h1>REQUISIÇÃO DE TRANSFERÊNCIA</h1><h2>Almox 30 → Almox 3</h2>
  <div class="ctr"><div class="rn">${st.req}</div></div><hr>
  <table><tr><th>Código</th><th>Material</th><th>Paletes</th><th>Sacos</th><th>Quantidade</th></tr>
  ${iR}<tr class="tot"><td colspan="2">TOTAL</td><td>${tp} paletes</td><td>${ts} sacos</td><td></td></tr></table>
  <div class="info">
    <div class="ibox"><div class="l">Data/Hora</div><div class="v">${st.dataHora}</div></div>
    <div class="ibox"><div class="l">Aprovador</div><div class="v">${st.aprovador||'—'}</div></div>
    ${st.obs?'<div class="ibox"><div class="l">Obs</div><div class="v">'+st.obs+'</div></div>':''}
  </div>
  <div class="assin">
    <div class="ab"><div class="aline">Aprovador<br><strong>${st.aprovador||'—'}</strong></div></div>
    <div class="ab"><div class="aline">Operador<br>&nbsp;</div></div>
    <div class="ab"><div class="aline">Confirmação Sistema<br>&nbsp;</div></div>
  </div>
  <script>window.onload=()=>window.print()<\/script></body></html>`;
  const blob=new Blob([html],{type:'text/html'});const url=URL.createObjectURL(blob);window.open(url,'_blank');toast('PDF aberto para impressão');
}

// ─── PDF: Monitoramento de Auditoria por Item (NOVA FUNCIONALIDADE) ─
// Exporta exatamente a lista que está filtrada na tela (mesma busca, mesmo
// filtro de produto/almoxarifado/situação/data) — o que você vê é o que sai no PDF.
function gerarPDFAuditoriaItens(){
  const { cods, porItem, pendPorItem } = _calcularAuditoriaFiltrada();
  if(cods.length === 0){ toast('Nenhum item para exportar. Verifique os filtros.'); return; }

  const linhas = cods.map((cod, i) => {
    const regs = porItem[cod] || [];
    const pend = pendPorItem[cod] || [];
    const maisRecente = regs[0];
    const nome = (maisRecente && maisRecente.nome) || (pend[0] && pend[0].nome) || '';
    const totalDiv = regs.filter(r=>r.resultado==='Divergência').length;
    const ultimoAjuste = regs.find(r=>r.investigacao && r.investigacao.status==='Resolvido' && r.investigacao.motivo===MOTIVO_AJUSTE_ERP);

    let statusTxt, statusCor;
    if(pend.length>0){ statusTxt = 'Aguardando auditoria'; statusCor = '#8A6A00'; }
    else if(!maisRecente){ statusTxt = '—'; statusCor = '#9C9888'; }
    else if(!maisRecente.investigacao){ statusTxt = 'Validado'; statusCor = '#2D7D46'; }
    else if(maisRecente.investigacao.status==='Resolvido'){ statusTxt = 'Resolvido'; statusCor = '#1B5C7A'; }
    else { statusTxt = 'Em investigação (' + _diasAberta(maisRecente.dataHora) + ')'; statusCor = '#B83232'; }

    const bg = i % 2 === 0 ? '#fff' : '#F7F5F0';
    return `<tr style="background:${bg}">
      <td><b>${cod}</b><br><span style="font-size:10px;color:#5A574F">${nome}</span></td>
      <td style="text-align:center">${regs.length}</td>
      <td style="text-align:center">${totalDiv}</td>
      <td style="text-align:center;font-weight:700;color:${statusCor}">${statusTxt}</td>
      <td style="text-align:center;font-size:10px">${maisRecente ? maisRecente.dataHora : '—'}</td>
      <td style="text-align:center;font-size:10px;color:#B85C00">${ultimoAjuste ? ultimoAjuste.investigacao.resolvidoDataHora.split(' ')[0] : '—'}</td>
    </tr>`;
  }).join('');

  const nomeUsuario = (USUARIO_LOGADO && USUARIO_LOGADO.nome) || '—';
  const agora = new Date();
  const dataHoraStr = agora.toLocaleDateString('pt-BR') + ' ' + agora.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Auditoria de Estoque — Monitoramento por Item</title>
  <style>
    body{font-family:'Segoe UI',sans-serif;margin:36px;color:#1C1C1A;font-size:12px}
    h1{font-size:20px;color:#1B5C7A;text-align:center;margin:0}
    h2{font-size:11px;color:#5A574F;text-align:center;margin:4px 0 16px}
    hr{border:none;border-top:2px solid #1B5C7A;margin:14px 0}
    table{width:100%;border-collapse:collapse;margin-bottom:14px}
    th{background:#1B5C7A;color:#fff;padding:8px;text-align:left;font-size:10px;text-transform:uppercase}
    td{padding:8px;border:1px solid #DDD9D0}
    .info{display:flex;gap:12px;margin-bottom:14px}
    .ibox{flex:1;border:1px solid #DDD9D0;border-radius:6px;padding:9px}
    .ibox .l{font-size:9px;color:#9C9888;text-transform:uppercase;margin-bottom:2px}
    .ibox .v{font-size:12px;font-weight:600}
    @media print{body{margin:20px}}
  </style></head>
  <body>
    <h1>AUDITORIA DE ESTOQUE</h1>
    <h2>Monitoramento por Item</h2>
    <hr>
    <div class="info">
      <div class="ibox"><div class="l">Data / Hora</div><div class="v">${dataHoraStr}</div></div>
      <div class="ibox"><div class="l">Gerado por</div><div class="v">${nomeUsuario}</div></div>
      <div class="ibox"><div class="l">Total de Itens</div><div class="v">${cods.length}</div></div>
    </div>
    <table>
      <thead><tr><th>Item</th><th style="text-align:center">Auditorias</th><th style="text-align:center">Divergências</th><th style="text-align:center">Status Atual</th><th style="text-align:center">Última Auditoria</th><th style="text-align:center">Sistema Ajustado Em</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
    <script>window.onload=()=>window.print()<\/script>
  </body></html>`;

  const blob = new Blob([html], {type:'text/html'});
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  toast('🖨️ Relatório de auditoria aberto para impressão');
}
