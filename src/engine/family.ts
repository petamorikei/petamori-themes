// テーマファミリー（ダーク・ライトとそれぞれのブラー版）の組み立てと、JSON への書き出し
import { $ } from "bun";
import { buildBlurTheme } from "./blur.ts";
import type { Mode, Palette, ThemeSet } from "./palette.ts";
import { buildStyle, type Theme } from "./theme.ts";

const SCHEMA = "https://zed.dev/schema/themes/v0.2.0.json";
const AUTHOR = "kei";
const MODES: Mode[] = ["dark", "light"];

/** 不透明版を作る。palette を渡すと、set.palette の代わりにそれを使う（比較用テーマ用） */
export const buildOpaque = (set: ThemeSet, palette: Palette = set.palette): Theme[] =>
  MODES.map((mode) => ({ name: set.names[mode], appearance: mode, style: buildStyle(palette, mode) }));

/** ブラー版を作る。名前は不透明版の名前の末尾に " Blur" を付けたもの */
export const buildBlurred = (set: ThemeSet, palette: Palette = set.palette): Theme[] =>
  MODES.map((mode) => buildBlurTheme(palette, mode, `${set.names[mode]} Blur`));

export const writeFamily = async (path: string, name: string, themes: Theme[]): Promise<void> => {
  const family = { $schema: SCHEMA, name, author: AUTHOR, themes };
  await Bun.write(path, `${JSON.stringify(family, null, 2)}\n`);
  // biome の整形に揃える（揃えないと、生成するたびに整形の差分が出る）
  // git の管理外のファイル（比較用テーマ）は biome の対象外なので、エラーにしない
  await $`bunx biome format --write --no-errors-on-unmatched ${path}`.quiet();
};
