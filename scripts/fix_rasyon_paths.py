import os, re

RASYON_ROUTES = [
    '/wizard', '/ration', '/feeds', '/history', '/inventory',
    '/diagnostics', '/evaluation', '/scenarios', '/privacy',
    '/terms', '/backup', '/help', '/settings', '/admin',
]

def needs_prefix(s):
    for r in RASYON_ROUTES:
        if s.startswith(r):
            return True
    return s == '/'

BASE = '/Volumes/LaCie/dashboard-project/src/rasyon'

count = 0
for root, dirs, files in os.walk(BASE):
    dirs[:] = [d for d in dirs if not d.startswith('.')]
    for fname in files:
        if not (fname.endswith('.tsx') or fname.endswith('.ts')):
            continue
        fpath = os.path.join(root, fname)
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            old = f.read()
        new = old

        def fix(m):
            q = m.group(1)
            path = m.group(2)
            if path.startswith('/rasyon'):
                return m.group(0)
            if not needs_prefix(path):
                return m.group(0)
            new_p = '/rasyon' if path == '/' else '/rasyon' + path
            return 'to=' + q + new_p + q

        def fix_nav(m):
            q = m.group(1)
            path = m.group(2)
            if path.startswith('/rasyon'):
                return m.group(0)
            if not needs_prefix(path):
                return m.group(0)
            new_p = '/rasyon' if path == '/' else '/rasyon' + path
            return 'navigate(' + q + new_p + q

        new = re.sub(r'\bto=(["\'])(/[^"\']+)\1', fix, new)
        new = re.sub(r'\bnavigate\((["\'])(/[^"\']+)\1', fix_nav, new)

        if new != old:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(new)
            count += 1
            print(f'  updated: {fpath.replace(BASE, ".")}')

print(f'\nDone – {count} files updated.')
