# Build and run the FiberFlow dashboard + checkout UI.
# Usage (from repo root):
#   docker build -t fiberflow-web ./frontend \
#     --build-arg VITE_API_URL=https://api.example.com \
#     --build-arg VITE_PAYMENT_APP_URL=https://checkout.example.com
#   docker run -d --name fiberflow-web -p 4173:3000 fiberflow-web

FROM oven/bun:1.2 AS build

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .

ARG VITE_API_URL
ARG VITE_PAYMENT_APP_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_PAYMENT_APP_URL=$VITE_PAYMENT_APP_URL

RUN bun run build

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

COPY --from=build /app/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
