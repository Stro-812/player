/* «Не про бег» — плеер и интерактив страницы.
   Данные эпизодов и глав — в data.js (сгенерирован из data/*.json). */
(function () {
  'use strict';

  /* ---------- Пары: одна пара за раз ---------- */
  (function () {
    var game = document.querySelector('.pairs-game');
    if (!game) return;
    var stage = game.querySelector('.pairs-stage');
    var cards = Array.prototype.slice.call(stage.querySelectorAll('.pair-card'));
    var count = game.querySelector('.pairs-count');
    var idx = 0;

    function reset(card) {
      card.querySelector('.pair-answer').hidden = true;
      card.querySelector('.pair-show').hidden = false;
    }
    // Переход по кругу; ответ новой пары снова скрыт.
    function show(i, focus) {
      cards[idx].hidden = true;
      idx = (i + cards.length) % cards.length;
      reset(cards[idx]);
      cards[idx].hidden = false;
      count.textContent = (idx + 1) + ' из ' + cards.length;
      if (focus) cards[idx].querySelector('.pair-words').focus({ preventScroll: true });
    }

    cards.forEach(function (card) {
      card.querySelector('.pair-show').addEventListener('click', function () {
        this.hidden = true;
        card.querySelector('.pair-answer').hidden = false;
      });
    });
    game.querySelector('.pairs-prev').addEventListener('click', function () { show(idx - 1, false); });
    game.querySelector('.pairs-next').addEventListener('click', function () { show(idx + 1, true); });

    // Стрелки клавиатуры — когда раздел на экране и фокус не в поле ввода или ползунке.
    var inView = false;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { inView = es[0].isIntersecting; }, { threshold: 0.4 }).observe(stage);
    }
    document.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (!inView && !game.contains(t)) return;
      e.preventDefault();
      show(idx + (e.key === 'ArrowRight' ? 1 : -1), e.key === 'ArrowRight');
    });

    // Свайп на телефоне.
    var x0 = null, y0 = 0;
    stage.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    stage.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(idx + (dx < 0 ? 1 : -1), dx < 0);
    }, { passive: true });
  })();

  /* ---------- Цитаты: поделиться ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.share'), function (btn) {
    btn.addEventListener('click', function () {
      var q = btn.parentNode.querySelector('blockquote');
      var text = (q ? q.textContent.trim() : '') + ' — Юрий Строфилов, «Не про бег»';
      var url = location.origin + location.pathname;
      if (navigator.share) {
        navigator.share({ text: text, url: url }).catch(function () {});
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text + '\n' + url).then(function () {
          btn.textContent = 'Скопировано';
          setTimeout(function () { btn.textContent = 'Поделиться'; }, 2000);
        });
      }
    });
  });

  /* ---------- Плеер ---------- */
  var D = window.NPB_DATA;
  var audio = document.getElementById('audio');
  var playerEl = document.getElementById('player');
  if (!D || !audio || !playerEl) return;

  var EPS = D.episodes;
  var CH = D.chapters;
  function $(id) { return document.getElementById(id); }
  var el = {
    ep: $('p-ep'), title: $('p-title'), chapter: $('p-chapter'), seek: $('p-seek'),
    cur: $('p-cur'), dur: $('p-dur'), play: $('p-play'), back: $('p-back'), fwd: $('p-fwd'),
    speed: $('p-speed'), status: $('p-status'), error: $('p-error'),
    chapters: $('p-chapters'), episodes: $('p-episodes'),
    mini: $('mini'), mplay: $('m-play'), mtitle: $('m-title'), mtime: $('m-time')
  };

  var store = {
    get: function (k) { try { return localStorage.getItem('npb:' + k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('npb:' + k, String(v)); } catch (e) {} }
  };

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hms(s) {
    s = Math.max(0, Math.floor(s || 0));
    return pad(Math.floor(s / 3600)) + ':' + pad(Math.floor((s % 3600) / 60)) + ':' + pad(s % 60);
  }
  function abs(path) { return new URL(path, location.href).href; }

  var current = null;      // текущий эпизод
  var pending = null;      // куда перемотать, когда файл начнёт загружаться
  var started = false;     // слушатель хотя бы раз нажал «Слушать»
  var dragging = false;    // ползунок тянут
  var lastSaved = 0;
  var lastChapterIdx = -2;
  var SPEEDS = [1, 1.25, 1.5, 1.75, 2];
  var speedIdx = 0;

  function epByN(n) { for (var i = 0; i < EPS.length; i++) { if (EPS[i].n === n) return EPS[i]; } return null; }
  function chaptersOf(n) { return CH[String(n)] || []; }
  function chapterIndexAt(n, t) {
    var list = chaptersOf(n), idx = -1;
    for (var i = 0; i < list.length; i++) { if (t + 0.5 >= list[i][0]) idx = i; }
    return idx;
  }
  function duration() { return (audio.duration && isFinite(audio.duration)) ? audio.duration : (current ? current.duration : 0); }
  function position() { return pending != null ? pending : (audio.readyState >= 1 ? audio.currentTime : 0); }

  function setStatus(text) { el.status.textContent = text || ''; }
  function showError() {
    el.error.textContent = 'Не удалось загрузить эпизод. Проверьте подключение к интернету и нажмите «Слушать» ещё раз.';
    el.error.hidden = false;
  }
  function hideError() { el.error.hidden = true; }

  function renderEpisodes() {
    el.episodes.innerHTML = '';
    EPS.forEach(function (e) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.n = e.n;
      b.innerHTML = '<span class="t"></span><span class="n"></span><span class="d"></span>';
      b.children[0].textContent = pad(e.n);
      b.children[1].textContent = e.title;
      b.children[2].textContent = hms(e.duration);
      b.addEventListener('click', function () { load(e.n, null, true); });
      li.appendChild(b);
      el.episodes.appendChild(li);
    });
  }

  function renderChapters() {
    el.chapters.innerHTML = '';
    chaptersOf(current.n).forEach(function (c) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = '<span class="t"></span><span class="n"></span>';
      b.children[0].textContent = hms(c[0]);
      b.children[1].textContent = c[1];
      b.addEventListener('click', function () { seekTo(c[0], true); });
      li.appendChild(b);
      el.chapters.appendChild(li);
    });
  }

  function markEpisode() {
    Array.prototype.forEach.call(el.episodes.querySelectorAll('button'), function (b) {
      b.setAttribute('aria-current', String(Number(b.dataset.n) === current.n));
    });
  }

  function markChapter(t) {
    var idx = chapterIndexAt(current.n, t);
    if (idx === lastChapterIdx) return;
    lastChapterIdx = idx;
    Array.prototype.forEach.call(el.chapters.querySelectorAll('button'), function (b, i) {
      b.setAttribute('aria-current', String(i === idx));
    });
    var list = chaptersOf(current.n);
    var name = idx >= 0 ? list[idx][1] : 'Вступление';
    el.chapter.textContent = name;
    el.mtitle.textContent = 'Эпизод ' + current.n + '. ' + (idx >= 0 ? name : current.title);
    updateMediaMetadata(idx >= 0 ? name : current.title);
  }

  function updateTime(t) {
    if (!dragging) el.seek.value = Math.floor(t);
    el.cur.textContent = hms(t);
    el.mtime.textContent = hms(t) + ' / ' + hms(duration());
  }

  function savePos() {
    if (current) store.set('pos:' + current.n, Math.floor(position()));
  }

  function load(n, t, autoplay) {
    var e = epByN(n);
    if (!e) return;
    hideError();
    if (!current || current.n !== n) {
      if (current) savePos();
      current = e;
      audio.src = e.url;
      store.set('last', n);
      el.ep.textContent = 'Эпизод ' + n;
      el.title.textContent = e.title;
      el.seek.max = Math.round(e.duration);
      el.dur.textContent = hms(e.duration);
      renderChapters();
      markEpisode();
      lastChapterIdx = -2;
      if (t == null) {
        var saved = parseFloat(store.get('pos:' + n));
        t = (saved > 5 && saved < e.duration - 15) ? saved : 0;
        setStatus(t > 0 ? 'Продолжим с ' + hms(t) : '');
      } else {
        setStatus('');
      }
      pending = t;
      updateTime(t);
      markChapter(t);
    } else if (t != null) {
      seekTo(t, false);
    }
    if (autoplay) play();
  }

  function seekTo(t, autoplay) {
    var d = duration();
    t = Math.max(0, d ? Math.min(t, d - 1) : t);
    if (audio.readyState >= 1) { pending = null; audio.currentTime = t; } else { pending = t; }
    updateTime(t);
    markChapter(t);
    savePos();
    if (autoplay && audio.paused) play();
  }

  function play() {
    started = true;
    updateMini();
    var p = audio.play();
    if (p && p.catch) {
      p.catch(function (err) {
        if (err && err.name === 'AbortError') return;
        if (err && err.name === 'NotAllowedError') return;
        showError();
      });
    }
  }

  function togglePlay() {
    if (!current) load(1, null, false);
    if (audio.paused) play(); else audio.pause();
  }

  function setPlayingUI(isPlaying) {
    [el.play, el.mplay].forEach(function (b) {
      b.querySelector('.i-play').hidden = isPlaying;
      b.querySelector('.i-pause').hidden = !isPlaying;
      b.setAttribute('aria-label', isPlaying ? 'Пауза' : 'Слушать');
    });
  }

  /* Мини-плеер появляется, когда большой плеер ушёл с экрана */
  var playerVisible = true;
  function updateMini() {
    var show = started && !playerVisible;
    el.mini.classList.toggle('is-visible', show);
    el.mini.setAttribute('aria-hidden', String(!show));
    Array.prototype.forEach.call(el.mini.querySelectorAll('button, a'), function (x) { x.tabIndex = show ? 0 : -1; });
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      playerVisible = entries[0].isIntersecting;
      updateMini();
    }, { threshold: 0.15 }).observe(playerEl);
  }

  /* Экран блокировки и наушники */
  function updateMediaMetadata(title) {
    if (!('mediaSession' in navigator) || !current || typeof MediaMetadata === 'undefined') return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: title,
      artist: 'Юрий Строфилов',
      album: 'Не про бег. Эпизод ' + current.n,
      artwork: [
        { src: abs('assets/img/podcast-cover.jpg'), sizes: '1400x1400', type: 'image/jpeg' },
        { src: abs('assets/img/cover.jpg'), sizes: '1047x1500', type: 'image/jpeg' }
      ]
    });
  }
  function updatePositionState() {
    if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
    var d = duration();
    if (!d) return;
    try { navigator.mediaSession.setPositionState({ duration: d, playbackRate: audio.playbackRate, position: Math.min(audio.currentTime, d) }); } catch (e) {}
  }
  function jumpChapter(dir) {
    if (!current) return;
    var list = chaptersOf(current.n);
    var idx = chapterIndexAt(current.n, position());
    if (dir < 0) {
      // в начало текущей главы, если прошло больше 5 секунд; иначе на предыдущую
      if (idx >= 0 && position() - list[idx][0] > 5) return seekTo(list[idx][0], false);
      if (idx > 0) return seekTo(list[idx - 1][0], false);
      var prev = epByN(current.n - 1);
      if (prev) { var pl = chaptersOf(prev.n); load(prev.n, pl.length ? pl[pl.length - 1][0] : 0, true); }
      return;
    }
    if (idx + 1 < list.length) return seekTo(list[idx + 1][0], false);
    var next = epByN(current.n + 1);
    if (next) load(next.n, 0, true);
  }
  if ('mediaSession' in navigator) {
    var ms = navigator.mediaSession;
    var handlers = {
      play: function () { play(); },
      pause: function () { audio.pause(); },
      seekbackward: function (d) { seekTo(position() - ((d && d.seekOffset) || 15), false); },
      seekforward: function (d) { seekTo(position() + ((d && d.seekOffset) || 30), false); },
      seekto: function (d) { if (d && d.seekTime != null) seekTo(d.seekTime, false); },
      previoustrack: function () { jumpChapter(-1); },
      nexttrack: function () { jumpChapter(1); }
    };
    Object.keys(handlers).forEach(function (k) { try { ms.setActionHandler(k, handlers[k]); } catch (e) {} });
  }

  /* События звука */
  // Safari на iPhone иногда игнорирует перемотку до canplay, поэтому пробуем дважды
  function applyPending() {
    if (pending == null) return;
    var target = pending;
    try { audio.currentTime = target; } catch (e) {}
    if (Math.abs(audio.currentTime - target) < 1.5) pending = null;
  }
  audio.addEventListener('canplay', applyPending);
  audio.addEventListener('loadedmetadata', function () {
    applyPending();
    el.seek.max = Math.floor(audio.duration);
    el.dur.textContent = hms(audio.duration);
    updatePositionState();
  });
  audio.addEventListener('timeupdate', function () {
    var t = audio.currentTime;
    updateTime(t);
    markChapter(t);
    if (Math.abs(t - lastSaved) >= 5) { lastSaved = t; savePos(); updatePositionState(); }
  });
  audio.addEventListener('play', function () { setPlayingUI(true); setStatus(''); hideError(); });
  audio.addEventListener('pause', function () { setPlayingUI(false); savePos(); });
  audio.addEventListener('waiting', function () { setStatus('Загружается…'); });
  audio.addEventListener('playing', function () { setStatus(''); });
  audio.addEventListener('ratechange', updatePositionState);
  audio.addEventListener('error', function () { if (started) showError(); });
  audio.addEventListener('ended', function () {
    store.set('pos:' + current.n, 0);
    var next = epByN(current.n + 1);
    if (next) load(next.n, 0, true);
  });
  window.addEventListener('pagehide', savePos);

  /* Кнопки */
  el.play.addEventListener('click', togglePlay);
  el.mplay.addEventListener('click', togglePlay);
  el.back.addEventListener('click', function () { seekTo(position() - 15, false); });
  el.fwd.addEventListener('click', function () { seekTo(position() + 30, false); });
  el.seek.addEventListener('input', function () { dragging = true; el.cur.textContent = hms(Number(el.seek.value)); });
  el.seek.addEventListener('change', function () { dragging = false; seekTo(Number(el.seek.value), false); });

  function applySpeed() {
    var r = SPEEDS[speedIdx];
    audio.playbackRate = r;
    var label = String(r).replace('.', ',') + '×';
    el.speed.textContent = label;
    el.speed.setAttribute('aria-label', 'Скорость воспроизведения: ' + label);
    store.set('rate', r);
  }
  el.speed.addEventListener('click', function () { speedIdx = (speedIdx + 1) % SPEEDS.length; applySpeed(); });
  var savedRate = parseFloat(store.get('rate'));
  if (SPEEDS.indexOf(savedRate) > 0) { speedIdx = SPEEDS.indexOf(savedRate); }
  applySpeed();
  // playbackRate сбрасывается при смене файла в некоторых браузерах
  audio.addEventListener('loadstart', function () { audio.playbackRate = SPEEDS[speedIdx]; });

  /* Ссылки «Слушать главу»: включают нужный эпизод с нужной минуты */
  Array.prototype.forEach.call(document.querySelectorAll('[data-ep]'), function (a) {
    a.addEventListener('click', function (ev) {
      ev.preventDefault();
      load(Number(a.dataset.ep), Number(a.dataset.t || 0), true);
    });
  });

  /* Прямая ссылка на место в книге: #ep=5&t=2933 */
  function fromHash() {
    var m = /ep=(\d+)(?:&t=(\d+))?/.exec(location.hash);
    if (!m) return false;
    load(Number(m[1]), m[2] ? Number(m[2]) : 0, false);
    playerEl.scrollIntoView({ block: 'center' });
    return true;
  }
  window.addEventListener('hashchange', fromHash);

  renderEpisodes();
  if (!fromHash()) {
    var last = Number(store.get('last'));
    load(epByN(last) ? last : 1, null, false);
  }
  setPlayingUI(false);
})();
