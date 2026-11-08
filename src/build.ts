// src/palettes/index.ts に登録したテーマを、それぞれ themes/<id>.json と themes/<id>-blur.json に書き出す
// 使い方: bun run build
import { buildBlurred, buildOpaque, writeFamily } from "./engine/family.ts";
import { gamutNotes } from "./engine/theme.ts";
import { themeSets } from "./palettes/index.ts";

for (const set of themeSets) {
  const opaque = buildOpaque(set);
  const blurred = buildBlurred(set);
  await writeFamily(`themes/${set.id}.json`, set.family, opaque);
  await writeFamily(`themes/${set.id}-blur.json`, `${set.family} Blur`, blurred);
  console.log(`生成しました: ${[...opaque, ...blurred].map((t) => t.name).join(", ")}`);
}

const notes = [...new Set(gamutNotes)];
if (notes.length) console.log(`\n彩度を下げた色:\n  ${notes.join("\n  ")}`);
