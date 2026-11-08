// テーマの簡易チェック: WCAG 2 のコントラスト比（合否の判定）と APCA の Lc（参考）、One テーマとのキー差分
// 使い方: bun run check:theme [テーマJSON(省略時は themes/*.json 全部)] [one.json(任意)]
// 透過テーマ（background.appearance が opaque 以外）は、半透明の background を
// 黒い壁紙と白い壁紙それぞれに重ねた色で計算し、悪いほうの値を表示する。
import { Glob } from "bun";
import { apca, hexOklch, over, wcag } from "./color.ts";
import type { SyntaxStyle, Theme } from "./theme.ts";

interface Family {
  themes: Theme[];
}

const themePaths = process.argv[2] ? [process.argv[2]] : [...new Glob("themes/*.json").scanSync()].sort();
const refPath = process.argv[3];

// 低コントラストを意図的に許容するもの（目標 3:1）
const SOFT = new Set([
  "syntax.comment",
  "syntax.comment.doc",
  "syntax.predictive",
  "syntax.hint",
  "editor.line_number",
  "terminal.ansi.bright_black",
  "terminal.dim_foreground",
]);
// 背景に近い色であることが前提のもの（チェック対象外）
const SKIP = /^terminal\.ansi\.(dim_|black$|white$|bright_white$)/;

const color = (v: unknown): string | undefined => (typeof v === "string" && v.startsWith("#") ? v : undefined);

let failed = 0;
for (const themePath of themePaths) {
  const family = (await Bun.file(themePath).json()) as Family;
  for (const t of family.themes) {
    const s = t.style;
    const translucent = (s["background.appearance"] ?? "opaque") !== "opaque";
    const background = color(s.background);
    const editorBg = color(s["editor.background"]);
    if (!background || !editorBg) throw new Error(`${t.name}: background か editor.background がない`);
    // 比較に使う背景（透過テーマは黒壁紙・白壁紙の2通り）
    const bgs = translucent ? [over(background, "#000000"), over(background, "#ffffff")] : [editorBg];
    const syntax = (s.syntax ?? {}) as Record<string, SyntaxStyle>;
    const items: [string, string | undefined][] = [
      ...["text", "editor.foreground", "text.muted", "text.accent", "editor.line_number"].map(
        (k): [string, string | undefined] => [k, color(s[k])],
      ),
      ...["error", "warning", "success", "info"].map((k): [string, string | undefined] => [k, color(s[k])]),
      ...Object.entries(syntax).map(([k, v]): [string, string | undefined] => [`syntax.${k}`, v.color]),
      ...Object.entries(s)
        .filter(([k]) => (k.startsWith("terminal.ansi.") || k === "terminal.dim_foreground") && !SKIP.test(k))
        .map(([k, v]): [string, string | undefined] => [k, color(v)]),
    ];
    console.log(`\n== ${t.name} (bg ${bgs.join(" / ")}${translucent ? " ※黒壁紙/白壁紙で悪いほう" : ""}) ==`);
    console.log("     WCAG       APCA");
    for (const [k, v] of items) {
      if (!v) {
        failed++;
        console.log(`FAIL 色がない: ${k}`);
        continue;
      }
      const r = Math.min(...bgs.map((b) => wcag(v, b)));
      const lc = Math.min(...bgs.map((b) => apca(v, b)));
      const need = SOFT.has(k) ? 3 : 4.5;
      const ok = r >= need;
      if (!ok) failed++;
      console.log(
        `${ok ? "OK  " : "FAIL"} ${r.toFixed(2).padStart(5)} (>=${need}) Lc${lc.toFixed(0).padStart(4)}  ${k} ${v}`,
      );
    }
    // ピンクのアクセントと error の見分けやすさ（色同士のコントラストと OKLCH の色相差）
    const accent = color(s["text.accent"]);
    const error = color(s.error);
    if (accent && error) {
      const dh = Math.abs(hexOklch(accent).h - hexOklch(error).h);
      console.log(
        `accent vs error: 色相差 ${Math.min(dh, 360 - dh).toFixed(0)}°, contrast ${wcag(accent, error).toFixed(2)}`,
      );
    }
  }

  if (refPath) {
    const ref = ((await Bun.file(refPath).json()) as Family).themes[0]?.style;
    if (!ref) throw new Error(`${refPath} にテーマがない`);
    const refSyntax = (ref.syntax ?? {}) as Record<string, SyntaxStyle>;
    for (const t of family.themes) {
      const keys = new Set(Object.keys(t.style));
      const synKeys = new Set(Object.keys((t.style.syntax ?? {}) as Record<string, SyntaxStyle>));
      const missing = [
        ...Object.keys(ref).filter((k) => !keys.has(k)),
        ...Object.keys(refSyntax)
          .filter((k) => !synKeys.has(k))
          .map((k) => `syntax.${k}`),
      ];
      console.log(`\n${t.name}: One にあって未定義のキー: ${missing.join(", ") || "なし"}`);
    }
  }
}

process.exitCode = failed ? 1 : 0;
