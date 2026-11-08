// 不透明版の規則から、ブラー（透過）版のテーマを組み立てる
//
// 方針: 色を乗せるのはウィンドウ全体の "background" だけにして、その上の層は透明にする
// （半透明を何層も重ねると濃さがまばらになるため）。パネルなどの階層は、低いアルファで重ねて出す。
import { over, withAlpha } from "./color.ts";
import { palette as defaultPalette, type Mode, type Palette } from "./palette.ts";
import { buildStyle, type Style, type Theme } from "./theme.ts";

const CLEAR = "#00000000";

const transparentKeys = [
  "editor.background",
  "editor.gutter.background",
  "toolbar.background",
  "tab.active_background",
  "terminal.background",
  "scrollbar.track.background",
  "scrollbar.track.border",
  "tab.inactive_background",
  "scrollbar.thumb.border",
];
// タイトルバーとステータスバーは "background" を塗った領域の外側に描画される（Zed の workspace.rs で別の要素）。
// そのため background の透け具合が効かない。色は各バー用のものを使い、不透明度だけ background に合わせる。
const barKeys = ["title_bar.background", "title_bar.inactive_background", "status_bar.background"];

const str = (style: Style, key: string): string => {
  const v = style[key];
  if (typeof v !== "string") throw new Error(`${key} が色ではない`);
  return v;
};

export const buildBlurTheme = (mode: Mode, name: string, palette: Palette = defaultPalette): Theme => {
  const { opacity, overlay } = palette.blur;
  const editorBg = str(buildStyle(mode, { palette }), "editor.background");
  const background = withAlpha(editorBg, opacity);
  // 文字色の最低ラインは、半透明の background を黒い壁紙と白い壁紙に重ねた色の両方で確かめる
  const base = buildStyle(mode, { palette, floorBgs: [over(background, "#000000"), over(background, "#ffffff")] });
  const style: Style = { "background.appearance": "blurred", ...base, background };
  for (const k of transparentKeys) style[k] = CLEAR;
  for (const [k, [source, alpha]] of Object.entries(overlay[mode])) style[k] = withAlpha(str(base, source), alpha);
  for (const k of barKeys) style[k] = withAlpha(str(base, k), opacity);
  return { name, appearance: mode, style };
};
