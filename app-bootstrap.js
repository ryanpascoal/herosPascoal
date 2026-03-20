const LOCAL_SCRIPT_ORDER = ['saveManager.js'];

const EXTERNAL_SCRIPT_ORDER = [
  'https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js',
  'cloud-sync.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
];

function resolveScriptUrl(src) {
  if (/^https?:\/\//i.test(src)) {
    return src;
  }
  return new URL(src, import.meta.url).href;
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
  // First phase: module side-effects (state + pure rules + migrated bridges)
  await import(new URL('./app-state.js', import.meta.url).href);
  await import(new URL('./app-rules.js', import.meta.url).href);
  await import(new URL('./app-core.js', import.meta.url).href);
  await import(new URL('./app-ui.js', import.meta.url).href);
  await import(new URL('./app-activities.js', import.meta.url).href);
  await import(new URL('./app-diary-finance.js', import.meta.url).href);
  await import(new URL('./app-calendar-history.js', import.meta.url).href);
  await import(new URL('./app-actions.js', import.meta.url).href);
  await import(new URL('./app-charts-nutrition.js', import.meta.url).href);
  await import(new URL('./app-import-theme.js', import.meta.url).href);

  // Second phase: required local scripts (fail-fast)
  for (const src of LOCAL_SCRIPT_ORDER) {
    await loadScriptSequentially(src);
  }
}

async function loadExternalScriptsBestEffort() {
  for (const src of EXTERNAL_SCRIPT_ORDER) {
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

  await loadCoreScripts();

  if (typeof applySavedTheme === 'function') {
    applySavedTheme();
  }

  if (typeof startApp === 'function') {
    startApp();
  } else {
    console.error('startApp não está disponível. Verifique a ordem dos scripts.');
  }

  // Não bloqueia a inicialização principal por falhas de CDN.
  loadExternalScriptsBestEffort().catch((error) => {
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
