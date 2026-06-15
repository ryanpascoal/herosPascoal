(function () {
  'use strict';

  const APP_ASSET_VERSION = '2026-05-28-2';

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

  function getErrorLikeMessage(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value.message === 'string') return value.message;
    if (typeof value.reason?.message === 'string') return value.reason.message;
    return String(value);
  }

  function isIgnorableExternalDeviceAttributesError(value) {
    return getErrorLikeMessage(value).includes('deviceAttributes');
  }

  function installExternalNoiseFilters() {
    window.addEventListener('unhandledrejection', (event) => {
      if (!isIgnorableExternalDeviceAttributesError(event.reason)) return;
      console.warn(
        'Ruído externo ignorado: extensão/recurso do navegador falhou ao ler "deviceAttributes".',
        event.reason
      );
      event.preventDefault();
    });

    window.addEventListener('error', (event) => {
      const matchesMessage =
        isIgnorableExternalDeviceAttributesError(event.error) ||
        isIgnorableExternalDeviceAttributesError(event.message);
      if (!matchesMessage) return;
      console.warn(
        'Ruído externo ignorado: extensão/recurso do navegador falhou ao ler "deviceAttributes".',
        event.error || event.message
      );
      event.preventDefault();
    });
  }

  function loadScriptSequentially(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = /^https?:\/\//i.test(src)
        ? src
        : new URL(`${src}?v=${APP_ASSET_VERSION}`, window.location.href).href;
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
    script.src = `app-bootstrap.js?v=${APP_ASSET_VERSION}`;
    document.head.appendChild(script);
  }

  function boot() {
    installExternalNoiseFilters();

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
