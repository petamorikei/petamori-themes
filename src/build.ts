// src/palettes/index.tsに登録したテーマを、各エディタ向けに書き出す
// - Zed: zed/themes/<id>.json、zed/themes/<id>-blur.jsonと、Italic版のzed/themes/<id>-italic.json、zed/themes/<id>-italic-blur.json
// - VS Code: vscode/themes/<テーマ名>-color-theme.jsonとvscode/package.json（無印版とItalic版。ブラー版はない）
// - iTerm2: iterm2/<テーマ名>.itermcolorsと、両方のモードを持つiterm2/<ファミリー名>.itermcolors（ブラー版はない）
// 使い方: bun run build

import { gamutNotes } from "./engine/resolve.ts";
import { themeSets } from "./palettes/index.ts";
import { writeItermPresets } from "./targets/iterm2/preset.ts";
import { writeVscodeExtension } from "./targets/vscode/extension.ts";
import { buildFamilies, writeFamily } from "./targets/zed/family.ts";

for (const set of themeSets) {
  const families = buildFamilies(set);
  for (const f of families) await writeFamily(f.path, f.name, f.themes);
  console.log(`Zed: ${families.flatMap((f) => f.themes.map((t) => t.name)).join(", ")}`);
}

const vscodeThemes = await writeVscodeExtension(themeSets);
console.log(`VS Code: ${vscodeThemes.map((t) => t.name).join(", ")}`);

const itermPresets = await writeItermPresets(themeSets);
console.log(`iTerm2: ${itermPresets.join(", ")}`);

const notes = [...new Set(gamutNotes)];
if (notes.length) console.log(`\n彩度を下げた色:\n  ${notes.join("\n  ")}`);
