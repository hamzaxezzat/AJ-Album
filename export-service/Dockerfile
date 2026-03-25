FROM node:20-slim

# Install Chromium and Arabic font support (Noto fonts handle Arabic glyphs + kashida)
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-noto \
    fonts-noto-cjk \
    fonts-noto-extra \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use the system Chromium instead of downloading its own
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copy workspace root dependencies first (for caching)
COPY package*.json ./
RUN npm install --production

# Copy compiled source
COPY dist/ ./dist/

# Copy self-hosted fonts (same files as /public/fonts in the Next.js app)
# These are embedded in the image so Puppeteer can load them without a network call
COPY fonts/ ./fonts/

ENV NODE_ENV=production
ENV PORT=3001
# Point font loader to the bundled fonts directory
ENV FONT_BASE_URL=file:///app/fonts

EXPOSE 3001
CMD ["node", "dist/index.js"]
