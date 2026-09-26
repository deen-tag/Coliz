import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth/session";
import { notifyUser } from "@/server/notifications/service";

const incidentSchema = z.object({
  bookingId: z.string(),
  category: z.enum(["colis_endommage", "colis_perdu", "retard", "comportement", "autre"]),
  description: z.string().min(10).max(2000),
  attachments: z.array(z.string().url()).max(5).optional(),
});

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json();
  const parsed = incidentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const booking = await prisma.booking.findUnique({ where: { id: parsed.data.bookingId } });
  if (!booking) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  if (booking.senderId !== user.id && booking.travelerId !== user.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const incident = await prisma.incident.create({
    data: {
      bookingId: booking.id,
      reporterId: user.id,
      category: parsed.data.category,
      description: parsed.data.description,
      attachments: parsed.data.attachments,
    },
  });

  await prisma.booking.update({ where: { id: booking.id }, data: { status: "INCIDENT" } });

  // Pas d'indemnisation automatique sur la valeur déclarée (cf. cahier des charges) —
  // l'incident est traité manuellement en back-office (section 18).
  await notifyUser(booking.senderId === user.id ? booking.travelerId : booking.senderId, "incident_action_required", "Un incident a été signalé sur votre réservation.");

  return NextResponse.json(incident, { status: 201 });
}
