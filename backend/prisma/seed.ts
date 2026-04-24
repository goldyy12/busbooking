import * as dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import bcrypt from "bcryptjs";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

console.log("DB URL:", process.env.DATABASE_URL);

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🚀 Starting seed with today's date (April 9, 2026)...");

  // 1️⃣ Clear existing data
  await prisma.booking.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.user.deleteMany();
  const hashedPassword = await bcrypt.hash("123456", 10);
  // 2️⃣ Create Users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: "Arben Krasniqi",
        email: "user1@test.com",
        password: hashedPassword,
      },
    }),
    prisma.user.create({
      data: {
        name: "Elira Hoxha",
        email: "user2@test.com",
        password: hashedPassword,
      },
    }),
    prisma.user.create({
      data: {
        name: "Admin User",
        email: "admin@test.com",
        password: hashedPassword,
        role: "ADMIN",
      },
    }),
  ]);

  // 3️⃣ Create Buses
  const buses = await Promise.all([
    prisma.bus.create({ data: { busNumber: "KOS-01-123", totalSeats: 45 } }),
    prisma.bus.create({ data: { busNumber: "KOS-02-456", totalSeats: 20 } }),
    prisma.bus.create({ data: { busNumber: "KOS-03-789", totalSeats: 50 } }),
  ]);

  // 4️⃣ Create Trips (Updated for Today & Tomorrow)
  const trips = await Promise.all([
    // Trip happening RIGHT NOW / Today
    prisma.trip.create({
      data: {
        from: "Prishtina",
        to: "Ferizaj",
        price: 5,
        date: new Date("2026-04-09T14:30:00Z"),
        busId: buses[0].id,
      },
    }),
    // Evening trip today
    prisma.trip.create({
      data: {
        from: "Ferizaj",
        to: "Prishtina",
        price: 5,
        date: new Date("2026-04-09T20:00:00Z"),
        busId: buses[0].id,
      },
    }),
    // Tomorrow morning
    prisma.trip.create({
      data: {
        from: "Prishtina",
        to: "Prizren",
        price: 10,
        date: new Date("2026-04-10T08:00:00Z"),
        busId: buses[2].id,
      },
    }),
    // Tomorrow evening
    prisma.trip.create({
      data: {
        from: "Prizren",
        to: "Prishtina",
        price: 10,
        date: new Date("2026-04-10T17:30:00Z"),
        busId: buses[2].id,
      },
    }),
  ]);

  // 5️⃣ Create Bookings
  await prisma.booking.createMany({
    data: [
      {
        userId: users[0].id,
        tripId: trips[0].id,
        seats: [1, 2],
        status: "CONFIRMED",
      },
      {
        userId: users[1].id,
        tripId: trips[1].id,
        seats: [5],
        status: "PENDING",
      },
    ],
  });

  console.log(
    `✅ Seeded ${users.length} users, ${buses.length} buses, ${trips.length} trips.`,
  );
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
