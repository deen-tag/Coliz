import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  if (!query || query.length < 2) return NextResponse.json([]);

  const token = process.env.MAPBOX_TOKEN;
  if (!token) {
    // Pas de clé configurée : on ne bloque pas le formulaire, on renvoie juste
    // aucune suggestion (l'utilisateur peut toujours saisir le texte librement).
    return NextResponse.json([]);
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?types=place&language=fr&limit=6&access_token=${token}`;
  const res = await fetch(url);
  if (!res.ok) return NextResponse.json([]);

  const data = await res.json();
  const suggestions = (data.features ?? []).map((f: any) => ({
    label: f.place_name,
    lat: f.center[1],
    lng: f.center[0],
  }));

  return NextResponse.json(suggestions);
}
