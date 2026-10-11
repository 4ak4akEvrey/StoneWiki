import re
from html import escape

# ── Эмодзи перед H1 и подзаголовок-описание под ним ──
# Эмодзи берётся из front matter `emoji:` или из начала названия в nav (mkdocs.yml).
# Подзаголовок — из front matter `description:`.

LEAD = re.compile(r'^([^\w\s«"(]+)\s+')
H1 = re.compile(r'<h1([^>]*)>')


def lead(title):
    m = LEAD.match(title or '')
    return m.group(1) if m else ''


def on_page_content(html, page, **kw):
    e = page.meta.get('emoji') or lead(page.title)
    d = page.meta.get('description')
    m = H1.search(html)
    if not m:
        return html
    if e and not lead(re.sub(r'<[^>]+>', '', html[m.end():m.end() + 64])):
        html = html[:m.end()] + f'<span class="sl-emoji">{e}</span>' + html[m.end():]
    if d:
        i = html.index('</h1>') + 5
        html = html[:i] + f'<p class="sl-desc">{escape(d)}</p>' + html[i:]
    return html
