FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/types/package.json packages/types/
COPY packages/vite-plugin/package.json packages/vite-plugin/
COPY packages/shell/package.json packages/shell/

RUN pnpm install --frozen-lockfile || pnpm install --no-frozen-lockfile

COPY packages/types/src packages/types/src
COPY packages/types/tsconfig.json packages/types/

COPY packages/vite-plugin/src packages/vite-plugin/src
COPY packages/vite-plugin/tsconfig.json packages/vite-plugin/tsconfig.json
COPY packages/vite-plugin/build.mjs packages/vite-plugin/build.mjs

COPY packages/shell/src packages/shell/src
COPY packages/shell/index.html packages/shell/
COPY packages/shell/tsconfig.json packages/shell/
COPY packages/shell/vite.config.ts packages/shell/
COPY packages/shell/vite.ssr.config.ts packages/shell/

RUN cd packages/vite-plugin && pnpm build
RUN cd packages/shell && pnpm build:all

FROM node:22-alpine

WORKDIR /app

COPY platform/ssr/package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/packages/shell/dist ./client
COPY --from=builder /app/packages/shell/dist-ssr ./ssr
COPY platform/ssr/server.js ./server.js

USER node
EXPOSE 4002
CMD ["node", "server.js"]
