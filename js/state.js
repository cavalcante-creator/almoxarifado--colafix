// ===== Estado global da aplicação (variáveis compartilhadas entre módulos) =====
// ─── ESTADO GLOBAL ───────────────────────────────────────────────
let ITEMS=[], CAPACIDADE_MAP={}, INV_ITEMS=[], SALDO_BRUTO=[], USUARIO_LOGADO=null;
let HISTORY=[], PENDENTES=[], REQS_REMOVIDAS=new Set();
let selectedItems=new Set(), st={}, sysChecked={};
let histSort={col:'data',asc:false}, selectedReq=null;
let currentPendIdx=null;
let _pollingInterval=null;
let _pollingInterval2=null;
let _sessionTimeout=null;
let _sessionToken=null;
// Rastreabilidade mínima: registra tentativas de login malsucedidas (em memória, por sessão de página)
let LOGIN_TENTATIVAS_FALHAS = {};
let IS_EDITING=false;
const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutos
function resetSessionTimeout(){
  if(!USUARIO_LOGADO)return;
  if(_sessionTimeout)clearTimeout(_sessionTimeout);
  _sessionTimeout=setTimeout(()=>{
    if(USUARIO_LOGADO){
      alert('Sessão encerrada por inatividade. Faça login novamente.');
      logout(true);
    }
  },SESSION_TIMEOUT_MS);
}
['click','keydown','touchstart'].forEach(ev=>document.addEventListener(ev,resetSessionTimeout,{passive:true}));
let filtroPeriodo='hoje', dtCustomInicio=null, dtCustomFim=null;
let CONFERENCIAS={}, MODO_CEGO=false;
let CONF_ITEMS=[]; // Itens carregados de INVENTARIO_ITENS para a Conferência
let CONF_HISTORICO=[]; // Histórico de conferências salvas
let DIV_HISTORICO=[]; // [LEGADO] Histórico de divergências investigadas (módulo antigo, mantido para não perder dados já existentes)
let _invAtual=null; // divergência em investigação

// ─── AUDITORIA DE ESTOQUE (NOVA FUNCIONALIDADE) ─────────────────────
// Histórico permanente de auditorias (Supervisor Sistema). Persistido em
// localStorage porque o backend (Apps Script) atual não tem uma rota própria
// para isso — dá pra evoluir para o Sheets depois, sem mudar a interface.
let AUDITORIA_HISTORICO = [];
let _auditAtual = null; // validação/investigação em andamento no modal
function salvarAuditoriaLocal(){
  try { localStorage.setItem('auditoria_historico', JSON.stringify(AUDITORIA_HISTORICO)); } catch(e){}
}
function carregarAuditoriaLocal(){
  try {
    const raw = localStorage.getItem('auditoria_historico');
    AUDITORIA_HISTORICO = raw ? JSON.parse(raw) : [];
  } catch(e){ AUDITORIA_HISTORICO = []; }
}
