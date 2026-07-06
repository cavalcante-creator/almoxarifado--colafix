// ===== Barra de linha do tempo do fluxo de requisição =====
// ─── TIMELINE VISUAL ──────────────────────────────────────────────
function renderTimelineBar(containerId,stepAtual){
  const c=document.getElementById(containerId);if(!c)return;
  let steps=[
    {label:'Aprovação',ico:'✅'},
    {label:'PDF'},
    {label:'Movimentação',ico:'📦'},
    {label:'Confirmação',ico:'💻'},
    {label:'Concluído',ico:'🏁'}
  ];
  
  if(st && st.tipo === 'Antecipada') {
    steps = [
      {label:'Aprovação',ico:'✅'},
      {label:'PDF'},
      {label:'Confirmação',ico:'💻'},
      {label:'Movimentação',ico:'📦'},
      {label:'Concluído',ico:'🏁'}
    ];
  }

  let html='<div class="timeline-bar">';
  steps.forEach((s,i)=>{
    const cls=i+1<stepAtual?'done':i+1===stepAtual?'active':'';
    if(i>0)html+=`<div class="tl-line ${i<stepAtual?'done':''}"></div>`;
    html+=`<div class="tl-node"><div class="tl-node-dot ${cls}"></div><div class="tl-node-label ${cls}">${s.label}</div></div>`;
  });
  html+='</div>';
  c.innerHTML=html;
}
