// index.js - semua logika aplikasi todo (satu file)

// KEY untuk localStorage
const STORAGE_KEY = "todos_v1";

// DOM references
const form = document.getElementById("formData");
const todoInput = document.getElementById("todoInput");
const todoListEl = document.getElementById("todoList");
const searchInput = document.getElementById("searchInput");
const filterButtons = document.querySelectorAll(".btn-filter");
const totalBadge = document.getElementById("totalBadge");
const pendingBadge = document.getElementById("pendingBadge");
const completedBadge = document.getElementById("completedBadge");

let todos = []; // array of { id, todo, completed, createdAt }

// Utilities
function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}
function loadTodos() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    if (Array.isArray(data)) todos = data;
  } catch (e) {
    console.error("Failed parse todos", e);
  }
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Current UI state
let currentFilter = "all"; // 'all' | 'pending' | 'completed'
let currentSearch = "";

// Rendering
function renderTodos() {
  // Apply filter + search
  const search = currentSearch.trim().toLowerCase();
  const listToShow = todos.filter(t => {
    if (currentFilter === "pending" && t.completed) return false;
    if (currentFilter === "completed" && !t.completed) return false;
    if (!search) return true;
    return t.todo.toLowerCase().includes(search);
  });

  // Clear
  todoListEl.innerHTML = "";

  // Build elements
  listToShow.forEach((item) => {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex align-items-center";
    li.dataset.id = item.id;

    // Drag handle
    const dragHandle = document.createElement("span");
    dragHandle.className = "drag-handle";
    dragHandle.innerHTML = `<i class="bi bi-list"></i>`;
    dragHandle.title = "Drag untuk mengubah urutan";
    li.appendChild(dragHandle);

    // Left: checkbox + label / input
    const left = document.createElement("div");
    left.className = "flex-fill d-flex align-items-center gap-2";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "form-check-input";
    checkbox.checked = item.completed;
    checkbox.style.marginRight = "8px";
    checkbox.addEventListener("change", () => {
      item.completed = checkbox.checked;
      saveTodos();
      // keep rendering to update strikethrough & counts & search/filter behavior
      renderTodos();
    });

    left.appendChild(checkbox);

    const labelWrap = document.createElement("div");
    labelWrap.className = "flex-fill";

    const label = document.createElement("label");
    label.className = "form-check-label mb-0 d-block";
    label.textContent = item.todo;
    if (item.completed) {
      label.style.textDecoration = "line-through";
      label.classList.add("text-muted");
    } else {
      label.style.textDecoration = "none";
      label.classList.remove("text-muted");
    }

    labelWrap.appendChild(label);
    left.appendChild(labelWrap);

    li.appendChild(left);

    // Right: actions
    const actions = document.createElement("div");
    actions.className = "actions d-flex gap-1";

    // Edit button
    const btnEdit = document.createElement("button");
    btnEdit.className = "btn btn-sm btn-outline-secondary";
    btnEdit.innerHTML = '<i class="bi bi-pencil"></i>';
    btnEdit.title = "Ubah todo";
    btnEdit.addEventListener("click", () => startEditItem(item.id, li));
    actions.appendChild(btnEdit);

    // Delete button
    const btnDelete = document.createElement("button");
    btnDelete.className = "btn btn-sm btn-outline-danger";
    btnDelete.innerHTML = '<i class="bi bi-trash"></i>';
    btnDelete.title = "Hapus todo";
    btnDelete.addEventListener("click", () => {
      if (confirm("Hapus todo ini?")) {
        todos = todos.filter(t => t.id !== item.id);
        saveTodos();
        renderTodos();
      }
    });
    actions.appendChild(btnDelete);

    li.appendChild(actions);

    todoListEl.appendChild(li);
  });

  updateBadges();
}

// Update counts
function updateBadges() {
  const total = todos.length;
  const completed = todos.filter(t => t.completed).length;
  const pending = total - completed;
  totalBadge.textContent = `Total: ${total}`;
  completedBadge.textContent = `Selesai: ${completed}`;
  pendingBadge.textContent = `Belum: ${pending}`;
}

// Add new todo (with duplicate title validation, case-insensitive)
function addTodo(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    alert("Todo tidak boleh kosong!");
    return false;
  }
  // check duplicate
  const exists = todos.some(t => t.todo.toLowerCase() === trimmed.toLowerCase());
  if (exists) {
    alert("Todo dengan judul yang sama sudah ada.");
    return false;
  }
  const newTodo = {
    id: uid(),
    todo: trimmed,
    completed: false,
    createdAt: Date.now()
  };
  // add to top (beginning)
  todos.unshift(newTodo);
  saveTodos();
  renderTodos();
  return true;
}

// Inline edit: replace content with input + save/cancel
function startEditItem(id, liElement) {
  const item = todos.find(t => t.id === id);
  if (!item) return;

  // prevent multiple editors at once: if some item is editing, re-render to cancel
  renderTodos();

  // find li in DOM (might be re-created)
  const li = todoListEl.querySelector(`li[data-id="${id}"]`);
  if (!li) return;

  li.classList.add("todo-item-editing");

  // Create input element
  const leftDiv = li.querySelector(".flex-fill");
  leftDiv.innerHTML = ""; // clear left area

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "form-check-input";
  checkbox.checked = item.completed;
  checkbox.addEventListener("change", () => {
    item.completed = checkbox.checked;
  });

  const input = document.createElement("input");
  input.type = "text";
  input.className = "form-control form-control-sm";
  input.value = item.todo;

  const small = document.createElement("small");
  small.className = "form-text text-muted";
  small.textContent = "Edit judul todo (judul tidak boleh sama dengan yang lain).";

  leftDiv.appendChild(checkbox);
  leftDiv.appendChild(input);
  leftDiv.appendChild(small);

  // replace actions with Save and Cancel
  const actionsDiv = li.querySelector(".actions");
  actionsDiv.innerHTML = "";

  const btnSave = document.createElement("button");
  btnSave.className = "btn btn-sm btn-success";
  btnSave.innerHTML = '<i class="bi bi-check-lg"></i>';
  btnSave.title = "Simpan perubahan";
  btnSave.addEventListener("click", () => {
    const newVal = input.value.trim();
    if (!newVal) {
      alert("Todo tidak boleh kosong.");
      return;
    }
    // check duplicate excluding current item
    const exists = todos.some(t => t.id !== item.id && t.todo.toLowerCase() === newVal.toLowerCase());
    if (exists) {
      alert("Sudah ada todo dengan judul sama.");
      return;
    }
    item.todo = newVal;
    item.completed = checkbox.checked;
    saveTodos();
    renderTodos();
  });
  actionsDiv.appendChild(btnSave);

  const btnCancel = document.createElement("button");
  btnCancel.className = "btn btn-sm btn-outline-secondary";
  btnCancel.innerHTML = '<i class="bi bi-x-lg"></i>';
  btnCancel.title = "Batal";
  btnCancel.addEventListener("click", () => {
    renderTodos();
  });
  actionsDiv.appendChild(btnCancel);

  // focus input
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
}

// Update todos order after drag end
function applyOrderFromDOM() {
  const items = Array.from(todoListEl.children);
  // if list visible is subset due to filter/search, we must compute new order carefully:
  // Approach: create newTodos by taking items in the order shown and then append remaining items
  const shownIds = items.map(li => li.dataset.id);
  const shownTodos = shownIds.map(id => todos.find(t => t.id === id)).filter(Boolean);

  // other todos not shown keep their relative order (from todos array)
  const otherTodos = todos.filter(t => !shownIds.includes(t.id));

  // New todos becomes: shownTodos (in order) + otherTodos (in previous order)
  todos = [...shownTodos, ...otherTodos];
  saveTodos();
}

// Init Sortable
let sortable = null;
function initSortable() {
  if (sortable) {
    try { sortable.destroy(); } catch(e) {}
  }
  sortable = Sortable.create(todoListEl, {
    handle: ".drag-handle",
    animation: 150,
    onEnd: () => {
      applyOrderFromDOM();
      renderTodos();
    }
  });
}

// Events
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = todoInput.value || "";
  const added = addTodo(value);
  if (added) todoInput.value = "";
});

searchInput.addEventListener("input", (e) => {
  currentSearch = e.target.value;
  renderTodos();
});

// filter buttons
filterButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    filterButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderTodos();
  });
});

// load initial data
loadTodos();
renderTodos();
initSortable();

// Save before unload (redundant but safe)
window.addEventListener("beforeunload", () => saveTodos());
