import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/server/stripe/client";
import { requireUser } from "@/server/auth/session";

export async function POST() {
  const user = await requireUser();

  const session = await stripe.identity.verificationSessions.create({
    type: "document",
    metadata: { userId: user.id },
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/parametres?identity=return`,
  });

  await prisma.verification.create({
    data: { userId: user.id, type: "IDENTITY", status: "PENDING", provider: "stripe_identity" },
  });
  await prisma.user.update({ where: { id: user.id }, data: { identityVerificationId: session.id } });

  return NextResponse.json({ url: session.url });
}
