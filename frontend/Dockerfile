FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Expose the standard React port (3000) or Vite port (5173)
EXPOSE 5173

CMD ["npm", "run", "dev"]