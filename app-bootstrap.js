const LOCAL_SCRIPT_ORDER = ['saveManager.js'];

const APP_ASSET_VERSION = '2026-05-28-2';

const AUTH_SCRIPT_ORDER = [
  'https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js',
  'cloud-sync.js',
];

const OPTIONAL_EXTERNAL_SCRIPT_ORDER = [
  'https://cdn.jsdelivr.net/npm/chart.js',
];

function setBootstrapAuthGate(active, options = {}) {
  const body = document.body;
  const authScreen = document.getElementById('auth-screen');
  const titleEl = document.getElementById('auth-screen-title');
  const textEl = document.getElementById('auth-screen-text');
  const statusEl = document.getElementById('auth-sync-status');

  if (body) {
    body.classList.toggle('app-authenticated', active !== true);
    body.classList.toggle('app-auth-pending', active === true);
  }
  if (authScreen) {
    authScreen.classList.toggle('active', active === true);
  }
  if (titleEl) titleEl.textContent = options.title || 'Verificando autenticação';
  if (textEl) {
    textEl.textContent =
      options.text || 'O HEROSPASCOAL fica bloqueado até a sincronização em nuvem ser inicializada.';
  }
  if (statusEl) {
    statusEl.textContent = options.statusText || 'Preparando sincronização';
    statusEl.classList.remove('ok', 'warn', 'err', 'syncing');
    statusEl.classList.add(options.statusKind || 'warn');
  }
}

window.setBootstrapAuthGate = setBootstrapAuthGate;

function resolveScriptUrl(src) {
  if (/^https?:\/\//i.test(src)) {
    return src;
  }
  const url = new URL(src, window.location.href);
  url.searchParams.set('v', APP_ASSET_VERSION);
  return url.href;
}

function loadScriptSequentially(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = resolveScriptUrl(src);
    script.async = false;

    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Falha ao carregar script: ${src}`));

    document.head.appendChild(script);
  });
}

async function loadCoreScripts() {
  const coreModules = [
    './app-state.js',
    './app-rules.js',
    './app-progression.js',
    './app-planning.js',
    './app-sync-policy.js',
    './app-core.js',
    './app-activities.js',
    './app-ui.js',
    './app-diary-finance.js',
    './app-calendar-history.js',
    './app-actions.js',
    './app-charts-nutrition.js',
    './app-import-theme.js',
  ];

  // First phase: module side-effects (state + pure rules + migrated bridges)
  for (const src of coreModules) {
    await import(`${src}?v=${APP_ASSET_VERSION}`);
  }

  // Second phase: required local scripts (fail-fast)
  for (const src of LOCAL_SCRIPT_ORDER) {
    await loadScriptSequentially(src);
  }
}

async function loadAuthScripts() {
  for (const src of AUTH_SCRIPT_ORDER) {
    await loadScriptSequentially(src);
  }
}

async function loadOptionalExternalScriptsBestEffort() {
  for (const src of OPTIONAL_EXTERNAL_SCRIPT_ORDER) {
    try {
      await loadScriptSequentially(src);
    } catch (error) {
      console.warn(`Script externo indisponível: ${src}`, error);
    }
  }
}

async function runAppBootstrap() {
  if (window.__bootstrapLoaded) {
    return;
  }
  window.__bootstrapLoaded = true;

  setBootstrapAuthGate(true, {
    title: 'Preparando sincronização',
    text: 'O HEROSPASCOAL ficará disponível depois que a camada de nuvem terminar de subir.',
    statusText: 'Iniciando autenticação',
    statusKind: 'warn',
  });
  await loadCoreScripts();
  window.__cloudSyncBootstrapPending = true;

  try {
    await loadAuthScripts();
  } catch (error) {
    console.warn('Falha ao carregar camada de autenticação:', error);
    window.setBootstrapAuthGate?.(true, {
      title: 'Sincronização indisponível',
      text: 'A camada de login em nuvem não carregou. O aplicativo permanece bloqueado para evitar uso offline.',
      statusText: 'Falha ao carregar autenticação',
      statusKind: 'err',
    });
    window.__cloudSyncBootstrapPending = false;
    if (typeof window.runDeferredStartupResets === 'function') {
      window.runDeferredStartupResets();
    }
    return;
  }

  if (typeof applySavedTheme === 'function') {
    applySavedTheme();
  }

  if (typeof startApp === 'function') {
    startApp();
  } else {
    console.error('startApp não está disponível. Verifique a ordem dos scripts.');
  }

  // Bibliotecas opcionais não devem travar a autenticação ou a entrada no app.
  loadOptionalExternalScriptsBestEffort().catch((error) => {
    console.warn('Falha ao carregar scripts externos:', error);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    runAppBootstrap().catch((error) => {
      console.error('Falha no bootstrap do app:', error);
    });
  });
} else {
  runAppBootstrap().catch((error) => {
    console.error('Falha no bootstrap do app:', error);
  });
}
