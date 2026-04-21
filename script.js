const STORAGE_KEY = "todo.tasks.v1";

const taskInput = document.getElementById("taskInput");
const addForm = document.getElementById("addForm");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const filtersEl = document.getElementById("filters");
const appFooter = document.getElementById("appFooter");
const remainingCount = document.getElementById("remainingCount");
const clearCompletedBtn = document.getElementById("clearCompleted");

let tasks = loadTasks();
let currentFilter = "all";

function loadTasks() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function createTask(text) {
    return {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        text: text.trim(),
        completed: false,
        createdAt: Date.now(),
    };
}

function addTask(text) {
    if (!text.trim()) return;
    tasks.unshift(createTask(text));
    saveTasks();
    render();
}

function toggleTask(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    task.completed = !task.completed;
    saveTasks();
    render();
}

function deleteTask(id) {
    tasks = tasks.filter((t) => t.id !== id);
    saveTasks();
    render();
}

function updateTask(id, newText) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const trimmed = newText.trim();
    if (!trimmed) {
        deleteTask(id);
        return;
    }
    task.text = trimmed;
    saveTasks();
    render();
}

function clearCompleted() {
    tasks = tasks.filter((t) => !t.completed);
    saveTasks();
    render();
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
    li.dataset.id = task.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.completed;
    checkbox.addEventListener("change", () => toggleTask(task.id));

    const textSpan = document.createElement("span");
    textSpan.className = "task-text";
    textSpan.textContent = task.text;
    textSpan.title = "Düzenlemek için çift tıkla";
    textSpan.addEventListener("dblclick", () => beginEdit(li, task));

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "icon-btn edit";
    editBtn.title = "Düzenle";
    editBtn.setAttribute("aria-label", "Düzenle");
    editBtn.innerHTML = ICON_EDIT;
    editBtn.addEventListener("click", () => beginEdit(li, task));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "icon-btn delete";
    deleteBtn.title = "Sil";
    deleteBtn.setAttribute("aria-label", "Sil");
    deleteBtn.innerHTML = ICON_DELETE;
    deleteBtn.addEventListener("click", () => {
        if (confirm("Bu görevi silmek istediğine emin misin?")) {
            deleteTask(task.id);
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
    input.maxLength = 120;

    const commit = () => updateTask(task.id, input.value);
    const cancel = () => render();

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

    if (tasks.length === 0) {
        emptyState.hidden = false;
        emptyState.querySelector("p").textContent = "Henüz bir görev yok.";
        emptyState.querySelector("span").textContent = "Yukarıdan ilk görevini ekleyebilirsin.";
    } else if (filtered.length === 0) {
        emptyState.hidden = false;
        emptyState.querySelector("p").textContent = "Bu filtrede görev yok.";
        emptyState.querySelector("span").textContent = "Başka bir sekmeyi dene.";
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
    addTask(taskInput.value);
    taskInput.value = "";
    taskInput.focus();
});

filtersEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    currentFilter = btn.dataset.filter;
    filtersEl.querySelectorAll(".filter-btn").forEach((b) => b.classList.toggle("active", b === btn));
    render();
});

clearCompletedBtn.addEventListener("click", clearCompleted);

render();
