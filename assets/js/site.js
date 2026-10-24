// =============================================================
// site.js — Mobile nav, dark mode, publication filter, toggles,
//           scroll effects, copy bibtex, back-to-top
// =============================================================

(function () {
  'use strict';

  // Icons come from the inline sprite in _includes/icons.svg
  function iconHTML(name) {
    return '<svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-' + name + '"></use></svg>';
  }
  function setIcon(svg, name) {
    var use = svg && svg.querySelector('use');
    if (use) use.setAttribute('href', '#icon-' + name);
  }

  // ----- Mobile Navigation -----

  var navToggler = document.querySelector('.navbar-toggler');
  var navMenu = document.getElementById('navbarNav');

  if (navToggler && navMenu) {
    navToggler.addEventListener('click', function () {
      var open = navMenu.classList.toggle('show');
      navToggler.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // Close the menu after a link is chosen
    navMenu.addEventListener('click', function (e) {
      if (e.target.closest('a.nav-link')) {
        navMenu.classList.remove('show');
        navToggler.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ----- Menu dropdowns (Research) -----
  // Hover/focus opens them via CSS; the arrow button toggles for touch and
  // assistive tech, and Escape or a click elsewhere closes them.
  document.querySelectorAll('.nav-item.has-dropdown').forEach(function (item) {
    var btn = item.querySelector('.nav-dropdown-toggle');
    if (!btn) return;
    function set(open) {
      item.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    btn.addEventListener('click', function (e) { e.stopPropagation(); set(!item.classList.contains('open')); });
    item.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { set(false); btn.focus(); }
    });
    document.addEventListener('click', function (e) { if (!item.contains(e.target)) set(false); });
  });

  // ----- Dark Mode Toggle -----

  var toggle = document.getElementById('darkModeToggle');
  var icon = document.getElementById('themeIcon');

  function updateIcon() {
    if (!icon) return;
    var theme = document.documentElement.getAttribute('data-bs-theme');
    setIcon(icon, theme === 'dark' ? 'moon' : 'sun');
  }

  if (toggle) {
    updateIcon();

    toggle.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-bs-theme');
      var next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-bs-theme', next);
      localStorage.setItem('theme', next);
      updateIcon();
    });
  }

  // ----- Publication Expand/Collapse -----

  document.addEventListener('click', function (e) {
    var button = e.target.closest('[data-toggle-target]');
    if (!button) return;

    var targetId = button.getAttribute('data-toggle-target');
    var target = document.getElementById(targetId);
    if (!target) return;

    target.classList.toggle('show');
  });

  // ----- Publication Search/Filter -----

  // Search text, type chips and the member menu combine; a year heading is
  // hidden when none of its entries is visible. The state lives in the URL
  // (?q=, ?type=, ?member=) so a filtered list can be linked to.
  var searchInput = document.getElementById('pubSearch');
  var pubList = document.getElementById('pubList');
  if (searchInput && pubList) {
    var memberSelect = document.getElementById('memberFilter');
    var countEl = document.getElementById('pubCount');
    var memberLink = document.getElementById('memberLink');
    var chips = document.querySelectorAll('[data-type-filter]');
    var entries = pubList.querySelectorAll('[data-pub-searchable]');
    var state = { q: '', type: '', member: '' };

    var params = new URLSearchParams(window.location.search);
    state.q = params.get('q') || '';
    state.type = '';   // type chips were removed; ignore old ?type= links
    state.member = params.get('member') || '';
    searchInput.value = state.q;
    if (memberSelect) memberSelect.value = state.member;

    function apply() {
      var q = state.q.toLowerCase().trim();
      var shown = 0;
      entries.forEach(function (entry) {
        var ok = (!q || entry.textContent.toLowerCase().indexOf(q) !== -1) &&
          (!state.type || entry.getAttribute('data-type') === state.type) &&
          (!state.member || (' ' + entry.getAttribute('data-members') + ' ').indexOf(' ' + state.member + ' ') !== -1);
        entry.closest('li').style.display = ok ? '' : 'none';
        if (ok) shown++;
      });
      pubList.querySelectorAll('ol.bibliography').forEach(function (ol) {
        var any = Array.prototype.some.call(ol.children, function (li) { return li.style.display !== 'none'; });
        ol.style.display = any ? '' : 'none';
        var heading = ol.previousElementSibling;
        if (heading && /^H[1-6]$/.test(heading.tagName)) heading.style.display = any ? '' : 'none';
      });
      chips.forEach(function (c) {
        c.classList.toggle('active', c.getAttribute('data-type-filter') === state.type);
      });
      if (countEl) {
        countEl.textContent = (shown === entries.length)
          ? entries.length + ' publications'
          : 'Showing ' + shown + ' of ' + entries.length + ' publications';
      }
      if (memberLink && memberSelect) {
        var opt = memberSelect.options[memberSelect.selectedIndex];
        if (state.member && opt) {
          memberLink.hidden = false;
          memberLink.innerHTML = '<a href="' + opt.getAttribute('data-url') + '">' +
            opt.textContent.replace(/\s*\(\d+\)$/, '') + '&rsquo;s page &rarr;</a>';
        } else {
          memberLink.hidden = true;
        }
      }
      var p = new URLSearchParams();
      if (state.q) p.set('q', state.q);
      if (state.type) p.set('type', state.type);
      if (state.member) p.set('member', state.member);
      var qs = p.toString();
      history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : ''));
    }

    searchInput.addEventListener('input', function () { state.q = this.value; apply(); });
    chips.forEach(function (c) {
      c.addEventListener('click', function () { state.type = c.getAttribute('data-type-filter'); apply(); });
    });
    if (memberSelect) {
      memberSelect.addEventListener('change', function () { state.member = this.value; apply(); });
    }
    apply();
  }

  // ----- News Tag Filter -----
  // ?tag=Awards preselects a tag, so tag links on posts land filtered.

  var newsList = document.getElementById('newsList');
  if (newsList) {
    var tagChips = document.querySelectorAll('[data-tag-filter]');
    var cards = newsList.querySelectorAll('.news-item');
    var activeTag = '';   // tag buttons were removed; old ?tag= links show everything

    function applyTag() {
      cards.forEach(function (card) {
        var tags = ' ' + card.getAttribute('data-tags') + ' ';
        card.style.display = (!activeTag || tags.indexOf(' ' + activeTag + ' ') !== -1) ? '' : 'none';
      });
      newsList.querySelectorAll('.news-year').forEach(function (sec) {
        var any = Array.prototype.some.call(sec.querySelectorAll('.news-item'), function (c) { return c.style.display !== 'none'; });
        sec.style.display = any ? '' : 'none';
      });
      tagChips.forEach(function (c) { c.classList.toggle('active', c.getAttribute('data-tag-filter') === activeTag); });
      history.replaceState(null, '', window.location.pathname + (activeTag ? '?tag=' + encodeURIComponent(activeTag) : ''));
    }

    tagChips.forEach(function (c) {
      c.addEventListener('click', function () { activeTag = c.getAttribute('data-tag-filter'); applyTag(); });
    });
    applyTag();
  }

  // ----- Photo sliders -----
  // [data-slider] > .slider-track > figure*. The track scrolls natively (swipe,
  // trackpad); this adds arrows, dots, a counter and arrow-key navigation.

  var sliders = document.querySelectorAll('[data-slider]');
  sliders.forEach(function (slider, sliderIndex) {
    var track = slider.querySelector('.slider-track');
    // Slides are the track's figures, or the items of a list inside it
    // (the highlights slider wraps a {% bibliography %} <ol>).
    var slides = track ? Array.prototype.slice.call(
      track.querySelectorAll(':scope > figure, :scope > ol > li')) : [];
    if (slides.length < 2) return;

    track.setAttribute('tabindex', '0');
    track.setAttribute('role', 'region');
    track.setAttribute('aria-roledescription', 'carousel');
    track.setAttribute('aria-label', (sliders.length > 1 ? 'Photos, set ' + (sliderIndex + 1) : 'Photos') +
      ' (' + slides.length + '); use the arrow keys to move between photos');
    slides.forEach(function (fig, i) {
      fig.setAttribute('aria-label', 'Photo ' + (i + 1) + ' of ' + slides.length);
    });

    function btn(cls, label, text) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'slider-btn ' + cls;
      b.setAttribute('aria-label', label); b.innerHTML = text;
      slider.appendChild(b);
      return b;
    }
    var prev = btn('prev', 'Previous photo', '&lsaquo;');
    var next = btn('next', 'Next photo', '&rsaquo;');
    var counter = document.createElement('span');
    counter.className = 'slider-counter';
    counter.setAttribute('aria-live', 'polite');
    slider.appendChild(counter);
    var dots = document.createElement('div');
    dots.className = 'slider-dots';
    slides.forEach(function (_, i) {
      var d = document.createElement('button');
      d.type = 'button';
      d.setAttribute('aria-label', 'Photo ' + (i + 1));
      d.addEventListener('click', function () { go(i); });
      dots.appendChild(d);
    });
    slider.appendChild(dots);

    function current() { return Math.round(track.scrollLeft / track.clientWidth); }
    function go(i) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: i * track.clientWidth });
    }
    function update() {
      var i = current();
      counter.textContent = (i + 1) + ' / ' + slides.length;
      prev.disabled = i === 0;
      next.disabled = i === slides.length - 1;
      Array.prototype.forEach.call(dots.children, function (d, k) {
        d.classList.toggle('active', k === i);
        if (k === i) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
      });
    }
    prev.addEventListener('click', function () { go(current() - 1); });
    next.addEventListener('click', function () { go(current() + 1); });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(current() + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(current() - 1); }
    });
    var ticking = false;
    track.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(function () { update(); ticking = false; }); }
    });
    window.addEventListener('resize', update);
    update();
  });

  // ----- Photo lightbox (sliders and single figures) -----

  var lightboxLinks = document.querySelectorAll('.lightbox-link');
  if (lightboxLinks.length) {
    var box = document.createElement('div');
    box.className = 'lightbox';
    box.hidden = true;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Enlarged photo');
    box.setAttribute('tabindex', '-1');
    box.innerHTML = '<button type="button" class="lightbox-close" aria-label="Close photo">&times;</button><p class="lightbox-caption"></p>';
    document.body.appendChild(box);
    var boxImg = document.createElement('img');
    boxImg.alt = '';
    box.insertBefore(boxImg, box.firstChild);
    var boxCap = box.querySelector('.lightbox-caption');
    var opener = null;
    function closeBox() {
      box.hidden = true; boxImg.removeAttribute('src');
      if (opener) { opener.focus(); opener = null; }
    }
    lightboxLinks.forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var cap = a.parentNode.querySelector('figcaption');
        boxImg.src = a.getAttribute('href');
        boxImg.alt = (a.querySelector('img') || {}).alt || '';
        boxCap.textContent = cap ? cap.textContent : '';
        box.hidden = false;
        opener = a;
        box.querySelector('.lightbox-close').focus();
      });
    });
    box.addEventListener('click', closeBox);
    document.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') closeBox();
      if (e.key === 'Tab') { e.preventDefault(); box.querySelector('.lightbox-close').focus(); }  // keep focus in the dialog
    });
  }

  // ----- Copy BibTeX Button -----

  document.querySelectorAll('.pub-collapse').forEach(function (collapse) {
    // Only add copy to bibtex blocks (id starts with "bib-")
    if (!collapse.id || !collapse.id.startsWith('bib-')) return;

    var pre = collapse.querySelector('pre');
    if (!pre) return;

    var wrapper = document.createElement('div');
    wrapper.className = 'copy-wrapper';
    wrapper.style.position = 'relative';

    var btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.innerHTML = iconHTML('copy');
    btn.title = 'Copy to clipboard';
    btn.setAttribute('aria-label', 'Copy BibTeX to clipboard');

    btn.addEventListener('click', function () {
      navigator.clipboard.writeText(pre.textContent.trim()).then(function () {
        btn.innerHTML = iconHTML('check');
        btn.classList.add('copied');
        setTimeout(function () {
          btn.innerHTML = iconHTML('copy');
          btn.classList.remove('copied');
        }, 2000);
      });
    });

    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);
    wrapper.appendChild(btn);
  });

  // ----- Back to Top Button -----

  var topBtn = document.createElement('button');
  topBtn.className = 'back-to-top';
  topBtn.innerHTML = iconHTML('arrow-up');
  topBtn.setAttribute('aria-label', 'Back to top');
  document.body.appendChild(topBtn);

  topBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  window.addEventListener('scroll', function () {
    if (window.scrollY > 400) {
      topBtn.classList.add('visible');
    } else {
      topBtn.classList.remove('visible');
    }
  }, { passive: true });

  // ----- Navbar Scroll Shadow -----

  var navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 10) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }, { passive: true });
  }

  // ----- Fade-in on Scroll -----

  var fadeElements = document.querySelectorAll('.fade-in-section');
  if (fadeElements.length > 0 && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      // Any visible pixel counts: a fractional threshold never fires on a
      // section taller than the window divided by that fraction (e.g. News).
      threshold: 0
    });

    fadeElements.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    fadeElements.forEach(function (el) {
      el.classList.add('visible');
    });
  }

  // ----- Site Search -----

  var searchToggleBtn = document.getElementById('searchToggle');
  var searchOverlay = document.getElementById('searchOverlay');
  var searchInputEl = document.getElementById('searchInput');
  var searchResultsEl = document.getElementById('searchResults');
  var searchData = null;

  function openSearch() {
    if (!searchOverlay) return;
    searchOverlay.classList.add('open');
    setTimeout(function () { searchInputEl.focus(); }, 100);
  }

  function closeSearch() {
    if (!searchOverlay) return;
    searchOverlay.classList.remove('open');
    searchInputEl.value = '';
    searchResultsEl.innerHTML = '';
  }

  if (searchToggleBtn) {
    searchToggleBtn.addEventListener('click', openSearch);
  }

  if (searchOverlay) {
    searchOverlay.addEventListener('click', function (e) {
      if (e.target === searchOverlay) closeSearch();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && searchOverlay && searchOverlay.classList.contains('open')) {
      closeSearch();
    }
    // Cmd/Ctrl + K to open search
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (searchOverlay && searchOverlay.classList.contains('open')) {
        closeSearch();
      } else {
        openSearch();
      }
    }
  });

  // Site may be served from a sub-path (e.g. user.github.io/repo); the layout
  // stores site.baseurl on <body> so the index can be fetched from the right place.
  var baseurl = (document.body && document.body.getAttribute('data-baseurl')) || '';

  function loadSearchData(callback) {
    if (searchData) { callback(searchData); return; }
    fetch(baseurl + '/assets/search.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        searchData = data;
        callback(data);
      })
      .catch(function () {
        searchResultsEl.innerHTML = '<div class="search-no-results">Could not load search index.</div>';
      });
  }

  function renderResults(query, data) {
    if (!query) {
      searchResultsEl.innerHTML = '';
      return;
    }
    var q = query.toLowerCase();
    var matches = data.filter(function (item) {
      return item.title.toLowerCase().includes(q) ||
             item.content.toLowerCase().includes(q);
    });

    if (matches.length === 0) {
      searchResultsEl.innerHTML = '<div class="search-no-results">No results for "' + query + '"</div>';
      return;
    }

    searchResultsEl.innerHTML = matches.map(function (item) {
      var snippet = item.content.substring(0, 150).trim() + '...';
      return '<a href="' + item.url + '" class="search-result-item">' +
        '<div class="search-result-title">' + item.title + '</div>' +
        '<div class="search-result-snippet">' + snippet + '</div>' +
        '</a>';
    }).join('');
  }

  if (searchInputEl) {
    var debounceTimer;
    searchInputEl.addEventListener('input', function () {
      var query = this.value.trim();
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        loadSearchData(function (data) {
          renderResults(query, data);
        });
      }, 150);
    });
  }

})();
