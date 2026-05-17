// Shared site JavaScript — Firmly With Christ
// Handles: mobile nav toggle, IntersectionObserver scroll animations

(function () {
  'use strict';

  // Lenis smooth scroll (honors prefers-reduced-motion)
  var lenis = null;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reducedMotion && typeof Lenis !== 'undefined') {
    lenis = new Lenis({
      lerp: 0.07,
      smoothWheel: true,
      duration: 1.2
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  function getScrollY() {
    return lenis ? lenis.scroll : (window.scrollY || window.pageYOffset);
  }

  // Inject archival paper texture overlay (covers static pages too)
  if (!document.querySelector('.paper-texture')) {
    var pt = document.createElement('div');
    pt.className = 'paper-texture';
    document.body.insertBefore(pt, document.body.firstChild);
  }

  // Mobile nav toggle
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      navToggle.textContent = isOpen ? '✕' : '☰';
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        navToggle.textContent = '☰';
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Scroll-triggered fade-in animations
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px'
    });

    document.querySelectorAll('.fade-in').forEach(function (el) {
      observer.observe(el);
    });
  } else {
    // Fallback for older browsers
    document.querySelectorAll('.fade-in').forEach(function (el) {
      el.classList.add('visible');
    });
  }

  // Scripture reference tooltips
  const tooltip = document.createElement('div');
  tooltip.className = 'verse-tooltip';
  document.body.appendChild(tooltip);

  let activeRef = null;

  function positionTooltip(ref) {
    const rect = ref.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = getScrollY();
    const vw = window.innerWidth;

    let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
    let top = rect.top + scrollY - tooltipRect.height - 8;
    let placement = 'above';

    if (left < 8) left = 8;
    if (left + tooltipRect.width > vw - 8) left = vw - tooltipRect.width - 8;
    if (rect.top - tooltipRect.height - 8 < 0) {
      top = rect.bottom + scrollY + 8;
      placement = 'below';
    }

    tooltip.style.left = left + scrollX + 'px';
    tooltip.style.top = top + 'px';
    tooltip.classList.remove('above', 'below');
    tooltip.classList.add(placement);
  }

  function showTooltip(ref) {
    if (activeRef && activeRef !== ref) {
      hideTooltip();
    }
    tooltip.textContent = ref.dataset.full;
    tooltip.classList.add('visible');
    requestAnimationFrame(function () { positionTooltip(ref); });
    activeRef = ref;
    ref.classList.add('active');
  }

  function hideTooltip() {
    tooltip.classList.remove('visible');
    if (activeRef) {
      activeRef.classList.remove('active');
      activeRef = null;
    }
  }

  document.querySelectorAll('.scripture-ref[data-full]').forEach(function (ref) {
    ref.addEventListener('mouseenter', function () { showTooltip(ref); });
    ref.addEventListener('mouseleave', function () { hideTooltip(); });

    ref.addEventListener('click', function (e) {
      if (window.matchMedia('(hover: none)').matches) {
        e.preventDefault();
        e.stopPropagation();
        if (activeRef === ref) {
          hideTooltip();
        } else {
          showTooltip(ref);
        }
      }
    });
  });

  document.addEventListener('click', function (e) {
    if (activeRef && !activeRef.contains(e.target) && !tooltip.contains(e.target)) {
      hideTooltip();
    }
  });

  window.addEventListener('resize', function () {
    if (activeRef) positionTooltip(activeRef);
  });
  window.addEventListener('scroll', function () {
    if (activeRef) positionTooltip(activeRef);
  }, { passive: true });

  // Parallax scroll effect
  var parallaxElements = document.querySelectorAll('[data-parallax]');
  if (parallaxElements.length) {
    if (lenis) {
      lenis.on('scroll', function (_a) {
        var scroll = _a.scroll;
        parallaxElements.forEach(function (el) {
          var speed = parseFloat(el.dataset.parallax);
          el.style.transform = 'translateY(' + (scroll * speed).toFixed(2) + 'px)';
        });
      });
    } else {
      function updateParallax() {
        var scrollY = getScrollY();
        parallaxElements.forEach(function (el) {
          var speed = parseFloat(el.dataset.parallax);
          el.style.transform = 'translateY(' + (scrollY * speed).toFixed(2) + 'px)';
        });
      }
      window.addEventListener('scroll', updateParallax, { passive: true });
      updateParallax();
    }
  }

  // Hero meta restructuring: move date label into meta row, add reading time
  const articleBody = document.querySelector('[data-pagefind-body]');
  const heroMeta = document.querySelector('.hero-meta');
  const heroLabel = document.querySelector('.hero-label');

  if (heroMeta && heroLabel) {
    const dateText = heroLabel.textContent.trim();
    if (dateText && !heroMeta.querySelector('.hero-date')) {
      const dateSpan = document.createElement('span');
      dateSpan.className = 'hero-date';
      dateSpan.textContent = dateText;
      // Insert after meta-tag if present, otherwise at start
      const metaTag = heroMeta.querySelector('.meta-tag');
      if (metaTag && metaTag.nextSibling) {
        heroMeta.insertBefore(document.createTextNode(' · '), metaTag.nextSibling);
        heroMeta.insertBefore(dateSpan, metaTag.nextSibling);
      } else if (metaTag) {
        heroMeta.appendChild(document.createTextNode(' · '));
        heroMeta.appendChild(dateSpan);
      } else {
        heroMeta.insertBefore(dateSpan, heroMeta.firstChild);
      }
    }
    heroLabel.style.display = 'none';
  }

  if (articleBody && heroMeta && !heroMeta.querySelector('.reading-time')) {
    const text = articleBody.innerText || articleBody.textContent || '';
    const wordCount = text.trim().split(/\s+/).filter(function (w) { return w.length > 0; }).length;
    const minutes = Math.max(1, Math.ceil(wordCount / 220));
    const rt = document.createElement('span');
    rt.className = 'reading-time';
    rt.textContent = minutes + ' min read';
    heroMeta.appendChild(document.createTextNode(' · '));
    heroMeta.appendChild(rt);
  }

  // Custom cursor (minimal dot, hidden on touch)
  if (window.matchMedia('(pointer: fine)').matches) {
    var cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    document.body.appendChild(cursor);
    document.body.style.cursor = 'none';

    var cursorX = 0, cursorY = 0, cursorVisible = false;
    document.addEventListener('mousemove', function (e) {
      cursorX = e.clientX; cursorY = e.clientY;
      if (!cursorVisible) { cursor.classList.add('visible'); cursorVisible = true; }
    });
    document.addEventListener('mouseleave', function () {
      cursor.classList.remove('visible'); cursorVisible = false;
    });

    // Scale on interactive elements
    var hoverTargets = document.querySelectorAll('a, button, .post-card, .slide-btn, .slide-dot, input, select');
    hoverTargets.forEach(function (el) {
      el.addEventListener('mouseenter', function () { cursor.classList.add('cursor--hover'); });
      el.addEventListener('mouseleave', function () { cursor.classList.remove('cursor--hover'); });
    });

    function updateCursor() {
      cursor.style.transform = 'translate3d(' + (cursorX - 4) + 'px, ' + (cursorY - 4) + 'px, 0)';
      requestAnimationFrame(updateCursor);
    }
    requestAnimationFrame(updateCursor);
  }

  // Fixed ornament parallax
  var ornaments = document.querySelectorAll('.page-ornaments .ornament');
  if (ornaments.length) {
    function updateOrnaments() {
      var sy = getScrollY();
      ornaments.forEach(function (el, i) {
        var speed = 0.02 + (i % 3) * 0.015;
        el.style.transform = 'translateY(' + (-sy * speed).toFixed(2) + 'px)';
      });
    }
    if (lenis) {
      lenis.on('scroll', function (_a) {
        var scroll = _a.scroll;
        updateOrnaments();
      });
    } else {
      window.addEventListener('scroll', updateOrnaments, { passive: true });
    }
    updateOrnaments();
  }

  // Reading progress bar (article pages only)
  if (articleBody && !reducedMotion) {
    var progressBar = document.createElement('div');
    progressBar.className = 'reading-progress';
    document.body.appendChild(progressBar);

    if (lenis) {
      lenis.on('scroll', function (_a) {
        var scroll = _a.scroll;
        var scrollH = document.documentElement.scrollHeight - window.innerHeight;
        if (scrollH <= 0) return;
        var pct = Math.min(scroll / scrollH, 1);
        progressBar.style.transform = 'scaleX(' + pct + ')';
      });
    } else {
      function updateProgress() {
        var scrollH = document.documentElement.scrollHeight - window.innerHeight;
        if (scrollH <= 0) return;
        var pct = Math.min(getScrollY() / scrollH, 1);
        progressBar.style.transform = 'scaleX(' + pct + ')';
      }
      window.addEventListener('scroll', updateProgress, { passive: true });
      updateProgress();
    }
  }

  // Slide carousel (Canva-export presentation viewer)
  document.querySelectorAll('.slide-carousel').forEach(function (carousel) {
    const track = carousel.querySelector('.slide-track');
    const slides = carousel.querySelectorAll('.slide');
    const prevBtn = carousel.querySelector('.slide-prev');
    const nextBtn = carousel.querySelector('.slide-next');
    const dotsContainer = carousel.querySelector('.slide-dots');
    if (!track || slides.length === 0) return;

    let index = 0;
    const total = slides.length;

    function goTo(i) {
      if (i < 0) i = 0;
      if (i >= total) i = total - 1;
      index = i;
      track.style.transform = 'translateX(' + (-index * 100) + '%)';
      if (dotsContainer) {
        dotsContainer.querySelectorAll('.slide-dot').forEach(function (d, j) {
          d.classList.toggle('active', j === index);
        });
      }
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { goTo(index - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goTo(index + 1); });

    // Dot navigation
    if (dotsContainer) {
      dotsContainer.querySelectorAll('.slide-dot').forEach(function (dot, j) {
        dot.addEventListener('click', function () { goTo(j); });
      });
    }

    // Keyboard navigation
    carousel.setAttribute('tabindex', '0');
    carousel.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1); }
    });

    // Swipe support
    let startX = 0;
    carousel.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    carousel.addEventListener('touchend', function (e) {
      const diff = startX - e.changedTouches[0].clientX;
      if (diff > 40) goTo(index + 1);
      else if (diff < -40) goTo(index - 1);
    }, { passive: true });

    // Auto-advance if data-autoplay is set (in ms)
    const autoMs = parseInt(carousel.dataset.autoplay, 10);
    if (autoMs > 0) {
      let timer = setInterval(function () { goTo(index + 1 >= total ? 0 : index + 1); }, autoMs);
      carousel.addEventListener('mouseenter', function () { clearInterval(timer); });
      carousel.addEventListener('mouseleave', function () {
        clearInterval(timer);
        timer = setInterval(function () { goTo(index + 1 >= total ? 0 : index + 1); }, autoMs);
      });
      carousel.addEventListener('touchstart', function () { clearInterval(timer); }, { passive: true });
    }
  });
})();
