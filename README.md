# Petamori Themes

Petamoriのエディタ用テーマのセット。配色（`src/palettes/`）と色の計算（`src/engine/`）はエディタに依存せず、エディタごとの対応付けと書き出しを`src/targets/<エディタ>/`に置く。

| エディタ | 拡張機能のディレクトリ | 備考                                                                                                                                        |
| -------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Zed      | `zed/`                 | エクステンション形式（`extension.toml` + `themes/*.json`）。idは`petamori-themes`                                                           |
| VS Code  | `vscode/`              | カラーテーマの拡張機能（`package.json` + `themes/*-color-theme.json`）。ブラー版はない（VS Codeにウィンドウを透過させる機能がないため）     |
| iTerm2   | `iterm2/`              | カラープリセット（`*.itermcolors`）。ターミナルの色だけ。ブラー版はない（透過とぼかしはプロファイルの設定で、プリセットには含まれないため） |

## 収録しているテーマ

どのテーマも、Dusk（dark）、Dawn（light）がある。Zed版には、それぞれのBlur（ぼかし）もある。iTerm2版には、DuskとDawnを1つにまとめ、macOSの外観に合わせて切り替わるプリセットもある。

| テーマ  | 配色                                                                                                                             | ファイル                  |
| ------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Peony   | 落ち着いたピンクが軸。視認性を優先し、関数・型・文字列などは別の色相に振り分けている                                             | `src/palettes/peony.ts`   |
| Fuchsia | ほぼ黒・ほぼ白の無彩色のキャンバスに、鮮やかなホットピンクが主役。ほかの色は文字列のミント以外を控えめにして、ピンクを際立たせる | `src/palettes/fuchsia.ts` |
| Berry   | キャンバスそのものをピンクにする（Duskは深いベリー色、Dawnは桜色の紙）。ピンクに近い暖色とラベンダーでまとめ、文字列だけミント   | `src/palettes/berry.ts`   |

## 構成

```
LICENSE
zed/                    # Zedの拡張機能。登録ではpath = "zed"。拡張機能に必要なものだけを置く
  extension.toml
  LICENSE               # ../LICENSEへのシンボリックリンク（Zedの規則で、拡張機能のディレクトリに必要）
  themes/               # 生成されるファイル。直接編集しない
    <id>.json           # Dusk / Dawn（例: peony.json）
    <id>-blur.json      # Dusk Blur / Dawn Blur（例: peony-blur.json）
vscode/                 # VS Codeの拡張機能
  package.json          # 生成されるファイル。直接編集しない（元はsrc/targets/vscode/extension.tsのMANIFEST）
  README.md             # Marketplaceのページになる（英語）
  LICENSE               # ../LICENSEへのシンボリックリンク
  .vscodeignore
  themes/               # 生成されるファイル。直接編集しない
    <テーマ名>-color-theme.json  # 例: peony-dusk-color-theme.json
iterm2/                 # iTerm2のカラープリセット。生成されるファイル。直接編集しない
  <テーマ名>.itermcolors      # Dusk / Dawnそれぞれ（例: Peony Dusk.itermcolors）。ファイル名がプリセットの名前になる
  <ファミリー名>.itermcolors  # DuskとDawnの両方を持つ（例: Peony.itermcolors）
src/
  palettes/             # 配色（エディタに依存しない）
    index.ts            # 含めるテーマの一覧
    peony.ts            # 各テーマの配色。色を変えるときはここを編集する
    fuchsia.ts
    berry.ts
  engine/               # 色の計算（エディタに依存しない）
    palette.ts          # 配色の型（役割、段階など）と規則の説明
    resolve.ts          # 配色から、テーマ1つ分の具体的な色（文字、背景の段差、半透明、ANSI）を計算する
    contrast.ts         # コントラストの総当たり検査の共通部分
    color.ts            # OKLCH、APCA、WCAG 2、半透明色の合成、明度の計算
  targets/
    zed/                # Zed向け
      theme.ts          # 計算した色を、Zedのキーに割り当てる
      blur.ts           # ブラー版の組み立て
      family.ts         # ダーク・ライトとブラー版をまとめて組み立て、JSONに書き出す
      contrast.ts       # Zedのキーの分類の規則（検査用）
    vscode/             # VS Code向け
      theme.ts          # 計算した色を、VS CodeのUIの色・TextMateのスコープ・セマンティックトークンに割り当てる
      extension.ts      # テーマのファイルとpackage.jsonを書き出す
      contrast.ts       # VS Codeのキーの分類の規則（検査用）
    iterm2/             # iTerm2向け
      theme.ts          # 計算した色を、iTerm2のプロファイルの色のキーに割り当てる
      preset.ts         # .itermcolors（plist）の書き出しと読み込み
      contrast.ts       # iTerm2のキーの分類の規則（検査用）
  build.ts              # bun run build
  check.ts              # bun run check:theme
  variants.ts           # bun run variants
```

今の配色の型（`src/engine/palette.ts`）には、Zed専用の設定（ブラー版の重ね方。Zedのキー名で書かれている）が含まれている。ほかのエディタに対応するときに、エディタ別の設定として切り離す。

## 使い方

```bash
bun install
bun run build           # 登録したテーマを、Zed版（zed/themes/）、VS Code版（vscode/themes/、vscode/package.json）、iTerm2版（iterm2/）に書き出す
bun run check:theme     # コントラストの総当たり検査（Zed版、VS Code版、iTerm2版。Oneとのキーの差分は: bun run check:theme --one <one.json>）
bun run variants        # 比較用テーマを生成する（Zed版のみ。下の「色の調整の進め方」）
bun run package:vscode  # VS Code版を生成して、vscode/petamori-themes-<version>.vsixを作る
```

### VS Code版を手元で試す

- `.vsix`を入れる: `bun run package:vscode`のあと、`code --install-extension vscode/petamori-themes-0.1.0.vsix`を実行するか、VS Codeのコマンドパレットで「Extensions: Install from VSIX...」を選ぶ。色を変えたら作り直して、もう一度入れる。
- 開発用のウィンドウで開く: `code --extensionDevelopmentPath="$PWD/vscode"`。インストールせずに試せる。色を変えたら`bun run build`のあと、開発用のウィンドウで「Developer: Reload Window」を実行する。
- テーマの切り替え: コマンドパレットの「Preferences: Color Theme」（`cmd-k cmd-t`）で、上下キーで見比べられる。

### iTerm2版を使う

- 取り込む: Settings → Profiles → Colorsの「Color Presets...」→「Import...」で、`iterm2/`の`.itermcolors`を選ぶ。Finderでファイルをダブルクリックしても取り込める。ファイル名（拡張子を除く）がプリセットの名前になる。
- 当てる: 同じ「Color Presets...」の一覧から選ぶ。
  - `Peony Dusk`など: 1つのモードだけのプリセット。
  - `Peony`など（ファミリー名）: DuskとDawnの両方を持つプリセット。「Use separate colors for light and dark mode」がオフのプロファイルで選ぶと、両方のモードの色が入ってこの設定がオンになり、macOSの外観に合わせてDusk（ダーク）とDawn（ライト）が切り替わる。すでにオンなら、両方を更新するか（Update Both Modes）を聞かれる。
- 色を変えたら: `bun run build`のあと、「Color Presets...」→「Delete Preset...」で古いプリセットを消してから取り込み直し、プリセットを選び直す。消さずに取り込むと、上書きされずに`Peony Dusk (2)`のような別の名前で増える。
- 透過やぼかしは、Settings → Profiles → Windowの「Transparency」と「Blur」で設定する（プリセットには含まれない）。

## テーマを増やすとき

1. `src/palettes/<名前>.ts`を作る。`peony.ts`と同じく`ThemeSet`（id、ファミリー名、ダーク・ライトのテーマ名、配色）を定義する。
2. `src/palettes/index.ts`の`themeSets`に足す。
3. `bun run build`を実行すると、Zed版（`zed/themes/<id>.json`、`zed/themes/<id>-blur.json`）、VS Code版（`vscode/themes/`、`vscode/package.json`の`contributes.themes`）、iTerm2版（`iterm2/<テーマ名>.itermcolors`、`iterm2/<ファミリー名>.itermcolors`）ができる。
4. `zed/extension.toml`と、`src/targets/vscode/extension.ts`の`MANIFEST.version`を上げる（例: 0.1.0 → 0.2.0）。

どのキーにどの役割・段階を使うか（`src/targets/<エディタ>/theme.ts`）は、すべてのテーマで共通。テーマごとに変えるのは、役割ごとの色相と彩度、段階の目標値、背景の明度などの値だけ。

## 開発ループ

1. `src/palettes/<名前>.ts`を編集する。
2. `bun run build`を実行する。
3. **Zedで`zed: rebuild dev extension`を実行すると反映される**。
   - **保存しただけでは反映されない**。dev extensionは`~/Library/Application Support/Zed/extensions/installed/<id>`にソースへのシンボリックリンクを作るだけで、Zedが監視しているのは`installed/`なので、リンク先の変更を検知しない（`crates/extension_host/src/extension_host.rs`）。
   - Extensionsページの「Rebuild」ボタンでも同じ。キーに割り当てる例: `["zed::RebuildDevExtension", { "extension_id": "petamori-themes" }]`
4. テーマセレクター（`cmd-k cmd-t`）で上下キーを押すと、その場で見た目が切り替わる。見比べるときに便利。
5. 反映されないときは`zed: open log`でパースエラーを確認する。

初めて読み込むときは、コマンドパレットで`zed: install dev extension`を実行し、このリポジトリの`zed/`ディレクトリを選ぶ。

### 色の調整の進め方（比較用テーマ）

今のテーマをベースラインにして、一部を変えた案と見比べてから決める。

1. `src/variants.ts`の`SET`に対象のテーマのidを、`experiments`に案を書く（配色の複製を書き換える関数）。ブラー版で試すときは`targets: ["blur"]`を付ける。
2. `bun run variants`を実行する。`zed/themes/<id>-variants.json`に「Peony Dusk [案の名前]」などのテーマができる。ベースラインから何色変わったか、平均の色差（OKLabのΔE ×100）、主な色の変化も表示する。このファイルはgitの管理外。
3. `zed: rebuild dev extension`を実行し、テーマセレクターで無印のテーマと見比べる。
4. 決まったら`src/palettes/<id>.ts`に反映し、`experiments`を空にして`bun run build`と`bun run variants`を実行する（案が空なら比較用テーマのファイルは消える）。

目安: OKLabのΔEで2未満の差は、1色だけでは見分けにくい（CSS Color 4が見分けられる最小の差として使う値）。

## 色の決め方

ダークとライトの色を同じ規則から作るので、片方の色を変えればもう片方も同じ規則で変わる。

- **文字の色** = 役割の色相Hと彩度C（OKLCH）× 段階（コントラストの目標値）。
  - 明度Lは、エディタの背景とのコントラストが段階の目標値になるように自動で計算する。目標値はAPCAのLc（PeonyではDuskの平均から決めた）。
  - ライトの彩度はダークの`lightChromaScale`倍（上限`lightChromaMax`）。sRGBに収まらないときはLとHを保ったまま彩度を下げる（`bun run build`が一覧を出す）。
  - 段階ごとにWCAG 2の最低ライン（floor）があり、届かないときはさらに背景から離す。明るい背景ではAPCAの中間の値がWCAG 2では低く出るため、ライトでは主要の段階より下は実際にはfloorで決まる。floorを段階ごとにずらしているのは、段階の差が潰れないようにするため。
  - 文字の色は、乗る可能性のあるすべての背景の上で最低ラインを満たすように計算する（`src/engine/resolve.ts`）。エディタの背景では段階のfloorを、その上に重なる背景ではWCAG 2の最低ライン（本文や記号は4.5:1、コメントなど控えめな文字は3:1、無効な要素は2.5:1）を満たす。
    - コードの文字（`inks`）: エディタの背景と現在行のハイライト
    - UIの文字（`ui`）: 上に加えて、タイトルバー・パネル・ポップアップ・入力欄・hover・選択の背景（ライトではこれらがエディタより暗いので、UIの控えめな文字はコードの同じ段階の文字より少し濃くなる）
    - ターミナルの文字: エディタの背景だけ
    - 一時的なハイライト（検索結果、選択範囲、差分など）は計算に含めず、検査で確かめる
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

### 視認性の検査（`bun run check:theme`）

テーマのすべての色のキーを、規則（`src/targets/<エディタ>/contrast.ts`）で次のどれかに分類し、「文字の種類 × その文字が乗りうる背景の種類」の組み合わせを総当たりで測る。

- **文字**（最低ラインつき）: コードの文字、ガターの文字（行番号など）、UIの文字、ターミナルの文字
- **背景**: エディタの背景、エディタに常に重なる背景（現在行など）、UIの背景、一時的なハイライト
- **対象外**（理由つき）: 枠線、ガイド、カーソル、スクロールバーなど

| 文字の種類       | 測る背景                                       |
| ---------------- | ---------------------------------------------- |
| コードの文字     | エディタの背景、現在行など、一時的なハイライト |
| ガターの文字     | エディタの背景、現在行など                     |
| UIの文字         | エディタの背景、現在行など、UIの背景           |
| ターミナルの文字 | エディタの背景                                 |

- 最低ライン: 本文や記号は4.5:1、コメント・行番号・プレースホルダーなど控えめな文字は3:1、アイコン（文字ではない）は3:1、無効な要素は2.5:1。
- 一時的なハイライトの上では、本文と同じ段階の文字に3:1を求める（ハイライトの上の文字について規格の定めはないため。控えめな文字は、エディタの背景の上でちょうど3:1になるように作っているので、ハイライトが重なれば必ず下回る。これは測らない）。
- VS Codeで、アクセントの色で塗りつぶす背景（ボタン、バッジなど）は、上に乗る文字が決まっているので1対1で測る。
- iTerm2では、上に乗る文字が決まっている背景を1対1で測る。選択範囲（Selected Text ColorとSelection Color）、カーソル（Cursor Text ColorとCursor Color）、検索の一致箇所（Match Background Colorと、iTerm2がその明るさから選ぶ白か黒の文字）。
- iTerm2の選択範囲（「Use Selected Text Color」をオフにしたとき）とカーソルのある行の帯（Cursor Guide Color。既定ではオフ）は一時的なハイライトとして扱い、本文と同じ段階のターミナルの文字に3:1を求める。ターミナルの文字はエディタの背景だけを基準に計算しているので、ライトでは帯の上で4.5:1を下回る（赤は4.1:1前後、bright blackは2.7:1前後）。
- ブラー版は、半透明の背景を黒い壁紙と白い壁紙に重ねたときの悪いほうで判定する。
- **分類されていないキーがあれば、検査は失敗する**。テーマに新しいキーを足したら、分類の規則にも足す。
- コミットするときに、pre-commitのフック（`prek.toml`の`check-theme`）がこの検査を自動で実行する。`src/`、`zed/themes/`、`vscode/themes/`、`iterm2/`のどれかが変わったときに動き、失敗するとコミットできない。
- その前に、生成し忘れの検査（`check-generated`、`bun run check:generated`）も動く。テーマを生成し直して、結果がコミットする内容と違えば失敗する（配色を変えたのに`bun run build`を忘れた場合など）。生成し直したファイルは作業ツリーに残るので、確認して`git add`してからコミットし直す。

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

## iTerm2の仕様について調べて分かったこと

iTerm2 3.7.7の同梱プリセット（`/Applications/iTerm.app/Contents/Resources/ColorPresets.plist`）と、`gnachman/iTerm2`のソースで確かめた。

| 事項                       | 内容                                                                                                                                                                                                       | 根拠                                                                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| プリセットの名前           | 取り込んだファイルの名前から拡張子を除いたもの                                                                                                                                                             | `sources/Settings/iTermColorPresets.m`（`presetNameFromFilename`）                                                                        |
| 同じ名前で取り込む         | 上書きされず、`<名前> (2)`のように番号が付く。中身がまったく同じなら、追加するかを聞かれる                                                                                                                 | `iTermColorPresets.m`（`addColorPreset:withColors:`）                                                                                     |
| キーの一覧                 | Ansi 0〜15、Foreground、Background、Bold、Link、Match Background、Selection、Selected Text、Cursor、Cursor Text、Tab、Underline、Cursor Guide、Badge（それぞれ末尾に` Color`）。TabとUnderlineは省略できる | `iTermColorPresets.m`（`colorKeysWithModes:`）                                                                                            |
| 色の書き方                 | 辞書に`Red` / `Green` / `Blue` / `Alpha Component`（0〜1）と`Color Space`（`sRGB`）。同梱のプリセットでアルファが1でないのはCursor Guide（0.25）とBadge（0.5）だけ                                         | `ColorPresets.plist`                                                                                                                      |
| ライト・ダークの両方       | キーの末尾に` (Light)` / ` (Dark)`を付けたものを持つと、両方のモードを持つプリセットになる（Foreground Color (Light)があるかで判定）。末尾のないキーは、同梱のSolarizedではダークの色                      | `iTermColorPresets.m`（`iTermColorPresetHasModes`）、`ColorPresets.plist`                                                                 |
| 両方を持つプリセットを選ぶ | 「Use separate colors for light and dark mode」がオフなら、両方のモードの色を入れてオンにする。オンなら、両方を更新するかを聞く                                                                            | `sources/Settings/ProfilesColorsPreferencesViewController.m`                                                                              |
| dimの色                    | キーがない（iTerm2が計算する）                                                                                                                                                                             | `colorKeysWithModes:`                                                                                                                     |
| 検索の一致箇所の文字       | 文字の色を使わず、Match Background Colorが暗ければ白、明るければ黒で描く（暗さは0.30R + 0.59G + 0.11B < 0.5）                                                                                              | `sources/Drawing/iTermTextDrawingHelper.m`（`iTermTextDrawingHelperTextColorForMatch`）、`sources/Categories/NSColor+iTerm.m`（`isDark`） |
| 既定でオンの設定           | Use Selected Text Color（選択中の文字をSelected Text Colorで描く）、Use Bright Bold（太字をBold Colorで描く）。Use Cursor Guideは既定でオフ。Match Background Colorの既定は黄色                            | `sources/Settings/iTermProfilePreferences.m`                                                                                              |

選択範囲と検索の一致箇所は、同梱のプリセットにならってアルファを1にし、半透明の色をエディタの背景に重ねた不透明の色で書き出している（iTerm2がこの2つのアルファをどう扱うかは確かめていない）。

## ライセンス

MIT（`LICENSE`）。

## Zedで公開するときの注意

- リポジトリは<https://github.com/petamorikei/petamori-themes>。`zed/extension.toml`の`repository`に書いてあり、Extensionsページでリポジトリへのリンクとして表示される。
- `zed/extension.toml`の`authors`にメールアドレスが入っている。公開すると表示される。
- 公開したあとは、エクステンションidは変えられない。
- 登録の手順: `zed-industries/extensions`をforkし、このリポジトリを`extensions/petamori-themes`にsubmoduleとして追加して、`extensions.toml`に`[petamori-themes]`（`submodule`、`path = "zed"`、`version`）を足してPRを出す。詳しくはZedの公式ドキュメント（Publishing Extensions）を参照。
- ライセンスは、拡張機能のディレクトリ（`zed/`）にある必要がある（リポジトリ直下だけでは認められない）。`zed/LICENSE`は直下の`LICENSE`へのシンボリックリンクで、公式ドキュメントでもこの方法が認められている。
