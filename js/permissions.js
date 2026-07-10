// ===== Perfis de acesso e regras centrais de permissão =====
// ─── PERFIS ──────────────────────────────────────────────────────
const PERFIS={
  'supervisor':{
    label:'Supervisor',abas:['pg-estoque','pg-pendencias','pg-conferencia','pg-divergencias','pg-hist','pg-expedicao'],
    podeRequisitar:true,podeAprovar:true,podeMovFisica:true,
    podeConferir:true,podeTransferir:false,podeAudit:false,podeAdmin:false,
    verTabOp:true,
    confFiltros:['COLAFIX','BAUTECH','POZOSUL','PY','UY']
  },
  'administrador':{
    label:'Administrador',abas:['pg-estoque','pg-pendencias','pg-conferencia','pg-divergencias','pg-hist','pg-expedicao'],
    podeRequisitar:true,podeAprovar:true,podeMovFisica:true,
    podeConferir:true,podeTransferir:true,podeAudit:true,podeAdmin:true,
    verTabOp:true,
    confFiltros:['COLAFIX','BAUTECH','POZOSUL','PY','UY']
  },
  'operador':{
    label:'Operador',abas:['pg-op'],
    podeRequisitar:false,podeAprovar:false,podeMovFisica:true,
    podeConferir:false,podeTransferir:false,podeAudit:false,podeAdmin:false,
    verTabOp:true
  },
  'supervisor sistema':{
    // Alteração 1: liberar conferência para Iasmyn (Supervisor Sistema)
    label:'Supervisor Sistema',abas:['pg-estoque','pg-pendencias','pg-conferencia','pg-divergencias','pg-hist','pg-expedicao'],
    podeRequisitar:false,podeAprovar:true,podeMovFisica:true,
    podeConferir:true,podeTransferir:true,podeAudit:false,podeAdmin:false,
    verTabOp:false,
    confFiltros:['COLAFIX','BAUTECH','POZOSUL','PY','UY']
  },
  'supervisorsistema':{
    // Alteração 1: liberar conferência para Iasmyn (Supervisor Sistema)
    label:'Supervisor Sistema',abas:['pg-estoque','pg-pendencias','pg-conferencia','pg-divergencias','pg-hist','pg-expedicao'],
    podeRequisitar:false,podeAprovar:true,podeMovFisica:true,
    podeConferir:true,podeTransferir:true,podeAudit:false,podeAdmin:false,
    verTabOp:false,
    confFiltros:['COLAFIX','BAUTECH','POZOSUL','PY','UY']
  },
  'conferente':{
    label:'Conferente',abas:['pg-conferencia'],
    podeRequisitar:false,podeAprovar:false,podeMovFisica:false,
    podeConferir:true,podeTransferir:false,podeAudit:false,podeAdmin:false,
    verTabOp:false,
    // Ajuste 2: restrições de almoxarifado na conferência
    confAlmox3:true,confAlmox30:false,confRejunte:false,
    confFiltros:['COLAFIX','BAUTECH','POZOSUL','PY','UY']
  },
  'conferente 2':{
    label:'Conferente 2',abas:['pg-conferencia'],
    podeRequisitar:false,podeAprovar:false,podeMovFisica:false,
    podeConferir:true,podeTransferir:false,podeAudit:false,podeAdmin:false,
    verTabOp:false,
    // Ajuste 2: visualiza e lança apenas ALMOX 30
    confAlmox3:false,confAlmox30:true,confRejunte:false,
    confFiltros:['COLAFIX','BAUTECH','POZOSUL','PY','UY']
  },
  'conferente2':{
    label:'Conferente 2',abas:['pg-conferencia'],
    podeRequisitar:false,podeAprovar:false,podeMovFisica:false,
    podeConferir:true,podeTransferir:false,podeAudit:false,podeAdmin:false,
    verTabOp:false,
    confAlmox3:false,confAlmox30:true,confRejunte:false,
    confFiltros:['COLAFIX','BAUTECH','POZOSUL','PY','UY']
  },
  'conferente 3':{
    label:'Conferente 3',abas:['pg-conferencia'],
    podeRequisitar:false,podeAprovar:false,podeMovFisica:false,
    podeConferir:true,podeTransferir:false,podeAudit:false,podeAdmin:false,
    verTabOp:false,
    // Acessa REJUNTE/ÁREA LÍQUIDA e SEPARAÇÃO — sem acesso ao Almox 3 e Almox 30
    confAlmox3:false,confAlmox30:false,confRejunte:true,confSeparacao:true,
    confFiltros:['COLAFIX','BAUTECH','POZOSUL','PY','UY']
  },
  'conferente3':{
    label:'Conferente 3',abas:['pg-conferencia'],
    podeRequisitar:false,podeAprovar:false,podeMovFisica:false,
    podeConferir:true,podeTransferir:false,podeAudit:false,podeAdmin:false,
    verTabOp:false,
    // Acessa REJUNTE/ÁREA LÍQUIDA e SEPARAÇÃO — sem acesso ao Almox 3 e Almox 30
    confAlmox3:false,confAlmox30:false,confRejunte:true,confSeparacao:true,
    confFiltros:['COLAFIX','BAUTECH','POZOSUL','PY','UY']
  },
  // Matéria-Prima: mesmo padrão dos conferentes de produto acabado, só muda o almoxarifado
  'conferente almox 1':{
    label:'Conferente Almox 1',abas:['pg-conferencia'],
    podeRequisitar:false,podeAprovar:false,podeMovFisica:false,
    podeConferir:true,podeTransferir:false,podeAudit:false,podeAdmin:false,
    verTabOp:false,
    confAlmox3:false,confAlmox30:false,confRejunte:false,confSeparacao:false,confAlmox1:true,confAlmox2:false,
    confFiltros:['COLAFIX','BAUTECH','POZOSUL','PY','UY']
  },
  'conferentealmox1':{
    label:'Conferente Almox 1',abas:['pg-conferencia'],
    podeRequisitar:false,podeAprovar:false,podeMovFisica:false,
    podeConferir:true,podeTransferir:false,podeAudit:false,podeAdmin:false,
    verTabOp:false,
    confAlmox3:false,confAlmox30:false,confRejunte:false,confSeparacao:false,confAlmox1:true,confAlmox2:false,
    confFiltros:['COLAFIX','BAUTECH','POZOSUL','PY','UY']
  },
  'conferente almox 2':{
    label:'Conferente Almox 2',abas:['pg-conferencia'],
    podeRequisitar:false,podeAprovar:false,podeMovFisica:false,
    podeConferir:true,podeTransferir:false,podeAudit:false,podeAdmin:false,
    verTabOp:false,
    confAlmox3:false,confAlmox30:false,confRejunte:false,confSeparacao:false,confAlmox1:false,confAlmox2:true,
    confFiltros:['COLAFIX','BAUTECH','POZOSUL','PY','UY']
  },
  'conferentealmox2':{
    label:'Conferente Almox 2',abas:['pg-conferencia'],
    podeRequisitar:false,podeAprovar:false,podeMovFisica:false,
    podeConferir:true,podeTransferir:false,podeAudit:false,podeAdmin:false,
    verTabOp:false,
    confAlmox3:false,confAlmox30:false,confRejunte:false,confSeparacao:false,confAlmox1:false,confAlmox2:true,
    confFiltros:['COLAFIX','BAUTECH','POZOSUL','PY','UY']
  },
  'auditor':{
    label:'Auditor',abas:['pg-estoque','pg-hist','pg-divergencias'],
    podeRequisitar:false,podeAprovar:false,podeMovFisica:false,
    podeConferir:false,podeTransferir:false,podeAudit:true,podeAdmin:false,
    verTabOp:false
  }
};

function perfil(){return USUARIO_LOGADO&&PERFIS[USUARIO_LOGADO.perfil]||{};}
function sessionValida(){return USUARIO_LOGADO&&_sessionToken&&USUARIO_LOGADO._tok===_sessionToken;}

// ─── REGRA CENTRAL DE PERMISSÕES (item 1 das instruções) ────────────────────
// Retorna objeto com flags de permissão de contagem para o perfil logado.
// Toda a aplicação deve usar EXCLUSIVAMENTE esta função.
// Melhoria 7: helper para prevenir HTML injection em dados externos
function escapeHTML(s){if(s==null)return '';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
// U9: debounce genérico para evitar re-renderizar listas inteiras a cada tecla digitada
function debounce(fn, delay){
  let t;
  return function(...args){
    clearTimeout(t);
    t=setTimeout(()=>fn.apply(this,args), delay||200);
  };
}
const debouncedGlobalSearch = debounce(()=>globalSearch(), 200);
const debouncedFiltrarItensConf = debounce(()=>filtrarItensConf(), 200);
const debouncedRenderConferencia = debounce(()=>renderConferencia(), 200);

function confPerm(){
  const p = perfil();
  const acessoTotal = !!(p.podeAdmin || p.podeAudit || p.podeAprovar);
  return {
    acessoTotal,
    podeContarAlmox3:    acessoTotal || p.confAlmox3     === true,
    podeContarAlmox30:   acessoTotal || p.confAlmox30    === true,
    podeContarRejunte:   acessoTotal || p.confRejunte    === true,
    podeContarSeparacao: acessoTotal || p.confSeparacao  === true,
    podeContarAlmox1:    acessoTotal || p.confAlmox1     === true,
    podeContarAlmox2:    acessoTotal || p.confAlmox2     === true
  };
}

// ─── AUDITORIA DE ESTOQUE (NOVA FUNCIONALIDADE) ─────────────────────
// Regra explícita do processo: só o perfil "Supervisor Sistema" pode auditar
// e abrir/encerrar investigações. Administrador entra como superusuário,
// já que em todo o resto do sistema ele tem acesso equivalente ou maior
// que qualquer outro perfil (evita ficar sem acesso à própria auditoria).
function podeAuditarEstoque(){
  const p = perfil();
  return p.label === 'Supervisor Sistema' || !!p.podeAdmin;
}

// Retorna o filtro de almoxarifado obrigatório para o perfil logado.
// Retorna 'almox3', 'almox30', 'rejunte', 'separacao' ou null (acesso total).
function confPerfilFiltro(){
  const cp = confPerm();
  if(cp.acessoTotal) return null;
  // Conferente 3: acessa REJUNTE + SEPARAÇÃO — sem filtro forçado (usa 'todos')
  if(cp.podeContarRejunte && cp.podeContarSeparacao && !cp.podeContarAlmox30) return null;
  if(cp.podeContarRejunte && !cp.podeContarAlmox30 && !cp.podeContarSeparacao) return 'rejunte';
  if(cp.podeContarSeparacao && !cp.podeContarRejunte && !cp.podeContarAlmox30) return 'separacao';
  if(cp.podeContarAlmox1 && !cp.podeContarAlmox2 && !cp.podeContarAlmox30 && !cp.podeContarAlmox3) return 'almox1';
  if(cp.podeContarAlmox2 && !cp.podeContarAlmox1 && !cp.podeContarAlmox30 && !cp.podeContarAlmox3) return 'almox2';
  if(cp.podeContarAlmox30 && !cp.podeContarAlmox3) return 'almox30';
  if(cp.podeContarAlmox3 && !cp.podeContarAlmox30) return 'almox3';
  return null;
}

// Retorna o rótulo correto do local de um item (item 4 das instruções)
function localLabel(item){
  if(!item) return 'Almox 3';
  if(item.temRejunte) return 'Rejunte';
  if(item.temSeparacao) return 'Separação';
  if(item.temAlmox1) return 'Almox 1';
  if(item.temAlmox2) return 'Almox 2';
  if(item.temAlmox30 && !item.temAlmox3) return 'Almox 30';
  return 'Almox 3';
}

// AJUSTE 1: retorna a unidade correta conforme o tipo do item
// Para REJUNTE/ÁREA LÍQUIDA: 'fardo'/'Fardos'/'Fardos Avulsos'
// Para demais itens: 'sc'/'sacos'/'Sacos Avulsos'
function unidSing(item){ return (item && item.temRejunte) ? 'fardo' : 'sc'; }
function unidPlur(item){ return (item && item.temRejunte) ? 'Fardos' : 'sacos'; }
function unidAvul(item){ return (item && item.temRejunte) ? 'Fardos Avulsos' : 'Sacos Avulsos'; }
function unidTotal(item){ return (item && item.temRejunte) ? 'Total de Fardos' : 'Total de Sacos'; }

// ─── UNIDADE DE MEDIDA E CONVERSÃO (NOVA FUNCIONALIDADE) ────────────
// O item continua sendo CONTADO em sacos/fardos/paletes, exatamente como sempre
// (isso não muda). Quando o item tem uma "unidade de medida" própria cadastrada
// na planilha (ex: KG, L, UN), o sistema também mostra o total convertido, ex:
// "10 sc → 250 kg". Itens sem unidade cadastrada continuam exatamente como hoje.
function temConversaoUnidade(item){
  return !!(item && item.unidade && String(item.unidade).trim());
}
function converterQtd(item, qtdContada){
  if(!temConversaoUnidade(item)) return null;
  const fator = (item.conversao && item.conversao > 0) ? item.conversao : 1;
  const total = (Number(qtdContada)||0) * fator;
  // Arredonda para 2 casas quando necessário, mas sem casas decimais desnecessárias (ex: 250 em vez de 250.00)
  return Math.round(total * 100) / 100;
}
// Monta o texto "10 sc → 250 kg" (ou só "10 sc" se o item não tiver unidade cadastrada)
function qtdComConversaoTexto(item, qtdContada, unidadeContagem){
  const base = qtdContada + ' ' + unidadeContagem;
  if(!temConversaoUnidade(item)) return base;
  const convertido = converterQtd(item, qtdContada);
  return base + ' → ' + convertido + ' ' + item.unidade;
}

// ITEM 4: Tipo operacional do item (PALETES / SACOS / FARDOS)
// Aplica-se apenas na conferência, histórico e impressões.
function tipoOperacional(item){
  if(!item) return null;
  if(item.temRejunte) return 'FARDOS';
  // Itens de SEPARAÇÃO: usar campo tipoOp se definido, senão SACOS por padrão
  if(item.temSeparacao) return item.tipoOp || 'SACOS';
  // Demais itens: PALETES se tiver paletes, SACOS caso contrário
  return 'SACOS';
}
function tipoOpBadge(item){
  const t = tipoOperacional(item);
  if(!t) return '';
  const cor = t==='PALETES' ? 'var(--accent)' : t==='FARDOS' ? 'var(--purple,#7B5EA7)' : 'var(--green)';
  const bg  = t==='PALETES' ? 'var(--accent-dim)' : t==='FARDOS' ? 'var(--purple-dim,#EEE9FA)' : 'var(--green-dim)';
  return `<span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;background:${bg};color:${cor};border:1px solid ${cor};letter-spacing:.04em">${t}</span>`;
}
