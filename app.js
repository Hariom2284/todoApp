(() => {
  'use strict';

  const STORAGE_KEY = 'simple_todos_v1';
  const THEME_KEY = 'simple_todos_theme_v1';

  // DOM elements
  const form = document.getElementById('todo-form');
  const input = document.getElementById('todo-input');
  const listEl = document.getElementById('todo-list');
  const itemsLeft = document.getElementById('items-left');
  const filters = document.querySelectorAll('.filter-btn');
  const clearCompletedBtn = document.getElementById('clear-completed');
  const themeToggle = document.getElementById('theme-toggle');

  let todos = [];
  let currentFilter = 'all';
  let dragSrcIndex = null;

  // ===== Persistence =====
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      todos = raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to load todos', e);
      todos = [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (e) {
      console.error('Failed to save todos', e);
    }
  }

  // ===== Rendering =====
  function render() {
    listEl.innerHTML = '';
    const filtered = todos.filter(todo => {
      if (currentFilter === 'active') return !todo.completed;
      if (currentFilter === 'completed') return todo.completed;
      return true;
    });

    filtered.forEach((todo, idx) => {
      const li = createTodoElement(todo, idx);
      listEl.appendChild(li);
    });

    updateFooter();
  }

  function updateFooter() {
    const left = todos.filter(t => !t.completed).length;
    itemsLeft.textContent = `${left} item${left !== 1 ? 's' : ''} left`;
  }

  // Enhanced todo creation with animation
  function createTodoElement(todo) {
    const li = document.createElement('li');
    li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
    li.draggable = true;
    li.dataset.id = todo.id;

    li.innerHTML = `
        <div class="todo-checkbox ${todo.completed ? 'checked' : ''}"></div>
        <span class="todo-text">${todo.text}</span>
        <button class="todo-delete" aria-label="Delete todo">×</button>
    `;

    // Add animation class after a small delay to trigger transition
    setTimeout(() => {
        li.style.opacity = '0';
        li.style.transform = 'translateY(-5px)';
        requestAnimationFrame(() => {
            li.style.transition = 'all 0.3s ease-out';
            li.style.opacity = '1';
            li.style.transform = 'translateY(0)';
        });
    }, 10);

    // Drag events
    li.addEventListener('dragstart', (e) => {
      dragSrcIndex = todos.findIndex(t => String(t.id) === li.dataset.id);
      li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', li.dataset.id); } catch(_){}
    });

    li.addEventListener('dragend', () => {
      li.classList.remove('dragging');
      dragSrcIndex = null;
    });

    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      const over = e.currentTarget;
      const bounding = over.getBoundingClientRect();
      const offset = e.clientY - bounding.top;
      over.style['border-top'] = offset < bounding.height / 2 ? '2px solid rgba(0,0,0,0.06)' : '';
      over.style['border-bottom'] = offset >= bounding.height / 2 ? '2px solid rgba(0,0,0,0.06)' : '';
    });

    li.addEventListener('dragleave', (e) => {
      e.currentTarget.style['border-top'] = '';
      e.currentTarget.style['border-bottom'] = '';
    });

    li.addEventListener('drop', (e) => {
      e.preventDefault();
      const targetId = e.currentTarget.dataset.id;
      const destIndex = todos.findIndex(t => String(t.id) === targetId);
      if (dragSrcIndex == null || destIndex === -1) return;

      // remove temporary borders
      e.currentTarget.style['border-top'] = '';
      e.currentTarget.style['border-bottom'] = '';

      // compute final index based on mouse position
      const bounding = e.currentTarget.getBoundingClientRect();
      const offset = e.clientY - bounding.top;
      const insertBefore = offset < bounding.height / 2 ? destIndex : destIndex + 1;

      const item = todos.splice(dragSrcIndex, 1)[0];
      let newIndex = insertBefore;
      if (dragSrcIndex < insertBefore) newIndex = insertBefore - 1;
      todos.splice(newIndex, 0, item);
      save();
      render();
    });

    return li;
  }

  // ===== Actions =====
  function addTodo(text) {
    const t = { id: Date.now() + Math.floor(Math.random()*999), text: text.trim(), completed: false };
    if (!t.text) return;
    todos.unshift(t);
    save();
    render();
  }

  function toggleComplete(id) {
    const i = todos.findIndex(t => t.id === id);
    if (i === -1) return;
    todos[i].completed = !todos[i].completed;
    save();
    render();
  }

  function removeTodo(id) {
    todos = todos.filter(t => t.id !== id);
    save();
    render();
  }

  function beginEdit(id, labelEl) {
    const i = todos.findIndex(t => t.id === id);
    if (i === -1) return;
    const old = todos[i].text;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = old;
    input.className = 'edit-input';
    input.style.width = '100%';
    input.style.padding = '8px';

    function finish(saveEdit) {
      const val = input.value.trim();
      if (saveEdit && val) todos[i].text = val;
      render();
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finish(true);
      if (e.key === 'Escape') finish(false);
    });
    input.addEventListener('blur', () => finish(true));

    labelEl.replaceWith(input);
    input.focus();
    input.select();
  }

  function clearCompleted() {
    todos = todos.filter(t => !t.completed);
    save();
    render();
  }

  // ===== Filters & UI events =====
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value;
    if (!text.trim()) return;
    addTodo(text);
    input.value = '';
  });

  filters.forEach(btn => btn.addEventListener('click', (e) => {
    filters.forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');
    currentFilter = e.currentTarget.dataset.filter;
    render();
  }));

  clearCompletedBtn.addEventListener('click', () => clearCompleted());

  // Theme toggle
  function loadTheme() {
    const t = localStorage.getItem(THEME_KEY) || 'light';
    document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
    themeToggle.textContent = t === 'dark' ? '☀️' : '🌙';
  }
  themeToggle.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
  });

  // Initialization
  function init() {
    loadTheme();
    load();
    render();
  }

  // Expose a small debug API in dev console
  window.__todoApp = { load, save, get todos(){return todos} };

  init();
})();

// Add confetti effect for completing todos
function addConfetti() {
    const colors = ['#667eea', '#764ba2', '#f093fb', '#48bb78', '#f56565'];
    for (let i = 0; i < 20; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            width: 4px;
            height: 4px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            pointer-events: none;
            z-index: 1000;
            border-radius: 50%;
            animation: confetti-fall 2s ease-out forwards;
        `;
        confetti.style.setProperty('--delay', `${Math.random() * 0.5}s`);
        confetti.style.setProperty('--distance', `${Math.random() * 100 + 50}px`);
        confetti.style.setProperty('--duration', `${Math.random() * 1 + 1}s`);
        document.body.appendChild(confetti);
        
        setTimeout(() => confetti.remove(), 2000);
    }
}

// Add confetti animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes confetti-fall {
        0% {
            transform: translateY(-50vh) translateX(0) rotate(0deg);
            opacity: 1;
        }
        100% {
            transform: translateY(var(--distance)) translateX(${Math.random() > 0.5 ? '-' : ''}50px) rotate(360deg);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Enhanced render function with completion celebration
function renderTodos() {
    const filteredTodos = getFilteredTodos();
    todoList.innerHTML = '';
    
    filteredTodos.forEach(todo => {
        const todoElement = createTodoElement(todo);
        todoList.appendChild(todoElement);
        
        // Add completion celebration
        if (todo.completed && !todo.celebrated) {
            setTimeout(() => addConfetti(), 300);
            // Mark as celebrated to prevent multiple confetti
            todo.celebrated = true;
        }
    });
    
    updateItemsLeft();
}
