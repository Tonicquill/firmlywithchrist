#!/usr/bin/env node
/**
 * generate-post.js — Fill-in-the-blank post generator
 *
 * Usage:
 *   node scripts/generate-post.js content/posts/my-post.json
 *
 * The JSON input is the only thing you write by hand. This script assembles
 * the repetitive HTML scaffolding (figure, scripture pulls, key-statement,
 * sources, share buttons, post-close) and appends metadata to posts.json.
 *
 * After running, execute `node build.js` to generate the site.
 */

const fs = require('fs');
const path = require('path');

function read(file) { return fs.readFileSync(file, 'utf-8'); }
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function die(msg) {
  console.error('Error: ' + msg);
  process.exit(1);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function heroImageSrc(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `{{basePath}}${url}`;
}

function buildFigure(cfg) {
  if (!cfg.hero_image) return '';
  const src = heroImageSrc(cfg.hero_image);
  const alt = escapeHtml(cfg.hero_image_alt || '');
  const caption = cfg.hero_image_caption || '';
  return (
    `<figure class="post-image">\n` +
    `  <img src="${src}" alt="${alt}" loading="lazy">\n` +
    `  <figcaption>${caption}</figcaption>\n` +
    `</figure>\n`
  );
}

function buildRelated(links) {
  if (!links || !links.length) return '';
  const items = links.map(l => {
    const slug = l.slug.replace(/\.html$/, '') + '.html';
    return `<a href="{{relatedBase}}${slug}">${escapeHtml(l.text)}</a>`;
  }).join(' · ');
  return `<p class="fade-in">\n  Related: ${items}\n</p>\n`;
}

function buildSources(sources, imageCredit) {
  if (!sources || !sources.length) return '';
  let html = `<div class="post-sources fade-in">\n  <p class="sources-label">Sources</p>\n  <ol class="cite-sources">\n`;
  sources.forEach(s => {
    html += `    <li id="${s.id}">${s.citation_html} <a href="${s.url}" target="_blank" rel="noopener">${s.domain}</a> <a href="#cite-ref-${s.id.replace('src-', '')}" class="cite-backlink" title="Jump to citation">↩</a></li>\n`;
  });
  html += `  </ol>\n`;
  if (imageCredit) {
    html += `  <p class="image-credit">${imageCredit}</p>\n`;
  }
  html += `</div>\n`;
  return html;
}

function buildShare(cfg) {
  const quote = escapeHtml(cfg.share_quote || cfg.excerpt || '');
  const tweetText = cfg.share_tweet || cfg.share_quote || cfg.excerpt || '';
  const encodedTweet = encodeURIComponent(tweetText + '\n\n');
  return (
    `<div class="post-share fade-in">\n` +
    `  <p class="share-label">Share this</p>\n` +
    `  <div class="share-buttons">\n` +
    `    <button type="button" onclick="navigator.clipboard.writeText('${quote} — Firmly With Christ')">Copy quote</button>\n` +
    `    <button type="button" onclick="window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent('${tweetText.replace(/'/g, "\\'")}') + '&url=' + encodeURIComponent(window.location.href), '_blank')">Share on X</button>\n` +
    `  </div>\n` +
    `</div>\n`
  );
}

function buildClose() {
  return (
    `<div class="post-close fade-in">\n` +
    `  <p>\n` +
    `    Scripture-grounded. Confessionally rooted. Applied to now.\n` +
    `    <span class="brand-line">Reformed theology for a shaken world &middot; Est. 2026</span>\n` +
    `  </p>\n` +
    `</div>\n`
  );
}

function buildFragment(cfg) {
  const parts = [];

  // Dropcap
  parts.push(`<p class="post-dropcap">${cfg.dropcap}</p>\n`);

  // Hero figure
  parts.push(buildFigure(cfg));

  // Body HTML — paragraphs, scripture pulls, everything between figure and key-statement
  if (cfg.body_html) {
    parts.push(cfg.body_html.trim() + '\n');
  }

  // Key statement
  if (cfg.key_statement) {
    parts.push(
      `<div class="key-statement fade-in">\n` +
      `  <p>${cfg.key_statement}</p>\n` +
      `</div>\n`
    );
  }

  // Related links
  parts.push(buildRelated(cfg.related_links));

  // Sources
  parts.push(buildSources(cfg.sources, cfg.image_credit));

  // Share
  parts.push(buildShare(cfg));

  // Post close
  parts.push(buildClose());

  return parts.join('\n').replace(/\r\n/g, '\n');
}

function updatePostsJson(cfg) {
  const postsPath = 'assets/posts.json';
  const posts = JSON.parse(read(postsPath));

  const entry = {
    title: cfg.title,
    url: `post/${cfg.slug}.html`,
    date: cfg.date,
    tag: cfg.tag,
    secular_tag: cfg.secular_tag,
    excerpt: cfg.excerpt,
    scripture: cfg.scripture,
    hero_image: cfg.hero_image,
    share_quote: cfg.share_quote,
    geo: cfg.geo
  };

  // Insert in date-descending order; if same date, append after existing
  const idx = posts.findIndex(p => p.date < cfg.date);
  if (idx === -1) {
    posts.push(entry);
  } else {
    posts.splice(idx, 0, entry);
  }

  write(postsPath, JSON.stringify(posts, null, 2) + '\n');
  console.log(`Updated ${postsPath}`);
}

// ============================================================================
// MAIN
// ============================================================================
const inputFile = process.argv[2];
if (!inputFile) {
  console.log('Usage: node scripts/generate-post.js <path-to-post.json>');
  console.log('');
  console.log('Example JSON structure:');
  console.log(`
{
  "slug": "my-post-2026",
  "title": "The title of the post",
  "date": "2026-05-22",
  "tag": "Persecution",
  "secular_tag": "Religious Freedom",
  "excerpt": "One-sentence excerpt for OG tags and cards.",
  "scripture": "Matthew 5:11 · John 3:20",
  "geo": "Country",
  "hero_image": "https://upload.wikimedia.org/...",
  "hero_image_alt": "Alt text",
  "hero_image_caption": "Artist, <em>Title</em> (year). Caption text. Image: public domain.",
  "dropcap": "Lead paragraph with <sup class=\"cite\"><a href=\"#src-1\" id=\"cite-ref-1\">[1]</a></sup>",
  "body_html": "<p>Paragraph with <span class=\"scripture-ref\" data-full=\"FULL TEXT\">Matthew 5:11</span>.</p>\\n\\n<blockquote class=\"scripture-pull fade-in\"><div class=\"scripture-pull-bg\" style=\"background-image: url('{{basePath}}assets/corot-sunset.jpg')\"></div><p>Verse text</p><cite>Reference</cite></blockquote>",
  "key_statement": "Short, punchy concluding summary.",
  "related_links": [
    { "text": "Previous post description", "slug": "previous-post-2026.html" }
  ],
  "sources": [
    {
      "id": "src-1",
      "citation_html": "Publication. (2026, Month Day). <em>Article title</em>. Summary.",
      "url": "https://example.com/article",
      "domain": "example.com"
    },
    {
      "id": "src-2",
      "citation_html": "Bible verses cited: <a href=\"https://www.biblegateway.com/passage/?search=Matthew+5%3A11&version=ESV\" target=\"_blank\" rel=\"noopener\">ESV (BibleGateway)</a>",
      "url": "https://www.biblegateway.com/passage/?search=Matthew+5%3A11&version=ESV",
      "domain": "biblegateway.com"
    }
  ],
  "image_credit": "Image: Artist, <em>Title</em> (year). Museum. Public domain via Wikimedia Commons.",
  "share_quote": "Short quote for copy button.",
  "share_tweet": "Optional longer text for X share (defaults to share_quote)"
}
  `);
  process.exit(0);
}

if (!fs.existsSync(inputFile)) die(`File not found: ${inputFile}`);

const cfg = JSON.parse(read(inputFile));

// Validate required fields
const required = ['slug', 'title', 'date', 'tag', 'secular_tag', 'excerpt', 'scripture', 'geo', 'dropcap', 'body_html'];
for (const key of required) {
  if (cfg[key] === undefined || cfg[key] === null || cfg[key] === '') die(`Missing required field: ${key}`);
}

const fragment = buildFragment(cfg);
const outPath = `content/posts/${cfg.slug}.html`;
write(outPath, fragment);
console.log(`Generated ${outPath}`);

updatePostsJson(cfg);
console.log('Done. Run `node build.js` to generate the site.');
