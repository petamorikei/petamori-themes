// apca-w3 には型定義が付いていないので、使う関数だけ宣言する
declare module "apca-w3" {
  /** 文字の輝度 txtY と背景の輝度 bgY から APCA の Lc を返す（明るい文字は負の値） */
  export function APCAcontrast(txtY: number, bgY: number, places?: number): number;
  /** 8bit の sRGB [r, g, b] から APCA 用の輝度 Y を返す */
  export function sRGBtoY(rgb: readonly number[]): number;
}
