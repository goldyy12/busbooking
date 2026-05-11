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
- Redis caching support
- Responsive frontend UI

---

# Tech Stack

## Frontend
- React
- React Router
- Axios
- CSS / TailwindCSS

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
- Redis
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

This starts:
- Frontend
- Backend
- PostgreSQL
- Redis

---

# Environment Variables

Create a `.env` file inside the backend folder:

```env
DATABASE_URL=postgresql://user:password@postgres:5432/bus_booking
JWT_SECRET=your_secret_key
REDIS_URL=redis://redis:6379
PORT=3000
```

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
npm start
```

---

# Real-Time Features

Socket.IO is used to:
- Sync bookings instantly
- Update seat availability live
- Prevent double booking conflicts

---

# Testing

Run backend tests:

```bash
npm test
```

Performance testing:

```bash
artillery run load-test.yml
```

---

# Future Improvements

- Online payments
- Email notifications
- Admin dashboard
- QR code tickets
- Mobile application
- Kubernetes deployment

---

# Author

Diar Selmani

- GitHub: https://github.com/goldyy12
