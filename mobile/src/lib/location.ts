import * as Location from "expo-location";
import { api } from "./api";
import type { CityChoice } from "./types";

// Suggestions de villes : on utilise d'abord votre route /api/geocode (Mapbox, clé gardée côté serveur).
// Si elle ne renvoie rien (pas de clé Mapbox configurée), on se rabat sur le géocodeur du téléphone.
export async function searchCities(q: string): Promise<CityChoice[]> {
  const query = q.trim();
  if (query.length < 2) return [];
  try {
    const res = await api<CityChoice[]>("/api/geocode", { query: { q: query }, auth: false, timeoutMs: 8000 });
    if (res.length) return res;
  } catch {
    /* on essaie le repli local */
  }
  try {
    const found = await Location.geocodeAsync(query);
    const out: CityChoice[] = [];
    for (const f of found.slice(0, 3)) {
      const [place] = await Location.reverseGeocodeAsync({ latitude: f.latitude, longitude: f.longitude }).catch(() => []);
      const label = place
        ? [place.city ?? place.subregion ?? place.name, place.region, place.country].filter(Boolean).join(", ")
        : query;
      out.push({ label, lat: f.latitude, lng: f.longitude });
    }
    return out;
  } catch {
    return [];
  }
}

export class LocationDenied extends Error {}

// Position actuelle -> ville (pour « Utiliser ma position »).
export async function currentCity(): Promise<CityChoice> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== "granted") throw new LocationDenied();
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const [place] = await Location.reverseGeocodeAsync(pos.coords);
  const label = place
    ? [place.city ?? place.subregion ?? place.name, place.region, place.country].filter(Boolean).join(", ")
    : "Ma position";
  return { label, lat: pos.coords.latitude, lng: pos.coords.longitude };
}
