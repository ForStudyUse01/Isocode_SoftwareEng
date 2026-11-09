# Websites

Every website scraped, searched, used, mimicked or cloned in this project.

| Website | How it was used | Notes |
|---------|-----------------|-------|
| fonts.googleapis.com / Google Fonts | Used. Inter and Noto Sans Devanagari are fetched at build time by `next/font` and then self-hosted | Open licence. No request to Google from the browser |
| sketchfab.com | Used. Four CC BY 4.0 generic car models are embedded through Sketchfab's viewer, and screenshots of them are stored in `public/cars/render` | Credit is shown under each 3D view. Models: SHC MC Free Promotion Car (denniswoo1993), Generic Sedan Car and MMC Generic Small SUV Car (MMC Works), Generic Electric sedan (Antonis_zks) |
| api.anthropic.com | Used, optional. Writes lead summaries and reply drafts when `ANTHROPIC_API_KEY` is set | Receives first name, needs and budget. Never phone or email |

Nothing was scraped, cloned or mimicked. Car imagery is third-party 3D models of generic, unbadged cars. Prices, taxes, cities, showrooms, staff and leads are invented sample data. Tax rates and fees are illustrative and must be replaced with the dealer's figures. The one rule taken from general knowledge is TCS at 1% above ₹10 lakh, which should be confirmed with the dealer's accountant.
