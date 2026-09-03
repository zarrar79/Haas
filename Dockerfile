FROM node:20-alpine

WORKDIR /app

# Install dependencies (dev deps required for `next build`).
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3050
ENV HOSTNAME=0.0.0.0

EXPOSE 3050

CMD ["npm", "start"]
