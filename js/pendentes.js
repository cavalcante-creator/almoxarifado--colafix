// ===== Painel de requisições pendentes =====
// ─── PENDENTES ────────────────────────────────────────────────────
function renderPendentes(){
  const card=document.getElementById('pendentesCard');
  const list=document.getElementById('pendentesList');
  const cnt=document.getElementById('pendCount');
  const mainList = document.getElementById('pendListContent');
  const mainEmpty = document.getElementById('pendEmpty');
  const mainBadge = document.getElementById('pendTotalBadge');
  
  if(!card)return;
  const pf=perfil();
  const nome = (USUARIO_LOGADO && USUARIO_LOGADO.nome) || '';
  
  // Filtrar por perfil e responsabilidade
  let pendFiltrados = PENDENTES.filter(p => {
    if(pf.podeAdmin) return true;
    if(pf.label === 'Supervisor') return p.solicitante === nome || p.step === 1 || p.step === 3;
    // Correção 1: Supervisor Sistema também vê ordens antecipadas no step 3 (confirmação)
    if(pf.label === 'Supervisor Sistema') return p.step === 4 || (p.tipo === 'Antecipada' && p.step === 3);
    if(pf.label === 'Operador') return p.step === 2 || p.step === 3;
    return true;
  });

  // Atualizar badge e lista na aba "Minhas Pendências"
  if(mainList) {
    mainList.innerHTML = '';
    if(pendFiltrados.length === 0) {
      mainEmpty.style.display = 'block';
      mainBadge.style.display = 'none';
    } else {
      mainEmpty.style.display = 'none';
      mainBadge.style.display = 'inline-flex';
      mainBadge.textContent = pendFiltrados.length;
      
      pendFiltrados.forEach(p => {
        const d = document.createElement('div');
        d.className = 'pend-card';
        const stepLabels = ['', 'Aguardando Aprovação', 'PDF Gerado', 'Aguardando Movimentação', 'Aguardando Confirmação Sistema', 'Concluído'];
        const etiqLabel = (p.statusSistemico === 'Confirmado' && p.statusFisico === 'Pendente') ? '🟠 Aguardando Movimentação Física' : stepLabels[p.step];
        d.innerHTML = `
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <strong style="color:var(--accent)">${p.req}</strong>
            <span style="font-size:10px;color:var(--text3)">${p.dataHora}</span>
          </div>
          <div style="font-size:11px;font-weight:700;margin-bottom:4px">${etiqLabel}</div>
          <div style="font-size:10px;color:var(--text3)">Tipo: ${p.tipo} | Solicitante: ${p.solicitante}</div>
          <div class="brow" style="margin-top:10px">
            <button class="btn btn-primary" style="height:28px;padding:0 12px;font-size:11px" onclick="carregarPendente(${PENDENTES.indexOf(p)})">Abrir</button>
          </div>
        `;
        mainList.appendChild(d);
      });
    }
  }

  // Atualizar lista lateral (se visível)
  if(pendFiltrados.length===0){
    card.style.display='none';
    if(cnt) cnt.textContent = '0';
    return;
  }
  card.style.display='block';
  if(cnt) cnt.textContent = pendFiltrados.length;
  list.innerHTML='';
  pendFiltrados.forEach(p=>{
    const realIdx=PENDENTES.indexOf(p);
    const isActive=currentPendIdx===realIdx;
    const d=document.createElement('div');
    d.className='pend-card'+(isActive?' active-pend':'');
    const podeLixeira=pf.podeAprovar&&p.step===1;
    const lixeiraBtn=podeLixeira?`<button class="tap-target-sm" onclick="event.stopPropagation();apagarReqPendente(${realIdx})" title="Apagar" style="background:none;border:none;cursor:pointer;padding:2px 4px;color:var(--text3);font-size:14px" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--text3)'">🗑</button>`:'';
    const stepColor=p.statusSistemico==='Confirmado'&&p.statusFisico==='Pendente'?'var(--orange)':p.step===1?'var(--accent)':p.step===2?'var(--yellow)':p.step===3?'var(--green)':p.step===4?'var(--purple)':'var(--text3)';
    const emEdicaoPorOutro = p.lockedBy && p.lockedBy!==nome && p._lockedAtMs && (Date.now()-p._lockedAtMs)<5*60*1000;
    d.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">`
      +`<strong style="color:var(--accent)">${p.req}</strong>`
      +`<div style="display:flex;align-items:center;gap:6px">`
      +`<span style="font-size:10px;color:var(--text3)">${p.dataHora||''}</span>${lixeiraBtn}</div></div>`
      +(emEdicaoPorOutro?`<div style="font-size:9px;color:var(--orange);font-weight:700;margin-bottom:3px">🔒 ${p.lockedBy} está com esta requisição aberta</div>`:'')
      +`<div style="font-size:11px;color:var(--text2)">${p.itens.length} item(s) · ${p.itens.reduce((a,b)=>a+b.sacos,0)} sacos</div>`
      +`<div style="margin-top:4px"><span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:${stepColor}20;color:${stepColor}">${getEtapaNome(p)}</span></div>`;
    d.onclick=()=>carregarPendente(realIdx);
    list.appendChild(d);
  });
}
function getEtapaNome(p){
  if(p.statusSistemico === 'Confirmado' && p.statusFisico === 'Pendente') return '🟠 Aguard. Mov. Física';
  const nomes=['','Aguard. Aprovação','PDF Emitido','Em Movimentação','Aguard. Confirmação','Concluído'];
  return nomes[p.step]||'Pendente';
}
function carregarPendente(i){
  const p = PENDENTES[i];
  const nomeAtual = (USUARIO_LOGADO && USUARIO_LOGADO.nome) || '';
  // Aviso leve de concorrência: alguém pode estar editando a mesma requisição agora
  if(p && p.lockedBy && p.lockedBy !== nomeAtual && p.lockedAt){
    const minAtras = Math.round((Date.now() - new Date(p._lockedAtMs||0).getTime())/60000);
    if(p._lockedAtMs && (Date.now()-p._lockedAtMs) < 5*60*1000){
      toast('⚠️ ' + p.lockedBy + ' também está com esta requisição aberta (há ' + Math.max(0,minAtras) + ' min). Evite editar ao mesmo tempo.', 5000);
    }
  }
  currentPendIdx=i;st=JSON.parse(JSON.stringify(PENDENTES[i]));
  st.lockedBy = nomeAtual;
  st.lockedAt = nowFull();
  st._lockedAtMs = Date.now();
  if(PENDENTES[i]){PENDENTES[i].lockedBy=st.lockedBy;PENDENTES[i].lockedAt=st.lockedAt;PENDENTES[i]._lockedAtMs=st._lockedAtMs;}
  renderPendentes();
  
  const pf = perfil();
  // Se for operador, ele já está na aba pg-op, não precisa mudar
  if(!pf.verTabOp || pf.label !== 'Operador') {
    const tabEstoque = document.getElementById('tab-estoque');
    if(tabEstoque) showPage('pg-estoque', tabEstoque);
  }
  
  setTimeout(() => {
    restaurarStep(st.step);
    // Scroll para o topo do painel de requisição
    const reqPanel = document.querySelector('.req-panel');
    if(reqPanel) reqPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
}
function apagarReqPendente(idx){
  if(!confirm('Apagar esta requisição?'))return;
  const req=PENDENTES[idx];
  const motivo = prompt('Motivo da exclusão (opcional, fica registrado no histórico):') || '';
  if(req){
    removerRequisicaoSheets(req.req);
    // Rastreabilidade: registrar a exclusão no histórico para fins de auditoria
    const entradaExcluida = {
      req:req.req, data:req.dataHora, itens:req.itens||[],
      paletes:(req.itens||[]).reduce((a,b)=>a+(b.paletes||0),0),
      sacos:(req.itens||[]).reduce((a,b)=>a+(b.sacos||0),0),
      solicitante:req.solicitante||'—', aprovador:req.aprovador||'—',
      operador:req.operador||'—', conferente:req.conferente||'—',
      sysUser:req.sysUser||'—', sysDoc:req.sysDoc||'—',
      status:'Excluído',
      statusSistemico: req.statusSistemico||'Pendente',
      statusFisico: req.statusFisico||'Pendente',
      tipo: req.tipo||'Transferência Normal',
      obs: motivo,
      excluidoPor: (USUARIO_LOGADO && USUARIO_LOGADO.nome) || '—',
      excluidoEm: nowFull()
    };
    const idxHist=HISTORY.findIndex(h=>h.req===req.req);
    if(idxHist>=0) HISTORY[idxHist]=entradaExcluida; else HISTORY.unshift(entradaExcluida);
    salvarHistoricoSheets(entradaExcluida);
  }
  PENDENTES.splice(idx,1);
  if(currentPendIdx===idx){st={};currentPendIdx=null;setStep(0);}
  renderPendentes();renderHist();toast('Requisição apagada.');
}
