// Distance à vol d'oiseau (km) — utilisée pour la proximité origine/destination.
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// Vérifie que le colis rentre dans la capacité déclarée (ordre simple, sans rotation 3D).
export function fitsDimensions(
  parcel: { lengthCm: number; widthCm: number; heightCm: number },
  capacity: { capacityLengthCm: number; capacityWidthCm: number; capacityHeightCm: number }
) {
  return (
    parcel.lengthCm <= capacity.capacityLengthCm &&
    parcel.widthCm <= capacity.capacityWidthCm &&
    parcel.heightCm <= capacity.capacityHeightCm
  );
}

// Score "best_match" : plus c'est bas, mieux c'est (distance en km + pénalité de jours d'écart).
export function computeMatchScore(distanceOriginKm: number, distanceDestinationKm: number, daysFromDesiredDate: number) {
  return distanceOriginKm + distanceDestinationKm + daysFromDesiredDate * 20;
}
