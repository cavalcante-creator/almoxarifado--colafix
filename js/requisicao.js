// ===== Criação, reprovação e aprovação de requisições =====
// ─── REQUISIÇÃO ───────────────────────────────────────────────────
function iniciarRequisicao(){
  if(!sessionValida()){toast('⛔ Sessão inválida. Faça login novamente.');logout(true);return;}
  if(selectedItems.size===0){toast('Selecione ao menos 1 item');return;}
  
  st={};currentPendIdx=null;
  st.solicitante=(USUARIO_LOGADO&&USUARIO_LOGADO.nome)||'Supervisor';
  st.dataHora=nowFull();
  st.req='REQ-'+Date.now().toString().slice(-8)+'-'+Math.floor(Math.random()*90+10);
  st.tipo = 'Normal';
  st.itens=[];
  // Item 7: não depender de saldo ERP — iniciar com 0 sacos para o aprovador definir a quantidade
  selectedItems.forEach(idx=>{
    const item=ITEMS[idx];
    st.itens.push({cod:item.cod,name:item.name,paletes:0,sacos:0,sacosValidados:0,ativo:true,itemStatus:'pendente'});
  });
  st.step=1;
  
  // Abrir tela de aprovação
  document.getElementById('rn1').textContent=st.req;
  document.getElementById('fData').textContent=st.dataHora;
  document.getElementById('fTipo').value = 'Normal';
  popularSelectCodigos();
  renderApEditList();
  setStep(1);
  
  // Scroll para o painel de requisição em mobile
  if(window.innerWidth <= 768) {
    document.querySelector('.req-panel').scrollIntoView({behavior: 'smooth'});
  }
}

// ─── REPROVAÇÃO (NOVA FUNCIONALIDADE) ──────────────────────────────
function reprovar(){
  if(!st.itens || st.itens.length===0){toast('Nenhuma requisição para reprovar.');return;}
  if(!confirm('Tem certeza que deseja reprovar esta requisição?\n\nEla será registrada como Rejeitada no histórico.')) return;
  const motivo = prompt('Motivo da reprovação (opcional):') || '';
  const n=(document.getElementById('apName')||{}).value.trim()||(USUARIO_LOGADO&&USUARIO_LOGADO.nome)||'';
  // Capturar os valores digitados até o momento (mesmo que incompletos), sem exigir preenchimento
  (st.itens||[]).forEach((it,i)=>{
    const sacosEl=document.getElementById('apQtyS_'+i);
    if(sacosEl){
      const sacos=Math.max(0, parseInt(sacosEl.value)||0);
      const spp=getSacsPorPal(it.cod);
      it.sacos=sacos; it.paletes=calcPaletes(sacos,spp); it.sacosValidados=sacos;
    }
  });
  st.aprovador = n || '—';
  st.obs = motivo;
  st.motivoReprovacao = motivo;
  st.reprovadoPor = n || '—';
  st.timeReprovado = nowFull();
  st.statusSistemico='Pendente'; st.statusFisico='Pendente';
  atualizarHistorico('Rejeitado');
  toast('❌ Requisição ' + st.req + ' reprovada.');
  st={};selectedItems=new Set();currentPendIdx=null;renderItems();setStep(0);renderPendentes();
}

// ─── APROVAÇÃO ────────────────────────────────────────────────────
let _aprovando=false;
function aprovar(){
  if(_aprovando) return;
  const apEl=document.getElementById('apName');
  const n=(apEl&&apEl.value.trim())||(USUARIO_LOGADO&&USUARIO_LOGADO.nome)||'';
  if(!n){toast('Informe o nome do aprovador');return;}
  if(!st.itens||st.itens.length===0){toast('Nenhum item na requisição');return;}
  _aprovando=true;
  const btnAp=document.getElementById('btnAprovar');
  if(btnAp){btnAp.disabled=true;btnAp.textContent='Aprovando...';}

  st.tipo = document.getElementById('fTipo').value || 'Normal';
  const codsRemovidosZero=[];
  const codsQtdSuspeita=[];
  st.itens=(st.itens||[]).filter((it,i)=>{
    const chk=document.getElementById('apChk_'+i);
    if(chk && !chk.checked) return false;
    const sacosEl=document.getElementById('apQtyS_'+i);
    const sacos=sacosEl?Math.max(0,parseInt(sacosEl.value)||0):it.sacos||0;
    const spp=getSacsPorPal(it.cod);
    it.sacos=sacos;
    it.paletes=calcPaletes(sacos,spp);
    it.sacosValidados=sacos;
    it.ativo=true;
    it.itemStatus='aprovado';
    it.timeAprovado=nowFull();
    if(sacos<=0){codsRemovidosZero.push(it.cod);return false;}
    // Aviso não-bloqueante: quantidade muito acima do padrão (possível erro de digitação)
    const itemRef = ITEMS.find(x=>x.cod===it.cod);
    const baseComparacao = itemRef ? Math.max(itemRef.saldo3||0, itemRef.min3||0) : 0;
    if(sacos > 2000 || (baseComparacao>0 && sacos > baseComparacao*5)) codsQtdSuspeita.push(it.cod+' ('+sacos+' sc)');
    return true;
  });
  
  if(st.itens.length===0){
    toast('Selecione ao menos 1 item com quantidade maior que zero');
    _aprovando=false;
    if(btnAp){btnAp.disabled=false;btnAp.textContent='✅ Aprovar e emitir →';}
    return;
  }
  if(codsRemovidosZero.length>0){
    toast('⚠️ Removido(s) por estar com quantidade zero: ' + codsRemovidosZero.join(', '), 4500);
  }
  if(codsQtdSuspeita.length>0){
    toast('⚠️ Quantidade bem acima do normal, confira antes de prosseguir: ' + codsQtdSuspeita.join(', '), 5000);
  }
  
  st.aprovador=n;
  st.obs=(document.getElementById('fObs')||{}).value||'';
  st.step=2;
  st.statusSistemico = 'Pendente';
  st.statusFisico = 'Pendente';
  
  if(currentPendIdx === null) {
    PENDENTES.push(JSON.parse(JSON.stringify(st)));
    currentPendIdx = PENDENTES.length - 1;
  } else {
    PENDENTES[currentPendIdx] = JSON.parse(JSON.stringify(st));
  }
  
  salvarRequisicaoSheets(st);
  atualizarHistorico('Em andamento');
  
  // Se for Antecipada, o fluxo muda: após PDF, vai para Confirmação Sistema
  if(st.tipo === 'Antecipada') {
    toast('✅ Aprovada como ANTECIPADA! Siga para o PDF e depois Confirmação Sistema.');
  } else {
    toast('✅ Aprovada! Siga para o PDF e Movimentação Física.');
  }
  
  setTimeout(()=>gerarPDF(),200);
  setStep(2);
  document.getElementById('rn2').textContent=st.req;
  document.getElementById('aprovadorNome2').textContent=n;
  renderTimelineBar('timelineBar2',2);
  renderS2Items();
  renderPendentes();
  selectedItems=new Set();
  renderItems();
  _aprovando=false;
  if(btnAp){btnAp.disabled=false;btnAp.textContent='✅ Aprovar e emitir →';}
}

function avancarAposPDF() {
  // Agora não pula mais o passo 3, apenas o passo 3 na antecipada renderiza a Confirmação
  avancarParaProximaEtapa();
}

function avancarParaProximaEtapa() {
  if(!st.step) st.step = 1;
  st.step++;
  syncPendente();
  restaurarStep(st.step);
}
function renderS2Items(){
  const c=document.getElementById('s2ItemList');if(!c)return;
  const rows=(st.itens||[]).map(it=>{
    const spp=getSacsPorPal(it.cod),pal=calcPaletes(it.sacos,spp);
    return`<div class="mini-item"><div class="mi-cod">${escapeHTML(it.cod)}</div><div class="mi-name">${escapeHTML(it.name)}</div><div class="mi-qty">${pal>0?pal+' pal · ':''}${it.sacos} sc</div></div>`;
  }).join('');
  c.innerHTML=rows;
}
function avancarParaMovimentacao(){
  st.step=3;syncPendente();
  setStep(3);
  document.getElementById('rn3').textContent=st.req;
  const opEl=document.getElementById('opName');
  if(opEl&&USUARIO_LOGADO)opEl.value=USUARIO_LOGADO.nome;
  renderMovChecklist();
}

// ─── FORMULÁRIO APROVAÇÃO ─────────────────────────────────────────
function renderApEditList(){
  const apNameEl=document.getElementById('apName');
  if(apNameEl&&!apNameEl.value&&USUARIO_LOGADO)apNameEl.value=USUARIO_LOGADO.nome;
  const c=document.getElementById('apItemList');c.innerHTML='';
  (st.itens||[]).forEach((it,i)=>{
    const spp=getSacsPorPal(it.cod);
    const palCorretos=calcPaletes(it.sacos,spp);it.paletes=palCorretos;
    const d=document.createElement('div');
    d.style.cssText='background:#fff;border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 12px;margin-bottom:6px';
    d.innerHTML=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <input type="checkbox" id="apChk_${i}" checked onchange="toggleApItem(${i})" style="width:16px;height:16px;cursor:pointer;accent-color:var(--accent);flex-shrink:0">
      <div style="font-size:10px;color:var(--text3);font-weight:700;flex-shrink:0">${it.cod}</div>
      <div style="font-size:11px;font-weight:600;color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${it.name}</div>
      <div style="font-size:9px;color:var(--text3);flex-shrink:0">${spp} sc/pal</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px" id="apQtyRow_${i}">
      <div class="fld"><label>Paletes</label><input type="number" id="apQtyP_${i}" value="${palCorretos}" min="0" style="text-align:center;font-weight:700" oninput="syncSacosFromPal(${i})"></div>
      <div class="fld"><label>Sacos</label><input type="number" id="apQtyS_${i}" value="${it.sacos}" min="0" style="text-align:center;font-weight:700" oninput="syncPalFromSacos(${i})"></div>
    </div>`;
    c.appendChild(d);
  });
}
function toggleApItem(i){
  const chk=document.getElementById('apChk_'+i);
  const row=document.getElementById('apQtyRow_'+i);
  const ativo=chk&&chk.checked;
  if(row)row.style.display=ativo?'grid':'none';
}
function syncSacosFromPal(i){
  const p=Math.max(0,parseInt(document.getElementById('apQtyP_'+i).value)||0);
  const it=st.itens&&st.itens[i];
  const spp=getSacsPorPal(it.cod);
  document.getElementById('apQtyS_'+i).value=p*spp;
}
function syncPalFromSacos(i){
  const s=Math.max(0,parseInt(document.getElementById('apQtyS_'+i).value)||0);
  const it=st.itens&&st.itens[i];
  const spp=getSacsPorPal(it.cod);
  document.getElementById('apQtyP_'+i).value=calcPaletes(s,spp);
}
function popularSelectCodigos(){
  const sel=document.getElementById('addCod');if(!sel)return;
  sel.innerHTML='<option value="">Selecione...</option>';
  // Alteração 3: usar INV_ITEMS filtrado por ALMOX 3 (origem da requisição é sempre Almox 30 → Almox 3)
  // Exibir apenas itens com temAlmox3=TRUE (itens que pertencem ao Almox 3)
  const fonte = INV_ITEMS.length > 0 ? INV_ITEMS.filter(i=>i.temAlmox3) : ITEMS;
  fonte.forEach(item=>{
    const o=document.createElement('option');
    o.value=item.cod;
    o.textContent=item.cod+' — '+item.name.slice(0,40);
    o.dataset.name=item.name;
    sel.appendChild(o);
  });
}
function onAddCodChange(){
  const sel=document.getElementById('addCod');if(!sel)return;
  const opt=sel.options[sel.selectedIndex];
  const nameEl=document.getElementById('addName');if(nameEl)nameEl.value=opt.dataset.name||'';
}
function syncAddSac(){
  const cod=document.getElementById('addCod').value;
  const p=Math.max(0,parseInt(document.getElementById('addPal').value)||0);
  if(p>0){
    const spp=getSacsPorPal(cod);
    const s=document.getElementById('addSac');
    if(s)s.value=p*spp;
  }
}
function acrescentarItem(){
  const sel=document.getElementById('addCod');
  const cod=sel?sel.value:'';
  const nameEl=document.getElementById('addName');const name=nameEl?nameEl.value:'';
  const pal=Math.max(0,parseInt((document.getElementById('addPal')||{}).value)||0);
  const sac=Math.max(0,parseInt((document.getElementById('addSac')||{}).value)||0);
  if(!cod){toast('Selecione um código');return;}
  if(pal<=0&&sac<=0){toast('Informe paletes ou sacos');return;}
  const spp=getSacsPorPal(cod);
  const sacTotal=sac>0?sac:pal*spp;
  const palTotal=calcPaletes(sacTotal,spp);
  const exist=(st.itens||[]).find(i=>i.cod===cod);
  if(exist){exist.sacos+=sacTotal;exist.paletes=calcPaletes(exist.sacos,spp);exist.sacosValidados=exist.sacos;exist.sacosAprovados=exist.sacos;}
  else{(st.itens=st.itens||[]).push({cod,name,paletes:palTotal,sacos:sacTotal,sacosValidados:sacTotal,sacosAprovados:sacTotal,itemStatus:'pendente'});}
  syncPendente();renderApEditList();
  if(sel)sel.value='';if(nameEl)nameEl.value='';
  const palEl=document.getElementById('addPal');if(palEl)palEl.value='';
  const sacEl=document.getElementById('addSac');if(sacEl)sacEl.value='';
  toast('Item acrescentado ✓');
}
