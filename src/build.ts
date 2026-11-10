// src/palettes/index.tsに登録したテーマを、それぞれzed/themes/<id>.jsonとzed/themes/<id>-blur.jsonに書き出す
// 使い方: bun run build

import { themeSets } from "./palettes/index.ts";
import { buildBlurred, buildOpaque, writeFamily } from "./targets/zed/family.ts";
import { gamutNotes } from "./targets/zed/theme.ts";

for (const set of themeSets) {
  const opaque = buildOpaque(set);
  const blurred = buildBlurred(set);
  await writeFamily(`zed/themes/${set.id}.json`, set.family, opaque);
  await writeFamily(`zed/themes/${set.id}-blur.json`, `${set.family} Blur`, blurred);
  console.log(`生成しました: ${[...opaque, ...blurred].map((t) => t.name).join(", ")}`);
}

const notes = [...new Set(gamutNotes)];
if (notes.length) console.log(`\n彩度を下げた色:\n  ${notes.join("\n  ")}`);
