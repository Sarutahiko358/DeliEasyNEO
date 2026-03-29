/* ==========================================================
   DeliEasyNEO v3.0 — js/help.js
   ヘルプシステム（初回起動ガイド + ヘルプオーバーレイ）
   ========================================================== */
(function(){
  'use strict';

  /* S.r (remove) は storage.js に存在しないため定義 */
  if (typeof S !== 'undefined' && !S.r) {
    S.r = function(key) {
      try { localStorage.removeItem('dp_' + key); } catch(e) {}
    };
  }

  /* ========== A. オンボーディング（初回起動ガイド） ========== */

  var ONBOARDING_STEPS = [
    {
      id: 'welcome',
      icon: '🚀',
      title: 'DeliEasyNEOへようこそ！',
      subtitle: 'デリバリー配達員のための最強ツール',
      body: '売上も経費もこのアプリひとつで完結。\n毎日の稼ぎを「見える化」して、\nもっと効率的に稼ぎましょう！',
      highlight: '30秒で使い方がわかります 👇'
    },
    {
      id: 'record',
      icon: '✏️',
      title: 'ワンタップで売上記録',
      subtitle: '記録はたった3タップ',
      body: '画面右下の「＋」ボタンをタップ\n→ 金額を入力　　　\n→ 記録ボタンを押すだけ！\n\nUber Eats・出前館・Woltなど\nプラットフォーム別に自動集計されます。',
      highlight: '1日の記録にかかる時間はわずか数秒 ⚡'
    },
    {
      id: 'home',
      icon: '🏠',
      title: 'ホーム画面は自分だけの形に',
      subtitle: 'ウィジェットを自由に配置',
      body: '今日の売上、件数、単価、カレンダー…\n必要な情報だけをホーム画面に並べられます。\n\nウィジェットを長押しで編集モードに。\n複数のレイアウトを保存して\n場面ごとに切り替えも可能です。',
      highlight: '長押しで編集モードに入れます 🎯'
    },
    {
      id: 'sidebar',
      icon: '📱',
      title: 'すべての機能にすぐアクセス',
      subtitle: '左上の ☰ をタップ',
      body: 'カレンダーで月間の売上を俯瞰\n統計で稼ぎのパターンを分析\n税金計算で確定申告もラクラク\n経費管理で利益を正確に把握\n\n…すべてメニューから開けます。',
      highlight: '左端からスワイプでも開けます 👆'
    },
    {
      id: 'rightPanel',
      icon: '📊',
      title: 'サッと確認、右パネル',
      subtitle: '画面右端から左にスワイプ',
      body: '今日のサマリーや直近の記録を\nホーム画面を離れずにチェックできます。\n\n配達の合間にサッと確認するのに\nぴったりの機能です。',
      highlight: '右端からスワイプで表示 📋'
    },
    {
      id: 'calendar',
      icon: '📅',
      title: 'カレンダーで一目瞭然',
      subtitle: '稼いだ日がひと目でわかる',
      body: '月間の売上をヒートマップで表示。\n色が濃い日ほどよく稼いだ日です。\n\n日付をタップすると詳細が開き、\nその場で売上の追加・編集もできます。\nスワイプで日付を前後に移動。',
      highlight: '稼ぎのパターンが見えてきます 🔥'
    },
    {
      id: 'sync',
      icon: '☁️',
      title: 'データは安全にクラウドへ',
      subtitle: 'Googleアカウントで同期',
      body: 'ログインするだけで自動的に\nクラウドにバックアップされます。\n\nスマホを買い替えても、\nPCからアクセスしても、\nデータはいつも最新の状態です。',
      highlight: '設定 → クラウド同期からログイン 🔐'
    },
    {
      id: 'customize',
      icon: '🎨',
      title: 'あなた好みにカスタマイズ',
      subtitle: '360通りのテーマを用意',
      body: '18種類のデザインスタイル\n× 20色のカラーパレット\n= 360通りの組み合わせ！\n\nトップバー、FAB、ボトムバーの配置も\nメモ帳やチェックリストの追加も\nすべて自由自在です。',
      highlight: '使いながら少しずつ発見してください ✨'
    }
  ];

  var _currentStep = 0;
  var _obOverlay = null;
  var _swipeLocked = false;

  /* ---------- オンボーディング表示チェック ---------- */
  function checkAndShowOnboarding() {
    if (S.g('onboarding_completed', false)) return;
    var savedStep = S.g('onboarding_step', 0);
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

    _obOverlay.addEventListener('touchstart', function(e) {
      if (e.touches.length !== 1) return;
      _swStartX = e.touches[0].clientX;
      _swStartY = e.touches[0].clientY;
    }, { passive: true });

    _obOverlay.addEventListener('touchend', function(e) {
      if (_swipeLocked) return;
      var dx = e.changedTouches[0].clientX - _swStartX;
      var dy = e.changedTouches[0].clientY - _swStartY;
      if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.7) return;

      _swipeLocked = true;
      setTimeout(function() { _swipeLocked = false; }, 400);

      if (dx < 0 && _currentStep < ONBOARDING_STEPS.length - 1) {
        _currentStep++;
        S.si('onboarding_step', _currentStep);
        _renderOnboardingStep('left');
      } else if (dx > 0 && _currentStep > 0) {
        _currentStep--;
        S.si('onboarding_step', _currentStep);
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
      navHtml += '<button class="btn btn-ghost btn-sm" onclick="_obPrev()">◀ 戻る</button>';
    } else {
      navHtml += '<span></span>';
    }
    navHtml += '<span class="onboarding-step-label">' + (_currentStep + 1) + ' / ' + total + '</span>';
    if (isLast) {
      navHtml += '<button class="btn btn-primary btn-sm" onclick="_obComplete()" style="min-width:120px">🎉 はじめる！</button>';
    } else {
      navHtml += '<button class="btn btn-primary btn-sm" onclick="_obNext()" style="min-width:100px">次へ →</button>';
    }
    navHtml += '</div>';

    /* ハイライトテキスト */
    var highlightHtml = '';
    if (step.highlight) {
      highlightHtml = '<div class="onboarding-highlight">' + escHtml(step.highlight) + '</div>';
    }

    /* サブタイトル */
    var subtitleHtml = '';
    if (step.subtitle) {
      subtitleHtml = '<div class="onboarding-subtitle">' + escHtml(step.subtitle) + '</div>';
    }

    _obOverlay.innerHTML =
      '<div class="onboarding-card' + animClass + '">' +
        '<div class="onboarding-icon">' + step.icon + '</div>' +
        '<div class="onboarding-title">' + escHtml(step.title) + '</div>' +
        subtitleHtml +
        '<div class="onboarding-body">' + escHtml(step.body) + '</div>' +
        highlightHtml +
        dotsHtml +
        navHtml +
        '<button class="onboarding-skip" onclick="_obSkip()">あとで見る</button>' +
      '</div>';
  }

  /* ---------- ボタンハンドラ（グローバル公開） ---------- */
  window._obNext = function() {
    if (typeof hp === 'function') hp();
    if (_currentStep < ONBOARDING_STEPS.length - 1) {
      _currentStep++;
      S.si('onboarding_step', _currentStep);
      _renderOnboardingStep('left');
    }
  };

  window._obPrev = function() {
    if (typeof hp === 'function') hp();
    if (_currentStep > 0) {
      _currentStep--;
      S.si('onboarding_step', _currentStep);
      _renderOnboardingStep('right');
    }
  };

  window._obComplete = function() {
    if (typeof hp === 'function') hp();
    _completeOnboarding();
  };

  window._obSkip = function() {
    if (typeof hp === 'function') hp();
    _pauseOnboarding();
  };

  /* ---------- オンボーディング完了 ---------- */
  function _completeOnboarding() {
    S.s('onboarding_completed', true);
    S.r('onboarding_step');
    _closeOnboarding();
    if (typeof toast === 'function') toast('🎉 セットアップ完了！まずは「＋」ボタンから売上を記録してみましょう');
  }

  /* ---------- オンボーディング中断 ---------- */
  function _pauseOnboarding() {
    S.si('onboarding_step', _currentStep);
    _closeOnboarding();
    if (typeof toast === 'function') toast('💡 ヘルプはサイドバーの「❓ ヘルプ」からいつでも見られます');
  }

  /* ---------- オンボーディング閉じる ---------- */
  function _closeOnboarding() {
    if (!_obOverlay) return;
    _obOverlay.style.animation = 'v2-fade-out .25s forwards';
    setTimeout(function() {
      if (_obOverlay && _obOverlay.parentNode) {
        _obOverlay.parentNode.removeChild(_obOverlay);
      }
      _obOverlay = null;
    }, 250);
  }

  /* ---------- オンボーディング再表示 ---------- */
  function restartOnboarding() {
    S.r('onboarding_completed');
    S.si('onboarding_step', 0);
    _currentStep = 0;
    if (typeof closeOverlay === 'function') closeOverlay();
    setTimeout(function() {
      _showOnboarding();
    }, 400);
  }


  /* ========== B. ヘルプオーバーレイ ========== */

  var HELP_SECTIONS = [
    {
      id: 'quickStart',
      title: '🚀 クイックスタート',
      content: [
        { q: '売上を記録するには？', a: '画面右下の「＋」ボタンをタップ → 「✏️ 売上」を選択 → 金額を入力 → 「記録する」をタップします。プラットフォーム（Uber Eats、出前館等）を選択すると、PF別の集計ができます。' },
        { q: '経費を記録するには？', a: '「＋」ボタン → 「💸 経費」を選択 → カテゴリ（ガソリン、通信費等）と金額を入力して記録します。' },
        { q: '今日の売上を確認するには？', a: 'ホーム画面のウィジェットに表示されています。ウィジェットをタップすると詳細な統計が開きます。' }
      ]
    },
    {
      id: 'homeCustom',
      title: '🏠 ホーム画面のカスタマイズ',
      content: [
        { q: 'ウィジェットを追加/削除するには？', a: 'ウィジェットを長押しすると編集モードに入ります。「＋ ウィジェットを追加」で新しいウィジェットを追加、各ウィジェットの「✕」で削除できます。ドラッグで並び替えも可能です。' },
        { q: 'プリセットとは？', a: 'ホーム画面の構成（ウィジェットの種類・配置）を名前をつけて保存したものです。配達中用、振り返り用など場面に合わせて複数作り、ワンタップで切り替えられます。' },
        { q: 'デスクトップとモバイルで別のレイアウトにできる？', a: 'はい。プリセットはモバイル（〜1023px）とデスクトップ（1024px〜）で個別にウィジェット配置を管理しています。' }
      ]
    },
    {
      id: 'navigation',
      title: '📱 操作方法',
      content: [
        { q: 'サイドバーの開き方は？', a: '左上の「☰」ボタンをタップするか、画面の左端から右にスワイプします。' },
        { q: '右パネルの開き方は？', a: '画面の右端から左にスワイプします。今日のサマリーや直近の記録をすばやく確認できます。' },
        { q: 'FAB（＋ボタン）を移動できる？', a: 'はい。FABボタンを長押しすると自由にドラッグで配置を変えられます。' },
        { q: 'ボトムバーは使える？', a: 'デフォルトでは非表示です。設定 → 詳細設定 → ボトムバー設定 から有効化できます。' }
      ]
    },
    {
      id: 'features',
      title: '📊 主な機能',
      content: [
        { q: 'カレンダー', a: '月間の売上をヒートマップで確認できます。日付をタップすると日別の詳細が表示されます。スワイプで日付を移動できます。' },
        { q: '統計', a: '日・週・月・3ヶ月・年の各期間で売上・件数・単価・利益の推移を確認できます。PF別分析、曜日別パフォーマンスなども表示されます。' },
        { q: 'スプレッドシート', a: '月単位のスプレッドシート形式で売上・経費を管理できます。セルをタップして直接編集も可能です。' },
        { q: '税金計算', a: '年間の所得税・住民税・国保の概算を計算できます。ふるさと納税の上限目安も計算できます。' },
        { q: 'カスタムオーバーレイ', a: 'メモ帳、チェックリスト、リンク集、ダッシュボードの4種類を自由に作成できます。' }
      ]
    },
    {
      id: 'sync',
      title: '☁️ クラウド同期',
      content: [
        { q: '設定方法は？', a: '設定 → クラウド同期 → 「Googleでログイン」をタップします。' },
        { q: '複数端末で共有するには？', a: '同じGoogleアカウントで各端末にログインすれば自動的にデータが同期されます。' },
        { q: 'オフライン時は？', a: 'オフラインでも通常通り記録できます。オンラインに復帰すると自動で同期されます。' }
      ]
    },
    {
      id: 'theme',
      title: '🎨 テーマ',
      content: [
        { q: 'テーマの変え方は？', a: 'サイドバー → 「🎨 テーマ」を開きます。18スタイル×20カラーの360通りの外観を楽しめます。' },
        { q: 'ダークモードはある？', a: 'はい。カラーパレットの「🌙 ダーク」セクションから8種類のダークテーマを選べます。' }
      ]
    },
    {
      id: 'data',
      title: '💾 データ管理',
      content: [
        { q: 'バックアップ方法は？', a: '設定 → データ管理 → 「💾 バックアップ」でJSONファイルとしてダウンロードできます。' },
        { q: 'データの復元方法は？', a: '設定 → データ管理 → 「📂 JSONファイルから復元」でバックアップファイルを読み込みます。' }
      ]
    },
    {
      id: 'tips',
      title: '💡 便利な使い方',
      content: [
        { q: 'ミニカレンダーから直接記録', a: 'ホーム画面のミニカレンダーの日付をタップすると、その日のカレンダー詳細が開きます。' },
        { q: 'PFの追加', a: '売上入力画面でPF一覧の右にある「＋ 追加」ボタンから新しいプラットフォームを追加できます。' },
        { q: 'まとめ記録', a: '売上入力画面で「▼ 件数を変更する」を開くと、複数件をまとめて記録できます。' }
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
        html += '<span>' + escHtml(item.q) + '</span>';
        html += '<span class="help-faq-arrow">▼</span>';
        html += '</div>';
        html += '<div class="help-faq-a"><div class="help-faq-a-inner">' + escHtml(item.a) + '</div></div>';
        html += '</div>';
      }
      html += '</div>';
    }

    /* 初回ガイド再表示ボタン */
    html += '<button class="btn btn-ghost btn-sm help-restart-btn" onclick="restartOnboarding()">';
    html += '🔄 初回ガイドをもう一度見る';
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


  /* ========== グローバル公開 ========== */
  window.checkAndShowOnboarding = checkAndShowOnboarding;
  window.restartOnboarding = restartOnboarding;
  window.renderOverlay_help = renderOverlay_help;
  window.toggleHelpFaq = toggleHelpFaq;

})();
