// 色の計算: OKLCHからhexへの変換、コントラスト（APCAとWCAG 2）、半透明色の合成、
// コントラストの目標値から明度Lを求める処理
import { APCAcontrast, sRGBtoY } from "apca-w3";
import { clampChroma, converter, formatHex, type Oklch } from "culori";

const toOklch = converter("oklch");

/** 6桁hexを0〜255の[r, g, b]にする（8桁ならアルファは無視する） */
export const rgb255 = (hex: string): [number, number, number] => {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** 8桁hexのアルファ（0〜1）。6桁なら1 */
export const alphaOf = (hex: string): number => (hex.length === 9 ? Number.parseInt(hex.slice(7, 9), 16) / 255 : 1);

/** 6桁hexにアルファ（0〜1）を付けて8桁にする */
export const withAlpha = (hex: string, alpha: number): string =>
  hex.slice(0, 7) +
  Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");

/** 半透明色fgを不透明色underの上に重ねた結果（6桁hex） */
export const over = (fg: string, under: string): string => {
  const a = alphaOf(fg);
  const f = rgb255(fg);
  const u = rgb255(under);
  return `#${f
    .map((c, i) =>
      Math.round(c * a + (u[i] ?? 0) * (1 - a))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
};

/** OKLCHから6桁hex。sRGBに収まらないときはLとHを保ったまま彩度だけ下げる */
export const oklchHex = (l: number, c: number, h: number): string => {
  const clamped = clampChroma({ mode: "oklch", l, c, h }, "oklch") as Oklch;
  return formatHex(clamped);
};

/** hexをOKLCHにする（無彩色のときはhを0とする） */
export const hexOklch = (hex: string): { l: number; c: number; h: number } => {
  const o = toOklch(hex.slice(0, 7));
  if (!o) throw new Error(`色として読めない: ${hex}`);
  return { l: o.l, c: o.c, h: o.h ?? 0 };
};

/** APCAのLcの絶対値（明暗の向きは問わない） */
export const apca = (fg: string, bg: string): number =>
  Math.abs(APCAcontrast(sRGBtoY(rgb255(fg)), sRGBtoY(rgb255(bg))));

const relLum = (hex: string): number =>
  rgb255(hex)
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((sum, v, i) => sum + v * ([0.2126, 0.7152, 0.0722][i] ?? 0), 0);

/** WCAG 2のコントラスト比 */
export const wcag = (a: string, b: string): number => {
  const [x, y] = [relLum(a), relLum(b)].sort((p, q) => q - p);
  return ((x ?? 0) + 0.05) / ((y ?? 0) + 0.05);
};

export type Metric = "apca" | "wcag";

export interface SolveSpec {
  hue: number;
  chroma: number;
  /** 目標のコントラスト（metricがapcaならLc、wcagなら比） */
  target: number;
  metric: Metric;
  /** 明度を合わせる基準の背景 */
  bg: string;
  /** 文字が背景より明るいなら"up"（ダーク）、暗いなら"down"（ライト） */
  direction: "up" | "down";
  /** WCAG 2の最低ライン。floorBgsのすべてに対してこの比を満たすまで、さらに背景から離す */
  floor: number;
  floorBgs: readonly string[];
}

/**
 * 色相と彩度を固定したまま、背景とのコントラストが目標になる明度Lを二分探索で求める。
 * 目標を満たしたあと、WCAG 2の最低ラインに届かなければさらに背景から離す。
 * 戻り値は6桁hex（丸めたあとの値で最低ラインを確認する）。
 */
export const solveInk = (spec: SolveSpec): string => {
  const bgL = hexOklch(spec.bg).l;
  // t = 0で背景と同じ明度、t = 1で白（ダーク）または黒（ライト）
  const colorAt = (t: number): string => {
    const l = spec.direction === "up" ? bgL + (1 - bgL) * t : bgL * (1 - t);
    return oklchHex(l, spec.chroma, spec.hue);
  };
  const measure = (hex: string): number => (spec.metric === "apca" ? apca(hex, spec.bg) : wcag(hex, spec.bg));
  const meetsFloor = (hex: string): boolean => spec.floorBgs.every((b) => wcag(hex, b) >= spec.floor);

  // コントラストはtについて単調に増えるので、二分探索で条件を満たす最小のtを探す
  const search = (ok: (hex: string) => boolean, from: number): number => {
    if (ok(colorAt(from))) return from;
    let lo = from;
    let hi = 1;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (ok(colorAt(mid))) hi = mid;
      else lo = mid;
    }
    return hi;
  };
  let t = search((hex) => measure(hex) >= spec.target, 0);
  t = search(meetsFloor, t);
  // hexに丸めた結果で最低ラインを割ることがあるので、少しずつ離して確かめる
  let hex = colorAt(t);
  while (!meetsFloor(hex) && t < 1) {
    t = Math.min(1, t + 0.001);
    hex = colorAt(t);
  }
  return hex;
};
