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

const authForm = document.getElementById("authForm");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authSubmit = document.getElementById("authSubmit");
const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const authSwitchText = document.getElementById("authSwitchText");
const authToggle = document.getElementById("authToggle");
const authMessage = document.getElementById("authMessage");

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

function flashError(msg) {
    subtitle.textContent = msg;
    subtitle.style.color = "var(--danger)";
    setTimeout(() => {
        subtitle.textContent = "Bugün neler başaracaksın?";
        subtitle.style.color = "";
    }, 2500);
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

    if (type === "signup") {
        // optional UX message on first load after confirmation
        setTimeout(() => flashError("E-posta doğrulandı, hoş geldin!"), 50);
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
    render();

    try {
        const saved = await insertTask(trimmed);
        const idx = tasks.findIndex((t) => t.id === tempId);
        if (idx !== -1) tasks[idx] = saved;
        render();
    } catch (e) {
        tasks = tasks.filter((t) => t.id !== tempId);
        render();
        flashError("Görev eklenemedi.");
        console.error(e);
    }
}

async function handleToggle(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const prev = task.completed;
    task.completed = !prev;
    render();
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
    const [removed] = tasks.splice(idx, 1);
    render();
    try {
        await removeTask(id);
    } catch (e) {
        tasks.splice(idx, 0, removed);
        render();
        flashError("Silinemedi.");
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

function renderTaskItem(task) {
    const li = document.createElement("li");
    li.className = "task-item" + (task.completed ? " completed" : "");
    if (task._pending) li.style.opacity = "0.6";
    li.dataset.id = task.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.completed;
    checkbox.disabled = !!task._pending;
    checkbox.addEventListener("change", () => handleToggle(task.id));

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
    deleteBtn.title = "Sil";
    deleteBtn.setAttribute("aria-label", "Sil");
    deleteBtn.innerHTML = ICON_DELETE;
    deleteBtn.disabled = !!task._pending;
    deleteBtn.addEventListener("click", () => {
        if (confirm("Bu görevi silmek istediğine emin misin?")) {
            handleDelete(task.id);
        }
    });

    actions.append(editBtn, deleteBtn);
    li.append(checkbox, textSpan, actions);
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
        emptyP.textContent = "Yükleniyor…";
        emptyS.textContent = "Görevler getiriliyor.";
        appFooter.hidden = true;
        return;
    }

    if (tasks.length === 0) {
        emptyState.hidden = false;
        emptyP.textContent = "Henüz bir görev yok.";
        emptyS.textContent = "Yukarıdan ilk görevini ekleyebilirsin.";
    } else if (filtered.length === 0) {
        emptyState.hidden = false;
        emptyP.textContent = "Bu filtrede görev yok.";
        emptyS.textContent = "Başka bir sekmeyi dene.";
    } else {
        emptyState.hidden = true;
        const fragment = document.createDocumentFragment();
        filtered.forEach((task) => fragment.appendChild(renderTaskItem(task)));
        taskList.appendChild(fragment);
    }

    const remaining = tasks.filter((t) => !t.completed).length;
    const hasCompleted = tasks.some((t) => t.completed);

    if (tasks.length === 0) {
        appFooter.hidden = true;
    } else {
        appFooter.hidden = false;
        remainingCount.textContent =
            remaining === 0
                ? "Tüm görevler tamamlandı 🎉"
                : `${remaining} görev kaldı`;
        clearCompletedBtn.style.visibility = hasCompleted ? "visible" : "hidden";
    }
}

// ===== Screen switching =====
function showAuthScreen() {
    authScreen.hidden = false;
    appScreen.hidden = true;
    boot.hidden = true;
}

function showAppScreen() {
    authScreen.hidden = true;
    appScreen.hidden = false;
    boot.hidden = true;
    userEmailEl.textContent = session?.user?.email || "";
}

function setAuthMode(mode) {
    authMode = mode;
    clearAuthMessage();
    if (mode === "signup") {
        authTitle.textContent = "Kayıt Ol";
        authSubtitle.textContent = "Yeni bir hesap oluştur.";
        authSubmit.textContent = "Kayıt Ol";
        authSwitchText.textContent = "Zaten hesabın var mı?";
        authToggle.textContent = "Giriş yap";
        authPassword.setAttribute("autocomplete", "new-password");
    } else {
        authTitle.textContent = "Giriş Yap";
        authSubtitle.textContent = "Görevlerine erişmek için giriş yap.";
        authSubmit.textContent = "Giriş Yap";
        authSwitchText.textContent = "Hesabın yok mu?";
        authToggle.textContent = "Kayıt ol";
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

    // 1. Handle email confirmation callback if present in URL hash
    const params = parseHashParams();
    if (params) {
        const ok = await handleCallback(params);
        if (ok) {
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
