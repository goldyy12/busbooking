# Bus Booking System

A full-stack real-time bus ticket booking platform built with React, Node.js, PostgreSQL, Prisma, and Socket.IO.

The application supports:
- Live seat updates
- Secure authentication
- Real-time booking synchronization
- Dockerized deployment

---

# Features

- Real-time seat booking with Socket.IO
- JWT authentication & protected routes
- Prevents double bookings
- PostgreSQL relational database
- Prisma ORM integration
- Dockerized development environment
- REST API architecture
- Unit testing support
- Responsive frontend UI

---

# Tech Stack

## Frontend
- React
- React Router
- Axios
- CSS

## Backend
- Node.js
- Express.js
- Prisma ORM
- PostgreSQL
- Socket.IO
- JWT Authentication
- bcrypt

## DevOps & Tools
- Docker
- Docker Compose
- Jest / Vitest
- Artillery

---

# Installation

## Clone the repository

```bash
git clone https://github.com/goldyy12/busbooking.git
cd busbooking
```

---

# Run with Docker

```bash
docker compose up --build
```

This starts the frontend and the backend. PostgreSQL is not included in
`docker-compose.yml`; point `DATABASE_URL` at your own database.

---

# Environment Variables

Create a `.env` file inside the backend folder:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/bus_booking
JWT_SECRET=your_secret_key
SESSION_SECRET=another_secret
PORT=5000
FRONTEND_URL=http://localhost:5173

# Google login (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=

# AI booking assistant (optional)
GROQ_API_KEY=
AGENT_MODEL=openai/gpt-oss-20b
```

The frontend needs `VITE_API_URL` (e.g. `http://localhost:5000`) in `frontend/.env`.

---

# Prisma Setup

Run migrations:

```bash
docker exec -it busbooking-main-backend-1 npx prisma migrate deploy
```

Seed database:

```bash
docker exec -it busbooking-main-backend-1 npx prisma db seed
```

---

# Running Without Docker

## Backend

```bash
cd backend
npm install
npm run dev
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

---

# Real-Time Features

Socket.IO is used to:
- Sync bookings instantly (including bookings made through the AI assistant)
- Show which seats other users are currently selecting

How seats are protected:
- A booked seat is unique per trip in the database (`BookedSeat` has a
  unique `tripId + seatNumber`), so a seat can never be double-booked.
- While choosing, a logged-in user can hold up to 6 seats. Holds are stored
  in the `SeatLock` table, expire after 5 minutes, and are released when the
  user disconnects. Other users cannot book a seat someone else is holding.
- Anyone can watch a trip's seat map; only logged-in users can hold seats.

Because holds live in PostgreSQL they survive restarts and are shared by
all backend instances. Live broadcasts only reach clients connected to the
same instance; running several instances would need a Socket.IO adapter.

---

# Testing

Unit tests (no database needed):

```bash
cd backend
npm test
```

Integration tests run against a real PostgreSQL database. Use a throwaway
database whose name contains `test` — its tables are wiped:

```bash
cd backend
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/busbooking_test
npx prisma migrate deploy
npm run test:integration
```

CI (GitHub Actions) runs migrations, unit tests and integration tests against
a PostgreSQL service, plus frontend lint and build, on every push and pull
request to `master`.

Performance testing:

```bash
npx artillery run tests/load-test.yml
```

---



# Author

Diar Selmani

- GitHub: https://github.com/goldyy12
