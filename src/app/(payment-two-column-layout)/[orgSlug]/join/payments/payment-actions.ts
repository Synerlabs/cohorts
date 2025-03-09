'use server';

import { createStripePaymentIntent } from './actions';

/**
 * Server action to create a Stripe payment intent with the proper return format for client use
 */
export async function createStripePaymentIntentForClient(orderId: string, groupId: string) {
  const result = await createStripePaymentIntent(orderId, groupId);
  return {
    clientSecret: result.clientSecret,
    accountId: result.accountId
  };
} 