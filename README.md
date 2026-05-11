Bus Booking System

A full-stack real-time bus ticket booking platform built with React, Node.js, PostgreSQL, Prisma, and Socket.IO. The application supports live seat updates, secure authentication, and scalable backend architecture using Docker.

Features
Real-time seat booking with Socket.IO
JWT authentication & protected routes
Prevents double bookings
PostgreSQL relational database
Prisma ORM integration
Dockerized development environment
REST API architecture
Unit testing support
Redis caching support (optional)
Responsive frontend UI
Tech Stack
Frontend
React
React Router
Axios
CSS / Tailwind (if used)
Backend
Node.js
Express.js
Prisma ORM
PostgreSQL
Socket.IO
JWT Authentication
bcrypt
DevOps & Tools
Docker
Docker Compose
Redis
Jest / Vitest
Artillery
Architecture
Frontend (React)
       │
       ▼
Backend API (Node.js + Express)
       │
 ┌─────┴─────┐
 ▼           ▼
PostgreSQL   Redis
       │
       ▼
Socket.IO Real-Time Updates
Getting Started
Prerequisites

Make sure you have installed:

Docker
Docker Compose
Node.js (optional if running without Docker)
Installation
1. Clone the repository
git clone https://github.com/yourusername/bus-booking-system.git
cd bus-booking-system
2. Start the application with Docker
docker compose up --build

This will start:

Frontend
Backend
PostgreSQL
Redis
Environment Variables

Create a .env file inside the backend folder:

DATABASE_URL=postgresql://user:password@postgres:5432/bus_booking
JWT_SECRET=your_secret_key
REDIS_URL=redis://redis:6379
PORT=3000
Database Setup

Run Prisma migrations:

docker exec -it busbooking-main-backend-1 npx prisma migrate deploy

Seed the database:

docker exec -it busbooking-main-backend-1 npx prisma db seed
Running Without Docker
Backend
cd backend
npm install
npm run dev
Frontend
cd frontend
npm install
npm start
API Features
User authentication
Bus management
Route management
Booking system
Real-time seat synchronization
Booking history
Real-Time Booking

Socket.IO is used to:

Update seat availability instantly
Prevent double booking conflicts
Sync bookings across multiple users
Testing

Run backend tests:

npm test

Performance testing with Artillery:

artillery run load-test.yml
Docker Services



Add screenshots here:

![Home Page](./screenshots/home.png)
Author

Diar Selmani
