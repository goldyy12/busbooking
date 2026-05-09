FROM node:20-alpine

WORKDIR /app

# 1. Copy package files
COPY package*.json ./

# 2. COPY THE PRISMA FOLDER NOW 
# This fixes the "command sh -c prisma generate" error
COPY prisma ./prisma/

# 3. Now run install
RUN npm install

# 4. Copy the rest of your code
COPY . .

# 5. Generate the client for the container's OS
RUN npx prisma generate

EXPOSE 8080

CMD ["npm", "start"]