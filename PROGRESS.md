# `PROGRESS.md`

```markdown
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
| 6 | 機能オーバーレイ群 | 8 | ⬜ 未着手 | - | - |
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
| js/calendar-view.js | ⬜ | calendar.js をラップ |
| js/stats-view.js | ⬜ | stats.js をラップ |
| js/tax-view.js | ⬜ | tax.js をラップ |
| js/expense-view.js | ⬜ | expense.js をラップ |
| js/pf-manage.js | ⬜ | PF/カテゴリ管理 |
| js/settings-view.js | ⬜ | 同期・データ管理 |
| styles/calendar.css | ⬜ | |
| styles/stats.css | ⬜ | |

**チェックリスト:**
- [ ] カレンダー表示 + 日別詳細
- [ ] 統計表示 + 期間切替 + グラフ
- [ ] 税金計算動作
- [ ] 経費一覧 + 編集/削除
- [ ] PF追加/編集/削除
- [ ] 設定 → Firebase同期動作
- [ ] 売上編集/削除（オーバーレイ内）
- [ ] 経費編集/削除（オーバーレイ内）

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

-
