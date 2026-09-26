// ===== Perfis de acesso e regras centrais de permissão =====
// ─── PERFIS ──────────────────────────────────────────────────────
const PERFIS={
  'supervisor':{
    label:'Supervisor',abas:['pg-estoque','pg-pendencias','pg-conferencia','pg-divergencias','pg-hist','pg-expedicao'],
    podeRequisitar:true,podeAprovar:true,podeMovFisica:true,
    podeConferir:true,podeTransferir:false,podeAudit:false,podeAdmin:false,
    verTabOp:true,
    confFiltros:['COLAFIX','BAUTECH','POZOSUL','EXPORTAÇÃO PY','EXPORTAÇÃO UY']
  },
  'administrador':{
    label:'Administrador',abas:['pg-estoque','pg-pendencias','pg-conferencia','pg-divergencias','pg-hist','pg-expedicao'],
    podeRequisitar:true,podeAprovar:true,podeMovFisica:true,
    podeConferir:true,podeTransferir:true,podeAudit:true,podeAdmin:true,
    verTabOp:true,
    confFiltros:['COLAFIX','BAUTECH','POZOSUL','EXPORTAÇÃO PY','EXPORTAÇÃO UY','FIXCOL','FILMES','MATERIAL EM BAG','PIGMENTOS/ADITIVOS','RESINAS','SACARIAS','ETIQUETAS']
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
    confFiltros:['COLAFIX','BAUTECH','POZOSUL','EXPORTAÇÃO PY','EXPORTAÇÃO UY']
  },
  'supervisorsistema':{
    // Alteração 1: liberar conferência para Iasmyn (Supervisor Sistema)
    label:'Supervisor Sistema',abas:['pg-estoque','pg-pendencias','pg-conferencia','pg-divergencias','pg-hist','pg-expedicao'],
    podeRequisitar:false,podeAprovar:true,podeMovFisica:true,
    podeConferir:true,podeTransferir:true,podeAudit:false,podeAdmin:false,
    verTabOp:false,
    confFiltros:['COLAFIX','BAUTECH','POZOSUL','EXPORTAÇÃO PY','EXPORTAÇÃO UY']
  },
  'conferente':{
    label:'Conferente',abas:['pg-conferencia'],
    podeRequisitar:false,podeAprovar:false,podeMovFisica:false,
    podeConferir:true,podeTransferir:false,podeAudit:false,podeAdmin:false,
    verTabOp:false,
    // Ajuste 2: restrições de almoxarifado na conferência
    confAlmox3:true,confAlmox30:false,confRejunte:false,
    confFiltros:['COLAFIX','BAUTECH','POZOSUL','EXPORTAÇÃO PY','EXPORTAÇÃO UY','FIXCOL'],
    podeReceberMaterial:true
  },
  'conferente 2':{
    label:'Conferente 2',abas:['pg-conferencia'],
    podeRequisitar:false,podeAprovar:false,podeMovFisica:false,
    podeConferir:true,podeTransferir:false,podeAudit:false,podeAdmin:false,
    verTabOp:false,
    // Ajuste 2: visualiza e lança apenas ALMOX 30
    confAlmox3:false,confAlmox30:true,confRejunte:false,
    confFiltros:['COLAFIX','BAUTECH','POZOSUL','EXPORTAÇÃO PY','EXPORTAÇÃO UY']
  },
  'conferente2':{
    label:'Conferente 2',abas:['pg-conferencia'],
    podeRequisitar:false,podeAprovar:false,podeMovFisica:false,
    podeConferir:true,podeTransferir:false,podeAudit:false,podeAdmin:false,
    verTabOp:false,
    confAlmox3:false,confAlmox30:true,confRejunte:false,
    confFiltros:['COLAFIX','BAUTECH','POZOSUL','EXPORTAÇÃO PY','EXPORTAÇÃO UY']
  },
  'conferente 3':{
    label:'Conferente 3',abas:['pg-conferencia'],
    podeRequisitar:false,podeAprovar:false,podeMovFisica:false,
    podeConferir:true,podeTransferir:false,podeAudit:false,podeAdmin:false,
    verTabOp:false,
    // Acessa REJUNTE/ÁREA LÍQUIDA e SEPARAÇÃO — sem acesso ao Almox 3 e Almox 30
    confAlmox3:false,confAlmox30:false,confRejunte:true,confSeparacao:true,
    confFiltros:['COLAFIX','BAUTECH','POZOSUL','EXPORTAÇÃO PY','EXPORTAÇÃO UY']
  },
  'conferente3':{
    label:'Conferente 3',abas:['pg-conferencia'],
    podeRequisitar:false,podeAprovar:false,podeMovFisica:false,
    podeConferir:true,podeTransferir:false,podeAudit:false,podeAdmin:false,
    verTabOp:false,
    // Acessa REJUNTE/ÁREA LÍQUIDA e SEPARAÇÃO — sem acesso ao Almox 3 e Almox 30
    confAlmox3:false,confAlmox30:false,confRejunte:true,confSeparacao:true,
    confFiltros:['COLAFIX','BAUTECH','POZOSUL','EXPORTAÇÃO PY','EXPORTAÇÃO UY']
  },
  // Matéria-Prima: mesmo padrão dos conferentes de produto acabado, só muda o almoxarifado
  'conferente almox 1':{
    label:'Conferente Almox 1',abas:['pg-conferencia'],
    podeRequisitar:false,podeAprovar:false,podeMovFisica:false,
    podeConferir:true,podeTransferir:false,podeAudit:false,podeAdmin:false,
    verTabOp:false,
    confAlmox3:false,confAlmox30:false,confRejunte:false,confSeparacao:false,confAlmox1:true,confAlmox2:false,
    confFiltros:['FILMES','MATERIAL EM BAG','PIGMENTOS/ADITIVOS','RESINAS','SACARIAS','ETIQUETAS']
  },
  'conferentealmox1':{
    label:'Conferente Almox 1',abas:['pg-conferencia'],
    podeRequisitar:false,podeAprovar:false,podeMovFisica:false,
    podeConferir:true,podeTransferir:false,podeAudit:false,podeAdmin:false,
    verTabOp:false,
    confAlmox3:false,confAlmox30:false,confRejunte:false,confSeparacao:false,confAlmox1:true,confAlmox2:false,
    confFiltros:['FILMES','MATERIAL EM BAG','PIGMENTOS/ADITIVOS','RESINAS','SACARIAS','ETIQUETAS']
  },
  'conferente almox 2':{
    label:'Conferente Almox 2',abas:['pg-conferencia'],
    podeRequisitar:false,podeAprovar:false,podeMovFisica:false,
    podeConferir:true,podeTransferir:false,podeAudit:false,podeAdmin:false,
    verTabOp:false,
    confAlmox3:false,confAlmox30:false,confRejunte:false,confSeparacao:false,confAlmox1:false,confAlmox2:true,
    confFiltros:['FILMES','MATERIAL EM BAG','PIGMENTOS/ADITIVOS','RESINAS','SACARIAS','ETIQUETAS']
  },
  'conferentealmox2':{
    label:'Conferente Almox 2',abas:['pg-conferencia'],
    podeRequisitar:false,podeAprovar:false,podeMovFisica:false,
    podeConferir:true,podeTransferir:false,podeAudit:false,podeAdmin:false,
    verTabOp:false,
    confAlmox3:false,confAlmox30:false,confRejunte:false,confSeparacao:false,confAlmox1:false,confAlmox2:true,
    confFiltros:['FILMES','MATERIAL EM BAG','PIGMENTOS/ADITIVOS','RESINAS','SACARIAS','ETIQUETAS']
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

// ─── RECEBIMENTO DE MATERIAL (NOVA FUNCIONALIDADE) ──────────────────
// Quem pode registrar recebimento: perfis com a flag explícita, ou
// acesso total (Admin/Supervisor), seguindo o mesmo padrão já usado
// em toda a auditoria/conferência.
function podeRegistrarRecebimento(){
  const p = perfil();
  return !!p.podeReceberMaterial || !!p.podeAdmin || !!p.podeAprovar;
}
// Mesma regra de segurança já usada na lista de seleção da Conferência:
// o item só é permitido se o perfil tem acesso a PELO MENOS UM dos locais dele.
function itemPermitidoParaContagem(item){
  if(!item) return false;
  const cp = confPerm();
  if(cp.acessoTotal) return true;
  return !!(
    (item.temAlmox3    && cp.podeContarAlmox3) ||
    (item.temAlmox30   && cp.podeContarAlmox30) ||
    (item.temRejunte   && cp.podeContarRejunte) ||
    (item.temSeparacao && cp.podeContarSeparacao) ||
    (item.temAlmox1    && cp.podeContarAlmox1) ||
    (item.temAlmox2    && cp.podeContarAlmox2)
  );
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

// ─── UNIDADE DE MEDIDA E CONVERSÃO (NOVA FUNCIONALIDADE) ────────────
// Dois cenários possíveis, decididos pela coluna CONVERSAO da planilha:
//  1) Unidade PRÓPRIA (conversão 1 ou vazia): o item é contado DIRETO nessa
//     unidade (ex: Filme Plástico contado em "rolo", não em saco). A unidade
//     cadastrada passa a ser a própria label de contagem em todo o sistema.
//  2) Unidade com CONVERSÃO (fator > 1, ex: 1 saco = 25 kg): o item continua
//     sendo contado em sacos/fardos, e o total convertido aparece do lado,
//     ex: "10 sc → 250 kg".
function temUnidadePropria(item){
  return !!(item && item.unidade && String(item.unidade).trim());
}
function temConversaoBulk(item){
  return temUnidadePropria(item) && Number(item.conversao||1) > 1;
}
// [LEGADO] mantido pelo nome para não quebrar quem já chamava esta função
function temConversaoUnidade(item){ return temConversaoBulk(item); }
function converterQtd(item, qtdContada){
  if(!temConversaoBulk(item)) return null;
  const fator = item.conversao;
  const total = (Number(qtdContada)||0) * fator;
  // Arredonda para 2 casas quando necessário, mas sem casas decimais desnecessárias (ex: 250 em vez de 250.00)
  return Math.round(total * 100) / 100;
}
// Monta o texto de exibição da quantidade, de acordo com o cenário do item:
// unidade própria → só a unidade cadastrada (ex: "10 rolo")
// conversão bulk  → "10 sc → 250 kg"
// nenhum dos dois → comportamento padrão de sempre (ex: "10 sc")
function qtdComConversaoTexto(item, qtdContada, unidadeContagem){
  if(temUnidadePropria(item) && !temConversaoBulk(item)){
    return qtdContada + ' ' + item.unidade;
  }
  const base = qtdContada + ' ' + unidadeContagem;
  if(!temConversaoBulk(item)) return base;
  const convertido = converterQtd(item, qtdContada);
  return base + ' → ' + convertido + ' ' + item.unidade;
}

// AJUSTE 1: retorna a unidade correta conforme o tipo do item
// Para REJUNTE/ÁREA LÍQUIDA: 'fardo'/'Fardos'/'Fardos Avulsos'
// Para itens com unidade PRÓPRIA cadastrada (sem conversão bulk): a unidade cadastrada
// Para demais itens: 'sc'/'sacos'/'Sacos Avulsos'
function unidSing(item){
  if(temUnidadePropria(item) && !temConversaoBulk(item)) return item.unidade;
  return (item && item.temRejunte) ? 'fardo' : 'sc';
}
function unidPlur(item){
  if(temUnidadePropria(item) && !temConversaoBulk(item)) return item.unidade;
  return (item && item.temRejunte) ? 'Fardos' : 'sacos';
}
function unidAvul(item){
  if(temUnidadePropria(item) && !temConversaoBulk(item)) return item.unidade + ' Avulsos';
  return (item && item.temRejunte) ? 'Fardos Avulsos' : 'Sacos Avulsos';
}
function unidTotal(item){
  if(temUnidadePropria(item) && !temConversaoBulk(item)) return 'Total de ' + item.unidade;
  return (item && item.temRejunte) ? 'Total de Fardos' : 'Total de Sacos';
}

// ITEM 4: Tipo operacional do item (PALETES / SACOS / FARDOS)
// Aplica-se apenas na conferência, histórico e impressões.
function tipoOperacional(item){
  if(!item) return null;
  if(item.temRejunte) return 'FARDOS';
  // Itens de SEPARAÇÃO: usar campo tipoOp se definido, senão SACOS por padrão
  if(item.temSeparacao) return item.tipoOp || 'SACOS';
  // Itens com unidade própria cadastrada (sem conversão bulk): mostrar a unidade real
  if(temUnidadePropria(item) && !temConversaoBulk(item)) return String(item.unidade).toUpperCase();
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
