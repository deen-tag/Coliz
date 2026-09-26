"use client";

import { useEffect, useRef } from "react";

type Point = { lat: number; lng: number; label?: string };

// Mapbox GL est chargé depuis le CDN (pas de dépendance npm lourde) — s'il n'y a
// pas de token configuré, on affiche un simple encart neutre plutôt qu'une carte
// cassée : la liste de résultats reste la source d'information principale.
export function ResultsMap({ points }: { points: Point[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!token || !containerRef.current || points.length === 0) return;

    let map: any;
    let cancelled = false;

    async function load() {
      if (!(window as any).mapboxgl) {
        await Promise.all([
          loadScript("https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.js"),
          loadStyle("https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.css"),
        ]);
      }
      if (cancelled) return;
      const mapboxgl = (window as any).mapboxgl;
      mapboxgl.accessToken = token;

      map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [points[0].lng, points[0].lat],
        zoom: 4,
        interactive: true,
      });

      const bounds = new mapboxgl.LngLatBounds();
      points.forEach((p) => {
        new mapboxgl.Marker({ color: "#0B57D0" }).setLngLat([p.lng, p.lat]).addTo(map);
        bounds.extend([p.lng, p.lat]);
      });
      if (points.length > 1) map.fitBounds(bounds, { padding: 40, maxZoom: 8 });
    }

    load();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [token, points]);

  if (!token) {
    return (
      <div className="h-36 rounded-card bg-primary-light flex items-center justify-center text-sm text-primary/70 mb-4">
        Carte désactivée (aucune clé Mapbox configurée)
      </div>
    );
  }

  // Hauteur volontairement contenue : la carte illustre, elle ne remplace pas la liste.
  return <div ref={containerRef} className="h-40 rounded-card overflow-hidden mb-4 border border-black/5" />;
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function loadStyle(href: string) {
  return new Promise<void>((resolve) => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    l.onload = () => resolve();
    document.head.appendChild(l);
  });
}
