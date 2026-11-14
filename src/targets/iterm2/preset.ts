// iTerm2のカラープリセット（iterm2/*.itermcolors）の書き出しと読み込み。
// .itermcolorsはplist（XML）で、キーごとに色の辞書（sRGBの0〜1の成分とアルファ）を持つ。
// iTerm2は、ファイル名から拡張子を除いたものをプリセットの名前にする（iTermColorPresets.mのpresetNameFromFilename）。
//
// テーマセット1つにつき、次の3つを書き出す。
// - <ダークのテーマ名>.itermcolors、<ライトのテーマ名>.itermcolors: 1つのモードだけのプリセット
// - <ファミリー名>.itermcolors: キーの末尾に" (Dark)" / " (Light)"を付けた、両方のモードを持つプリセット。
//   プロファイルの「Use separate colors for light and dark mode」と組み合わせると、macOSの外観に合わせて切り替わる。
//   末尾のないキー（モードを分けないときに使われる）にはダークの色を入れる（同梱のSolarizedと同じ）
import { alphaOf, rgb255 } from "../../engine/color.ts";
import type { Mode, ThemeSet } from "../../engine/palette.ts";
import { buildItermColors, type ItermColors } from "./theme.ts";

const DIR = "iterm2";

/** モード別のキーの末尾（iTerm2のCOLORS_DARK_MODE_SUFFIX / COLORS_LIGHT_MODE_SUFFIX） */
export const MODE_SUFFIX: Record<Mode, string> = { dark: " (Dark)", light: " (Light)" };

/** 0〜255の値を0〜1にする。6桁あれば、×255して丸めると元の値に戻る */
const unit = (n: number): string => String(Number((n / 255).toFixed(6)));

const colorDict = (hex: string): string => {
  const [r, g, b] = rgb255(hex);
  const alpha = Math.round(alphaOf(hex) * 255);
  const entries: [string, string][] = [
    ["Alpha Component", `<real>${unit(alpha)}</real>`],
    ["Blue Component", `<real>${unit(b)}</real>`],
    ["Color Space", "<string>sRGB</string>"],
    ["Green Component", `<real>${unit(g)}</real>`],
    ["Red Component", `<real>${unit(r)}</real>`],
  ];
  return entries.map(([k, v]) => `\t\t<key>${k}</key>\n\t\t${v}\n`).join("");
};

/** キーと色をplist（XML）にする。キーは名前順に並べる */
export const toPlist = (colors: ItermColors): string => {
  const body = Object.keys(colors)
    .sort()
    .map((key) => `\t<key>${key}</key>\n\t<dict>\n${colorDict(colors[key] ?? "")}\t</dict>\n`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
${body}</dict>
</plist>
`;
};

/** toPlistで書き出したplistを読み、キーと色（#rrggbbまたは#rrggbbaa）に戻す（検査用） */
export const parsePlist = (xml: string): ItermColors => {
  const colors: ItermColors = {};
  for (const m of xml.matchAll(/<key>([^<]+)<\/key>\s*<dict>([\s\S]*?)<\/dict>/g)) {
    const [, key = "", dict = ""] = m;
    const comp = (name: string): number => {
      const v = new RegExp(`<key>${name} Component</key>\\s*<real>([^<]+)</real>`).exec(dict)?.[1];
      if (v === undefined) throw new Error(`${key}に${name} Componentがない`);
      return Math.round(Number(v) * 255);
    };
    const hex = (n: number): string => n.toString(16).padStart(2, "0");
    const alpha = comp("Alpha");
    colors[key] = `#${hex(comp("Red"))}${hex(comp("Green"))}${hex(comp("Blue"))}${alpha === 255 ? "" : hex(alpha)}`;
  }
  return colors;
};

/** キーの末尾（なし、" (Dark)"、" (Light)"）ごとに分け、末尾を取り除いたキーで返す。キーがない組は含めない（検査用） */
export const splitModes = (colors: ItermColors): { suffix: string; colors: ItermColors }[] => {
  const suffixes = Object.values(MODE_SUFFIX);
  const groups = new Map<string, ItermColors>();
  for (const [key, color] of Object.entries(colors)) {
    const suffix = suffixes.find((s) => key.endsWith(s)) ?? "";
    const group = groups.get(suffix) ?? {};
    group[key.slice(0, key.length - suffix.length)] = color;
    groups.set(suffix, group);
  }
  return [...groups].map(([suffix, colors]) => ({ suffix, colors }));
};

const suffixed = (colors: ItermColors, suffix: string): ItermColors =>
  Object.fromEntries(Object.entries(colors).map(([k, v]) => [`${k}${suffix}`, v]));

/** プリセットを書き出し、書き出したファイル名（拡張子なし＝プリセットの名前）を返す */
export const writeItermPresets = async (sets: ThemeSet[]): Promise<string[]> => {
  const names: string[] = [];
  const write = async (name: string, colors: ItermColors): Promise<void> => {
    await Bun.write(`${DIR}/${name}.itermcolors`, toPlist(colors));
    names.push(name);
  };
  for (const set of sets) {
    const dark = buildItermColors(set.palette, "dark");
    const light = buildItermColors(set.palette, "light");
    await write(set.names.dark, dark);
    await write(set.names.light, light);
    await write(set.family, { ...dark, ...suffixed(dark, MODE_SUFFIX.dark), ...suffixed(light, MODE_SUFFIX.light) });
  }
  return names;
};
