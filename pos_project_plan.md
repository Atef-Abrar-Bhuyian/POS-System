# POS System — Project Plan

**Stack:** React (frontend) · Node.js + Express (backend API) · Supabase (Postgres DB + Auth)

---

## 1. Database Schema (Supabase)

| Table | Key Columns |
|---|---|
| `users` | id, name, email, role (admin/cashier), password_hash (or use Supabase Auth) |
| `products` | id, name, sku, category, price, stock_qty, image_url |
| `categories` | id, name |
| `orders` | id, cashier_id, total_amount, payment_method, status, created_at |
| `order_items` | id, order_id, product_id, qty, unit_price, subtotal |
| `payments` | id, order_id, amount, method, status, transaction_ref |
| `inventory_logs` | id, product_id, change_qty, reason (sale/restock), created_at |

> Use Supabase Auth for `users` login instead of storing passwords manually — simpler & secure.

---

## 2. Backend (Node.js + Express)

**Structure:**
```
/server
  /routes      → products.js, orders.js, auth.js, reports.js
  /controllers → business logic per route
  /middleware  → auth check, error handler
  /config      → supabase client init
  server.js
```

**Core API Endpoints:**
- `POST /auth/login`
- `GET/POST/PUT/DELETE /products`
- `POST /orders` (create sale, deduct stock, log payment)
- `GET /orders/:id`
- `GET /reports/daily` `/reports/sales`

---

## 3. Frontend (React)

**Pages:**
- `Login`
- `POS / Checkout` (main cashier screen: product grid, cart, total, pay)
- `Products` (admin: add/edit/delete, stock)
- `Orders` (history, receipts)
- `Reports/Dashboard` (sales summary, charts)

**Key Components:**
- ProductCard / ProductGrid
- Cart / CartItem
- PaymentModal
- ReceiptView (print/export)
- Sidebar/Nav (role-based)

**State/data:** React Context or Zustand for cart state; fetch via Axios/Fetch to Express API.

---

## 4. Development Phases

| Phase | Tasks | Est. Time |
|---|---|---|
| **1. Setup** | Init Supabase project + tables, Express server skeleton, React app skeleton | 2–3 days |
| **2. Auth** | Supabase Auth integration, login page, role-based routes | 2 days |
| **3. Product Mgmt** | CRUD API + admin UI for products/categories | 3 days |
| **4. POS Checkout** | Cart logic, order creation, stock deduction | 4–5 days |
| **5. Payments** | Payment method selection, (optional) gateway integration | 2–3 days |
| **6. Orders & Receipts** | Order history, receipt generation (print/PDF) | 2–3 days |
| **7. Reports** | Daily/weekly sales dashboard | 2 days |
| **8. Polish & Deploy** | Styling, error handling, deploy (Vercel + Render/Railway) | 3 days |

**Total estimate:** ~3–4 weeks (solo dev, part-time may double this)

---

## 5. Deployment
- **Frontend:** Vercel or Netlify
- **Backend:** Render / Railway / Fly.io
- **DB:** Supabase (hosted)

---

## 6. Optional Later Additions
- Barcode scanner input support
- Multi-branch/location support
- Offline mode (local cache + sync)
- Discount/coupon system
- Low-stock alerts
