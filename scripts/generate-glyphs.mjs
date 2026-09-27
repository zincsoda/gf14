import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const [
  componentsPath = "components.json",
  outputPath = "glyphs-data.js",
  analyzerPath,
] = process.argv.slice(2);

if (!analyzerPath) {
  throw new Error("Pass the path to the hanzi-chai module as the third argument.");
}

const components = JSON.parse(await readFile(componentsPath, "utf8"));
const analyzer = await import(pathToFileURL(analyzerPath));
const selected = analyzer.获取原始字库().确定({});

if (!selected.ok) throw selected.error;

const repertoire = selected.value;
const hookType1 = new Set(["横钩"]);
const hookType2 = new Set([
  "竖钩",
  "横折钩",
  "竖折折钩",
  "横折折折钩",
  "弯钩",
  "横撇弯钩",
]);
const hookType3 = new Set(["斜钩", "横斜钩", "竖弯钩", "横折弯钩", "撇钩"]);

function drawLength(curve) {
  if (curve.command === "h" || curve.command === "v") return curve.parameterList[0];
  if (curve.command === "a") return 0;
  const [, , , , x, y] = curve.parameterList;
  return Math.sqrt(x * x + y * y);
}

function processPath(stroke) {
  const commands = [`M${stroke.start.join(" ")}`];

  stroke.curveList.forEach((curve, index) => {
    let command;
    if (
      index === stroke.curveList.length - 1 &&
      curve.command === "h" &&
      stroke.feature.endsWith("提")
    ) {
      const length = curve.parameterList[0];
      command = `l ${length} ${-0.15 * length}`;
    } else if (curve.command === "a") {
      commands.push("a 50,50 0 1,1 0,100");
      command = "a 50,50 0 1,1 0,-100";
    } else {
      command = `${curve.command.replace("z", "c")} ${curve.parameterList.join(" ")}`;
    }
    commands.push(command);
  });

  const finalCurve = stroke.curveList.at(-1);
  if (!finalCurve) return commands.join(" ");

  const referenceLength = drawLength(finalCurve);
  const hookLength = 5 + referenceLength * 0.25;
  if (hookType1.has(stroke.feature)) commands.push("l 0 20");
  if (hookType2.has(stroke.feature)) commands.push(`l ${-hookLength} ${-hookLength * 0.3}`);
  if (hookType3.has(stroke.feature)) commands.push(`l ${hookLength * 0.3} ${-hookLength}`);

  return commands.join(" ");
}

const glyphs = {};

for (const component of components.filter((item) => item.componentType === "private-use")) {
  const glyph = repertoire.查询字形(component.character);
  if (!glyph) throw new Error(`No glyph model found for GF ${component.id}.`);

  const box = glyph.type === "basic_component"
    ? analyzer.图形盒子.从笔画列表构建(glyph.strokes)
    : repertoire.递归渲染复合体(glyph).value;

  if (!box) throw new Error(`Could not render GF ${component.id}.`);

  const { strokeWidth, viewBox } = box.确定笔画粗细和视窗(false);
  glyphs[component.id] = {
    viewBox,
    strokeWidth,
    paths: box.获取笔画列表().map(processPath),
  };
}

const output = `window.GF0014_GLYPHS = ${JSON.stringify(glyphs)};\n`;
await writeFile(outputPath, output);
console.log(`Generated ${Object.keys(glyphs).length} private-use glyphs.`);
