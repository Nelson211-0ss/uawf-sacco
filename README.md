# UAWF SACCO website

Website for United Agricultural Workers & Farmers Savings & Credit Cooperative (UAWF SACCO), Mbarara City.

## Pages

| Page | File |
|---|---|
| Home | `index.html` |
| About | `about.html` |
| Services | `services.html` |
| Membership | `membership.html` |
| Calculator | `calculator.html` |
| FAQ | `faq.html` |
| Contact | `contact.html` |

All pages share one stylesheet (`styles.css`), one script (`script.js`) and the photos in `assets/hero/`.

## Editing the site

The header and footer are shared by every page, so they live in one place:

- `src/partials/header.html`: logo, menu and About mega menu
- `src/partials/footer.html`: footer, mobile quick-action bar and scripts
- `src/partials/head.html` and `src/partials/preloader.html`: page head and preloader
- `src/pages/*.html`: the content of each page

After editing anything in `src/`, rebuild the pages:

```
python build.py
```

This writes the finished `.html` files to the project root. Do not edit those root `.html` files directly, because the next build will overwrite them.

## Before going live

- Replace the placeholder phone number `+256 7XX XXX XXX` with the office number.
- Add the real social media links (currently `#`).
- Add the Privacy policy and Terms of membership pages (currently `#`).
- Connect the enquiry form and SMS sign-up to a real service; they only show a message on screen for now.

## Photo credits

Hero photos from Wikimedia Commons: Emmanuel Ssekaggo, Jameswasswa, Namulwana Hilda Victoria, BalukuBrian (CC BY-SA 4.0); flowcomm (CC BY 2.0).
