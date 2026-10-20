// Remet en conformité avec la grille les prix créés AVANT sa mise en place.
// Périmètre volontairement prudent :
//  - trajets ouverts à venir : prix relevé au plancher de la grille ;
//  - réservations non payées (REQUESTED / ACCEPTED) : prix remonté au minimum du colis ;
//  - réservations payées, en cours, terminées ou annulées : JAMAIS touchées (l'argent est déjà engagé) ;
//  - prix proposés sur des colis sous le minimum : effacés.
// `apply: false` ne fait que compter (aperçu).

import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/server/notifications/service";
import { bandForParcel, floorForRoute, loadPricingConfig } from "./pricing-config";
import { formatEuro } from "./pricing-grid";
import { planBookingFix, planTripFix, proposedAmountIsBelowMinimum } from "./pricing-align-plan";

const num = (d: { toString(): string }) => Number(d.toString());
const SAMPLE = 20;

export async function alignPrices({ apply, adminId }: { apply: boolean; adminId: string }) {
  const config = await loadPricingConfig();
  const rate = config.feeRate;

  // 1) Trajets ouverts
  const trips = await prisma.trip.findMany({
    where: { status: { in: ["PUBLISHED", "PARTIALLY_BOOKED"] }, departureAt: { gte: new Date() } },
    select: { id: true, travelerId: true, originLabel: true, destinationLabel: true, contributionAmount: true },
  });
  const tripFixes = trips.flatMap((t) => {
    const fix = planTripFix(num(t.contributionAmount), floorForRoute(config, t), rate);
    return fix ? [{ ...t, from: num(t.contributionAmount), ...fix }] : [];
  });

  // 2) Réservations non payées
  const bookings = await prisma.booking.findMany({
    where: { status: { in: ["REQUESTED", "ACCEPTED"] } },
    select: {
      id: true, senderId: true, travelerId: true, totalAmount: true,
      parcel: { select: { weightKg: true, originLabel: true, destinationLabel: true } },
    },
  });
  const bookingFixes = bookings.flatMap((b) => {
    const band = bandForParcel(config, b.parcel);
    const fix = band ? planBookingFix(num(b.totalAmount), band, rate) : null;
    return band && fix ? [{ ...b, band, from: num(b.totalAmount), amounts: fix }] : [];
  });

  // 3) Prix proposés sur des colis
  const parcels = await prisma.parcel.findMany({
    where: { proposedAmount: { not: null } },
    select: { id: true, weightKg: true, originLabel: true, destinationLabel: true, proposedAmount: true },
  });
  const parcelFixes = parcels.filter((p) => {
    const band = bandForParcel(config, p);
    return band && p.proposedAmount !== null && proposedAmountIsBelowMinimum(num(p.proposedAmount), band);
  });

  if (apply) {
    for (const t of tripFixes) {
      await prisma.trip.update({ where: { id: t.id }, data: { contributionAmount: t.newContribution } });
    }
    for (const b of bookingFixes) {
      await prisma.$transaction([
        // Garde de statut : une réservation payée entre-temps n'est pas modifiée.
        prisma.booking.updateMany({
          where: { id: b.id, status: { in: ["REQUESTED", "ACCEPTED"] } },
          data: { ...b.amounts, negotiatedAmount: null },
        }),
        // Une offre en attente sous le minimum ne pourrait de toute façon pas être acceptée.
        prisma.priceOffer.updateMany({
          where: { bookingId: b.id, status: "PENDING", amount: { lt: b.band.minPrice } },
          data: { status: "WITHDRAWN", respondedAt: new Date() },
        }),
      ]);
    }
    if (parcelFixes.length > 0) {
      await prisma.parcel.updateMany({ where: { id: { in: parcelFixes.map((p) => p.id) } }, data: { proposedAmount: null } });
    }
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action: "ALIGN_PRICES",
        targetType: "PricingGrid",
        targetId: "singleton",
        details: { trips: tripFixes.length, bookings: bookingFixes.length, parcels: parcelFixes.length },
      },
    });

    // Prévenir les personnes concernées (au mieux : un échec de notification n'annule rien).
    for (const t of tripFixes) {
      await notifyUser(t.travelerId, "price_adjusted", `Le prix de votre trajet ${t.originLabel} → ${t.destinationLabel} a été relevé pour respecter le minimum Coliz (${formatEuro(t.newTotal)} tout compris).`).catch(() => {});
    }
    for (const b of bookingFixes) {
      const msg = `Le prix de votre réservation a été ajusté au minimum Coliz : ${formatEuro(b.amounts.totalAmount)} tout compris.`;
      await notifyUser(b.senderId, "price_adjusted", msg, { bookingId: b.id }).catch(() => {});
      await notifyUser(b.travelerId, "price_adjusted", msg, { bookingId: b.id }).catch(() => {});
    }
  }

  return {
    applied: apply,
    trips: { count: tripFixes.length, samples: tripFixes.slice(0, SAMPLE).map((t) => ({ route: `${t.originLabel} → ${t.destinationLabel}`, contributionFrom: t.from, contributionTo: t.newContribution, totalTo: t.newTotal })) },
    bookings: { count: bookingFixes.length, samples: bookingFixes.slice(0, SAMPLE).map((b) => ({ id: b.id, weightKg: b.parcel.weightKg, totalFrom: b.from, totalTo: b.amounts.totalAmount })) },
    parcels: { count: parcelFixes.length },
  };
}
