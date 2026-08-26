# Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend ./
RUN npm run build

# Backend with static frontend
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev --no-audit --no-fund
COPY backend ./backend
COPY --from=frontend-build /app/frontend/build ./frontend/build
WORKDIR /app/backend
ENV NODE_ENV=production
EXPOSE 10000
CMD ["node", "server.js"]
