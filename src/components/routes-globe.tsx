"use client";

import { useEffect, useRef, useState } from "react";

type LngLat = [number, number];
type Route = { from: { label: string; lat: number; lng: number }; to: { label: string; lat: number; lng: number } };

const BLUE = "#2457FF";
const WARM = "#F8F7F3";

// Grandes routes de fond (France, Maghreb, Europe, New York) : affichées en bleu très pâle
// tant qu'il y a peu de vrais trajets, pour que le globe ne soit jamais vide. Aucun chiffre.
const BACKDROP: Route[] = [
  [["Paris", 48.86, 2.35], ["Alger", 36.75, 3.06]],
  [["Paris", 48.86, 2.35], ["Casablanca", 33.57, -7.59]],
  [["Paris", 48.86, 2.35], ["Tunis", 36.81, 10.18]],
  [["Marseille", 43.3, 5.37], ["Alger", 36.75, 3.06]],
  [["Lyon", 45.76, 4.84], ["Casablanca", 33.57, -7.59]],
  [["Marseille", 43.3, 5.37], ["Tunis", 36.81, 10.18]],
  [["Paris", 48.86, 2.35], ["Madrid", 40.42, -3.7]],
  [["Paris", 48.86, 2.35], ["Londres", 51.51, -0.13]],
  [["Paris", 48.86, 2.35], ["New York", 40.71, -74.01]],
  [["Paris", 48.86, 2.35], ["Dakar", 14.69, -17.45]],
  [["Paris", 48.86, 2.35], ["Abidjan", 5.36, -4.0]],
  [["Paris", 48.86, 2.35], ["Istanbul", 41.01, 28.98]],
  [["Paris", 48.86, 2.35], ["Dubaï", 25.2, 55.27]],
  [["Paris", 48.86, 2.35], ["Montréal", 45.5, -73.57]],
  [["Londres", 51.51, -0.13], ["New York", 40.71, -74.01]],
].map(([a, b]) => ({
  from: { label: a[0] as string, lat: a[1] as number, lng: a[2] as number },
  to: { label: b[0] as string, lat: b[1] as number, lng: b[2] as number },
}));

const BACKDROP_OPACITY = 0.3;
const LAT = 20;

// Une route de fond s'efface dès qu'un vrai trajet relie les deux mêmes villes ;
// les autres restent, donc le globe n'est jamais vide hors d'Europe.
function routeKey(r: Route) {
  const a = `${r.from.lat.toFixed(0)}|${r.from.lng.toFixed(0)}`;
  const b = `${r.to.lat.toFixed(0)}|${r.to.lng.toFixed(0)}`;
  return [a, b].sort().join(">");
}

// Arc de grand cercle entre deux villes (Mapbox trace en ligne droite sinon, ce qui
// donne des traits plats sur un globe).
function greatCircle(a: LngLat, b: LngLat, steps = 48): LngLat[] {
  const rad = Math.PI / 180;
  const [lng1, lat1] = [a[0] * rad, a[1] * rad];
  const [lng2, lat2] = [b[0] * rad, b[1] * rad];
  const v1 = [Math.cos(lat1) * Math.cos(lng1), Math.cos(lat1) * Math.sin(lng1), Math.sin(lat1)];
  const v2 = [Math.cos(lat2) * Math.cos(lng2), Math.cos(lat2) * Math.sin(lng2), Math.sin(lat2)];
  const dot = Math.min(1, Math.max(-1, v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]));
  const d = Math.acos(dot);
  if (d < 1e-6) return [a, b];

  const out: LngLat[] = [];
  let prevLng = a[0];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * v1[0] + B * v2[0];
    const y = A * v1[1] + B * v2[1];
    const z = A * v1[2] + B * v2[2];
    let lng = Math.atan2(y, x) / rad;
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) / rad;
    // Évite le grand saut de ±360° quand un arc passe le méridien opposé.
    while (lng - prevLng > 180) lng -= 360;
    while (lng - prevLng < -180) lng += 360;
    prevLng = lng;
    out.push([lng, lat]);
  }
  return out;
}

function linesOf(routes: Route[]) {
  return {
    type: "FeatureCollection" as const,
    features: routes.map((r) => ({
      type: "Feature" as const,
      properties: {},
      geometry: { type: "LineString" as const, coordinates: greatCircle([r.from.lng, r.from.lat], [r.to.lng, r.to.lat]) },
    })),
  };
}

function pointsOf(routes: Route[]) {
  const seen = new Map<string, LngLat>();
  routes.forEach((r) => {
    seen.set(`${r.from.lat.toFixed(1)}|${r.from.lng.toFixed(1)}`, [r.from.lng, r.from.lat]);
    seen.set(`${r.to.lat.toFixed(1)}|${r.to.lng.toFixed(1)}`, [r.to.lng, r.to.lat]);
  });
  return {
    type: "FeatureCollection" as const,
    features: Array.from(seen.values()).map((c) => ({
      type: "Feature" as const,
      properties: {},
      geometry: { type: "Point" as const, coordinates: c },
    })),
  };
}

// Globe d'accueil : chaque trajet réservable ajoute un arc. Mapbox n'est chargé que
// lorsque la section arrive à l'écran (un visiteur qui ne descend pas ne coûte rien).
export function RoutesGlobe() {
  const sectionRef = useRef<HTMLElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [failed, setFailed] = useState(false);
  const inView = useRef(false);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || !token) return;
    const io = new IntersectionObserver(
      ([e]) => {
        inView.current = e.isIntersecting;
        if (e.isIntersecting) setNear(true);
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [token]);

  useEffect(() => {
    if (!near || !token || !mapRef.current) return;

    let map: any;
    let raf = 0;
    let cancelled = false;
    let removeListeners: () => void = () => {};

    async function start() {
      try {
        if (!(window as any).mapboxgl) {
          await Promise.all([
            loadScript("https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.js"),
            loadStyle("https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.css"),
          ]);
        }
        if (cancelled || !mapRef.current) return;
        const mapboxgl = (window as any).mapboxgl;
        mapboxgl.accessToken = token;

        let real: Route[] = [];
        try {
          const res = await fetch("/api/routes/globe");
          if (res.ok) real = (await res.json()).routes ?? [];
        } catch {
          // Pas de vrais trajets lisibles : le globe affiche ses routes de fond.
        }
        if (cancelled || !mapRef.current) return;

        const realKeys = new Set(real.map(routeKey));
        const backdrop = BACKDROP.filter((r) => !realKeys.has(routeKey(r)));

        // Le globe doit tenir entier dans le carré : on règle le zoom sur la largeur réelle.
        const w = mapRef.current.clientWidth || 340;
        const zoom = Math.max(0.4, Math.log2((0.9 * w * Math.PI * Math.cos((LAT * Math.PI) / 180)) / 512));

        map = new mapboxgl.Map({
          container: mapRef.current,
          style: "mapbox://styles/mapbox/light-v11",
          projection: "globe",
          center: [10, LAT],
          zoom,
          // Mapbox ne gère pas les gestes : on tourne le globe nous-mêmes (voir plus bas),
          // pour qu'un glissement vertical continue de faire défiler la page sur mobile.
          interactive: false,
          attributionControl: false,
        });
        map.addControl(new mapboxgl.AttributionControl({ compact: true }));

        map.on("style.load", () => {
          map.setFog({ color: "#EAF0FF", "high-color": "#EAF0FF", "space-color": WARM, "horizon-blend": 0.04, "star-intensity": 0 });
          // Fond épuré : aucun nom de pays, de ville ou de route, seulement la terre et les arcs.
          map.getStyle().layers?.forEach((l: any) => {
            if (l.type === "symbol") map.setLayoutProperty(l.id, "visibility", "none");
          });

          if (backdrop.length > 0) {
            map.addSource("backdrop-lines", { type: "geojson", data: linesOf(backdrop) });
            map.addLayer({ id: "backdrop-lines", type: "line", source: "backdrop-lines", layout: { "line-cap": "round" }, paint: { "line-color": BLUE, "line-width": 1.5, "line-opacity": BACKDROP_OPACITY } });
            map.addSource("backdrop-points", { type: "geojson", data: pointsOf(backdrop) });
            map.addLayer({ id: "backdrop-points", type: "circle", source: "backdrop-points", paint: { "circle-radius": 2.5, "circle-color": BLUE, "circle-opacity": BACKDROP_OPACITY } });
          }
          if (real.length > 0) {
            map.addSource("real-lines", { type: "geojson", data: linesOf(real) });
            map.addLayer({ id: "real-lines", type: "line", source: "real-lines", layout: { "line-cap": "round" }, paint: { "line-color": BLUE, "line-width": 2, "line-opacity": 0.85 } });
            map.addSource("real-points", { type: "geojson", data: pointsOf(real) });
            map.addLayer({ id: "real-points", type: "circle", source: "real-points", paint: { "circle-radius": 3.5, "circle-color": BLUE, "circle-stroke-color": "#fff", "circle-stroke-width": 1.5 } });
          }
        });

        // Rotation lente, mise en pause quand la section n'est pas à l'écran, pendant un
        // glissement, ou si la personne a demandé moins d'animations.
        const el = mapRef.current as HTMLDivElement;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let lng = 10;
        let dragging = false;
        let lastX = 0;
        let pausedUntil = 0;
        const degPerPx = 57.3 / (0.46 * w);
        const apply = () => map.setCenter([((lng + 540) % 360) - 180, LAT]);

        const onDown = (e: PointerEvent) => {
          dragging = true;
          lastX = e.clientX;
          try { el.setPointerCapture(e.pointerId); } catch {}
        };
        const onMove = (e: PointerEvent) => {
          if (!dragging) return;
          lng -= (e.clientX - lastX) * degPerPx;
          lastX = e.clientX;
          apply();
        };
        const onUp = () => {
          dragging = false;
          pausedUntil = performance.now() + 2500;
        };
        el.addEventListener("pointerdown", onDown);
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerup", onUp);
        el.addEventListener("pointercancel", onUp);
        removeListeners = () => {
          el.removeEventListener("pointerdown", onDown);
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerup", onUp);
          el.removeEventListener("pointercancel", onUp);
        };

        if (!reduce) {
          let last = performance.now();
          const tick = (now: number) => {
            const dt = now - last;
            last = now;
            if (inView.current && !dragging && now > pausedUntil) {
              lng += dt * 0.006;
              apply();
            }
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        }
      } catch {
        // Mapbox n'a pas pu charger : on retire la section plutôt que d'afficher un trou.
        if (!cancelled) setFailed(true);
      }
    }

    start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      removeListeners();
      map?.remove();
    };
  }, [near, token]);

  // Sans clé Mapbox (ou si Mapbox échoue), la section n'apparaît tout simplement pas.
  if (!token || failed) return null;

  return (
    <section ref={sectionRef} className="max-w-2xl mx-auto px-5 pt-14">
      <h2 className="text-[28px] leading-[1.1] font-extrabold tracking-tight text-ink">Des trajets dans toute la France et le monde</h2>
      <p className="text-ink-muted mt-2">Les routes sur lesquelles des colis peuvent voyager.</p>
      <div
        ref={mapRef}
        role="img"
        aria-label="Globe montrant les routes entre les villes desservies par Coliz"
        className="mt-4 mx-auto w-full max-w-md aspect-square touch-pan-y cursor-grab select-none"
      />
    </section>
  );
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
