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
| 2 | テーマシステム | 3 | ⬜ 未着手 | - | - |
| 3 | ウィジェット+ホーム | 7 | ⬜ 未着手 | - | - |
| 4 | 4辺カスタム | 6 | ⬜ 未着手 | - | - |
| 5 | 入力オーバーレイ | 2 | ⬜ 未着手 | - | - |
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
| styles/design-styles.css | ⬜ | 残り8スタイル追加 |
| styles/color-palettes.css | ⬜ | 残り18パレット追加 |
| js/theme-view.js | ⬜ | 2軸テーマ選択UI |

**チェックリスト:**
- [ ] 10デザインスタイル全定義
- [ ] 20カラーパレット全定義
- [ ] テーマ選択オーバーレイ動作
- [ ] プレビュー表示
- [ ] 組み合わせ保存・復元

---

## Phase 3: ウィジェット + ホーム

| ファイル | 状態 | メモ |
|---------|------|------|
| js/widgets.js | ⬜ | 全ウィジェット描画 |
| js/presets.js | ⬜ | CRUD + テンプレート |
| js/home.js | ⬜ | ホーム描画 + 編集モード |
| js/hints.js | ⬜ | 段階的開示ヒント |
| styles/widgets.css | ⬜ | |
| styles/presets.css | ⬜ | |
| styles/home.css | ⬜ | |

**チェックリスト:**
- [ ] デフォルトプリセット表示
- [ ] ウィジェットにデータ反映
- [ ] プリセットバー切替
- [ ] 編集モード（追加/削除/並替/サイズ変更）
- [ ] テンプレートから作成
- [ ] 長押しで編集モード
- [ ] ヒント表示（初回のみ）

---

## Phase 4: 4辺カスタマイズ

| ファイル | 状態 | メモ |
|---------|------|------|
| js/topbar.js | ⬜ | スロットカスタム |
| js/bottombar.js | ⬜ | 有効化 + スロット |
| js/right-panel.js | ⬜ | 情報パネル |
| styles/topbar.css | ⬜ | |
| styles/bottombar.css | ⬜ | |
| styles/right-panel.css | ⬜ | |

**チェックリスト:**
- [ ] トップバーカスタム動作
- [ ] トップバー非表示可能
- [ ] ボトムバー有効化/無効化
- [ ] ボトムバーアクション割当
- [ ] 右パネル（右スワイプで開く）
- [ ] 右パネル内容カスタム
- [ ] 右端のヒント表示
- [ ] 設定がプリセットに保存

---

## Phase 5: 入力オーバーレイ

| ファイル | 状態 | メモ |
|---------|------|------|
| js/earn-input.js | ⬜ | テンキー + 直接入力 |
| js/expense-input.js | ⬜ | カテゴリ + 金額 |

**チェックリスト:**
- [ ] FAB → 売上入力 → 記録 → ホーム反映
- [ ] FAB → 経費入力 → 記録 → ホーム反映
- [ ] テンキー/直接入力切替
- [ ] PF選択動作
- [ ] 日付選択動作

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
