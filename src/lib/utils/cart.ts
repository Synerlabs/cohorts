'use server';

import { cookies } from 'next/headers';
import { RequestCookies } from 'next/dist/server/web/spec-extension/cookies';
import { Cart, CartItem, CART_SESSION_KEY } from '../types/cart';

function getCookieStore(): RequestCookies {
  return cookies() as unknown as RequestCookies;
}

export async function getCart(): Promise<Cart | null> {
  try {
    const cartJson = getCookieStore().get(CART_SESSION_KEY)?.value;
    if (!cartJson) return null;

    const cart = JSON.parse(cartJson) as Cart;
    
    // Check if cart is expired
    if (new Date(cart.expiresAt) < new Date()) {
      await clearCart();
      return null;
    }

    return cart;
  } catch (error) {
    console.error('Failed to parse cart:', error);
    return null;
  }
}

export async function setCart(cart: Cart) {
  try {
    getCookieStore().set(CART_SESSION_KEY, JSON.stringify(cart));
  } catch (error) {
    console.error('Failed to set cart:', error);
    throw error;
  }
}

export async function clearCart() {
  try {
    getCookieStore().delete(CART_SESSION_KEY);
  } catch (error) {
    console.error('Failed to clear cart:', error);
    throw error;
  }
}

export async function addItem(item: CartItem): Promise<Cart> {
  const cart = await getCart() || {
    items: [],
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
  };

  // For membership, replace any existing item since we only allow one
  if (item.type === 'membership') {
    cart.items = [item];
  } else {
    cart.items.push(item);
  }

  await setCart(cart);
  return cart;
}

export async function removeItem(productId: string): Promise<Cart | null> {
  const cart = await getCart();
  if (!cart) return null;

  cart.items = cart.items.filter(item => item.productId !== productId);
  
  if (cart.items.length === 0) {
    await clearCart();
    return null;
  }

  await setCart(cart);
  return cart;
}

export async function hasItem(productId: string): Promise<boolean> {
  const cart = await getCart();
  return cart?.items.some(item => item.productId === productId) || false;
} 
