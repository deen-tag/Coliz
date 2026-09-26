import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/server/stripe/client";
import { requireUser } from "@/server/auth/session";

// Type de compte retenu : Express — Stripe gère l'onboarding et la conformité,
// ce qui limite fortement la charge de dev/maintenance pour un solo dev.
export async function POST() {
  const user = await requireUser();

  let account = await prisma.stripeConnectedAccount.findUnique({ where: { userId: user.id } });

  if (!account) {
    const stripeAccount = await stripe.accounts.create({
      type: "express",
      email: user.email,
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
      business_type: "individual",
    });

    account = await prisma.stripeConnectedAccount.create({
      data: {
        userId: user.id,
        stripeAccountId: stripeAccount.id,
      },
    });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const accountLink = await stripe.accountLinks.create({
    account: account.stripeAccountId,
    refresh_url: `${baseUrl}/portefeuille?onboarding=refresh`,
    return_url: `${baseUrl}/portefeuille?onboarding=success`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}

// Statut de l'onboarding, pour l'écran Portefeuille : à afficher clairement,
// distinct du badge "Profil vérifié" (identité) qui est géré séparément.
export async function GET() {
  const user = await requireUser();
  const account = await prisma.stripeConnectedAccount.findUnique({ where: { userId: user.id } });
  if (!account) {
    return NextResponse.json({ connected: false });
  }
  return NextResponse.json({
    connected: true,
    onboardingCompleted: account.onboardingCompleted,
    chargesEnabled: account.chargesEnabled,
    payoutsEnabled: account.payoutsEnabled,
  });
}
