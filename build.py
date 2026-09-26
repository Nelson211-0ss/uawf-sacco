"""Build the UAWF SACCO site.

Every page shares one header and one footer. Edit them in src/partials/,
edit page content in src/pages/, styles in src/styles.css and behaviour in
src/script.js, then run:

    python build.py

Home is written to index.html; every other page gets its own folder
(about/index.html, services/index.html, ...), so addresses read /about/ and
/services/ with no ".html" on any web server, including VS Code Live Server
and GitHub Pages. The old about.html etc. become small redirects.

The build also keeps the site fast and light:
- photos in images/photos/ become WebP files in three sizes (assets/hero/),
  and each page asks the browser for the size that fits the screen
- logos in images/logo/ become small WebP files (assets/logo/)
- icons are written straight into the pages (no icon script to download)
- CSS and JavaScript are minified to assets/site.css and assets/site.js
- a search index of every page, section, service and FAQ answer is written
  to assets/search-index.js for the site search
Images are only regenerated when their source file changes.

Needs: pip install pillow rcssmin rjsmin beautifulsoup4

Each file in src/pages/ starts with a small settings block:

    <!--
    title: Page title shown in the browser tab
    description: One sentence for search engines
    nav: services
    -->

`nav` marks which header link is the current page (home, about, services,
membership, calculator, faq or contact). A header link can stand for more
than one page, e.g. data-nav="about faq" highlights About on the FAQ page.
"""

import json
import re
from pathlib import Path

import rcssmin
from bs4 import BeautifulSoup
import rjsmin
from PIL import Image, ImageFilter

ROOT = Path(__file__).parent
SRC = ROOT / "src"
PARTIALS = SRC / "partials"
PAGES = SRC / "pages"
ASSETS = ROOT / "assets"

PHOTO_WIDTHS = (480, 960, 1440)
# logo files: (source in images/logo, output name, height in px or None, width in px or None)
LOGOS = [
    ("logo.png", "logo.webp", 144, None),
    ("logo-white.png", "logo-white.webp", 144, None),
    ("icon-white-tight.png", "icon-white.webp", None, 120),
    ("wordmark-white.png", "wordmark-white.webp", None, 340),
]


def read(path):
    return path.read_text(encoding="utf-8")


def is_stale(src, out):
    return not out.exists() or out.stat().st_mtime < src.stat().st_mtime


# ---------------------------------------------------------------- images

def build_images():
    hero = ASSETS / "hero"
    logo = ASSETS / "logo"
    hero.mkdir(parents=True, exist_ok=True)
    logo.mkdir(parents=True, exist_ok=True)
    made = 0
    for old in hero.glob("*.webp"):
        if int(old.stem.rsplit("-", 1)[-1]) not in PHOTO_WIDTHS:
            old.unlink()
    for photo in sorted((ROOT / "images" / "photos").glob("*.jpg")):
        for width in PHOTO_WIDTHS:
            out = hero / ("%s-%d.webp" % (photo.stem, width))
            if is_stale(photo, out):
                im = Image.open(photo).convert("RGB")
                im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
                if width == max(PHOTO_WIDTHS):
                    # a very light smoothing removes grass and leaf noise that costs a lot of bytes
                    im = im.filter(ImageFilter.GaussianBlur(0.55))
                # banner photos sit under a dark green overlay, so they can be compressed hard
                im.save(out, "WEBP", quality={480: 66, 960: 60}.get(width, 54), method=6)
                made += 1
    for name, out_name, height, width in LOGOS:
        src = ROOT / "images" / "logo" / name
        out = logo / out_name
        if is_stale(src, out):
            im = Image.open(src).convert("RGBA")
            if height:
                size = (round(im.width * height / im.height), height)
            else:
                size = (width, round(im.height * width / im.width))
            im.resize(size, Image.LANCZOS).save(out, "WEBP", quality=88, method=6)
            made += 1
    texture = ROOT / "images" / "footer-texture.svg"
    if texture.exists():
        (ASSETS / "footer-texture.svg").write_text(read(texture), encoding="utf-8")
    icon_src = ROOT / "images" / "logo" / "icon.png"
    touch = logo / "icon-180.png"
    if is_stale(icon_src, touch):
        Image.open(icon_src).resize((180, 180), Image.LANCZOS).save(touch, optimize=True)
        made += 1
    return made


def responsive_images(html):
    """Swap each photo for WebP in three sizes, sized for where it sits."""
    def swap(m):
        tag, prefix, name = m.group(0), m.group(1), m.group(2)
        # the tag that wraps this photo tells us where it sits on the page
        opened = re.findall(r"<[a-z][^>]*>", html[max(0, m.start() - 600):m.start()])
        context = opened[-1] if opened else ""
        if "mega-feature" in context:
            sizes = "320px"
        elif any(c in context for c in ("hero-slide", "page-hero-bg", "impact-bg")):
            sizes = "100vw"
        else:
            sizes = "(max-width: 980px) 100vw, 50vw"
        srcset = ", ".join("%sassets/hero/%s-%d.webp %dw" % (prefix, name, w, w) for w in PHOTO_WIDTHS)
        tag = tag.replace('src="%sassets/hero/%s.jpg"' % (prefix, name),
                          'src="%sassets/hero/%s-960.webp" srcset="%s" sizes="%s"' % (prefix, name, srcset, sizes))
        # later hero slides and the mega menu photos wait until needed (see script.js)
        if 'class="hero-slide"' in context or "mega-feature" in context:
            tag = tag.replace(' src="', ' data-src="').replace(' srcset="', ' data-srcset="')
        return tag
    return re.sub(r'<img [^>]*src="((?:\.\./)?)assets/hero/([a-z-]+)\.jpg"[^>]*>', swap, html)


def webp_logos(html):
    return re.sub(r'assets/logo/(logo|logo-white|icon-white-tight|wordmark-white)\.png',
                  lambda m: "assets/logo/%s.webp" % ("icon-white" if m.group(1) == "icon-white-tight" else m.group(1)),
                  html)


# ---------------------------------------------------------------- icons

ICONS = json.loads(read(SRC / "feather-icons.json"))


def svg_icon(name, extra_class=""):
    classes = ("feather feather-%s %s" % (name, extra_class)).strip()
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" '
            'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" '
            'stroke-linejoin="round" class="%s" aria-hidden="true" focusable="false">%s</svg>'
            % (classes, ICONS[name]))


def inline_icons(html):
    def swap(m):
        return svg_icon(m.group(1), m.group(2) or "")
    html = re.sub(r'<i data-feather="([a-z0-9-]+)"(?: class="([^"]*)")?></i>', swap, html)
    # icons the photo slider swaps in as the slides change
    slide_icons = sorted(set(re.findall(r'class="hero-slide[^"]*"[^>]*data-icon="([a-z0-9-]+)"', html)))
    if slide_icons:
        sprite = "".join('<span data-icon="%s">%s</span>' % (n, svg_icon(n)) for n in slide_icons)
        html = html.replace("</main>", '<div id="iconSprites" hidden>%s</div>\n</main>' % sprite, 1)
    return html


# ---------------------------------------------------------------- search

PAGE_LABELS = {"index": "Home", "about": "About", "services": "Services", "membership": "Membership",
               "calculator": "Calculator", "faq": "FAQ", "contact": "Contact"}


def tidy(text):
    return re.sub(r"\s+", " ", text or "").strip()


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:48]


def faq_ids(content):
    """Give each FAQ question an id (q-what-is-a-sacco) so links can open it."""
    def add(m):
        question = re.sub(r"<[^>]+>", "", m.group(2))
        return '<details id="q-%s" %s><summary>%s' % (slug(question), m.group(1), m.group(2))
    return re.sub(r'<details ((?:(?!id=)[^>])*)>\s*<summary>([^<]*)', add, content)


def search_records(stem, content):
    """Pull searchable entries out of one page: the page, its sections, cards and FAQs."""
    soup = BeautifulSoup(content, "html.parser")
    url = "./" if stem == "index" else stem + "/"
    label = PAGE_LABELS.get(stem, stem.title())
    h1 = soup.find("h1")
    lead = soup.find(class_=["page-hero-lead", "hero-lead"])
    records = [{"t": tidy(h1.get_text(" ")) if h1 else label, "p": label, "u": url,
                "x": tidy(lead.get_text(" ")) if lead else "", "k": "page"}]
    if stem == "index":
        return records  # the home page only previews the other pages
    seen = set()
    for section in soup.find_all("section", id=True):
        if section["id"] == "top":
            continue
        h2 = section.find("h2")
        if h2:
            first_p = section.find(class_=["section-lead", "split-lead"]) or section.find("p", class_=False)
            records.append({"t": tidy(h2.get_text(" ")), "p": label, "u": url + "#" + section["id"],
                            "x": tidy(first_p.get_text(" "))[:220] if first_p else "", "k": "section"})
        for head in section.find_all(["h3", "summary", "strong"]):
            title = tidy(head.get_text(" "))
            if len(title) < 3 or title in seen or head.find_parent(["dt", "dd", "button"]):
                continue
            if head.name == "strong" and not head.find_parent(class_=["card", "value-card", "mini-card", "serve-item"]):
                continue
            if head.name == "summary":
                body = head.find_next_sibling(class_="faq-body")
                text = tidy(body.get_text(" ")) if body else ""
            else:
                holder = head.find_parent(class_="card") or head.parent
                text = " ".join(tidy(p.get_text(" ")) for p in holder.find_all(["p", "li"])
                                if "svc-tag" not in (p.get("class") or []))
            anchor = head.find_parent("details", id=True) or head.find_parent(id=True)
            target = anchor["id"] if anchor and anchor is not section else section["id"]
            seen.add(title)
            records.append({"t": title, "p": label, "u": url + "#" + target, "x": text[:300],
                            "k": "faq" if head.name == "summary" else "item"})
    return records


# ---------------------------------------------------------------- pages

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
    """Highlight the header and quick-bar links that point to the current page."""
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
        html = re.sub(r'(href|src|data-src)="assets/', r'\1="%sassets/' % up, html)
        html = re.sub(r'(srcset|data-srcset)="([^"]*)"',
                      lambda m: '%s="%s"' % (m.group(1), m.group(2).replace("assets/", up + "assets/")), html)
    return html


REDIRECT = """<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Moved</title>
<meta http-equiv="refresh" content="0; url={to}"><link rel="canonical" href="{to}">
<script>location.replace("{to}" + location.search + location.hash);</script>
</head><body><a href="{to}">Continue</a></body></html>
"""


def build():
    global PAGE_NAMES
    made = build_images()
    (ASSETS / "site.css").write_text(rcssmin.cssmin(read(SRC / "styles.css")), encoding="utf-8")
    (ASSETS / "site.js").write_text(rjsmin.jsmin(read(SRC / "script.js")), encoding="utf-8")

    PAGE_NAMES = [p.stem for p in PAGES.glob("*.html")]
    head = read(PARTIALS / "head.html")
    preloader = read(PARTIALS / "preloader.html")
    header = read(PARTIALS / "header.html")
    footer = read(PARTIALS / "footer.html")

    built = []
    index = []
    for page in sorted(PAGES.glob("*.html")):
        settings, content = parse_page(read(page))
        content = faq_ids(content)
        index.extend(search_records(page.stem, content))
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
        html = inline_icons(webp_logos(responsive_images(html)))
        # the home banner photo is fetched early, but only on the home page
        if page.stem == "index":
            html = html.replace(" data-home-only", "")
        else:
            html = re.sub(r"<link [^>]*data-home-only>\n", "", html)
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
    (ASSETS / "search-index.js").write_text(
        "window.UAWF_SEARCH=" + json.dumps(index, ensure_ascii=False, separators=(",", ":")) + ";", encoding="utf-8")
    print("Search index: %d entries" % len(index))
    print("Built: " + ", ".join(built) + ("  (%d images generated)" % made if made else ""))


if __name__ == "__main__":
    build()
