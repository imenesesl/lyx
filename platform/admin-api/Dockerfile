FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY .npmrc package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install --no-frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY .npmrc package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod --no-frozen-lockfile
COPY --from=builder /app/dist ./dist

USER node
EXPOSE 4000
CMD ["node", "dist/index.js"]
