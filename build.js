const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================================================
// TEMPLATE ENGINE
// ============================================================================
function render(template, data) {
  let result = template;

  // Process each loops and if conditionals first (recursively)
  let changed = true;
  while (changed) {
    const before = result;

    // Each loops
    result = result.replace(/\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
      (_, arrKey, inner) => {
        const arr = data[arrKey] || [];
        return arr.map(item => render(inner, { ...data, ...item })).join('');
      }
    );

    // If conditionals
    result = result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (_, key, inner) => data[key] ? render(inner, data) : ''
    );

    changed = result !== before;
  }

  // Final variable substitution on the resolved template
  result = result.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (data[key] !== undefined && data[key] !== null) return String(data[key]);
    return '';
  });

  return result;
}

// ============================================================================
// UTILITIES
// ============================================================================
function read(file) { return fs.readFileSync(file, 'utf-8'); }
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
function exists(file) { return fs.existsSync(file); }

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function slugFromUrl(url) {
  return url.replace(/^post\//, '').replace(/\.html$/, '');
}

function parseScripture(str) {
  return str.split('·').map(s => s.trim()).filter(Boolean);
}

function extractHeroImage(html) {
  const m = html.match(/background-image:\s*url\(['"]([^'"]+)['"]\)/);
  return m ? m[1] : '';
}

function extractShareQuote(html) {
  const m = html.match(/navigator\.clipboard\.writeText\('([^']+?) — Firmly With Christ/);
  return m ? m[1] : '';
}

function extractArticleBody(html) {
  const m = html.match(/<article class="post-article"[^>]*data-pagefind-body[^>]*>([\s\S]*?)<\/article>/);
  return m ? m[1].trim() : '';
}

// ============================================================================
// MIGRATION
// ============================================================================
function migrate() {
  console.log('=== MIGRATION ===\n');

  // 1. Ensure directories
  ['templates', 'content/posts', 'data'].forEach(dir => {
    if (!exists(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  // 2. Load posts
  const posts = JSON.parse(read('assets/posts.json'));

  // 3. Extract content + metadata from each post page
  posts.forEach(post => {
    const filePath = post.url;
    if (!exists(filePath)) {
      console.warn(`Warning: ${filePath} not found, skipping.`);
      return;
    }

    const html = read(filePath);
    const content = extractArticleBody(html);
    if (!content) {
      console.warn(`Warning: Could not find article body in ${filePath}`);
      return;
    }

    // Replace asset paths with placeholders
    let migrated = content
      .replace(/\.\.\/assets\//g, '{{basePath}}assets/')
      .replace(/href="([a-z0-9-]+\.html)"/g, 'href="{{relatedBase}}$1"');

    const slug = slugFromUrl(post.url);
    write(`content/posts/${slug}.html`, migrated);
    console.log(`Extracted content/posts/${slug}.html`);

    // Extract metadata
    if (!post.hero_image) {
      const heroImg = extractHeroImage(html);
      if (heroImg) post.hero_image = heroImg;
    }
    if (!post.share_quote) {
      const sq = extractShareQuote(html);
      if (sq) post.share_quote = sq;
    }
  });

  // 4. Write updated posts.json
  write('assets/posts.json', JSON.stringify(posts, null, 2) + '\n');
  console.log('Updated assets/posts.json');

  // 5. Extract verse data from verses.html
  if (exists('verses.html')) {
    const versesHtml = read('verses.html');
    const verseEntries = [];
    // Extract each verse entry
    const itemRegex = /<div class="archive-item[^"]*">[\s\S]*?<span class="archive-heading">([^<]+)<\/span>[\s\S]*?<span class="archive-excerpt">([^<]+)<\/span>[\s\S]*?<\/div>/g;
    let match;
    while ((match = itemRegex.exec(versesHtml)) !== null) {
      const ref = match[1].trim();
      const book = ref.split(' ')[0];
      verseEntries.push({ ref, book, excerpt: match[2].trim() });
    }
    write('data/verses.json', JSON.stringify(verseEntries, null, 2) + '\n');
    console.log(`Extracted ${verseEntries.length} verse entries to data/verses.json`);
  }

  // 6. Backup originals
  if (exists('post') && !exists('post_backup')) {
    fs.renameSync('post', 'post_backup');
    console.log('Backed up post/ → post_backup/');
  }
  if (exists('index.html') && !exists('index_backup.html')) {
    fs.renameSync('index.html', 'index_backup.html');
    console.log('Backed up index.html');
  }
  if (exists('archive.html') && !exists('archive_backup.html')) {
    fs.renameSync('archive.html', 'archive_backup.html');
    console.log('Backed up archive.html');
  }
  if (exists('verses.html') && !exists('verses_backup.html')) {
    fs.renameSync('verses.html', 'verses_backup.html');
    console.log('Backed up verses.html');
  }

  console.log('\nMigration complete. Run `node build.js` to generate the site.');
}

// ============================================================================
// BUILD
// ============================================================================
function build() {
  console.log('=== BUILD ===\n');

  // --- 1. Load & process data ---
  const rawPosts = JSON.parse(read('assets/posts.json'));

  // Ensure defaults
  rawPosts.forEach(post => {
    if (!post.hero_image) post.hero_image = '';
    if (!post.share_quote) post.share_quote = post.excerpt || '';
  });

  // Sort by date desc, stable for same date
  const posts = [...rawPosts].sort((a, b) => {
    const dateDiff = new Date(b.date) - new Date(a.date);
    if (dateDiff !== 0) return dateDiff;
    return rawPosts.indexOf(a) - rawPosts.indexOf(b);
  });

  // Featured post
  const featuredIndex = posts.findIndex(p => p.featured);
  const heroPost = featuredIndex >= 0 ? posts[featuredIndex] : posts[0];
  const heroIndex = posts.indexOf(heroPost);
  const feedPosts = posts.filter((_, i) => i !== heroIndex).slice(0, 8);

  // Process each post
  const processedPosts = posts.map(post => {
    const slug = slugFromUrl(post.url);
    const scriptureArray = parseScripture(post.scripture || '');
    return {
      ...post,
      slug,
      date_display: formatDate(post.date),
      scripture_array: scriptureArray,
      scripture_spans: scriptureArray.map(ref => `<span>${ref}</span>`).join('\n        '),
      scripture_string: post.scripture || '',
      basePath: ''
    };
  });

  const heroData = processedPosts.find(p => p.url === heroPost.url);

  // Compute related posts (same tag, excluding self)
  function getRelated(currentPost) {
    const sameTag = processedPosts.filter(p =>
      p.slug !== currentPost.slug && p.tag === currentPost.tag
    );
    const others = processedPosts.filter(p =>
      p.slug !== currentPost.slug && p.tag !== currentPost.tag
    );
    // Fill with same-tag first, then recent posts, max 3
    const combined = [...sameTag, ...others];
    return combined.slice(0, 3).map(p => ({
      title: p.title, slug: p.slug, tag: p.tag, date: p.date_display
    }));
  }

  // --- 2. Generate post pages ---
  const postTemplate = read('templates/post.html');

  processedPosts.forEach(post => {
    const contentPath = `content/posts/${post.slug}.html`;
    if (!exists(contentPath)) {
      console.warn(`Warning: content fragment not found for ${post.slug}`);
      return;
    }
    const contentRaw = read(contentPath);
    const postContent = contentRaw
      .replace(/\{\{basePath\}\}/g, '../')
      .replace(/\{\{relatedBase\}\}/g, '');

    const html = render(postTemplate, {
      ...post,
      content: postContent,
      basePath: '../',
      pageTitle: `${post.title} | Firmly With Christ`,
      ogType: 'article',
      allPosts: processedPosts.map(p => ({ title: p.title, url: p.url, date: p.date_display, slug: p.slug })),
      relatedPosts: getRelated(post)
    });

    write(post.url, html);
    console.log(`Generated ${post.url}`);
  });

  // --- 3. Generate index.html ---
  const indexTemplate = read('templates/index.html');
  const heroContentRaw = read(`content/posts/${heroData.slug}.html`);
  const heroContent = heroContentRaw
    .replace(/\{\{basePath\}\}/g, '')
    .replace(/\{\{relatedBase\}\}/g, 'post/');
  // Fix share URLs for inline article
  const heroContentFixed = heroContent.replace(/window\.location\.href\)/g, `window.location.href + '#post-${heroData.slug}')`);

  const indexHtml = render(indexTemplate, {
    hero_image: heroData.hero_image,
    hero_date: heroData.date,
    hero_date_display: heroData.date_display,
    hero_title: heroData.title,
    hero_excerpt: heroData.excerpt,
    hero_tag: heroData.tag,
    hero_scripture_spans: heroData.scripture_spans,
    hero_slug: heroData.slug,
    heroContent: heroContentFixed,
    feedPosts: feedPosts.map(post => ({ ...post, basePath: '' })),
    basePath: ''
  });
  write('index.html', indexHtml);
  console.log('Generated index.html');

  // --- 4. Generate archive.html ---
  const archiveTemplate = read('templates/archive.html');

  const uniqueTags = [...new Set(posts.map(p => p.tag))].sort();
  const uniqueSecularTags = [...new Set(posts.map(p => p.secular_tag))].sort();
  const uniqueGeoTags = [...new Set(posts.map(p => p.geo).filter(Boolean))].sort();

  const archiveHtml = render(archiveTemplate, {
    posts: processedPosts.map(post => ({ ...post, basePath: '' })),
    tags: uniqueTags.map(tag => ({ tag })),
    secularTags: uniqueSecularTags.map(tag => ({ tag })),
    geoTags: uniqueGeoTags.map(tag => ({ tag })),
    basePath: ''
  });
  write('archive.html', archiveHtml);
  console.log('Generated archive.html');

  // --- 5. Generate verses.html ---
  const versesTemplate = read('templates/verses.html');

  // Load custom verse excerpts
  let customVerses = [];
  if (exists('data/verses.json')) {
    customVerses = JSON.parse(read('data/verses.json'));
  }

  // Build verse map from posts
  const bookOrder = ['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Job','Psalms','Proverbs','Ecclesiastes','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'];

  function extractBook(ref) {
    // Try multi-word books first (longest match)
    for (let i = bookOrder.length - 1; i >= 0; i--) {
      const book = bookOrder[i];
      if (ref.startsWith(book + ' ')) return book;
    }
    // Fallback: Psalm → Psalms
    if (ref.startsWith('Psalm ')) return 'Psalms';
    const first = ref.split(' ')[0];
    if (bookOrder.includes(first)) return first;
    return '';
  }

  const verseMap = new Map();
  processedPosts.forEach(post => {
    post.scripture_array.forEach(ref => {
      const book = extractBook(ref);
      if (!book) return; // Skip non-scripture references
      if (!verseMap.has(ref)) {
        const custom = customVerses.find(v => v.ref === ref);
        verseMap.set(ref, {
          ref,
          book,
          excerpt: custom ? custom.excerpt : '',
          posts: []
        });
      }
      verseMap.get(ref).posts.push(post.title);
    });
  });

  const verses = Array.from(verseMap.values()).map(v => {
    if (!v.excerpt) {
      v.excerpt = `Cited in: ${v.posts.join(', ')}`;
    }
    return v;
  });

  verses.sort((a, b) => {
    const bookA = bookOrder.indexOf(a.book);
    const bookB = bookOrder.indexOf(b.book);
    if (bookA !== bookB) return bookA - bookB;
    // Parse chapter:verse for numeric sort
    const parse = (ref) => {
      const m = ref.match(/(\d+)(?::(\d+)(?:[-–](\d+))?)?/);
      return m ? [parseInt(m[1]), parseInt(m[2] || 0)] : [0, 0];
    };
    const [chA, vA] = parse(a.ref);
    const [chB, vB] = parse(b.ref);
    if (chA !== chB) return chA - chB;
    return vA - vB;
  });

  const versesHtml = render(versesTemplate, {
    verses: verses.map(v => ({
      ...v,
      encodedRef: encodeURIComponent(v.ref)
    })),
    basePath: ''
  });
  write('verses.html', versesHtml);
  console.log('Generated verses.html');

  // --- 6. Generate devotional pages ---
  function buildDevotionals() {
    if (!exists('assets/devotionals.json')) {
      console.log('No devotionals.json found, skipping devotionals.');
      return;
    }
    const devotionals = JSON.parse(read('assets/devotionals.json'));

    // Filter to entries with content
    const readyDevotionals = devotionals.filter(d => d.has_content);
    if (readyDevotionals.length === 0) {
      console.log('No devotionals with content, skipping.');
      return;
    }

    const devoTemplate = read('templates/devotional.html');
    const seasonLabels = {
      ordinary: 'Ordinary Time',
      lent: 'Lent',
      easter: 'Eastertide',
      advent: 'Advent'
    };

    // Build prev/next links
    const allDays = devotionals.map(d => d.day);

    readyDevotionals.forEach(devotional => {
      const contentPath = `content/devotionals/${devotional.slug}.html`;
      if (!exists(contentPath)) {
        console.warn(`Warning: content fragment not found for ${devotional.slug}`);
        return;
      }
      const contentRaw = read(contentPath);
      const devoContent = contentRaw
        .replace(/\{\{basePath\}\}/g, '../../')
        .replace(/\{\{relatedBase\}\}/g, '');

      const dayIndex = allDays.indexOf(devotional.day);
      const prevDayNum = dayIndex > 0 ? allDays[dayIndex - 1] : null;
      const nextDayNum = dayIndex < allDays.length - 1 ? allDays[dayIndex + 1] : null;
      const prevEntry = prevDayNum ? devotionals.find(d => d.day === prevDayNum) : null;
      const nextEntry = nextDayNum ? devotionals.find(d => d.day === nextDayNum) : null;

      const padded = String(devotional.day).padStart(3, '0');

      const html = render(devoTemplate, {
        ...devotional,
        content: devoContent,
        basePath: '../../',
        pageTitle: `Day ${devotional.day}: ${devotional.title} | Daily Reading | Firmly With Christ`,
        ogType: 'article',
        excerpt: devotional.excerpt || `Day ${devotional.day}: ${devotional.title}`,
        day_padded: padded,
        season_label: seasonLabels[devotional.season] || devotional.season,
        prev_day: prevEntry ? `../${String(prevEntry.day).padStart(3, '0')}` : null,
        prev_day_num: prevDayNum,
        prev_title: prevEntry ? prevEntry.title : null,
        next_day: nextEntry ? `../${String(nextEntry.day).padStart(3, '0')}` : null,
        next_day_num: nextDayNum,
        next_title: nextEntry ? nextEntry.title : null
      });

      write(`devotional/day/${padded}/index.html`, html);
    });
    console.log(`Generated ${readyDevotionals.length} devotional pages.`);

    // Generate devotional index page
    const indexTemplate = read('templates/devotionals.html');

    // Group by month
    const monthNames = ['January','February','March','April','May','June','July',
                        'August','September','October','November','December'];
    const months = monthNames.map(mName => {
      const monthDays = devotionals.filter(d => d.month === mName);
      // Pre-render days HTML to avoid nested {{#each}} regex bug
      const daysHtml = monthDays.map(d => {
        const padded = String(d.day).padStart(3, '0');
        const specialClass = d.check_in_type ? ' devotional-day-card--special' : '';
        const badge = d.check_in_type ? '<span class="day-badge">Check-in</span>' : '';
        return '<a href="day/' + padded + '/" class="devotional-day-card' + specialClass + '" data-pagefind-filter="tag" data-pagefind-sort="title">' +
          '<span class="day-number">Day ' + d.day + '</span>' +
          '<span class="day-title">' + d.title + '</span>' +
          badge +
          '</a>';
      }).join('\n');
      return {
        month_name: mName,
        month_theme: monthDays[0] ? monthDays[0].theme : '',
        daysHtml: daysHtml
      };
    });

    const indexHtml = render(indexTemplate, {
      months,
      basePath: '../'
    });
    write('devotional/index.html', indexHtml);
    console.log('Generated devotional/index.html');
  }

  buildDevotionals();

  // --- 7. Validate image URLs ---
  console.log('\nValidating image URLs...');
  const badUrls = [];
  function checkFileForBadUrls(filePath, isSource = false) {
    if (!exists(filePath)) return;
    const html = read(filePath);
    const matches = html.matchAll(/(https?:\/\/[^"'\s]+)/g);
    for (const m of matches) {
      const url = m[1];
      if (url.includes('Special:FilePath')) {
        badUrls.push({ file: filePath, url, type: 'Special:FilePath redirect (unreliable)' });
      }
    }
  }
  // Check source fragments and metadata
  processedPosts.forEach(post => {
    if (post.hero_image && post.hero_image.includes('Special:FilePath')) {
      badUrls.push({ file: 'assets/posts.json', url: post.hero_image, type: 'Special:FilePath redirect (unreliable)' });
    }
    checkFileForBadUrls(`content/posts/${post.slug}.html`, true);
  });
  // Check generated output
  const generatedFiles = ['index.html', 'archive.html', 'verses.html'];
  processedPosts.forEach(post => generatedFiles.push(post.url));
  // Check devotional output too
  if (exists('assets/devotionals.json')) {
    const devotionals = JSON.parse(read('assets/devotionals.json'));
    devotionals.filter(d => d.has_content).forEach(d => {
      generatedFiles.push(`devotional/day/${String(d.day).padStart(3, '0')}/index.html`);
    });
    generatedFiles.push('devotional/index.html');
  }
  generatedFiles.forEach(f => checkFileForBadUrls(f));

  if (badUrls.length) {
    console.error('\nBUILD FAILED: Bad image URLs detected:\n');
    badUrls.forEach(b => console.error(`  ${b.file}\n    ${b.url}\n    -> ${b.type}`));
    console.error('\nFix: Run `python scripts/fix-images.py` or replace URLs with verified Wikimedia Commons thumb URLs.\n');
    process.exit(1);
  }
  console.log('Image URL validation passed.');

  // --- 8. Rebuild Pagefind ---
  console.log('\nRunning Pagefind...');
  try {
    execSync('npx -y pagefind --site .', { stdio: 'inherit' });
    console.log('Pagefind index rebuilt.');
  } catch (e) {
    console.error('Pagefind failed:', e.message);
    console.error('Run `npx -y pagefind --site .` manually if needed.');
  }

  console.log('\n=== BUILD COMPLETE ===');
}

// ============================================================================
// MAIN
// ============================================================================
const args = process.argv.slice(2);
if (args.includes('--migrate')) {
  migrate();
} else {
  build();
}
