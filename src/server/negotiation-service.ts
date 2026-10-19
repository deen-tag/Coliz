// Négociation de prix : enregistrement des offres, contre-offres et réponses.
// Toutes les décisions (minimum, droits, états) viennent de negotiation.ts (pur, testé) ; ce fichier
// ne fait que lire/écrire la base. Les règles s'appliquent ICI, côté serveur : l'interface n'est
// qu'un confort et ne peut pas les contourner.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/server/notifications/service";
import { formatEuro } from "./pricing-grid";
import { splitTotal } from "./pricing";
import { bandForParcel, loadPricingConfig } from "./pricing-config";
import {
  evaluateNewOffer,
  evaluateOfferResponse,
  evaluatePriceGate,
  partyOf,
  type Failure,
  type OfferView,
  type Party,
} from "./negotiation";

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; code: string; minPrice?: number };

const num = (d: { toString(): string }) => Number(d.toString());

const failure = (status: number, code: string, error: string): ServiceResult<never> => ({ ok: false, status, code, error });
const fromDecision = (f: Failure): ServiceResult<never> => ({
  ok: false,
  status: f.httpStatus,
  code: f.code,
  error: f.message,
  ...(f.minPrice !== undefined ? { minPrice: f.minPrice } : {}),
});

type OfferRow = { id: string; authorRole: Party; amount: { toString(): string }; status: OfferView["status"] };
const toView = (o: OfferRow): OfferView => ({ id: o.id, authorRole: o.authorRole, amount: num(o.amount), status: o.status });

// Isolation « Serializable » : deux offres simultanées sur la même réservation ne peuvent pas
// s'écraser (la perdante est rejouée et voit alors l'offre de l'autre).
async function serializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (e) {
      const conflict = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034";
      if (!conflict || attempt >= 3) throw e;
    }
  }
}

const NO_BAND = () => failure(422, "NO_BAND", "Le poids du colis est invalide : impossible de déterminer le prix minimum.");

// ───────── Nouvelle offre ou contre-proposition ─────────

export async function createOffer(bookingId: string, userId: string, amount: unknown) {
  const config = await loadPricingConfig();

  const result = await serializable(async (tx): Promise<ServiceResult<{ offer: { id: string }; recipientId: string; countered: boolean; amount: number }>> => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { parcel: { select: { weightKg: true, originLabel: true, destinationLabel: true } } },
    });
    if (!booking) return failure(404, "NOT_FOUND", "Réservation introuvable");
    const role = partyOf(booking, userId);
    if (!role) return failure(403, "FORBIDDEN", "Non autorisé");

    const band = bandForParcel(config, booking.parcel);
    if (!band) return NO_BAND();

    const pending = await tx.priceOffer.findFirst({ where: { bookingId, status: "PENDING" }, orderBy: { createdAt: "desc" } });
    const decision = evaluateNewOffer({
      role,
      bookingStatus: booking.status,
      currentTotal: num(booking.totalAmount),
      amount,
      band,
      pending: pending ? toView(pending) : null,
    });
    if (!decision.ok) return fromDecision(decision);

    if (decision.supersede) {
      await tx.priceOffer.update({
        where: { id: decision.supersede.offerId },
        data: { status: decision.supersede.as, respondedById: userId, respondedAt: new Date() },
      });
    }
    const offer = await tx.priceOffer.create({
      data: { bookingId, authorId: userId, authorRole: role, amount: decision.amount, minAtOffer: band.minPrice },
      select: { id: true },
    });
    return {
      ok: true,
      data: {
        offer,
        recipientId: role === "SENDER" ? booking.travelerId : booking.senderId,
        countered: decision.supersede?.as === "COUNTERED",
        amount: decision.amount,
      },
    };
  });

  if (result.ok) {
    const { recipientId, countered, amount: offered } = result.data;
    await notifyUser(
      recipientId,
      countered ? "price_countered" : "price_proposed",
      countered
        ? `Contre-proposition de prix : ${formatEuro(offered)} (tout compris). Répondez depuis la réservation.`
        : `Nouveau prix proposé : ${formatEuro(offered)} (tout compris). Répondez depuis la réservation.`,
      { bookingId }
    ).catch(() => {});
  }
  return result;
}

// ───────── Réponse à une offre (accepter / refuser) ─────────

export async function respondToOffer(bookingId: string, offerId: string, userId: string, action: "accept" | "reject") {
  const config = await loadPricingConfig();

  const result = await serializable(async (tx): Promise<ServiceResult<{ status: "ACCEPTED" | "REJECTED"; authorId: string; amount: number }>> => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { parcel: { select: { weightKg: true, originLabel: true, destinationLabel: true } } },
    });
    if (!booking) return failure(404, "NOT_FOUND", "Réservation introuvable");
    const role = partyOf(booking, userId);
    if (!role) return failure(403, "FORBIDDEN", "Non autorisé");

    const offer = await tx.priceOffer.findUnique({ where: { id: offerId } });
    if (!offer || offer.bookingId !== bookingId) return failure(404, "OFFER_NOT_FOUND", "Offre introuvable");

    const band = bandForParcel(config, booking.parcel);
    if (!band) return NO_BAND();

    const decision = evaluateOfferResponse({ role, bookingStatus: booking.status, offer: toView(offer), action, band });
    if (!decision.ok) return fromDecision(decision);

    await tx.priceOffer.update({
      where: { id: offer.id },
      data: { status: decision.nextStatus, respondedById: userId, respondedAt: new Date() },
    });

    if (decision.nextStatus === "ACCEPTED") {
      // Prix convenu : la commission est prélevée dans ce total (le total reste exactement l'offre).
      const amounts = splitTotal(num(offer.amount), config.feeRate);
      await tx.booking.update({
        where: { id: bookingId },
        data: { ...amounts, negotiatedAmount: amounts.totalAmount },
      });
    }
    return { ok: true, data: { status: decision.nextStatus, authorId: offer.authorId, amount: num(offer.amount) } };
  });

  if (result.ok) {
    const { status, authorId, amount } = result.data;
    await notifyUser(
      authorId,
      status === "ACCEPTED" ? "price_accepted" : "price_rejected",
      status === "ACCEPTED"
        ? `Votre prix de ${formatEuro(amount)} a été accepté : c'est le prix convenu.`
        : `Votre proposition de ${formatEuro(amount)} a été refusée.`,
      { bookingId }
    ).catch(() => {});
  }
  return result;
}

// ───────── Verrou avant « Accepter la demande » et « Payer » ─────────

export async function assertPriceGate(bookingId: string): Promise<ServiceResult<null>> {
  const [config, booking, pending] = await Promise.all([
    loadPricingConfig(),
    prisma.booking.findUnique({
      where: { id: bookingId },
      include: { parcel: { select: { weightKg: true, originLabel: true, destinationLabel: true } } },
    }),
    prisma.priceOffer.findFirst({ where: { bookingId, status: "PENDING" }, orderBy: { createdAt: "desc" } }),
  ]);
  if (!booking) return failure(404, "NOT_FOUND", "Réservation introuvable");
  const band = bandForParcel(config, booking.parcel);
  if (!band) return NO_BAND();

  const gate = evaluatePriceGate({ totalAmount: num(booking.totalAmount), band, pending: pending ? toView(pending) : null });
  return gate.ok ? { ok: true, data: null } : fromDecision(gate);
}

// ───────── Vue pour l'écran de réservation ─────────

export async function getNegotiationState(booking: {
  id: string;
  status: string;
  parcel: { weightKg: number; originLabel: string; destinationLabel: string };
}) {
  const [config, offers] = await Promise.all([
    loadPricingConfig(),
    prisma.priceOffer.findMany({
      where: { bookingId: booking.id },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { firstName: true } } },
    }),
  ]);
  const band = bandForParcel(config, booking.parcel);
  const history = offers.map((o) => ({
    id: o.id,
    authorId: o.authorId,
    authorRole: o.authorRole,
    authorFirstName: o.author.firstName,
    amount: num(o.amount),
    status: o.status,
    createdAt: o.createdAt,
    respondedAt: o.respondedAt,
  }));
  return {
    feeRate: config.feeRate,
    band,
    offers: history,
    pendingOffer: history.filter((o) => o.status === "PENDING").slice(-1)[0] ?? null,
  };
}
