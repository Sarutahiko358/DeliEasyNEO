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
| D | デスクトップ対応 Phase 3: ワイドレイアウト | ⬜ 未着手 | チャット4 |
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

## C. デスクトップ対応 Phase 2: マウスドラッグ対応

**対象ファイル:** `js/home.js`, `js/custom-overlays.js`, `js/overlay-customizer.js`, `js/fab.js`

### home.js — ウィジェット編集リスト
| タスク | 状態 |
|--------|------|
| [ ] mousedown + タイマーで長押し検知 |  |
| [ ] mousemove でドラッグ追従 |  |
| [ ] mouseup で位置確定 + データ保存 |  |
| [ ] contextmenu 抑制 |  |
| [ ] マウス長押し → 編集モード開始 |  |

### custom-overlays.js — ダッシュボード編集
| タスク | 状態 |
|--------|------|
| [ ] ダッシュボードウィジェット並び替えのマウスドラッグ |  |
| [ ] ダッシュボード長押しで編集モード（マウス） |  |
| [ ] メモ/チェックリスト/リンクの並び替えドラッグ（マウス） |  |
| [ ] 管理タブ内の並び替えドラッグ（マウス） |  |

### overlay-customizer.js — セクション並び替え
| タスク | 状態 |
|--------|------|
| [ ] セクション並び替えのマウスドラッグ |  |

### fab.js — FAB自由配置
| タスク | 状態 |
|--------|------|
| [ ] FAB長押しドラッグのマウス対応 |  |
| [ ] contextmenu 抑制 |  |

---

## D. デスクトップ対応 Phase 3: ワイドレイアウト

**対象ファイル:** `index.html`, `styles/base.css`, `js/sidebar.js`, `js/overlay.js`, `js/right-panel.js`, `styles/sidebar.css`, `styles/overlay.css`, `styles/right-panel.css`, `styles/widgets.css`

### レイアウト変更（1024px以上）
| タスク | 状態 |
|--------|------|
| [ ] #app の max-width 解除 or 拡大 |  |
| [ ] サイドバーを左に常時固定表示（折り畳み可能） |  |
| [ ] メインコンテンツ領域の幅を自動拡張 |  |
| [ ] ウィジェットグリッドを 3〜4 カラム対応 |  |
| [ ] オーバーレイをモーダル表示に変更（中央配置 + 背景暗転） |  |
| [ ] 右パネルを常時表示オプション |  |
| [ ] ボトムバーを非表示にしサイドナビに統合 |  |
| [ ] FAB位置のデスクトップ調整 |  |

### タブレット対応（768px〜1023px）
| タスク | 状態 |
|--------|------|
| [ ] ウィジェットグリッドを 2〜3 カラム |  |
| [ ] オーバーレイ幅を80%に |  |
| [ ] サイドバーはオーバーレイ維持 |  |

---

## E. デスクトップ対応 Phase 4: 仕上げ

**対象ファイル:** 複数

| タスク | 状態 |
|--------|------|
| [ ] 右クリックコンテキストメニュー（ウィジェット → 編集/削除） |  |
| [ ] 右クリックコンテキストメニュー（記録行 → 編集/削除） |  |
| [ ] ウィンドウリサイズ時のレイアウト再計算 |  |
| [ ] FAB位置のリサイズ時クランプ |  |
| [ ] カスタムツールチップスタイル定義 |  |
| [ ] キーボードショートカット（Ctrl+N: 売上入力、Ctrl+E: 経費入力 等） |  |
| [ ] スクロールバーのスタイリング（デスクトップでは表示される） |  |
| [ ] テキスト選択の適切な制御（UIは選択不可、メモ/入力は選択可） |  |
| [ ] sw.js キャッシュ更新 |  |

---

## F. 青色申告帳簿機能（複式簿記対応）

**新規ファイル:** `js/bookkeeping.js`, `js/bookkeeping-view.js`, `styles/bookkeeping.css`
**修正ファイル:** `js/overlay.js`, `js/sidebar.js`, `js/widgets.js`, `sw.js`, `index.html`

### F-1. 設計
| タスク | 状態 |
|--------|------|
| [ ] 勘定科目マスタの設計（収益/費用/資産/負債/純資産） |  |
| [ ] 仕訳データ構造の設計（日付, 借方科目, 借方金額, 貸方科目, 貸方金額, 摘要） |  |
| [ ] 既存の売上/経費データから自動仕訳への変換ロジック設計 |  |
| [ ] IndexedDB ストア設計（journals store） |  |
| [ ] 貸借対照表のレイアウト設計 |  |
| [ ] 損益計算書のレイアウト設計 |  |

### F-2. データ層
| タスク | 状態 |
|--------|------|
| [ ] bookkeeping.js — 仕訳CRUD |  |
| [ ] bookkeeping.js — 勘定科目管理 |  |
| [ ] bookkeeping.js — 売上データ → 仕訳の自動変換 |  |
| [ ] bookkeeping.js — 経費データ → 仕訳の自動変換 |  |
| [ ] bookkeeping.js — 総勘定元帳の生成 |  |
| [ ] bookkeeping.js — 試算表の生成 |  |
| [ ] bookkeeping.js — 貸借対照表の生成 |  |
| [ ] bookkeeping.js — 損益計算書の生成 |  |
| [ ] IndexedDB journals ストア追加 |  |
| [ ] Firebase同期対応（firebase-sync.jsは変更不可なので、S.g/S.sフック方式） |  |

### F-3. UI
| タスク | 状態 |
|--------|------|
| [ ] bookkeeping-view.js — オーバーレイ登録 |  |
| [ ] 仕訳帳タブ（一覧 + 手動追加 + 編集 + 削除） |  |
| [ ] 総勘定元帳タブ（勘定科目ごとの取引一覧） |  |
| [ ] 貸借対照表タブ（B/S表示） |  |
| [ ] 損益計算書タブ（P/L表示） |  |
| [ ] 年度切替（1月始/4月始） |  |
| [ ] 自動仕訳の確認・修正UI |  |
| [ ] 勘定科目のカスタマイズUI |  |

### F-4. 出力
| タスク | 状態 |
|--------|------|
| [ ] 仕訳帳CSV出力 |  |
| [ ] 総勘定元帳CSV出力 |  |
| [ ] 貸借対照表PDF/印刷用HTML出力 |  |
| [ ] 損益計算書PDF/印刷用HTML出力 |  |
| [ ] 確定申告用（青色申告決算書フォーマット）出力 |  |

### F-5. ウィジェット・サイドバー統合
| タスク | 状態 |
|--------|------|
| [ ] サイドバーに「📒 帳簿」メニュー追加 |  |
| [ ] ウィジェット「帳簿サマリー」追加 |  |
| [ ] sw.js キャッシュ更新 |  |

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
