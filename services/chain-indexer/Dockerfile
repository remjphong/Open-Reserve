FROM node:24.22.1-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY packages/api-contracts/package.json packages/api-contracts/
COPY packages/contracts-sdk/package.json packages/contracts-sdk/
COPY services/catalog-evidence/package.json services/catalog-evidence/
COPY services/chain-indexer/package.json services/chain-indexer/
COPY services/economics/package.json services/economics/
RUN npm ci --workspace @openreserve/chain-indexer --workspace @openreserve/api-contracts --include-workspace-root
COPY packages/api-contracts/ packages/api-contracts/
COPY services/chain-indexer/ services/chain-indexer/
RUN npm run build --workspace @openreserve/api-contracts && npm run build --workspace @openreserve/chain-indexer

FROM node:24.22.1-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3002
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/api-contracts ./packages/api-contracts
COPY --from=build /app/services/chain-indexer/package.json ./services/chain-indexer/package.json
COPY --from=build /app/services/chain-indexer/dist ./services/chain-indexer/dist
USER node
EXPOSE 3002
CMD ["node", "services/chain-indexer/dist/server.js"]
