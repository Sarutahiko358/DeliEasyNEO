/* ==========================================================
   DeliEasyNEO v3.0 — js/help.js
   ヘルプシステム（初回起動ガイド + ヘルプオーバーレイ）
   ========================================================== */
(function(){
  'use strict';

  if (!S.r) {
    S.r = function(key) {
      try { localStorage.removeItem('dp_' + key); } catch(e) {}
    };
  }

  /* ========== A. オンボーディング（初回起動ガイド） ========== */

  var ONBOARDING_STEPS = [
    {
      id: 'welcome',
      icon: '\uD83D\uDC4B',
      title: 'DeliEasyNEOへようこそ！',
      body: 'デリバリー配達員のための売上管理アプリです。\n毎日の売上・経費を簡単に記録し、\n収支を見える化しましょう。'
    },
    {
      id: 'record',
      icon: '\u270F\uFE0F',
      title: '売上を記録する',
      body: '画面右下の「＋」ボタンをタップすると\n売上や経費を記録できます。\nテンキーまたは直接入力で金額を入力し、\nプラットフォーム（Uber Eats, 出前館等）を選んで記録します。'
    },
    {
      id: 'home',
      icon: '\uD83C\uDFE0',
      title: 'ホーム画面はカスタム自在',
      body: 'ホーム画面のウィジェットは自由に追加・削除・並び替えできます。\nウィジェットを長押しすると編集モードに入ります。\n\n複数のプリセットを作って\n場面に応じて切り替えることもできます。\n（例: 配達中用、振り返り用、月末分析用など）'
    },
    {
      id: 'sidebar',
      icon: '\u2630',
      title: '左サイドバー（メニュー）',
      body: '左上の「☰」をタップするか、\n画面左端から右にスワイプするとメニューが開きます。\n\nカレンダー、統計、税金計算、経費管理など\nすべての機能にここからアクセスできます。'
    },
    {
      id: 'rightPanel',
      icon: '\uD83D\uDCCA',
      title: '右パネル（情報パネル）',
      body: '画面右端から左にスワイプすると\n情報パネルが開きます。\n\n今日のサマリーや直近の記録を\nサッと確認できます。'
    },
    {
      id: 'calendar',
      icon: '\uD83D\uDCC5',
      title: 'カレンダーで振り返り',
      body: 'カレンダー画面では月間の売上を\nヒートマップで一覧できます。\n日付をタップすると詳細が表示され、\nその日の売上・経費の追加や編集もできます。\n\nスワイプで日付を前後に移動できます。'
    },
    {
      id: 'sync',
      icon: '\u2601\uFE0F',
      title: 'クラウド同期',
      body: 'Googleアカウントでログインすると\n複数の端末でデータを同期できます。\n\n設定 → クラウド同期 からログインしてください。\nデータは自動で同期されます。'
    },
    {
      id: 'customize',
      icon: '\uD83C\uDFA8',
      title: '自分好みにカスタマイズ',
      body: 'テーマは18スタイル×20カラーの360通り！\nトップバー、ボトムバー、FABの配置も自由自在。\n\nメモ帳、チェックリスト、リンク集など\nカスタムオーバーレイも作れます。\n\n使いながら少しずつ発見してみてください。'
    }
  ];

  var _currentStep = 0;
  var _obOverlay = null;

  /* ---------- オンボーディング表示チェック ---------- */
  function checkAndShowOnboarding() {
    if (S.g('dp_onboarding_completed', false)) return;
    var savedStep = S.g('dp_onboarding_step', 0);
    _currentStep = (typeof savedStep === 'number' && savedStep >= 0 && savedStep < ONBOARDING_STEPS.length) ? savedStep : 0;
    _showOnboarding();
  }

  /* ---------- オンボーディング表示 ---------- */
  function _showOnboarding() {
    if (_obOverlay) return;

    _obOverlay = document.createElement('div');
    _obOverlay.className = 'onboarding-overlay';
    _obOverlay.id = 'onboarding-overlay';

    _renderOnboardingStep();
    document.body.appendChild(_obOverlay);

    /* スワイプ対応 */
    var _swStartX = 0;
    var _swStartY = 0;
    var _swTracking = false;

    _obOverlay.addEventListener('touchstart', function(e) {
      if (e.touches.length !== 1) return;
      _swStartX = e.touches[0].clientX;
      _swStartY = e.touches[0].clientY;
      _swTracking = true;
    }, { passive: true });

    _obOverlay.addEventListener('touchend', function(e) {
      if (!_swTracking) return;
      _swTracking = false;
      var dx = e.changedTouches[0].clientX - _swStartX;
      var dy = e.changedTouches[0].clientY - _swStartY;
      if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
      if (dx < 0 && _currentStep < ONBOARDING_STEPS.length - 1) {
        _currentStep++;
        _renderOnboardingStep('left');
      } else if (dx > 0 && _currentStep > 0) {
        _currentStep--;
        _renderOnboardingStep('right');
      }
    }, { passive: true });
  }

  /* ---------- ステップ描画 ---------- */
  function _renderOnboardingStep(direction) {
    if (!_obOverlay) return;
    var step = ONBOARDING_STEPS[_currentStep];
    var total = ONBOARDING_STEPS.length;
    var isFirst = _currentStep === 0;
    var isLast = _currentStep === total - 1;

    var animClass = '';
    if (direction === 'left') animClass = ' onboarding-card-enter-left';
    else if (direction === 'right') animClass = ' onboarding-card-enter-right';

    /* ドットインジケーター */
    var dotsHtml = '<div class="onboarding-dots">';
    for (var i = 0; i < total; i++) {
      dotsHtml += '<div class="onboarding-dot' + (i === _currentStep ? ' active' : '') + '"></div>';
    }
    dotsHtml += '</div>';

    /* ナビゲーション */
    var navHtml = '<div class="onboarding-nav">';
    if (!isFirst) {
      navHtml += '<button class="btn btn-ghost btn-sm" id="ob-prev">\u25C0 戻る</button>';
    } else {
      navHtml += '<span></span>';
    }
    navHtml += '<span class="onboarding-step-label">' + (_currentStep + 1) + '/' + total + '</span>';
    if (isLast) {
      navHtml += '<button class="btn btn-primary btn-sm" id="ob-next">はじめる！</button>';
    } else {
      navHtml += '<button class="btn btn-primary btn-sm" id="ob-next">次へ →</button>';
    }
    navHtml += '</div>';

    _obOverlay.innerHTML =
      '<div class="onboarding-card' + animClass + '">' +
        '<div class="onboarding-icon">' + step.icon + '</div>' +
        '<div class="onboarding-title">' + step.title + '</div>' +
        '<div class="onboarding-body">' + step.body + '</div>' +
        dotsHtml +
        navHtml +
        '<button class="onboarding-skip" id="ob-skip">あとで見る</button>' +
      '</div>';

    /* ボタンイベント */
    var nextBtn = document.getElementById('ob-next');
    var prevBtn = document.getElementById('ob-prev');
    var skipBtn = document.getElementById('ob-skip');

    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        if (typeof hp === 'function') hp();
        if (isLast) {
          _completeOnboarding();
        } else {
          _currentStep++;
          _renderOnboardingStep('left');
        }
      });
    }
    if (prevBtn) {
      prevBtn.addEventListener('click', function() {
        if (typeof hp === 'function') hp();
        if (_currentStep > 0) {
          _currentStep--;
          _renderOnboardingStep('right');
        }
      });
    }
    if (skipBtn) {
      skipBtn.addEventListener('click', function() {
        if (typeof hp === 'function') hp();
        _pauseOnboarding();
      });
    }
  }

  /* ---------- オンボーディング完了 ---------- */
  function _completeOnboarding() {
    S.s('dp_onboarding_completed', true);
    S.r('dp_onboarding_step');
    _closeOnboarding();
    if (typeof toast === 'function') toast('セットアップ完了！');
  }

  /* ---------- オンボーディング中断 ---------- */
  function _pauseOnboarding() {
    S.s('dp_onboarding_step', _currentStep);
    _closeOnboarding();
  }

  /* ---------- オンボーディング閉じる ---------- */
  function _closeOnboarding() {
    if (!_obOverlay) return;
    _obOverlay.style.animation = 'v2-fade-out .2s forwards';
    setTimeout(function() {
      if (_obOverlay && _obOverlay.parentNode) {
        _obOverlay.parentNode.removeChild(_obOverlay);
      }
      _obOverlay = null;
    }, 200);
  }

  /* ---------- オンボーディング再表示（ヘルプ内から呼ぶ） ---------- */
  function restartOnboarding() {
    S.r('dp_onboarding_completed');
    S.s('dp_onboarding_step', 0);
    _currentStep = 0;
    /* ヘルプオーバーレイを閉じる */
    if (typeof closeOverlay === 'function') closeOverlay();
    setTimeout(function() {
      _showOnboarding();
    }, 400);
  }


  /* ========== B. ヘルプオーバーレイ ========== */

  var HELP_SECTIONS = [
    {
      id: 'quickStart',
      title: '\uD83D\uDE80 クイックスタート',
      content: [
        { q: '売上を記録するには？', a: '画面右下の「＋」ボタンをタップ → 「✏️ 売上」を選択 → 金額を入力 → 「記録する」をタップします。プラットフォーム（Uber Eats、出前館等）を選択すると、PF別の集計ができます。' },
        { q: '経費を記録するには？', a: '「＋」ボタン → 「💸 経費」を選択 → カテゴリ（ガソリン、通信費等）と金額を入力して記録します。' },
        { q: '今日の売上を確認するには？', a: 'ホーム画面のウィジェットに表示されています。ウィジェットをタップすると詳細な統計が開きます。' }
      ]
    },
    {
      id: 'homeCustom',
      title: '\uD83C\uDFE0 ホーム画面のカスタマイズ',
      content: [
        { q: 'ウィジェットを追加/削除するには？', a: 'ウィジェットを長押しすると編集モードに入ります。「＋ ウィジェットを追加」で新しいウィジェットを追加、各ウィジェットの「✕」で削除できます。ドラッグで並び替えも可能です。' },
        { q: 'プリセットとは？', a: 'ホーム画面の構成（ウィジェットの種類・配置）を名前をつけて保存したものです。配達中用、振り返り用など場面に合わせて複数作り、ワンタップで切り替えられます。' },
        { q: 'デスクトップとモバイルで別のレイアウトにできる？', a: 'はい。プリセットはモバイル（〜1023px）とデスクトップ（1024px〜）で個別にウィジェット配置を管理しています。編集モードで各モードのレイアウトを独立して設定できます。' }
      ]
    },
    {
      id: 'navigation',
      title: '\uD83D\uDCF1 操作方法',
      content: [
        { q: 'サイドバー（メニュー）の開き方は？', a: '左上の「☰」ボタンをタップするか、画面の左端から右にスワイプします。' },
        { q: '右パネル（情報パネル）の開き方は？', a: '画面の右端から左にスワイプします。今日のサマリーや直近の記録をすばやく確認できます。' },
        { q: 'FAB（＋ボタン）を移動できる？', a: 'はい。FABボタンを長押しすると自由にドラッグで配置を変えられます。位置はプリセットごとに保存されます。' },
        { q: 'ボトムバーは使える？', a: 'デフォルトでは非表示です。設定 → 詳細設定 → ボトムバー設定 から有効化できます。3〜6個のショートカットを配置できます。' }
      ]
    },
    {
      id: 'features',
      title: '\uD83D\uDCCA 主な機能',
      content: [
        { q: 'カレンダー', a: '月間の売上をヒートマップで確認できます。日付をタップすると日別の詳細（売上追加・PF別内訳・経費管理）が表示されます。左右スワイプで日付を移動できます。' },
        { q: '統計', a: '日・週・月・3ヶ月・年の各期間で売上・件数・単価・利益の推移を確認できます。PF別分析、曜日別パフォーマンス、単価分布なども表示されます。' },
        { q: 'スプレッドシート', a: '月単位のスプレッドシート形式で売上・経費を管理できます。PF別列や経費カテゴリ列を自由に追加でき、セルをタップして直接編集も可能です。' },
        { q: '税金計算', a: '年間の所得税・住民税・国保の概算を計算できます。青色申告控除や各種所得控除に対応。ふるさと納税の上限目安も計算できます。' },
        { q: '経費管理', a: 'カテゴリ別の経費を記録・管理できます。月次/年度でのカテゴリ別内訳グラフも表示されます。' },
        { q: 'カスタムオーバーレイ', a: 'メモ帳、チェックリスト、リンク集、ダッシュボードの4種類を自由に作成できます。サイドバーに自動追加され、いつでもアクセスできます。' }
      ]
    },
    {
      id: 'sync',
      title: '\u2601\uFE0F クラウド同期',
      content: [
        { q: 'クラウド同期の設定方法は？', a: '設定 → クラウド同期 → 「Googleでログイン」をタップします。ログイン後、データは自動的にクラウドに同期されます。' },
        { q: '複数端末でデータを共有するには？', a: '同じGoogleアカウントで各端末にログインすれば、自動的にデータが同期されます。初回ログイン時に「端末のデータを送る」「クラウドのデータを入れる」「両方を統合する」から選べます。' },
        { q: 'オフライン時はどうなる？', a: 'オフラインでも通常通り記録できます。オンラインに復帰すると自動で同期されます。' },
        { q: '同期がおかしい時は？', a: '設定 → クラウド同期 → 「同期がおかしい場合」を開き、手動で「端末を優先」「クラウドを優先」「統合」から選んで修復できます。' }
      ]
    },
    {
      id: 'theme',
      title: '\uD83C\uDFA8 テーマ',
      content: [
        { q: 'テーマの変え方は？', a: 'サイドバー → 「🎨 テーマ」を開きます。デザインスタイル（18種）とカラーパレット（20色）を自由に組み合わせて、360通りの外観を楽しめます。' },
        { q: 'ダークモードはある？', a: 'はい。カラーパレットの「🌙 ダーク」セクションから8種類のダークテーマを選べます。' }
      ]
    },
    {
      id: 'data',
      title: '\uD83D\uDCBE データ管理',
      content: [
        { q: 'データのバックアップ方法は？', a: '設定 → データ管理 → 「💾 バックアップ」でJSONファイルとしてダウンロードできます。売上CSVや経費CSVの個別エクスポートも可能です。' },
        { q: 'データの復元方法は？', a: '設定 → データ管理 → 「📂 JSONファイルから復元」でバックアップファイルを読み込みます。' },
        { q: 'データを全部消したい場合は？', a: '設定 → データ管理 → 「🗑 データの削除」から端末のデータやクラウドのデータを削除できます。削除前にバックアップを取ることを強くお勧めします。' }
      ]
    },
    {
      id: 'tips',
      title: '\uD83D\uDCA1 便利な使い方',
      content: [
        { q: 'キーボードショートカット', a: 'Escapeキーでオーバーレイ/サイドバー/右パネル/確認ダイアログを閉じられます。' },
        { q: 'ミニカレンダーから直接記録', a: 'ホーム画面のミニカレンダーの日付をタップすると、その日のカレンダー詳細が開き、売上や経費をすぐに追加できます。' },
        { q: 'PFの追加', a: '売上入力画面でPF一覧の右にある「＋ 追加」ボタンから、その場で新しいプラットフォームを追加できます。' },
        { q: 'まとめ記録', a: '売上入力画面で「▼ 件数を変更する」を開くと、複数件をまとめて1回で記録できます。' }
      ]
    }
  ];

  /* ---------- ヘルプオーバーレイ描画 ---------- */
  function renderOverlay_help(body) {
    var html = '';

    for (var s = 0; s < HELP_SECTIONS.length; s++) {
      var sec = HELP_SECTIONS[s];
      html += '<div class="help-section">';
      html += '<div class="help-section-title">' + sec.title + '</div>';

      for (var q = 0; q < sec.content.length; q++) {
        var item = sec.content[q];
        var itemId = 'help-faq-' + sec.id + '-' + q;
        html += '<div class="help-faq-item" id="' + itemId + '">';
        html += '<div class="help-faq-q" onclick="toggleHelpFaq(\'' + itemId + '\')">';
        html += '<span>' + _escHelpHtml(item.q) + '</span>';
        html += '<span class="help-faq-arrow">\u25BC</span>';
        html += '</div>';
        html += '<div class="help-faq-a"><div class="help-faq-a-inner">' + _escHelpHtml(item.a) + '</div></div>';
        html += '</div>';
      }
      html += '</div>';
    }

    /* 初回ガイド再表示ボタン */
    html += '<button class="btn btn-ghost btn-sm help-restart-btn" onclick="restartOnboarding()">';
    html += '\uD83D\uDD04 初回ガイドをもう一度見る';
    html += '</button>';

    body.innerHTML = html;
  }

  /* ---------- FAQ開閉 ---------- */
  function toggleHelpFaq(id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (typeof hp === 'function') hp();
    el.classList.toggle('open');
  }

  /* ---------- HTMLエスケープ（ヘルプ用簡易版） ---------- */
  function _escHelpHtml(str) {
    if (typeof escHtml === 'function') return escHtml(str);
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }


  /* ========== グローバル公開 ========== */
  window.checkAndShowOnboarding = checkAndShowOnboarding;
  window.restartOnboarding = restartOnboarding;
  window.renderOverlay_help = renderOverlay_help;
  window.toggleHelpFaq = toggleHelpFaq;

})();
