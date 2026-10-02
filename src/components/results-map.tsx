"use client";

import { useEffect, useRef } from "react";

type Point = { lat: number; lng: number; label?: string };

// Mêmes teintes que le globe de l'accueil (routes-globe.tsx).
const BRAND = "#1B5E6E";
const LAND = "#FCFAF7";
const WATER = "#D3E4E8";
const PARK = "#E9EEE6";
const BUILDING = "#EFEBE3";

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
      if (!(window as any).MapboxLanguage) {
        try {
          await loadScript("https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-language/v1.0.0/mapbox-gl-language.js");
        } catch {
          // Le plugin de langue est un bonus (traduction des noms de pays/villes) :
          // s'il ne charge pas, la carte doit s'afficher quand même.
        }
      }
      if (cancelled) return;
      const mapboxgl = (window as any).mapboxgl;
      mapboxgl.accessToken = token;

      map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [points[0].lng, points[0].lat],
        zoom: 4,
        interactive: true,
      });

      // Aux couleurs de Coliz : terres blanc chaud, eau bleu pétrole très clair, parcs en vert
      // sauge pâle. Les routes et les noms de lieux restent ceux de Mapbox (utiles pour se repérer).
      map.on("style.load", () => {
        map.getStyle().layers?.forEach((l: any) => {
          try {
            if (l.type === "background") {
              map.setPaintProperty(l.id, "background-color", LAND);
            } else if (l.type === "fill" && l.id === "water") {
              map.setPaintProperty(l.id, "fill-color", WATER);
            } else if (l.type === "line" && /waterway/.test(l.id)) {
              map.setPaintProperty(l.id, "line-color", WATER);
            } else if (l.type === "fill" && /park|landuse|landcover|pitch|golf|grass|wood|scrub/.test(l.id)) {
              map.setPaintProperty(l.id, "fill-color", PARK);
            } else if (l.type === "fill" && /building/.test(l.id)) {
              map.setPaintProperty(l.id, "fill-color", BUILDING);
            }
          } catch {
            // Un calque que le style ne laisse pas modifier : on garde sa couleur d'origine.
          }
        });
      });

      // Affiche les noms de pays/villes dans la langue du navigateur de chaque
      // visiteur (détection automatique, pas de langue figée en dur).
      const MapboxLanguage = (window as any).MapboxLanguage;
      if (MapboxLanguage) {
        map.addControl(new MapboxLanguage());
      }

      const bounds = new mapboxgl.LngLatBounds();
      points.forEach((p) => {
        new mapboxgl.Marker({ color: BRAND }).setLngLat([p.lng, p.lat]).addTo(map);
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
  return <div ref={containerRef} className="h-40 rounded-card overflow-hidden mb-4 border border-line" />;
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
