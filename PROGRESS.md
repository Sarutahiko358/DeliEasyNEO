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
| 7 | 統合・仕上げ | 2+ | ⬜ 未着手 | - | - |

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
- [ ] ヒント表示（Phase 7で実装）

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
| styles/calendar.css | ✅ | v2テーマ変数へのフォールバックマッピング |
| styles/stats.css | ✅ | v2テーマ変数へのフォールバックマッピング |

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
- 既存の calendar.js / stats.js / expense.js / tax.js は変更なし
- ラッパーパターン: オーバーレイbody内に仮の #pg1〜#pg4 を生成し、既存render関数を呼び出す
- 旧CSS変数(--p, --card等)とv2変数(--c-primary, --c-card等)の共存をfallback付きCSSで実現
- styles/main.css は引き続きロード不要（旧変数は各カラーパレットでも定義済み）

---

## Phase 7: 統合・仕上げ

| 作業 | 状態 | メモ |
|------|------|------|
| migration.js | ⬜ | 旧→新データ移行 |
| sw.js 更新 | ⬜ | キャッシュ対象変更 |
| アニメ調整 | ⬜ | |
| スワイプ調整 | ⬜ | |
| 10スタイル表示確認 | ⬜ | |
| 20カラー表示確認 | ⬜ | |
| PWA動作確認 | ⬜ | |
| Firebase同期確認 | ⬜ | |
| オフライン動作確認 | ⬜ | |
| 旧コード削除 | ⬜ | |
| ファイルサイズ確認 | ⬜ | |

---

## メモ欄

- Phase 6 で旧JSファイル（calendar.js, stats.js, expense.js, tax.js）を index.html に追加。これらは v2 オーバーレイ内でラッパー経由で動作する。
- styles/main.css はロードしていないが、旧JSが参照する旧CSS変数（--p, --card, --apple-*等）はカラーパレットで定義されていないため、一部表示が崩れる可能性あり。Phase 7 でstyles/main.cssの必要部分を抽出するか、旧変数の互換レイヤーを追加する必要がある。
