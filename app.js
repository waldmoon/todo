(function () {
  "use strict";

  var STORAGE_KEY = "code-technology-todos";

  var form = document.getElementById("todo-form");
  var headerInput = document.getElementById("todo-header");
  var descriptionInput = document.getElementById("todo-description");
  var textInput = document.getElementById("todo-text");
  var listEl = document.getElementById("todo-list");
  var emptyState = document.getElementById("empty-state");
  var statTotal = document.getElementById("stat-total");
  var statDone = document.getElementById("stat-done");
  var clearCompletedBtn = document.getElementById("clear-completed");

  var todos = loadTodos();

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var header = headerInput.value.trim();
    if (!header) return;

    todos.unshift({
      id: generateId(),
      header: header,
      description: descriptionInput.value.trim(),
      text: textInput.value.trim(),
      done: false,
      createdAt: Date.now(),
    });

    form.reset();
    saveAndRender();
    headerInput.focus();
  });

  clearCompletedBtn.addEventListener("click", function () {
    todos = todos.filter(function (todo) {
      return !todo.done;
    });
    saveAndRender();
  });

  listEl.addEventListener("change", function (event) {
    var checkbox = event.target;
    if (checkbox.type !== "checkbox") return;

    var item = checkbox.closest("[data-id]");
    if (!item) return;

    var id = item.getAttribute("data-id");
    var todo = findTodo(id);
    if (!todo) return;

    todo.done = checkbox.checked;
    saveAndRender();
  });

  listEl.addEventListener("click", function (event) {
    var deleteBtn = event.target.closest(".todo-item__delete");
    if (!deleteBtn) return;

    var item = deleteBtn.closest("[data-id]");
    if (!item) return;

    var id = item.getAttribute("data-id");
    todos = todos.filter(function (todo) {
      return todo.id !== id;
    });
    saveAndRender();
  });

  function loadTodos() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(normalizeTodo).filter(isValidTodo);
    } catch (error) {
      return [];
    }
  }

  function normalizeTodo(todo) {
    if (!todo || typeof todo !== "object") return todo;

    if (typeof todo.header === "string") {
      return {
        id: todo.id,
        header: todo.header,
        description: typeof todo.description === "string" ? todo.description : "",
        text: typeof todo.text === "string" ? todo.text : "",
        done: !!todo.done,
        createdAt: todo.createdAt || Date.now(),
      };
    }

    if (typeof todo.text === "string") {
      return {
        id: todo.id,
        header: todo.text,
        description: "",
        text: "",
        done: !!todo.done,
        createdAt: todo.createdAt || Date.now(),
      };
    }

    return todo;
  }

  function isValidTodo(todo) {
    return (
      todo &&
      typeof todo.id === "string" &&
      typeof todo.header === "string" &&
      typeof todo.description === "string" &&
      typeof todo.text === "string" &&
      typeof todo.done === "boolean"
    );
  }

  function saveTodos() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (error) {
      /* Storage may be unavailable in private mode or when full */
    }
  }

  function saveAndRender() {
    saveTodos();
    render();
  }

  function findTodo(id) {
    for (var i = 0; i < todos.length; i++) {
      if (todos[i].id === id) return todos[i];
    }
    return null;
  }

  function generateId() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
  }

  function renderTodoBody(todo) {
    var parts = [
      '<div class="todo-item__content">',
      '<h3 class="todo-item__header">' + escapeHtml(todo.header) + "</h3>",
    ];

    if (todo.description) {
      parts.push(
        '<p class="todo-item__description">' + escapeHtml(todo.description) + "</p>"
      );
    }

    if (todo.text) {
      parts.push('<p class="todo-item__text">' + escapeHtml(todo.text) + "</p>");
    }

    parts.push("</div>");
    return parts.join("");
  }

  function render() {
    listEl.innerHTML = "";

    var doneCount = 0;

    todos.forEach(function (todo, index) {
      if (todo.done) doneCount += 1;

      var li = document.createElement("li");
      li.className = "todo-item" + (todo.done ? " todo-item--done" : "");
      li.setAttribute("data-id", todo.id);
      li.setAttribute("role", "listitem");
      li.style.animationDelay = Math.min(index * 40, 200) + "ms";

      var checkLabel = todo.done
        ? "Tandai belum selesai: " + todo.header
        : "Tandai selesai: " + todo.header;

      li.innerHTML =
        '<label class="todo-item__check">' +
        '<input type="checkbox"' + (todo.done ? " checked" : "") + ' aria-label="' + escapeAttr(checkLabel) + '">' +
        '<span class="todo-item__checkmark" aria-hidden="true"></span>' +
        "</label>" +
        renderTodoBody(todo) +
        '<button class="todo-item__delete" type="button" aria-label="Hapus tugas">' +
        '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
        '<path d="M6 7h12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m1 0v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        "</svg>" +
        "</button>";

      listEl.appendChild(li);
    });

    var isEmpty = todos.length === 0;
    emptyState.hidden = !isEmpty;
    listEl.hidden = isEmpty;

    statTotal.textContent = String(todos.length);
    statDone.textContent = String(doneCount);

    clearCompletedBtn.hidden = doneCount === 0;
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(text) {
    return escapeHtml(text).replace(/'/g, "&#39;");
  }

  render();
})();
