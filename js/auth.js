// ===== Login, aplicação de permissões e logout =====
// ─── LOGIN ────────────────────────────────────────────────────────
async function fazerLogin(){
  const user=document.getElementById('loginUser').value.trim();
  const pass=document.getElementById('loginPass').value;
  const errEl=document.getElementById('loginError');
  const loadEl=document.getElementById('loginLoading');
  errEl.style.display='none';
  if(!user||!pass){errEl.textContent='Preencha usuário e senha.';errEl.style.display='block';return;}
  loadEl.style.display='block';
  try{
    const metaUrl='https://sheets.googleapis.com/v4/spreadsheets/'+SHEETS_ID+'?key='+SHEETS_API_KEY+'&fields=sheets.properties';
    const metaRes=await fetch(metaUrl);
    if(!metaRes.ok)throw new Error('Erro ao acessar planilha');
    const meta=await metaRes.json();
    const sheets=meta.sheets||[];
    const usuSheet=sheets.find(s=>(s.properties.title||'').trim().toUpperCase()==='USUARIOS');
    if(!usuSheet)throw new Error('Aba USUARIOS não encontrada');
    const rows=await fetchRange(usuSheet.properties.title+'!A2:E100');
    // Colunas: A=USUARIO, B=SENHA, C=PERFIL, D=ATIVO (opcional), E=NOME (opcional)
    // Compatibilidade retroativa: se apenas 3 colunas (A,B,C), funciona normalmente
    const match=rows.find(r=>r[0]&&r[0].trim().toLowerCase()===user.toLowerCase()&&r[1]&&r[1].trim()===pass);
    if(!match){
      const userKey=user.toLowerCase();
      LOGIN_TENTATIVAS_FALHAS[userKey] = (LOGIN_TENTATIVAS_FALHAS[userKey]||0) + 1;
      console.warn('[login] Tentativa falha para usuário "'+user+'" — total de tentativas: '+LOGIN_TENTATIVAS_FALHAS[userKey]+' — '+nowFull());
      let msg='Usuário ou senha incorretos.';
      if(LOGIN_TENTATIVAS_FALHAS[userKey] >= 5) msg += ' (Muitas tentativas — verifique com o administrador se precisar de ajuda.)';
      errEl.textContent=msg;errEl.style.display='block';loadEl.style.display='none';return;
    }
    // Verificar ATIVO (col D) - se existir e for "NAO" ou "0", bloquear
    const ativoField=(match[3]||'').trim().toUpperCase();
    if(ativoField && (ativoField==='NAO'||ativoField==='0'||ativoField==='FALSE'||ativoField==='INATIVO')){
      errEl.textContent='Acesso desativado. Contate o administrador.';errEl.style.display='block';loadEl.style.display='none';return;
    }
    // NOME: col E se existir, senão usar col A (usuario)
    const nomeUsuario=(match[4]||match[0]||'').trim();
    let perfilKey=(match[2]||'').trim().toLowerCase();
    if(!PERFIS[perfilKey]){errEl.textContent='Perfil não reconhecido: '+(match[2]||perfilKey);errEl.style.display='block';loadEl.style.display='none';return;}
    _sessionToken=Math.random().toString(36).slice(2)+Date.now().toString(36);
    USUARIO_LOGADO={nome:nomeUsuario,perfil:perfilKey,usuario:match[0].trim(),_tok:_sessionToken};
    delete LOGIN_TENTATIVAS_FALHAS[user.toLowerCase()];
    loadEl.textContent='⏳ Carregando dados...';
    document.getElementById('loginScreen').style.display='none';
    document.getElementById('appScreen').style.display='block';
    aplicarPermissoes();setStep(0);
    carregarAuditoriaLocal();
    carregarRecebimentosLocal();
    if(typeof renderRecebimentos === 'function') renderRecebimentos();
    const overlay=document.getElementById('appLoading');if(overlay)overlay.style.display='flex';
    await carregarSheetsData();
    await carregarInventarioItens();
    await carregarRequisicoesPendentes();
    await carregarConferenciasSheets();
    await carregarAuditoriasSheets();
    await carregarRecebimentosSheets();
    await carregarFiltrosRapidosSheets();
    await carregarAuditoriasAbertasSheets();
    // [FIX] aplicarPermissoes() (linha acima) roda ANTES dos dados da planilha chegarem —
    // então a lista de itens, filtros etc. renderizavam vazios e nunca eram atualizados
    // depois que os dados realmente carregavam. Repete a decisão de navegação/render
    // agora que tudo já chegou, pra tela abrir com os itens de verdade.
    if(typeof aplicarVisibilidadeNavGrupos === 'function') aplicarVisibilidadeNavGrupos();
    iniciarPolling();
    resetSessionTimeout();
    if(overlay)overlay.style.display='none';
    loadEl.style.display='none';
    // Operador: ir direto para aba de ordens
    if(perfil().verTabOp && perfil().label === 'Operador'){
      const opTab=document.getElementById('tab-op');
      if(opTab){showPage('pg-op',opTab);}
    }
    // Demais perfis: aplicarPermissoes() (chamado logo acima) já decide o grupo/aba
    // inicial certo via aplicarVisibilidadeNavGrupos(), com base nas abas do perfil.
  }catch(err){errEl.textContent='Erro: '+err.message;errEl.style.display='block';loadEl.style.display='none';}
}
function aplicarPermissoes(){
  if(!USUARIO_LOGADO)return;
  const p=perfil();if(!p)return;
  const badge=document.getElementById('userBadge');
  if(badge){badge.textContent=USUARIO_LOGADO.nome+' • '+p.label;badge.style.display='inline';}
  
  const abasVisiveis = p.abas || [];
  const tabOp = document.getElementById('tab-op');
  if(tabOp) tabOp.style.display = p.verTabOp ? 'block' : 'none';
  if(typeof aplicarVisibilidadeNavGrupos === 'function') aplicarVisibilidadeNavGrupos();

  const btnReq=document.getElementById('btnIniciarReq');
  if(btnReq)btnReq.style.display=(p.podeRequisitar||p.podeAdmin)?'':'none';

  const fsVisib={fs1:p.podeAprovar||p.podeAdmin,fs2:true,fs3:p.podeMovFisica||p.podeAdmin,fs4:p.podeTransferir||p.podeAdmin,fs5:true};
  Object.keys(fsVisib).forEach(id=>{
    const el=document.getElementById(id);if(!el)return;
    el.style.display=fsVisib[id]?'':'none';
    const arr=el.nextElementSibling;if(arr&&arr.classList.contains('farr'))arr.style.display=fsVisib[id]?'':'none';
  });
}
function logout(forced){
  if(!forced){
    const temContagemPendente = Object.keys(CONFERENCIAS).some(cod=>{
      const c=CONFERENCIAS[cod];
      return (Number(c.pal3)||0)>0 || (Number(c.sac3)||0)>0 || (Number(c.pal30)||0)>0 || (Number(c.sac30)||0)>0 || (Number(c.qtdRasgada)||0)>0;
    });
    const temReqNaoSalva = st && st.itens && st.itens.length>0 && st.step===1 && currentPendIdx===null;
    if((temContagemPendente || temReqNaoSalva) && !confirm('Você tem uma conferência ou requisição em andamento que ainda não foi salva.\n\nSe sair agora, esses dados serão perdidos. Deseja realmente sair?')){
      return;
    }
  }
  USUARIO_LOGADO=null;
  _sessionToken=null;
  IS_EDITING=false;
  if(_pollingInterval)clearInterval(_pollingInterval);
  if(_pollingInterval2)clearInterval(_pollingInterval2);
  if(_sessionTimeout)clearTimeout(_sessionTimeout);
  document.getElementById('appScreen').style.display='none';
  document.getElementById('loginScreen').style.display='flex';
  document.getElementById('loginUser').value='';document.getElementById('loginPass').value='';
  document.getElementById('loginError').style.display='none';
  // [FIX BUG-9] Limpar TODO o estado da conferência no logout para evitar dados stale entre sessões
  ITEMS=[];CONF_ITEMS=[];INV_ITEMS=[];SALDO_BRUTO=[];st={};selectedItems=new Set();PENDENTES=[];
  CONFERENCIAS={}; CONF_HISTORICO=[]; CONF_ITENS_SEL=new Set(); CONF_MODO='selecao';
  _confHistPagina=5; DIV_HISTORICO=[];
  // [FIX-5] Limpar autosave do localStorage no logout
  try { localStorage.removeItem('conf_temp'); } catch(e){}
}
