import Stripe from 'stripe';

export const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16', // using a stable API version
}) : null;

export async function createCheckoutSession(orderId, totalAmount, returnUrl) {
  // totalAmount comes in as KD (e.g., 400.50). 
  // Stripe expects the smallest currency unit. Since KD has 3 decimals (Fils), 
  // but Stripe usually maps USD to cents... Wait, KWD is indeed supported by Stripe, and it requires integer multiplier.
  // 1 KD = 1000 Fils.
  const amountInFils = Math.round(totalAmount * 1000);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'kwd', // Kuwaiti Dinar
          product_data: {
            name: `Souqii Order #${orderId}`,
            description: 'Automated AI PC Parts Order',
          },
          unit_amount: amountInFils,
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
