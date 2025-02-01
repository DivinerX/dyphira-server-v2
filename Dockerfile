FROM node:22.11.0-bookworm-slim AS dependencies
WORKDIR /app
COPY --chown=node:node package*.json ./
RUN npm install
COPY --chown=node:node . ./

# development stage
FROM dependencies AS development
CMD ["npm", "run", "dev"]

# test stage
FROM dependencies AS test
RUN npm run lint && npm run test

# build stage
FROM dependencies AS build
RUN npm run build

# release stage
FROM node:22.11.0-bookworm-slim AS production

ENV NODE_ENV production
USER node
WORKDIR /app
COPY --chown=node:node package*.json ./
COPY --chown=node:node tsconfig-paths.js ./tsconfig-paths.js
COPY --chown=node:node tsconfig.base.json ./tsconfig.base.json
COPY --chown=node:node tsconfig.json ./tsconfig.json
COPY --chown=node:node healthcheck.js ./healthcheck.js
COPY --chown=node:node --from=build /app/dist ./dist
RUN npm ci --omit=dev && npm cache clean --force

HEALTHCHECK --interval=30s CMD node healthcheck.js
EXPOSE 5000

CMD ["node", "-r", "./tsconfig-paths.js", "dist/app.js"]
