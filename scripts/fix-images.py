import json
import os
import re
import time
import urllib.request
import urllib.parse

BASE = os.path.join(os.path.dirname(__file__), '..')
POSTS_JSON = os.path.join(BASE, 'assets', 'posts.json')
CONTENT_DIR = os.path.join(BASE, 'content', 'posts')

UA = 'FirmlyWithChrist/1.0 (https://tonicquill.github.io/firmlywithchrist/)'

def api_fetch(titles):
    encoded = urllib.parse.quote('|'.join(titles))
    url = f'https://commons.wikimedia.org/w/api.php?action=query&titles={encoded}&prop=imageinfo&iiprop=url|thumburl&iiurlwidth=1280&format=json'
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode('utf-8'))

def strip_utm(url):
    return url.split('?')[0] if url else url

def extract_filename(url):
    if 'Special:FilePath/' in url:
        m = re.search(r'Special:FilePath/([^?]+)', url)
        return urllib.parse.unquote(m.group(1)) if m else None
    if 'upload.wikimedia.org' in url:
        path = urllib.parse.urlparse(url).path
        return urllib.parse.unquote(os.path.basename(path))
    return None

def main():
    with open(POSTS_JSON, 'r', encoding='utf-8') as f:
        posts = json.load(f)

    content_files = [f for f in os.listdir(CONTENT_DIR) if f.endswith('.html')]

    # Collect unique external URLs
    url_set = set()
    for p in posts:
        if p.get('hero_image', '').startswith('http'):
            url_set.add(p['hero_image'])
    for cf in content_files:
        with open(os.path.join(CONTENT_DIR, cf), 'r', encoding='utf-8') as f:
            html = f.read()
        for m in re.finditer(r'src="(https://[^"]+)"', html):
            url_set.add(m.group(1))

    urls = list(url_set)
    print(f'Found {len(urls)} unique external image URLs')

    # Map filename -> original URL
    fn_to_url = {}
    for url in urls:
        fn = extract_filename(url)
        if fn:
            fn_to_url[fn] = url

    filenames = list(fn_to_url.keys())
    url_map = {}  # original URL -> resolved thumb URL
    missing = []

    # Process in batches of 10 to avoid rate limits
    batch_size = 10
    for i in range(0, len(filenames), batch_size):
        batch = filenames[i:i+batch_size]
        titles = [f'File:{fn}' for fn in batch]
        try:
            data = api_fetch(titles)
            pages = data.get('query', {}).get('pages', {})
            # Build normalized title -> original filename map
            norm_map = {}
            for n in data.get('query', {}).get('normalized', []):
                orig_fn = n['from'].replace('File:', '')
                norm_fn = n['to'].replace('File:', '')
                norm_map[norm_fn] = orig_fn
            for page_id, page in pages.items():
                norm_fn = page.get('title', '').replace('File:', '')
                fn = norm_map.get(norm_fn, norm_fn)
                orig_url = fn_to_url.get(fn)
                if not orig_url:
                    continue
                if page_id == '-1' or not page.get('imageinfo'):
                    missing.append({'url': orig_url, 'fn': fn})
                    print(f'  MISSING: {fn}')
                    continue
                info = page['imageinfo'][0]
                resolved = strip_utm(info.get('thumburl') or info.get('url'))
                url_map[orig_url] = resolved
                print(f'  OK: {fn} -> {resolved[:100]}...')
        except Exception as e:
            print(f'  API batch failed: {e}')
            for fn in batch:
                missing.append({'url': fn_to_url.get(fn), 'fn': fn})
        time.sleep(1.5)

    print(f'\nResolved: {len(url_map)}, Missing: {len(missing)}')

    # Update posts.json
    for p in posts:
        if p.get('hero_image') in url_map:
            p['hero_image'] = url_map[p['hero_image']]
    with open(POSTS_JSON, 'w', encoding='utf-8') as f:
        json.dump(posts, f, indent=2)
        f.write('\n')

    # Update content fragments
    for cf in content_files:
        path = os.path.join(CONTENT_DIR, cf)
        with open(path, 'r', encoding='utf-8') as f:
            html = f.read()
        changed = False
        for orig, resolved in url_map.items():
            if orig in html:
                html = html.replace(orig, resolved)
                changed = True
        if changed:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(html)
            print(f'  UPDATED: content/posts/{cf}')

    if missing:
        print('\nMissing files (need replacements):')
        for m in missing:
            print(f'  {m["fn"]}')

if __name__ == '__main__':
    main()
