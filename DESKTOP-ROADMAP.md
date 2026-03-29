# DeliEasy デスクトップ対応 + 機能拡張 ロードマップ

> **作成日:** 2026-03-27
> **目的:** デスクトップブラウザでの操作性改善 + 帳簿機能追加 + UI改善

---

## 全体進捗

| # | 作業ブロック | 状態 | 担当チャット |
|---|-------------|------|-------------|
| A | ミニカレンダー改善 | ✅ 完了 | チャット1 |
| B | デスクトップ対応 Phase 1: CSS基盤 + ホバー + キーボード | ✅ 完了 | チャット2 |
| C | デスクトップ対応 Phase 2: マウスドラッグ対応 | ✅ 完了 | チャット3 |
| D | デスクトップ対応 Phase 3: ワイドレイアウト | ✅ 完了 | チャット4 |
| E | デスクトップ対応 Phase 4: 仕上げ | ⬜ 未着手 | チャット4-5 |
| F | 青色申告帳簿機能 | ⬜ 未着手 | チャット5-7 |

---

## A. ミニカレンダー改善

**対象ファイル:** `js/widgets.js`

| タスク | 状態 |
|--------|------|
| [x] 日ごとの売上金額を表示 |  |
| [x] 月の合計売上金額を表示 |  |
| [x] 月をスワイプで前後移動 |  |
| [x] 月を矢印ボタンで前後移動 |  |

---

## B. デスクトップ対応 Phase 1: CSS基盤 + ホバー + キーボード

**対象ファイル:** `styles/base.css`, `styles/components.css`, `styles/sidebar.css`, `styles/overlay.css`, `styles/fab.css`, `styles/widgets.css`, `styles/calendar.css`, `styles/stats.css`, `styles/home.css`, `styles/right-panel.css`, `styles/topbar.css`, `styles/bottombar.css`, `js/app.js`, `js/overlay.js`

### CSS: ホバースタイル追加
| タスク | 状態 |
|--------|------|
| [x] .btn:hover — 全ボタンバリエーション |  |
| [x] .btn-primary:hover |  |
| [x] .btn-secondary:hover |  |
| [x] .btn-danger:hover |  |
| [x] .btn-ghost:hover |  |
| [x] .btn-icon:hover |  |
| [x] .card-header:hover |  |
| [x] .widget:hover（tappable） |  |
| [x] .sidebar-item:hover |  |
| [x] .pill:hover |  |
| [x] .segmented-item:hover |  |
| [x] .numpad-key:hover |  |
| [x] .fab-main:hover |  |
| [x] .fab-mini:hover |  |
| [x] .cal-c:hover（カレンダー日付セル） |  |
| [x] .preset-tab:hover |  |
| [x] .topbar-btn:hover |  |
| [x] .bottombar-item:hover |  |
| [x] .stat-box.tappable:hover |  |
| [x] .rp-record:hover（右パネル記録行） |  |
| [x] .ds-rec:hover（統計記録行） |  |
| [x] .co-cl-item:hover（チェックリスト） |  |
| [x] .co-link-item:hover（リンク集） |  |
| [x] .co-memo-card:hover（メモカード） |  |

### CSS: フォーカスリング
| タスク | 状態 |
|--------|------|
| [x] :focus-visible の全体定義 |  |
| [x] .input:focus-visible |  |
| [x] .btn:focus-visible |  |
| [x] .topbar-btn:focus-visible |  |
| [x] .sidebar-item:focus-visible |  |

### CSS: カーソル指定の追加
| タスク | 状態 |
|--------|------|
| [x] クリック可能な全要素に cursor: pointer 確認・追加 |  |
| [x] ドラッグ可能要素に cursor: grab / grabbing |  |
| [x] 無効ボタンに cursor: not-allowed |  |

### JS: キーボード対応
| タスク | 状態 |
|--------|------|
| [x] Escape でオーバーレイを閉じる |  |
| [x] Escape でサイドバーを閉じる |  |
| [x] Escape で右パネルを閉じる |  |
| [x] Escape でFABメニューを閉じる |  |
| [x] Escape で確認ダイアログを閉じる |  |

---

## D. デスクトップ対応 Phase 3: ワイドレイアウト

**対象ファイル:** `index.html`, `styles/base.css`, `styles/desktop.css`, `js/sidebar.js`, `js/overlay.js`, `js/right-panel.js`, `js/bottombar.js`, `js/app.js`, `styles/sidebar.css`, `styles/overlay.css`, `styles/right-panel.css`, `styles/widgets.css`, `sw.js`

### レイアウト変更（1024px以上）
| タスク | 状態 |
|--------|------|
| [x] #app の max-width 解除 or 拡大 |  |
| [x] サイドバーを左に常時固定表示（折り畳み可能） |  |
| [x] メインコンテンツ領域の幅を自動拡張 |  |
| [x] ウィジェットグリッドを 3〜4 カラム対応 |  |
| [x] オーバーレイをモーダル表示に変更（中央配置 + 背景暗転） |  |
| [x] 右パネルを常時表示オプション |  |
| [x] ボトムバーを非表示にしサイドナビに統合 |  |
| [x] FAB位置のデスクトップ調整 |  |

### タブレット対応（768px〜1023px）
| タスク | 状態 |
|--------|------|
| [x] ウィジェットグリッドを 2〜3 カラム |  |
| [x] オーバーレイ幅80% |  |
| [x] サイドバーはオーバーレイ維持 |  |

---

## E. デスクトップ対応 Phase 4: 仕上げ

**対象ファイル:** 複数

| タスク | 状態 |
|--------|------|
| [x] ウィンドウリサイズ時のレイアウト再計算 — `app.js` の resize イベントでデスクトップ↔モバイル切替時に全UIを再描画 | ✅ |
| [x] FAB位置のリサイズ時クランプ — `app.js` の resize イベントでビューポート外のFABを自動補正 | ✅ |
| [x] スクロールバーのスタイリング — `desktop.css` でカスタムスクロールバー定義済み | ✅ |
| [x] キーボード操作 — `app.js` で Escape キーによるオーバーレイ/サイドバー/右パネル/FAB/確認ダイアログの閉じ操作を実装済み | ✅ |
| [x] テキスト選択制御 — ドラッグ操作中に `user-select: none` を適用、メモ/入力欄は選択可能 | ✅ |
| [x] sw.js キャッシュ更新 — CACHE_NAME を `delieasy-v22` に更新 | ✅ |
| [ ] 右クリックコンテキストメニュー（ウィジェット → 編集/削除）— 将来対応 |  |
| [ ] 右クリックコンテキストメニュー（記録行 → 編集/削除）— 将来対応 |  |
| [ ] カスタムツールチップスタイル定義 — 将来対応 |  |
| [ ] キーボードショートカット拡張（Ctrl+N: 売上入力、Ctrl+E: 経費入力 等）— 将来対応 |  |

---

## 注意事項

### 絶対に変更しないファイル
- `firebase-config.js`
- `storage.js`
- `earns-db.js`
- `firebase-sync.js`

### コーディング規約
- `'use strict'` + IIFE
- グローバル公開は `window.xxx = xxx`
- CSS変数は `--c-*`（カラー）と `--ds-*`（デザインスタイル）を使用
- `!important` 禁止（既存の例外除く）
- デスクトップ対応のメディアクエリブレークポイント:
  - タブレット: `@media (min-width: 768px)`
  - デスクトップ: `@media (min-width: 1024px)`
  - ワイドデスクトップ: `@media (min-width: 1440px)`
