const SUPABASE_URL = "https://neprqaxvdpqtjrxrvwka.supabase.co";
const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lcHJxYXh2ZHBxdGpyeHJ2d2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjEyNjYsImV4cCI6MjA5MjMzNzI2Nn0.vlMZPyJhhz1EJeZFKfjZl3DQ8KHMh5g7LWsovVoUiVI";
const TABLE = "tasks";
const REST = `${SUPABASE_URL}/rest/v1/${TABLE}`;
const AUTH = `${SUPABASE_URL}/auth/v1`;
const SITE_URL = window.location.origin + window.location.pathname.replace(/[^/]*$/, "");
const SESSION_KEY = "todo.session.v1";

// ===== Elements =====
const boot = document.getElementById("boot");
const authScreen = document.getElementById("authScreen");
const appScreen = document.getElementById("appScreen");
const recoveryScreen = document.getElementById("recoveryScreen");
const forgotScreen = document.getElementById("forgotScreen");

const authForm = document.getElementById("authForm");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authSubmit = document.getElementById("authSubmit");
const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const authSwitchText = document.getElementById("authSwitchText");
const authToggle = document.getElementById("authToggle");
const authMessage = document.getElementById("authMessage");
const forgotBtn = document.getElementById("forgotBtn");

const recoveryForm = document.getElementById("recoveryForm");
const newPasswordInput = document.getElementById("newPassword");
const recoveryMessage = document.getElementById("recoveryMessage");
const recoverySubmit = document.getElementById("recoverySubmit");

const forgotForm = document.getElementById("forgotForm");
const forgotEmailInput = document.getElementById("forgotEmail");
const forgotMessage = document.getElementById("forgotMessage");
const forgotSubmit = document.getElementById("forgotSubmit");
const backToSignInBtn = document.getElementById("backToSignInBtn");

const userEmailEl = document.getElementById("userEmail");
const signOutBtn = document.getElementById("signOutBtn");
const subtitle = document.getElementById("subtitle");
const taskInput = document.getElementById("taskInput");
const addForm = document.getElementById("addForm");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const filtersEl = document.getElementById("filters");
const appFooter = document.getElementById("appFooter");
const remainingCount = document.getElementById("remainingCount");
const clearCompletedBtn = document.getElementById("clearCompleted");

// ===== State =====
let session = null; // { access_token, refresh_token, expires_at, user: { id, email } }
let authMode = "signin"; // 'signin' | 'signup'
let tasks = [];
let currentFilter = "all";
let isLoading = false;
const plantAnimations = new Map(); // id -> 'plant' | 'bloom'

const MOTIVATIONS_BLOOM = [
    "Bir tohum daha çiçeklendi 🌸",
    "Harika! Bahçen güzelleşiyor ✨",
    "Emek boşa gitmedi, bak nasıl açtı 🌼",
    "Bir adım daha doğaya yakın 🌿",
    "Sen ektin, o çiçek açtı 🌷",
];
const MOTIVATIONS_FULL = "Bahçen bugün tamamen çiçekte 🌸🌻🌷";
const MOTIVATIONS_PLANT = [
    "Yeni bir tohum ektin 🌱",
    "Güzel bir niyet toprağa düştü 🌰",
    "Büyümesini izlemek için sabırla sula 💧",
];

// ===== Session Storage =====
function saveSession(s) {
    session = s;
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
}

function loadSession() {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const s = JSON.parse(raw);
        if (s.expires_at && s.expires_at * 1000 < Date.now()) return null;
        return s;
    } catch {
        return null;
    }
}

// ===== Messages =====
function showAuthMessage(text, type = "info") {
    authMessage.textContent = text;
    authMessage.className = `auth-message ${type}`;
    authMessage.hidden = false;
}

function clearAuthMessage() {
    authMessage.hidden = true;
    authMessage.textContent = "";
}

const DEFAULT_SUBTITLE = "Bugün hangi tohumları ekeceksin?";

function flashError(msg) {
    subtitle.textContent = msg;
    subtitle.style.color = "var(--danger)";
    setTimeout(() => {
        subtitle.textContent = DEFAULT_SUBTITLE;
        subtitle.style.color = "";
    }, 2500);
}

function flashSuccess(msg) {
    subtitle.textContent = msg;
    subtitle.classList.add("celebrate");
    setTimeout(() => {
        subtitle.textContent = DEFAULT_SUBTITLE;
        subtitle.classList.remove("celebrate");
    }, 2800);
}

// ===== Auth API =====
async function authFetch(path, body) {
    const res = await fetch(`${AUTH}${path}`, {
        method: "POST",
        headers: {
            apikey: SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = data.msg || data.error_description || data.message || `Hata (${res.status})`;
        throw new Error(msg);
    }
    return data;
}

async function signUp(email, password) {
    const url = `${AUTH}/signup?redirect_to=${encodeURIComponent(SITE_URL)}`;
    const res = await fetch(url, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = data.msg || data.error_description || data.message || `Hata (${res.status})`;
        throw new Error(msg);
    }
    return data;
}

async function signIn(email, password) {
    return authFetch("/token?grant_type=password", { email, password });
}

async function recoverPassword(email) {
    const url = `${AUTH}/recover?redirect_to=${encodeURIComponent(SITE_URL)}`;
    const res = await fetch(url, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.msg || data.error_description || data.message || `Hata (${res.status})`);
    }
}

async function updatePassword(newPassword) {
    const res = await fetch(`${AUTH}/user`, {
        method: "PUT",
        headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: newPassword }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.msg || data.error_description || data.message || `Hata (${res.status})`);
    }
}

async function signOut() {
    if (!session) return;
    try {
        await fetch(`${AUTH}/logout`, {
            method: "POST",
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${session.access_token}`,
            },
        });
    } catch {
        /* ignore */
    }
    saveSession(null);
    tasks = [];
    showAuthScreen();
}

function sessionFromTokenResponse(data) {
    return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
        user: data.user ? { id: data.user.id, email: data.user.email } : null,
    };
}

// ===== URL Hash handling (email confirmation / recovery callbacks) =====
function parseHashParams() {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    if (!hash) return null;
    const params = new URLSearchParams(hash);
    if (!params.has("access_token") && !params.has("error")) return null;
    return params;
}

function clearHash() {
    history.replaceState(null, "", window.location.pathname + window.location.search);
}

async function handleCallback(params) {
    if (params.has("error")) {
        const desc = params.get("error_description") || params.get("error");
        clearHash();
        showAuthScreen();
        showAuthMessage(`Doğrulama başarısız: ${decodeURIComponent(desc)}`, "error");
        return false;
    }

    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const expires_in = parseInt(params.get("expires_in") || "3600", 10);
    const type = params.get("type");

    // fetch user info
    let user = null;
    try {
        const res = await fetch(`${AUTH}/user`, {
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${access_token}`,
            },
        });
        if (res.ok) {
            const u = await res.json();
            user = { id: u.id, email: u.email };
        }
    } catch {
        /* ignore */
    }

    saveSession({
        access_token,
        refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + expires_in,
        user,
    });
    clearHash();

    if (type === "recovery") {
        showRecoveryScreen();
        return "recovery";
    }
    if (type === "signup") {
        setTimeout(() => flashSuccess("Bahçene hoş geldin 🌱"), 80);
    }
    return true;
}

// ===== Tasks REST (authenticated) =====
function apiHeaders(extra = {}) {
    return {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        ...extra,
    };
}

async function api(path, options = {}) {
    const res = await fetch(`${REST}${path}`, {
        ...options,
        headers: apiHeaders(options.headers),
    });
    if (res.status === 401) {
        saveSession(null);
        showAuthScreen();
        showAuthMessage("Oturumun sona erdi, tekrar giriş yap.", "info");
        throw new Error("unauthorized");
    }
    if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`${res.status} ${t}`);
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

const fetchTasks = () => api("?select=*&order=created_at.desc");

const insertTask = (text) =>
    api("", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ text }),
    }).then((r) => r[0]);

const patchTask = (id, patch) =>
    api(`?id=eq.${id}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(patch),
    }).then((r) => r[0]);

const removeTask = (id) => api(`?id=eq.${id}`, { method: "DELETE" });
const removeCompleted = () => api(`?completed=eq.true`, { method: "DELETE" });

// ===== Task handlers (optimistic) =====
function randomOf(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

async function handleAdd(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic = {
        id: tempId,
        text: trimmed,
        completed: false,
        created_at: new Date().toISOString(),
        _pending: true,
    };
    tasks.unshift(optimistic);
    plantAnimations.set(tempId, "plant");
    render();
    flashSuccess(randomOf(MOTIVATIONS_PLANT));

    try {
        const saved = await insertTask(trimmed);
        const idx = tasks.findIndex((t) => t.id === tempId);
        if (idx !== -1) tasks[idx] = saved;
        render();
    } catch (e) {
        tasks = tasks.filter((t) => t.id !== tempId);
        render();
        flashError("Tohum ekilemedi.");
        console.error(e);
    }
}

async function handleToggle(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const prev = task.completed;
    task.completed = !prev;
    if (task.completed) {
        plantAnimations.set(id, "bloom");
    }
    render();

    if (task.completed) {
        const allDone = tasks.length > 0 && tasks.every((t) => t.completed);
        flashSuccess(allDone ? MOTIVATIONS_FULL : randomOf(MOTIVATIONS_BLOOM));
    }

    try {
        await patchTask(id, { completed: task.completed });
    } catch (e) {
        task.completed = prev;
        render();
        flashError("Güncellenemedi.");
        console.error(e);
    }
}

async function handleDelete(id) {
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) return;

    const li = taskList.querySelector(`[data-id="${CSS.escape(String(id))}"]`);
    if (li) li.classList.add("wilting");

    // wait for wilt animation before removing from state
    await new Promise((r) => setTimeout(r, 430));

    const currentIdx = tasks.findIndex((t) => t.id === id);
    if (currentIdx === -1) return;
    const [removed] = tasks.splice(currentIdx, 1);
    render();

    try {
        await removeTask(id);
    } catch (e) {
        tasks.splice(currentIdx, 0, removed);
        render();
        flashError("Sökülemedi.");
        console.error(e);
    }
}

async function handleUpdate(id, newText) {
    const trimmed = newText.trim();
    if (!trimmed) return handleDelete(id);
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const prev = task.text;
    if (prev === trimmed) return render();
    task.text = trimmed;
    render();
    try {
        await patchTask(id, { text: trimmed });
    } catch (e) {
        task.text = prev;
        render();
        flashError("Güncellenemedi.");
        console.error(e);
    }
}

async function handleClearCompleted() {
    const completed = tasks.filter((t) => t.completed);
    if (completed.length === 0) return;
    const backup = [...tasks];
    tasks = tasks.filter((t) => !t.completed);
    render();
    try {
        await removeCompleted();
    } catch (e) {
        tasks = backup;
        render();
        flashError("Temizlenemedi.");
        console.error(e);
    }
}

function getFilteredTasks() {
    if (currentFilter === "active") return tasks.filter((t) => !t.completed);
    if (currentFilter === "completed") return tasks.filter((t) => t.completed);
    return tasks;
}

// ===== Render =====
const ICON_EDIT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
const ICON_DELETE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path></svg>`;

const BLOOMS = ["🌸", "🌻", "🌷", "🌺", "🌼", "🪻", "🌹"];

function hashId(id) {
    let h = 0;
    const s = String(id);
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
}

function emojiFor(task) {
    if (task.completed) return BLOOMS[hashId(task.id) % BLOOMS.length];
    return "🌱";
}

function renderTaskItem(task, { animatePlant } = {}) {
    const li = document.createElement("li");
    li.className = "task-item" + (task.completed ? " completed" : "");
    if (task._pending) li.style.opacity = "0.6";
    li.dataset.id = task.id;

    const plantBtn = document.createElement("button");
    plantBtn.type = "button";
    plantBtn.className = "plant-btn";
    plantBtn.title = task.completed ? "Tohuma geri döndür" : "Çiçeklendir";
    plantBtn.setAttribute("aria-label", plantBtn.title);
    plantBtn.setAttribute("aria-pressed", task.completed ? "true" : "false");
    plantBtn.disabled = !!task._pending;

    const emojiSpan = document.createElement("span");
    emojiSpan.className = "plant-emoji";
    emojiSpan.textContent = emojiFor(task);
    plantBtn.appendChild(emojiSpan);

    if (animatePlant === "plant") plantBtn.classList.add("planting");
    if (animatePlant === "bloom") plantBtn.classList.add("blooming");

    plantBtn.addEventListener("click", () => handleToggle(task.id));

    const textSpan = document.createElement("span");
    textSpan.className = "task-text";
    textSpan.textContent = task.text;
    textSpan.title = "Düzenlemek için çift tıkla";
    textSpan.addEventListener("dblclick", () => {
        if (!task._pending) beginEdit(li, task);
    });

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "icon-btn edit";
    editBtn.title = "Düzenle";
    editBtn.setAttribute("aria-label", "Düzenle");
    editBtn.innerHTML = ICON_EDIT;
    editBtn.disabled = !!task._pending;
    editBtn.addEventListener("click", () => beginEdit(li, task));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "icon-btn delete";
    deleteBtn.title = "Sök";
    deleteBtn.setAttribute("aria-label", "Sök");
    deleteBtn.innerHTML = ICON_DELETE;
    deleteBtn.disabled = !!task._pending;
    deleteBtn.addEventListener("click", () => {
        if (confirm("Bu bitkiyi bahçenden sökmek istediğine emin misin?")) {
            handleDelete(task.id);
        }
    });

    actions.append(editBtn, deleteBtn);
    li.append(plantBtn, textSpan, actions);
    return li;
}

function beginEdit(li, task) {
    if (li.querySelector(".task-edit-input")) return;

    const textSpan = li.querySelector(".task-text");
    const actions = li.querySelector(".task-actions");

    const input = document.createElement("input");
    input.type = "text";
    input.className = "task-edit-input";
    input.value = task.text;
    input.maxLength = 500;

    let submitted = false;
    const commit = () => {
        if (submitted) return;
        submitted = true;
        handleUpdate(task.id, input.value);
    };
    const cancel = () => {
        submitted = true;
        render();
    };

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") commit();
        else if (e.key === "Escape") cancel();
    });
    input.addEventListener("blur", commit);

    li.replaceChild(input, textSpan);
    if (actions) actions.style.display = "none";
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
}

function render() {
    const filtered = getFilteredTasks();
    taskList.innerHTML = "";

    const emptyP = emptyState.querySelector("p");
    const emptyS = emptyState.querySelector("span");

    if (isLoading) {
        emptyState.hidden = false;
        emptyP.textContent = "Bahçe canlanıyor…";
        emptyS.textContent = "Tohumlar toprağa yerleşiyor.";
        appFooter.hidden = true;
        return;
    }

    if (tasks.length === 0) {
        emptyState.hidden = false;
        emptyP.textContent = "Bahçen henüz boş.";
        emptyS.textContent = "İlk niyet tohumunu ekmeye ne dersin?";
    } else if (filtered.length === 0) {
        emptyState.hidden = false;
        emptyP.textContent = "Bu filtrede bitki yok.";
        emptyS.textContent = "Başka bir sekmeyi deneyebilirsin.";
    } else {
        emptyState.hidden = true;
        const fragment = document.createDocumentFragment();
        const toConsume = [];
        filtered.forEach((task) => {
            const anim = plantAnimations.get(task.id);
            if (anim) toConsume.push(task.id);
            fragment.appendChild(renderTaskItem(task, { animatePlant: anim }));
        });
        taskList.appendChild(fragment);
        toConsume.forEach((id) => plantAnimations.delete(id));
    }

    const remaining = tasks.filter((t) => !t.completed).length;
    const bloomed = tasks.filter((t) => t.completed).length;

    if (tasks.length === 0) {
        appFooter.hidden = true;
    } else {
        appFooter.hidden = false;
        if (remaining === 0) {
            remainingCount.textContent = "Bütün bahçen çiçekte 🌸";
        } else if (bloomed === 0) {
            remainingCount.textContent = `${remaining} tohum filizleniyor 🌱`;
        } else {
            remainingCount.textContent = `${remaining} filiz · ${bloomed} çiçek`;
        }
        clearCompletedBtn.style.visibility = bloomed > 0 ? "visible" : "hidden";
    }
}

// ===== Screen switching =====
function hideAllScreens() {
    authScreen.hidden = true;
    appScreen.hidden = true;
    recoveryScreen.hidden = true;
    forgotScreen.hidden = true;
    boot.hidden = true;
}

function showAuthScreen() {
    hideAllScreens();
    authScreen.hidden = false;
}

function showAppScreen() {
    hideAllScreens();
    appScreen.hidden = false;
    userEmailEl.textContent = session?.user?.email || "";
}

function showRecoveryScreen() {
    hideAllScreens();
    recoveryScreen.hidden = false;
    recoveryMessage.hidden = true;
    newPasswordInput.value = "";
    setTimeout(() => newPasswordInput.focus(), 100);
}

function showForgotScreen() {
    hideAllScreens();
    forgotScreen.hidden = false;
    forgotMessage.hidden = true;
    forgotEmailInput.value = authEmail.value || "";
    setTimeout(() => forgotEmailInput.focus(), 100);
}

function showRecoveryMessage(text, type = "info") {
    recoveryMessage.textContent = text;
    recoveryMessage.className = `auth-message ${type}`;
    recoveryMessage.hidden = false;
}

function showForgotMessage(text, type = "info") {
    forgotMessage.textContent = text;
    forgotMessage.className = `auth-message ${type}`;
    forgotMessage.hidden = false;
}

function setAuthMode(mode) {
    authMode = mode;
    clearAuthMessage();
    if (mode === "signup") {
        authTitle.textContent = "Bahçeni Oluştur";
        authSubtitle.textContent = "Kendi niyet bahçeni kurmaya başla.";
        authSubmit.textContent = "Bahçeyi Aç";
        authSwitchText.textContent = "Zaten bahçen var mı?";
        authToggle.textContent = "Giriş yap";
        authPassword.setAttribute("autocomplete", "new-password");
    } else {
        authTitle.textContent = "Bahçene Gir";
        authSubtitle.textContent = "Niyet tohumlarına dönmek için giriş yap.";
        authSubmit.textContent = "Giriş Yap";
        authSwitchText.textContent = "Henüz bahçen yok mu?";
        authToggle.textContent = "Bahçeni oluştur";
        authPassword.setAttribute("autocomplete", "current-password");
    }
}

// ===== Event listeners =====
authToggle.addEventListener("click", () => setAuthMode(authMode === "signin" ? "signup" : "signin"));

authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = authEmail.value.trim();
    const password = authPassword.value;
    if (!email || !password) return;

    clearAuthMessage();
    authSubmit.disabled = true;
    const originalLabel = authSubmit.textContent;
    authSubmit.textContent = "Lütfen bekle…";

    try {
        if (authMode === "signup") {
            const data = await signUp(email, password);
            // When email confirmation is on, no session is returned; user must confirm.
            if (data.session && data.session.access_token) {
                saveSession(sessionFromTokenResponse(data.session));
                await bootApp();
                return;
            }
            showAuthMessage(
                `${email} adresine bir onay e-postası gönderildi. Lütfen gelen kutunu kontrol et ve bağlantıya tıkla. Bağlantı seni bu siteye geri getirecek ve oturumun otomatik açılacak.`,
                "success"
            );
            authForm.reset();
            setAuthMode("signin");
        } else {
            const data = await signIn(email, password);
            saveSession(sessionFromTokenResponse(data));
            await bootApp();
        }
    } catch (err) {
        const msg = String(err.message || err);
        let friendly = msg;
        if (/Email not confirmed/i.test(msg)) friendly = "E-postan henüz onaylanmadı. Gelen kutunu kontrol et.";
        else if (/Invalid login credentials/i.test(msg)) friendly = "E-posta veya şifre hatalı.";
        else if (/User already registered/i.test(msg)) friendly = "Bu e-posta zaten kayıtlı. Giriş yapmayı dene.";
        else if (/Password should be at least/i.test(msg)) friendly = "Şifre en az 6 karakter olmalı.";
        showAuthMessage(friendly, "error");
    } finally {
        authSubmit.disabled = false;
        authSubmit.textContent = originalLabel;
    }
});

forgotBtn.addEventListener("click", () => {
    showForgotScreen();
});

backToSignInBtn.addEventListener("click", () => {
    showAuthScreen();
});

forgotForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = forgotEmailInput.value.trim();
    if (!email) return;

    forgotMessage.hidden = true;
    forgotSubmit.disabled = true;
    const originalLabel = forgotSubmit.textContent;
    forgotSubmit.textContent = "Gönderiliyor…";

    try {
        await recoverPassword(email);
        showForgotMessage(
            `${email} adresine bir sıfırlama bağlantısı gönderildi. Gelen kutunu kontrol et.`,
            "success"
        );
    } catch (err) {
        const msg = String(err.message || err);
        showForgotMessage(
            /rate limit|for security purposes|over email send rate/i.test(msg)
                ? "Kısa sürede çok fazla istek gönderildi. Bir süre bekleyip tekrar dene."
                : msg,
            "error"
        );
    } finally {
        forgotSubmit.disabled = false;
        forgotSubmit.textContent = originalLabel;
    }
});

recoveryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newPass = newPasswordInput.value;
    if (!newPass || newPass.length < 6) {
        showRecoveryMessage("Şifre en az 6 karakter olmalı.", "error");
        return;
    }
    recoverySubmit.disabled = true;
    const originalLabel = recoverySubmit.textContent;
    recoverySubmit.textContent = "Güncelleniyor…";

    try {
        await updatePassword(newPass);
        showRecoveryMessage("Şifre güncellendi. Bahçene yönlendiriliyorsun…", "success");
        setTimeout(() => {
            bootApp();
        }, 1200);
    } catch (err) {
        showRecoveryMessage(err.message || "Şifre güncellenemedi.", "error");
        recoverySubmit.disabled = false;
        recoverySubmit.textContent = originalLabel;
    }
});

signOutBtn.addEventListener("click", signOut);

addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = taskInput.value;
    taskInput.value = "";
    taskInput.focus();
    handleAdd(value);
});

filtersEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    currentFilter = btn.dataset.filter;
    filtersEl.querySelectorAll(".filter-btn").forEach((b) => b.classList.toggle("active", b === btn));
    render();
});

clearCompletedBtn.addEventListener("click", handleClearCompleted);

// ===== Boot =====
async function bootApp() {
    showAppScreen();
    isLoading = true;
    tasks = [];
    render();
    try {
        tasks = (await fetchTasks()) || [];
    } catch (e) {
        console.error(e);
    }
    isLoading = false;
    render();
}

async function init() {
    setAuthMode("signin");

    // 1. Handle email confirmation / recovery callback if present in URL hash
    const params = parseHashParams();
    if (params) {
        const result = await handleCallback(params);
        if (result === "recovery") return; // recovery screen already shown
        if (result === true) {
            await bootApp();
            return;
        }
    }

    // 2. Restore saved session
    const saved = loadSession();
    if (saved) {
        session = saved;
        await bootApp();
        return;
    }

    // 3. Show auth screen
    showAuthScreen();
}

init();
