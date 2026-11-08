# Petamori Themes

PetamoriのZed用テーマのセット。Zedのエクステンション形式（`extension.toml` + `themes/*.json`）で、エクステンションidは`petamori-themes`。

## 収録しているテーマ

どのテーマも、Dusk（dark）、Dawn（light）と、それぞれのBlur（ぼかし）の4つがある。

| テーマ  | 配色                                                                                                                             | ファイル                  |
| ------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Peony   | 落ち着いたピンクが軸。視認性を優先し、関数・型・文字列などは別の色相に振り分けている                                             | `src/palettes/peony.ts`   |
| Fuchsia | ほぼ黒・ほぼ白の無彩色のキャンバスに、鮮やかなホットピンクが主役。ほかの色は文字列のミント以外を控えめにして、ピンクを際立たせる | `src/palettes/fuchsia.ts` |
| Berry   | キャンバスそのものをピンクにする（Duskは深いベリー色、Dawnは桜色の紙）。ピンクに近い暖色とラベンダーでまとめ、文字列だけミント   | `src/palettes/berry.ts`   |

## 構成

```
extension.toml
themes/                 # 生成されるファイル。直接編集しない
  <id>.json             # Dusk / Dawn（例: peony.json）
  <id>-blur.json        # Dusk Blur / Dawn Blur（例: peony-blur.json）
src/
  palettes/
    index.ts            # 拡張機能に含めるテーマの一覧
    peony.ts            # 各テーマの配色。色を変えるときはここを編集する
    fuchsia.ts
    berry.ts
  engine/               # テーマに依存しない部分
    palette.ts          # 配色の型（役割、段階など）と規則の説明
    theme.ts            # 配色から、テーマ1つ分のstyleを組み立てる（どのキーにどの役割を使うか）
    blur.ts             # ブラー版の組み立て
    family.ts           # ダーク・ライトとブラー版をまとめて組み立て、JSONに書き出す
    color.ts            # OKLCH、APCA、WCAG 2、半透明色の合成、明度の計算
  build.ts              # bun run build
  check.ts              # bun run check:theme
  variants.ts           # bun run variants
```

## 使い方

```bash
bun install
bun run build         # 登録したテーマをthemes/<id>.jsonとthemes/<id>-blur.jsonに書き出す（biomeで整形まで行う）
bun run check:theme   # コントラストの検査（Oneとのキーの差分は: bun src/check.ts themes/peony.json <one.json>）
bun run variants      # 比較用テーマを生成する（下の「色の調整の進め方」）
```

## テーマを増やすとき

1. `src/palettes/<名前>.ts`を作る。`peony.ts`と同じく`ThemeSet`（id、ファミリー名、ダーク・ライトのテーマ名、配色）を定義する。
2. `src/palettes/index.ts`の`themeSets`に足す。
3. `bun run build`を実行すると、`themes/<id>.json`と`themes/<id>-blur.json`ができる。
4. `extension.toml`の`version`を上げる（例: 0.1.0 → 0.2.0）。

どのキーにどの役割・段階を使うか（`src/engine/theme.ts`）は、すべてのテーマで共通。テーマごとに変えるのは、役割ごとの色相と彩度、段階の目標値、背景の明度などの値だけ。

## 開発ループ

1. `src/palettes/<名前>.ts`を編集する。
2. `bun run build`を実行する。
3. **Zedで`zed: rebuild dev extension`を実行すると反映される**。
   - **保存しただけでは反映されない**。dev extensionは`~/Library/Application Support/Zed/extensions/installed/<id>`にソースへのシンボリックリンクを作るだけで、Zedが監視しているのは`installed/`なので、リンク先の変更を検知しない（`crates/extension_host/src/extension_host.rs`）。
   - Extensionsページの「Rebuild」ボタンでも同じ。キーに割り当てる例: `["zed::RebuildDevExtension", { "extension_id": "petamori-themes" }]`
4. テーマセレクター（`cmd-k cmd-t`）で上下キーを押すと、その場で見た目が切り替わる。見比べるときに便利。
5. 反映されないときは`zed: open log`でパースエラーを確認する。

初めて読み込むときは、コマンドパレットで`zed: install dev extension`を実行し、このリポジトリを選ぶ。

### 色の調整の進め方（比較用テーマ）

今のテーマをベースラインにして、一部を変えた案と見比べてから決める。

1. `src/variants.ts`の`SET`に対象のテーマのidを、`experiments`に案を書く（配色の複製を書き換える関数）。ブラー版で試すときは`targets: ["blur"]`を付ける。
2. `bun run variants`を実行する。`themes/<id>-variants.json`に「Peony Dusk [案の名前]」などのテーマができる。ベースラインから何色変わったか、平均の色差（OKLabのΔE ×100）、主な色の変化も表示する。このファイルはgitの管理外。
3. `zed: rebuild dev extension`を実行し、テーマセレクターで無印のテーマと見比べる。
4. 決まったら`src/palettes/<id>.ts`に反映し、`experiments`を空にして`bun run build`と`bun run variants`を実行する（案が空なら比較用テーマのファイルは消える）。

目安: OKLabのΔEで2未満の差は、1色だけでは見分けにくい（CSS Color 4が見分けられる最小の差として使う値）。

## 色の決め方

ダークとライトの色を同じ規則から作るので、片方の色を変えればもう片方も同じ規則で変わる。

- **文字の色** = 役割の色相Hと彩度C（OKLCH）× 段階（コントラストの目標値）。
  - 明度Lは、エディタの背景とのコントラストが段階の目標値になるように自動で計算する。目標値はAPCAのLc（PeonyではDuskの平均から決めた）。
  - ライトの彩度はダークの`lightChromaScale`倍（上限`lightChromaMax`）。sRGBに収まらないときはLとHを保ったまま彩度を下げる（`bun run build`が一覧を出す）。
  - 段階ごとにWCAG 2の最低ライン（floor）があり、届かないときはさらに背景から離す。明るい背景ではAPCAの中間の値がWCAG 2では低く出るため、ライトでは主要の段階より下は実際にはfloorで決まる。floorを段階ごとにずらしているのは、段階の差が潰れないようにするため。
  - ターミナルのbright / dimは、通常色の目標値に`terminal.brightScale` / `dimScale`倍をかける（ライトではbrightのほうが暗くなる）。
- **背景と枠線** = エディタの背景からの明度の差。タイトルバー < パネル < エディタ < ポップアップは両テーマで同じ向き、hoverや枠線は文字に近づく向き（ダークは明るく、ライトは暗く）にずらす。
- **半透明の色**（選択範囲、検索結果など）= 文字や背景の色にアルファを付けたもの。ライトはアルファを`lightOverlayScale`倍にする。
- `tab.active_background`と`editor.gutter.background`は、エディタの背景と同じ色にする（縞模様に見えないように）。

### ブラー版

- 色を乗せるのは`background`の1層だけ。エディタ、ツールバー、ターミナル、スクロールバーのトラックは透明にする（半透明を何層も重ねると濃さがまばらになるため）。タブバーなどは低いアルファで重ねて階層を出す。
- 次のものは、半透明にすると表示が崩れるので、透明か不透明のどちらかにする（下の「Zedの仕様」を参照）。
  - パネルの背景（`panel.background`）: 透明
  - アクティブなタブ（`tab.active_background`）とスティッキースクロールの行（`panel.overlay_background`）: エディタと同じ色の不透明
  - hover・押下中・選択（`element.*`、`ghost_element.*`）: 不透明
- 不透明度は`blur.opacity`（PeonyはDuskとDawnで共通の94%。実機で見比べて決めた）。
- タイトルバーとステータスバーは、不透明度を`background`と自動で揃える（下の「`background`の範囲」のため）。
- 文字色の最低ラインは、半透明の`background`を黒い壁紙と白い壁紙のそれぞれに重ねた色で確かめ、足りなければ自動で最小限だけ背景から離す。

### 視認性の基準（`src/check.ts`）

- 本文、シンタックス、ターミナルの色: WCAG 2で4.5:1以上
- comment、行番号、predictive、hint、`bright_black`: 3:1以上
- ブラー版は、黒い壁紙と白い壁紙に重ねたときの悪いほうで判定する。

## Zedの仕様について調べて分かったこと

| 事項                       | 内容                                                                                                                                                                                             | 根拠                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| テーマのスキーマ           | `https://zed.dev/schema/themes/v0.2.0.json`                                                                                                                                                      | 公式ドキュメント                                      |
| キーの一覧                 | 公式テーマOne（`assets/themes/one/one.json`）のキーをすべて定義している                                                                                                                          | `check.ts`でキーの差分を確認                          |
| スキーマにない新しいキー   | `version_control.*`、`search.active_match_background`、`editor.hover_line_number`などはv0.2.0に載っていない。ただしOneも使っており、スキーマは`additionalProperties`を禁止していないので消さない | schema.json                                           |
| 色の書き方                 | `#rrggbb`（6桁）と`#rrggbbaa`（8桁）の両方が使える                                                                                                                                               | `crates/gpui/src/color.rs`                            |
| `font_weight`              | 100〜900の100刻みのみ                                                                                                                                                                            | スキーマ                                              |
| ぼかし                     | styleに`"background.appearance": "blurred"`（`opaque` / `transparent` / `blurred`）                                                                                                              | スキーマ                                              |
| `background`の範囲         | `background`が塗られるのは`id("workspace")`の要素だけ。タイトルバーとステータスバーはその外側の別の要素なので、`background`の透け具合が効かない                                                  | `crates/workspace/src/workspace.rs`                   |
| タイトルバーの色           | macOSでは常に`title_bar.background`。`title_bar.inactive_background`が使われるのはLinux / FreeBSDだけ                                                                                            | `crates/platform_title_bar/src/platform_title_bar.rs` |
| 枠線の描き方               | 枠線は背景の上に重ねて描かれる。背景と同じ半透明の色で枠線を描くと、枠線の部分だけ濃くなる                                                                                                       | `crates/gpui_apple/src/shaders.metal`                 |
| ファイルツリーの行         | 各行は背景と同じ色の枠線を持つ（通常は`panel.background`、hoverは`element.hover`、選択は`element.selected`）。アウトラインパネルのhoverも同じ                                                    | `crates/project_panel/src/project_panel.rs`           |
| タブバー                   | すべてのタブの下に全幅の枠線が1本ある。アクティブなタブは下の枠線を持たず、自分の背景でこの線を覆い隠す                                                                                          | `crates/ui/src/components/tab_bar.rs`、`tab.rs`       |
| スティッキースクロールの行 | `panel.overlay_background` / `panel.overlay_hover`。省略すると、`panel.background`を不透明にした色が使われる                                                                                     | `crates/theme_settings/src/schema.rs`                 |
| 既存テーマの部分上書き     | settings.jsonのトップレベルにある`theme_overrides`（テーマ名をキーにする）。`experimental.`は付かない                                                                                            | 公式ドキュメント                                      |

## ライセンス

MIT（`LICENSE`）。

## 公開するときの注意

- **残っている作業**: GitHubにpushしてリポジトリのURLが決まったら、`extension.toml`の`repository`に書く（今はコメントアウト中）。Extensionsページで、リポジトリへのリンクとして表示される。
- `extension.toml`の`authors`にメールアドレスが入っている。公開すると表示される。
- 公開したあとは、エクステンションidは変えられない。
- 登録の手順: `zed-industries/extensions`をforkし、このリポジトリを`extensions/petamori-themes`にsubmoduleとして追加して、`extensions.toml`に`[petamori-themes]`（`submodule`と`version`）を足してPRを出す。詳しくはZedの公式ドキュメント（Publishing Extensions）を参照。
