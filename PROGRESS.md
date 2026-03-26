# DeliEasy リデザイン — 進捗管理

> 設計書: [REDESIGN-PLAN.md](./REDESIGN-PLAN.md)
> 開始日: 2026-03-25

---

## 全体進捗

| Phase | 名称 | ファイル数 | 状態 | 開始 | 完了 |
|-------|------|-----------|------|------|------|
| 0 | 設計 | 2 | ✅ 完了 | 03-25 | 03-25 |
| 1 | 基盤構築 | 12 | ✅ 完了 | - | - |
| 2 | テーマシステム | 3 | ✅ 完了 | - | - |
| 3 | ウィジェット+ホーム | 7 | ✅ 完了 | 03-25 | 03-25 |
| 4 | 4辺カスタム | 6 | ✅ 完了 | - | - |
| 5 | 入力オーバーレイ | 2 | ✅ 完了 | 03-25 | 03-25 |
| 6 | 機能オーバーレイ群 | 8 | ✅ 完了 | 03-25 | 03-25 |
| 7 | 統合・仕上げ | 5+ | ✅ 完了 | 03-25 | 03-26 |
| 8 | 旧CSS完全排除 | 6 | ✅ 完了 | 03-26 | 03-26 |
| 9 | v2.1 機能拡張 | 8 | ✅ 完了 | - | - |
| 10 | v2.2 Phase 10 | 8 | ✅ 完了 | 03-26 | 03-26 |

---

## Phase 1: 基盤構築

| ファイル | 状態 | メモ |
| index.html | ✅ | 新HTML構造 |
| js/utils.js | ✅ | fmt, escHtml, toast, hp等 |
| js/app.js | ✅ | initApp, テーマ適用 |
| js/sidebar.js | ✅ | 左サイドバー開閉 |
| js/overlay.js | ✅ | オーバーレイ開閉・スタック |
| js/fab.js | ✅ | FAB＋ミニメニュー |
| styles/base.css | ✅ | リセット・CSS変数基盤 |
| styles/components.css | ✅ | btn, fi, card等 |
| styles/sidebar.css | ✅ | |
| styles/overlay.css | ✅ | |
| styles/fab.css | ✅ | |
| styles/design-styles.css | ✅ | minimal + flat の2つだけ先に |
| styles/color-palettes.css | ✅ | blue-light + blue-dark の2つだけ先に |

**チェックリスト:**
- [x] ☰ → 左サイドバー開閉
- [x] メニュータップ → オーバーレイ開く（中身空OK）
- [x] ← → オーバーレイ閉じる
- [x] FAB表示 → タップでミニメニュー
- [x] minimal + flat のスタイル切替（テーマオーバーレイから）
- [x] blue-light + blue-dark のカラー切替（テーマオーバーレイから）
- [x] Firebase同期の互換性確保（openMo/closeMo/refreshSettingsModalIfOpen等のシム追加）

**Firebase互換性メモ:**
- `openMo('settings')` → `openOverlay('settings')` にマッピング
- `closeMo()` → `closeAllOverlays()` にマッピング
- `refreshSettingsModalIfOpen()` → settings overlayが開いていれば再描画
- `updateSyncStatusUI()` → `updateSyncIndicator()` にマッピング
- `escHtml`, `toast`, `customConfirm`, `hp` → utils.jsで提供
- `pfColor`, `extractPf`, `pfOpts`, `getAllPFs` → utils.jsで提供
- `foldCard`, `toggleFold` → utils.jsで提供（stats.jsが使用）

---

## Phase 2: テーマシステム

| ファイル | 状態 | メモ |
|---------|------|------|
| styles/design-styles.css | ✅ | 全10スタイル定義 |
| styles/color-palettes.css | ✅ | 全20パレット定義（ライト12+ダーク8） |
| js/overlay.js (_renderThemeOverlay) | ✅ | 2軸テーマ選択UI（グリッド+ドット） |

**チェックリスト:**
- [x] 10デザインスタイル全定義（minimal/flat/soft/cyber/pop/wabi/brutal/glass/classic/compact）
- [x] 20カラーパレット全定義（L01-L12 + D01-D08）
- [x] テーマ選択オーバーレイ動作
- [x] プレビュー表示（即時適用で確認）
- [x] 組み合わせ保存・復元（S.s/S.gで永続化済み）
- [x] --c-primary-rgb / --c-card-rgb 変数追加（glass/cyberスタイルで使用）

---

## Phase 3: ウィジェット + ホーム

| ファイル | 状態 | メモ |
|---------|------|------|
| js/widgets.js | ✅ | 全ウィジェット定義+描画 |
| js/presets.js | ✅ | CRUD + テンプレート |
| js/home.js | ✅ | ホーム描画 + 編集モード |
| styles/widgets.css | ✅ | ウィジェットスタイル |
| styles/presets.css | ✅ | プリセットバー |
| styles/home.css | ✅ | 編集モードアニメ |

**チェックリスト:**
- [x] デフォルトプリセット表示（🚴 稼働中）
- [x] ウィジェットにデータ反映
- [x] プリセットバー切替
- [x] 編集モード（追加/削除/サイズ変更）
- [x] テンプレートから作成（5種）
- [x] 長押しで編集モード
- [x] ウィジェットタップ → オーバーレイ
- [x] ドラッグで並び替え（タッチ）
- [x] ミニカレンダーウィジェット
- [x] PF別内訳ウィジェット
- [x] 連続稼働日数ウィジェット
- [x] 直近の記録ウィジェット
- [ ] ヒント表示（将来実装）

---

## Phase 4: 4辺カスタマイズ

| ファイル | 状態 | メモ |
|---------|------|------|
| js/topbar.js | ✅ | スロットカスタム（11オプション） |
| js/bottombar.js | ✅ | 有効化 + 5スロット |
| js/right-panel.js | ✅ | 情報パネル（9セクション） |
| styles/topbar.css | ✅ | |
| styles/bottombar.css | ✅ | |
| styles/right-panel.css | ✅ | |

**チェックリスト:**
- [x] トップバーカスタム動作
- [x] トップバー非表示可能（フローティングハンバーガーに切替）
- [x] ボトムバー有効化/無効化
- [x] ボトムバーアクション割当（5スロット × 11アクション）
- [x] 右パネル（右端スワイプで開く）
- [x] 右パネル内容カスタム（9セクション選択可能）
- [x] 右端のヒント表示（CSS アニメーション）
- [x] 設定がプリセットに保存

---

## Phase 5: 入力オーバーレイ

| ファイル | 状態 | メモ |
|---------|------|------|
| js/earn-input.js | ✅ | テンキー + 直接入力 + PF選択 + 日付 + 件数 + メモ |
| js/expense-input.js | ✅ | カテゴリ選択 + テンキー + 直接入力 + 日付 + メモ |

**チェックリスト:**
- [x] FAB → 売上入力 → 記録 → ホーム反映
- [x] FAB → 経費入力 → 記録 → ホーム反映
- [x] テンキー/直接入力切替
- [x] PF選択動作
- [x] 日付選択動作（今日/昨日/カレンダー）
- [x] 件数変更（+/-）
- [x] クイック金額ボタン
- [x] 記録後の一覧表示
- [x] 一覧からの削除
- [x] カテゴリ追加（経費）

---

## Phase 6: 機能オーバーレイ群

| ファイル | 状態 | メモ |
|---------|------|------|
| js/calendar-view.js | ✅ | calendar.js をオーバーレイ内にラップ (#pg1生成) |
| js/stats-view.js | ✅ | stats.js をオーバーレイ内にラップ (#pg2生成) + renderDashOverlay |
| js/tax-view.js | ✅ | tax.js をオーバーレイ内にラップ (#pg3生成) |
| js/expense-view.js | ✅ | expense.js をオーバーレイ内にラップ (#pg4生成) |
| js/pf-manage.js | ✅ | PF CRUD + 経費カテゴリ CRUD（タブ切替UI） |
| js/settings-view.js | ✅ | 同期・データ管理・JSONインポート・全削除・クラウド削除 |
| styles/calendar.css | ✅ | v2テーマ変数で動作 |
| styles/stats.css | ✅ | v2テーマ変数で動作 |

**追加変更:**
| ファイル | 変更内容 |
|---------|---------|
| index.html | Phase 6スクリプト+CSS追加、旧JSファイル(calendar/stats/expense/tax)のロード追加 |
| js/overlay.js | settingsケース削除（settings-view.jsに委譲）、フォールバック文言修正 |
| js/app.js | openEditEarn実装（売上編集ダイアログ）、openEditExpense互換、sumi-dark/midnight/charcoalテーマ判定追加 |

**チェックリスト:**
- [x] カレンダー表示 + 日別詳細（calendar.jsの全機能がオーバーレイ内で動作）
- [x] 統計表示 + 期間切替 + グラフ（stats.jsの全機能がオーバーレイ内で動作）
- [x] 税金計算動作（tax.jsの全機能がオーバーレイ内で動作）
- [x] 経費一覧 + 編集/削除（expense.jsの全機能がオーバーレイ内で動作）
- [x] PF追加/編集/色変更/有効無効切替/削除
- [x] 経費カテゴリ追加/名前変更/削除
- [x] 設定 → Firebase同期（ログイン/ログアウト/手動同期/ダウンロード）
- [x] 設定 → データ管理（バックアップ/CSV出力/JSONインポート/全削除/クラウド削除）
- [x] 売上編集ダイアログ（openEditEarn - calendar.js/stats.jsから呼び出し可能）
- [x] 経費編集ダイアログ（openEditExpense - expense.js内蔵版を利用）
- [x] openStatDetail → statsオーバーレイを開く（renderDashOverlay経由）

**設計メモ:**
- 既存の calendar.js / stats.js / expense.js / tax.js はPhase 8でv2 CSS変数に完全移行
- ラッパーパターン: オーバーレイbody内に仮の #pg1〜#pg4 を生成し、既存render関数を呼び出す

---

## Phase 7: 統合・仕上げ

| 作業 | 状態 | メモ |
|------|------|------|
| legacy-compat.css ダーク対応 | ✅ | ダークパレット用旧変数マッピング追加 |
| openEditExpense 修正 | ✅ | expense.jsの関数退避タイミング修正 |
| ダークテーマ判定統一 | ✅ | DARK_PALETTES配列で一元管理 |
| data-theme属性削除 | ✅ | main.cssの[data-theme]との競合防止 |
| calendar.cssダーク色 | ✅ | data-colorセレクタで金額レベル色を定義 |
| main.css二重リセット除去 | ✅ | base.cssに統一 |
| sw.js 更新 | ✅ | CACHE_NAME → delieasy-v6 |
| バージョン表記更新 | ✅ | settings-viewのバージョン文字列更新 |
| PROGRESS.md 更新 | ✅ | Phase 7完了を記録 |
| main.css → legacy-structures.css | ✅ | 旧テーマ変数/リセット/[data-theme]削除、構造クラスのみ残留 |
| sw.js キャッシュ名更新 | ✅ | CACHE_NAME → delieasy-v7 |

---

## Phase 8: 旧CSS完全排除（Legacy CSS Elimination）

> 旧JSファイル（calendar.js, stats.js, expense.js, tax.js）が参照していた
> 旧CSS変数（--p, --card, --apple-*等）と旧クラス名（.cd, .ch, .cb, .fi, .bp, .sg, .sb等）を
> v2 CSS変数（--c-primary, --c-card等）とv2クラス名に完全移行。
> legacy-structures.css と legacy-compat.css を削除。

| 作業 | 状態 | メモ |
|------|------|------|
| expense.js → v2 クラス移行 | ✅ | .cd→.card, .ch→.card-header, .cb→.card-body, .fi→.input, .fg→.input-group, .bp→.btn btn-primary, .bs2→.btn btn-secondary, .bsm→btn-sm, .bbl→btn-block, .s-btn→.pill 等 |
| tax.js → v2 クラス移行 | ✅ | 同上 + .sg→.stat-grid, .sb→.stat-box, .sl→.stat-box-label, .sv→.stat-box-value, .hl→accent-primary, .rl→accent-danger, .gl→accent-success, .tl→accent-info 等 |
| calendar.js → v2 クラス移行 | ✅ | 旧CSS変数(--p, --apple-*)への参照をv2変数(--c-primary, --c-card等)に置換 |
| stats.js → v2 クラス移行 | ✅ | 旧CSS変数への参照をv2変数に置換。ds-*クラスはstats.cssで定義済み |
| components.css 拡張 | ✅ | tappable, toggle, im-*, qa, rtb, exit-cf等の旧構造クラスをv2変数ベースで追加 |
| calendar.css 統合 | ✅ | 旧CSS変数参照をv2変数に置換、ダークパレット対応 |
| stats.css 統合 | ✅ | ds-*クラスをv2変数ベースで統合 |
| legacy-structures.css 削除 | ✅ | リポジトリから削除 |
| legacy-compat.css 削除 | ✅ | リポジトリから削除 |
| index.html 旧CSS参照削除 | ✅ | link タグ削除済み |
| sw.js キャッシュ名更新 | ✅ | CACHE_NAME → delieasy-v8 |

**移行前後のクラス対応表:**

| 旧クラス | v2クラス | 定義場所 |
|---------|---------|---------|
| .cd | .card | components.css |
| .ch | .card-header | components.css |
| .cb | .card-body | components.css |
| .fi | .input | components.css |
| .fg | .input-group | components.css |
| .bp | .btn.btn-primary | components.css |
| .bs2 | .btn.btn-secondary | components.css |
| .brd | .btn.btn-danger | components.css |
| .bsm | .btn-sm | components.css |
| .bbl | .btn-block | components.css |
| .sg / .sg2 | .stat-grid.stat-grid-2 | components.css |
| .sg3 | .stat-grid.stat-grid-3 | components.css |
| .sb | .stat-box | components.css |
| .sl | .stat-box-label | components.css |
| .sv | .stat-box-value | components.css |
| .sb.hl | .stat-box.accent-primary | components.css |
| .sb.gl | .stat-box.accent-success | components.css |
| .sb.rl | .stat-box.accent-danger | components.css |
| .sb.tl | .stat-box.accent-info | components.css |
| .s-btn | .pill | components.css |
| .np | .numpad | components.css |
| .pf-d | .pf-dot | components.css |
| .bdg | .badge | components.css |
| .rec-s / .rtb | .rec-s / .rtb | components.css |

**移行前後のCSS変数対応表:**

| 旧変数 | v2変数 |
|-------|-------|
| --p | --c-primary |
| --pl | --c-primary-light |
| --pd | --c-primary-dark |
| --pbg | --c-primary |
| --card / --c | --c-card |

---

了解です。以下が日本語版です。

---

## Phase 10 — v2.2 (2026-03-26)

- **円形ローディング画面**: 3ドットのスプラッシュをシンプルな円形スピナーに置換。アイコン・テキストなし
- **FAB自由配置**: FABボタンを長押しで画面上の好きな位置にドラッグ配置可能。位置はプリセットごとに保存
- **カスタムオーバーレイ閉じる/戻るバグ修正**: openCustomOverlay()をoverlay.jsのスタック管理に統合し、←ボタンとスワイプダウンで正常に閉じられるように修正
- **ダッシュボード型カスタムオーバーレイ**: 新タイプ「ダッシュボード」を追加。ホーム画面と同じウィジェット（時計、今日の売上、ミニカレンダー等）を自由に追加・削除・並び替え・サイズ変更可能。長押しで編集モードに入る操作感もホーム画面と同一
- **オーバーレイ管理**: ホーム画面のウィジェット編集と同様のスタイルで、オーバーレイを管理するダイアログを追加（カスタムオーバーレイの追加・編集・並び替え・削除、組み込みオーバーレイの表示・カスタマイズ）
- **オーバーレイセクション ドラッグ並び替え**: オーバーレイカスタマイザー内のセクション並び替えを、▲▼ボタンから長押しドラッグ方式に変更

| --bg | --c-bg |
| --tx | --c-tx |
| --sub | --c-tx-secondary |
| --mt | --c-tx-muted |
| --bd | --c-border |
| --gn | --c-success |
| --gnl | --c-success-light |
| --rd | --c-danger |
| --rdl | --c-danger-light |
| --yl | --c-warning |
| --yll | --c-warning-light |
| --bl / --tl | --c-info |
| --bll / --tll | --c-info-light |
| --inputBg | --c-input-bg |
| --R | --ds-radius |
| --R-sm | --ds-radius-sm |
| --apple-separator | --c-divider |
| --apple-fill-* | --c-fill-* |
| --apple-group-bg | --c-card |
| --apple-label-secondary | --c-tx-secondary |
| --moOverlay | --c-overlay |

---

## メモ欄

- Phase 8 で旧JSファイル（calendar.js, stats.js, expense.js, tax.js）を v2 CSS変数・クラスに完全移行。legacy-structures.css と legacy-compat.css への依存は完全に排除された。
- 全てのスタイルは v2 の CSS変数（--c-*, --ds-*）とクラス名（.card, .btn, .stat-box等）で動作する。
- styles/main.css は不要（プロジェクトに残っている場合も未使用）。

---

## Phase 9: v2.1 機能拡張

| 作業 | 状態 | メモ |
|------|------|------|
| スプラッシュ画面 | ✅ | index.html + base.css + app.js に実装。initApp完了で自動非表示、5秒フォールバック付き |
| ボトムバースロット数変更 | ✅ | 3〜6スロット選択可能。bottombar.js に slotCount 設定追加 |
| 設定変更で編集モード維持 | ✅ | bottombar/topbar/right-panel の設定変更が renderHome() を呼ばずにUI部分更新 |
| オーバーレイセクションカスタマイズ | ✅ | overlay-customizer.js 新規作成。⚙️ボタンで表示/非表示・並び替え |
| カスタムオーバーレイ | ✅ | custom-overlays.js 新規作成。メモ/チェックリスト/リンク集の3タイプ |
| FABカスタマイズ | ✅ | fab.js 全面書き換え。表示/非表示・位置・アクション選択がプリセット保存対応 |
| サイドバーにカスタムオーバーレイ | ✅ | sidebar.js にカスタムオーバーレイ項目+追加ボタン |
| 設定にカスタムオーバーレイ管理 | ✅ | settings-view.js に一覧表示・削除・新規作成UI |
| sw.js キャッシュ更新 | ✅ | CACHE_NAME → delieasy-v9、新規JSファイルをPRE_CACHEに追加 |

**新規ファイル:**
- js/overlay-customizer.js — オーバーレイセクションの表示/非表示・並び替えカスタマイザー
- js/custom-overlays.js — ユーザー定義カスタムオーバーレイ（メモ・チェックリスト・リンク集）
