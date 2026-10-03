import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/session";
import { notifyUser } from "@/server/notifications/service";

const messageSchema = z.object({
  bookingId: z.string(),
  content: z.string().min(1).max(2000),
});

async function assertParticipant(bookingId: string, userId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new Response(JSON.stringify({ error: "Réservation introuvable" }), { status: 404 });
  if (booking.senderId !== userId && booking.travelerId !== userId) {
    throw new Response(JSON.stringify({ error: "Non autorisé" }), { status: 403 });
  }
  return booking;
}

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json();
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const booking = await assertParticipant(parsed.data.bookingId, user.id);

  const message = await prisma.message.create({
    data: { bookingId: booking.id, authorId: user.id, content: parsed.data.content },
  });

  const recipientId = booking.senderId === user.id ? booking.travelerId : booking.senderId;
  await notifyUser(recipientId, "new_message", "Vous avez reçu un nouveau message.", { bookingId: booking.id });

  return NextResponse.json(message, { status: 201 });
}

export async function GET(req: Request) {
  const user = await requireUser();
  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get("bookingId");
  if (!bookingId) return NextResponse.json({ error: "bookingId requis" }, { status: 400 });

  await assertParticipant(bookingId, user.id);

  const messages = await prisma.message.findMany({
    where: { bookingId },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, firstName: true, avatarUrl: true } } },
  });

  return NextResponse.json(messages);
}
