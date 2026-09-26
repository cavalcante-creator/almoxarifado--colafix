// ===== Funções utilitárias genéricas (datas, formatação, toast, navegação de abas) =====
// ─── UTILS ───────────────────────────────────────────────────────
function now(){const d=new Date();return d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});}
function nowFull(){const d=new Date();return d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});}
function toast(msg,dur=2600){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),dur);}
function showPage(id,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  const pg=document.getElementById(id);if(pg)pg.classList.add('active');btn.classList.add('active');
  if(id==='pg-hist'){renderStats();renderHist();}
  if(id==='pg-op'){renderOpOrders();}
  if(id==='pg-conferencia'){if(CONF_MODO!=='conferencia'){CONF_MODO='selecao';const sc=document.getElementById('confSelCard');const pc=document.getElementById('confPainelConf');if(sc)sc.style.display='block';if(pc)pc.style.display='none';}atualizarSelectsConferencia();renderFiltrosRapidosConf();filtrarItensConf();renderConfHistorico();}
  if(id==='pg-divergencias'){renderDivergencias();renderDivHistorico();}
  if(id==='pg-pendencias'){renderPendentes();}
  if(id==='pg-expedicao'){carregarEmailLog();}
}
function getSt(s,m){if(s<=0||s<m)return'red';if(s<m*1.5)return'yellow';return'green';}
function stColor(s){return s==='red'?'var(--red)':s==='yellow'?'var(--yellow-mid)':'var(--green)';}
function stCB(s){return s==='red'?'cb-red':s==='yellow'?'cb-yellow':'cb-green';}
function stPip(s){return s==='red'?'pip-red':s==='yellow'?'pip-yellow':'pip-green';}
function calcPaletes(sacos,sacsPorPal){const spp=88;if(!sacos||sacos<spp)return 0;return Math.floor(sacos/spp);}
function getSacsPorPal(cod){
  return 88; // Agora o múltiplo é fixo em 88 conforme solicitado
}
function fmtQty(sacos,cod){
  const spp=getSacsPorPal(cod);
  const pal=calcPaletes(sacos,spp),resto=sacos-(pal*spp);
  if(pal===0)return sacos+' sc';
  if(resto===0)return pal+' pal ('+sacos+' sc)';
  return pal+' pal + '+resto+' sc ('+sacos+' sc)';
}
function calcItem(item){
  const spp=getSacsPorPal(item.cod);
  const capacidade=item.min30||item.capSac||0;
  const need=Math.max(0,capacidade-item.saldo3);
  const palNec=calcPaletes(need,spp);
  const palDisp=Math.floor(item.saldo30/spp);
  const palEf=Math.min(palNec,palDisp);
  const sacosEf=palEf*spp;
  return{palEf,sacosEf,sacsPorPal:spp};
}
function parseDMY(s){if(!s)return null;const pt=s.split(' ')[0];const[d,m,y]=pt.split('/');return new Date(+y,+m-1,+d);}
function isInPeriodo(dataStr){
  const d=parseDMY(dataStr);if(!d)return true;
  const hoje=new Date();hoje.setHours(0,0,0,0);
  if(filtroPeriodo==='todos')return true;
  if(filtroPeriodo==='hoje'){const dd=new Date(d);dd.setHours(0,0,0,0);return dd.getTime()===hoje.getTime();}
  if(filtroPeriodo==='7d'){const lim=new Date(hoje);lim.setDate(lim.getDate()-6);return d>=lim;}
  if(filtroPeriodo==='30d'){const lim=new Date(hoje);lim.setDate(lim.getDate()-29);return d>=lim;}
  if(filtroPeriodo==='custom'){
    const ini=dtCustomInicio?new Date(dtCustomInicio+'T00:00:00'):null;
    const fim=dtCustomFim?new Date(dtCustomFim+'T23:59:59'):null;
    if(ini&&d<ini)return false;
    if(fim&&d>fim)return false;
    return true;
  }
  return true;
}
function setPeriodo(p,btn){
  filtroPeriodo=p;
  document.querySelectorAll('.periodo-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const cp=document.getElementById('customPeriodo');
  if(p==='custom'){cp.style.display='flex';}else{cp.style.display='none';}
  renderHist();
}
