FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json shared/
COPY client/package.json client/
COPY server/package.json server/

RUN pnpm install --frozen-lockfile

# Copy source
COPY shared/ shared/
COPY client/ client/

ARG VITE_STRIPE_PUBLISHABLE_KEY
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY

RUN pnpm --filter client build

# Production: serve with nginx
FROM nginx:alpine
COPY --from=build /app/client/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
