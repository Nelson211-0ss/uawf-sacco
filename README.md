# UAWF SACCO website

Website for United Agricultural Workers & Farmers Savings & Credit Cooperative (UAWF SACCO), Mbarara City.

## Pages

| Page | Address | File |
|---|---|---|
| Home | `/` | `index.html` |
| About | `/about/` | `about/index.html` |
| Services | `/services/` | `services/index.html` |
| Membership | `/membership/` | `membership/index.html` |
| Calculator | `/calculator/` | `calculator/index.html` |
| FAQ | `/faq/` | `faq/index.html` |
| Contact | `/contact/` | `contact/index.html` |

Each page is a folder with its own `index.html`, so addresses have no `.html` on any web server (VS Code Live Server, GitHub Pages, ...). The old `about.html`-style files just redirect to the new addresses.

All pages share one stylesheet and one script, built to `assets/site.css` and `assets/site.js`.

## Editing the site

The header and footer are shared by every page, so they live in one place:

- `src/partials/header.html`: logo, menu and About mega menu
- `src/partials/footer.html`: footer, mobile quick-action bar and scripts
- `src/partials/head.html` and `src/partials/preloader.html`: page head and preloader
- `src/pages/*.html`: the content of each page
- `src/styles.css` and `src/script.js`: styles and behaviour
- `images/photos/` and `images/logo/`: original photos and logos

After editing anything in `src/` or `images/`, rebuild the site (needs `pip install pillow rcssmin rjsmin beautifulsoup4` once):

```
python build.py
```

This writes the finished `.html` files to the project root, with links between pages written without `.html`.

Preview with VS Code Live Server, or by opening `index.html` straight from the folder. Do not edit the built `.html` files directly, because the next build will overwrite them.

## Search

The build also creates a search index of every page, section, service and FAQ answer (`assets/search-index.js`), so new content is searchable after each build. On phones, the search icon in the header opens it. On desktop, press Ctrl + K or `/`, or use "Search the site" in the footer.

## Speed

The build keeps the site light:

- photos become WebP in three sizes, and each device downloads only the size it needs
- the later slideshow photos and the mega menu photos load only when needed
- icons are built into the pages, so no icon script is downloaded
- CSS and JavaScript are minified
- the Google map loads only when a visitor taps "Show map"
- the preloader shows once per visit and lifts as soon as the page is ready

## Before going live

- Replace the dummy phone number `+256 700 123 456` (`tel:+256700123456`) with the real office number in `src/`, then rebuild.
- Add the real social media links (currently `#`).
- Add the Privacy policy and Terms of membership pages (currently `#`).
- Connect the enquiry form and SMS sign-up to a real service; they only show a message on screen for now.

## Photo credits

Hero photos from Wikimedia Commons: Emmanuel Ssekaggo, Jameswasswa, Namulwana Hilda Victoria, BalukuBrian (CC BY-SA 4.0); flowcomm (CC BY 2.0).
