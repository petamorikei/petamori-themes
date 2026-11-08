// 拡張機能に含めるテーマの一覧。テーマを増やすときはsrc/palettes/<名前>.tsを作り、ここに足す。
import type { ThemeSet } from "../engine/palette.ts";
import { berry } from "./berry.ts";
import { fuchsia } from "./fuchsia.ts";
import { peony } from "./peony.ts";

export const themeSets: ThemeSet[] = [peony, fuchsia, berry];
