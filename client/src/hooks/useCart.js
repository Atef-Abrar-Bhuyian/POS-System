import { create } from 'zustand';

export const useCart = create((set, get) => ({
  cartItems: [], // [{ product, qty }]

  // Add product to cart or increment if already exists
  addToCart: (product) => {
    if (product.stock_qty <= 0) return; // Guard: no stock
    const { cartItems } = get();
    const existing = cartItems.find(i => i.product.id === product.id);
    if (existing) {
      // Don't exceed available stock
      if (existing.qty >= product.stock_qty) return;
      set({
        cartItems: cartItems.map(i =>
          i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i
        )
      });
    } else {
      set({ cartItems: [...cartItems, { product, qty: 1 }] });
    }
  },

  // Remove a product entirely from cart
  removeFromCart: (productId) => {
    set({ cartItems: get().cartItems.filter(i => i.product.id !== productId) });
  },

  // Set an explicit quantity — removes if qty drops to 0
  updateQuantity: (productId, qty) => {
    const parsed = parseInt(qty);
    if (parsed <= 0 || isNaN(parsed)) {
      set({ cartItems: get().cartItems.filter(i => i.product.id !== productId) });
      return;
    }
    set({
      cartItems: get().cartItems.map(i => {
        if (i.product.id !== productId) return i;
        // Clamp to available stock
        const clampedQty = Math.min(parsed, i.product.stock_qty);
        return { ...i, qty: clampedQty };
      })
    });
  },

  // Clear all items
  clearCart: () => set({ cartItems: [] }),

  // ─── Computed helpers ───────────────────────────────
  get subtotal() {
    return get().cartItems.reduce((sum, i) => sum + i.product.price * i.qty, 0);
  },
  get itemCount() {
    return get().cartItems.reduce((sum, i) => sum + i.qty, 0);
  }
}));
