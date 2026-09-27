const components = window.GF0014_COMPONENTS || [];
const decompositions = window.GF0014_DECOMPOSITIONS || {};
const componentGlyphs = window.GF0014_GLYPHS || {};
const componentById = new Map(components.map((component) => [component.id, component]));
const examplesByComponentId = buildExamplesByComponentId();

const els = {
  decomposerForm: document.querySelector("#decomposerForm"),
  characterInput: document.querySelector("#characterInput"),
  decompositionResult: document.querySelector("#decompositionResult"),
  decompositionGlyph: document.querySelector("#decompositionGlyph"),
  decompositionStatus: document.querySelector("#decompositionStatus"),
  decompositionStructure: document.querySelector("#decompositionStructure"),
  decompositionComponents: document.querySelector("#decompositionComponents"),
  decompositionNote: document.querySelector("#decompositionNote"),
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
  examples: document.querySelector("#examplesValue"),
  sourceName: document.querySelector("#sourceNameValue"),
  componentType: document.querySelector("#componentTypeValue"),
  filterButtons: [...document.querySelectorAll(".filter-button")],
};

const initialParams = new URLSearchParams(location.search);
let selectedId = Number(initialParams.get("id")) || 138;
let selectedCharacter = [...(initialParams.get("char") || "想")][0];
let activeFilter = "all";
let filtered = [];
let isComposing = false;

const structureNames = {
  "⿰": "Left-right",
  "⿱": "Top-bottom",
  "⿲": "Left-middle-right",
  "⿳": "Top-middle-bottom",
  "⿴": "Full enclosure",
  "⿵": "Enclosure from above",
  "⿶": "Enclosure from below",
  "⿷": "Enclosure from left",
  "⿸": "Upper-left enclosure",
  "⿹": "Upper-right enclosure",
  "⿺": "Lower-left enclosure",
  "⿻": "Overlaid",
};

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
    getComponentExamples(component).join(""),
  ].join(" ").toLowerCase();
}

function buildExamplesByComponentId() {
  const examples = new Map(components.map((component) => [component.id, []]));

  Object.entries(decompositions).forEach(([character, decomposition]) => {
    const componentIds = new Set(decomposition.components || []);
    componentIds.forEach((id) => {
      const list = examples.get(id);
      if (list && list.length < 8 && !list.includes(character)) {
        list.push(character);
      }
    });
  });

  return examples;
}

function getComponentExamples(component) {
  const examples = examplesByComponentId.get(component.id) || [];
  if (examples.length) return examples;
  return component.componentType !== "unmapped" && component.character ? [component.character] : [];
}

function getFilteredComponents() {
  const query = els.search.value.trim().toLowerCase();
  return components.filter((component) => {
    if (activeFilter !== "all" && component.componentType !== activeFilter) return false;
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
    const title = escapeHtml(component.display || component.character || `GF ${component.id}`);
    const meta = escapeHtml([component.gfPinyin, component.meaning].filter(Boolean).join(" - "));
    const active = component.id === selectedId ? " active" : "";
    const unmapped = component.glyphAvailable ? "" : " unmapped";
    const svgBadge = componentGlyphs[component.id]
      ? '<span class="row-svg-badge" title="Rendered from SVG">SVG</span>'
      : "";
    return `
      <button class="component-row${active}" type="button" data-id="${component.id}">
        <span class="row-id">GF ${component.id}</span>
        <span class="row-glyph${unmapped}" lang="zh-Hans">${renderGlyph(component)}</span>
        <span>
          <span class="row-title"><span>${title}</span>${svgBadge}</span>
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

  els.glyph.innerHTML = renderGlyph(component);
  els.glyph.classList.toggle("unmapped", !component.glyphAvailable);
  els.gfId.textContent = `GF ${component.id}`;
  els.unicode.textContent = component.unicode || "No Unicode mapping";
  els.title.textContent = component.display || component.character || `GF ${component.id}`;
  els.pinyin.textContent = component.gfPinyin || component.unihanPinyin || "No pinyin listed";
  els.meaning.textContent = component.meaning || "No meaning listed";
  els.description.textContent = component.description || "No description listed";
  els.examples.innerHTML = renderExamples(component);
  els.sourceName.textContent = component.sourceName || (component.glyphAvailable ? "Standard character form" : "Unmapped source row");
  els.componentType.textContent = formatComponentType(component.componentType);

  const url = new URL(location.href);
  url.searchParams.set("id", component.id);
  history.replaceState(null, "", url);
}

function renderExamples(component) {
  const examples = getComponentExamples(component);
  if (!examples.length) return '<span class="no-examples">No repertoire examples available</span>';

  return examples.map((character) => `
    <button class="example-character" type="button" data-character="${escapeHtml(character)}" title="Decompose ${escapeHtml(character)}">
      <span lang="zh-Hans">${escapeHtml(character)}</span>
    </button>
  `).join("");
}

function renderDecomposition() {
  const decomposition = decompositions[selectedCharacter];
  els.characterInput.value = selectedCharacter || "";
  els.decompositionGlyph.textContent = selectedCharacter || "?";
  els.decompositionResult.classList.toggle("unsupported", !decomposition);

  if (!decomposition) {
    els.decompositionStatus.textContent = "Outside repertoire";
    els.decompositionStatus.className = "status-badge partial";
    els.decompositionStructure.textContent = "";
    els.decompositionComponents.innerHTML = '<span class="no-components">No decomposition available</span>';
    els.decompositionNote.textContent = "Enter a character from the 3,500-character Level 1 common-use repertoire.";
    return;
  }

  els.decompositionStatus.textContent = decomposition.complete ? "GF0014" : "Partial mapping";
  els.decompositionStatus.className = `status-badge${decomposition.complete ? "" : " partial"}`;
  els.decompositionStructure.textContent = decomposition.structure
    ? structureNames[decomposition.structure] || "Compound structure"
    : "Single component";

  els.decompositionComponents.innerHTML = decomposition.components.map((id) => {
    const component = componentById.get(id);
    if (!component) return "";
    const name = component.display || component.character || `GF ${id}`;
    return `
      <button class="component-chip" type="button" data-component-id="${id}" title="Open GF ${id}">
        <span class="chip-glyph" lang="zh-Hans">${renderGlyph(component)}</span>
        <span class="chip-copy">
          <strong>${escapeHtml(name)}</strong>
          <small>GF ${id}</small>
        </span>
      </button>
    `;
  }).join("") || '<span class="no-components">No GF0014 component match</span>';

  if (decomposition.complete) {
    els.decompositionNote.textContent = `${decomposition.components.length} component${decomposition.components.length === 1 ? "" : "s"}, in written order. Select one to open its record.`;
  } else {
    const unresolved = decomposition.unresolved.filter(Boolean).join(", ");
    els.decompositionNote.textContent = unresolved
      ? `GF0014 components are shown where matched. Unresolved visual fragment${decomposition.unresolved.length === 1 ? "" : "s"}: ${unresolved}.`
      : "This character has only a partial GF0014 mapping in the source data.";
  }
}

function setSelectedCharacter(value) {
  const character = [...String(value || "").trim()][0];
  if (!character) return;
  selectedCharacter = character;
  const url = new URL(location.href);
  url.searchParams.set("char", character);
  history.replaceState(null, "", url);
  renderDecomposition();
}

function openComponent(id) {
  if (!componentById.has(id)) return;
  selectedId = id;
  activeFilter = "all";
  els.search.value = "";
  els.filterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === "all");
  });
  render();
  document.querySelector(".detail-panel")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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

function renderGlyph(component) {
  const vector = componentGlyphs[component.id];
  if (!vector) return escapeHtml(component.character || "ID");

  const paths = vector.paths
    .map((path) => `<path d="${escapeHtml(path)}"></path>`)
    .join("");
  const label = escapeHtml(component.display || `GF ${component.id}`);
  return `
    <svg class="component-glyph-svg" viewBox="${escapeHtml(vector.viewBox)}" role="img" aria-label="${label}">
      <g fill="none" stroke="currentColor" stroke-width="${vector.strokeWidth}" stroke-linecap="square" stroke-linejoin="miter">${paths}</g>
    </svg>
  `;
}

function formatComponentType(type) {
  return String(type || "unknown")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

els.search.addEventListener("input", render);

els.decomposerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  setSelectedCharacter(els.characterInput.value);
});

els.characterInput.addEventListener("compositionstart", () => {
  isComposing = true;
});

els.characterInput.addEventListener("compositionend", () => {
  isComposing = false;
  setSelectedCharacter(els.characterInput.value);
});

els.characterInput.addEventListener("input", () => {
  if (!isComposing && [...els.characterInput.value.trim()].length === 1) {
    setSelectedCharacter(els.characterInput.value);
  }
});

els.decompositionComponents.addEventListener("click", (event) => {
  const chip = event.target.closest(".component-chip");
  if (chip) openComponent(Number(chip.dataset.componentId));
});

els.list.addEventListener("click", (event) => {
  const row = event.target.closest(".component-row");
  if (!row) return;
  selectedId = Number(row.dataset.id);
  render();
});

els.examples.addEventListener("click", (event) => {
  const example = event.target.closest(".example-character");
  if (example) setSelectedCharacter(example.dataset.character);
});

els.filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    els.filterButtons.forEach((item) => item.classList.toggle("active", item === button));
    render();
  });
});

render();
renderDecomposition();
