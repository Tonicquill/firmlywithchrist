const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');
const DATA_DIR = path.join(__dirname, '..', 'data');
const POSTS_JSON = path.join(__dirname, '..', 'assets', 'posts.json');
const CONTENT_DIR = path.join(__dirname, '..', 'content', 'posts');
const MAP_FILE = path.join(DATA_DIR, 'image-map.json');

function read(file) { return fs.readFileSync(file, 'utf-8'); }
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
function safeUnlink(p) { try { fs.unlinkSync(p); } catch(e) {} }

// Follow redirects manually with HEAD
function resolveRedirect(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    let redirects = 0;
    function doRequest(currentUrl) {
      const client = currentUrl.startsWith('https:') ? https : require('http');
      const req = client.request(currentUrl, {
        method: 'HEAD', timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects < maxRedirects) {
          redirects++;
          doRequest(new URL(res.headers.location, currentUrl).href);
          return;
        }
        resolve({ url: currentUrl, status: res.statusCode });
      });
      req.on('error', (e) => resolve({ url: currentUrl, status: 0, error: e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ url: currentUrl, status: 0, error: 'timeout' }); });
      req.end();
    }
    doRequest(url);
  });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const client = url.startsWith('https:') ? https : require('http');
    const req = client.get(url, {
      timeout: 60000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        safeUnlink(destPath);
        downloadFile(new URL(res.headers.location, url).href, destPath).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        safeUnlink(destPath);
        reject(new Error('HTTP ' + res.statusCode));
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    });
    req.on('error', (e) => { file.close(); safeUnlink(destPath); reject(e); });
    req.on('timeout', () => { req.destroy(); file.close(); safeUnlink(destPath); reject(new Error('timeout')); });
  });
}

function makeThumbUrl(uploadUrl, width = 1200) {
  const url = new URL(uploadUrl);
  const pathname = url.pathname;
  const filename = pathname.split('/').pop();
  const thumbPath = pathname.replace('/wikipedia/commons/', '/wikipedia/commons/thumb/') + '/' + width + 'px-' + filename;
  url.pathname = thumbPath;
  return url.href;
}

function makeThumbUrlJpeg(uploadUrl, width = 1200) {
  const url = new URL(uploadUrl);
  const pathname = url.pathname;
  let filename = pathname.split('/').pop();
  if (/\.tif$/i.test(filename)) filename = filename.replace(/\.tif$/i, '.tif.jpg');
  const thumbPath = pathname.replace('/wikipedia/commons/', '/wikipedia/commons/thumb/') + '/' + width + 'px-' + filename;
  url.pathname = thumbPath;
  return url.href;
}

function hashUrl(url) {
  return crypto.createHash('sha256').update(url).digest('hex').slice(0, 12);
}

function extFromUrl(url) {
  const pathname = new URL(url).pathname;
  let ext = path.extname(pathname).toLowerCase();
  if (!ext && url.includes('Special:FilePath/')) {
    const m = url.match(/Special:FilePath\/([^?]+)/);
    if (m) ext = path.extname(m[1]).toLowerCase();
  }
  if (ext === '.tif' || ext === '.tiff') return '.jpg';
  return ext || '.jpg';
}

async function resolveUrl(url) {
  if (url.includes('upload.wikimedia.org')) return url;
  if (url.includes('Special:FilePath')) {
    const result = await resolveRedirect(url);
    if (result.status >= 200 && result.status < 400) return result.url;
  }
  return url;
}

async function downloadImage(url, destPath) {
  const directUrl = await resolveUrl(url);
  const thumbUrl = makeThumbUrl(directUrl, 1200);
  const thumbUrlJpeg = makeThumbUrlJpeg(directUrl, 1200);
  try {
    await downloadFile(thumbUrl, destPath);
    return;
  } catch (e) {
    try {
      await downloadFile(thumbUrlJpeg, destPath);
      return;
    } catch (e2) {
      await downloadFile(directUrl, destPath);
    }
  }
}

async function main() {
  const posts = JSON.parse(read(POSTS_JSON));
  const contentFiles = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.html'));

  const urlSet = new Set();
  posts.forEach(p => { if (p.hero_image && p.hero_image.startsWith('http')) urlSet.add(p.hero_image); });
  contentFiles.forEach(f => {
    const html = read(path.join(CONTENT_DIR, f));
    const matches = html.matchAll(/src="(https:\/\/[^"]+)"/g);
    for (const m of matches) urlSet.add(m[1]);
  });

  let imageMap = {};
  if (fs.existsSync(MAP_FILE)) imageMap = JSON.parse(read(MAP_FILE));

  const urls = Array.from(urlSet);
  console.log(`Found ${urls.length} unique external image URLs`);

  let downloaded = 0;
  let failed = [];

  for (const url of urls) {
    if (imageMap[url]) {
      const localPath = path.join(__dirname, '..', imageMap[url]);
      if (fs.existsSync(localPath)) {
        console.log(`  SKIP (cached): ${url.substring(0, 90)}...`);
        continue;
      }
    }

    const ext = extFromUrl(url);
    const filename = `img-${hashUrl(url)}${ext}`;
    const localRel = `assets/images/${filename}`;
    const localAbs = path.join(__dirname, '..', localRel);

    console.log(`  DOWNLOAD: ${url.substring(0, 90)}...`);
    try {
      await downloadImage(url, localAbs);
      imageMap[url] = localRel;
      downloaded++;
      console.log(`    OK -> ${localRel}`);
    } catch (e) {
      console.error(`    FAILED: ${e.message}`);
      failed.push({ url, error: e.message });
    }
    // Wait between requests to avoid rate limiting
    await new Promise(r => setTimeout(r, 3000));
  }

  write(MAP_FILE, JSON.stringify(imageMap, null, 2) + '\n');

  posts.forEach(p => {
    if (p.hero_image && imageMap[p.hero_image]) p.hero_image = imageMap[p.hero_image];
  });
  write(POSTS_JSON, JSON.stringify(posts, null, 2) + '\n');

  contentFiles.forEach(f => {
    let html = read(path.join(CONTENT_DIR, f));
    let changed = false;
    for (const [extUrl, localRel] of Object.entries(imageMap)) {
      if (html.includes(extUrl)) {
        html = html.split(extUrl).join(localRel);
        changed = true;
      }
    }
    if (changed) {
      write(path.join(CONTENT_DIR, f), html);
      console.log(`  UPDATED: content/posts/${f}`);
    }
  });

  console.log(`\nDone: ${downloaded} downloaded, ${failed.length} failed, ${Object.keys(imageMap).length} total mapped.`);
  if (failed.length) {
    console.log('\nFailed URLs:');
    failed.forEach(f => console.log(`  ${f.url}`));
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
