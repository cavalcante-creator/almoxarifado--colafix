// ===== Painel mobile do Operador =====
// ─── OPERADOR MOBILE ──────────────────────────────────────────────
function renderOpOrders(){
  const list=document.getElementById('opOrderList');
  const empty=document.getElementById('opEmpty');
  if(!list)return;
  const minhas=PENDENTES.filter(p=>p.step>=2&&p.step<5&&(p.itens||[]).some(it=>it.itemStatus!=='lancado'));
  if(minhas.length===0){list.innerHTML='';empty.style.display='block';return;}
  empty.style.display='none';list.innerHTML='';
  minhas.forEach(p=>{
    const div=document.createElement('div');div.className='op-card';
    const movidos=(p.itens||[]).filter(it=>it.itemStatus==='movido'||it.itemStatus==='lancado').length;
    const total=(p.itens||[]).length;
    const badgeColor=movidos===total?'var(--green-dim)':movidos>0?'var(--yellow-dim)':'var(--accent-dim)';
    const badgeTextColor=movidos===total?'var(--green)':movidos>0?'var(--yellow)':'var(--accent)';
    const badgeText=movidos===total?'✅ Todos movidos':movidos+'/'+total+' movido(s)';
    div.innerHTML=`<div class="op-card-header">
      <div class="op-req-num">${p.req}</div>
      <span class="op-badge" style="background:${badgeColor};color:${badgeTextColor}">${badgeText}</span>
    </div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:12px">Aprovado por: <b>${p.aprovador||'—'}</b> · ${p.dataHora||''}</div>
    <div id="opItems_${p.req}"></div>`;
    list.appendChild(div);
    const itemsDiv=div.querySelector('#opItems_'+p.req);
    (p.itens||[]).forEach((it,idx)=>{
      const realIdx=PENDENTES.indexOf(p);
      const movido=it.itemStatus==='movido'||it.itemStatus==='lancado';
      if(it.sacosAprovados===undefined) it.sacosAprovados = it.sacos;
      const spp=getSacsPorPal(it.cod),pal=calcPaletes(it.sacos,spp);
      const row=document.createElement('div');row.className='op-item-row';
      const qtdRasgadaAtual=Number(it.qtdRasgada)||0;
      const rasgado=qtdRasgadaAtual>0;
      const idKey=opRasgoId(p.req, idx);
      row.id='opRow_'+idKey;
      row.style.borderLeft=`4px solid ${rasgado?'var(--red)':movido?'var(--green)':'var(--accent)'}`;
      const qtdRealBlockOp = !movido ? `
        <div style="margin:8px 0;padding:8px;border-radius:8px;background:var(--bg2);border:1px solid var(--border)">
          <div style="display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap">
            <div class="fld" style="width:120px">
              <label>📦 Qtd. Real</label>
              <input type="number" inputmode="numeric" min="0" max="${it.sacosAprovados||0}" value="${it.sacos||''}" placeholder="0"
                id="opQtdReal_${idKey}" oninput="setQtdRealOp('${p.req}',${idx}, this.value)" style="text-align:center;font-weight:700;height:38px">
            </div>
            <div style="font-size:10px;color:var(--text3);padding-bottom:8px">aprovado: ${it.sacosAprovados||0} sc — reduza se faltar material</div>
          </div>
        </div>` : '';
      row.innerHTML=`<div class="op-item-name">${it.cod} — ${it.name} <span id="opRasgoBadge_${idKey}">${rasgado?rasgoTagHTML(qtdRasgadaAtual):''}</span></div>
        <div class="op-item-qty" id="opQtyDisplay_${idKey}">${pal>0?pal+' pal · ':''}${it.sacos} sc</div>
        ${qtdRealBlockOp}
        <div style="margin:8px 0;padding:8px;border-radius:8px;background:${rasgado?'var(--red-dim)':'var(--bg2)'};border:1px solid ${rasgado?'var(--red-mid)':'var(--border)'}">
          <div style="display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap">
            <div class="fld" style="width:120px">
              <label>⚠️ Qtd. Rasgada</label>
              <input type="number" inputmode="numeric" min="0" max="${it.sacos||0}" value="${qtdRasgadaAtual||''}" placeholder="0"
                id="opQtdRasgada_${idKey}" oninput="setQtdRasgadaOp('${p.req}',${idx}, this.value)" style="text-align:center;font-weight:700;height:38px">
            </div>
            <div id="opMaxHint_${idKey}" style="font-size:10px;color:var(--text3);padding-bottom:8px">de ${it.sacos||0} movimentado(s)</div>
          </div>
          <div id="opRasgoResumo_${idKey}" style="margin-top:6px;font-size:11px;font-weight:700">${rasgoResumoHTML(qtdRasgadaAtual, it.sacos)}</div>
          <div id="opRasgoObsWrap_${idKey}" style="display:${rasgado?'block':'none'};margin-top:6px">
            <textarea class="rasgo-obs" placeholder="Motivo/Avaria (opcional)" oninput="updateMotivoRasgoOp('${p.req}',${idx}, this.value)">${escapeHTML(it.motivoRasgo||'')}</textarea>
          </div>
        </div>
        ${movido
          ?`<div class="op-moved">✅ Movido — ${it.timeMovido||''}${perfil().podeAdmin?` <button onclick="desfazerMovOp('${p.req}',${idx})" title="Desfazer (Admin)" style="margin-left:8px;height:26px;padding:0 8px;background:#fff;border:1px solid var(--green);border-radius:6px;font-size:10px;color:var(--green);cursor:pointer">↩ Desfazer</button>`:''}</div>`
          :`<button class="op-move-btn btn-primary" onclick="opMarcarMovido('${p.req}',${idx})" style="height:48px;border-radius:10px;border:none;font-size:15px;font-weight:800;cursor:pointer;background:var(--accent);color:#fff">📦 Marcar como Movido</button>`
        }`;
      itemsDiv.appendChild(row);
    });
  });
}
// ─── AJUSTE DE QUANTIDADE REAL MOVIMENTADA — PAINEL DO OPERADOR ────
function setQtdRealOp(reqId, itemIdx, val){
  const p = PENDENTES.find(x=>x.req===reqId); if(!p) return;
  const it = p.itens[itemIdx]; if(!it) return;
  if(it.sacosAprovados===undefined) it.sacosAprovados = it.sacos;
  const max = Number(it.sacosAprovados)||0;
  let n = Math.max(0, parseInt(val)||0);
  if(n>max){ n=max; toast('⚠️ Não é possível movimentar mais do que foi aprovado ('+max+').'); }
  it.sacos = n;
  const spp=getSacsPorPal(it.cod);
  it.paletes = calcPaletes(n, spp);
  it.sacosValidados = n;
  if((Number(it.qtdRasgada)||0) > n) it.qtdRasgada = n;
  salvarRequisicaoSheets(p);
  const idKey=opRasgoId(reqId, itemIdx);
  const pal2=calcPaletes(it.sacos,spp);
  const qtyDisplay=document.getElementById('opQtyDisplay_'+idKey);
  if(qtyDisplay) qtyDisplay.textContent = (pal2>0?pal2+' pal · ':'')+it.sacos+' sc';
  const maxHint=document.getElementById('opMaxHint_'+idKey);
  if(maxHint) maxHint.textContent = 'de '+it.sacos+' movimentado(s)';
  atualizarUIRasgoOp(reqId, itemIdx);
}
function desfazerMovOp(reqId,itemIdx){
  if(!perfil().podeAdmin){toast('⛔ Apenas o Administrador pode desfazer.');return;}
  const p=PENDENTES.find(x=>x.req===reqId);if(!p)return;
  const it=p.itens[itemIdx];if(!it)return;
  if(!confirm('Desfazer a movimentação de "'+it.cod+'"?\n\nO item voltará para "aguardando movimentação".'))return;
  it.itemStatus='aprovado';
  delete it.timeMovido;delete it.operador;
  salvarRequisicaoSheets(p);
  atualizarHistoricoReq(p,'Em andamento');
  renderOpOrders();
  toast('↩ Movimentação desfeita para '+it.cod);
}
function opMarcarMovido(reqId,itemIdx){
  const p=PENDENTES.find(x=>x.req===reqId);if(!p)return;
  const it=p.itens[itemIdx];if(!it)return;
  const nome=(USUARIO_LOGADO&&USUARIO_LOGADO.nome)||'Operador';
  it.itemStatus='movido';it.timeMovido=nowFull();it.operador=nome;
  if(!p.operador)p.operador=nome;
  if(!p.step||p.step<3)p.step=3;
  salvarRequisicaoSheets(p);
  atualizarHistoricoReq(p,'Em andamento');
  renderOpOrders();
  toast(`📦 ${it.cod} marcado como Movido!`);
  const todos=(p.itens||[]).every(it2=>it2.itemStatus==='movido'||it2.itemStatus==='lancado');
  if(todos)toast('✅ Todos os itens movidos! Iasmyn pode confirmar no sistema.',3000);
}
function atualizarHistoricoReq(req,status){
  const tp=(req.itens||[]).reduce((a,b)=>a+(b.paletes||0),0);
  const ts=(req.itens||[]).reduce((a,b)=>a+(b.sacos||0),0);
  const entrada={
    req:req.req,data:req.dataHora,itens:req.itens||[],paletes:tp,sacos:ts,
    solicitante:req.solicitante||'—',aprovador:req.aprovador||'—',
    operador:req.operador||'—',conferente:req.conferente||'—',
    sysUser:req.sysUser||'—',sysDoc:req.sysDoc||'—',
    status,obs:req.obs||''
  };
  const idx=HISTORY.findIndex(h=>h.req===req.req);
  if(idx>=0)HISTORY[idx]=entrada;else HISTORY.unshift(entrada);
  salvarHistoricoSheets(entrada);
}
