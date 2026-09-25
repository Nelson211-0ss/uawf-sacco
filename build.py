"""Build the UAWF SACCO site.

Every page shares one header and one footer. Edit them in src/partials/,
edit page content in src/pages/, then run:

    python build.py

Home is written to index.html; every other page gets its own folder
(about/index.html, services/index.html, ...), so addresses read /about/ and
/services/ with no ".html" on any web server, including VS Code Live Server
and GitHub Pages. The old about.html etc. become small redirects.

Each file in src/pages/ starts with a small settings block:

    <!--
    title: Page title shown in the browser tab
    description: One sentence for search engines
    nav: services
    -->

`nav` marks which header link is the current page (home, about, services,
membership, calculator, faq or contact).
"""

import re
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"
PARTIALS = SRC / "partials"
PAGES = SRC / "pages"


def read(path):
    return path.read_text(encoding="utf-8")


def parse_page(text):
    match = re.match(r"\s*<!--(.*?)-->\s*", text, re.S)
    if not match:
        raise ValueError("page is missing its <!-- title / description / nav --> block")
    settings = {}
    for line in match.group(1).strip().splitlines():
        key, _, value = line.partition(":")
        settings[key.strip()] = value.strip()
    return settings, text[match.end():]


def mark_current(html, nav):
    """Highlight the header and quick-bar links that point to the current page.

    data-nav can list several pages, e.g. data-nav="about faq" keeps About
    highlighted on the FAQ page, which sits inside the About menu.
    """
    return re.sub(
        r'(<a [^>]*data-nav="(?:[^"]* )?%s(?: [^"]*)?")' % re.escape(nav),
        r'\1 class="active" aria-current="page"',
        html,
    )


PAGE_NAMES = None


def clean_urls(html, depth):
    """Make every page a folder so addresses have no .html.

    about.html is written to about/index.html and linked as "about/"; any web
    server (Live Server, GitHub Pages, ...) opens a folder's index.html.
    Pages one folder deep get "../" in front of their links and assets.
    """
    up = "../" * depth

    def page_link(m):
        name, rest = m.group(1), m.group(2) or ""
        return 'href="%s%s"' % (up + ("" if name == "index" else name + "/") or "./", rest)
    html = re.sub(r'href="(%s)\.html([#?][^"]*)?"' % "|".join(PAGE_NAMES), page_link, html)
    if up:
        html = re.sub(r'(href|src)="(assets/|styles\.css|script\.js)', r'\1="%s\2' % up, html)
    return html


REDIRECT = """<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Moved</title>
<meta http-equiv="refresh" content="0; url={to}"><link rel="canonical" href="{to}">
<script>location.replace("{to}" + location.search + location.hash);</script>
</head><body><a href="{to}">Continue</a></body></html>
"""


def build():
    global PAGE_NAMES
    PAGE_NAMES = [p.stem for p in PAGES.glob("*.html")]
    head = read(PARTIALS / "head.html")
    preloader = read(PARTIALS / "preloader.html")
    header = read(PARTIALS / "header.html")
    footer = read(PARTIALS / "footer.html")

    built = []
    for page in sorted(PAGES.glob("*.html")):
        settings, content = parse_page(read(page))
        nav = settings.get("nav", "")
        html = "".join([
            head.replace("{{title}}", settings["title"]).replace("{{description}}", settings["description"]),
            '<body class="page-%s">\n\n' % nav,
            preloader,
            '\n<a class="skip-link" href="#main">Skip to main content</a>\n\n',
            mark_current(header, nav),
            "\n\n",
            content.strip(),
            "\n\n",
            mark_current(footer, nav),
            "</body>\n</html>\n",
        ])
        if page.stem == "index":
            (ROOT / "index.html").write_text(clean_urls(html, 0), encoding="utf-8")
            built.append("/")
        else:
            folder = ROOT / page.stem
            folder.mkdir(exist_ok=True)
            (folder / "index.html").write_text(clean_urls(html, 1), encoding="utf-8")
            # keep old addresses like about.html working
            (ROOT / page.name).write_text(REDIRECT.format(to=page.stem + "/"), encoding="utf-8")
            built.append("/" + page.stem + "/")
    print("Built: " + ", ".join(built))


if __name__ == "__main__":
    build()
