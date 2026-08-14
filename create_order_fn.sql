-- Create Order Postgres Stored Function
-- Handles the entire order creation atomically inside a DB transaction.
-- Called from Express via Supabase RPC.

CREATE OR REPLACE FUNCTION public.create_order(
  p_cashier_id    UUID,
  p_items         JSONB,   -- [{ product_id, qty, unit_price }]
  p_payment_method TEXT,
  p_total_amount  NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id   UUID;
  v_item       JSONB;
  v_product    RECORD;
  v_subtotal   NUMERIC;
  v_out_of_stock TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- 1. Validate stock for every item BEFORE writing anything
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT id, name, stock_qty INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::UUID
    FOR UPDATE; -- Lock the row to prevent race conditions

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found', v_item->>'product_id';
    END IF;

    IF v_product.stock_qty < (v_item->>'qty')::INTEGER THEN
      v_out_of_stock := array_append(v_out_of_stock, v_product.name);
    END IF;
  END LOOP;

  -- Abort if any items are out of stock
  IF array_length(v_out_of_stock, 1) > 0 THEN
    RAISE EXCEPTION 'STOCK_ERROR: Insufficient stock for: %', array_to_string(v_out_of_stock, ', ');
  END IF;

  -- 2. Create the Order record
  INSERT INTO public.orders (cashier_id, total_amount, payment_method, status)
  VALUES (p_cashier_id, p_total_amount, p_payment_method, 'completed')
  RETURNING id INTO v_order_id;

  -- 3. Insert order items, update stock, and log inventory changes
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_subtotal := (v_item->>'qty')::INTEGER * (v_item->>'unit_price')::NUMERIC;

    -- Insert order_item
    INSERT INTO public.order_items (order_id, product_id, qty, unit_price, subtotal)
    VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'qty')::INTEGER,
      (v_item->>'unit_price')::NUMERIC,
      v_subtotal
    );

    -- Deduct stock
    UPDATE public.products
    SET stock_qty = stock_qty - (v_item->>'qty')::INTEGER
    WHERE id = (v_item->>'product_id')::UUID;

    -- Log the inventory change
    INSERT INTO public.inventory_logs (product_id, change_qty, reason)
    VALUES (
      (v_item->>'product_id')::UUID,
      -((v_item->>'qty')::INTEGER),
      'sale'
    );
  END LOOP;

  -- 4. Create the payment record
  INSERT INTO public.payments (order_id, amount, method, status)
  VALUES (v_order_id, p_total_amount, p_payment_method, 'success');

  -- 5. Return the created order ID
  RETURN jsonb_build_object('order_id', v_order_id);

EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise so Postgres rolls back and the caller gets the error message
    RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_order TO authenticated;
