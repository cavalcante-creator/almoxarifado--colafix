// ===== Aba Expedição: log de emails processados =====
// ─── EMAIL DE EXPEDIÇÃO ────────────────────────────────────────────
let EMAIL_LOG_CACHE = [];
async function carregarEmailLog(){
  const loading=document.getElementById('expedicaoLoading');
  const empty=document.getElementById('expedicaoEmpty');
  const table=document.getElementById('expedicaoTable');
  if(loading)loading.style.display='block';
  if(empty)empty.style.display='none';
  if(table)table.style.display='none';
  EMAIL_LOG_CACHE=[];
  try{
    // Lê direto do Sheets via API key (não depende do GAS republicado)
    console.log('[Expedicao] Buscando EMAIL_LOG no Sheets...');
    const rows=await fetchRange('EMAIL_LOG!A2:H');
    console.log('[Expedicao] Linhas recebidas:', rows ? rows.length : 0);
    if(rows && rows.length>0){
      EMAIL_LOG_CACHE=rows
        .filter(r=>r[0])
        .map(r=>({
          msgId    :String(r[0]||''),
          nf       :String(r[1]||''),
          cliente  :String(r[2]||''),
          dataEmail:String(r[3]||''),
          status   :String(r[4]||''),
          reqId    :String(r[5]||''),
          itens    :String(r[6]||'[]'),
          erro     :String(r[7]||'')
        }))
        .reverse();
      console.log('[Expedicao] Registros carregados:', EMAIL_LOG_CACHE.length);
    }
  }catch(e){
    console.error('[Expedicao] Erro ao carregar EMAIL_LOG do Sheets:', e);
    // Tenta via GAS como fallback
    try{
      const res=await fetch(APPS_SCRIPT_URL+'?acao=emailLog');
      if(!res.ok) throw new Error('HTTP '+res.status);
      const data=await res.json();
      EMAIL_LOG_CACHE=(data.registros||[]);
      console.log('[Expedicao] GAS fallback OK:', EMAIL_LOG_CACHE.length);
    }catch(e2){
      console.error('[Expedicao] GAS fallback falhou:', e2);
    }
  }
  if(loading)loading.style.display='none';
  renderEmailLog();
}
function renderEmailLog(){
  const empty=document.getElementById('expedicaoEmpty');
  const table=document.getElementById('expedicaoTable');
  const tbody=document.getElementById('expedicaoBody');
  if(!tbody)return;
  if(EMAIL_LOG_CACHE.length===0){
    if(empty)empty.style.display='block';
    if(table)table.style.display='none';
    return;
  }
  if(empty)empty.style.display='none';
  if(table)table.style.display='table';
  tbody.innerHTML='';
  EMAIL_LOG_CACHE.forEach(reg=>{
    const statusColor=reg.status==='Processado'?'var(--green)':reg.status==='Duplicado'?'var(--yellow)':'var(--red)';
    const statusBg=reg.status==='Processado'?'var(--green-dim)':reg.status==='Duplicado'?'var(--yellow-dim)':'var(--red-dim)';
    let itensHtml='';
    try{
      const itens=JSON.parse(reg.itens||'[]');
      itensHtml=itens.map(it=>`<span style="font-size:10px;background:var(--bg3);border-radius:4px;padding:1px 5px;margin:1px;display:inline-block">${escapeHTML(it.cod)}: ${it.qtd||it.sacos||0}</span>`).join('');
    }catch(e){itensHtml='<span style="color:var(--text3);font-size:10px">—</span>';}
    // Botão de ação
    let acaoHtml='';
    if(reg.status==='Processado'&&reg.reqId){
      // Verifica se já existe em PENDENTES
      const jaExiste=PENDENTES.some(p=>p.req===reg.reqId);
      acaoHtml=jaExiste
        ?`<span style="font-size:10px;color:var(--green);font-weight:700">✅ Em Pendências</span>`
        :`<button class="btn" onclick="abrirPendentePorId('${escapeHTML(reg.reqId)}')" style="height:26px;padding:0 8px;font-size:10px">🔍 Ver</button>`;
    }else if(reg.status==='Erro leitura'||reg.status==='Duplicado'){
      acaoHtml=`<span style="font-size:10px;color:var(--text3)">—</span>`;
    }
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td style="font-weight:700">${escapeHTML(reg.nf)}</td>
      <td style="font-size:11px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(reg.cliente||'—')}</td>
      <td style="white-space:nowrap;font-size:11px">${escapeHTML(reg.dataEmail)}</td>
      <td style="text-align:center"><span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:${statusBg};color:${statusColor}">${escapeHTML(reg.status)}</span></td>
      <td style="font-size:11px;color:var(--text2)">${reg.reqId?escapeHTML(reg.reqId):'—'}</td>
      <td style="max-width:180px">${itensHtml}</td>
      <td style="font-size:10px;color:var(--red);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${reg.erro?escapeHTML(reg.erro):'—'}</td>
      <td style="text-align:center">${acaoHtml}</td>
    `;
    tbody.appendChild(tr);
  });
}
function abrirPendentePorId(reqId){
  const idx=PENDENTES.findIndex(p=>p.req===reqId);
  if(idx>=0){
    carregarPendente(idx);
    toast('📧 Transferência da NF carregada!');
  }else{
    toast('⚠️ Pendência não encontrada. Atualize a página.','',3000);
  }
}
