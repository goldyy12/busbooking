import * as dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const now = new Date();

function setTime(baseDate, hours, minutes) {
  const d = new Date(baseDate);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function addDays(baseDate, days) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  console.log("🚀 Starting clean relational seed with dynamic dates...");

  // 1️⃣ Safe Cascading Truncation Block via Interactive Transaction
  // Order matters: BookedSeat has a FK to Booking, so it must be deleted first
  await prisma.$transaction([
    prisma.bookedSeat.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.trip.deleteMany(),
    prisma.bus.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const hashedPassword = await bcrypt.hash("123456", 10);

  // 2️⃣ Seeding Core Users
  const [passengerArben, passengerElira, systemAdmin] = await Promise.all([
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

  // 3️⃣ Seeding Core Fleet (Buses)
  const [standardBus, miniBus, expressBus] = await Promise.all([
    prisma.bus.create({ data: { busNumber: "KOS-01-123", totalSeats: 45 } }),
    prisma.bus.create({ data: { busNumber: "KOS-02-456", totalSeats: 20 } }),
    prisma.bus.create({ data: { busNumber: "KOS-03-789", totalSeats: 50 } }),
  ]);

  // 4️⃣ Calculating Dynamic Departure Windows
  const todayAfternoon = setTime(now, 14, 30);
  const todayEvening = setTime(now, 20, 0);

  if (todayAfternoon < now) {
    todayAfternoon.setDate(todayAfternoon.getDate() + 1);
  }
  if (todayEvening < now) {
    todayEvening.setDate(todayEvening.getDate() + 1);
  }

  // 5️⃣ Seeding Trans-Regional Active Trips
  const [
    prishtinaToFerizaj,
    ferizajToPrishtina,
    prishtinaToPrizren,
    prizrenToPrishtina,
  ] = await Promise.all([
    prisma.trip.create({
      data: {
        from: "Prishtina",
        to: "Ferizaj",
        price: 5,
        date: todayAfternoon,
        busId: standardBus.id,
      },
    }),
    prisma.trip.create({
      data: {
        from: "Ferizaj",
        to: "Prishtina",
        price: 5,
        date: todayEvening,
        busId: standardBus.id,
      },
    }),
    prisma.trip.create({
      data: {
        from: "Prishtina",
        to: "Prizren",
        price: 10,
        date: setTime(addDays(now, 1), 8, 0),
        busId: expressBus.id,
      },
    }),
    prisma.trip.create({
      data: {
        from: "Prizren",
        to: "Prishtina",
        price: 10,
        date: setTime(addDays(now, 1), 17, 30),
        busId: expressBus.id,
      },
    }),
  ]);

  // 6️⃣ Seeding Concurrency-Safe Active Bookings
  // Booking and its seats now live in separate tables (Booking -> BookedSeat)
  // so each booking is created first, then its seat rows are attached to it.

  const bookingArben = await prisma.booking.create({
    data: {
      userId: passengerArben.id,
      tripId: prishtinaToFerizaj.id,
      status: "CONFIRMED",
    },
  });
  await prisma.bookedSeat.createMany({
    data: [1, 2].map((seatNumber) => ({
      tripId: prishtinaToFerizaj.id,
      seatNumber,
      bookingId: bookingArben.id,
    })),
  });

  const bookingElira = await prisma.booking.create({
    data: {
      userId: passengerElira.id,
      tripId: ferizajToPrishtina.id,
      status: "PENDING",
    },
  });
  await prisma.bookedSeat.createMany({
    data: [5].map((seatNumber) => ({
      tripId: ferizajToPrishtina.id,
      seatNumber,
      bookingId: bookingElira.id,
    })),
  });

  console.log(
    `✅ Database successfully seeded:\n` +
      `   - Users created: 3\n` +
      `   - Buses provisioned: 3\n` +
      `   - Inter-city trips scheduled: 4\n` +
      `   - Mock bookings assigned: 2`,
  );
}

main()
  .catch((e) => {
    console.error("❌ Critical database seed failure occurred:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
