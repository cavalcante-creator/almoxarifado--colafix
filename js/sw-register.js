// ===== Registro do Service Worker (PWA) =====
// Não quebra o funcionamento ao abrir index.html diretamente pelo sistema
// de arquivos (file://) nem em navegadores sem suporte a Service Worker —
// nesses casos apenas deixa de registrar, sem gerar erro para o usuário.
(function registrarServiceWorker(){
  const suportado = 'serviceWorker' in navigator;
  const ambienteValido = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  if(!suportado){
    console.info('[SW] Navegador sem suporte a Service Worker — app segue funcionando normalmente sem cache offline.');
    return;
  }
  if(!ambienteValido){
    console.info('[SW] Aberto via file:// (ou host não seguro) — Service Worker não é registrado neste modo. O sistema funciona normalmente, apenas sem cache offline.');
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then((reg) => console.info('[SW] Registrado com sucesso:', reg.scope))
      .catch((err) => console.warn('[SW] Falha ao registrar (o app continua funcionando normalmente online):', err));
  });
})();
