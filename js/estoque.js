// ===== Aba Estoque: listagem, busca e seleção de itens =====
// ─── ESTOQUE ─────────────────────────────────────────────────────
function renderItems(){
  const sortMode=(document.getElementById('itemSortMode')||{}).value||'status';
  const filterSt=(document.getElementById('itemFilterStatus')||{}).value||'';
  const q=(document.getElementById('mainSearch')||{}).value||'';
  const ordemSt={red:0,yellow:1,green:2};
  let indexed=ITEMS.map((item,idx)=>({item,idx}));
  
  if(q){
    const ql=q.toLowerCase();
    indexed=indexed.filter(({item})=>item.cod.toLowerCase().includes(ql)||item.name.toLowerCase().includes(ql));
  }

  indexed.sort((a,b)=>{
    if(sortMode==='az')return a.item.cod.localeCompare(b.item.cod);
    if(sortMode==='za')return b.item.cod.localeCompare(a.item.cod);
    if(sortMode==='name')return a.item.name.localeCompare(b.item.name);
    const sa=getSt(a.item.saldo3,a.item.min3),sb=getSt(b.item.saldo3,b.item.min3);
    const diff=(ordemSt[sa]||0)-(ordemSt[sb]||0);
    return diff!==0?diff:a.item.cod.localeCompare(b.item.cod);
  });
  const l3=document.getElementById('itemList3'),l30=document.getElementById('itemList30'),sl=document.getElementById('selList');
  l3.innerHTML='';l30.innerHTML='';sl.innerHTML='';let crit=0;
  ITEMS.forEach(item=>{if(getSt(item.saldo3,item.min3)==='red')crit++;});
  const pf=perfil();
  const podeSel=pf.podeRequisitar||pf.podeAdmin;
  let visiveis=0;
  indexed.forEach(({item,idx})=>{
    const s3=getSt(item.saldo3,item.min3);
    if(filterSt&&s3!==filterSt)return;
    visiveis++;
    const rCalc=calcItem(item);
    const s30=item.saldo30<=0?'red':item.saldo30<rCalc.sacosEf?'red':item.saldo30<rCalc.sacosEf*2?'yellow':'green';
    const sel=selectedItems.has(idx);
    const r3=document.createElement('div');
    r3.className='item-row'+(sel?' selected':'');
    if(podeSel)r3.onclick=()=>toggleItem(idx);
    else r3.style.cursor='default';
    // Item 7: exibir apenas código, descrição e status (sem saldo sistema nem quantidade disponível)
    r3.innerHTML=`<div class="color-bar ${stCB(s3)}"></div>`
      +(podeSel?`<div class="chk ${sel?'checked':''}">${ sel?'✓':''}</div>`:'')
      +`<div class="item-info"><div class="item-cod">${escapeHTML(item.cod)}</div><div class="item-name">${escapeHTML(item.name)}</div></div>`
      +`<div class="status-pip ${stPip(s3)}"></div>`
      +(s3!=='green'?'<div class="flag-tag">⚑</div>':'');
    l3.appendChild(r3);
    const r30=document.createElement('div');r30.className='item-row';r30.style.cursor='default';
    r30.innerHTML=`<div class="color-bar ${stCB(s30)}"></div><div class="item-info"><div class="item-cod">${escapeHTML(item.cod)}</div><div class="item-name">${escapeHTML(item.name)}</div></div><div class="status-pip ${stPip(s30)}"></div>`;
    l30.appendChild(r30);
  });
  if(visiveis===0){l3.innerHTML='<div style="text-align:center;padding:18px 0;font-size:11px;color:var(--text3)">Nenhum item encontrado.</div>';l30.innerHTML='';}
  const ac=document.getElementById('alertCount');
  if(crit>0){ac.style.display='inline';ac.textContent=crit+' crítico'+(crit>1?'s':'');}else ac.style.display='none';
  const sc=document.getElementById('selCount');
  const selCard=document.getElementById('selCard');
  if(selectedItems.size>0&&podeSel){
    sc.style.display='inline';sc.textContent=selectedItems.size;selCard.style.display='block';
  }else{sc.style.display='none';selCard.style.display='none';}
  if(selectedItems.size===0){sl.innerHTML='<p style="font-size:11px;color:var(--text3);text-align:center;padding:8px 0">Clique nos itens para selecionar</p>';}
  // Item 7: exibir apenas código e descrição (sem quantidade dependente de saldo)
  else{selectedItems.forEach(idx=>{const item=ITEMS[idx];const d=document.createElement('div');d.className='mini-item';d.innerHTML=`<div class="mi-cod">${escapeHTML(item.cod)}</div><div class="mi-name">${escapeHTML(item.name)}</div>`;sl.appendChild(d);});}
  renderPendentes();
}
function toggleItem(idx){if(selectedItems.has(idx))selectedItems.delete(idx);else selectedItems.add(idx);renderItems();}
