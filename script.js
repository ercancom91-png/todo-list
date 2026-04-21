const SUPABASE_URL = "https://neprqaxvdpqtjrxrvwka.supabase.co";
const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lcHJxYXh2ZHBxdGpyeHJ2d2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjEyNjYsImV4cCI6MjA5MjMzNzI2Nn0.vlMZPyJhhz1EJeZFKfjZl3DQ8KHMh5g7LWsovVoUiVI";
const TABLE = "tasks";
const REST = `${SUPABASE_URL}/rest/v1/${TABLE}`;

const taskInput = document.getElementById("taskInput");
const addForm = document.getElementById("addForm");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const filtersEl = document.getElementById("filters");
const appFooter = document.getElementById("appFooter");
const remainingCount = document.getElementById("remainingCount");
const clearCompletedBtn = document.getElementById("clearCompleted");
const subtitle = document.getElementById("subtitle");

let tasks = [];
let currentFilter = "all";
let isLoading = true;

function apiHeaders(extra = {}) {
    return {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        ...extra,
    };
}

async function api(path, options = {}) {
    const res = await fetch(`${REST}${path}`, {
        ...options,
        headers: apiHeaders(options.headers),
    });
    if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText} ${errText}`);
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

async function fetchTasks() {
    return api("?select=*&order=created_at.desc");
}

async function insertTask(text) {
    const rows = await api("", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ text }),
    });
    return rows[0];
}

async function patchTask(id, patch) {
    const rows = await api(`?id=eq.${id}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(patch),
    });
    return rows[0];
}

async function removeTask(id) {
    await api(`?id=eq.${id}`, { method: "DELETE" });
}

async function removeCompleted() {
    await api(`?completed=eq.true`, { method: "DELETE" });
}

function flashError(msg) {
    subtitle.textContent = msg;
    subtitle.style.color = "var(--danger)";
    setTimeout(() => {
        subtitle.textContent = "Bugün neler başaracaksın?";
        subtitle.style.color = "";
    }, 2500);
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
    if (!trimmed) {
        handleDelete(id);
        return;
    }
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const prev = task.text;
    if (prev === trimmed) {
        render();
        return;
    }
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
        emptyS.textContent = "Supabase'den görevler getiriliyor.";
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

async function init() {
    render();
    try {
        tasks = await fetchTasks();
        isLoading = false;
        render();
    } catch (e) {
        isLoading = false;
        tasks = [];
        render();
        flashError("Görevler yüklenemedi.");
        console.error(e);
    }
}

init();
