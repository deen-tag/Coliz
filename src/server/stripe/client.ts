import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export { PLATFORM_FEE_RATE, computeBookingAmounts } from "@/server/pricing";

export function toStripeAmount(amountEur: number) {
  return Math.round(amountEur * 100); // Stripe travaille en centimes
}
