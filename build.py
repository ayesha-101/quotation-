#!/usr/bin/env python3
"""Build index.html from src/app-template.html + catalog-data.js.

The template contains three placeholder tokens:
  __CATALOG_PLACEHOLDER__  -> replaced once with the catalog JS array literal
  __STATE_PLACEHOLDER__    -> the live embedded DATA slot (seeded as '{}')
  __SHELL_PLACEHOLDER__    -> the self-referential PAGE_SHELL template string,
                              which lets the running page regenerate and
                              publish a full replacement document via the
                              Claude Artifact `artifact` capability.

Run this again any time src/app-template.html or catalog-data.js changes.
"""
import json
import re
import sys

TEMPLATE = 'src/app-template.html'
CATALOG = 'catalog-data.js'
OUT = 'index.html'

def main():
    html = open(TEMPLATE, encoding='utf-8').read()
    catalog_js = open(CATALOG, encoding='utf-8').read()
    m = re.search(r'window\.BMTC_CATALOG\s*=\s*(\[.*\]);', catalog_js, re.S)
    if not m:
        sys.exit('catalog array not found in ' + CATALOG)
    catalog_array_text = m.group(1)

    if html.count('__CATALOG_PLACEHOLDER__') != 1:
        sys.exit('expected exactly one __CATALOG_PLACEHOLDER__')
    t1 = html.replace('__CATALOG_PLACEHOLDER__', catalog_array_text, 1)

    if t1.count('__STATE_PLACEHOLDER__') != 2:
        sys.exit('expected exactly two __STATE_PLACEHOLDER__ occurrences (slot + runtime reference)')
    if t1.count('__SHELL_PLACEHOLDER__') != 2:
        sys.exit('expected exactly two __SHELL_PLACEHOLDER__ occurrences (slot + runtime reference)')

    # Escape for safe embedding inside a JS string literal inside <script>:
    # prevents any literal </script> sequence from breaking the page.
    inner = json.dumps(t1)[1:-1]
    inner = inner.replace('<', '\\u003c')

    t2 = t1.replace('__SHELL_PLACEHOLDER__', inner, 1)   # fills the PAGE_SHELL declaration slot
    t3 = t2.replace('__STATE_PLACEHOLDER__', '{}', 1)    # fills the live state slot (empty = falls back to seedData())

    open(OUT, 'w', encoding='utf-8').write(t3)
    print(f'wrote {OUT}: {len(t3):,} bytes')

if __name__ == '__main__':
    main()
