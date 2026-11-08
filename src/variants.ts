// 比較用テーマを生成する。今の palette.ts をベースラインとして、一部を書き換えた案を並べる。
// 使い方: bun run variants → themes/peony-variants.json（git の管理外）
//
// 進め方:
// 1. 下の experiments に案を書き、bun run variants を実行する。
// 2. Zed で `zed: rebuild dev extension` を実行し、テーマセレクターで無印のテーマ（ベースライン）と見比べる。
// 3. 採用する案が決まったら palette.ts に反映し、experiments を空に戻す（空なら比較用テーマのファイルは消える）。
import { unlink } from "node:fs/promises";
import { differenceEuclidean } from "culori";
import { buildBlurTheme } from "./blur.ts";
import { writeFamily } from "./build.ts";
import { alphaOf } from "./color.ts";
import { type Mode, type Palette, palette } from "./palette.ts";
import { buildStyle, type Style, type Theme } from "./theme.ts";

const OUT = "themes/peony-variants.json";

type Target = "opaque" | "blur";

interface Experiment {
  /** テーマセレクターに出る名前の一部 */
  label: string;
  /** palette の複製を書き換える */
  apply: (p: Palette) => void;
  /** どの版で作るか（省略時は不透明版だけ） */
  targets?: Target[];
}

// 案の書き方の例:
//   { label: "A 背景の彩度", apply: (p) => { p.surface.chroma = 0.026; } },
//   ブラー版で試すとき: { label: "...", apply: (p) => { p.blur.overlay.dark["tab_bar.background"] = ["background", 0]; }, targets: ["blur"] },
const experiments: Experiment[] = [];

// ---------------------------------------------------------------

const modes: { mode: Mode; name: string }[] = [
  { mode: "dark", name: "Peony Dusk" },
  { mode: "light", name: "Peony Dawn" },
];

if (experiments.length === 0) {
  await unlink(OUT).catch(() => {});
  console.log(`案がないので ${OUT} を消しました`);
  process.exit(0);
}

const build = (target: Target, mode: Mode, name: string, p: Palette): Theme =>
  target === "blur"
    ? buildBlurTheme(mode, `${name} Blur`, p)
    : { name, appearance: mode, style: buildStyle(mode, { palette: p }) };

const de = differenceEuclidean("oklab");
const colors = (s: Style): Map<string, string> => {
  const m = new Map<string, string>();
  for (const [k, v] of Object.entries(s)) {
    if (typeof v === "string" && v.startsWith("#")) m.set(k, v);
    else if (k === "syntax" && v && !Array.isArray(v))
      for (const [sk, sv] of Object.entries(v)) m.set(`syntax.${sk}`, sv.color);
  }
  return m;
};
const sample = ["editor.background", "panel.background", "text", "syntax.keyword"];

const themes: Theme[] = [];
for (const { mode, name } of modes) {
  for (const e of experiments) {
    for (const target of e.targets ?? ["opaque"]) {
      const baseTheme = build(target, mode, name, palette);
      const p = structuredClone(palette);
      e.apply(p);
      const theme = build(target, mode, name, p);
      const label = `${baseTheme.name} [${e.label}]`;
      themes.push({ ...theme, name: label });

      // ベースラインとの差（OKLab の ΔE ×100。アルファだけが変わったものも数える）
      const base = colors(baseTheme.style);
      const cur = colors(theme.style);
      const changed = [...base].flatMap(([k, v]) => {
        const w = cur.get(k) ?? v;
        const d = (de(v.slice(0, 7), w.slice(0, 7)) ?? 0) * 100;
        return d >= 0.5 || alphaOf(v) !== alphaOf(w) ? [{ k, d }] : [];
      });
      const mean = changed.reduce((s, { d }) => s + d, 0) / Math.max(1, changed.length);
      const keys = [...new Set([...sample, ...changed.slice(0, 4).map(({ k }) => k)])];
      const examples = keys.map((k) => `${k} ${base.get(k)}→${cur.get(k)}`).join(", ");
      console.log(`${label}: ${changed.length} 色が変化（平均 ΔE ${mean.toFixed(1)}）\n  ${examples}`);
    }
  }
}

await writeFamily(OUT, "Peony Variants", themes);
console.log(`\n${OUT} を生成しました（${themes.length} テーマ）`);
