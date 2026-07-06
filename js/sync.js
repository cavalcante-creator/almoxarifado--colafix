// ===== Sincronização de estado local com PENDENTES/HISTORY e navegação entre etapas =====
// ─── SYNC ─────────────────────────────────────────────────────────
function syncPendente(){
  if(currentPendIdx!==null&&currentPendIdx<PENDENTES.length){
    PENDENTES[currentPendIdx]=JSON.parse(JSON.stringify(st));
    salvarRequisicaoSheets(st);
  }
}
function removePendente(){
  if(currentPendIdx!==null){
    const req=PENDENTES[currentPendIdx];
    if(req){removerRequisicaoSheets(req.req);REQS_REMOVIDAS.add(req.req);}
    PENDENTES.splice(currentPendIdx,1);currentPendIdx=null;
  }
}
function restaurarStep(s){
  const pf=perfil();
  const isAntecipada = st && st.tipo === 'Antecipada';
  
  // Operador: não usa o painel de estoque, usa pg-op
  if(pf.label === 'Operador') return;

  if(s===1 && (pf.podeAprovar || pf.podeAdmin)){
    document.getElementById('rn1').textContent=st.req;
    document.getElementById('fData').textContent=st.dataHora;
    popularSelectCodigos();renderApEditList();
  } else if(s===2){
    document.getElementById('rn2').textContent=st.req;
    document.getElementById('aprovadorNome2').textContent=st.aprovador||'—';
    renderTimelineBar('timelineBar2',2);renderS2Items();
  } else if(s===3){
    // No fluxo normal s=3 é Movimentação. Na Antecipada s=3 é Confirmação.
    if(isAntecipada) {
      // Correção 1: incluir podeAprovar — o Supervisor (Iasmyn) tem podeAprovar mas não podeTransferir
      if(pf.podeTransferir || pf.podeAdmin || pf.podeAprovar) {
        document.getElementById('rn4').textContent=st.req;
        const sysEl=document.getElementById('sysUser');
        if(sysEl&&USUARIO_LOGADO)sysEl.value=USUARIO_LOGADO.nome;
        renderSysCL();
      }
    } else {
      if(pf.podeMovFisica || pf.podeAdmin) {
        document.getElementById('rn3').textContent=st.req;
        const opEl=document.getElementById('opName');
        if(opEl&&USUARIO_LOGADO)opEl.value=USUARIO_LOGADO.nome;
        renderMovChecklist();
      }
    }
  } else if(s===4){
    // No fluxo normal s=4 é Confirmação. Na Antecipada s=4 é Movimentação.
    if(isAntecipada) {
      if(pf.podeMovFisica || pf.podeAdmin) {
        document.getElementById('rn3').textContent=st.req;
        const opEl=document.getElementById('opName');
        if(opEl&&USUARIO_LOGADO)opEl.value=USUARIO_LOGADO.nome;
        renderMovChecklist();
      }
    } else {
      if(pf.podeTransferir || pf.podeAdmin) {
        document.getElementById('rn4').textContent=st.req;
        const sysEl=document.getElementById('sysUser');
        if(sysEl&&USUARIO_LOGADO)sysEl.value=USUARIO_LOGADO.nome;
        renderSysCL();
      }
    }
  }
  setStep(s);
}
function setStep(s){
  const isAntecipada = st && st.tipo === 'Antecipada';
  const mapping = [1, 2, 3, 4, 5]; // Ordem padrão: Aprovação(1), PDF(2), Mov(3), Conf(4), Concl(5)
  
  // No HTML: fs1=Aprovação, fs2=PDF, fs3=Movimentação, fs4=Confirmação, fs5=Concluído
  // Se Antecipada, a ordem lógica dos passos muda para: 1 -> 2 -> 4 -> 3 -> 5
  
  if(isAntecipada) {
    // Atualizar os labels dos passos no flowbar
    const fs3 = document.getElementById('fs3');
    const fs4 = document.getElementById('fs4');
    if(fs3 && fs4) {
      fs3.innerHTML = '<div class="step-ico">💻</div><div class="step-lbl">Confirmação</div><div class="step-sub">Iasmyn</div>';
      fs4.innerHTML = '<div class="step-ico">📦</div><div class="step-lbl">Movimentação</div><div class="step-sub">Operador</div>';
    }
    
    // Mapear o passo atual 's' para a exibição correta
    // Se s=3 (Movimentação no fluxo normal), na antecipada ele deve mostrar a tela s4 (Confirmação)
    // Se s=4 (Confirmação no fluxo normal), na antecipada ele deve mostrar a tela s3 (Movimentação)
    const displayMap = {1:'s1', 2:'s2', 3:'s4', 4:'s3', 5:'s5'};
    ['s1','s2','s3','s4','s5'].forEach(id => {
      const el = document.getElementById(id);
      if(el) el.style.display = (id === displayMap[s]) ? 'block' : 'none';
    });
    
    // Atualizar classes do flowbar seguindo a nova ordem: fs1 -> fs2 -> fs3(Conf) -> fs4(Mov) -> fs5
    const flowOrder = ['fs1', 'fs2', 'fs3', 'fs4', 'fs5'];
    flowOrder.forEach((id, i) => {
      const el = document.getElementById(id);
      if(el) el.className = 'fstep ' + (i+1 < s ? 'done' : i+1 === s ? 'active' : 'pending');
    });

  } else {
    // Restaurar labels originais se não for antecipada
    const fs3 = document.getElementById('fs3');
    const fs4 = document.getElementById('fs4');
    if(fs3 && fs4) {
      fs3.innerHTML = '<div class="step-ico">📦</div><div class="step-lbl">Movimentação</div><div class="step-sub">Operador</div>';
      fs4.innerHTML = '<div class="step-ico">💻</div><div class="step-lbl">Confirmação</div><div class="step-sub">Iasmyn</div>';
    }
    
    ['s1','s2','s3','s4','s5'].forEach((id,i)=>{const el=document.getElementById(id);if(el)el.style.display=i+1===s?'block':'none';});
    ['fs1','fs2','fs3','fs4','fs5'].forEach((id,i)=>{const el=document.getElementById(id);if(el)el.className='fstep '+(i+1<s?'done':i+1===s?'active':'pending');});
  }
}
function voltarSelecao(){
  if(currentPendIdx!==null){
    if(!confirm('Isso vai apagar permanentemente esta requisição. Deseja continuar?')) return;
    const req=PENDENTES[currentPendIdx];
    if(req){
      removerRequisicaoSheets(req.req);
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
        obs: '',
        excluidoPor: (USUARIO_LOGADO && USUARIO_LOGADO.nome) || '—',
        excluidoEm: nowFull()
      };
      const idxHist=HISTORY.findIndex(h=>h.req===req.req);
      if(idxHist>=0) HISTORY[idxHist]=entradaExcluida; else HISTORY.unshift(entradaExcluida);
      salvarHistoricoSheets(entradaExcluida);
    }
    PENDENTES.splice(currentPendIdx,1);currentPendIdx=null;
  }
  st={};selectedItems=new Set();renderItems();setStep(0);renderHist();
}
function resetar(){st={};selectedItems=new Set();sysChecked={};currentPendIdx=null;renderItems();setStep(0);}
function mostrarLinhaDoTempo(req){
  const s1=document.getElementById('s1');if(!s1)return;
  const stepAtual=req.step||1;
  const stepNomes=['','Aprovação','PDF','Movimentação','Confirmação Sistema','Concluído'];
  const eventos=[
    {label:'Aprovação',ico:'✅',done:stepAtual>1,resp:req.aprovador},
    {label:'PDF Emitido',ico:'📄',done:stepAtual>2,resp:stepAtual>2?'Gerado':'—'},
    {label:'Movimentação',ico:'📦',done:stepAtual>3,resp:req.operador},
    {label:'Confirmação',ico:'💻',done:stepAtual>=4,resp:req.sysUser},
  ];
  const tlHtml=eventos.map(e=>`<div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:10px">
    <div style="font-size:14px;flex-shrink:0">${e.done?e.ico:'○'}</div>
    <div><div style="font-size:12px;font-weight:700;color:${e.done?'var(--green)':'var(--text3)'}">${e.label}</div>
    <div style="font-size:11px;color:var(--text3)">${e.done&&e.resp&&e.resp!=='—'?e.resp:'Aguardando...'}</div></div>
  </div>`).join('');
  s1.innerHTML=`<div class="card-title">📋 Monitoramento — Req. <span style="color:var(--accent)">${req.req}</span></div>
  <div class="aarea">
    <div class="banner bninfo" style="font-size:11px">📍 Etapa atual: <b>${stepNomes[stepAtual]||'Em andamento'}</b></div>
    <div style="margin:12px 0">${tlHtml}</div>
    <div class="brow"><button class="btn" onclick="voltarAoPainel()">← Voltar</button></div>
  </div>`;
  setStep(1);
}
function voltarAoPainel(){st={};currentPendIdx=null;selectedItems=new Set();renderItems();setStep(0);renderPendentes();}
