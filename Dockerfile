FROM node:20-bullseye-slim AS base
RUN apt-get update && apt-get install -y openssl

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV PORT 3000

# Prisma needs sqlite data volume
RUN mkdir -p /app/prisma/data

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

# Startup script to ensure db exists
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'npx prisma db push' >> /app/start.sh && \
    echo 'node server.js' >> /app/start.sh && \
    chmod +x /app/start.sh

EXPOSE 3000

ENV DATABASE_URL="file:/app/prisma/data/dev.db"

CMD ["/app/start.sh"]
