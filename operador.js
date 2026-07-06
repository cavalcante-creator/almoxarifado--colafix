// ===== Inicialização da aplicação =====
// ─── INIT ─────────────────────────────────────────────────────────
setStep(0);
// Inicializar filtro período com hoje
(function(){
  const pbHoje=document.getElementById('pbHoje');if(pbHoje)pbHoje.classList.add('active');
  filtroPeriodo='hoje';
})();
