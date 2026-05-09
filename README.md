# FoodFleet

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=111)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-Events-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Microservices-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-AI-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)

FoodFleet is a full-stack, microservices-based food delivery platform with customer ordering, seller restaurant management, rider delivery workflows, admin verification, realtime order updates, RabbitMQ event messaging, Stripe/Razorpay payments, and Gemini-powered AI features.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [AI Features](#ai-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Services](#services)
- [Environment Variables](#environment-variables)
- [Installation](#installation)
- [Running Locally](#running-locally)
- [API Map](#api-map)
- [Demo Flow](#demo-flow)
- [Build](#build)
- [Docker](#docker)
- [Notes](#notes)

## Overview

FoodFleet is designed as a production-style food delivery system rather than a simple monolithic CRUD app. It separates authentication, restaurant/order management, payments/uploads, realtime communication, rider operations, and admin workflows into independent services.

The application supports four major user flows:

- Customers browse nearby restaurants, use smart AI search, add items to cart, pay, and track orders.
- Sellers create restaurants, manage menus, handle orders, view sales analytics, and generate AI insights.
- Riders manage availability, accept available orders, and update delivery status.
- Admins verify restaurants/riders and manage platform records.

## Key Features

- Role-based authentication for customers, sellers, riders, and admins.
- Google login support.
- Multi-restaurant seller dashboard.
- Restaurant creation, verification, opening/closing, and profile editing.
- Menu item CRUD with images, categories, variants, add-ons, and availability controls.
- Location-aware nearby restaurant discovery.
- Cart, checkout, and order creation.
- Razorpay and Stripe payment integration.
- Realtime order updates using Socket.io.
- RabbitMQ-based event flow for payment and rider assignment workflows.
- Rider dashboard with availability, nearby orders, current order, and delivery history.
- Admin dashboard for restaurant/rider verification, customers, and audit history.
- Sales dashboard with revenue, delivered orders, top item, payout snapshot, and trend chart.
- Cloudinary-backed image upload through a utility service.
- Dockerfiles for each backend service.

## AI Features

FoodFleet includes practical AI features that fit the current app flows.

### AI Description Generation

Available in seller forms:

- Add Restaurant
- Edit Restaurant
- Add Menu Item
- Edit Menu Item

The seller clicks `Generate description`, and the backend generates a customer-facing description using restaurant/menu context.

Endpoint:

```http
POST /api/ai/generate-description
```

### Smart Food Search

Available on the customer Home page.

Users can type natural language prompts like:

```text
cheap spicy dinner
fast biryani
top rated pizza
open restaurants under 25 minutes
```

AI converts the prompt into real filters:

- cuisine
- price range
- delivery time
- rating
- open now
- search keywords

Endpoint:

```http
POST /api/ai/smart-food-search
```

### AI Seller Performance Insight

Available in the seller dashboard under:

```text
Restaurant Tools -> Sales
```

The seller clicks `Generate AI Insight`, and AI creates a short business summary using revenue, delivered orders, top item, low-performing item, payout numbers, and a menu sample.

Endpoint:

```http
POST /api/ai/seller-performance-insight
```

### AI Provider

The AI service prefers Gemini for free-tier friendly usage.

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash-lite
```

If Gemini is not configured or fails, the backend returns a local fallback response so the UI remains usable during demos.

## Architecture

```text
                         +----------------------+
                         |      Frontend        |
                         | React + Vite + TS    |
                         +----------+-----------+
                                    |
          +-------------------------+-------------------------+
          |                         |                         |
          v                         v                         v
+------------------+      +-------------------+      +------------------+
| Auth Service     |      | Restaurant Service|      | Utils Service    |
| Login / Roles    |      | Restaurants       |      | Uploads          |
| JWT              |      | Menus / Cart      |      | Stripe/Razorpay  |
+------------------+      | Orders / AI       |      +------------------+
                          +---------+---------+
                                    |
                  +-----------------+-----------------+
                  |                                   |
                  v                                   v
        +------------------+                +------------------+
        | Realtime Service |                | Rider Service    |
        | Socket.io Events |                | Rider Profiles   |
        | Internal Emit API|                | Delivery Flow    |
        +------------------+                +------------------+
                  ^
                  |
        +------------------+
        | RabbitMQ         |
        | Payment + Rider  |
        | Order Events     |
        +------------------+

        +------------------+
        | Admin Service    |
        | Verification     |
        | Audit / Users    |
        +------------------+
```

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- React Router
- Axios
- React Hot Toast
- React Icons
- Leaflet / React Leaflet
- Socket.io Client
- Stripe JS

### Backend

- Node.js
- Express 5
- TypeScript
- MongoDB / Mongoose
- MongoDB native driver in Admin service
- JWT authentication
- RabbitMQ / amqplib
- Socket.io
- Cloudinary
- Stripe
- Razorpay
- Google APIs
- Gemini API through REST

## Project Structure

```text
FoodFleet/
  frontend/
    src/
      components/
      context/
      pages/
      utils/
      types.ts
    package.json

  services/
    auth/
    restaurant/
    utils/
    realtime/
    rider/
    admin/
```

## Services

| Service | Default Port | Responsibility |
| --- | ---: | --- |
| Frontend | `5173` | React app for customer, seller, rider, and admin flows |
| Auth | `5000` | Google login, JWT profile, role assignment |
| Restaurant | `5001` | Restaurants, menus, cart, orders, seller stats, AI routes |
| Utils | `5002` | Cloudinary upload, Razorpay, Stripe |
| Realtime | env-based | Socket.io server and internal event emit endpoint |
| Rider | env-based | Rider profile, availability, order acceptance, delivery updates |
| Admin | env-based | Admin verification, customers, audit data |

## Environment Variables

Create `.env` files inside each service folder and the frontend folder.

### Frontend

```env
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_INTERNAL_SERVICE_KEY=
VITE_GOOGLE_CLIENT_ID=
VITE_AUTH_SERVICE=http://localhost:5000
VITE_RESTAURANT_SERVICE=http://localhost:5001
VITE_UTILS_SERVICE=http://localhost:5002
VITE_REALTIME_SERVICE=http://localhost:5003
VITE_RIDER_SERVICE=http://localhost:5004
VITE_ADMIN_SERVICE=http://localhost:5005
```

### Auth Service

```env
PORT=5000
MONGO_URI=
JWT_SEC=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Restaurant Service

```env
PORT=5001
MONGO_URI=
DB_NAME=
JWT_SEC=
UTILS_SERVICE=http://localhost:5002
REALTIME_SERVICE=http://localhost:5003
INTERNAL_SERVICE_KEY=
RABBITMQ_URL=
PAYMENT_QUEUE=payment_queue
RIDER_QUEUE=rider_queue
ORDER_READY_QUEUE=order_ready_queue
AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash-lite
```

### Utils Service

```env
PORT=5002
JWT_SEC=
CLOUD_NAME=
CLOUD_API_KEY=
CLOUD_SECRET_KEY=
STRIPE_SECRET_KEY=
FRONTEND_URL=http://localhost:5173
RESTAURANT_SERVICE=http://localhost:5001
INTERNAL_SERVICE_KEY=
RABBITMQ_URL=
PAYMENT_QUEUE=payment_queue
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

### Realtime Service

```env
PORT=5003
JWT_SEC=
INTERNAL_SERVICE_KEY=
```

### Rider Service

```env
PORT=5004
MONGO_URI=
DB_NAME=
JWT_SEC=
UTILS_SERVICE=http://localhost:5002
REALTIME_SERVICE=http://localhost:5003
RESTAURANT_SERVICE=http://localhost:5001
INTERNAL_SERVICE_KEY=
RABBITMQ_URL=
RIDER_QUEUE=rider_queue
ORDER_READY_QUEUE=order_ready_queue
```

### Admin Service

```env
PORT=5005
MONGO_URI=
JWT_SEC=
DB_NAME=
```

## Installation

Install dependencies in every app/service:

```bash
cd frontend && npm install
cd ../services/auth && npm install
cd ../restaurant && npm install
cd ../utils && npm install
cd ../realtime && npm install
cd ../rider && npm install
cd ../admin && npm install
```

## Running Locally

Start MongoDB and RabbitMQ first.

Then run each backend service in a separate terminal:

```bash
cd services/auth
npm run dev
```

```bash
cd services/restaurant
npm run dev
```

```bash
cd services/utils
npm run dev
```

```bash
cd services/realtime
npm run dev
```

```bash
cd services/rider
npm run dev
```

```bash
cd services/admin
npm run dev
```

Start the frontend:

```bash
cd frontend
npm run dev
```

Open:

```text
http://localhost:5173
```

## API Map

### Auth Service

Base path: `/api/auth`

- `POST /login`
- `PUT /add/role`
- `GET /me`

### Restaurant Service

Base paths:

- `/api/restaurant`
- `/api/item`
- `/api/cart`
- `/api/address`
- `/api/order`
- `/api/ai`

Important routes:

- `POST /api/restaurant/new`
- `GET /api/restaurant/mine`
- `GET /api/restaurant/all`
- `PUT /api/restaurant/edit`
- `PUT /api/restaurant/status`
- `POST /api/item/new`
- `GET /api/item/all/:id`
- `POST /api/cart/add`
- `GET /api/cart/all`
- `POST /api/order/new`
- `GET /api/order/myorder`
- `GET /api/order/stats/sales/:restaurantId`
- `GET /api/order/stats/performance/:restaurantId`
- `POST /api/ai/generate-description`
- `POST /api/ai/smart-food-search`
- `POST /api/ai/seller-performance-insight`

### Utils Service

Base paths: `/api`, `/api/payment`

- `POST /api/upload`
- `POST /api/payment/create`
- `POST /api/payment/verify`
- `POST /api/payment/stripe/create`
- `POST /api/payment/stripe/verify`

### Rider Service

Base path: `/api/rider`

- `POST /new`
- `GET /myprofile`
- `PUT /myprofile`
- `PATCH /toggle`
- `GET /orders/available`
- `POST /accept/:orderId`
- `GET /order/current`
- `PUT /order/update/:orderId`
- `GET /dashboard/stats`
- `GET /dashboard/history`

### Admin Service

Base path: `/api/v1`

- `GET /admin/restaurant/pending`
- `GET /admin/rider/pending`
- `GET /admin/customers`
- `GET /admin/audit`
- `PATCH /verify/restaurant/:id`
- `PATCH /verify/rider/:id`
- `DELETE /admin/customers/:id`

### Realtime Service

- `POST /api/v1/internal/emit`

Socket.io is used for realtime customer and restaurant order updates.

## Demo Flow

1. Login with Google.
2. Select a role.
3. As seller, create a restaurant and generate an AI restaurant description.
4. Add menu items and generate AI menu descriptions.
5. As admin, verify the restaurant.
6. As customer, search nearby restaurants.
7. Try Smart Food Search with `cheap spicy dinner`.
8. Add menu items to cart.
9. Checkout with Razorpay or Stripe.
10. Show realtime order status updates.
11. As seller, accept and prepare the order.
12. As rider, go online, accept the order, and update delivery status.
13. Return to seller Sales tab and generate AI Performance Insight.

## Build

Frontend:

```bash
cd frontend
npm run build
```

Backend service build command:

```bash
npm run build
```

Run it inside each service folder:

- `services/auth`
- `services/restaurant`
- `services/utils`
- `services/realtime`
- `services/rider`
- `services/admin`

## Docker

Each backend service includes its own `Dockerfile`:

- `services/auth/Dockerfile`
- `services/restaurant/Dockerfile`
- `services/utils/Dockerfile`
- `services/realtime/Dockerfile`
- `services/rider/Dockerfile`
- `services/admin/Dockerfile`

Example:

```bash
docker build -t foodfleet-restaurant ./services/restaurant
```

A `docker-compose.yml` can be added later to orchestrate all services, MongoDB, and RabbitMQ together.

## Notes

- Keep `.env` files private and never commit real secrets.
- The AI features work best with Gemini configured, but they include local fallback responses for demos.
- The project currently uses separate service folders and independent scripts.
- Vite may warn if Node.js is below its preferred version. Use Node.js `20.19+` or `22.12+` for the cleanest frontend build experience.
