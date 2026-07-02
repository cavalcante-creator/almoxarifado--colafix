// ===== Movimentação física dos itens aprovados =====
// ─── MOV FÍSICA ───────────────────────────────────────────────────
function renderMovChecklist(){
  const c=document.getElementById('s3CheckList');if(!c)return;c.innerHTML='';
  const pf=perfil();
  const podeMover = pf.podeMovFisica || pf.podeAdmin;
  const isAntecipada = st.tipo === 'Antecipada';
  const aguardandoFisica = isAntecipada && st.statusSistemico === 'Confirmado' && st.statusFisico === 'Pendente';

  // Atualizar banners
  const bannerNormal = document.getElementById('bannerMovFisica');
  const bannerAguard = document.getElementById('bannerAguardFisica');
  if(bannerNormal) bannerNormal.style.display = aguardandoFisica ? 'none' : 'block';
  if(bannerAguard) bannerAguard.style.display = aguardandoFisica ? 'block' : 'none';

  (st.itens||[]).forEach((it,i)=>{
    const movido=it.itemStatus==='movido'||it.itemStatus==='validado'||it.itemStatus==='lancado';
    if(it.sacosAprovados===undefined) it.sacosAprovados = it.sacos;
    const qtdRasgadaAtual=Number(it.qtdRasgada)||0;
    const rasgado=qtdRasgadaAtual>0;
    const spp=getSacsPorPal(it.cod),pal=calcPaletes(it.sacos,spp);
    const d=document.createElement('div');
    d.id='movCard_'+i;
    d.style.cssText='display:flex;flex-direction:column;padding:12px 13px;margin-bottom:8px;'
      +'background:'+(rasgado?'var(--red-dim)':movido?'var(--green-dim)':'#fff')+';'
      +'border:2px solid '+(rasgado?'var(--red)':movido?'var(--green)':'var(--border)')+';'
      +'border-radius:var(--radius-sm);transition:all .18s';
    
    let btnHtml = '';
    if(movido) {
      btnHtml = '<span style="font-size:11px;font-weight:700;color:var(--green);white-space:nowrap;flex-shrink:0">✓ Movido</span>';
      if(perfil().podeAdmin){
        btnHtml += `<button onclick="desfazerMovItem(${i})" title="Desfazer movimentação (Admin)" style="height:28px;margin-left:6px;padding:0 8px;background:none;border:1px solid var(--border2);border-radius:var(--radius-sm);font-size:10px;color:var(--text2);cursor:pointer;white-space:nowrap;flex-shrink:0">↩ Desfazer</button>`;
      }
    } else if(podeMover) {
      btnHtml = `<button onclick="confirmarItemMov(${i})" style="height:36px;padding:0 14px;background:var(--accent);color:#fff;border:none;border-radius:var(--radius-sm);font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0">✓ Marcar Movido</button>`;
    } else {
      btnHtml = '<span style="font-size:10px;color:var(--text3);font-style:italic">Aguard. Operador</span>';
    }

    const qtdRealBlock = !movido ? `
        <div style="display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap;margin-top:8px">
          <div class="fld" style="width:110px">
            <label>📦 Qtd. Real</label>
            <input type="number" inputmode="numeric" min="0" max="${it.sacosAprovados||0}" value="${it.sacos||''}" placeholder="0"
              id="movQtdReal_${i}" oninput="setQtdRealMov(${i}, this.value)" style="text-align:center;font-weight:700;height:34px">
          </div>
          <div style="font-size:10px;color:var(--text3);padding-bottom:8px">aprovado: ${it.sacosAprovados||0} sc — reduza se faltar material</div>
        </div>` : '';

    d.innerHTML='<div style="display:flex;align-items:center;gap:10px">'
      +'<div style="flex:1;min-width:0">'
      +`<div style="font-size:11px;font-weight:800;color:var(--text);display:flex;align-items:center;gap:6px;flex-wrap:wrap">${it.cod} <span id="movRasgoBadge_${i}">${rasgado?rasgoTagHTML(qtdRasgadaAtual):''}</span></div>`
      +`<div style="font-size:10px;color:var(--text3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${it.name}</div>`
      +`<div id="movQtyDisplay_${i}" style="font-size:12px;font-weight:700;color:${movido?'var(--green)':'var(--accent)'};margin-top:3px">${pal>0?pal+' pal · ':''}${it.sacos} sc</div>`
      +'</div>'+btnHtml+'</div>'
      +qtdRealBlock
      +`<div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--border)">
        <div style="display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap">
          <div class="fld" style="width:110px">
            <label>⚠️ Qtd. Rasgada</label>
            <input type="number" inputmode="numeric" min="0" max="${it.sacos||0}" value="${qtdRasgadaAtual||''}" placeholder="0"
              id="movQtdRasgada_${i}" oninput="setQtdRasgadaMov(${i}, this.value)" style="text-align:center;font-weight:700;height:34px">
          </div>
          <div id="movMaxHint_${i}" style="font-size:10px;color:var(--text3);padding-bottom:8px">de ${it.sacos||0} movimentado(s)</div>
        </div>
        <div id="movRasgoResumo_${i}" style="margin-top:6px;font-size:11px;font-weight:700">${rasgoResumoHTML(qtdRasgadaAtual, it.sacos)}</div>
        <div id="movRasgoObsWrap_${i}" style="display:${rasgado?'block':'none'};margin-top:6px">
          <textarea class="rasgo-obs" placeholder="Motivo/Avaria (opcional)" oninput="updateMotivoRasgoMov(${i}, this.value)">${escapeHTML(it.motivoRasgo||'')}</textarea>
        </div>
      </div>`;
    c.appendChild(d);
  });
  
  // Na antecipada, se todos movidos, mostra o botão de finalizar
  if(isAntecipada) {
    const todosMovidos = (st.itens||[]).every(it=>it.itemStatus==='movido'||it.itemStatus==='lancado');
    if(todosMovidos) {
      const btnDiv=document.createElement('div');
      btnDiv.style.cssText='margin-top:14px;border-top:1px solid var(--border);padding-top:12px';
      btnDiv.innerHTML=`<div style="background:var(--green-dim);border:1px solid var(--green-mid);border-radius:var(--radius-sm);padding:10px 13px;margin-bottom:10px;font-size:11px;color:var(--green);font-weight:700">✅ Todos os itens movidos fisicamente!</div>
        <button onclick="finalizarMovimentacaoFisica()" style="width:100%;height:44px;background:var(--green);color:#fff;border:none;border-radius:var(--radius-sm);font-size:14px;font-weight:700;cursor:pointer">🏁 Confirmar Movimentação Física e Concluir</button>`;
      c.appendChild(btnDiv);
    }
  }
  
  atualizarStatusMov();
}
// ─── AJUSTE DE QUANTIDADE REAL MOVIMENTADA (NOVA FUNCIONALIDADE) ───
function setQtdRealMov(i, val){
  const it = st.itens && st.itens[i]; if(!it) return;
  if(it.sacosAprovados===undefined) it.sacosAprovados = it.sacos;
  const max = Number(it.sacosAprovados)||0;
  let n = Math.max(0, parseInt(val)||0);
  if(n>max){ n=max; toast('⚠️ Não é possível movimentar mais do que foi aprovado ('+max+').'); }
  it.sacos = n;
  const spp=getSacsPorPal(it.cod);
  it.paletes = calcPaletes(n, spp);
  it.sacosValidados = n;
  // Se a qtd. rasgada já registrada ficou maior que a nova quantidade real, ajustar
  if((Number(it.qtdRasgada)||0) > n) it.qtdRasgada = n;
  syncPendente();
  const spp2=getSacsPorPal(it.cod), pal2=calcPaletes(it.sacos,spp2);
  const qtyDisplay=document.getElementById('movQtyDisplay_'+i);
  if(qtyDisplay) qtyDisplay.textContent = (pal2>0?pal2+' pal · ':'')+it.sacos+' sc';
  const maxHint=document.getElementById('movMaxHint_'+i);
  if(maxHint) maxHint.textContent = 'de '+it.sacos+' movimentado(s)';
  atualizarUIRasgoMov(i);
}

// ─── DESFAZER MOVIMENTAÇÃO (NOVA FUNCIONALIDADE — SOMENTE ADMIN) ───
function desfazerMovItem(i){
  if(!perfil().podeAdmin){toast('⛔ Apenas o Administrador pode desfazer.');return;}
  const it=st.itens&&st.itens[i];if(!it)return;
  if(!confirm('Desfazer a movimentação de "'+it.cod+'"?\n\nO item voltará para "aguardando movimentação".'))return;
  it.itemStatus='aprovado';
  delete it.timeMovido;delete it.operador;
  syncPendente();atualizarHistorico('Em andamento');
  renderMovChecklist();
  toast('↩ Movimentação desfeita para '+it.cod);
}
function confirmarItemMov(i){
  const n=(document.getElementById('opName')||{}).value||(USUARIO_LOGADO&&USUARIO_LOGADO.nome)||'';
  if(!n){toast('Informe o operador');document.getElementById('opName').focus();return;}
  const it=st.itens[i];if(!it)return;
  it.itemStatus='movido';it.timeMovido=nowFull();it.operador=n;
  if(!st.operador)st.operador=n;
  
  syncPendente();atualizarHistorico('Em andamento');
  renderMovChecklist();
  toast(`📦 ${it.cod} marcado como Movido`);
  
  const todos=(st.itens||[]).every(it=>it.itemStatus==='movido'||it.itemStatus==='validado'||it.itemStatus==='lancado');
  if(todos){
    setTimeout(()=>{
      const isAntecipada = st.tipo === 'Antecipada';
      if(isAntecipada) {
        // Na antecipada, a movimentação é o passo 4 (o último antes de concluir)
        if(confirm('Todos os itens movidos! Finalizar ordem?')) {
          finalizarOrdemDefinitivamente();
          resetar();
        }
      } else {
        // No fluxo normal, a movimentação é o passo 3, vai para o 4 (Confirmação)
        if(confirm('Todos os itens movidos! Avançar para confirmação no sistema?')){
          st.step = 4;
          syncPendente();
          restaurarStep(4);
        }
      }
    },300);
  }
}
function atualizarStatusMov(){
  const el=document.getElementById('s3Status');if(!el)return;
  const total=(st.itens||[]).length;
  const movidos=(st.itens||[]).filter(it=>it.itemStatus!=='aprovado'&&it.itemStatus!=='pendente').length;
  el.textContent=movidos===total?`✅ Todos os ${total} itens movimentados!`:`${movidos} de ${total} movido(s)`;
}
function passarParaConfirmacao(){
  st.step=4;syncPendente();setStep(4);
  document.getElementById('rn4').textContent=st.req;
  const sysEl=document.getElementById('sysUser');
  if(sysEl&&USUARIO_LOGADO)sysEl.value=USUARIO_LOGADO.nome;
  renderSysCL();
}
