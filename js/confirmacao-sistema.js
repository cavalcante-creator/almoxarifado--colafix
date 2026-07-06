// ===== Confirmação da transferência no sistema =====
// ─── CONFIRMAÇÃO SISTEMA ──────────────────────────────────────────
function renderSysCL(){
  const c=document.getElementById('sysChecklist');if(!c)return;c.innerHTML='';
  const pf=perfil();
  
  // Se for Antecipada, todos os itens "aprovados" já podem ser confirmados no sistema
  if(st.tipo === 'Antecipada') {
    (st.itens||[]).forEach(it => {
      if(it.itemStatus === 'aprovado' || it.itemStatus === 'pendente') it.itemStatus = 'pronto_antecipada';
    });
  }

  const itensProntos=(st.itens||[]).filter(it=>it.itemStatus==='movido' || it.itemStatus === 'pronto_antecipada');
  const itensJaLancados=(st.itens||[]).filter(it=>it.itemStatus==='lancado');
  const itensAguardando=(st.itens||[]).filter(it=>it.itemStatus==='aprovado'||it.itemStatus==='pendente');

  if(itensProntos.length===0&&itensAguardando.length>0&&itensJaLancados.length===0){
    c.innerHTML='<div style="text-align:center;padding:20px;color:var(--text3);font-size:12px">⏳ Aguardando operador mover os itens...</div>';return;
  }
  if(itensProntos.length>0){
    const hdr=document.createElement('div');
    hdr.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-bottom:8px';
    hdr.innerHTML = `<span style="font-size:10px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.06em">Prontos para confirmar (${itensProntos.length})</span>
                     <button onclick="confirmarTodosSistema()" style="font-size:10px;background:var(--green);color:#fff;border:none;border-radius:4px;padding:4px 10px;font-weight:700;cursor:pointer">✅ Confirmar Todos</button>`;
    c.appendChild(hdr);
    
    itensProntos.forEach(it=>{
      const idx=(st.itens||[]).indexOf(it);
      const spp=getSacsPorPal(it.cod),sc=it.sacosValidados||it.sacos,pal=calcPaletes(sc,spp);
      const d=document.createElement('div');
      d.style.cssText='background:var(--green-dim);border:1.5px solid var(--green-mid);border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:8px';
      d.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div><span style="font-size:11px;font-weight:800;color:var(--text);background:#fff;border:1px solid var(--border2);border-radius:4px;padding:2px 7px">${it.cod}</span>
        <span style="font-size:10px;color:var(--text3);margin-left:8px">${it.itemStatus === 'pronto_antecipada' ? 'Transferência Antecipada' : 'movido por ' + (it.operador||'operador')}</span></div>
        <div style="font-size:12px;font-weight:800;color:var(--green)">${pal>0?pal+' pal · ':''}${sc} sc</div></div>
        <div style="font-size:10px;color:var(--text2);margin-bottom:10px">${it.name}</div>
        <button onclick="lancarItem(${idx})" style="width:100%;height:36px;background:var(--accent);color:#fff;border:none;border-radius:var(--radius-sm);font-size:12px;font-weight:700;cursor:pointer">💻 Confirmar no Sistema</button>`;
      c.appendChild(d);
    });
  }
  if(itensJaLancados.length>0){
    const hdr2=document.createElement('div');
    hdr2.style.cssText='font-size:10px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.06em;margin:12px 0 8px';
    hdr2.textContent='Confirmados ('+itensJaLancados.length+')';
    c.appendChild(hdr2);
    itensJaLancados.forEach(it=>{
      const idxLanc=(st.itens||[]).indexOf(it);
      const spp=getSacsPorPal(it.cod),sc=it.sacosValidados||it.sacos,pal=calcPaletes(sc,spp);
      const d=document.createElement('div');
      d.style.cssText='background:var(--accent-dim);border:1px solid var(--accent-mid);border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between';
      d.innerHTML=`<div><span style="font-size:11px;font-weight:800;color:var(--accent)">✓ ${it.cod}</span>${it.sysDoc?`<span style="font-size:10px;color:var(--text3);margin-left:6px">${it.sysDoc}</span>`:''}</div>
        <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:11px;font-weight:700;color:var(--accent)">${pal>0?pal+' pal · ':''}${sc} sc</span>
        ${perfil().podeAdmin?`<button onclick="desfazerLancamentoItem(${idxLanc})" title="Desfazer confirmação (Admin)" style="height:26px;padding:0 8px;background:#fff;border:1px solid var(--accent);border-radius:6px;font-size:10px;color:var(--accent);cursor:pointer">↩ Desfazer</button>`:''}
        </div>`;
      c.appendChild(d);
    });
  }
  if(itensAguardando.length>0){
    const hdr3=document.createElement('div');
    hdr3.style.cssText='font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin:12px 0 8px';
    hdr3.textContent='Aguardando ('+itensAguardando.length+')';
    c.appendChild(hdr3);
    itensAguardando.forEach(it=>{
      const d=document.createElement('div');
      d.style.cssText='background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:6px;opacity:.6;display:flex;align-items:center;justify-content:space-between';
      d.innerHTML=`<span style="font-size:11px;font-weight:700;color:var(--text3)">⏳ ${it.cod}</span><span style="font-size:11px;color:var(--text3)">${it.sacos} sc</span>`;
      c.appendChild(d);
    });
  }
  const isAntecipada = st.tipo === 'Antecipada';
  const todosLancados=(st.itens||[]).every(it=>it.itemStatus==='lancado');
  const algumLancado=(st.itens||[]).some(it=>it.itemStatus==='lancado');
  
  if(algumLancado){
    const btnDiv=document.createElement('div');
    btnDiv.style.cssText='margin-top:14px;border-top:1px solid var(--border);padding-top:12px';
    
    if(isAntecipada) {
      // Na antecipada, o botão de "concluir sistema" apenas avança para o passo 4
      btnDiv.innerHTML = todosLancados 
        ? '<button onclick="concluirSistema()" style="width:100%;height:44px;background:var(--accent);color:#fff;border:none;border-radius:var(--radius-sm);font-size:14px;font-weight:700;cursor:pointer">➡️ Ir para Movimentação Física</button>'
        : '<div style="font-size:11px;color:var(--text3);text-align:center;margin-bottom:8px">Aguardando confirmar todos os itens no sistema</div>';
    } else {
      // No fluxo normal, o botão de "concluir sistema" finaliza a ordem (se movido)
      btnDiv.innerHTML = todosLancados
        ?'<button onclick="concluirSistema()" style="width:100%;height:44px;background:var(--green);color:#fff;border:none;border-radius:var(--radius-sm);font-size:14px;font-weight:700;cursor:pointer">🏁 Finalizar Transferência</button>'
        :'<div style="font-size:11px;color:var(--text3);text-align:center;margin-bottom:8px">Aguardando confirmar todos os itens</div>'
         +'<button onclick="concluirSistemaComPendentes()" style="width:100%;height:36px;background:var(--border2);color:var(--text2);border:none;border-radius:var(--radius-sm);font-size:12px;cursor:pointer">Finalizar com itens pendentes</button>';
    }
    c.appendChild(btnDiv);
  }
}
// ─── DESFAZER CONFIRMAÇÃO NO SISTEMA (NOVA FUNCIONALIDADE — SOMENTE ADMIN) ───
function desfazerLancamentoItem(idx){
  if(!perfil().podeAdmin){toast('⛔ Apenas o Administrador pode desfazer.');return;}
  const it=st.itens&&st.itens[idx];if(!it)return;
  if(!confirm('Desfazer a confirmação no sistema de "'+it.cod+'"?\n\nO item voltará para "pronto para confirmar".'))return;
  it.itemStatus = (st.tipo==='Antecipada') ? 'pronto_antecipada' : 'movido';
  delete it.timeLancado;delete it.sysUser;delete it.sysDoc;
  syncPendente();atualizarHistorico('Em andamento');
  renderSysCL();
  toast('↩ Confirmação desfeita para '+it.cod);
}
function lancarItem(idx, isBulk = false){
  const it=st.itens[idx];
  if(!it) return;
  // Permitir confirmar se status for 'movido' OU 'pronto_antecipada'
  if(it.itemStatus !== 'movido' && it.itemStatus !== 'pronto_antecipada') return;
  
  const user=(document.getElementById('sysUser')||{}).value||(USUARIO_LOGADO&&USUARIO_LOGADO.nome)||'';
  const doc=(document.getElementById('sysDoc')||{}).value||'';
  if(!user){
    if(!isBulk) {
      toast('Informe o usuário sistema');
      document.getElementById('sysUser').focus();
    }
    return false;
  }
  
    it.itemStatus='lancado';
  it.timeLancado=nowFull();
  it.sysUser=user;
  it.sysDoc=doc;
  if(!st.sysUser) st.sysUser=user;
  // Correção 1: NÃO avançar step aqui — o step só avança em concluirSistema(),
  // após todos os itens serem lançados. Avançar prematuramente causava inconsistência
  // na antecipada: o Sheets recebia step=4 mas statusSistemico ainda era 'Pendente',
  // fazendo restaurarStep(4) mostrar Movimentação Física antes da confirmação concluir.
  if(!isBulk) {
    syncPendente();
    atualizarHistorico('Em andamento');
    renderSysCL();
    toast(`✅ ${it.cod} confirmado no sistema`);
  }
  return true;
}

function confirmarTodosSistema(){
  const user=(document.getElementById('sysUser')||{}).value||(USUARIO_LOGADO&&USUARIO_LOGADO.nome)||'';
  if(!user){toast('Informe o usuário sistema');document.getElementById('sysUser').focus();return;}
  
  let count = 0;
  (st.itens||[]).forEach((it, idx) => {
    if(it.itemStatus === 'movido' || it.itemStatus === 'pronto_antecipada') {
      if(lancarItem(idx, true)) count++;
    }
  });
  
  if(count > 0) {
    syncPendente();
    atualizarHistorico('Em andamento');
    renderSysCL();
    toast(`✅ ${count} itens confirmados no sistema`);
  }
}
// Wrapper com confirmação para o caminho arriscado de finalizar com itens pendentes
function concluirSistemaComPendentes(){
  const pendentesCount=(st.itens||[]).filter(it=>it.itemStatus!=='lancado').length;
  if(!confirm('⚠️ ' + pendentesCount + ' ite(ns) ainda NÃO foram confirmados no sistema.\n\nFinalizar mesmo assim? Esses itens ficarão sem confirmação.')) return;
  concluirSistema();
}
function concluirSistema(){
  const user=(document.getElementById('sysUser')||{}).value||(USUARIO_LOGADO&&USUARIO_LOGADO.nome)||'';
  const doc=(document.getElementById('sysDoc')||{}).value||'';
  if(!user){toast('Informe o usuário sistema');return;}
  
  st.sysUser=user;
  st.sysDoc=doc;
  st.timeLancado = nowFull();
  st.statusSistemico = 'Confirmado';

  const isAntecipada = st.tipo === 'Antecipada';
  const todosMovidos = (st.itens||[]).every(it => it.itemStatus === 'movido' || it.itemStatus === 'lancado');
  
  if(isAntecipada) {
    // Antecipada: sistema confirmado ANTES da movimentação física.
    // Sempre vai para movimentação física após confirmar no sistema.
    st.step = 4;
    st.statusFisico = 'Pendente';
    syncPendente();
    atualizarHistorico('Em andamento');
    toast('💻 Sistema confirmado! Agora realize a movimentação física.');
    restaurarStep(4);
    return;
  } else {
    // Normal: sistema confirmado APÓS a movimentação física.
    if(!todosMovidos) {
      st.step = 3; 
      st.statusFisico = 'Pendente';
      syncPendente();
      atualizarHistorico('Em andamento');
      toast('💻 Parte sistêmica concluída! Ordem aguardando movimentação física.');
      resetar();
      return;
    }
  }

  // Fluxo normal com todos movidos: pode concluir definitivamente
  finalizarOrdemDefinitivamente(user, doc);
}

function finalizarOrdemDefinitivamente(user, doc) {
  st.step=5;
  st.statusFisico = 'Concluída';
  st.statusSistemico = 'Confirmado';
  if(user) st.sysUser = user;
  if(doc) st.sysDoc = doc;
  
  salvarHist('Concluído');
  removePendente();
  
  const tp=(st.itens||[]).reduce((a,b)=>a+(b.paletes||0),0);
  const ts=(st.itens||[]).reduce((a,b)=>a+(b.sacosValidados||b.sacos||0),0);
  const doneEl = document.getElementById('doneT');
  if(doneEl) {
    doneEl.innerHTML=`Req. <b>${st.req}</b><br>Aprovado por: <b>${st.aprovador||'—'}</b><br>Operador: <b>${st.operador||'—'}</b><br>Sistema: <b>${st.sysUser||user||'—'}</b>${st.sysDoc||doc?' · Doc: <b>'+(st.sysDoc||doc)+'</b>':''}<br>Total: <b>${tp} paletes · ${ts} sacos</b>`;
  }
  setStep(5);
  toast('🏁 Transferência finalizada com sucesso!');
}

// Chamado quando a movimentação física é confirmada (Antecipada: após o sistema já ter sido confirmado)
function finalizarMovimentacaoFisica() {
  const user = st.sysUser || (USUARIO_LOGADO && USUARIO_LOGADO.nome) || '—';
  const doc = st.sysDoc || '';
  st.timeMovidoFisico = nowFull();
  st.operador = (document.getElementById('opName')||{}).value || st.operador || user;
  finalizarOrdemDefinitivamente(user, doc);
}
