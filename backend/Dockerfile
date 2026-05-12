FROM node:24-alpine

WORKDIR /app

# 1. Copy package files
COPY package*.json ./

# 2. COPY THE PRISMA FOLDER NOW 
# This fixes the "command sh -c prisma generate" error
COPY prisma ./prisma/

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 8080

CMD ["npm", "start"]