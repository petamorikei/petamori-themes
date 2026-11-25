// テーマファミリー（ダーク・ライトとそれぞれのブラー版）の組み立てと、JSONへの書き出し
// 無印版とItalic版（飾りのイタリックを使う版）は、別のファミリー（別のファイル）にする
import { $ } from "bun";
import { ITALIC_SUFFIX, type Mode, type Palette, type ThemeSet } from "../../engine/palette.ts";
import { buildBlurTheme } from "./blur.ts";
import { buildStyle, type Theme } from "./theme.ts";

const SCHEMA = "https://zed.dev/schema/themes/v0.2.0.json";
const AUTHOR = "kei";
const MODES: Mode[] = ["dark", "light"];

const italicSuffix = (italic: boolean): string => (italic ? ITALIC_SUFFIX : "");

/**
 * 不透明版を作る。paletteを渡すと、set.paletteの代わりにそれを使う（比較用テーマ用）。
 * italicがtrueならItalic版（名前の末尾に" Italic"）
 */
export const buildOpaque = (set: ThemeSet, palette: Palette = set.palette, italic = false): Theme[] =>
  MODES.map((mode) => ({
    name: `${set.names[mode]}${italicSuffix(italic)}`,
    appearance: mode,
    style: buildStyle(palette, mode, { italic }),
  }));

/** ブラー版を作る。名前は不透明版の名前の末尾に" Blur"を付けたもの（Italic版は" Italic Blur"） */
export const buildBlurred = (set: ThemeSet, palette: Palette = set.palette, italic = false): Theme[] =>
  MODES.map((mode) => buildBlurTheme(palette, mode, `${set.names[mode]}${italicSuffix(italic)} Blur`, italic));

/** 書き出すファイルとファミリーの名前と、その中のテーマ（無印、ブラー、Italic、Italic Blurの4つ） */
export const buildFamilies = (set: ThemeSet): { path: string; name: string; themes: Theme[] }[] =>
  [false, true].flatMap((italic) => {
    const id = `${set.id}${italic ? "-italic" : ""}`;
    const family = `${set.family}${italicSuffix(italic)}`;
    return [
      { path: `zed/themes/${id}.json`, name: family, themes: buildOpaque(set, set.palette, italic) },
      { path: `zed/themes/${id}-blur.json`, name: `${family} Blur`, themes: buildBlurred(set, set.palette, italic) },
    ];
  });

export const writeFamily = async (path: string, name: string, themes: Theme[]): Promise<void> => {
  const family = { $schema: SCHEMA, name, author: AUTHOR, themes };
  await Bun.write(path, `${JSON.stringify(family, null, 2)}\n`);
  // biomeの整形に揃える（揃えないと、生成するたびに整形の差分が出る）
  // gitの管理外のファイル（比較用テーマ）はbiomeの対象外なので、エラーにしない
  await $`bunx biome format --write --no-errors-on-unmatched ${path}`.quiet();
};
