// 生成し忘れの検査。テーマを生成し直して、その結果が今のファイル（コミットする内容）と同じかを確かめる。
// 配色（src/palettes/）や生成の処理を変えたのにbun run buildを忘れていると、差分が出て失敗する。
// 使い方: bun run check:generated（コミットするときはpre-commitのフックが自動で実行する）
import { $ } from "bun";

const GENERATED = ["zed/themes", "vscode/themes", "vscode/package.json", "iterm2"];

await $`bun src/build.ts`.quiet();

// 生成し直したことで変わったファイル
const changed = (await $`git diff --name-only -- ${GENERATED}`.text()).trim();
// 生成されたのに、gitに追加されていないファイル（新しいテーマなど）
const untracked = (await $`git ls-files --others --exclude-standard -- ${GENERATED}`.text()).trim();

if (changed || untracked) {
  console.log("生成し直した結果が、コミットする内容と違います。");
  if (changed) console.log(`変わったファイル:\n  ${changed.split("\n").join("\n  ")}`);
  if (untracked) console.log(`追加されていないファイル:\n  ${untracked.split("\n").join("\n  ")}`);
  console.log("生成し直したファイルを確認して、git addしてからコミットし直してください。");
  process.exitCode = 1;
} else {
  console.log("生成されたファイルは最新です");
}
