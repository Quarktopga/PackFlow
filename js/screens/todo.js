import { state } from "../state.js";
import { renderTabbar, renderTopbar, svg } from "../nav.js";
import { el, relativeDay, fmtDate, daysUntil } from "../utils.js";
import { toast } from "../toast.js";
import { TASK_CATEGORIES } from "../config.js";
import * as data from "../data.js";
import { openModal } from "../modal.js";

export function renderTodo(app) {
  app.innerHTML = "";
  const view = el(`<div class="screen screen--with-tabbar"></div>`);
  const addBtn = el(`<button class="btn btn-secondary" style="width:auto;padding:8px 14px;">+ Tâche</button>`);
  view.appendChild(renderTopbar("À faire", { action: addBtn }));

  const filterRow = el(`
    <div class="row" style="gap:8px; margin-bottom:16px; overflow-x:auto;">
      <button class="btn btn-ghost" data-filter="active" aria-pressed="true" style="width:auto;padding:8px 12px;border:1px solid var(--ink-line);font-size:13px;">À faire</button>
      <button class="btn btn-ghost" data-filter="all" aria-pressed="false" style="width:auto;padding:8px 12px;border:1px solid var(--ink-line);font-size:13px;">Toutes</button>
      <button class="btn btn-ghost" data-filter="done" aria-pressed="false" style="width:auto;padding:8px 12px;border:1px solid var(--ink-line);font-size:13px;">Faites</button>
    </div>
  `);
  view.appendChild(filterRow);

  const listHost = el(`<div id="task-groups"></div>`);
  view.appendChild(listHost);
  app.appendChild(view);
  app.appendChild(renderTabbar());

  let filter = "active";
  const draw = () => {
    let tasks = [...state.tasks];
    if (filter === "active") tasks = tasks.filter((t) => !t.done);
    if (filter === "done") tasks = tasks.filter((t) => t.done);
    tasks.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    listHost.innerHTML = "";
    if (!tasks.length) {
      listHost.appendChild(el(`<div class="empty-state"><div class="h-display">Rien à afficher</div><p>Crée une tâche personnalisée si besoin.</p></div>`));
      return;
    }
    const groups = groupByCategory(tasks);
    Object.entries(groups).forEach(([cat, items]) => {
      const meta = TASK_CATEGORIES[cat] || { label: cat, color: "#8a8fa3" };
      const section = el(`<div class="card" style="margin-bottom:14px;"><div class="eyebrow" style="color:${meta.color};margin-bottom:4px;">${meta.label}</div><ul></ul></div>`);
      const ul = section.querySelector("ul");
      items.forEach((t) => ul.appendChild(taskRow(t, draw)));
      listHost.appendChild(section);
    });
  };
  draw();

  filterRow.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      filter = btn.dataset.filter;
      filterRow.querySelectorAll("[data-filter]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      draw();
    });
  });

  addBtn.addEventListener("click", () => openTaskSheet(null, draw));
}

function groupByCategory(tasks) {
  return tasks.reduce((acc, t) => {
    (acc[t.category] ||= []).push(t);
    return acc;
  }, {});
}

function taskRow(task, onChange) {
  const overdue = !task.done && daysUntil(task.due_date) < 0;
  const li = el(`
    <li class="task-row ${task.done ? "done" : ""} ${overdue ? "overdue" : ""} ${task.snoozed ? "snoozed" : ""}">
      <button class="task-check" aria-label="Marquer comme faite"></button>
      <div style="flex:1;">
        <div class="task-title">${escapeAttr(task.label)}</div>
        <div class="task-due">${relativeDay(task.due_date)} · ${fmtDate(task.due_date)}${task.snoozed ? " · en pause" : ""}</div>
      </div>
      <div class="task-actions">
        <button class="btn-icon" data-action="edit" aria-label="Modifier" style="width:36px;min-height:36px;">${svg.edit}</button>
      </div>
    </li>
  `);
  li.querySelector(".task-check").addEventListener("click", async () => {
    try {
      const updated = await data.updateTask(task.id, { done: !task.done });
      Object.assign(task, updated);
      onChange();
    } catch { toast("Impossible de mettre à jour la tâche", "error"); }
  });
  li.querySelector("[data-action=edit]").addEventListener("click", () => openTaskSheet(task, onChange));
  return li;
}

function escapeAttr(s = "") { return s.replace(/</g, "&lt;"); }

function openTaskSheet(task, onChange) {
  const isNew = !task;
  const { modal, close } = openModal(`
    <h2 class="h-display" style="font-size:20px;margin-bottom:14px;">${isNew ? "Nouvelle tâche" : "Modifier la tâche"}</h2>
    <div class="stack">
      <div class="field"><label for="t-label">Nom</label><input id="t-label" value="${task ? escapeAttr(task.label) : ""}" placeholder="ex. Réserver le camion"></div>
      <div class="field"><label for="t-date">Échéance</label><input id="t-date" type="date" value="${task?.due_date || ""}"></div>
      <div class="field"><label for="t-cat">Catégorie</label>
        <select id="t-cat">${Object.entries(TASK_CATEGORIES).map(([k, v]) => `<option value="${k}" ${task?.category === k ? "selected" : ""}>${v.label}</option>`).join("")}</select>
      </div>
      ${!isNew ? `
        <label class="row" style="gap:8px;"><input type="checkbox" id="t-snooze" ${task.snoozed ? "checked" : ""}> Mettre en pause (pas de notifications)</label>
      ` : ""}
      <button class="btn btn-primary" id="save-task">${isNew ? "Créer" : "Enregistrer"}</button>
      ${!isNew ? `<button class="btn btn-danger" id="delete-task">Supprimer la tâche</button>` : ""}
    </div>
  `);
  modal.querySelector("#save-task").addEventListener("click", async (e) => {
    const label = modal.querySelector("#t-label").value.trim();
    const due_date = modal.querySelector("#t-date").value;
    const category = modal.querySelector("#t-cat").value;
    if (!label || !due_date) return toast("Nom et échéance obligatoires", "error");
    e.target.disabled = true;
    try {
      if (isNew) {
        const created = await data.createCustomTask({ move_id: state.move.id, label, due_date, category, done: false });
        state.tasks = [...state.tasks, created];
      } else {
        const patch = { label, due_date, category };
        const snoozeEl = modal.querySelector("#t-snooze");
        if (snoozeEl) patch.snoozed = snoozeEl.checked;
        const updated = await data.updateTask(task.id, patch);
        Object.assign(task, updated);
      }
      close();
      onChange();
      toast(isNew ? "Tâche créée" : "Tâche mise à jour", "success");
    } catch { toast("Une erreur est survenue", "error"); e.target.disabled = false; }
  });
  modal.querySelector("#delete-task")?.addEventListener("click", async () => {
    try {
      await data.deleteTask(task.id);
      state.tasks = state.tasks.filter((t) => t.id !== task.id);
      close();
      onChange();
      toast("Tâche supprimée");
    } catch { toast("Impossible de supprimer", "error"); }
  });
}
