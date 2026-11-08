# Peony

落ち着いたピンクを軸にした、Zed 用のテーマ。軸はピンクだが視認性を優先し、関数・型・文字列などは別の色相に振り分けている。

| テーマ名        | appearance      |
| --------------- | --------------- |
| Peony Dusk      | dark            |
| Peony Dawn      | light           |
| Peony Dusk Blur | dark（ぼかし）  |
| Peony Dawn Blur | light（ぼかし） |

Zed のエクステンション形式（`extension.toml` + `themes/*.json`）で、エクステンション id は `peony`。

## 構成

```
extension.toml
themes/
  peony.json        # Dusk / Dawn（生成されるファイル。直接編集しない）
  peony-blur.json   # ブラー版（生成されるファイル。直接編集しない）
src/
  palette.ts        # 色の元データ。色を変えるときはここだけを編集する
  theme.ts          # palette.ts の規則から、テーマ1つ分の style を組み立てる
  blur.ts           # ブラー版の組み立て
  color.ts          # OKLCH、APCA、WCAG 2、半透明色の合成、明度の計算
  build.ts          # themes/*.json を生成する
  check.ts          # コントラストの検査
  variants.ts       # 比較用テーマの生成
```

## 使い方

```bash
bun install
bun run build         # themes/peony.json と themes/peony-blur.json を生成する（biome で整形まで行う）
bun run check:theme   # コントラストの検査（One とのキーの差分は: bun src/check.ts themes/peony.json <one.json>）
bun run variants      # 比較用テーマを生成する（下の「色の調整の進め方」）
```

## 開発ループ

1. `src/palette.ts` を編集する。
2. `bun run build` を実行する。
3. Zed で **`zed: rebuild dev extension`** を実行すると反映される。
   - **保存しただけでは反映されない**。dev extension は `~/Library/Application Support/Zed/extensions/installed/peony` にソースへのシンボリックリンクを作るだけで、Zed が監視しているのは `installed/` なので、リンク先の変更を検知しない（`crates/extension_host/src/extension_host.rs`）。
   - Extensions ページの「Rebuild」ボタンでも同じ。キーに割り当てる例: `["zed::RebuildDevExtension", { "extension_id": "peony" }]`
4. テーマセレクター（`cmd-k cmd-t`）で上下キーを押すと、その場で見た目が切り替わる。見比べるときに便利。
5. 反映されないときは `zed: open log` でパースエラーを確認する。

初めて読み込むときは、コマンドパレットで `zed: install dev extension` を実行し、このリポジトリを選ぶ。

### 色の調整の進め方（比較用テーマ）

今のテーマをベースラインにして、一部を変えた案と見比べてから決める。

1. `src/variants.ts` の `experiments` に案を書く（`palette` の複製を書き換える関数）。
2. `bun run variants` を実行する。`themes/peony-variants.json` に「Peony Dusk [案の名前]」などのテーマができる。ベースラインから何色変わったか、平均の色差（OKLab の ΔE ×100）、主な色の変化も表示する。このファイルは git の管理外。
3. `zed: rebuild dev extension` を実行し、テーマセレクターで無印の Peony Dusk / Dawn と見比べる。
4. 決まったら `src/palette.ts` に反映し、`experiments` を空にして `bun run build` と `bun run variants` を実行する（案が空なら比較用テーマのファイルは消える）。

目安: OKLab の ΔE で 2 未満の差は、1色だけでは見分けにくい（CSS Color 4 が見分けられる最小の差として使う値）。

## 色の決め方（`src/palette.ts`）

Dusk と Dawn の色を同じ規則から作るので、Dusk の色を変えれば Dawn も同じ規則で変わる。

- **文字の色** = 役割の色相 H と彩度 C（OKLCH）× 段階（コントラストの目標値）。
  - 明度 L は、エディタの背景とのコントラストが段階の目標値になるように自動で計算する。目標値は APCA の Lc で、今の Dusk の平均から決めた。
  - Dawn の彩度は Dusk の 1.5 倍（上限 0.165）。sRGB に収まらないときは L と H を保ったまま彩度を下げる（`bun run build` が一覧を出す）。
  - 段階ごとに WCAG 2 の最低ライン（floor）があり、届かないときはさらに背景から離す。明るい背景では APCA の中間の値が WCAG 2 では低く出るため、Dawn では主要の段階より下は実際には floor で決まる。floor を段階ごとにずらしているのは、段階の差が潰れないようにするため。
  - ターミナルの bright / dim は、通常色の目標値に 1.15 倍 / 0.6 倍をかける（Dawn では bright のほうが暗くなる）。
- **背景と枠線** = エディタの背景からの明度の差。タイトルバー < パネル < エディタ < ポップアップは両テーマで同じ向き、hover や枠線は文字に近づく向き（Dusk は明るく、Dawn は暗く）にずらす。
- **半透明の色**（選択範囲、検索結果など）= 文字や背景の色にアルファを付けたもの。Dawn はアルファを 0.8 倍にする。
- `tab.active_background` と `editor.gutter.background` は、エディタの背景と同じ色にする（縞模様に見えないように）。

### ブラー版

- 色を乗せるのは `background` の1層だけ。エディタ、ツールバー、アクティブなタブ、ターミナル、スクロールバーのトラックは透明にする（半透明を何層も重ねると濃さがまばらになるため）。パネルやタブバーは低いアルファで重ねて階層を出す。
- 不透明度は Dusk と Dawn で共通の 94%（`blur.opacity`）。実機で見比べて決めた。
- タイトルバーとステータスバーは、不透明度を `background` と自動で揃える（下の「`background` の範囲」のため）。
- 文字色の最低ラインは、半透明の `background` を黒い壁紙と白い壁紙のそれぞれに重ねた色で確かめ、足りなければ自動で最小限だけ濃く（Dusk では明るく）する。

### 視認性の基準（`src/check.ts`）

- 本文、シンタックス、ターミナルの色: WCAG 2 で 4.5:1 以上
- comment、行番号、predictive、hint、`bright_black`: 3:1 以上
- ブラー版は、黒い壁紙と白い壁紙に重ねたときの悪いほうで判定する。

## Zed の仕様について調べて分かったこと

| 事項                     | 内容                                                                                                                                                                                                    | 根拠                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| テーマのスキーマ         | `https://zed.dev/schema/themes/v0.2.0.json`                                                                                                                                                             | 公式ドキュメント                                      |
| キーの一覧               | 公式テーマ One（`assets/themes/one/one.json`）のキーをすべて定義している                                                                                                                                | `check.ts` でキーの差分を確認                         |
| スキーマにない新しいキー | `version_control.*`、`search.active_match_background`、`editor.hover_line_number` などは v0.2.0 に載っていない。ただし One も使っており、スキーマは `additionalProperties` を禁止していないので消さない | schema.json                                           |
| 色の書き方               | `#rrggbb`（6桁）と `#rrggbbaa`（8桁）の両方が使える                                                                                                                                                     | `crates/gpui/src/color.rs`                            |
| `font_weight`            | 100〜900 の100刻みのみ                                                                                                                                                                                  | スキーマ                                              |
| ぼかし                   | style に `"background.appearance": "blurred"`（`opaque` / `transparent` / `blurred`）                                                                                                                   | スキーマ                                              |
| `background` の範囲      | `background` が塗られるのは `id("workspace")` の要素だけ。タイトルバーとステータスバーはその外側の別の要素なので、`background` の透け具合が効かない                                                     | `crates/workspace/src/workspace.rs`                   |
| タイトルバーの色         | macOS では常に `title_bar.background`。`title_bar.inactive_background` が使われるのは Linux / FreeBSD だけ                                                                                              | `crates/platform_title_bar/src/platform_title_bar.rs` |
| 既存テーマの部分上書き   | settings.json のトップレベルにある `theme_overrides`（テーマ名をキーにする）。`experimental.` は付かない                                                                                                | 公式ドキュメント                                      |

## 公開するときの注意

`extension.toml` の `authors` にメールアドレスが入っている。`repository` はコメントアウト中。ストアで公開すると、どちらも公開される。
