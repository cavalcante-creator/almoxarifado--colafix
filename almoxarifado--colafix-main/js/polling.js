// ===== Atualização periódica (polling) de dados em segundo plano =====
// ─────────────────────────────────────────────────────────────────
async function carregarRequisicoesPendentes(){
  try{
    const rowsReq=await fetchRange('REQUISICOES!A2:B');
    PENDENTES=rowsReq.filter(r=>r[0]&&r[0]!=='CONCLUIDO'&&r[1]).map(r=>{try{return JSON.parse(r[1]);}catch(e){return null;}}).filter(p=>p&&!REQS_REMOVIDAS.has(p.req));
    const rowsHist=await fetchRange('HISTORICO!A2:B');
    HISTORY=rowsHist.filter(r=>r[0]&&r[1]).map(r=>{try{return JSON.parse(r[1]);}catch(e){return null;}}).filter(Boolean).reverse();
    if(currentPendIdx!==null && st && st.req){
      const activeReqId=st.req;
      const newIdx=PENDENTES.findIndex(p=>p.req===activeReqId);
      if(newIdx>=0){
        // Manter o estado local se estiver em edição, garantindo que o tipo seja preservado
        const pend = PENDENTES[newIdx];
        if(!st.tipo && pend.tipo) st.tipo = pend.tipo;
        PENDENTES[newIdx]=JSON.parse(JSON.stringify(st));
        currentPendIdx=newIdx;
      } else {
        currentPendIdx=null;st={};
      }
    }
    renderPendentes();
    renderHist();
    renderDivergencias();
    // Auto-abrir removido para evitar conflitos com a navegação manual de pendências
    /*
    if(!USUARIO_LOGADO)return;
    const pf=perfil();if(Object.keys(st).length>0)return;
    if(pf.podeTransferir&&!pf.podeAdmin){
      const pend=PENDENTES.find(p=>(p.itens||[]).some(it=>it.itemStatus==='movido'));
      if(pend){currentPendIdx=PENDENTES.indexOf(pend);st=JSON.parse(JSON.stringify(pend));renderPendentes();setTimeout(()=>restaurarStep(4),150);}
    }
    */
  }catch(e){console.error('carregarPendentes:',e);}
}
function iniciarPolling(){
  if(_pollingInterval)clearInterval(_pollingInterval);
  _pollingInterval=setInterval(async()=>{
    if(!USUARIO_LOGADO||document.visibilityState==='hidden'||IS_EDITING)return;
    await carregarRequisicoesPendentes();
    if(perfil().verTabOp)renderOpOrders();
  },30000);
}
// Atualização periódica: primeiro carrega SALDO+CAPACIDADE, depois INVENTARIO_ITENS (que refiltra ITEMS)
// Melhoria 5: não atualiza enquanto usuário estiver editando (IS_EDITING)
// Melhoria 6: armazenado em _pollingInterval2 para limpeza no logout
if(_pollingInterval2)clearInterval(_pollingInterval2);
_pollingInterval2=setInterval(async()=>{
  if(USUARIO_LOGADO&&document.visibilityState!=='hidden'&&!IS_EDITING){
    await carregarSheetsData();
    await carregarInventarioItens();
  }
},60000);
