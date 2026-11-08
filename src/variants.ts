// 比較用テーマを生成する。今の配色をベースラインとして、一部を書き換えた案を並べる。
// 使い方: bun run variants → themes/<テーマのid>-variants.json（gitの管理外）
//
// 進め方:
// 1. 下のSETに対象のテーマのidを、experimentsに案を書き、bun run variantsを実行する。
// 2. Zedで`zed: rebuild dev extension`を実行し、テーマセレクターで無印のテーマ（ベースライン）と見比べる。
// 3. 採用する案が決まったらsrc/palettes/<id>.tsに反映し、experimentsを空に戻す
//    （空なら比較用テーマのファイルは消える）。
import { unlink } from "node:fs/promises";
import { Glob } from "bun";
import { differenceEuclidean } from "culori";
import { alphaOf } from "./engine/color.ts";
import { buildBlurred, buildOpaque, writeFamily } from "./engine/family.ts";
import type { Mode, Palette } from "./engine/palette.ts";
import type { Style, Theme } from "./engine/theme.ts";
import { themeSets } from "./palettes/index.ts";

/** 対象のテーマのid（src/palettes/index.tsに登録したもの） */
const SET = "peony";

type Target = "opaque" | "blur";

interface Experiment {
  /** テーマセレクターに出る名前の一部 */
  label: string;
  /** 配色の複製を書き換える */
  apply: (p: Palette) => void;
  /** どの版で作るか（省略時は不透明版だけ） */
  targets?: Target[];
  /** ダークとライトのどちらで作るか（省略時は両方） */
  modes?: Mode[];
}

// 案の書き方の例:
//   { label: "A背景の彩度", apply: (p) => { p.surface.chroma = 0.026; } },
//   ブラー版で試すとき: { label: "...", apply: (p) => { p.blur.overlay.dark["tab_bar.background"] = ["background", 0]; }, targets: ["blur"] },
//   ダークだけで試すとき: { label: "...", apply: (p) => { p.tiers.accent.apca = 55; }, modes: ["dark"] },
const experiments: Experiment[] = [];

// ---------------------------------------------------------------

if (experiments.length === 0) {
  for (const path of new Glob("themes/*-variants.json").scanSync()) {
    await unlink(path);
    console.log(`案がないので${path}を消しました`);
  }
  process.exit(0);
}

const set = themeSets.find((s) => s.id === SET);
if (!set) throw new Error(`テーマ${SET}がsrc/palettes/index.tsにない`);
const out = `themes/${set.id}-variants.json`;

const build = (target: Target, p: Palette): Theme[] => (target === "blur" ? buildBlurred(set, p) : buildOpaque(set, p));

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
for (const e of experiments) {
  for (const target of e.targets ?? ["opaque"]) {
    const p = structuredClone(set.palette);
    e.apply(p);
    const baseline = build(target, set.palette);
    for (const [i, theme] of build(target, p).entries()) {
      const baseTheme = baseline[i];
      if (!baseTheme) continue;
      if (e.modes && !e.modes.includes(theme.appearance)) continue;
      const label = `${baseTheme.name} [${e.label}]`;
      themes.push({ ...theme, name: label });

      // ベースラインとの差（OKLabのΔE ×100。アルファだけが変わったものも数える）
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
      console.log(`${label}: ${changed.length}色が変化（平均ΔE ${mean.toFixed(1)}）\n  ${examples}`);
    }
  }
}

await writeFamily(out, `${set.family} Variants`, themes);
console.log(`\n${out}を生成しました（${themes.length}テーマ）`);
