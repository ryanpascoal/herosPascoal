(function () {
  'use strict';

  const LEGACY_LOCAL_ORDER = [
    'saveManager.js',
    'app-state.js',
    'app-rules.js',
    'app-core.js',
    'app-ui.js',
    'app-activities.js',
    'app-diary-finance.js',
    'app-calendar-history.js',
    'app-actions.js',
    'app-charts-nutrition.js',
    'app-import-theme.js',
  ];

  const EXTERNAL_ORDER = [
    'https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js',
    'cloud-sync.js',
    'https://cdn.jsdelivr.net/npm/chart.js',
  ];

  function loadScriptSequentially(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Falha ao carregar script: ${src}`));
      document.head.appendChild(script);
    });
  }

  async function loadLegacyForFileProtocol() {
    for (const src of LEGACY_LOCAL_ORDER) {
      await loadScriptSequentially(src);
    }

    for (const src of EXTERNAL_ORDER) {
      try {
        await loadScriptSequentially(src);
      } catch (error) {
        console.warn(`Script externo indisponível: ${src}`, error);
      }
    }

    if (typeof applySavedTheme === 'function') {
      applySavedTheme();
    }

    if (typeof startApp === 'function') {
      startApp();
    } else {
      console.error('startApp não está disponível no modo legado.');
    }
  }

  function loadModuleBootstrap() {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'app-bootstrap.js';
    document.head.appendChild(script);
  }

  function boot() {
    if (window.location && window.location.protocol === 'file:') {
      loadLegacyForFileProtocol().catch((error) => {
        console.error('Falha no bootstrap legado (file://):', error);
      });
      return;
    }

    loadModuleBootstrap();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
