"use client";

import { useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { PrimaryButton } from "@/components/ui";

export function PaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    setLoading(false);
    if (confirmError) {
      setError(confirmError.message ?? "Le paiement a échoué.");
      return;
    }
    if (paymentIntent?.status === "succeeded") {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-error">{error}</p>}
      <PrimaryButton type="submit" disabled={!stripe || loading}>
        {loading ? "Traitement..." : "Payer maintenant"}
      </PrimaryButton>
    </form>
  );
}
