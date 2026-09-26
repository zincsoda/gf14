const components = window.GF0014_COMPONENTS || [];
const storageKey = "gf0014-component-notes-v1";

const els = {
  search: document.querySelector("#searchInput"),
  list: document.querySelector("#componentList"),
  resultCount: document.querySelector("#resultCount"),
  savedCount: document.querySelector("#savedCount"),
  glyph: document.querySelector("#glyph"),
  gfId: document.querySelector("#gfId"),
  unicode: document.querySelector("#unicodeValue"),
  title: document.querySelector("#componentTitle"),
  pinyin: document.querySelector("#pinyinValue"),
  meaning: document.querySelector("#meaningValue"),
  description: document.querySelector("#descriptionValue"),
  sourceName: document.querySelector("#sourceNameValue"),
  customMeaning: document.querySelector("#customMeaning"),
  mnemonic: document.querySelector("#mnemonic"),
  saveState: document.querySelector("#saveState"),
  clearNote: document.querySelector("#clearNote"),
  exportNotes: document.querySelector("#exportNotes"),
  importNotes: document.querySelector("#importNotes"),
  filterButtons: [...document.querySelectorAll(".filter-button")],
};

let notes = loadNotes();
let selectedId = Number(new URLSearchParams(location.search).get("id")) || 138;
let activeFilter = "all";
let filtered = [];
let saveTimer = null;

function loadNotes() {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistNotes() {
  localStorage.setItem(storageKey, JSON.stringify(notes));
  updateCounts();
}

function noteFor(id) {
  return notes[String(id)] || { customMeaning: "", mnemonic: "" };
}

function hasNote(id) {
  const note = noteFor(id);
  return Boolean(note.customMeaning?.trim() || note.mnemonic?.trim());
}

function searchableText(component) {
  const note = noteFor(component.id);
  return [
    component.id,
    component.character,
    component.display,
    component.unicode,
    component.gfPinyin,
    component.unihanPinyin,
    component.meaning,
    component.description,
    component.sourceName,
    note.customMeaning,
    note.mnemonic,
  ].join(" ").toLowerCase();
}

function getFilteredComponents() {
  const query = els.search.value.trim().toLowerCase();
  return components.filter((component) => {
    if (activeFilter === "saved" && !hasNote(component.id)) return false;
    if (activeFilter === "unmapped" && component.glyphAvailable) return false;
    if (!query) return true;
    return searchableText(component).includes(query);
  });
}

function renderList() {
  filtered = getFilteredComponents();
  els.resultCount.textContent = `${filtered.length} of ${components.length} components`;

  if (!filtered.length) {
    els.list.innerHTML = '<div class="empty-state">No matching components.</div>';
    return;
  }

  if (!filtered.some((component) => component.id === selectedId)) {
    selectedId = filtered[0].id;
  }

  const html = filtered.map((component) => {
    const saved = hasNote(component.id);
    const glyph = component.character || "ID";
    const title = escapeHtml(component.display || component.character || `GF ${component.id}`);
    const meta = escapeHtml([component.gfPinyin, component.meaning].filter(Boolean).join(" - "));
    const active = component.id === selectedId ? " active" : "";
    const unmapped = component.glyphAvailable ? "" : " unmapped";
    return `
      <button class="component-row${active}" type="button" data-id="${component.id}">
        <span class="row-id">GF ${component.id}</span>
        <span class="row-glyph${unmapped}" lang="zh-Hans">${escapeHtml(glyph)}</span>
        <span>
          <span class="row-title"><span>${title}</span>${saved ? '<span class="note-dot" aria-label="Saved note"></span>' : ""}</span>
          <span class="row-meta">${meta}</span>
        </span>
      </button>
    `;
  }).join("");

  els.list.innerHTML = html;
}

function renderDetail() {
  const component = components.find((item) => item.id === selectedId) || components[0];
  if (!component) return;

  const note = noteFor(component.id);
  els.glyph.textContent = component.character || "ID";
  els.glyph.classList.toggle("unmapped", !component.glyphAvailable);
  els.gfId.textContent = `GF ${component.id}`;
  els.unicode.textContent = component.unicode || "No Unicode mapping";
  els.title.textContent = component.display || component.character || `GF ${component.id}`;
  els.pinyin.textContent = component.gfPinyin || component.unihanPinyin || "No pinyin listed";
  els.meaning.textContent = component.meaning || "No meaning listed";
  els.description.textContent = component.description || "No description listed";
  els.sourceName.textContent = component.sourceName || (component.glyphAvailable ? "Standard character form" : "Unmapped source row");
  els.customMeaning.value = note.customMeaning || "";
  els.mnemonic.value = note.mnemonic || "";
  els.saveState.textContent = hasNote(component.id) ? "Saved locally" : "Ready";

  const url = new URL(location.href);
  url.searchParams.set("id", component.id);
  history.replaceState(null, "", url);
}

function render() {
  renderList();
  renderDetail();
  updateCounts();
}

function updateCounts() {
  const saved = Object.keys(notes).filter((id) => hasNote(id)).length;
  els.savedCount.textContent = `${saved} saved ${saved === 1 ? "note" : "notes"}`;
}

function saveCurrentNote() {
  const id = String(selectedId);
  const customMeaning = els.customMeaning.value.trim();
  const mnemonic = els.mnemonic.value.trim();

  if (customMeaning || mnemonic) {
    notes[id] = { customMeaning, mnemonic, updatedAt: new Date().toISOString() };
  } else {
    delete notes[id];
  }

  persistNotes();
  els.saveState.textContent = "Saved locally";
  renderList();
}

function queueSave() {
  els.saveState.textContent = "Saving...";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveCurrentNote, 220);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

els.search.addEventListener("input", render);

els.list.addEventListener("click", (event) => {
  const row = event.target.closest(".component-row");
  if (!row) return;
  selectedId = Number(row.dataset.id);
  render();
});

els.filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    els.filterButtons.forEach((item) => item.classList.toggle("active", item === button));
    render();
  });
});

els.customMeaning.addEventListener("input", queueSave);
els.mnemonic.addEventListener("input", queueSave);

els.clearNote.addEventListener("click", () => {
  delete notes[String(selectedId)];
  persistNotes();
  render();
});

els.exportNotes.addEventListener("click", () => {
  const payload = {
    app: "gf0014-component-notes",
    exportedAt: new Date().toISOString(),
    notes,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gf0014-component-notes.json";
  a.click();
  URL.revokeObjectURL(url);
});

els.importNotes.addEventListener("change", async () => {
  const file = els.importNotes.files?.[0];
  if (!file) return;

  try {
    const payload = JSON.parse(await file.text());
    const incoming = payload.notes && typeof payload.notes === "object" ? payload.notes : payload;
    notes = { ...notes, ...incoming };
    persistNotes();
    els.saveState.textContent = "Imported notes";
    render();
  } catch {
    els.saveState.textContent = "Import failed";
  } finally {
    els.importNotes.value = "";
  }
});

render();
