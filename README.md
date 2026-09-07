# FreshBasket Grocery Shop

A full-stack grocery shopping application with Customer, Admin, and Delivery dashboards.

## Stack
- React + Vite + TypeScript
- Tailwind CSS
- Node.js + Express + TypeScript
- MongoDB + Mongoose
- JWT authentication
- Axios

## Run locally

### 1. Install
```bash
npm install
npm run install:all
```

### 2. Configure MongoDB
Copy `.env.example` to `server/.env` and update `MONGODB_URI` if needed.

### 3. Seed demo data
```bash
npm run seed
```

Demo accounts:
- Admin: admin@grocery.com / Admin@123
- Customer: customer@grocery.com / Customer@123
- Delivery: delivery@grocery.com / Delivery@123

### 4. Start
```bash
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:5000

If MongoDB is not available, the UI still loads with a polished demo mode using local sample data; real authentication/orders require MongoDB.
