FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

# Instalar deps del monorepo (necesario para workspaces)
FROM base AS deps
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm install --workspaces=false || true
RUN cd apps/api && npm install

# Build
FROM deps AS builder
COPY apps/api ./apps/api
RUN cd apps/api && npx prisma generate && npm run build

# Runtime liviano
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/prisma ./prisma
EXPOSE 3001
CMD ["node", "dist/main"]
