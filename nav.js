(function () {
  var nav = document.querySelector('.site-nav');
  var footer = document.querySelector('.site-footer');
  var input = document.querySelector('.site-nav-search');
  var dropdown = document.querySelector('.search-dropdown');
  if (!nav || !input || !dropdown) return;

  var activeIndex = -1;

  // Discover blog posts from page links or fetch homepage
  function getPosts(callback) {
    var links = document.querySelectorAll('a[href^="/blog/"][href$=".html"]');
    if (links.length > 0) {
      var posts = [], seen = {};
      links.forEach(function (a) {
        var href = a.getAttribute('href');
        if (!seen[href]) { seen[href] = true; posts.push(href); }
      });
      callback(posts);
    } else {
      fetch('/').then(function (r) { return r.text(); }).then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var homeLinks = doc.querySelectorAll('a[href^="/blog/"][href$=".html"]');
        var posts = [], seen = {};
        homeLinks.forEach(function (a) {
          var href = a.getAttribute('href');
          if (!seen[href]) { seen[href] = true; posts.push(href); }
        });
        callback(posts);
      }).catch(function () { callback([]); });
    }
  }

  // --- Random ---
  function getHistory() {
    try { return JSON.parse(sessionStorage.getItem('rh') || '{}'); } catch (e) { return {}; }
  }
  function saveHistory(h) {
    try { sessionStorage.setItem('rh', JSON.stringify(h)); } catch (e) {}
  }

  var randomBtn = nav.querySelector('.site-nav-random');
  if (randomBtn) {
    randomBtn.addEventListener('click', function (e) {
      e.preventDefault();
      getPosts(function (posts) {
        if (!posts.length) return;
        var history = getHistory();
        var current = window.location.pathname;

        posts.forEach(function (p) {
          if (history[p] === undefined) history[p] = posts.length;
          else history[p]++;
        });

        var weights = posts.map(function (p) {
          if (p === current) return 0;
          var w = history[p] || 1;
          return w * w;
        });
        var totalWeight = weights.reduce(function (a, b) { return a + b; }, 0);
        if (totalWeight === 0) { weights = posts.map(function () { return 1; }); totalWeight = posts.length; }

        var r = Math.random() * totalWeight;
        var pick = posts[0];
        for (var i = 0; i < posts.length; i++) {
          r -= weights[i];
          if (r <= 0) { pick = posts[i]; break; }
        }

        history[pick] = 0;
        saveHistory(history);
        window.location.href = pick;
      });
    });
  }

  // --- Full-text fuzzy search with Fuse.js ---
  var fuse = null;
  var searchItems = [];

  function buildIndex() {
    getPosts(function (posts) {
      var remaining = posts.length;
      if (!remaining) return;

      posts.forEach(function (href) {
        fetch(href).then(function (r) { return r.text(); }).then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var title = (doc.querySelector('h1') || {}).textContent || '';
          var meta = (doc.querySelector('.meta') || {}).textContent || '';
          var body = (doc.querySelector('article') || {}).textContent || '';
          searchItems.push({ href: href, title: title, meta: meta, body: body });
        }).catch(function () {
          searchItems.push({ href: href, title: href.split('/').pop().replace('.html', '').replace(/-/g, ' '), meta: '', body: '' });
        }).finally(function () {
          remaining--;
          if (remaining === 0) {
            fuse = new Fuse(searchItems, {
              keys: [
                { name: 'title', weight: 3 },
                { name: 'meta', weight: 2 },
                { name: 'body', weight: 1 }
              ],
              includeMatches: true,
              threshold: 0.3,
              ignoreLocation: true,
              minMatchCharLength: 2
            });
            if (input.value.trim()) showResults(input.value.trim());
          }
        });
      });
    });
  }

  var script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js';
  script.onload = buildIndex;
  document.head.appendChild(script);

  // --- Search UI ---
  function getSnippet(text, query, maxLen) {
    maxLen = maxLen || 120;
    var lower = text.toLowerCase();
    var words = query.toLowerCase().split(/\s+/).filter(Boolean);
    var bestPos = -1;
    for (var i = 0; i < words.length; i++) {
      var pos = lower.indexOf(words[i]);
      if (pos !== -1 && (bestPos === -1 || pos < bestPos)) bestPos = pos;
    }
    if (bestPos === -1) return '';
    var start = Math.max(0, bestPos - 40);
    var end = Math.min(text.length, start + maxLen);
    if (start > 0) start = text.indexOf(' ', start) + 1 || start;
    var snippet = (start > 0 ? '\u2026' : '') + text.slice(start, end).trim() + (end < text.length ? '\u2026' : '');
    words.forEach(function (w) {
      if (w.length < 2) return;
      snippet = snippet.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
    });
    return snippet;
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function showResults(query) {
    if (!query || !fuse) {
      dropdown.classList.remove('open');
      dropdown.innerHTML = '';
      activeIndex = -1;
      return;
    }
    var results = fuse.search(query, { limit: 8 });
    if (!results.length) {
      dropdown.innerHTML = '<div class="search-empty">No results</div>';
      dropdown.classList.add('open');
      activeIndex = -1;
      return;
    }
    dropdown.innerHTML = results.map(function (r) {
      var item = r.item;
      var snippet = getSnippet(item.body, query);
      return '<a href="' + item.href + '" class="search-result">' +
        '<div class="search-result-title">' + escapeHtml(item.title) + '</div>' +
        '<div class="search-result-meta">' + escapeHtml(item.meta) + '</div>' +
        (snippet ? '<div class="search-result-context">' + snippet + '</div>' : '') +
        '</a>';
    }).join('');
    dropdown.classList.add('open');
    activeIndex = -1;
  }

  function setActive(index) {
    var items = dropdown.querySelectorAll('.search-result');
    items.forEach(function (el, i) { el.classList.toggle('active', i === index); });
    activeIndex = index;
    if (items[index]) items[index].scrollIntoView({ block: 'nearest' });
  }

  input.addEventListener('input', function () {
    var q = this.value.trim();
    if (q.length < 2) { dropdown.classList.remove('open'); dropdown.innerHTML = ''; activeIndex = -1; return; }
    showResults(q);
  });

  input.addEventListener('keydown', function (e) {
    var items = dropdown.querySelectorAll('.search-result');
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(activeIndex + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(activeIndex - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && items[activeIndex]) window.location.href = items[activeIndex].getAttribute('href');
      else if (items.length > 0) window.location.href = items[0].getAttribute('href');
    }
  });

  document.addEventListener('click', function (e) {
    if (!nav.querySelector('.site-nav-controls').contains(e.target)) {
      dropdown.classList.remove('open');
      activeIndex = -1;
    }
  });

  // --- Keyboard shortcuts ---
  document.addEventListener('keydown', function (e) {
    var tag = (document.activeElement || {}).tagName;
    if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') { e.preventDefault(); input.focus(); }
    if (e.key === 'Escape') { input.value = ''; input.blur(); dropdown.classList.remove('open'); dropdown.innerHTML = ''; activeIndex = -1; }
  });

  // --- Homepage search from query param ---
  var isHome = window.location.pathname === '/' || window.location.pathname === '/index.html';
  if (isHome) {
    var q = new URLSearchParams(window.location.search).get('q');
    if (q) {
      input.value = q;
      var wait = setInterval(function () {
        if (fuse) { clearInterval(wait); showResults(q); input.focus(); }
      }, 100);
    }
  }
})();
