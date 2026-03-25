#!/usr/bin/env bash
# scripts/download-fonts.sh
#
# Downloads IBM Plex Sans Arabic and Cairo WOFF2 font files from jsDelivr CDN.
# Both fonts are released under the SIL Open Font License (OFL).
#
# Package names:
#   @fontsource/ibm-plex-sans-arabic  (note: "sans-arabic", NOT "arabic")
#   @fontsource/cairo
#
# Run from the project root: bash scripts/download-fonts.sh

set -euo pipefail

FONTS_DIR="$(dirname "$0")/../public/fonts"
mkdir -p "$FONTS_DIR"

IBM_VERSION="5.2.9"
CAIRO_VERSION="5.2.7"

download_font() {
  local url="$1"
  local outfile="$2"
  echo "  -> $(basename "$outfile")"
  curl -fsSL "$url" -o "$outfile" || {
    echo "  FAILED: $url"
    exit 1
  }
}

echo "Downloading IBM Plex Sans Arabic (v${IBM_VERSION})..."

download_font \
  "https://cdn.jsdelivr.net/npm/@fontsource/ibm-plex-sans-arabic@${IBM_VERSION}/files/ibm-plex-sans-arabic-arabic-400-normal.woff2" \
  "${FONTS_DIR}/IBMPlexArabic-Regular.woff2"

download_font \
  "https://cdn.jsdelivr.net/npm/@fontsource/ibm-plex-sans-arabic@${IBM_VERSION}/files/ibm-plex-sans-arabic-arabic-600-normal.woff2" \
  "${FONTS_DIR}/IBMPlexArabic-SemiBold.woff2"

download_font \
  "https://cdn.jsdelivr.net/npm/@fontsource/ibm-plex-sans-arabic@${IBM_VERSION}/files/ibm-plex-sans-arabic-arabic-700-normal.woff2" \
  "${FONTS_DIR}/IBMPlexArabic-Bold.woff2"

echo "Downloading Cairo (v${CAIRO_VERSION})..."

download_font \
  "https://cdn.jsdelivr.net/npm/@fontsource/cairo@${CAIRO_VERSION}/files/cairo-arabic-400-normal.woff2" \
  "${FONTS_DIR}/Cairo-Regular.woff2"

download_font \
  "https://cdn.jsdelivr.net/npm/@fontsource/cairo@${CAIRO_VERSION}/files/cairo-arabic-600-normal.woff2" \
  "${FONTS_DIR}/Cairo-SemiBold.woff2"

download_font \
  "https://cdn.jsdelivr.net/npm/@fontsource/cairo@${CAIRO_VERSION}/files/cairo-arabic-700-normal.woff2" \
  "${FONTS_DIR}/Cairo-Bold.woff2"

echo ""
echo "Done. Fonts saved to: ${FONTS_DIR}/"
ls -lh "${FONTS_DIR}"/*.woff2 2>/dev/null || true
