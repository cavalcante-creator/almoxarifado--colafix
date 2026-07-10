// ===== Camada de acesso a dados: leitura e gravação no Google Sheets =====
// ─── GOOGLE SHEETS ────────────────────────────────────────────────
async function fetchRange(range){
  const url='https://sheets.googleapis.com/v4/spreadsheets/'+SHEETS_ID+'/values/'+encodeURIComponent(range)+'?key='+SHEETS_API_KEY;
  const res=await fetch(url);
  if(!res.ok){let d='';try{const j=await res.json();d=(j.error&&j.error.message)||'';}catch(e){console.error('fetchRange:parseError',e);}throw new Error('HTTP '+res.status+(d?': '+d:''));}
  return (await res.json()).values||[];
}
async function carregarSheetsData(){
  try{
    const rs=await Promise.all([fetchRange(RANGE_CAPACIDADE),fetchRange(RANGE_SALDO)]);
    const rowsCap=rs[0],rowsSaldo=rs[1];
    CAPACIDADE_MAP={};
    rowsCap.filter(r=>r[0]).forEach(r=>{
      const cod=String(r[0]).trim();
      CAPACIDADE_MAP[cod]={capPal:parseFloat(r[2])||0,capSac:parseInt(r[3])||0,estoqueMin:parseInt(r[4])||0};
    });
    // Salvar saldos brutos em SALDO_BRUTO para uso posterior por carregarInventarioItens
    SALDO_BRUTO=rowsSaldo.filter(r=>r[0]&&r[1]).map(r=>{
      const cod=String(r[0]).trim(),cap=CAPACIDADE_MAP[cod]||{};
      const s3=parseInt(r[2])||0,s30=parseInt(r[3])||0;
      return {
        cod,
        name: String(r[1]).trim(),
        saldo3: s3,
        saldo30: s30,
        min3: cap.estoqueMin || 0,
        min30: cap.capSac || 0,
        capPal: cap.capPal || 88,
        estoqueMin: cap.estoqueMin || 0
      };
    });
    // ITEMS será populado por carregarInventarioItens (Alt. 2: apenas ALMOX3=TRUE E ALMOX30=TRUE)
    // Enquanto INVENTARIO_ITENS não é carregado, usar SALDO_BRUTO como fallback temporário
    if(ITEMS.length === 0) ITEMS = SALDO_BRUTO.slice();
    const el=document.getElementById('sheetsTimestamp');
    if(el){el.textContent='✅ '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});el.style.color='var(--green)';}
    renderItems();
  }catch(err){
    console.error('Sheets:',err);
    const el=document.getElementById('sheetsTimestamp');
    if(el){el.textContent='⚠ Erro ao sincronizar';el.style.color='var(--red)';}
  }
}
async function carregarInventarioItens(){
  // Carrega INVENTARIO_ITENS e popula CONF_ITEMS (conferência) e INV_ITEMS (estoque/req/transf)
  try{
    const rows = await fetchRange(RANGE_INVENTARIO_ITENS);
    const parsed = rows.filter(r=>r[0]&&r[1]).map(r=>{
      const cod = String(r[0]).trim();
      // Coluna C = ALMOX 3 (TRUE/FALSE)
      const temAlmox3 = String(r[2]||'').trim().toUpperCase()==='TRUE';
      // Coluna D = ALMOX 30 (TRUE/FALSE)
      const temAlmox30 = String(r[3]||'').trim().toUpperCase()==='TRUE';
      // Coluna E = REJUNTE/ÁREA LÍQUIDA (TRUE/FALSE)
      const temRejunte = String(r[4]||'').trim().toUpperCase()==='TRUE';
      // Coluna F = SEPARAÇÃO (TRUE/FALSE)
      const temSeparacao = String(r[5]||'').trim().toUpperCase()==='TRUE';
      // Coluna G = ALMOX 1 — Matéria-Prima (TRUE/FALSE)
      const temAlmox1 = String(r[6]||'').trim().toUpperCase()==='TRUE';
      // Coluna H = ALMOX 2 — Matéria-Prima (TRUE/FALSE)
      const temAlmox2 = String(r[7]||'').trim().toUpperCase()==='TRUE';
      // Coluna I = UNIDADE DE MEDIDA (texto livre, ex: KG, L, UN, CX). Vazio = mantém "sc" padrão.
      const unidadeRaw = String(r[8]||'').trim();
      // Coluna J = CONVERSÃO (quantos UNIDADE equivalem a 1 saco/unidade contada). Vazio/0 = sem conversão (1:1).
      const conversaoRaw = parseFloat(String(r[9]||'').replace(',','.')) || 0;
      // Busca saldos numéricos em SALDO_BRUTO (carregado de SALDO+CAPACIDADE) para exibir
      const itemSaldo = SALDO_BRUTO.find(i=>i.cod===cod) || {};
      return {
        cod,
        name: String(r[1]).trim(),
        temAlmox3,
        temAlmox30,
        temRejunte,
        temSeparacao,
        temAlmox1,
        temAlmox2,
        unidade: unidadeRaw,               // '' = usa o padrão sc/fardo já existente
        conversao: conversaoRaw > 0 ? conversaoRaw : 1,
        saldo3: itemSaldo.saldo3 || 0,
        saldo30: itemSaldo.saldo30 || 0,
        min3: itemSaldo.min3 || 0,
        min30: itemSaldo.min30 || 0
      };
    });
    // CONF_ITEMS: todos os itens do INVENTARIO_ITENS (Alteração 4)
    CONF_ITEMS = parsed;
    console.log('[carregarInventarioItens] Itens carregados:', CONF_ITEMS.length);
    // INV_ITEMS: todos os itens do INVENTARIO_ITENS para uso em requisições/transferências
    INV_ITEMS = parsed;
    // Alteração 2: ITEMS (Estoque) = apenas itens com ALMOX3=TRUE E ALMOX30=TRUE
    const itemsEstoque = parsed.filter(i=>i.temAlmox3 && i.temAlmox30);
    // Preservar saldos e mínimos já carregados de SALDO+CAPACIDADE em ITEMS
    // Atualizar ITEMS mantendo apenas os itens filtrados (sem alterar saldos já carregados)
    ITEMS = itemsEstoque.map(inv=>{
      const existente = SALDO_BRUTO.find(i=>i.cod===inv.cod) || {};
      return {
        cod: inv.cod,
        name: inv.name,
        temAlmox3: inv.temAlmox3,
        temAlmox30: inv.temAlmox30,
        temRejunte: inv.temRejunte,
        temSeparacao: inv.temSeparacao,
        temAlmox1: inv.temAlmox1,
        temAlmox2: inv.temAlmox2,
        unidade: inv.unidade,
        conversao: inv.conversao,
        saldo3: existente.saldo3 || inv.saldo3 || 0,
        saldo30: existente.saldo30 || inv.saldo30 || 0,
        min3: existente.min3 || inv.min3 || 0,
        min30: existente.min30 || inv.min30 || 0,
        capPal: existente.capPal || 88,
        estoqueMin: existente.estoqueMin || 0
      };
    });
    renderItems();
  }catch(e){
    console.warn('carregarInventarioItens:',e);
    // Em caso de erro, CONF_ITEMS e INV_ITEMS ficam vazios; ITEMS permanece como estava
    CONF_ITEMS=[];
    INV_ITEMS=[];
  }
}
async function salvarRequisicaoSheets(reqObj){
  // no-cors: resposta opaca, erro de rede é detectado via catch
  try{await fetch(APPS_SCRIPT_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify({acao:'salvarReq',id:reqObj.req,dados:JSON.stringify(reqObj)})});}
  catch(e){console.error('salvarRequisicaoSheets',e);toast('⚠️ Falha ao enviar requisição. Verifique a conexão.',4000);}
}
async function removerRequisicaoSheets(reqId){
  try{
    await fetch(APPS_SCRIPT_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify({acao:'removerReq',id:reqId})});
    setTimeout(()=>REQS_REMOVIDAS.delete(reqId),5*60*1000);
  }catch(e){console.error('removerRequisicaoSheets',e);}
}
async function salvarHistoricoSheets(entrada){
  try{await fetch(APPS_SCRIPT_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify({acao:'salvarHist',id:entrada.req,dados:JSON.stringify(entrada)})});}
  catch(e){console.error('salvarHistoricoSheets',e);}
}
// [FIX-1] CORS habilitado + retorno booleano para o await em salvarConferencia saber se teve sucesso
async function salvarConferenciaSheets(conf){
  try{
    console.log('[salvarConferenciaSheets] Enviando', conf.numero, 'para o GAS...');
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {'Content-Type': 'text/plain'},
      body: JSON.stringify({acao:'salvarConf', id: conf.numero, dados: JSON.stringify(conf)})
    });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    console.log('[salvarConferenciaSheets] Sucesso:', conf.numero);
    return true;
  } catch(e){
    console.error('[salvarConferenciaSheets] Erro:', conf.numero, e.message);
    // [FIX-1] Fallback: tentar no-cors como segunda tentativa (GAS pode retornar opaque)
    try{
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {'Content-Type': 'text/plain'},
        body: JSON.stringify({acao:'salvarConf', id: conf.numero, dados: JSON.stringify(conf)})
      });
      console.log('[salvarConferenciaSheets] Fallback no-cors enviado:', conf.numero);
      return true; // no-cors não confirma sucesso, mas assume enviado
    } catch(e2){
      console.error('[salvarConferenciaSheets] Falha total:', conf.numero, e2.message);
      return false;
    }
  }
}
async function carregarConferenciasSheets(){
  try{
    console.log('[carregarConferencias] Carregando do Sheets...');
    const rows=await fetchRange('CONFERENCIAS!A2:B');
    const loaded=rows.filter(r=>r[0]&&r[1]).map(r=>{
      try{return JSON.parse(r[1]);}
      catch(e){console.warn('[carregarConferencias] Erro ao parsear linha:',r[0],e);return null;}
    }).filter(Boolean);
    console.log('[carregarConferencias] Registros carregados do Sheets:', loaded.length);

    // [FIX BUG-8] Merge inteligente: dados do Sheets têm prioridade sobre dados locais
    // Atualiza registros existentes e adiciona novos
    loaded.forEach(conf=>{
      // [FIX-INTEG] Validação completa antes de aceitar no histórico
      if(!conf || !conf.numero) { console.warn('[carregarConferencias] Ignorando registro sem número'); return; }
      if(!conf.itens || typeof conf.itens !== 'object') { console.warn('[carregarConferencias] Ignorando registro sem itens:', conf.numero); return; }
      // Garantir que os valores dos itens sejam numéricos (evitar NaN/undefined)
      Object.keys(conf.itens).forEach(cod=>{
        const it = conf.itens[cod];
        it.pal3  = parseInt(it.pal3)  || 0;
        it.sac3  = parseInt(it.sac3)  || 0;
        it.pal30 = parseInt(it.pal30) || 0;
        it.sac30 = parseInt(it.sac30) || 0;
        it.almox3  = parseInt(it.almox3)  || 0;
        it.almox30 = parseInt(it.almox30) || 0;
        it.total   = parseInt(it.total)   || (it.almox3 + it.almox30);
        it.saldoSistema3  = parseInt(it.saldoSistema3)  || 0;
        it.saldoSistema30 = parseInt(it.saldoSistema30) || 0;
        it.dif3  = parseInt(it.dif3)  || 0;
        it.dif30 = parseInt(it.dif30) || 0;
        if(!it.nome) it.nome = cod;
      });
      const idx = CONF_HISTORICO.findIndex(c=>c.numero===conf.numero);
      if(idx >= 0){
        // [FIX] Substituir registro local pelo do Sheets (fonte de verdade)
        CONF_HISTORICO[idx] = conf;
      } else {
        CONF_HISTORICO.push(conf);
      }
    });
    // [FIX-SORT] Ordenar por data/hora desc — suporta formato pt-BR "DD/MM/AAAA HH:MM:SS"
    CONF_HISTORICO.sort((a,b)=>{
      const parsePtBR = s => {
        if(!s) return 0;
        // Tenta formato "DD/MM/AAAA HH:MM:SS"
        const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
        if(m) return new Date(m[3],m[2]-1,m[1],m[4],m[5]).getTime();
        return new Date(s).getTime() || 0;
      };
      return parsePtBR(b.dataHora||b.data) - parsePtBR(a.dataHora||a.data);
    });
    console.log('[carregarConferencias] Total em memória após merge:', CONF_HISTORICO.length);
    console.log('[carregarConferencias] Histórico atualizado:', CONF_HISTORICO.map(c=>c.numero+' ('+c.dataHora+')').join(' | '));
    renderConfHistorico();
    renderDivergencias();
  }catch(e){console.warn('[carregarConferencias] Erro:',e);}
}

// ─── AUDITORIA DE ESTOQUE (NOVA FUNCIONALIDADE) ─────────────────────
// Mesmo padrão de salvarConferenciaSheets/carregarConferenciasSheets,
// usando a aba "AUDITORIAS" (rota 'salvarAuditoria' no Apps Script) —
// assim o histórico de auditoria passa a ser compartilhado entre todos
// os computadores/usuários, e não só salvo no navegador de quem audita.
async function salvarAuditoriaSheets(registro){
  try{
    console.log('[salvarAuditoriaSheets] Enviando', registro.auditKey, 'para o GAS...');
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {'Content-Type': 'text/plain'},
      body: JSON.stringify({acao:'salvarAuditoria', id: registro.auditKey, dados: JSON.stringify(registro)})
    });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    console.log('[salvarAuditoriaSheets] Sucesso:', registro.auditKey);
    return true;
  } catch(e){
    console.error('[salvarAuditoriaSheets] Erro:', registro.auditKey, e.message);
    try{
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {'Content-Type': 'text/plain'},
        body: JSON.stringify({acao:'salvarAuditoria', id: registro.auditKey, dados: JSON.stringify(registro)})
      });
      console.log('[salvarAuditoriaSheets] Fallback no-cors enviado:', registro.auditKey);
      return true;
    } catch(e2){
      console.error('[salvarAuditoriaSheets] Falha total:', registro.auditKey, e2.message);
      return false;
    }
  }
}
async function carregarAuditoriasSheets(){
  try{
    console.log('[carregarAuditorias] Carregando do Sheets...');
    const rows = await fetchRange('AUDITORIAS!A2:B');
    const loaded = rows.filter(r=>r[0]&&r[1]).map(r=>{
      try{ return JSON.parse(r[1]); }
      catch(e){ console.warn('[carregarAuditorias] Erro ao parsear linha:', r[0], e); return null; }
    }).filter(Boolean);
    console.log('[carregarAuditorias] Registros carregados do Sheets:', loaded.length);

    loaded.forEach(reg=>{
      if(!reg || !reg.auditKey) { console.warn('[carregarAuditorias] Ignorando registro sem auditKey'); return; }
      const idx = AUDITORIA_HISTORICO.findIndex(a=>a.auditKey===reg.auditKey);
      if(idx >= 0) AUDITORIA_HISTORICO[idx] = reg;
      else AUDITORIA_HISTORICO.push(reg);
    });
    AUDITORIA_HISTORICO.sort((a,b)=>{
      const parsePtBR = s => {
        if(!s) return 0;
        const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
        if(m) return new Date(m[3],m[2]-1,m[1],m[4],m[5]).getTime();
        return new Date(s).getTime() || 0;
      };
      return parsePtBR(b.dataHora) - parsePtBR(a.dataHora);
    });
    salvarAuditoriaLocal(); // mantém o cache local sincronizado com o que veio do Sheets
    console.log('[carregarAuditorias] Total em memória após merge:', AUDITORIA_HISTORICO.length);
    renderConfHistorico();
    renderDivergencias();
    renderDivHistorico();
  }catch(e){ console.warn('[carregarAuditorias] Erro:', e); }
}

// ─── RECEBIMENTO DE MATERIAL (NOVA FUNCIONALIDADE) ─────────────────
// Mesmo padrão de salvarAuditoriaSheets/carregarAuditoriasSheets, usando a
// aba "RECEBIMENTOS" (rota 'salvarRecebimento' no Apps Script).
async function salvarRecebimentoSheets(registro){
  try{
    console.log('[salvarRecebimentoSheets] Enviando', registro.id, 'para o GAS...');
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {'Content-Type': 'text/plain'},
      body: JSON.stringify({acao:'salvarRecebimento', id: registro.id, dados: JSON.stringify(registro)})
    });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    console.log('[salvarRecebimentoSheets] Sucesso:', registro.id);
    return true;
  } catch(e){
    console.error('[salvarRecebimentoSheets] Erro:', registro.id, e.message);
    try{
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {'Content-Type': 'text/plain'},
        body: JSON.stringify({acao:'salvarRecebimento', id: registro.id, dados: JSON.stringify(registro)})
      });
      console.log('[salvarRecebimentoSheets] Fallback no-cors enviado:', registro.id);
      return true;
    } catch(e2){
      console.error('[salvarRecebimentoSheets] Falha total:', registro.id, e2.message);
      return false;
    }
  }
}
async function carregarRecebimentosSheets(){
  try{
    console.log('[carregarRecebimentos] Carregando do Sheets...');
    const rows = await fetchRange('RECEBIMENTOS!A2:B');
    const loaded = rows.filter(r=>r[0]&&r[1]).map(r=>{
      try{ return JSON.parse(r[1]); }
      catch(e){ console.warn('[carregarRecebimentos] Erro ao parsear linha:', r[0], e); return null; }
    }).filter(Boolean);
    console.log('[carregarRecebimentos] Registros carregados do Sheets:', loaded.length);

    loaded.forEach(reg=>{
      if(!reg || !reg.id) { console.warn('[carregarRecebimentos] Ignorando registro sem id'); return; }
      const idx = RECEBIMENTOS.findIndex(r=>r.id===reg.id);
      if(idx >= 0) RECEBIMENTOS[idx] = reg;
      else RECEBIMENTOS.push(reg);
    });
    RECEBIMENTOS.sort((a,b)=>{
      const parsePtBR = s => {
        if(!s) return 0;
        const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
        if(m) return new Date(m[3],m[2]-1,m[1],m[4],m[5]).getTime();
        return new Date(s).getTime() || 0;
      };
      return parsePtBR(b.dataHora) - parsePtBR(a.dataHora);
    });
    salvarRecebimentosLocal();
    console.log('[carregarRecebimentos] Total em memória após merge:', RECEBIMENTOS.length);
    if(typeof renderRecebimentos === 'function') renderRecebimentos();
  }catch(e){ console.warn('[carregarRecebimentos] Erro:', e); }
}

