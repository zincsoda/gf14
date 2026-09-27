import { readFile, writeFile } from "node:fs/promises";

const [
  inputPath = "/tmp/gf14-repertoire.json",
  outputPath = "decompositions-data.js",
  analyzerPath,
] = process.argv.slice(2);
const rawModels = JSON.parse(await readFile(inputPath, "utf8"));
const models = new Map(rawModels.map((model) => [model.unicode, normalizeModel(model)]));

function normalizeModel(model) {
  return {
    ...model,
    glyphs: typeof model.glyphs === "string" ? JSON.parse(model.glyphs) : model.glyphs,
  };
}

function chooseGlyph(model) {
  return model.glyphs.find((glyph) => glyph.tags?.includes("G")) || model.glyphs[0];
}

function decompose(unicode, seen = new Set()) {
  const model = models.get(unicode);
  if (!model || seen.has(unicode)) return ["?", String.fromCodePoint(unicode)];
  if (model.gf0014_id) return model.gf0014_id;

  const glyph = chooseGlyph(model);
  if (!glyph) return ["?", String.fromCodePoint(unicode)];

  const nextSeen = new Set(seen).add(unicode);
  if (glyph.type === "identity" || glyph.type === "derived_component") {
    return decompose(Number(glyph.source), nextSeen);
  }
  if (glyph.type === "compound" || glyph.type === "spliced_component") {
    return [glyph.operator, ...glyph.operandList.map((item) => decompose(Number(item), nextSeen))];
  }

  return ["?", model.name || String.fromCodePoint(unicode)];
}

function collectIds(tree, result = []) {
  if (typeof tree === "number") {
    result.push(tree);
    return result;
  }
  for (const child of tree.slice(1)) collectIds(child, result);
  return result;
}

function collectUnknowns(tree, result = []) {
  if (!Array.isArray(tree)) return result;
  if (tree[0] === "?") {
    if (!result.includes(tree[1])) result.push(tree[1]);
    return result;
  }
  for (const child of tree.slice(1)) collectUnknowns(child, result);
  return result;
}

function getStructure(model) {
  const glyph = chooseGlyph(model);
  if (glyph?.type === "compound" || glyph?.type === "spliced_component") return glyph.operator;
  return null;
}

async function analyzeWithGF0014() {
  if (!analyzerPath) return new Map();

  const analyzer = await import(analyzerPath);
  const raw = analyzer.获取原始字库()._get();
  const componentIds = new Map(
    Object.entries(raw)
      .filter(([, value]) => value.gf0014_id)
      .map(([character, value]) => [character, value.gf0014_id]),
  );
  const mapping = Object.fromEntries([...componentIds.keys()].map((character) => [character, "a"]));
  const repertoireResult = analyzer.获取字库({ analysis: {}, form: { mapping } });
  if (!repertoireResult.ok) throw repertoireResult.error;

  const characters = Object.entries(raw)
    .filter(([, value]) => value.tygf === 1)
    .map(([character]) => character);
  const prepared = repertoireResult.value.准备字形分析配置({}, mapping, {});
  if (!prepared.ok) throw prepared.error;
  const targets = repertoireResult.value.获取待分析对象(new Set(characters));
  const registry = analyzer.获取注册表();
  const componentAnalyzer = registry.创建部件分析器("默认", prepared.value);
  const componentResults = new Map();
  for (const [name, glyph] of targets.部件列表) {
    const result = componentAnalyzer.分析(name, glyph);
    if (result.ok) componentResults.set(name, result.value);
  }

  const compoundAnalyzer = registry.创建复合体分析器("默认", prepared.value);
  const compoundResults = new Map();
  for (const [name, glyph] of targets.复合体列表) {
    const parts = glyph.operandList.map((part) => componentResults.get(part) || compoundResults.get(part));
    if (parts.some((part) => !part)) continue;
    const result = compoundAnalyzer.分析(name, glyph, parts);
    if (result.ok) compoundResults.set(name, result.value);
  }

  return new Map(characters.flatMap((character) => {
    const result = componentResults.get(character) || compoundResults.get(character);
    const ids = result?.字根序列.map((root) => componentIds.get(root));
    return ids?.every(Boolean) ? [[character, ids]] : [];
  }));
}

const analyzed = await analyzeWithGF0014();

const entries = rawModels
  .filter((model) => model.tygf === 1)
  .map((model) => {
    const character = String.fromCodePoint(model.unicode);
    const tree = decompose(model.unicode);
    const analyzedComponents = analyzed.get(character);
    const complete = Boolean(analyzedComponents);
    return [character, {
      structure: getStructure(models.get(model.unicode)),
      components: analyzedComponents || collectIds(tree),
      complete,
      unresolved: complete ? [] : collectUnknowns(tree),
    }];
  })
  .sort(([left], [right]) => left.codePointAt(0) - right.codePointAt(0));

const output = `window.GF0014_DECOMPOSITIONS = ${JSON.stringify(Object.fromEntries(entries))};\n`;
await writeFile(outputPath, output);

const complete = entries.filter(([, value]) => value.complete).length;
console.log(`Generated ${entries.length} decompositions (${complete} GF-only, ${entries.length - complete} partial).`);
