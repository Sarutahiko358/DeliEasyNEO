# `REDESIGN-PLAN.md`

```markdown
# DeliEasy UI/UX リデザイン計画書
> **最終更新:** 2026-03-25
> **ステータス:** Phase 0 - 設計完了 / Phase 1 - 未着手

---

## 目次
1. [デザイン原則](#1-デザイン原則)
2. [プロジェクト概要](#2-プロジェクト概要)
3. [現行アーキテクチャ](#3-現行アーキテクチャ)
4. [新UIアーキテクチャ](#4-新uiアーキテクチャ)
5. [段階的開示の設計](#5-段階的開示の設計)
6. [テーマシステム（2軸）](#6-テーマシステム2軸)
7. [トップバー設計](#7-トップバー設計)
8. [ボトムバー設計](#8-ボトムバー設計)
9. [左サイドバー（操作系）](#9-左サイドバー操作系)
10. [右サイドバー（情報系）](#10-右サイドバー情報系)
11. [FAB設計](#11-fab設計)
12. [ウィジェットシステム](#12-ウィジェットシステム)
13. [プリセット・テンプレート](#13-プリセットテンプレート)
14. [オーバーレイシステム](#14-オーバーレイシステム)
15. [ファイル構成](#15-ファイル構成)
16. [データ互換性・移行](#16-データ互換性移行)
17. [作業フェーズ](#17-作業フェーズ)
18. [絶対に触らないファイル](#18-絶対に触らないファイル)
19. [コーディング規約](#19-コーディング規約)
20. [既存API一覧](#20-既存api一覧)

---

## 1. デザイン原則

### 最重要原則: 「シンプルに見えて、実は高機能」

```
初回起動 → 「おっ、シンプルで使いやすそう」
1週間後  → 「あれ、ここカスタムできるんだ」
1ヶ月後  → 「自分好みに全部変えられるじゃん」
```

### 5つの原則

#### 原則1: ゼロ設定で使える
- 初回起動時はテンプレート「稼働中」が自動適用
- 何も設定しなくても売上記録と確認ができる
- カスタマイズの存在を初回から見せない

#### 原則2: 段階的開示（Progressive Disclosure）
- カスタマイズ機能は「気づく」ように設計する
- 設定画面にまとめて並べない
- 長押し、左右のエッジスワイプなど「試してみたら見つかる」体験
- ツールチップやヒントで存在をほのめかす程度

#### 原則3: 操作は最短距離
- 売上記録: FABタップ → 金額入力 → 記録（3タップ以内）
- 情報確認: ホーム画面を見るだけ（0タップ）
- 詳細確認: ウィジェットタップ → オーバーレイ（1タップ）

#### 原則4: 元に戻せる安心感
- カスタマイズは全てプリセットとして保存/復元可能
- 「デフォルトに戻す」が常にある
- データの削除は必ず確認ダイアログ

#### 原則5: 見た目が性能
- アニメーションは滑らかに（60fps）
- 操作に対する即座のフィードバック（触覚、視覚）
- 情報は一目で把握できるサイズと配色

---

## 2. プロジェクト概要

### アプリの目的
デリバリー配達員（Uber Eats, 出前館, Wolt, menu等）向けの売上・経費管理PWAアプリ。

### リデザインの目的
- 下部タブバーによるページ遷移を廃止
- 「見る」と「操作する」を明確に分離
- ホーム画面をカスタマイズ可能なウィジェットダッシュボードに変更
- 画面の4辺（トップ/ボトム/左/右）すべてをカスタマイズ可能に
- テーマを「デザインスタイル × カラー」の2軸に分離
- 全てを「シンプルに見える」状態から始める

### 絶対条件
- **Firebase同期のコード（firebase-sync.js）は一切変更しない**
- **earns-db.js のAPI は変更しない**
- **storage.js のAPI は変更しない**
- 既存データ（IndexedDB, localStorage）との互換性を完全に維持

---

## 3. 現行アーキテクチャ

### ファイル構成（現在）
```
/
├── index.html          ← メインHTML（JSインライン約3000行）
├── firebase-config.js  ← Firebase設定 ⛔触らない
├── storage.js          ← localStorageラッパー ⛔触らない
├── earns-db.js         ← IndexedDB売上管理 ⛔触らない
├── firebase-sync.js    ← Firebase同期 ⛔触らない
├── calendar.js         ← カレンダー機能
├── stats.js            ← 統計機能（SVGチャート含む）
├── expense.js          ← 経費管理機能
├── tax.js              ← 税金計算機能
├── styles/main.css     ← 全スタイル（約2500行）
├── sw.js               ← Service Worker
├── manifest.json
└── icon系ファイル
```

### 現行ナビゲーション（廃止対象）
```
下部タブバー（4+カスタム最大3）
├── 🏠 ホーム     ← 入力 + 実績
├── 📅 カレンダー  ← 月間 + 日別詳細
├── 📊 統計       ← 期間別グラフ
├── 🧾 税金       ← 税金試算
└── ⭐ カスタム×3  ← ユーザー定義
```

---

## 4. 新UIアーキテクチャ

### 画面構造（全体図）

```
┌───────────────────────────────────────┐
│  トップバー [カスタム可 / 非表示可]     │
├───────┬───────────────────┬───────────┤
│       │                   │           │
│  左   │                   │   右      │
│  サ   │   メインエリア     │   サ      │
│  イ   │ （ウィジェット     │   イ      │
│  ド   │  ダッシュボード）   │   ド      │
│  バ   │                   │   バ      │
│  ー   │                   │   ー      │
│       │                   │           │
│ 操作系 │                   │  情報系   │
│       │                   │           │
├───────┴───────────────────┴───────────┤
│  ボトムバー [カスタム可 / 非表示可]     │
└───────────────────────────────────────┘
                              [FAB]
```

### デフォルト状態（初回起動時に見える姿）

```
┌───────────────────────────────┐
│ [☰]  DeliEasy          [☁️]  │  ← シンプルなトップバー
├───────────────────────────────┤
│                               │
│  ┌─────────────────────────┐  │
│  │ 🕐  15:32  3/25(火)    │  │  ← 時計ウィジェット
│  └─────────────────────────┘  │
│  ┌────────┐  ┌────────┐      │
│  │ ¥12,500│  │  8件   │      │  ← 今日の売上 + 件数
│  │ 今日売上│  │ 今日件数│      │
│  └────────┘  └────────┘      │
│  ┌────────┐  ┌────────┐      │
│  │ ¥1,563 │  │ ¥10,800│      │  ← 単価 + 利益
│  │ 平均単価│  │ 今日利益│      │
│  └────────┘  └────────┘      │
│  ┌─────────────────────────┐  │
│  │  PF別内訳               │  │
│  │  Uber ████████░░ ¥8,200│  │
│  │  出前館 ███░░░░░ ¥4,300│  │
│  └─────────────────────────┘  │
│                               │
│                        [＋]   │  ← FAB
│                               │
└───────────────────────────────┘

※ ボトムバーは非表示
※ サイドバーは隠れている
※ カスタマイズ機能は一切見えない
```

### ユーザーが「気づく」ポイント
```
1. ☰をタップ → 左サイドバーが開く（操作系メニュー）
2. 右端からスワイプ → 右サイドバーが開く（情報パネル）
   → 初回だけ小さなヒントを画面端に出す
3. ウィジェットを長押し → 編集モードに入る
   → 初回だけ「長押しでカスタマイズ」のヒントをトーストで出す
4. プリセット名をタップ → プリセット切替が見える
   → 最初は「稼働中」1つだけなので目立たない
```

---

## 5. 段階的開示の設計

### レベル1: 初回起動（何も知らない）
**見えるもの:**
- トップバー（☰ + アプリ名 + ☁️同期）
- ウィジェット（テンプレート「稼働中」）
- FAB（＋ボタン）

**できること:**
- FABで売上/経費を記録
- ウィジェットで今日の実績を確認
- ☰でカレンダーや統計を開く

**隠れているもの:**
- 右サイドバー
- ボトムバー
- ウィジェット編集
- プリセット切替
- テーマカスタム
- トップバーカスタム

### レベル2: 1週間後（基本操作に慣れた）
**自然に発見するもの:**
- 右端スワイプ → 右サイドバー（直近の記録がサッと見える）
- ウィジェット長押し → 「編集できる！」
- ☰ → 設定 → テーマ変更
- ☰ → 設定 → 「ホーム画面カスタマイズ」の項目に気づく

### レベル3: 1ヶ月後（パワーユーザー）
**能動的に使うもの:**
- プリセットを複数作成して場面で切替
- トップバーの表示内容を変更
- ボトムバーを有効化してショートカットを配置
- デザインスタイルとカラーを個別に選択
- 右サイドバーの内容をカスタマイズ

### ヒントシステム
```javascript
const HINTS = {
  rightSwipe: {
    trigger: 'firstLaunch',      // 初回起動時
    delay: 10000,                 // 10秒後
    message: '← 右端からスワイプで情報パネル',
    style: 'edgeGlow',           // 画面右端がほんのり光る
    showOnce: true
  },
  longPress: {
    trigger: 'afterFirstRecord', // 初回記録後
    delay: 3000,
    message: 'ウィジェットを長押しでカスタマイズ',
    style: 'toast',
    showOnce: true
  },
  presetSwitch: {
    trigger: 'afterFirstEdit',   // 初回編集後
    delay: 2000,
    message: 'プリセットを追加して場面で切り替えよう',
    style: 'toast',
    showOnce: true
  }
};
// 表示済みフラグ: dp_hints_shown = { rightSwipe: true, ... }
```

---

## 6. テーマシステム（2軸）

### 概要
テーマを **デザインスタイル（形・質感）** と **カラーパレット（色）** の2軸に分離。
独立して選択でき、組み合わせ自由。

```html
<html data-style="minimal" data-color="blue-light">
```

### デザインスタイル（10種）

各スタイルが定義するCSS変数（形状・質感系）:
```css
/* デザインスタイルが制御する変数 */
--ds-radius:           /* 角丸の大きさ */
--ds-radius-sm:        /* 小さい角丸 */
--ds-radius-lg:        /* 大きい角丸 */
--ds-radius-pill:      /* ピル型ボタンの角丸 */
--ds-shadow:           /* 標準の影 */
--ds-shadow-lg:        /* 強調の影 */
--ds-shadow-card:      /* カードの影 */
--ds-shadow-fab:       /* FABの影 */
--ds-blur:             /* フロストガラスのブラー量 */
--ds-border:           /* ボーダーの太さ */
--ds-border-style:     /* ボーダースタイル */
--ds-card-padding:     /* カードの内余白 */
--ds-widget-gap:       /* ウィジェット間の隙間 */
--ds-btn-radius:       /* ボタンの角丸 */
--ds-btn-padding:      /* ボタンのパディング */
--ds-btn-weight:       /* ボタンのフォントウェイト */
--ds-heading-weight:   /* 見出しのウェイト */
--ds-heading-tracking: /* 見出しの字間 */
--ds-body-size:        /* 本文サイズ */
--ds-transition:       /* 標準トランジション */
--ds-transition-fast:  /* 高速トランジション */
--ds-hover-scale:      /* ホバー時のスケール */
--ds-active-scale:     /* タップ時のスケール */
--ds-backdrop:         /* 背景フィルター(frost等) */
--ds-card-border:      /* カードのボーダー */
--ds-input-border:     /* 入力欄のボーダー */
--ds-divider:          /* 区切り線スタイル */
--ds-content-density:  /* compact | normal | spacious */
```

#### Style 1: ミニマル (minimal)
```
Apple HIG準拠。フロストガラス、大きな角丸、控えめな影。
最も洗練された印象。余白を十分にとる。

角丸: 大（16px）  影: ソフト小   ブラー: 強
ボーダー: なし    密度: spacious  ボタン: 丸め
アニメ: Apple風バウンス  フォント: 軽め(400-600)
```

#### Style 2: フラット (flat)
```
影なし。ボーダーで区切るクリーンなデザイン。
Material Design Lite風。視認性が高い。

角丸: 中（8px）   影: なし       ブラー: なし
ボーダー: 1px細   密度: normal   ボタン: 角丸小
アニメ: 直線的    フォント: 標準(400-500)
```

#### Style 3: ソフト (soft)
```
ニューモーフィズム風。凹凸のある柔らかい立体感。
全体的に丸みがあり、タッチしたくなる質感。

角丸: 大（20px）  影: 凹凸二重   ブラー: 弱
ボーダー: なし    密度: spacious  ボタン: ピル型
アニメ: ふわり（ease-in-out）  フォント: 丸め(500)
```

#### Style 4: サイバー (cyber)
```
ネオン発光、シャープなエッジ。SF的な未来感。
ダークカラーとの相性が特に良い。

角丸: 小（4px）   影: ネオングロウ  ブラー: なし
ボーダー: 1px発光  密度: normal     ボタン: シャープ
アニメ: シャープ（ease-out）  フォント: 等幅風・重め(600-700)
```

#### Style 5: ポップ (pop)
```
グラデーション多用、丸い形、元気で明るい。
若々しくカジュアルな印象。

角丸: 特大（24px）  影: カラーシャドウ  ブラー: 弱
ボーダー: なし      密度: normal       ボタン: 丸型
アニメ: バウンシー（overshoot）  フォント: 太め(600-700)
```

#### Style 6: 和モダン (wabi)
```
余白重視、繊細な線、日本的な落ち着き。
和紙のような質感を感じる控えめなデザイン。

角丸: 極小（2px）  影: ほぼなし    ブラー: なし
ボーダー: 極細     密度: spacious  ボタン: 角型
アニメ: 静か（ease）  フォント: 軽め(300-400)
```

#### Style 7: ブルータル (brutal)
```
太いボーダー、大胆なフォント、ハイコントラスト。
注意を引くインパクト重視のデザイン。

角丸: なし（0px）  影: ハードオフセット  ブラー: なし
ボーダー: 3px太    密度: normal         ボタン: 四角
アニメ: なし/瞬時  フォント: 極太(700-900)
```

#### Style 8: グラス (glass)
```
全面フロストガラス。透け感とブラーが特徴。
背景が透けて見える没入感のあるデザイン。

角丸: 大（16px）  影: ソフト     ブラー: 最強
ボーダー: 半透明  密度: normal   ボタン: ガラス質
アニメ: ふわり    フォント: 標準
※ カードやバーの背景が半透明になる
```

#### Style 9: クラシック (classic)
```
伝統的なWebデザイン。控えめな装飾、読みやすさ重視。
誰にでも馴染みのある安心感のあるデザイン。

角丸: 中（6px）   影: 標準的     ブラー: なし
ボーダー: 1px     密度: normal   ボタン: 標準
アニメ: 標準      フォント: 標準(400-500)
```

#### Style 10: コンパクト (compact)
```
情報密度最大。小さめのパディング、一画面に多く表示。
データを一目で把握したい人向け。

角丸: 小（4px）   影: 極小       ブラー: なし
ボーダー: 細      密度: compact  ボタン: 小型
アニメ: 高速      フォント: 小さめ・標準(400)
```

### カラーパレット（20種: ライト12 + ダーク8）

各パレットが定義するCSS変数（色系）:
```css
/* カラーパレットが制御する変数 */
--c-bg:          /* 背景色 */
--c-bg-secondary:/* セカンダリ背景 */
--c-card:        /* カード背景 */
--c-card-hover:  /* カードホバー */
--c-tx:          /* テキスト色 */
--c-tx-secondary:/* サブテキスト */
--c-tx-muted:    /* ミュートテキスト */
--c-primary:     /* プライマリアクセント */
--c-primary-light:/* プライマリ薄い */
--c-primary-dark: /* プライマリ濃い */
--c-secondary:   /* セカンダリアクセント */
--c-success:     /* 成功・利益 */
--c-success-light:
--c-danger:      /* 危険・経費 */
--c-danger-light:
--c-warning:     /* 警告 */
--c-warning-light:
--c-info:        /* 情報 */
--c-info-light:
--c-border:      /* ボーダー色 */
--c-divider:     /* 区切り線色 */
--c-input-bg:    /* 入力欄背景 */
--c-overlay:     /* オーバーレイ背景 */
--c-shadow-color:/* 影の色 */
--c-sidebar-bg:  /* サイドバー背景 */
--c-topbar-bg:   /* トップバー背景 */
--c-bottombar-bg:/* ボトムバー背景 */
--c-fab-bg:      /* FAB背景 */
--c-fab-color:   /* FABアイコン色 */
```

#### ライト系（12種）

```
L01: ブルー (blue-light)
    primary: #007aff  bg: #f2f2f7  card: #ffffff  tx: #1d1d1f
    iOS標準のブルー。最も馴染みのある色。

L02: グリーン (green-light)
    primary: #34c759  bg: #f2f8f2  card: #ffffff  tx: #1d2d1f
    爽やかな緑。自然、健康的な印象。

L03: ピンク (pink-light)
    primary: #ff2d55  bg: #fdf2f5  card: #ffffff  tx: #2d1d22
    華やかなピンク。元気で明るい印象。

L04: オレンジ (orange-light)
    primary: #ff9500  bg: #fdf6f0  card: #ffffff  tx: #2d2419
    DeliEasyブランドカラー。活動的な印象。

L05: パープル (purple-light)
    primary: #af52de  bg: #f8f2fd  card: #ffffff  tx: #251d2d
    上品な紫。知的で洗練された印象。

L06: ティール (teal-light)
    primary: #00c7be  bg: #f0faf9  card: #ffffff  tx: #1d2d2c
    清涼感のあるシアン。落ち着きと爽やかさ。

L07: レッド (red-light)
    primary: #ff3b30  bg: #fdf2f2  card: #ffffff  tx: #2d1d1d
    力強い赤。情熱的、エネルギッシュ。

L08: ゴールド (gold-light)
    primary: #c8a04a  bg: #faf8f2  card: #ffffff  tx: #2d2a1d
    暖かみのある金色。高級感、達成感。

L09: サクラ (sakura-light)
    primary: #d4627b  bg: #faf5f5  card: #ffffff  tx: #2d2226
    淡い桜色。春の柔らかさ。

L10: 抹茶 (matcha-light)
    primary: #5a8c51  bg: #f4f7f2  card: #ffffff  tx: #2a3328
    渋い緑。茶道の静けさ。

L11: 藍 (ai-light)
    primary: #3a5f8a  bg: #f0f4f8  card: #ffffff  tx: #1d2833
    深い和風の青。伝統的な落ち着き。

L12: 朱 (shu-light)
    primary: #c8503c  bg: #faf4f0  card: #ffffff  tx: #2e2420
    鳥居のバーミリオン。和の力強さ。
```

#### ダーク系（8種）

```
D01: ダーク・ブルー (blue-dark)
    primary: #0a84ff  bg: #000000  card: #1c1c1e  tx: #f5f5f7

D02: ダーク・グリーン (green-dark)
    primary: #30d158  bg: #001a00  card: #0d1f0d  tx: #e8f5e8

D03: ダーク・ピンク (pink-dark)
    primary: #ff375f  bg: #1a0008  card: #1f0d12  tx: #f5e8ec

D04: ダーク・オレンジ (orange-dark)
    primary: #ff9f0a  bg: #1a0f00  card: #1f150d  tx: #f5ede8

D05: ダーク・パープル (purple-dark)
    primary: #bf5af2  bg: #0d0019  card: #140d1f  tx: #ede8f5

D06: ミッドナイト (midnight)
    primary: #5e5ce6  bg: #000000  card: #111111  tx: #e5e5ea
    OLED向け真っ黒。バッテリー最適化。

D07: 墨 (sumi-dark)
    primary: #c8a86c  bg: #121210  card: #1e1e1a  tx: #e8e4dc
    和風ダーク。金と墨の組み合わせ。

D08: チャコール (charcoal)
    primary: #8e8e93  bg: #1c1c1e  card: #2c2c2e  tx: #d1d1d6
    モノクロ寄り。控えめで落ち着く。
```

### テーマ選択UI

**デフォルト:** `data-style="minimal"` + `data-color="blue-light"`

**テーマ選択画面（オーバーレイ）:**
```
┌─────────────────────────────────┐
│ ← テーマ                        │
├─────────────────────────────────┤
│                                 │
│ 🎨 デザインスタイル              │
│ ┌─────┐┌─────┐┌─────┐┌─────┐  │
│ │ミニ ││フラ ││ソフ ││サイ │  │
│ │マル ││ット ││ト  ││バー │  │
│ └─────┘└─────┘└─────┘└─────┘  │
│ ┌─────┐┌─────┐┌─────┐...      │
│ │ポップ││和  ││ブル │         │
│ └─────┘└─────┘└─────┘         │
│                                 │
│ 🎨 カラー                       │
│ ☀️ ライト                       │
│ (●)(●)(●)(●)(●)(●) ...        │
│ 🌙 ダーク                       │
│ (●)(●)(●)(●)(●)(●) ...        │
│                                 │
│ 👁 プレビュー                   │
│ ┌─────────────────────────┐    │
│ │ [選択中の組み合わせの      │    │
│ │  プレビューカード]         │    │
│ └─────────────────────────┘    │
└─────────────────────────────────┘
```

**段階的開示:**
- 初回は ☰ → 設定 → テーマ からのみアクセス
- パワーユーザー向けに長押しでクイックテーマ切替も可能

---

## 7. トップバー設計

### スロット構成
```
┌────────────────────────────────────────┐
│ [左固定] [左カスタム] [中央] [右カスタム] [右固定] │
└────────────────────────────────────────┘
```

### 各スロットの定義

```javascript
const TOPBAR_SLOTS = {
  leftFixed: {
    // 常に存在（変更不可）
    items: ['hamburger']  // ☰ ボタン
  },
  leftCustom: {
    // カスタム可能
    default: ['appName'],
    options: [
      'appName',         // "DeliEasy"
      'todaySales',      // "¥12,500"
      'todaySalesCount', // "¥12,500 / 8件"
      'todayProfit',     // "利益 ¥10,800"
      'goalProgress',    // "¥12,500/¥30,000"
      'goalBar',         // [████████░░] 65%
      'date',            // "3/25(火)"
      'dateTime',        // "3/25(火) 15:32"
      'streak',          // "🔥 12日連続"
      'monthSales',      // "今月 ¥285,000"
      'hourlyRate',      // "¥1,250/h"
      'none'             // 非表示
    ]
  },
  center: {
    default: ['none'],
    options: [
      'none',
      'date',
      'goalBar',
      'todaySales',
      'appName',
      'presetName'       // 現在のプリセット名
    ]
  },
  rightCustom: {
    default: ['none'],
    options: [
      'none',
      'syncIcon',         // ☁️ 同期ステータス
      'settingsIcon',     // ⚙️
      'themeIcon',        // 🎨
      'searchIcon',       // 🔍（将来用）
      'notifIcon',        // 🔔（将来用）
      'todaySales',
      'todayCount'
    ]
  },
  rightFixed: {
    // 常に存在（変更不可）
    items: ['syncStatus']  // ☁️ 同期ステータス
  }
};
```

### デフォルト表示
```
[☰] DeliEasy                    [☁️]
```

### カスタム例
```
例1: [☰] ¥12,500 / 8件          [⚙️][☁️]
例2: [☰]         3/25(火)       [☁️]
例3: [☰] 🔥12日  [████░░] 65%   [☁️]
例4: [☰]                        [☁️]  (ミニマル)
```

### 表示/非表示
トップバー自体を非表示にすることも可能。
その場合、☰ボタンは画面左上にフローティングで表示。

---

## 8. ボトムバー設計

### デフォルト: 非表示

初回起動時はボトムバーは存在しない。
ユーザーがカスタマイズ設定で有効化して初めて表示される。

### スロット構成（有効化時）
```
┌────────────────────────────────────────┐
│  [slot1] [slot2] [slot3] [slot4] [slot5] │
└────────────────────────────────────────┘
最大5スロット。各スロットにアクションを割り当て。
```

### 割り当て可能なアクション
```javascript
const BOTTOMBAR_OPTIONS = [
  { id: 'earnInput',    icon: '✏️', label: '売上入力',  action: 'openOverlay:earnInput' },
  { id: 'expenseInput', icon: '💸', label: '経費入力',  action: 'openOverlay:expenseInput' },
  { id: 'calendar',     icon: '📅', label: 'カレンダー', action: 'openOverlay:calendar' },
  { id: 'stats',        icon: '📊', label: '統計',      action: 'openOverlay:stats' },
  { id: 'tax',          icon: '🧾', label: '税金',      action: 'openOverlay:tax' },
  { id: 'expense',      icon: '💰', label: '経費管理',  action: 'openOverlay:expenseManage' },
  { id: 'settings',     icon: '⚙️', label: '設定',      action: 'openOverlay:settings' },
  { id: 'theme',        icon: '🎨', label: 'テーマ',    action: 'openOverlay:theme' },
  { id: 'presetNext',   icon: '🔄', label: '次のプリセット', action: 'nextPreset' },
  { id: 'editMode',     icon: '✏️', label: '編集モード', action: 'enterEditMode' }
];
```

---

## 9. 左サイドバー（操作系）

### 目的
「何かをする」ためのメニュー。操作とナビゲーション。

### 開閉方法
- ☰ボタンタップ
- 画面左端からの右スワイプ
- 閉じる: オーバーレイタップ / 左スワイプ / メニュー選択後

### メニュー構成

```javascript
const LEFT_SIDEBAR_MENU = [
  // --- ユーザー情報（上部） ---
  { type: 'userInfo' },
  // ログイン済み: アバター + 名前 + email + 同期ステータス
  // 未ログイン: 「同期するにはログイン」

  { type: 'divider' },

  // --- クイックアクション ---
  { id: 'earn-input',    icon: '✏️', label: '売上入力',    overlay: 'earnInput' },
  { id: 'expense-input', icon: '💸', label: '経費入力',    overlay: 'expenseInput' },

  { type: 'divider' },

  // --- メイン機能 ---
  { id: 'calendar',      icon: '📅', label: 'カレンダー',  overlay: 'calendar' },
  { id: 'stats',         icon: '📊', label: '統計',        overlay: 'stats' },
  { id: 'tax',           icon: '🧾', label: '税金',        overlay: 'tax' },
  { id: 'expense-mgmt',  icon: '💰', label: '経費管理',    overlay: 'expenseManage' },

  { type: 'divider' },

  // --- 管理（初期は折りたたみ） ---
  { id: 'pf-manage',     icon: '📦', label: 'PF・カテゴリ', overlay: 'pfManage' },
  { id: 'theme',         icon: '🎨', label: 'テーマ',      overlay: 'theme' },
  { id: 'home-edit',     icon: '🏠', label: 'ホーム編集',  action: 'enterEditMode' },
  { id: 'settings',      icon: '⚙️', label: '設定',        overlay: 'settings' },
  { id: 'help',          icon: '❓', label: 'ヘルプ',      overlay: 'help' }
];
```

### ビジュアル仕様
```
幅: 280px（画面幅の75%を超えない）
背景: var(--c-sidebar-bg)
オーバーレイ: var(--c-overlay)
アニメーション: translateX(-100%) → translateX(0)  .3s
```

---

## 10. 右サイドバー（情報系）

### 目的
「サッと確認する」ための情報パネル。操作ではなく表示に特化。

### 開閉方法
- 画面右端からの左スワイプ
- トップバーの専用アイコン（設定で有効化時）
- 閉じる: 右スワイプ / オーバーレイタップ

### デフォルト表示（初回起動）
```
┌─────────────────────┐
│  📊 今日のサマリー   │
│  売上  ¥12,500      │
│  件数  8件          │
│  単価  ¥1,563       │
│  経費  ¥1,700       │
│  利益  ¥10,800      │
├─────────────────────┤
│  📋 直近の記録       │
│  15:20 Uber ¥1,800  │
│  14:45 出前館 ¥1,200│
│  14:10 Uber ¥2,100  │
│  ...                │
├─────────────────────┤
│  📅 今週            │
│  ¥68,500 / 42件     │
└─────────────────────┘
```

### カスタマイズ可能な表示項目
```javascript
const RIGHT_SIDEBAR_SECTIONS = [
  { id: 'todaySummary',   name: '今日のサマリー',   icon: '📊' },
  { id: 'recentRecords',  name: '直近の記録',       icon: '📋' },
  { id: 'weekSummary',    name: '今週のまとめ',     icon: '📅' },
  { id: 'monthSummary',   name: '今月のまとめ',     icon: '📆' },
  { id: 'goalProgress',   name: '目標進捗',         icon: '🎯' },
  { id: 'pfBreakdown',    name: 'PF別（今日）',     icon: '📦' },
  { id: 'streak',         name: '連続稼働日数',     icon: '🔥' },
  { id: 'todayExpenses',  name: '今日の経費',       icon: '💸' },
  { id: 'quickStats',     name: 'クイック統計',     icon: '📈' }
];
```

### ビジュアル仕様
```
幅: 300px（画面幅の80%を超えない）
背景: var(--c-sidebar-bg)
オーバーレイ: var(--c-overlay)
アニメーション: translateX(100%) → translateX(0)  .3s
```

### 段階的開示
- 初回起動時: 右サイドバーは存在するが、ユーザーは知らない
- 右端にうっすら光るヒント（初回のみ、10秒後に表示、フェードアウト）
- 初めてスワイプで開いたとき: 「💡 ここで情報をサッと確認できます」トースト

---

## 11. FAB設計

### デフォルト: 表示（右下）

```
                              ┌────┐
                              │ ＋ │ 56px × 56px
                              └────┘
                                ↑ safe-area + 16px
```

### タップ時の動作

```
ステップ1: ＋をタップ
                         ┌────────┐
                         │ ✏️ 売上 │ ← ミニボタン出現
                         └────────┘
                         ┌────────┐
                         │ 💸 経費 │ ← ミニボタン出現
                         └────────┘
                         ┌────┐
                         │ × │     ← ＋が×に変化
                         └────┘

ステップ2: 「売上」タップ → earnInputオーバーレイが開く
           「経費」タップ → expenseInputオーバーレイが開く
           「×」or外側タップ → メニュー閉じる
```

### オプション設定
```javascript
const FAB_OPTIONS = {
  show: true,            // 表示/非表示
  position: 'right',     // 'right' | 'left'
  actions: [             // カスタム可能（将来）
    { id: 'earnInput', icon: '✏️', label: '売上', overlay: 'earnInput' },
    { id: 'expenseInput', icon: '💸', label: '経費', overlay: 'expenseInput' }
  ]
};
```

### 非表示条件
- オーバーレイが開いているとき
- 編集モード中
- FABをユーザーが無効化しているとき

---

## 12. ウィジェットシステム

### ウィジェットサイズ
```
full:    グリッド全幅（1カラム）
half:    グリッド半幅（2カラムの1つ）
compact: halfと同じ幅だが高さが小さい
```

### グリッドレイアウト
```css
.widget-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--ds-widget-gap);
}
.widget-full { grid-column: 1 / -1; }
.widget-half { grid-column: span 1; }
.widget-compact { grid-column: span 1; }
```

### ウィジェット定義

```javascript
const WIDGET_DEFS = {
  // ===== 基本 =====
  clock: {
    id: 'clock', name: '時計', icon: '🕐',
    size: 'full', sizeOptions: ['full', 'half'],
    category: 'basic', desc: '現在時刻と日付'
  },

  // ===== 今日 =====
  todaySales: {
    id: 'todaySales', name: '今日の売上', icon: '💰',
    size: 'half', sizeOptions: ['half', 'full'],
    category: 'today', desc: '今日の売上金額'
  },
  todayCount: {
    id: 'todayCount', name: '今日の件数', icon: '📦',
    size: 'half', sizeOptions: ['half', 'compact'],
    category: 'today', desc: '今日の配達件数'
  },
  todayUnit: {
    id: 'todayUnit', name: '今日の単価', icon: '💵',
    size: 'half', sizeOptions: ['half', 'compact'],
    category: 'today', desc: '今日の平均単価'
  },
  todayExpense: {
    id: 'todayExpense', name: '今日の経費', icon: '💸',
    size: 'half', sizeOptions: ['half', 'compact'],
    category: 'today', desc: '今日の経費合計'
  },
  todayProfit: {
    id: 'todayProfit', name: '今日の利益', icon: '📊',
    size: 'half', sizeOptions: ['half', 'compact'],
    category: 'today', desc: '売上 - 経費'
  },
  todaySummary: {
    id: 'todaySummary', name: '今日のまとめ', icon: '📋',
    size: 'full', sizeOptions: ['full'],
    category: 'today', desc: '売上・件数・単価・経費・利益を一覧'
  },
  todayPfBreakdown: {
    id: 'todayPfBreakdown', name: '今日のPF別', icon: '📦',
    size: 'full', sizeOptions: ['full'],
    category: 'today', desc: 'プラットフォーム別内訳バー'
  },

  // ===== 今週 =====
  weekSales: {
    id: 'weekSales', name: '今週の売上', icon: '📅',
    size: 'half', sizeOptions: ['half', 'full'],
    category: 'week', desc: '今週の売上金額'
  },
  weekSummary: {
    id: 'weekSummary', name: '今週のまとめ', icon: '📅',
    size: 'full', sizeOptions: ['full'],
    category: 'week', desc: '今週の売上・件数・単価・経費・利益'
  },

  // ===== 今月 =====
  monthSales: {
    id: 'monthSales', name: '今月の売上', icon: '📆',
    size: 'half', sizeOptions: ['half', 'full'],
    category: 'month', desc: '今月の売上金額'
  },
  monthSummary: {
    id: 'monthSummary', name: '今月のまとめ', icon: '📆',
    size: 'full', sizeOptions: ['full'],
    category: 'month', desc: '今月の売上・件数・単価・経費・利益'
  },
  monthPace: {
    id: 'monthPace', name: 'ペース予測', icon: '📈',
    size: 'full', sizeOptions: ['full', 'half'],
    category: 'month', desc: '月間着地見込みとプログレスバー'
  },

  // ===== 分析 =====
  pfBreakdown: {
    id: 'pfBreakdown', name: 'PF別内訳（月）', icon: '🍩',
    size: 'full', sizeOptions: ['full'],
    category: 'analysis', desc: '今月のPF別ドーナツチャート'
  },
  prevCompare: {
    id: 'prevCompare', name: '前月比較', icon: '🔄',
    size: 'full', sizeOptions: ['full'],
    category: 'analysis', desc: '売上・件数・経費・利益の前月比'
  },
  dowPerf: {
    id: 'dowPerf', name: '曜日別', icon: '📅',
    size: 'full', sizeOptions: ['full'],
    category: 'analysis', desc: '曜日ごとの日平均売上'
  },
  dailyTrend: {
    id: 'dailyTrend', name: '日別トレンド', icon: '📈',
    size: 'full', sizeOptions: ['full'],
    category: 'analysis', desc: '今月の日別売上折れ線グラフ'
  },
  unitDist: {
    id: 'unitDist', name: '単価分布', icon: '💵',
    size: 'full', sizeOptions: ['full'],
    category: 'analysis', desc: '配達単価の分布と平均/中央値'
  },
  profitSummary: {
    id: 'profitSummary', name: '収支サマリー', icon: '💰',
    size: 'full', sizeOptions: ['full'],
    category: 'analysis', desc: '売上/経費/利益の積み上げバー'
  },
  expCategory: {
    id: 'expCategory', name: '経費カテゴリ別', icon: '💸',
    size: 'full', sizeOptions: ['full'],
    category: 'analysis', desc: '経費のカテゴリ別内訳'
  },

  // ===== カレンダー =====
  miniCalendar: {
    id: 'miniCalendar', name: 'ミニカレンダー', icon: '🗓',
    size: 'full', sizeOptions: ['full'],
    category: 'calendar', desc: '今月のヒートマップカレンダー'
  },

  // ===== 特殊 =====
  goalProgress: {
    id: 'goalProgress', name: '月間目標', icon: '🎯',
    size: 'full', sizeOptions: ['full', 'half'],
    category: 'special', desc: '目標金額に対する達成率'
  },
  streakCounter: {
    id: 'streakCounter', name: '連続稼働', icon: '🔥',
    size: 'half', sizeOptions: ['half', 'compact'],
    category: 'special', desc: '連続配達日数'
  },
  topDays: {
    id: 'topDays', name: 'ベスト/ワースト', icon: '🏆',
    size: 'full', sizeOptions: ['full'],
    category: 'special', desc: '今月の売上TOP3/WORST3'
  },
  hourlyRate: {
    id: 'hourlyRate', name: '時給換算', icon: '⏱',
    size: 'half', sizeOptions: ['half', 'full'],
    category: 'special', desc: '売上÷稼働時間'
  },
  recentRecords: {
    id: 'recentRecords', name: '直近の記録', icon: '📋',
    size: 'full', sizeOptions: ['full'],
    category: 'special', desc: '直近の配達記録一覧'
  },

  // ===== 税金 =====
  taxSummary: {
    id: 'taxSummary', name: '税金概算', icon: '🧾',
    size: 'full', sizeOptions: ['full'],
    category: 'tax', desc: '年間の所得税・住民税の概算'
  },
  furusatoLimit: {
    id: 'furusatoLimit', name: 'ふるさと納税', icon: '🎁',
    size: 'half', sizeOptions: ['half', 'full'],
    category: 'tax', desc: 'ふるさと納税の上限目安'
  }
};

const WIDGET_CATEGORIES = [
  { id: 'basic',    name: '基本',      icon: '🕐' },
  { id: 'today',    name: '今日',      icon: '📊' },
  { id: 'week',     name: '今週',      icon: '📅' },
  { id: 'month',    name: '今月',      icon: '📆' },
  { id: 'analysis', name: '分析',      icon: '📈' },
  { id: 'calendar', name: 'カレンダー', icon: '🗓' },
  { id: 'special',  name: '特殊',      icon: '⭐' },
  { id: 'tax',      name: '税金',      icon: '🧾' }
];
```

### ウィジェットタップ動作
- **通常タップ**: 関連するオーバーレイを開く
  - 売上系 → 統計オーバーレイ
  - カレンダー → カレンダーオーバーレイ
  - 税金系 → 税金オーバーレイ
- **長押し**: 編集モードに入る

---

## 13. プリセット・テンプレート

### プリセットの保存形式

```javascript
// dp_presets に保存
{
  id: 'preset_1711234567890',
  name: '稼働中',
  icon: '🚴',
  widgets: [
    { id: 'clock', size: 'full' },
    { id: 'todaySales', size: 'half' },
    { id: 'todayCount', size: 'half' },
    { id: 'todayProfit', size: 'half' },
    { id: 'streakCounter', size: 'half' },
    { id: 'todayPfBreakdown', size: 'full' }
  ],
  topBar: {
    show: true,
    leftCustom: 'appName',
    center: 'none',
    rightCustom: 'none'
  },
  bottomBar: {
    show: false,
    items: []
  },
  rightSidebar: {
    sections: ['todaySummary', 'recentRecords', 'weekSummary']
  },
  fab: {
    show: true,
    position: 'right'
  }
}
```

### プリセット切替バー（ホーム画面上部）

```
[🚴 稼働中] [📊 振り返り] [📆 月末] [+]
```

**段階的開示:**
- 初回: プリセットは1つだけ。バーは表示されるが目立たない。
- プリセットが2つ以上になったとき: バーが視覚的に「切り替え可能」に見える
- [+] ボタンは小さく控えめに

### テンプレート（5種）

```javascript
const PRESET_TEMPLATES = [
  {
    name: '🚴 稼働中',
    desc: '配達中にサッと確認',
    widgets: [
      { id: 'clock', size: 'full' },
      { id: 'todaySales', size: 'half' },
      { id: 'todayCount', size: 'half' },
      { id: 'todayUnit', size: 'half' },
      { id: 'todayProfit', size: 'half' },
      { id: 'todayPfBreakdown', size: 'full' }
    ],
    topBar: { show: true, leftCustom: 'appName', center: 'none', rightCustom: 'none' },
    bottomBar: { show: false, items: [] },
    rightSidebar: { sections: ['todaySummary', 'recentRecords'] },
    fab: { show: true, position: 'right' }
  },
  {
    name: '📊 振り返り',
    desc: '1日の終わりに振り返る',
    widgets: [
      { id: 'todaySummary', size: 'full' },
      { id: 'todayPfBreakdown', size: 'full' },
      { id: 'recentRecords', size: 'full' },
      { id: 'hourlyRate', size: 'half' },
      { id: 'streakCounter', size: 'half' }
    ],
    topBar: { show: true, leftCustom: 'todaySalesCount', center: 'none', rightCustom: 'none' },
    bottomBar: { show: false, items: [] },
    rightSidebar: { sections: ['weekSummary', 'monthSummary'] },
    fab: { show: true, position: 'right' }
  },
  {
    name: '📆 月次レポート',
    desc: '月単位の分析',
    widgets: [
      { id: 'monthSummary', size: 'full' },
      { id: 'monthPace', size: 'full' },
      { id: 'pfBreakdown', size: 'full' },
      { id: 'prevCompare', size: 'full' },
      { id: 'dowPerf', size: 'full' },
      { id: 'dailyTrend', size: 'full' }
    ],
    topBar: { show: true, leftCustom: 'monthSales', center: 'none', rightCustom: 'none' },
    bottomBar: { show: false, items: [] },
    rightSidebar: { sections: ['todaySummary', 'goalProgress'] },
    fab: { show: false, position: 'right' }
  },
  {
    name: '💰 収支管理',
    desc: 'お金の流れに特化',
    widgets: [
      { id: 'profitSummary', size: 'full' },
      { id: 'expCategory', size: 'full' },
      { id: 'prevCompare', size: 'full' },
      { id: 'monthSales', size: 'half' },
      { id: 'monthPace', size: 'half' }
    ],
    topBar: { show: true, leftCustom: 'todayProfit', center: 'none', rightCustom: 'none' },
    bottomBar: { show: false, items: [] },
    rightSidebar: { sections: ['todaySummary', 'todayExpenses'] },
    fab: { show: true, position: 'right' }
  },
  {
    name: '🧾 確定申告',
    desc: '年末・確定申告時期用',
    widgets: [
      { id: 'taxSummary', size: 'full' },
      { id: 'furusatoLimit', size: 'half' },
      { id: 'goalProgress', size: 'half' },
      { id: 'profitSummary', size: 'full' },
      { id: 'expCategory', size: 'full' }
    ],
    topBar: { show: true, leftCustom: 'appName', center: 'none', rightCustom: 'none' },
    bottomBar: { show: false, items: [] },
    rightSidebar: { sections: ['monthSummary'] },
    fab: { show: false, position: 'right' }
  }
];
```

### 編集モード

**入り方:**
1. ウィジェットを長押し
2. ☰ → ホーム編集
3. プリセットバーの✏️アイコン

**編集モード中の見え方:**
```
┌───────────────────────────────┐
│ [キャンセル] ホーム編集 [完了]  │
├───────────────────────────────┤
│ [🚴 稼働中 ▼] [✏️名前] [🗑]   │ ← プリセット操作
├───────────────────────────────┤
│  ┌─────────────────────────┐  │
│  │ 🕐 時計          [× 🔄]│  │ ← ×で削除、🔄でサイズ変更
│  └─────────────────────────┘  │  ← ドラッグで並び替え
│  ┌────────┐  ┌────────┐      │
│  │ 💰売上 │  │ 📦件数 │      │
│  │    [× 🔄] │    [× 🔄] │
│  └────────┘  └────────┘      │
│                               │
│  [＋ ウィジェットを追加]        │  ← 追加ボタン
│                               │
│  ─── 詳細設定 ───             │  ← 折りたたみ
│  トップバー設定...             │
│  ボトムバー設定...             │
│  右パネル設定...               │
│  FAB設定...                    │
└───────────────────────────────┘
```

**段階的開示のポイント:**
- 「＋ウィジェットを追加」と「×で削除」「ドラッグで並び替え」は直感的に見える
- 「詳細設定」は折りたたみで隠れている → 開くとトップバー等のカスタムが出現
- サイズ変更は🔄タップで half ↔ full をトグル

---

## 14. オーバーレイシステム

### オーバーレイ一覧

| ID | タイトル | 元ソース | 説明 |
|----|---------|---------|------|
| earnInput | ✏️ 売上入力 | 新規 | PF + 日付 + メモ + 金額 |
| expenseInput | 💸 経費入力 | 新規 | カテゴリ + 日付 + メモ + 金額 |
| calendar | 📅 カレンダー | calendar.js | 月間 + 日別詳細 |
| stats | 📊 統計 | stats.js | 期間別統計 + グラフ |
| tax | 🧾 税金 | tax.js | 税金計算 |
| expenseManage | 💰 経費管理 | expense.js | 経費一覧・編集 |
| pfManage | 📦 PF管理 | IM系 | PF・カテゴリ管理 |
| theme | 🎨 テーマ | 新規 | 2軸テーマ選択 |
| settings | ⚙️ 設定 | 既存 | 同期・データ管理 |
| help | ❓ ヘルプ | 既存 | 使い方・FAQ |

### オーバーレイHTML構造
```html
<div class="overlay" id="overlay-{id}" data-level="1">
  <div class="overlay-sheet">
    <div class="overlay-handle"></div>
    <div class="overlay-header">
      <button class="overlay-back" onclick="closeOverlay()">←</button>
      <span class="overlay-title">{タイトル}</span>
      <div class="overlay-actions"></div>
    </div>
    <div class="overlay-body" id="overlay-body-{id}"></div>
  </div>
</div>
```

### 動作仕様
- フルスクリーン（下からスライドイン）
- スタック: 最大2段
- 閉じ方: ← / 下スワイプ（scroll位置0時） / `closeOverlay()`
- アニメ: translateY(100%) → 0 (.3s)

---

## 15. ファイル構成

```
/
├── index.html              ← 簡素化されたHTML
├── firebase-config.js      ← ⛔ 変更不可
├── storage.js              ← ⛔ 変更不可
├── earns-db.js             ← ⛔ 変更不可
├── firebase-sync.js        ← ⛔ 変更不可
│
├── js/
│   ├── utils.js            ← 共通ユーティリティ
│   ├── app.js              ← 初期化・グローバル管理
│   ├── sidebar.js          ← 左サイドバー
│   ├── right-panel.js      ← 右サイドバー（情報パネル）
│   ├── overlay.js          ← オーバーレイシステム
│   ├── fab.js              ← FAB
│   ├── topbar.js           ← トップバー
│   ├── bottombar.js        ← ボトムバー
│   ├── widgets.js          ← ウィジェット定義・描画
│   ├── presets.js          ← プリセット管理・テンプレート
│   ├── home.js             ← ホーム画面・編集モード
│   ├── hints.js            ← 段階的開示のヒントシステム
│   ├── earn-input.js       ← 売上入力オーバーレイ
│   ├── expense-input.js    ← 経費入力オーバーレイ
│   ├── calendar-view.js    ← カレンダーオーバーレイ
│   ├── stats-view.js       ← 統計オーバーレイ
│   ├── tax-view.js         ← 税金オーバーレイ
│   ├── expense-view.js     ← 経費管理オーバーレイ
│   ├── pf-manage.js        ← PF管理
│   ├── settings-view.js    ← 設定
│   ├── theme-view.js       ← テーマ選択UI
│   └── migration.js        ← 旧→新データ移行
│
├── styles/
│   ├── base.css            ← リセット・基盤
│   ├── components.css      ← 共通コンポーネント
│   ├── sidebar.css         ← 左サイドバー
│   ├── right-panel.css     ← 右サイドバー
│   ├── overlay.css         ← オーバーレイ
│   ├── fab.css             ← FAB
│   ├── topbar.css          ← トップバー
│   ├── bottombar.css       ← ボトムバー
│   ├── widgets.css         ← ウィジェット
│   ├── presets.css         ← プリセットバー
│   ├── home.css            ← ホーム・編集モード
│   ├── calendar.css        ← カレンダー
│   ├── stats.css           ← 統計
│   ├── design-styles.css   ← 10デザインスタイル
│   └── color-palettes.css  ← 20カラーパレット
│
├── sw.js
├── manifest.json
├── REDESIGN-PLAN.md        ← この文書
└── PROGRESS.md             ← 進捗管理
```

---

## 16. データ互換性・移行

### 保持するキー
```
dp_theme         → dp_color + dp_style に分割移行
dp_exps          → そのまま
dp_earns         → そのまま
dp_pfItems       → そのまま
dp_expCatItems   → そのまま
dp_monthlyGoal   → そのまま
dp_calInputMode  → そのまま
dp_homeInputMode → そのまま
dp_expYearStart  → そのまま
dp_lastSyncTs    → そのまま
dp_sync_dirty_local → そのまま
dp_deviceId      → そのまま
dp_fb_uid        → そのまま
dp_fb_profile    → そのまま
dp_taxDeductions → そのまま
```

### 新規キー
```
dp_ui_version    → UIバージョン（2 = 新UI）
dp_style         → デザインスタイル ID
dp_color         → カラーパレット ID
dp_presets       → プリセット配列
dp_activePreset  → 現在のプリセットID
dp_hints_shown   → 表示済みヒントフラグ
dp_topbar_cfg    → トップバーカスタム（プリセット外のグローバル設定）
dp_bottombar_cfg → ボトムバーカスタム（同上）
dp_right_panel   → 右パネルカスタム（同上）
```

### 廃止キー
```
dp_layout_*      → プリセットに移行
dp_navOrder      → ナビ廃止
dp_customTabs    → カスタムタブ廃止
dp_cardFoldLinked→ 不要
```

### 移行処理（migration.js）
```javascript
function migrateToV2() {
  if (S.g('ui_version') === 2) return; // 移行済み

  // 1. テーマ分割
  const oldTheme = S.g('theme', 'light');
  // 旧テーマ → 新2軸に変換
  const themeMap = {
    'light':      { style: 'minimal', color: 'blue-light' },
    'dark':       { style: 'minimal', color: 'blue-dark' },
    'blue':       { style: 'minimal', color: 'blue-light' },
    'green':      { style: 'minimal', color: 'green-light' },
    'pink':       { style: 'minimal', color: 'pink-light' },
    'apple':      { style: 'minimal', color: 'blue-light' },
    'apple-dark': { style: 'minimal', color: 'blue-dark' },
    'apple-blue': { style: 'minimal', color: 'purple-light' },
    'apple-mint': { style: 'minimal', color: 'teal-light' },
    'apple-rose': { style: 'minimal', color: 'pink-light' },
    'jp-sakura':  { style: 'wabi',    color: 'sakura-light' },
    'jp-ai':      { style: 'wabi',    color: 'ai-light' },  // ※ダーク系だが移行時はlight
    'jp-matcha':  { style: 'wabi',    color: 'matcha-light' },
    'jp-sumi':    { style: 'wabi',    color: 'sumi-dark' },
    'jp-shu':     { style: 'wabi',    color: 'shu-light' }
  };
  const mapped = themeMap[oldTheme] || { style: 'minimal', color: 'blue-light' };
  S.s('style', mapped.style);
  S.s('color', mapped.color);

  // 2. デフォルトプリセット作成
  const defaultPreset = JSON.parse(JSON.stringify(PRESET_TEMPLATES[0])); // 稼働中
  defaultPreset.id = 'preset_' + Date.now();
  S.s('presets', [defaultPreset]);
  S.s('activePreset', defaultPreset.id);

  // 3. 移行完了
  S.s('ui_version', 2);

  // 4. 旧キー削除（安全のため残してもよい）
  // localStorage.removeItem('dp_layout_home'); etc.
}
```

---

## 17. 作業フェーズ

### Phase 0: 設計 ✅
- [x] 設計書作成
- [ ] レビュー・フィードバック

### Phase 1: 基盤（HTML構造 + ナビゲーション）
```
index.html / app.js / utils.js
sidebar.js / overlay.js / fab.js
base.css / components.css / sidebar.css / overlay.css / fab.css
design-styles.css / color-palettes.css
```
ゴール: サイドバー開閉、オーバーレイ開閉、FAB表示、テーマ切替が動く

### Phase 2: テーマシステム完成
```
design-styles.css（10スタイル全定義）
color-palettes.css（20パレット全定義）
theme-view.js（テーマ選択UI）
```
ゴール: 10×20 = 200通りのテーマ切替が動く

### Phase 3: ウィジェット + ホーム
```
widgets.js / presets.js / home.js / hints.js
widgets.css / presets.css / home.css
```
ゴール: ウィジェット表示、プリセット切替、編集モードが動く

### Phase 4: トップバー + ボトムバー + 右パネル
```
topbar.js / bottombar.js / right-panel.js
topbar.css / bottombar.css / right-panel.css
```
ゴール: 4辺のカスタマイズが動く

### Phase 5: 入力オーバーレイ
```
earn-input.js / expense-input.js
```
ゴール: FAB → 売上/経費入力 → 記録 → ホーム反映

### Phase 6: 機能オーバーレイ群
```
calendar-view.js / stats-view.js / tax-view.js
expense-view.js / pf-manage.js / settings-view.js
calendar.css / stats.css
```
ゴール: 全機能がオーバーレイから利用可能

### Phase 7: 統合・仕上げ
```
migration.js / sw.js更新
アニメーション調整 / テーマ全組み合わせ確認
旧コード削除 / パフォーマンス確認
```

---

## 18. 絶対に触らないファイル

| ファイル | 理由 |
|---------|------|
| firebase-config.js | Firebase認証情報 |
| storage.js | ストレージAPI。全体が依存 |
| earns-db.js | IndexedDB管理。全体が依存 |
| firebase-sync.js | クラウド同期。複雑なステート管理 |

APIの呼び出しは自由。ファイル内のコードを変更してはならない。

---

## 19. コーディング規約

### JS
- `'use strict'` + IIFE `(function(){ ... })()`
- グローバル公開は `window.xxx = xxx`
- ES2020+構文OK（let/const, arrow, async/await, template literal）
- 関数命名: camelCase

### CSS
- コンポーネントプレフィックス: `.sidebar-*`, `.overlay-*`, `.widget-*`
- CSS変数でテーマ対応
- `!important` 禁止
- transition: `cubic-bezier(.25,.1,.25,1)`

### HTML
- セマンティック要素使用（nav, main, section, button）
- インラインJS最小限
- data-* 属性活用
- テーマ適用: `<html data-style="xxx" data-color="xxx">`

### SVGチャート
既存ヘルパーを使用:
```javascript
window._svgDonut()
window._svgBarChart()
window._svgHBarChart()
window._svgStackedBar()
window._svgLineChart()
```

---

## 20. 既存API一覧

### earns-db.js（⛔変更不可・呼び出しのみ）
```javascript
window.getE()           // 全売上レコード
window.eByDate(dk)      // 日別
window.eByMonth(mk)     // 月別
window.sumA(arr)         // 金額合計
window.sumC(arr)         // 件数合計
window.addE(d, a, c, m, det, notify, timeOverride)
window.deleteE(ts)
window.updateE(ts, updates)
window.tdTot() / tdCnt() // 今日
window.moTot() / moCnt() // 今月
window.moDays()          // 今月稼働日数
window.wkData()          // 今週データ
window.initEarnsDB()     // 初期化（起動時に呼ぶ）
```

### storage.js（⛔変更不可・呼び出しのみ）
```javascript
window.S.g(key, default)  // 取得
window.S.s(key, value)    // 保存（同期連動）
window.S.si(key, value)   // 保存（同期なし）
window.setLocalSyncDirty(flag)
window.hasLocalSyncDirty()
window.isCloudSyncTrackedKey(key)
window.estimateDpStorageBytes()
```

### firebase-sync.js（⛔変更不可・呼び出しのみ）
```javascript
window.initFirebaseAuth()
window.firebaseSignInNow()
window.firebaseSignOut()
window.firebaseIsSignedIn()
window.firebaseGetUserName()
window.firebaseGetUserEmail()
window.firebaseGetUserPhoto()
window.firebaseGetSyncInfo()
window.firebaseGetSyncStatus()
window.firebaseManualSync()
window.showSyncPopup()
window.closeSyncPopup()
window.scheduleFirebaseRealtimeUpload(reason)
window.deleteCloudData()
window.onFirebaseSyncStatusChange(fn)
window.refreshSettingsModalIfOpen  // ← 新UIでは不要だが互換のため残す
```

### stats.js SVGヘルパー（呼び出し可）
```javascript
window._svgDonut(data, opts)
window._svgBarChart(data, opts)
window._svgHBarChart(data, opts)
window._svgStackedBar(data, opts)
window._svgLineChart(data, opts)
```

### PF/カテゴリ管理（呼び出し可）
```javascript
window.getAllPFs()
window.pfColor(name)
window.extractPf(memo)
window.pfOpts()
window.getAllExpCats()
window.imInit(type)
window.imGetActive(type)
window.imAdd(type, name)
window.imDelete(type, name)
window.imRename(type, oldName, newName)
window.imRestore(type, name)
```

### グローバルユーティリティ（新utils.jsに移植）
```javascript
window.TD       // 今日 "YYYY-MM-DD"
window.MK       // 今月 "YYYY-MM"
window.DAYS     // ['日','月',...]
window.dateKey(d)
window.fmt(n)
window.escHtml(s)
window.escJs(s)
window.toast(msg, ms)
window.hp()     // 触覚
window.customConfirm(msg, onYes, onNo)
window.customPrompt(msg, default, onSubmit, onCancel)
```