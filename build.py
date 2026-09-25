"""Build the UAWF SACCO site.

Every page shares one header and one footer. Edit them in src/partials/,
edit page content in src/pages/, then run:

    python build.py

The finished pages (index.html, about.html, ...) are written to the project
root, which is what the browser and GitHub Pages serve. Links between pages
are written without ".html" (about, services, ...), so the address bar shows
clean URLs like /about. Preview locally with `python serve.py`.

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


def clean_urls(html):
    """Write page links without .html: about.html -> about, index.html -> ./"""
    def swap(m):
        name, rest = m.group(1), m.group(2) or ""
        return 'href="%s%s"' % ("./" if name == "index" else name, rest)
    return re.sub(r'href="(%s)\.html([#?][^"]*)?"' % "|".join(PAGE_NAMES), swap, html)


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
        (ROOT / page.name).write_text(clean_urls(html), encoding="utf-8")
        built.append(page.name)
    print("Built: " + ", ".join(built))


if __name__ == "__main__":
    build()
