const components = window.GF0014_COMPONENTS || [];

const els = {
  search: document.querySelector("#searchInput"),
  list: document.querySelector("#componentList"),
  resultCount: document.querySelector("#resultCount"),
  glyph: document.querySelector("#glyph"),
  gfId: document.querySelector("#gfId"),
  unicode: document.querySelector("#unicodeValue"),
  title: document.querySelector("#componentTitle"),
  pinyin: document.querySelector("#pinyinValue"),
  meaning: document.querySelector("#meaningValue"),
  description: document.querySelector("#descriptionValue"),
  sourceName: document.querySelector("#sourceNameValue"),
  componentType: document.querySelector("#componentTypeValue"),
  filterButtons: [...document.querySelectorAll(".filter-button")],
};

let selectedId = Number(new URLSearchParams(location.search).get("id")) || 138;
let activeFilter = "all";
let filtered = [];

function searchableText(component) {
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
    component.componentType,
  ].join(" ").toLowerCase();
}

function getFilteredComponents() {
  const query = els.search.value.trim().toLowerCase();
  return components.filter((component) => {
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
          <span class="row-title"><span>${title}</span></span>
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

  els.glyph.textContent = component.character || "ID";
  els.glyph.classList.toggle("unmapped", !component.glyphAvailable);
  els.gfId.textContent = `GF ${component.id}`;
  els.unicode.textContent = component.unicode || "No Unicode mapping";
  els.title.textContent = component.display || component.character || `GF ${component.id}`;
  els.pinyin.textContent = component.gfPinyin || component.unihanPinyin || "No pinyin listed";
  els.meaning.textContent = component.meaning || "No meaning listed";
  els.description.textContent = component.description || "No description listed";
  els.sourceName.textContent = component.sourceName || (component.glyphAvailable ? "Standard character form" : "Unmapped source row");
  els.componentType.textContent = formatComponentType(component.componentType);

  const url = new URL(location.href);
  url.searchParams.set("id", component.id);
  history.replaceState(null, "", url);
}

function render() {
  renderList();
  renderDetail();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatComponentType(type) {
  return String(type || "unknown")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

render();
