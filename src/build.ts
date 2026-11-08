// palette.ts から themes/peony.json と themes/peony-blur.json を生成する
// 使い方: bun run build
import { $ } from "bun";
import { buildBlurTheme } from "./blur.ts";
import type { Mode } from "./palette.ts";
import { buildStyle, gamutNotes, type Theme } from "./theme.ts";

const SCHEMA = "https://zed.dev/schema/themes/v0.2.0.json";

const variants: { mode: Mode; name: string }[] = [
  { mode: "dark", name: "Peony Dusk" },
  { mode: "light", name: "Peony Dawn" },
];

export const writeFamily = async (path: string, name: string, themes: Theme[]): Promise<void> => {
  const family = { $schema: SCHEMA, name, author: "kei", themes };
  await Bun.write(path, `${JSON.stringify(family, null, 2)}\n`);
  // biome の整形に揃える（揃えないと、生成するたびに整形の差分が出る）
  // git の管理外のファイル（比較用テーマ）は biome の対象外なので、エラーにしない
  await $`bunx biome format --write --no-errors-on-unmatched ${path}`.quiet();
};

if (import.meta.main) {
  const opaque: Theme[] = variants.map(({ mode, name }) => ({ name, appearance: mode, style: buildStyle(mode) }));
  const blurred: Theme[] = variants.map(({ mode, name }) => buildBlurTheme(mode, `${name} Blur`));

  await writeFamily("themes/peony.json", "Peony", opaque);
  await writeFamily("themes/peony-blur.json", "Peony Blur", blurred);

  console.log(`生成しました: ${[...opaque, ...blurred].map((t) => t.name).join(", ")}`);
  const notes = [...new Set(gamutNotes)];
  if (notes.length) console.log(`\n彩度を下げた色:\n  ${notes.join("\n  ")}`);
}
