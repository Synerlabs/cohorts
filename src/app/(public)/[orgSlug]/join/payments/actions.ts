'use server';

import Stripe from 'stripe';

export async function createStripePaymentIntent(orderId: string, amount: number, currency: string) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: currency.toLowerCase(),
    metadata: {
      orderId
    }
  });

  return paymentIntent.client_secret;
} 