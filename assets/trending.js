/**
 * Trending posts strip — reads posts.json and renders a horizontal strip below nav
 */
(function () {
  'use strict';

  const container = document.getElementById('trendingStrip');
  if (!container) return;

  // Determine base path so this works from root and from post/ subdirectory
  const isPostDir = location.pathname.includes('/post/');
  const basePath = isPostDir ? '../' : './';

  fetch(basePath + 'assets/posts.json')
    .then(function (res) { return res.json(); })
    .then(function (posts) {
      // Sort by date descending, take top 5
      posts.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
      const recent = posts.slice(0, 5);

      const fragment = document.createDocumentFragment();
      recent.forEach(function (post) {
        const link = document.createElement('a');
        link.href = basePath + post.url;
        link.className = 'trending-item';
        link.textContent = post.title;
        fragment.appendChild(link);
      });

      const itemsWrap = document.createElement('div');
      itemsWrap.className = 'trending-items';
      itemsWrap.appendChild(fragment);

      container.querySelector('.trending-strip-inner').appendChild(itemsWrap);
    })
    .catch(function () {
      // Silently fail — trending strip is enhancement, not critical
      container.style.display = 'none';
    });
})();
