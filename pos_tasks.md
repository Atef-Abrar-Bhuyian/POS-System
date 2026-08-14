# POS System Implementation Roadmap

This document outlines the step-by-step developer task list to build the POS system. Tasks are organized by phase and feature area, with checkboxes to track progress.

---

## Phase 1: Environment & Project Setup

### Frontend Setup (React)
- [x] Initialize React app (Vite recommended: `npm create vite@latest client -- --template react`)
- [x] Install essential frontend libraries:
  - Router: `react-router-dom`
  - HTTP Client: `axios`
  - Icons: `lucide-react` or `react-icons`
  - Styling: Vanilla CSS / Tailwind (if preferred)
  - State Management: `zustand` (recommended for Cart management)
- [x] Configure standard folder structure (components, pages, context, hooks, api).

### Backend Setup (Node.js + Express)
- [x] Initialize Express app: `npm init -y` inside `/server` folder
- [x] Install backend dependencies: `express cors dotenv pg` and dev dependencies `nodemon`
- [x] Create `server.js` boilerplate with middleware configuration (JSON parsing, CORS).
- [x] Create folder structure:
  - `/routes`
  - `/controllers`
  - `/middleware`
  - `/config`

---

## Phase 2: Database Schema (Supabase)

- [x] Create a new project in Supabase dashboard.
- [x] Set up database schemas using SQL Editor:
  - [x] Create `categories` table: `id (UUID/Int, PK)`, `name (text, unique)`
  - [x] Create `products` table: `id (UUID/Int, PK)`, `name`, `sku (unique)`, `category_id (FK)`, `price`, `stock_qty`, `image_url`
  - [x] Create `orders` table: `id (UUID/Int, PK)`, `cashier_id (FK to auth.users)`, `total_amount`, `payment_method`, `status`, `created_at`
  - [x] Create `order_items` table: `id`, `order_id (FK)`, `product_id (FK)`, `qty`, `unit_price`, `subtotal`
  - [x] Create `payments` table: `id`, `order_id (FK)`, `amount`, `method`, `status`, `transaction_ref`
  - [x] Create `inventory_logs` table: `id`, `product_id (FK)`, `change_qty`, `reason`, `created_at`
- [x] Set up user profiles table metadata mapping if using Supabase Auth (or link custom roles to users via a user profiles table).
- [x] Add basic seed data (mock products, categories) for development.

---

## Phase 3: Authentication & Security

### Backend
- [x] Set up Supabase Client SDK in Express `/config/supabase.js`.
- [x] Write auth routes (`POST /api/auth/login`, `POST /api/auth/logout`).
- [x] Create authentication middleware (`middleware/auth.js`) to verify JWT tokens sent in authorization headers.
- [x] Create role-checking middleware (`middleware/checkRole.js`) to protect Admin routes.

### Frontend
- [x] Implement Login Screen.
- [x] Set up AuthContext or Zustand store to manage active user session, token, and roles (admin vs. cashier).
- [x] Create Protected Route wrapper in React Router to separate admin views from cashier-only views.

---

## Phase 4: Product & Category Management (Admin CRUD)

### Backend API
- [x] `GET /api/categories` & `POST /api/categories` (Create category)
- [x] `GET /api/products` (with filters for search & category)
- [x] `POST /api/products` (Admin only - create product)
- [x] `PUT /api/products/:id` (Admin only - update price, stock, details)
- [x] `DELETE /api/products/:id` (Admin only - archive/delete product)

### Frontend UI
- [x] Build Category administration modal or list view.
- [x] Build Product administration dashboard:
  - [x] Product list table with pagination, search, and category filter.
  - [x] "Add/Edit Product" modal form with validation (SKU, price, stock).

---

## Phase 5: POS Checkout & Cart Engine (Cashier Screen)

### Frontend Engine (Zustand/Context)
- [x] Create `useCart` store:
  - `cartItems` state structure
  - `addToCart(product)` action (increment qty if already exists)
  - `removeFromCart(productId)` action
  - `updateQuantity(productId, qty)` action
  - `clearCart()` action
  - Calculated fields: `subtotal`, `tax`, `discount`, `total`

### Cashier Page UI
- [x] **Left Side (Product Selection Grid):**
  - Search bar (by name or SKU).
  - Category filter buttons.
  - Interactive grid displaying product cards (name, image, price, stock badge).
  - Disable grid cards if stock is 0.
- [x] **Right Side (Cart Sidebar):**
  - Scrollable list of items currently in the cart with quantity controls.
  - Calculation summaries (Total, Subtotal, Tax).
  - "Checkout / Pay" action button (disables if cart is empty).

---

## Phase 6: Transactional Order Placement API

### Backend Transaction Handling
- [x] Implement `POST /api/orders`:
  - [x] Must run within a **database transaction** to prevent partial writes.
  - [x] Check stock availability for all requested items:
    - [x] If `qty_requested > stock_qty`, abort transaction and return `400 Bad Request` specifying which items failed.
  - [x] Create Order record in `orders`.
  - [x] Create multiple entries in `order_items`.
  - [x] Update `stock_qty` in `products` (subtract item quantity).
  - [x] Add logs in `inventory_logs` documenting stock deduction due to sale.
  - [x] Create `payments` entry.

### Frontend Integration
- [x] Build Checkout/Payment Modal:
  - [x] Select payment method (Cash, Card, Mobile Pay).
  - [x] If cash, input "Amount Tendered" and calculate "Change Due".
- [x] Handle API response: on success, display success confirmation and clear the cart state.

---

## Phase 7: Order History & Receipts

### Frontend UI
- [x] Create Receipt View component:
  - [x] Clean layout containing store name, date, transaction ID, line items, totals, payment method, and cashier name.
  - [x] Auto-open receipt view modal after successful checkout.
  - [x] Add a "Print Receipt" button configured with CSS `@media print` rules to output a clean thermal-printer layout.
- [x] Create Order History screen:
  - [x] List of past orders with date, cashier, total, and payment status.
  - [x] Click-to-view option that opens the historic receipt.

---

## Phase 8: Reports & Dashboard (Admin Only)

### Backend API
- [x] Implement `GET /api/reports/sales-summary`:
  - [x] Aggregated metrics: total revenue, transaction count, average order value.
- [x] Implement `GET /api/reports/top-products`:
  - [x] List of top-selling products by quantity.

### Frontend UI
- [x] Build Dashboard widgets for key metrics.
- [x] Integrate simple charts (e.g., using `recharts` or `chart.js`) for daily/weekly sales trends.

---

## Phase 9: Testing, Polish & Deployment

- [ ] Run end-to-end user tests (e.g., testing stock checks by attempting to sell more items than available).
- [ ] Add error boundaries to React app and custom global error middleware to Express.
- [ ] Deploy database to Supabase production.
- [ ] Deploy Backend to Render, Railway, or Fly.io (configure environment variables for Database connection).
- [ ] Deploy Frontend to Vercel or Netlify.
