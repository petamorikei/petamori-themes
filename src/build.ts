// src/palettes/index.tsに登録したテーマを、各エディタ向けに書き出す
// - Zed: zed/themes/<id>.jsonとzed/themes/<id>-blur.json
// - VS Code: vscode/themes/<テーマ名>-color-theme.jsonとvscode/package.json（ブラー版はない）
// 使い方: bun run build

import { gamutNotes } from "./engine/resolve.ts";
import { themeSets } from "./palettes/index.ts";
import { writeVscodeExtension } from "./targets/vscode/extension.ts";
import { buildBlurred, buildOpaque, writeFamily } from "./targets/zed/family.ts";

for (const set of themeSets) {
  const opaque = buildOpaque(set);
  const blurred = buildBlurred(set);
  await writeFamily(`zed/themes/${set.id}.json`, set.family, opaque);
  await writeFamily(`zed/themes/${set.id}-blur.json`, `${set.family} Blur`, blurred);
  console.log(`Zed: ${[...opaque, ...blurred].map((t) => t.name).join(", ")}`);
}

const vscodeThemes = await writeVscodeExtension(themeSets);
console.log(`VS Code: ${vscodeThemes.map((t) => t.name).join(", ")}`);

const notes = [...new Set(gamutNotes)];
if (notes.length) console.log(`\n彩度を下げた色:\n  ${notes.join("\n  ")}`);
