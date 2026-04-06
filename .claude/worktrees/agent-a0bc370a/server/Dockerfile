FROM node:22-alpine

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy dependency manifests first (cache layer)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY server/package.json server/
COPY shared/package.json shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY shared/ shared/
COPY server/ server/

# Generate Prisma Client
RUN pnpm --filter @qr-order/server exec prisma generate

EXPOSE 3001

# Use tsx watch for dev hot-reload (bind-mounted volumes)
CMD ["pnpm", "--filter", "@qr-order/server", "start"]
