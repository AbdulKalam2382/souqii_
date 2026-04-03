import Stripe from 'stripe';

export const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16', // using a stable API version
}) : null;

export async function createCheckoutSession(orderId, totalAmount, returnUrl) {
  // totalAmount comes in as KD (e.g., 400.50). 
  // Stripe test account uses USD. 1 USD = 100 cents.
  // We treat the KD value as USD equivalent for test mode.
  const amountInCents = Math.round(totalAmount * 100);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Souqii Order #${orderId}`,
            description: 'AI-Powered PC Parts Order — Souqii',
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${returnUrl}?success=true&order_id=${orderId}`,
    cancel_url: `${returnUrl}?canceled=true&order_id=${orderId}`,
    metadata: {
      order_id: orderId.toString()
    }
  });

  return session.url;
}
