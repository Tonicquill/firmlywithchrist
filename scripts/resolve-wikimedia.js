const fs = require('fs');
const path = require('path');
const https = require('https');

const POSTS_JSON = path.join(__dirname, '..', 'assets', 'posts.json');
const CONTENT_DIR = path.join(__dirname, '..', 'content', 'posts');

function read(file) { return fs.readFileSync(file, 'utf-8'); }
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

// Extract filename from URL
function extractFilename(url) {
  if (url.includes('Special:FilePath/')) {
    const m = url.match(/Special:FilePath\/([^?]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
  if (url.includes('upload.wikimedia.org')) {
    const pathname = new URL(url).pathname;
    return decodeURIComponent(pathname.split('/').pop());
  }
  return null;
}

function apiRequest(titles) {
  return new Promise((resolve, reject) => {
    const encoded = encodeURIComponent(titles.join('|'));
    const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encoded}&prop=imageinfo&iiprop=url|thumburl|size&iiurlwidth=1200&format=json&origin=*`;
    const req = https.get(url, {
      timeout: 30000,
      headers: { 'User-Agent': 'FirmlyWithChrist/1.0 (https://tonicquill.github.io/firmlywithchrist/)' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function main() {
  const posts = JSON.parse(read(POSTS_JSON));
  const contentFiles = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.html'));

  // Collect unique external URLs
  const urlSet = new Set();
  posts.forEach(p => { if (p.hero_image && p.hero_image.startsWith('http')) urlSet.add(p.hero_image); });
  contentFiles.forEach(f => {
    const html = read(path.join(CONTENT_DIR, f));
    const matches = html.matchAll(/src="(https:\/\/[^"]+)"/g);
    for (const m of matches) urlSet.add(m[1]);
  });

  const urls = Array.from(urlSet);
  console.log(`Resolving ${urls.length} URLs via Wikimedia API...`);

  // Build filename -> URL map
  const filenameToUrl = {};
  urls.forEach(url => {
    const fn = extractFilename(url);
    if (fn) filenameToUrl[fn] = url;
  });

  const filenames = Object.keys(filenameToUrl);
  const batches = [];
  for (let i = 0; i < filenames.length; i += 45) {
    batches.push(filenames.slice(i, i + 45));
  }

  const urlMap = {}; // external URL -> resolved direct thumb URL
  const missing = [];

  for (const batch of batches) {
    const titles = batch.map(f => 'File:' + f);
    try {
      const data = await apiRequest(titles);
      const pages = data.query?.pages || {};
      for (const [pageid, page] of Object.entries(pages)) {
        const fn = page.title?.replace('File:', '') || '';
        const origUrl = filenameToUrl[fn];
        if (!origUrl) continue;
        if (pageid === '-1' || !page.imageinfo?.length) {
          missing.push({ url: origUrl, fn });
          continue;
        }
        const info = page.imageinfo[0];
        // Use thumburl if available, otherwise url
        const resolved = info.thumburl || info.url;
        urlMap[origUrl] = resolved;
        console.log(`  OK: ${fn} -> ${resolved.substring(0, 100)}...`);
      }
    } catch (e) {
      console.error(`  API batch failed: ${e.message}`);
      batch.forEach(fn => missing.push({ url: filenameToUrl[fn], fn }));
    }
    // Delay between API batches
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\nResolved: ${Object.keys(urlMap).length}, Missing: ${missing.length}`);

  // Update posts.json
  posts.forEach(p => {
    if (p.hero_image && urlMap[p.hero_image]) p.hero_image = urlMap[p.hero_image];
  });
  write(POSTS_JSON, JSON.stringify(posts, null, 2) + '\n');

  // Update content fragments
  contentFiles.forEach(f => {
    let html = read(path.join(CONTENT_DIR, f));
    let changed = false;
    for (const [extUrl, resolved] of Object.entries(urlMap)) {
      if (html.includes(extUrl)) {
        html = html.split(extUrl).join(resolved);
        changed = true;
      }
    }
    if (changed) {
      write(path.join(CONTENT_DIR, f), html);
      console.log(`  UPDATED: content/posts/${f}`);
    }
  });

  if (missing.length) {
    console.log('\nMissing files (need replacements):');
    missing.forEach(m => console.log(`  ${m.fn}`));
    fs.writeFileSync(path.join(__dirname, '..', 'data', 'missing-images.json'), JSON.stringify(missing, null, 2) + '\n');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
