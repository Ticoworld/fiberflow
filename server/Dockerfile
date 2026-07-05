FROM oven/bun:1.2-alpine

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY tsconfig.json ./
COPY src ./src

ENV PORT=3000
ENV FIBER_RPC_URL=http://127.0.0.1:8227

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
