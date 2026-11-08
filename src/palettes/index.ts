// 拡張機能に含めるテーマの一覧。テーマを増やすときは src/palettes/<名前>.ts を作り、ここに足す。
import type { ThemeSet } from "../engine/palette.ts";
import { peony } from "./peony.ts";

export const themeSets: ThemeSet[] = [peony];
