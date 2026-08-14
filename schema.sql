-- POS System Database Schema
-- Run this script inside your Supabase project's SQL Editor

-- Enable UUID extension (usually enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Profiles Table (extends Supabase Auth Users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin', 'cashier')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 3. Create Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    stock_qty INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 4. Create Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cashier_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'mobile_pay')),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 5. Create Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    qty INTEGER NOT NULL CHECK (qty > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0)
);

-- Enable RLS on order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 6. Create Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    method TEXT NOT NULL CHECK (method IN ('cash', 'card', 'mobile_pay')),
    status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'refunded')),
    transaction_ref TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 7. Create Inventory Logs Table
CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    change_qty INTEGER NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('sale', 'restock', 'adjustment', 'return')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on inventory_logs
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- TRIGGERS & FUNCTIONS
--------------------------------------------------------------------------------

-- Function to handle syncing Supabase Auth users to public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'cashier')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

--------------------------------------------------------------------------------
-- RLS POLICIES (Allow read/write access for simple dev setup)
-- Note: In production, configure stricter rules based on roles.
--------------------------------------------------------------------------------

-- Public read access to categories & products for cashiers/admins
CREATE POLICY "Allow select for all authenticated users" ON public.categories 
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow select for all authenticated users" ON public.products 
    FOR SELECT TO authenticated USING (true);

-- Admin CRUD access to categories & products
CREATE POLICY "Allow admin all access to categories" ON public.categories
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );
CREATE POLICY "Allow admin all access to products" ON public.products
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

-- Orders RLS: Cashiers can insert and read their own orders; Admins can read all.
CREATE POLICY "Allow insert orders for authenticated users" ON public.orders
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = cashier_id);
CREATE POLICY "Allow select own or admin orders" ON public.orders
    FOR SELECT TO authenticated USING (
        auth.uid() = cashier_id OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

-- Order Items RLS
CREATE POLICY "Allow insert items for authenticated users" ON public.order_items
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_id AND orders.cashier_id = auth.uid())
    );
CREATE POLICY "Allow select order items" ON public.order_items
    FOR SELECT TO authenticated USING (true);

-- Payments RLS
CREATE POLICY "Allow insert payments for authenticated users" ON public.payments
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_id AND orders.cashier_id = auth.uid())
    );
CREATE POLICY "Allow select payments" ON public.payments
    FOR SELECT TO authenticated USING (true);

-- Inventory Logs RLS (Admins can view/create, Sales triggers can run security definer)
CREATE POLICY "Allow admin all access to inventory logs" ON public.inventory_logs
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

-- Profiles RLS (Users can view profiles, own profiles are updateable, admins can do all)
CREATE POLICY "Allow profiles select" ON public.profiles
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow self profile update" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

--------------------------------------------------------------------------------
-- SEED DATA
--------------------------------------------------------------------------------

-- Seed Categories
INSERT INTO public.categories (id, name) VALUES
('a1111111-1111-1111-1111-111111111111', 'Kebabs'),
('b2222222-2222-2222-2222-222222222222', 'Sides'),
('c3333333-3333-3333-3333-333333333333', 'Drinks'),
('d4444444-4444-4444-4444-444444444444', 'Desserts')
ON CONFLICT (name) DO NOTHING;

-- Seed Products
INSERT INTO public.products (name, sku, category_id, price, stock_qty, image_url) VALUES
('Seekh Kebab', 'KEB-SEEKH-001', 'a1111111-1111-1111-1111-111111111111', 12.99, 100, 'https://images.unsplash.com/photo-1601356616077-695728867190?w=500'),
('Bihari Kebab', 'KEB-BIHARI-002', 'a1111111-1111-1111-1111-111111111111', 14.50, 80, 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500'),
('Naan Bread', 'SID-NAAN-001', 'b2222222-2222-2222-2222-222222222222', 2.50, 200, 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500'),
('Garlic Naan', 'SID-GNAAN-002', 'b2222222-2222-2222-2222-222222222222', 3.00, 150, 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=500'),
('Mango Lassi', 'DRK-MLASSI-001', 'c3333333-3333-3333-3333-333333333333', 3.99, 120, 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=500'),
('Soft Drink', 'DRK-SDRK-002', 'c3333333-3333-3333-3333-333333333333', 1.99, 300, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500'),
('Gulab Jamun', 'DES-GJAM-001', 'd4444444-4444-4444-4444-444444444444', 4.99, 90, 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500')
ON CONFLICT (sku) DO NOTHING;
