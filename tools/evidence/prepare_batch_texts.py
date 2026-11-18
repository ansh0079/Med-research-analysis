"""Write the exact text an aligned evidence batch was built from, one file per downloaded document.

The batch builders (topic-alignment-batch-26 .. 29) extracted text from the downloaded documents
in Python and took every quote from that text. The loader (scripts/load_aligned_batch.js) stores
these texts in guideline_documents, so the stored full text must be the same string the quotes
came from. This script reproduces that extraction and writes <ID>.loadtext.txt next to each file.

  python -I tools/evidence/prepare_batch_texts.py <batch folder> [<batch folder> ...]

Supported inputs in <batch>/docs-to-load/:
  *.xml   PMC / Europe PMC JATS  -> text of p, title, td, th, li, caption elements, joined by newlines
  *.html  publisher HTML         -> tags stripped, entities unescaped
  *.txt   deferred-topics-evidence downloads -> body after the '=====' metadata header
"""
import html
import os
import re
import sys
import xml.etree.ElementTree as ET

BLOCK_TAGS = ('p', 'title', 'td', 'th', 'li', 'caption')


def xml_text(raw):
    root = ET.fromstring(raw)
    out = []
    for el in root.iter():
        if el.tag.split('}')[-1] in BLOCK_TAGS:
            out.append(''.join(el.itertext()))
    return chr(10).join(out)


def html_text(raw):
    t = re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', raw, flags=re.S)
    t = re.sub(r'<[^>]+>', ' ', t)
    return html.unescape(t)


def txt_body(raw):
    i = raw.find('=' * 40)
    return raw[i:].lstrip('=\n ') if i >= 0 else raw


def doc_id(name):
    m = re.match(r'(PMC\d+)', name)
    if m:
        return m.group(1)
    m = re.match(r'topic_\d+_(PMC\d+)', name)
    return m.group(1) if m else os.path.splitext(name)[0]


def main(folders):
    for folder in folders:
        src = os.path.join(folder, 'docs-to-load')
        if not os.path.isdir(src):
            print(f'{folder}: no docs-to-load folder')
            continue
        done = 0
        for name in sorted(os.listdir(src)):
            path = os.path.join(src, name)
            if not os.path.isfile(path) or name.endswith('.loadtext.txt'):
                continue
            raw = open(path, encoding='utf-8', errors='replace').read()
            if name.endswith('.xml'):
                text = xml_text(raw)
            elif name.endswith('.html') or name.endswith('.htm'):
                text = html_text(raw)
            elif name.endswith('.txt'):
                text = txt_body(raw)
            else:
                continue
            out = os.path.join(src, doc_id(name) + '.loadtext.txt')
            with open(out, 'w', encoding='utf-8', newline='') as f:
                f.write(text)
            done += 1
        print(f'{folder}: wrote {done} load texts')


if __name__ == '__main__':
    main(sys.argv[1:])
