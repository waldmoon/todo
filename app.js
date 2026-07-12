(function () {
  "use strict";

  var form = document.getElementById("todo-form");
  var headerInput = document.getElementById("todo-header");
  var descriptionInput = document.getElementById("todo-description");
  var textInput = document.getElementById("todo-text");
  var listEl = document.getElementById("todo-list");
  var emptyState = document.getElementById("empty-state");
  var statTotal = document.getElementById("stat-total");
  var statDone = document.getElementById("stat-done");
  var clearCompletedBtn = document.getElementById("clear-completed");
  var storageNotice = document.getElementById("storage-notice");
  var submitBtn = form ? form.querySelector(".todo-form__submit") : null;

  var supabase = null;
  var todos = [];
  var isBusy = false;

  init();

  function init() {
    if (!form) return;

    if (!isSupabaseConfigured()) {
      showNotice(
        "Database belum dikonfigurasi. Isi SUPABASE_URL dan SUPABASE_ANON_KEY di config.js, lalu jalankan supabase-setup.sql."
      );
      render();
      return;
    }

    if (typeof window.supabase === "undefined" || !window.supabase.createClient) {
      showNotice("Library Supabase gagal dimuat. Periksa koneksi internet.");
      render();
      return;
    }

    supabase = window.supabase.createClient(
      window.TODO_CONFIG.SUPABASE_URL,
      window.TODO_CONFIG.SUPABASE_ANON_KEY
    );

    form.addEventListener("submit", onAddTodo);
    clearCompletedBtn.addEventListener("click", onClearCompleted);
    listEl.addEventListener("change", onToggleTodo);
    listEl.addEventListener("click", onDeleteTodo);

    loadTodos();
  }

  function isSupabaseConfigured() {
    var config = window.TODO_CONFIG || {};
    var url = config.SUPABASE_URL || "";
    var key = config.SUPABASE_ANON_KEY || "";

    return (
      url.indexOf("https://") === 0 &&
      url.indexOf("supabase.co") !== -1 &&
      key.length > 20 &&
      url !== "ISI_URL_SUPABASE" &&
      key !== "ISI_ANON_KEY"
    );
  }

  function showNotice(message) {
    if (!storageNotice) return;
    storageNotice.hidden = false;
    storageNotice.textContent = message;
  }

  function hideNotice() {
    if (!storageNotice) return;
    storageNotice.hidden = true;
  }

  function setBusy(state) {
    isBusy = state;
    if (submitBtn) submitBtn.disabled = state;
    if (clearCompletedBtn) clearCompletedBtn.disabled = state;
  }

  function loadTodos() {
    if (!supabase) return;

    setBusy(true);
    showNotice("Memuat tugas dari cloud...");

    supabase
      .from("todos")
      .select("id, header, description, body, done, created_at")
      .order("created_at", { ascending: false })
      .then(function (result) {
        if (result.error) {
          showNotice("Gagal memuat data: " + result.error.message);
          todos = [];
        } else {
          todos = (result.data || []).map(normalizeTodo);
          hideNotice();
        }
        render();
      })
      .catch(function (error) {
        showNotice("Gagal memuat data: " + error.message);
        todos = [];
        render();
      })
      .finally(function () {
        setBusy(false);
      });
  }

  function onAddTodo(event) {
    event.preventDefault();
    if (!supabase || isBusy) return;

    var header = headerInput.value.trim();
    if (!header) return;

    var payload = {
      header: header,
      description: descriptionInput.value.trim(),
      body: textInput.value.trim(),
      done: false,
    };

    setBusy(true);

    supabase
      .from("todos")
      .insert(payload)
      .select("id, header, description, body, done, created_at")
      .single()
      .then(function (result) {
        if (result.error) {
          showNotice("Gagal menambah tugas: " + result.error.message);
          return;
        }

        todos.unshift(normalizeTodo(result.data));
        form.reset();
        hideNotice();
        render();
        headerInput.focus();
      })
      .catch(function (error) {
        showNotice("Gagal menambah tugas: " + error.message);
      })
      .finally(function () {
        setBusy(false);
      });
  }

  function onToggleTodo(event) {
    var checkbox = event.target;
    if (checkbox.type !== "checkbox" || !supabase || isBusy) return;

    var item = checkbox.closest("[data-id]");
    if (!item) return;

    var id = item.getAttribute("data-id");
    var todo = findTodo(id);
    if (!todo) return;

    var newDone = checkbox.checked;
    setBusy(true);

    supabase
      .from("todos")
      .update({ done: newDone })
      .eq("id", id)
      .then(function (result) {
        if (result.error) {
          checkbox.checked = !newDone;
          showNotice("Gagal memperbarui tugas: " + result.error.message);
          return;
        }

        todo.done = newDone;
        hideNotice();
        render();
      })
      .catch(function (error) {
        checkbox.checked = !newDone;
        showNotice("Gagal memperbarui tugas: " + error.message);
      })
      .finally(function () {
        setBusy(false);
      });
  }

  function onDeleteTodo(event) {
    var deleteBtn = event.target.closest(".todo-item__delete");
    if (!deleteBtn || !supabase || isBusy) return;

    var item = deleteBtn.closest("[data-id]");
    if (!item) return;

    var id = item.getAttribute("data-id");
    setBusy(true);

    supabase
      .from("todos")
      .delete()
      .eq("id", id)
      .then(function (result) {
        if (result.error) {
          showNotice("Gagal menghapus tugas: " + result.error.message);
          return;
        }

        todos = todos.filter(function (todo) {
          return todo.id !== id;
        });
        hideNotice();
        render();
      })
      .catch(function (error) {
        showNotice("Gagal menghapus tugas: " + error.message);
      })
      .finally(function () {
        setBusy(false);
      });
  }

  function onClearCompleted() {
    if (!supabase || isBusy) return;

    var completedIds = todos.filter(function (todo) {
      return todo.done;
    }).map(function (todo) {
      return todo.id;
    });

    if (completedIds.length === 0) return;

    setBusy(true);

    supabase
      .from("todos")
      .delete()
      .eq("done", true)
      .then(function (result) {
        if (result.error) {
          showNotice("Gagal menghapus tugas selesai: " + result.error.message);
          return;
        }

        todos = todos.filter(function (todo) {
          return !todo.done;
        });
        hideNotice();
        render();
      })
      .catch(function (error) {
        showNotice("Gagal menghapus tugas selesai: " + error.message);
      })
      .finally(function () {
        setBusy(false);
      });
  }

  function normalizeTodo(row) {
    return {
      id: String(row.id),
      header: row.header || "",
      description: row.description || "",
      text: row.body || "",
      done: !!row.done,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    };
  }

  function findTodo(id) {
    for (var i = 0; i < todos.length; i++) {
      if (todos[i].id === id) return todos[i];
    }
    return null;
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
        '<input type="checkbox"' + (todo.done ? " checked" : "") + (isBusy ? " disabled" : "") + ' aria-label="' + escapeAttr(checkLabel) + '">' +
        '<span class="todo-item__checkmark" aria-hidden="true"></span>' +
        "</label>" +
        renderTodoBody(todo) +
        '<button class="todo-item__delete" type="button" aria-label="Hapus tugas"' + (isBusy ? " disabled" : "") + ">" +
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
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(text) {
    return escapeHtml(text).replace(/'/g, "&#39;");
  }
})();
