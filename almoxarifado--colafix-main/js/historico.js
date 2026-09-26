// ===== Aba Histórico de requisições =====
// ─── HISTÓRICO ────────────────────────────────────────────────────
function atualizarHistorico(status){
  const tp=(st.itens||[]).reduce((a,b)=>a+(b.paletes||0),0);
  const ts=(st.itens||[]).reduce((a,b)=>a+(b.sacos||0),0);
  const entrada={
    req:st.req,data:st.dataHora,itens:st.itens||[],paletes:tp,sacos:ts,
    solicitante:st.solicitante||'—',aprovador:st.aprovador||'—',
    operador:st.operador||'—',conferente:st.conferente||'—',
    sysUser:st.sysUser||'—',sysDoc:st.sysDoc||'—',
    status,
    statusSistemico: st.statusSistemico || 'Pendente',
    statusFisico: st.statusFisico || 'Pendente',
    tipo: st.tipo || 'Transferência Normal',
    obs: st.obs||''
  };
  const idx=HISTORY.findIndex(h=>h.req===st.req);
  if(idx>=0)HISTORY[idx]=entrada;else HISTORY.unshift(entrada);
  salvarHistoricoSheets(entrada);renderHist();
}
function salvarHist(status){atualizarHistorico(status);}
function renderStats(){
  const t=HISTORY.length,c=HISTORY.filter(h=>h.status==='Concluído').length,p=HISTORY.filter(h=>h.status==='Em andamento').length;
  const pl=HISTORY.filter(h=>h.status==='Concluído').reduce((a,b)=>a+b.paletes,0);
  document.getElementById('statGrid').innerHTML=`<div class="stat-box"><div class="stat-num">${t}</div><div class="stat-lbl">Total</div></div><div class="stat-box"><div class="stat-num" style="color:var(--green)">${c}</div><div class="stat-lbl">Concluídas</div></div><div class="stat-box"><div class="stat-num" style="color:var(--yellow)">${p}</div><div class="stat-lbl">Em andamento</div></div><div class="stat-box"><div class="stat-num">${pl}</div><div class="stat-lbl">Paletes transf.</div></div>`;
}
function renderHist(){
  const q=(document.getElementById('histSearch').value||'').toLowerCase();
  const f=(document.getElementById('histFilter')||{}).value||'';
  dtCustomInicio=(document.getElementById('dtInicio')||{}).value||null;
  dtCustomFim=(document.getElementById('dtFim')||{}).value||null;
  let data=[...HISTORY];
  // Filtro período
  data=data.filter(h=>isInPeriodo(h.data));
  if(q)data=data.filter(h=>h.req.toLowerCase().includes(q)||h.aprovador.toLowerCase().includes(q)||h.operador.toLowerCase().includes(q)||(h.itens||[]).some(i=>i.cod.toLowerCase().includes(q)||i.name.toLowerCase().includes(q)));
  if(f){
    if(f==='Pendente Físico') data=data.filter(h=>h.statusFisico==='Pendente');
    else if(f==='Concluído Físico') data=data.filter(h=>h.statusFisico==='Concluída');
    else if(f==='Rasgados') data=data.filter(h=>(h.itens||[]).some(it=>(Number(it.qtdRasgada)||0)>0));
    else if(f==='SemAvaria') data=data.filter(h=>!(h.itens||[]).some(it=>(Number(it.qtdRasgada)||0)>0));
    else data=data.filter(h=>h.status===f);
  }
  data.sort((a,b)=>{
    let av=a[histSort.col]||'',bv=b[histSort.col]||'';
    if(typeof av==='number')return histSort.asc?av-bv:bv-av;
    return histSort.asc?String(av).localeCompare(String(bv)):String(bv).localeCompare(String(av));
  });
  const tbody=document.getElementById('histBody');tbody.innerHTML='';
  const empty=document.getElementById('histEmpty');
  const cnt=document.getElementById('histCount');
  if(data.length===0){empty.style.display='block';if(cnt)cnt.textContent='';return;}
  empty.style.display='none';
  if(cnt)cnt.textContent=data.length+' registro(s)';
  data.forEach(h=>{
    const sp=h.status==='Concluído'?'sp-done':(h.status==='Rejeitado'||h.status==='Excluído')?'sp-rej':'sp-pend';
    const aguardFis = h.statusSistemico === 'Confirmado' && h.statusFisico === 'Pendente';
    const names=(h.itens||[]).map(i=>i.cod).join(', ');
    const temRasgadoReq=(h.itens||[]).reduce((a,it)=>a+(Number(it.qtdRasgada)||0),0);
    const tr=document.createElement('tr');tr.className=selectedReq===h.req?'sel-row':'';tr.style.cursor='pointer';
    const stSist = h.statusSistemico === 'Confirmado' ? 'sb-done' : 'sb-pending';
    const stFis = h.statusFisico === 'Concluída' ? 'sb-done' : 'sb-pending';
    tr.innerHTML=`<td>
        <strong style="color:var(--accent)">${h.req}</strong> ${temRasgadoReq>0?rasgoTagHTML(temRasgadoReq):''}
        <div style="font-size:9px;color:var(--text3);margin-top:2px;font-weight:700">${h.tipo === 'Antecipada' ? '🚀 ANTECIPADA' : '📦 NORMAL'}</div>
        ${aguardFis ? `<div style="margin-top:4px;font-size:9px;font-weight:700;background:var(--orange-dim);color:var(--orange);border:1px solid var(--orange-mid);border-radius:4px;padding:2px 6px;display:inline-block">🟠 Aguard. Mov. Física</div>` : `<div style="display:flex;gap:4px;margin-top:4px">
          <span class="status-badge ${stSist}" title="Sistêmica">S: ${h.statusSistemico||'Pendente'}</span>
          <span class="status-badge ${stFis}" title="Física">F: ${h.statusFisico||'Pendente'}</span>
        </div>`}
      </td>
      <td style="color:var(--text2);white-space:nowrap">${h.data}</td>
      <td style="color:var(--text2);font-size:11px">${names}</td>
      <td style="text-align:center;font-weight:700">${h.paletes}</td>
      <td style="text-align:center">${h.sacos}</td>
      <td>${h.aprovador}</td>
      <td>${h.operador||'—'}</td>
      <td><span class="status-pill ${sp}">${h.status}</span></td>`;
    tr.onclick=()=>showDetail(h);tbody.appendChild(tr);
  });
}
function sortHist(col){histSort={col,asc:histSort.col===col?!histSort.asc:false};renderHist();}
function showDetail(h){
  selectedReq=h.req;
  const panel=document.getElementById('detailPanel'),el=document.getElementById('detailContent');
  const sp=h.status==='Concluído'?'sp-done':(h.status==='Rejeitado'||h.status==='Excluído')?'sp-rej':'sp-pend';
  const aguardFisDet = h.statusSistemico === 'Confirmado' && h.statusFisico === 'Pendente';
  const stColor2={'aprovado':'var(--accent)','movido':'var(--yellow)','validado':'var(--green)','lancado':'var(--green)'};
  const stBg={'aprovado':'var(--accent-dim)','movido':'var(--yellow-dim)','validado':'var(--green-dim)','lancado':'var(--green-dim)'};
  const stLabel={'aprovado':'Aprovado','movido':'Movido','validado':'Validado','lancado':'Confirmado'};
  const tp=(h.itens||[]).reduce((a,b)=>a+(b.paletes||0),0);
  const ts=(h.itens||[]).reduce((a,b)=>a+(b.sacosValidados||b.sacos||0),0);
  const iR=(h.itens||[]).map(it=>{
    const spp=getSacsPorPal(it.cod),sc=it.sacosValidados||it.sacos||0,pal=calcPaletes(sc,spp);
    const ist=it.itemStatus||'aprovado',cor=stColor2[ist]||'var(--text3)',bg=stBg[ist]||'var(--bg3)';
    const qtdRasgD=Number(it.qtdRasgada)||0;
    const qtdAprovadaD=Number(it.sacosAprovados);
    const divergeQtd = !isNaN(qtdAprovadaD) && qtdAprovadaD>0 && qtdAprovadaD!==sc;
    return`<tr><td><span style="font-weight:700;color:var(--accent)">${it.cod}</span></td>
      <td style="color:var(--text2);font-size:11px">${it.name}${divergeQtd?`<div style="margin-top:3px;font-size:9px;color:var(--orange)">📦 Aprovado: ${qtdAprovadaD} sc · Movimentado: ${sc} sc</div>`:''}${qtdRasgD>0?`<div style="margin-top:4px">${rasgoTagHTML(qtdRasgD)}
          <div style="margin-top:3px;font-size:9px;font-weight:700">${rasgoResumoHTML(qtdRasgD, sc)}</div>
          <div style="color:var(--text3);font-size:9px;margin-top:2px">👤 ${escapeHTML(it.rasgoApontadoPor||'—')} · 🕐 ${it.rasgoDataHora||'—'}</div>
          ${it.motivoRasgo?`<div style="color:var(--text3);font-size:9px;margin-top:2px">📝 ${escapeHTML(it.motivoRasgo)}</div>`:''}
        </div>`:''}</td>
      <td style="text-align:center;font-weight:700">${pal>0?pal:'—'}</td>
      <td style="text-align:center">${sc}</td>
      <td style="text-align:center"><span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:${bg};color:${cor}">${stLabel[ist]||ist}</span></td></tr>`;
  }).join('');
  const tlHtml=(h.itens||[]).map(it=>{
    const ist=it.itemStatus||'aprovado',cor=stColor2[ist]||'var(--text3)';
    const spp=getSacsPorPal(it.cod),sc=it.sacosValidados||it.sacos||0,pal=calcPaletes(sc,spp);
    const qtdRasgTl=Number(it.qtdRasgada)||0;
    const etapas=[
      {label:'Aprovação',ico:'✅',done:true,resp:h.aprovador,time:it.timeAprovado||h.data},
      {label:'Movimentação',ico:'📦',done:ist==='movido'||ist==='validado'||ist==='lancado',resp:it.operador,time:it.timeMovido},
      {label:'Confirmação',ico:'💻',done:ist==='lancado',resp:it.sysUser||h.sysUser,time:it.timeLancado,doc:it.sysDoc||h.sysDoc}
    ];
    return`<div style="margin-bottom:18px;padding-bottom:18px;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="font-size:11px;font-weight:800;color:var(--text);background:var(--bg3);border:1px solid var(--border2);border-radius:5px;padding:2px 9px">${it.cod}</span>
        <span style="font-size:11px;color:var(--text2);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${it.name}</span>
        ${qtdRasgTl>0?rasgoTagHTML(qtdRasgTl):''}
        <span style="font-size:12px;font-weight:800;color:${cor};flex-shrink:0">${pal>0?pal+' pal · ':''}${sc} sc</span>
      </div>
      ${etapas.map(e=>`<div class="tl-item"><div class="tl-dot ${e.done?'done':''}"></div>
        <div><div style="font-size:12px;font-weight:700;color:${e.done?'var(--text)':'var(--text3)'}">${e.ico} ${e.label}</div>
        <div style="font-size:11px;color:var(--text2)">${e.done&&e.resp&&e.resp!=='—'?e.resp+(e.doc&&e.doc!=='—'?' · '+e.doc:''):'Pendente'}</div>
        ${e.done&&e.time&&e.time!=='—'?`<div style="font-size:10px;color:var(--text3)">🕐 ${e.time}</div>`:''}
        </div></div>`).join('')}
    </div>`;
  }).join('');
  el.innerHTML=`<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px">
    <div><div style="font-size:20px;font-weight:700;color:var(--accent);display:flex;align-items:center;gap:8px;flex-wrap:wrap">${h.req} ${(()=>{const tot=(h.itens||[]).reduce((a,it)=>a+(Number(it.qtdRasgada)||0),0);return tot>0?rasgoTagHTML(tot):'';})()}</div>
    <div style="font-size:11px;font-weight:800;color:var(--text2);margin-top:2px">${h.tipo === 'Antecipada' ? '🚀 TRANSFERÊNCIA ANTECIPADA' : '📦 TRANSFERÊNCIA NORMAL'}</div>
    <div style="font-size:11px;color:var(--text3);margin-top:2px">${h.data}${h.obs?' · '+h.obs:''}</div>
    ${aguardFisDet ? `<div style="margin-top:6px;font-size:11px;font-weight:700;background:var(--orange-dim);color:var(--orange);border:1px solid var(--orange-mid);border-radius:6px;padding:4px 10px;display:inline-block">🟠 Aguardando Movimentação Física</div>` : ''}
    </div>
    <span class="status-pill ${sp}" style="font-size:12px;padding:4px 12px;margin-top:4px">${h.status}</span>
  </div>
  <div class="detail-grid">
    <div>
      <div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Materiais</div>
      <table class="hist-table" style="margin-bottom:14px">
        <thead><tr><th>Código</th><th>Material</th><th style="text-align:center">Pal.</th><th style="text-align:center">Sacos</th><th style="text-align:center">Status</th></tr></thead>
        <tbody>${iR}<tr style="background:var(--accent-dim)"><td colspan="2" style="font-weight:700;color:var(--accent)">Total</td><td style="text-align:center;font-weight:700;color:var(--accent)">${tp}</td><td style="text-align:center;font-weight:700;color:var(--accent)">${ts}</td><td></td></tr></tbody>
      </table>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
        <div class="info-chip"><div class="l">Aprovador</div><div class="v">${h.aprovador}</div></div>
        <div class="info-chip"><div class="l">Operador</div><div class="v">${h.operador||'—'}</div></div>
        ${h.sysUser&&h.sysUser!=='—'?`<div class="info-chip"><div class="l">Sistema</div><div class="v">${h.sysUser}</div></div>`:''}
        ${h.sysDoc&&h.sysDoc!=='—'?`<div class="info-chip"><div class="l">Doc. sistema</div><div class="v" style="color:var(--accent)">${h.sysDoc}</div></div>`:''}
      </div>
    </div>
    <div>
      <div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:12px">Linha do tempo por item</div>
      ${tlHtml}
    </div>
  </div>`;
  panel.style.display='block';renderHist();
  setTimeout(()=>panel.scrollIntoView({behavior:'smooth',block:'start'}),100);
}
function closeDetail(){document.getElementById('detailPanel').style.display='none';selectedReq=null;renderHist();}
function exportCSV(){
  const rows=[['Req.','Data','Itens','Paletes','Sacos','Aprovador','Operador','Status']];
  HISTORY.forEach(h=>rows.push([h.req,h.data,(h.itens||[]).map(i=>i.cod).join(';'),h.paletes,h.sacos,h.aprovador,h.operador||'—',h.status]));
  const csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='historico_almox.csv';a.click();URL.revokeObjectURL(url);toast('CSV exportado!');
}
