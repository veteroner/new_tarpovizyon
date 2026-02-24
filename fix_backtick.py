#!/usr/bin/env python3
"""Fix backtick-quoted MySQL column names inside JS template literals."""
import re

paths = [
    '/Volumes/LaCie/dashboard-project/src/pages/PopulationPage.tsx',
    '/Volumes/LaCie/dashboard-project/netlify-dashboard/src/pages/PopulationPage.tsx',
]

for path in paths:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace SQL backtick-quoted column names with escaped backticks
    # `erkek/T` -> \`erkek/T\`
    before = content
    content = content.replace('`erkek/T`', r'\`erkek/T\`')
    content = content.replace('`kadın/T`', r'\`kadın/T\`')

    changed = content != before
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"{'CHANGED' if changed else 'no change'}: {path.split('/')[-2]}/{path.split('/')[-1]}")

print("Done")
