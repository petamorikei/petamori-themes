// apca-w3には型定義が付いていないので、使う関数だけ宣言する
declare module "apca-w3" {
  /** 文字の輝度txtYと背景の輝度bgYからAPCAのLcを返す（明るい文字は負の値） */
  export function APCAcontrast(txtY: number, bgY: number, places?: number): number;
  /** 8bitのsRGB [r, g, b]からAPCA用の輝度Yを返す */
  export function sRGBtoY(rgb: readonly number[]): number;
}
