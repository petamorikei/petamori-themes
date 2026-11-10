// VS Codeの拡張機能（vscode/）の書き出し。テーマのファイルと、package.jsonを生成する。
// package.jsonは生成されるファイルなので直接編集せず、ここのMANIFESTを編集する。
import { $ } from "bun";
import type { Mode, ThemeSet } from "../../engine/palette.ts";
import { buildVscodeTheme, type VscodeTheme } from "./theme.ts";

const DIR = "vscode";

/** package.jsonのうち、テーマの一覧（contributes.themes）以外の部分 */
const MANIFEST = {
  name: "petamori-themes",
  displayName: "Petamori Themes",
  description: "A collection of color themes by Petamori.",
  version: "0.1.0",
  // 公開前に、Marketplaceで作ったpublisherのIDに合わせる（今は仮の値）
  publisher: "petamori",
  license: "MIT",
  repository: { type: "git", url: "https://github.com/petamorikei/petamori-themes" },
  engines: { vscode: "^1.75.0" },
  categories: ["Themes"],
  keywords: ["theme", "color-theme", "dark", "light", "pink"],
};

const MODES: Mode[] = ["dark", "light"];
const slug = (name: string): string => name.toLowerCase().replace(/\s+/g, "-");

const writeJson = async (path: string, value: unknown): Promise<void> => {
  await Bun.write(path, `${JSON.stringify(value, null, 2)}\n`);
  // biomeの整形に揃える（揃えないと、生成するたびに整形の差分が出る）
  await $`bunx biome format --write --no-errors-on-unmatched ${path}`.quiet();
};

/** テーマのファイルとpackage.jsonを書き出し、書き出したテーマを返す */
export const writeVscodeExtension = async (sets: ThemeSet[]): Promise<VscodeTheme[]> => {
  const themes: VscodeTheme[] = [];
  const contributes: { label: string; uiTheme: "vs-dark" | "vs"; path: string }[] = [];
  for (const set of sets) {
    for (const mode of MODES) {
      const name = set.names[mode];
      const theme = buildVscodeTheme(set.palette, mode, name);
      const file = `themes/${slug(name)}-color-theme.json`;
      await writeJson(`${DIR}/${file}`, theme);
      themes.push(theme);
      contributes.push({ label: name, uiTheme: mode === "dark" ? "vs-dark" : "vs", path: `./${file}` });
    }
  }
  await writeJson(`${DIR}/package.json`, { ...MANIFEST, contributes: { themes: contributes } });
  return themes;
};
