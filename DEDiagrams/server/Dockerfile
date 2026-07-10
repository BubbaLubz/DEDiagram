FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./server/
COPY shared/ ./shared/
RUN cd server && npm ci --production
COPY server/ ./server/
EXPOSE 3001
CMD ["node", "server/index.js"]
