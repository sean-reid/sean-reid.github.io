(function () {
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

  var css = document.createElement('style');
  css.textContent = [
    '.site-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 9999; background: #fafafa; border-bottom: 1px solid #e0e0e0; padding: 0.75rem 1rem; }',
    '.site-nav-inner { max-width: 900px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }',
    '.site-nav-name { font-size: 1.1rem; font-weight: 600; color: #1a1a1a; text-decoration: none; white-space: nowrap; }',
    '.site-nav-name:hover { color: #0366d6; }',
    '.site-nav-controls { display: flex; align-items: center; gap: 0.75rem; position: relative; }',
    '.site-nav-search-wrap { position: relative; }',
    '.site-nav-search { font-family: inherit; font-size: 0.85rem; padding: 0.35rem 1.8rem 0.35rem 0.6rem; border: 1px solid #e0e0e0; border-radius: 4px; outline: none; width: 220px; background: white; color: #1a1a1a; }',
    '.site-nav-search-hint { position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); font-size: 0.7rem; color: #bbb; border: 1px solid #ddd; border-radius: 3px; padding: 0 0.3rem; line-height: 1.4; pointer-events: none; font-family: inherit; }',
    '.site-nav-search:focus { border-color: #0366d6; }',
    '.site-nav-search:focus + .site-nav-search-hint, .site-nav-search:not(:placeholder-shown) + .site-nav-search-hint { display: none; }',
    '.site-nav-random { font-size: 0.85rem; color: #0366d6; text-decoration: none; white-space: nowrap; cursor: pointer; }',
    '.site-nav-random:hover { color: #0256c7; }',

    // Dropdown
    '.search-dropdown { position: absolute; top: 100%; right: 0; width: 380px; max-height: 70vh; overflow-y: auto; background: white; border: 1px solid #e0e0e0; border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); margin-top: 0.4rem; display: none; z-index: 200; }',
    '.search-dropdown.open { display: block; }',
    '.search-result { display: block; padding: 0.6rem 0.8rem; text-decoration: none; color: inherit; border-bottom: 1px solid #f0f0f0; transition: background 0.1s; }',
    '.search-result:last-child { border-bottom: none; }',
    '.search-result:hover, .search-result.active { background: #f0f5ff; }',
    '.search-result-title { font-size: 0.9rem; font-weight: 600; color: #1a1a1a; margin-bottom: 0.15rem; }',
    '.search-result-meta { font-size: 0.78rem; color: #666; margin-bottom: 0.2rem; }',
    '.search-result-context { font-size: 0.75rem; color: #888; line-height: 1.4; }',
    '.search-result-context mark { background: #fff3b0; color: inherit; padding: 0 1px; border-radius: 2px; }',
    '.search-empty { padding: 0.8rem; font-size: 0.85rem; color: #888; text-align: center; }',

    // Footer
    '.site-footer { position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999; background: #fafafa; border-top: 1px solid #e0e0e0; padding: 0.5rem 1rem; text-align: center; }',
    '.site-footer-links { display: flex; justify-content: center; gap: 2rem; flex-wrap: wrap; }',
    '.site-footer-links a { color: #333; text-decoration: none; font-size: 0.95rem; }',
    '.site-footer-links a:hover { color: #0366d6; }',

    'body { padding-top: 4.5rem !important; padding-bottom: 3rem !important; }',
    '@media (max-width: 600px) {',
    '  .site-nav-search { width: 140px; }',
    '  .search-dropdown { width: calc(100vw - 2rem); right: -0.5rem; }',
    '  .site-footer-links { gap: 0.4rem 0.6rem; font-size: 0.85rem; }',
    '}'
  ].join('\n');
  document.head.appendChild(css);

  // Nav bar
  var nav = document.createElement('nav');
  nav.className = 'site-nav';
  nav.innerHTML =
    '<div class="site-nav-inner">' +
      '<a href="/" class="site-nav-name">Sean Reid</a>' +
      '<div class="site-nav-controls">' +
        '<div class="site-nav-search-wrap"><input type="text" class="site-nav-search" placeholder="Search..." autocomplete="off"><span class="site-nav-search-hint">/</span></div>' +
        '<a class="site-nav-random">\u2192 Random</a>' +
        '<div class="search-dropdown"></div>' +
      '</div>' +
    '</div>';
  document.body.insertBefore(nav, document.body.firstChild);

  var input = nav.querySelector('.site-nav-search');
  var dropdown = nav.querySelector('.search-dropdown');
  var activeIndex = -1;

  // Footer
  var footer = document.createElement('div');
  footer.className = 'site-footer';
  footer.innerHTML =
    '<div class="site-footer-links">' +
      '<a href="https://github.com/sean-reid">GitHub</a>' +
      '<a href="https://mathstodon.xyz/@seanreid">Mathstodon</a>' +
      '<a href="https://seanmreid.bandcamp.com">Bandcamp</a>' +
      '<a href="https://socrates-of-athens.github.io">Poetry</a>' +
      '<a href="https://www.buymeacoffee.com/seanreid">Coffee</a>' +
    '</div>';
  document.body.appendChild(footer);

  // Random (avoids repeats using sessionStorage)
  function getSeenPosts() {
    try { return JSON.parse(sessionStorage.getItem('seen') || '[]'); } catch (e) { return []; }
  }
  function markSeen(href) {
    var seen = getSeenPosts();
    if (seen.indexOf(href) === -1) seen.push(href);
    try { sessionStorage.setItem('seen', JSON.stringify(seen)); } catch (e) {}
  }
  // Mark current page as seen
  markSeen(window.location.pathname);

  nav.querySelector('.site-nav-random').addEventListener('click', function (e) {
    e.preventDefault();
    getPosts(function (posts) {
      if (!posts.length) return;
      var seen = new Set(getSeenPosts());
      var unseen = posts.filter(function (p) { return !seen.has(p); });
      // If seen almost everything, reset and just exclude current page
      if (unseen.length === 0) {
        try { sessionStorage.removeItem('seen'); } catch (e) {}
        unseen = posts.filter(function (p) { return p !== window.location.pathname; });
      }
      var pick = unseen[Math.floor(Math.random() * unseen.length)];
      markSeen(pick);
      window.location.href = pick;
    });
  });

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

  // Load Fuse.js then build index
  var script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js';
  script.onload = buildIndex;
  document.head.appendChild(script);

  // Extract a context snippet around a match in the body text
  function getSnippet(text, query, maxLen) {
    maxLen = maxLen || 120;
    var lower = text.toLowerCase();
    var qLower = query.toLowerCase();
    var words = qLower.split(/\s+/).filter(Boolean);

    // Find first occurrence of any query word
    var bestPos = -1;
    for (var i = 0; i < words.length; i++) {
      var pos = lower.indexOf(words[i]);
      if (pos !== -1 && (bestPos === -1 || pos < bestPos)) bestPos = pos;
    }
    if (bestPos === -1) return '';

    var start = Math.max(0, bestPos - 40);
    var end = Math.min(text.length, start + maxLen);
    if (start > 0) start = text.indexOf(' ', start) + 1 || start; // align to word boundary
    var snippet = (start > 0 ? '\u2026' : '') + text.slice(start, end).trim() + (end < text.length ? '\u2026' : '');

    // Highlight matching words
    words.forEach(function (w) {
      if (w.length < 2) return;
      var re = new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      snippet = snippet.replace(re, '<mark>$1</mark>');
    });

    return snippet;
  }

  function showResults(query) {
    if (!query || !fuse) {
      dropdown.classList.remove('open');
      dropdown.innerHTML = '';
      activeIndex = -1;
      return;
    }

    var results = fuse.search(query, { limit: 8 });

    if (results.length === 0) {
      dropdown.innerHTML = '<div class="search-empty">No results</div>';
      dropdown.classList.add('open');
      activeIndex = -1;
      return;
    }

    var html = '';
    results.forEach(function (r) {
      var item = r.item;
      var snippet = getSnippet(item.body, query);
      html += '<a href="' + item.href + '" class="search-result">' +
        '<div class="search-result-title">' + escapeHtml(item.title) + '</div>' +
        '<div class="search-result-meta">' + escapeHtml(item.meta) + '</div>' +
        (snippet ? '<div class="search-result-context">' + snippet + '</div>' : '') +
        '</a>';
    });

    dropdown.innerHTML = html;
    dropdown.classList.add('open');
    activeIndex = -1;
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  // Keyboard navigation in dropdown
  function setActive(index) {
    var items = dropdown.querySelectorAll('.search-result');
    items.forEach(function (el, i) {
      el.classList.toggle('active', i === index);
    });
    activeIndex = index;
    if (items[index]) items[index].scrollIntoView({ block: 'nearest' });
  }

  input.addEventListener('input', function () {
    var q = this.value.trim();
    if (q.length < 2) {
      dropdown.classList.remove('open');
      dropdown.innerHTML = '';
      activeIndex = -1;
      return;
    }
    showResults(q);
  });

  input.addEventListener('keydown', function (e) {
    var items = dropdown.querySelectorAll('.search-result');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(Math.min(activeIndex + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && items[activeIndex]) {
        window.location.href = items[activeIndex].getAttribute('href');
      } else if (items.length > 0) {
        window.location.href = items[0].getAttribute('href');
      }
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', function (e) {
    if (!nav.querySelector('.site-nav-controls').contains(e.target)) {
      dropdown.classList.remove('open');
      activeIndex = -1;
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', function (e) {
    var tag = (document.activeElement || {}).tagName;
    if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
      e.preventDefault();
      input.focus();
    }
    if (e.key === 'Escape') {
      input.value = '';
      input.blur();
      dropdown.classList.remove('open');
      dropdown.innerHTML = '';
      activeIndex = -1;
    }
  });

  // If homepage has ?q= param, populate and search
  var isHome = window.location.pathname === '/' || window.location.pathname === '/index.html';
  if (isHome) {
    var params = new URLSearchParams(window.location.search);
    var q = params.get('q');
    if (q) {
      input.value = q;
      // Wait for fuse to be ready, then show results
      var waitForFuse = setInterval(function () {
        if (fuse) { clearInterval(waitForFuse); showResults(q); input.focus(); }
      }, 100);
    }
  }
})();
