// テーマのコントラストの検査（Zed版、VS Code版、iTerm2版のすべてのテーマ）。
// すべての色のキーを「文字」「背景」「対象外」のどれかに分類し、文字が乗りうる背景との組み合わせを総当たりで測る。
// 分類の規則はsrc/targets/<エディタ>/contrast.ts。分類されていないキーがあれば失敗にする。
// 使い方: bun run check:theme [--one <Zedの公式テーマOneのJSON>]（--oneを付けると、Oneにあって未定義のキーも表示する）
import { Glob } from "bun";
import type { MatrixResult } from "./engine/contrast.ts";
import { checkItermColors } from "./targets/iterm2/contrast.ts";
import { parsePlist, splitModes } from "./targets/iterm2/preset.ts";
import { checkVscodeTheme } from "./targets/vscode/contrast.ts";
import type { VscodeTheme } from "./targets/vscode/theme.ts";
import { checkZedTheme } from "./targets/zed/contrast.ts";
import type { SyntaxStyle, Theme } from "./targets/zed/theme.ts";

interface Family {
  themes: Theme[];
}

let failed = 0;
const report = (name: string, r: MatrixResult): void => {
  const bad = r.failures.length + r.unclassified.length;
  failed += bad;
  console.log(`${bad ? "FAIL" : "OK  "} ${name}（${r.checked}組）`);
  for (const f of r.failures) console.log(`       ${f}`);
  if (r.unclassified.length) console.log(`       分類されていないキー: ${r.unclassified.join(", ")}`);
};

console.log("== Zed ==");
const zedFamilies: Family[] = [];
for (const path of [...new Glob("zed/themes/*.json").scanSync()].sort()) {
  if (path.endsWith("-variants.json")) continue;
  const family = (await Bun.file(path).json()) as Family;
  zedFamilies.push(family);
  for (const t of family.themes) report(t.name, checkZedTheme(t));
}

console.log("\n== VS Code ==");
for (const path of [...new Glob("vscode/themes/*.json").scanSync()].sort()) {
  const theme = (await Bun.file(path).json()) as VscodeTheme;
  report(theme.name, checkVscodeTheme(theme));
}

console.log("\n== iTerm2 ==");
for (const path of [...new Glob("iterm2/*.itermcolors").scanSync()].sort()) {
  const name = path.replace(/^iterm2\//, "").replace(/\.itermcolors$/, "");
  // 両方のモードを持つプリセットは、末尾のないキー・(Dark)・(Light)をそれぞれ1つのモードとして測る
  for (const { suffix, colors } of splitModes(parsePlist(await Bun.file(path).text()))) {
    report(`${name}${suffix}`, checkItermColors(colors));
  }
}

// ---- Zedの公式テーマOneとのキーの差分（任意） ----
const oneIndex = process.argv.indexOf("--one");
const onePath = oneIndex >= 0 ? process.argv[oneIndex + 1] : undefined;
if (onePath) {
  const ref = ((await Bun.file(onePath).json()) as Family).themes[0]?.style;
  if (!ref) throw new Error(`${onePath}にテーマがない`);
  const refSyntax = (ref.syntax ?? {}) as Record<string, SyntaxStyle>;
  console.log("\n== Oneにあって未定義のキー ==");
  for (const t of zedFamilies.flatMap((f) => f.themes)) {
    const keys = new Set(Object.keys(t.style));
    const synKeys = new Set(Object.keys((t.style.syntax ?? {}) as Record<string, SyntaxStyle>));
    const missing = [
      ...Object.keys(ref).filter((k) => !keys.has(k)),
      ...Object.keys(refSyntax)
        .filter((k) => !synKeys.has(k))
        .map((k) => `syntax.${k}`),
    ];
    console.log(`${t.name}: ${missing.join(", ") || "なし"}`);
  }
}

console.log(failed ? `\n失敗 ${failed}件` : "\nすべて合格");
process.exitCode = failed ? 1 : 0;
