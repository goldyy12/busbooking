// db.js
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });
console.log("DATABASE_URL:", process.env.DATABASE_URL);

export default prisma;
console.log("DATABASE_URL:", process.env.DATABASE_URL);
