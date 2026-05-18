# FoodFleet

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=111)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-Events-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?style=for-the-badge&logo=stripe&logoColor=white)
![Razorpay](https://img.shields.io/badge/Razorpay-Payments-0C2451?style=for-the-badge&logo=razorpay&logoColor=white)

FoodFleet is a full-stack food delivery platform built with a React/Vite frontend and independent Node.js microservices. It supports customer ordering, seller restaurant management, rider delivery workflows, admin verification, realtime order updates, RabbitMQ event messaging, Cloudinary uploads, Stripe/Razorpay payments, and AI-assisted seller/customer features.

## Table of Contents

- [FoodFleet](#foodfleet)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Current Features](#current-features)
  - [AI Features](#ai-features)
    - [Seller Description Generation](#seller-description-generation)
    - [Smart Food Search](#smart-food-search)
    - [Seller Performance Insight](#seller-performance-insight)
  - [Architecture](#architecture)
  - [Tech Stack](#tech-stack)
    - [Frontend](#frontend)
    - [Backend](#backend)
  - [Project Structure](#project-structure)
  - [Services and Ports](#services-and-ports)
  - [Environment Variables](#environment-variables)
    - [Frontend](#frontend-1)
    - [Auth Service](#auth-service)
    - [Restaurant Service](#restaurant-service)
    - [Utils Service](#utils-service)
    - [Realtime Service](#realtime-service)
    - [Rider Service](#rider-service)
    - [Admin Service](#admin-service)
  - [Installation](#installation)
  - [Running Locally](#running-locally)
  - [API Map](#api-map)
    - [Auth Service](#auth-service-1)
    - [Restaurant Service](#restaurant-service-1)
    - [Utils Service](#utils-service-1)
    - [Realtime Service](#realtime-service-1)
    - [Rider Service](#rider-service-1)
    - [Admin Service](#admin-service-1)
  - [Demo Flow](#demo-flow)
  - [Build](#build)
  - [Docker](#docker)
  - [Notes](#notes)
  - [Author](#author)

## Overview

FoodFleet is organized as a production-style delivery system rather than a single monolithic CRUD app. Each core responsibility lives in its own service:

- `auth`: Google login, JWT sessions, refresh/logout, and role selection.
- `restaurant`: restaurants, menus, carts, addresses, orders, seller analytics, favorites, and AI routes.
- `utils`: image uploads plus Razorpay and Stripe payment flows.
- `realtime`: authenticated Socket.io rooms and internal event emission.
- `rider`: rider profiles, availability, location, assigned orders, and delivery history.
- `admin`: restaurant/rider verification, customer management, and audit history.
- `frontend`: customer, seller, rider, and admin user interfaces.

The frontend routes users to role-specific workspaces:

- Customers: `/browse`
- Sellers: `/partner`
- Riders: `/deliveries`
- Admins: `/admin`

## Current Features

- Google OAuth login with JWT access tokens.
- Refresh-token and logout endpoints in the auth service.
- Role-based navigation and protected frontend routes.
- Customer restaurant browsing with location-aware nearby results.
- Restaurant filters for cuisine, price range, rating, delivery time, open status, and favorites.
- Favorite restaurant save/remove/list flow.
- Cart, address, checkout, order creation, order history, and order detail pages.
- Razorpay checkout and Stripe checkout session support.
- Payment verification events through RabbitMQ.
- Realtime customer and seller order updates through Socket.io.
- Seller dashboard for multiple restaurants.
- Restaurant create/edit, open/close status, verification state, cuisine, rating, delivery time, and price range.
- Menu item create/edit/delete with image upload.
- Menu item categories, variants, add-ons, item availability, and bulk availability updates.
- Seller active orders, order history, sales stats, payout snapshot, and performance analytics.
- Rider onboarding profile with document/image upload.
- Rider availability toggle, location update, nearby available orders, current order, delivery status updates, stats, and history.
- Admin dashboard for pending restaurants, pending riders, customers, audit records, verification updates, and customer deletion.
- Cloudinary-backed upload service.
- Dockerfiles for each backend service.

## AI Features

The restaurant service exposes AI routes under `/api/ai`. Gemini is the default provider, with optional OpenAI support and local fallbacks so the UI remains usable during demos.

### Seller Description Generation

Available from seller restaurant and menu item forms.

```http
POST /api/ai/generate-description
```

Creates a short customer-facing description from restaurant/menu context such as name, cuisine, category, keywords, and current description.

### Smart Food Search

Available on the customer browse page.

```http
POST /api/ai/smart-food-search
```

Turns prompts such as `cheap spicy dinner`, `fast biryani`, or `top rated pizza` into usable filters:

- search text
- cuisine
- price range
- delivery time
- minimum rating
- open now
- keywords

### Seller Performance Insight

Available in the seller sales/performance area.

```http
POST /api/ai/seller-performance-insight
```

Generates a concise business summary, opportunities, and next actions from revenue, delivered orders, top items, low-performing items, payout data, and menu samples.

Supported AI environment variables:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash-lite

# Optional alternative provider
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

## Architecture

```text
                           +-------------------------+
                           |        Frontend         |
                           | React + Vite + TS       |
                           +-----------+-------------+
                                       |
      +--------------------------------+--------------------------------+
      |                                |                                |
      v                                v                                v
+-------------+              +-------------------+              +-------------+
| Auth        |              | Restaurant        |              | Utils       |
| Google/JWT  |              | Restaurants       |              | Uploads     |
| Roles       |              | Menus/Carts       |              | Payments    |
+-------------+              | Addresses/Orders  |              +------+------+
                             | Analytics/AI      |                     |
                             +---------+---------+                     |
                                       |                               |
                       +---------------+---------------+               |
                       |                               |               |
                       v                               v               |
                 +-----------+                   +-----------+         |
                 | Realtime  |                   | Rider     |         |
                 | Socket.io |                   | Delivery  |         |
                 | Rooms/API |                   | Location  |         |
                 +-----+-----+                   +-----+-----+         |
                       ^                               ^               |
                       |                               |               |
                       +-------------+-----------------+---------------+
                                     |
                              +------+------+
                              | RabbitMQ    |
                              | Events      |
                              +-------------+

                              +-------------+
                              | Admin       |
                              | Verification|
                              | Audit/Users |
                              +-------------+
```

## Tech Stack

### Frontend

- React 19
- TypeScript 5.9
- Vite 7
- Tailwind CSS 4
- React Router 7
- Axios
- React Hot Toast
- React Icons
- Leaflet and React Leaflet
- Socket.io Client
- Stripe JS
- Google OAuth provider

### Backend

- Node.js
- Express 5
- TypeScript
- MongoDB with Mongoose in auth, restaurant, and rider services
- MongoDB native driver in admin service
- JWT authentication
- RabbitMQ with `amqplib`
- Socket.io
- Cloudinary
- Razorpay
- Stripe
- Google APIs
- Gemini/OpenAI API calls through REST
- Joi validation in restaurant and rider services

## Project Structure

```text
FoodFleet/
  README.md

  frontend/
    src/
      components/
      context/
      pages/
      utils/
      types.ts
    package.json
    vite.config.ts

  services/
    admin/
    auth/
    realtime/
    restaurant/
    rider/
    utils/
```

## Services and Ports

| Service | Default Port | Main Responsibility |
| --- | ---: | --- |
| Frontend | `5173` | React app for customer, seller, rider, and admin flows |
| Auth | `5000` | Google login, JWT profile, refresh/logout, role assignment |
| Restaurant | `5001` | Restaurants, menu items, favorites, cart, addresses, orders, analytics, AI |
| Utils | `5002` | Cloudinary upload, Razorpay, Stripe |
| Realtime | `5003` | Socket.io server and internal event emit endpoint |
| Rider | `5004` | Rider profile, availability, location, delivery workflow, history |
| Admin | `5005` | Admin verification, customers, audit records |

`restaurant` and `utils` use fallback ports in code when `PORT` is missing. `realtime`, `rider`, and `admin` read `process.env.PORT`, so set `PORT` in their `.env` files.

## Environment Variables

Create one `.env` file inside `frontend/` and one inside each service folder.

### Frontend

```env
VITE_AUTH_SERVICE=http://localhost:5000
VITE_RESTAURANT_SERVICE=http://localhost:5001
VITE_UTILS_SERVICE=http://localhost:5002
VITE_REALTIME_SERVICE=http://localhost:5003
VITE_RIDER_SERVICE=http://localhost:5004
VITE_ADMIN_SERVICE=http://localhost:5005
VITE_GOOGLE_CLIENT_ID=
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_INTERNAL_SERVICE_KEY=
```

### Auth Service

```env
PORT=5000
FRONTEND_URL=http://localhost:5173
MONGO_URI=
DB_NAME=FoodFleet
JWT_SEC=
REFRESH_JWT_SEC=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Restaurant Service

```env
PORT=5001
MONGO_URI=
DB_NAME=FoodFleet
JWT_SEC=
UTILS_SERVICE=http://localhost:5002
REALTIME_SERVICE=http://localhost:5003
INTERNAL_SERVICE_KEY=
RABBITMQ_URL=
PAYMENT_QUEUE=payment_queue
ORDER_READY_QUEUE=order_ready_queue
AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash-lite
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

### Utils Service

```env
PORT=5002
CLOUD_NAME=
CLOUD_API_KEY=
CLOUD_SECRET_KEY=
STRIPE_SECRET_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
FRONTEND_URL=http://localhost:5173
RESTAURANT_SERVICE=http://localhost:5001
INTERNAL_SERVICE_KEY=
RABBITMQ_URL=
PAYMENT_QUEUE=payment_queue
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
DB_NAME=FoodFleet
JWT_SEC=
UTILS_SERVICE=http://localhost:5002
REALTIME_SERVICE=http://localhost:5003
RESTAURANT_SERVICE=http://localhost:5001
INTERNAL_SERVICE_KEY=
RABBITMQ_URL=
ORDER_READY_QUEUE=order_ready_queue
```

### Admin Service

```env
PORT=5005
MONGO_URI=
DB_NAME=FoodFleet
JWT_SEC=
```

Use the same `JWT_SEC` and `INTERNAL_SERVICE_KEY` anywhere services must trust the same frontend token or internal request.

## Installation

Install dependencies for the frontend and each service:

```bash
cd frontend
npm install
```

```bash
cd services/auth
npm install
```

```bash
cd services/restaurant
npm install
```

```bash
cd services/utils
npm install
```

```bash
cd services/realtime
npm install
```

```bash
cd services/rider
npm install
```

```bash
cd services/admin
npm install
```

## Running Locally

Start MongoDB and RabbitMQ first.

Then start each backend service in its own terminal:

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

The backend `dev` scripts compile TypeScript in watch mode and run the generated `dist/index.js` with Node watch mode.

## API Map

### Auth Service

Base path: `/api/auth`

- `POST /login`
- `POST /refresh`
- `POST /logout`
- `PUT /add/role`
- `GET /me`

### Restaurant Service

Restaurant base path: `/api/restaurant`

- `POST /new`
- `GET /my`
- `GET /mine`
- `PUT /status`
- `PUT /edit`
- `GET /favorites/list`
- `POST /favorites`
- `DELETE /favorites/:restaurantId`
- `GET /all`
- `GET /:id`

Menu item base path: `/api/item`

- `POST /new`
- `GET /all/:id`
- `PUT /bulk/availability`
- `PUT /:itemId`
- `DELETE /:itemId`
- `PUT /status/:itemId`

Cart base path: `/api/cart`

- `POST /add`
- `GET /all`
- `PUT /inc`
- `PUT /dec`
- `DELETE /clear`

Address base path: `/api/address`

- `POST /new`
- `GET /all`
- `DELETE /:id`

Order base path: `/api/order`

- `POST /new`
- `GET /myorder`
- `GET /payment/:id`
- `GET /restaurant/:restaurantId`
- `GET /restaurant/:restaurantId/history`
- `GET /stats/sales/:restaurantId`
- `GET /stats/performance/:restaurantId`
- `PUT /:orderId`
- `PUT /assign/rider`
- `GET /current/rider`
- `GET /nearby-ready/rider`
- `GET /stats/rider`
- `GET /history/rider`
- `PUT /update/status/rider`
- `GET /:id`

AI base path: `/api/ai`

- `POST /generate-description`
- `POST /smart-food-search`
- `POST /seller-performance-insight`

### Utils Service

Upload:

- `POST /api/upload`

Payment base path: `/api/payment`

- `POST /create`
- `POST /verify`
- `POST /stripe/create`
- `POST /stripe/verify`

### Realtime Service

Internal base path: `/api/v1/internal`

- `POST /emit`

Socket.io authenticates with the JWT token and joins user rooms automatically. Seller dashboards can also join `restaurant:{restaurantId}` rooms through the `restaurant:join` socket event.

### Rider Service

Base path: `/api/rider`

- `POST /new`
- `GET /myprofile`
- `PUT /myprofile`
- `GET /dashboard/stats`
- `GET /dashboard/history`
- `GET /orders/available`
- `PATCH /location`
- `PATCH /toggle`
- `POST /accept/:orderId`
- `GET /order/current`
- `PUT /order/update/:orderId`

### Admin Service

Base path: `/api/v1`

- `GET /admin/restaurant/pending`
- `GET /admin/rider/pending`
- `GET /admin/customers`
- `GET /admin/audit`
- `DELETE /admin/customers/:id`
- `PATCH /verify/rider/:id`
- `PATCH /verify/restaurant/:id`

## Demo Flow

1. Log in with Google.
2. Select a role.
3. As a seller, open `/partner`, create a restaurant, and generate an AI restaurant description.
4. As an admin, open `/admin` and verify the restaurant.
5. As a seller, add menu items with variants, add-ons, images, and availability.
6. As a customer, open `/browse`, use filters, save favorites, and try Smart Food Search.
7. Add items to the cart and choose an address.
8. Pay through Razorpay or Stripe.
9. Watch order updates appear in realtime.
10. As a seller, accept, prepare, and mark the order ready for rider.
11. As a rider, open `/deliveries`, go online, accept the available order, and update delivery status.
12. Return to the seller sales/performance area and generate AI performance insight.

## Build

Frontend:

```bash
cd frontend
npm run build
```

Backend services:

```bash
npm run build
```

Run the backend build command inside each service folder:

- `services/auth`
- `services/restaurant`
- `services/utils`
- `services/realtime`
- `services/rider`
- `services/admin`

Rider service also includes a data maintenance script:

```bash
cd services/rider
npm run backfill:rider-names
```

## Docker

Each backend service has its own Dockerfile:

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

A root `docker-compose.yml` is not currently included, so local development is still service-by-service.

## Notes

- Keep `.env` files private and never commit real secrets.
- MongoDB and RabbitMQ must be running before services that depend on them.
- `services/utils` requires valid Cloudinary environment variables at startup.
- `services/restaurant`, `services/utils`, and `services/rider` require RabbitMQ during startup.
- The AI routes fall back to local responses if the configured provider is missing or fails.
- Use Node.js `20.19+` or `22.12+` for the cleanest Vite 7 frontend experience.

## Author

Abhi Gupta

- GitHub: [@abhiguptanitb](https://github.com/abhiguptanitb)