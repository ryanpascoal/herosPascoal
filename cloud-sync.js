(function () {
    'use strict';

    const CLOUD_CACHE_KEY = 'heroJourneyData';
    const AUTH_CACHE_KEY = 'heroJourneyAuth';

    // Preencha com as credenciais do seu projeto Firebase.
    const FIREBASE_CONFIG = {
        apiKey: "AIzaSyBUBn0cCjAx4aWnfwZitbzTd32Fmh_1MYM",
        authDomain: "lifesgame-8dbac.firebaseapp.com",
        projectId: "lifesgame-8dbac",
        storageBucket: "lifesgame-8dbac.firebasestorage.app",
        messagingSenderId: "1095990800485",
        appId: "1:1095990800485:web:8fc22935f72c7f0619168c",
        measurementId: "G-D2VDF8TG35"
    };

    let auth = null;
    let db = null;
    let currentUser = null;
    let saveTimer = null;
    let saveInFlight = false;
    let saveQueued = false;
    let cloudReady = false;

    const serverMeta = {
        lastDailyReset: null,
        lastWeeklyReset: null
    };

    function hasValidFirebaseConfig() {
        return FIREBASE_CONFIG.apiKey !== 'COLOQUE_AQUI' &&
            FIREBASE_CONFIG.projectId !== 'COLOQUE_AQUI' &&
            FIREBASE_CONFIG.appId !== 'COLOQUE_AQUI';
    }

    function parseJson(text, fallback) {
        if (!text) return fallback;
        try {
            return JSON.parse(text);
        } catch (err) {
            console.error('Falha ao parsear JSON:', err);
            return fallback;
        }
    }

    function deepClone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function ensureDiaryMemoryMode() {
        if (typeof diaryDbAvailable !== 'undefined') diaryDbAvailable = false;
        if (!Array.isArray(appData.diaryEntries)) appData.diaryEntries = [];
        if (typeof diaryCache !== 'undefined') diaryCache = appData.diaryEntries;
        if (typeof diaryLoaded !== 'undefined') diaryLoaded = true;
    }

    function applyDataGuards() {
        if (typeof ensureDataIntegrity === 'function') {
            ensureDataIntegrity();
        } else {
            // Fallback if ensureDataIntegrity not yet defined
            if (typeof ensureCriticalDataShape === 'function') ensureCriticalDataShape();
            ensureCoreAttributes();
            ensureClasses();
            ensureStartingLevels();
            normalizeClassIds();
        }
        if (typeof populateFinanceMonthOptions === 'function') populateFinanceMonthOptions();
    }

    function buildSerializableData() {
        const payload = deepClone(appData);
        payload.diaryEntries = Array.isArray(diaryCache) ? deepClone(diaryCache) : deepClone(appData.diaryEntries || []);
        return payload;
    }

    function updateServerMetaFromLocal() {
        const meta = appData.serverMeta || {};
        serverMeta.lastDailyReset = meta.lastDailyReset || serverMeta.lastDailyReset;
        serverMeta.lastWeeklyReset = meta.lastWeeklyReset || serverMeta.lastWeeklyReset;
    }

    function persistServerMetaToApp() {
        if (!appData.serverMeta || typeof appData.serverMeta !== 'object') appData.serverMeta = {};
        appData.serverMeta.lastDailyReset = serverMeta.lastDailyReset || null;
        appData.serverMeta.lastWeeklyReset = serverMeta.lastWeeklyReset || null;
    }

    function setSyncStatus(message, kind) {
        const status = document.getElementById('cloud-sync-status');
        if (status) {
            status.textContent = message;
            status.classList.remove('ok', 'warn', 'err', 'syncing');
            status.classList.add(kind || 'warn');
        }
        
        // Atualizar indicador no cabeçalho também
        updateHeaderSyncIndicator(message, kind);
    }
    
    function updateHeaderSyncIndicator(message, kind) {
        let indicator = document.getElementById('header-sync-indicator');
        if (!indicator) {
            // Criar indicador no cabeçalho se não existir
            const headerStats = document.querySelector('.header-stats');
            if (headerStats) {
                indicator = document.createElement('div');
                indicator.id = 'header-sync-indicator';
                indicator.className = 'stats-item sync-indicator';
                indicator.style.cssText = 'cursor: pointer; padding: 4px 10px; border-radius: 8px; font-size: 0.85rem;';
                indicator.title = 'Clique para sincronizar';
                headerStats.appendChild(indicator);
                
                // Adicionar clique para sincronizar manualmente
                indicator.addEventListener('click', function() {
                    if (cloudReady && currentUser) {
                        pushCloud(true);
                    } else {
                        // Se não está conectado, mostra o painel de login
                        const panel = document.getElementById('cloud-auth-panel');
                        if (panel) {
                            panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
                        }
                    }
                });
            }
        }
        
        if (indicator) {
            // Mapear mensagens para ícones e cores
            let icon = '☁️';
            let bgColor = 'rgba(255,255,255,0.05)';
            let textColor = 'var(--gray-color)';
            
            if (kind === 'ok') {
                icon = '✅';
                bgColor = 'rgba(32, 217, 128, 0.2)';
                textColor = '#20D980';
            } else if (kind === 'err') {
                icon = '❌';
                bgColor = 'rgba(255, 77, 109, 0.2)';
                textColor = '#FF4D6D';
            } else if (message && message.toLowerCase().includes('sincronizando')) {
                icon = '🔄';
                bgColor = 'rgba(16, 242, 255, 0.2)';
                textColor = '#10F2FF';
            }
            
            indicator.innerHTML = `<span style="margin-right:4px;">${icon}</span><span>${message || 'Nuvem'}</span>`;
            indicator.style.background = bgColor;
            indicator.style.color = textColor;
            indicator.style.border = `1px solid ${textColor}40`;
        }
    }

    function setUserLabel(text) {
        const userLabel = document.getElementById('cloud-user-label');
        if (!userLabel) return;
        userLabel.textContent = text;
    }

    function ensureCloudUI() {
        if (document.getElementById('cloud-email') && document.getElementById('cloud-login-btn')) {
            return;
        }

        const panel = document.createElement('div');
        panel.id = 'cloud-auth-panel';
        panel.innerHTML = '' +
            '<input id="cloud-email" type="email" placeholder="Email" />' +
            '<input id="cloud-password" type="password" placeholder="Senha" />' +
            '<button id="cloud-login-btn" type="button">Entrar</button>' +
            '<button id="cloud-register-btn" type="button">Criar conta</button>' +
            '<button id="cloud-logout-btn" type="button">Sair</button>' +
            '<button id="cloud-sync-now-btn" type="button">Sincronizar Agora</button>' +
            '<span id="cloud-user-label">Não autenticado</span>' +
            '<span id="cloud-sync-status" class="warn">Modo local</span>';
        document.body.appendChild(panel);
    }

    function getProgressRef(uid) {
        return db.collection('users').doc(uid).collection('progress').doc('main');
    }

    async function pushCloud(force) {
        if (!cloudReady || !currentUser) return;
        if (saveInFlight) {
            saveQueued = true;
            return;
        }

        saveInFlight = true;
        persistServerMetaToApp();

        try {
            const payload = buildSerializableData();
            await getProgressRef(currentUser.uid).set({
                appData: payload,
                serverMeta: { ...serverMeta },
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: currentUser.email || currentUser.uid
            }, { merge: true });
            
            setSyncStatus(force ? 'Sincronizado (agora)' : 'Sincronizado', 'ok');
        } catch (err) {
            console.error('Erro ao salvar na nuvem:', err);
            setSyncStatus('Erro ao sincronizar', 'err');
        } finally {
            saveInFlight = false;
            if (saveQueued) {
                saveQueued = false;
                pushCloud(false);
            }
        }
    }

    // Salva apenas na nuvem (sem localStorage)
    function queueCloudSave() {
        if (!cloudReady || !currentUser) {
            // Usuário não está logado - mostrar aviso
            setSyncStatus('☁️ Faça login para salvar na nuvem', 'warn');
            return;
        }
        // Push imediato para a nuvem (mais seguro)
        pushCloud(false);
    }

    async function pullCloud(uid) {
        const snap = await getProgressRef(uid).get();
        if (!snap.exists) {
            updateServerMetaFromLocal();
            await pushCloud(true);
            return;
        }

        const remote = snap.data() || {};
        if (remote.serverMeta && typeof remote.serverMeta === 'object') {
            serverMeta.lastDailyReset = remote.serverMeta.lastDailyReset || null;
            serverMeta.lastWeeklyReset = remote.serverMeta.lastWeeklyReset || null;
        }

        const remoteAppData = remote.appData;
        if (!remoteAppData || typeof remoteAppData !== 'object') return;

        // Carregar dados da nuvem (substitui dados locais)
        Object.keys(appData).forEach(key => delete appData[key]);
        Object.assign(appData, deepClone(remoteAppData));
        
        setSyncStatus('Dados carregados da nuvem', 'ok');
        ensureDiaryMemoryMode();

        if (Array.isArray(remoteAppData.diaryEntries)) {
            appData.diaryEntries = remoteAppData.diaryEntries.slice();
            diaryCache = appData.diaryEntries;
            diaryLoaded = true;
        }

        applyDataGuards();

        if (typeof updateUI === 'function') updateUI({ mode: 'full', forceCalendar: true });
    }


    function overrideStorageFunctions() {
        window.loadFromLocalStorage = function () {
            const saved = parseJson(localStorage.getItem(CLOUD_CACHE_KEY), null);
            if (saved && typeof saved === 'object') mergeData(appData, saved);
            ensureDiaryMemoryMode();
            applyDataGuards();
            updateServerMetaFromLocal();
        };

        // Salva apenas na nuvem, sem localStorage
        window.saveToLocalStorage = function () {
            if (!cloudReady || !currentUser) {
                // Usuário não está logado - mostrar aviso
                setSyncStatus('☁️ Faça login para salvar', 'warn');
                console.warn('Tentativa de save sem login na nuvem');
                return;
            }
            // Salvar na nuvem
            queueCloudSave();
        };


        window.initDiaryStorage = async function () {
            ensureDiaryMemoryMode();
        };

        window.saveDiaryEntryToStorage = async function (entry) {
            // 🔧 Step 3: Usa funções IndexedDB corretas + saveManager
            if (typeof saveDiaryEntryToStorage === 'function' && diaryDbAvailable) {
                await saveDiaryEntryToStorage(entry);
            } else {
                if (!Array.isArray(appData.diaryEntries)) appData.diaryEntries = [];
                appData.diaryEntries.push(entry);
                diaryCache = appData.diaryEntries;
                diaryLoaded = true;
            }
            if (typeof queueSave === 'function') {
                queueSave();
            }
        };


        window.checkDailyReset = function () {
            const today = getLocalDateString();
            if (serverMeta.lastDailyReset !== today) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                applyPenalties(getLocalDateString(yesterday));

                appData.dailyWorkouts = [];
                appData.dailyStudies = [];
                generateDailyActivities();

                serverMeta.lastDailyReset = today;
                persistServerMetaToApp();
                saveToLocalStorage();
            }
        };

        window.checkWeeklyReset = function () {
            const today = new Date();
            const thisWeekKey = (typeof getWeekKey === 'function')
                ? getWeekKey(today)
                : `${today.getFullYear()}-W${getWeekNumber(today)}`;
            if (!serverMeta.lastWeeklyReset) {
                serverMeta.lastWeeklyReset = thisWeekKey;
                persistServerMetaToApp();
                saveToLocalStorage();
                return;
            }
        };

        window.resetProgress = async function () {
            if (!confirm('Tem certeza que deseja resetar todo o progresso? Isso não pode ser desfeito.')) return;
            const confirmationText = prompt('Digite RESETAR para confirmar a exclusão total do progresso:');
            if (confirmationText !== 'RESETAR') {
                alert('Reset cancelado.');
                return;
            }

            localStorage.removeItem(CLOUD_CACHE_KEY);
            localStorage.removeItem(AUTH_CACHE_KEY);

            if (cloudReady && currentUser) {
                try {
                    await getProgressRef(currentUser.uid).delete();
                } catch (err) {
                    console.error('Erro ao limpar progresso remoto:', err);
                }
            }

            location.reload();
        };
    }

    function bindAuthActions() {
        const emailEl = document.getElementById('cloud-email');
        const passwordEl = document.getElementById('cloud-password');
        const loginBtn = document.getElementById('cloud-login-btn');
        const registerBtn = document.getElementById('cloud-register-btn');
        const logoutBtn = document.getElementById('cloud-logout-btn');
        const syncNowBtn = document.getElementById('cloud-sync-now-btn');

        if (!emailEl || !passwordEl || !loginBtn || !registerBtn || !logoutBtn || !syncNowBtn) return;

        const savedAuth = parseJson(localStorage.getItem(AUTH_CACHE_KEY), {});
        if (savedAuth.email) emailEl.value = savedAuth.email;

        loginBtn.addEventListener('click', async function () {
            const email = (emailEl.value || '').trim();
            const password = passwordEl.value || '';
            if (!email || !password) {
                alert('Informe email e senha.');
                return;
            }
            localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({ email: email }));
            try {
                await auth.signInWithEmailAndPassword(email, password);
            } catch (err) {
                alert('Erro no login: ' + (err.message || err.code || 'desconhecido'));
            }
        });

        registerBtn.addEventListener('click', async function () {
            const email = (emailEl.value || '').trim();
            const password = passwordEl.value || '';
            if (!email || !password) {
                alert('Informe email e senha.');
                return;
            }
            localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({ email: email }));
            try {
                await auth.createUserWithEmailAndPassword(email, password);
            } catch (err) {
                alert('Erro ao criar conta: ' + (err.message || err.code || 'desconhecido'));
            }
        });

        logoutBtn.addEventListener('click', async function () {
            await auth.signOut();
        });

        syncNowBtn.addEventListener('click', async function () {
            if (!cloudReady || !currentUser) {
                alert('Faça login para sincronizar.');
                return;
            }
            await pushCloud(true);
        });
    }

    async function initFirebaseSync() {
        if (!window.firebase) {
            setSyncStatus('SDK Firebase não carregado', 'err');
            return;
        }

        if (!hasValidFirebaseConfig()) {
            setSyncStatus('Configure FIREBASE_CONFIG', 'warn');
            return;
        }

        if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
        auth = firebase.auth();
        db = firebase.firestore();

        bindAuthActions();

        auth.onAuthStateChanged(async function (user) {
            currentUser = user;

            if (!user) {
                cloudReady = false;
                setUserLabel('Não autenticado');
                setSyncStatus('Modo local (sem login)', 'warn');
                return;
            }

            cloudReady = true;
            setUserLabel('Usuario: ' + (user.email || user.uid));
            setSyncStatus('Conectado. Sincronizando...', 'warn');

            try {
                await pullCloud(user.uid);
            } catch (err) {
                console.error('Erro ao carregar nuvem:', err);
                setSyncStatus('Falha ao carregar nuvem', 'err');
            }
        });
    }

    function init() {
        ensureDiaryMemoryMode();
        overrideStorageFunctions();

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () {
                ensureCloudUI();
                initFirebaseSync();
            });
            return;
        }

        ensureCloudUI();
        initFirebaseSync();
    }

    init();
})();


