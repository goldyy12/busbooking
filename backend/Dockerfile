FROM node:20-slim
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install --omit=dev --no-audit --no-fund --ignore-scripts
RUN npx prisma generate

COPY . .
EXPOSE 8080
CMD ["npm", "start"]