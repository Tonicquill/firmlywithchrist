// Shared site JavaScript — Firmly With Christ
// Handles: mobile nav toggle, IntersectionObserver scroll animations

(function () {
  'use strict';

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
    const scrollY = window.scrollY || window.pageYOffset;
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
    tooltip.textContent = ref.dataset.full;
    tooltip.classList.add('visible');
    requestAnimationFrame(function () { positionTooltip(ref); });
    activeRef = ref;
  }

  function hideTooltip() {
    tooltip.classList.remove('visible');
    activeRef = null;
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

  // Parallax scroll effect (3 layers: fast bg, normal content, slow foreground)
  const parallaxElements = document.querySelectorAll('[data-parallax]');
  if (parallaxElements.length) {
    function updateParallax() {
      const scrollY = window.scrollY || window.pageYOffset;
      parallaxElements.forEach(function (el) {
        const speed = parseFloat(el.dataset.parallax);
        el.style.transform = 'translateY(' + (scrollY * speed).toFixed(2) + 'px)';
      });
    }
    window.addEventListener('scroll', updateParallax, { passive: true });
    updateParallax();
  }
})();
