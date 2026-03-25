# Self-Hosted Fonts

These fonts must be placed here before running the dev server or export service.
Run `bash scripts/download-fonts.sh` to download them automatically.

## Required files

```
IBMPlexArabic-Regular.woff2    (IBM Plex Arabic 400, OFL license)
IBMPlexArabic-SemiBold.woff2   (IBM Plex Arabic 600, OFL license)
IBMPlexArabic-Bold.woff2       (IBM Plex Arabic 700, OFL license)
Cairo-Regular.woff2            (Cairo 400, OFL license)
Cairo-SemiBold.woff2           (Cairo 600, OFL license)
Cairo-Bold.woff2               (Cairo 700, OFL license)
```

## Why self-hosted?

The Puppeteer export service runs headless with no internet access in production.
Fonts MUST be available locally for `text-justify: kashida` to render correctly.
Google Fonts CDN will not work in the export container.
