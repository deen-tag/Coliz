"use client";

import { useEffect, useRef, useState } from "react";

type LngLat = [number, number];
type Place = { label: string; lat: number; lng: number };
type Route = { from: Place; to: Place };
type RealRoute = Route & { count: number };
type City = { label: string; c: LngLat; w: number };

const BLUE = "#2457FF";
const WARM = "#F8F7F3";
const LAND = "#FBFAF6";
const WATER = "#CFE0FF";
const BORDER = "#C5D2EE";
const INK = "#0E1A3A";

const BACKDROP_OPACITY = 0.3;
// Latitude de la vue de départ : l'Europe et New York tiennent dans le même cadre.
const LAT = 28;
// Vue d'ensemble : seulement les routes les plus actives. Les autres apparaissent au zoom.
const MAJOR_COUNT = 30;
const DETAIL_ZOOM = 0.8;
const MAX_EXTRA_ZOOM = 4.5;

// Grandes routes de fond (France, Maghreb, Europe, monde) : affichées en bleu très pâle,
// pour que le globe ne soit jamais vide. Aucun chiffre.
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

const cityKey = (p: Place) => `${p.lat.toFixed(1)}|${p.lng.toFixed(1)}`;

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

// w = épaisseur de l'arc. Une route très active est plus épaisse (échelle en racine carrée
// pour qu'une seule grosse route n'écrase pas toutes les autres). Rien n'est affiché en chiffres.
function linesOf(routes: Route[], widthOf: (r: Route) => number) {
  return {
    type: "FeatureCollection" as const,
    features: routes.map((r) => ({
      type: "Feature" as const,
      properties: { w: widthOf(r) },
      geometry: { type: "LineString" as const, coordinates: greatCircle([r.from.lng, r.from.lat], [r.to.lng, r.to.lat]) },
    })),
  };
}

function pointsOf(routes: Route[]) {
  const seen = new Map<string, LngLat>();
  routes.forEach((r) => {
    seen.set(cityKey(r.from), [r.from.lng, r.from.lat]);
    seen.set(cityKey(r.to), [r.to.lng, r.to.lat]);
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

// Noms des villes : rank = -poids, donc les villes les plus actives sont placées en premier
// et Mapbox masque seul les noms qui se chevauchent.
function labelsOf(cities: Map<string, City>) {
  return {
    type: "FeatureCollection" as const,
    features: Array.from(cities.values()).map((v) => ({
      type: "Feature" as const,
      properties: { label: v.label, rank: -v.w },
      geometry: { type: "Point" as const, coordinates: v.c },
    })),
  };
}

type Controls = { zoomBy: (d: number) => void; reset: () => void };

// Globe d'accueil : chaque trajet réservable ajoute un arc. Mapbox n'est chargé que
// lorsque la section arrive à l'écran (un visiteur qui ne descend pas ne coûte rien).
export function RoutesGlobe() {
  const sectionRef = useRef<HTMLElement>(null);
  const gestureRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const controls = useRef<Controls | null>(null);
  const [near, setNear] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [zoomed, setZoomed] = useState(false);
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
    if (!near || !token || !mapRef.current || !gestureRef.current) return;

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

        let real: RealRoute[] = [];
        try {
          const res = await fetch("/api/routes/globe");
          if (res.ok) {
            const data = await res.json();
            real = (data.routes ?? []).map((r: any) => ({ ...r, count: Number(r.count) || 1 }));
          }
        } catch {
          // Pas de vrais trajets lisibles : le globe affiche ses routes de fond.
        }
        if (cancelled || !mapRef.current || !gestureRef.current) return;

        // Routes principales (toujours visibles) et routes de détail (au zoom).
        const sorted = [...real].sort((a, b) => b.count - a.count);
        const major = sorted.slice(0, MAJOR_COUNT);
        const minor = sorted.slice(MAJOR_COUNT);
        const maxCount = Math.max(1, ...sorted.map((r) => r.count));
        const widthOf = (r: Route) => 1.4 + 2.6 * Math.sqrt(((r as RealRoute).count ?? 0) / maxCount);

        const realKeys = new Set(real.map(routeKey));
        const backdrop = BACKDROP.filter((r) => !realKeys.has(routeKey(r)));

        // Poids d'une ville = nombre de trajets qui la touchent.
        const weight = new Map<string, number>();
        sorted.forEach((r) =>
          [r.from, r.to].forEach((p) => weight.set(cityKey(p), (weight.get(cityKey(p)) ?? 0) + r.count))
        );
        const collect = (routes: Route[], into: Map<string, City>) =>
          routes.forEach((r) =>
            [r.from, r.to].forEach((p) => {
              const k = cityKey(p);
              if (!into.has(k)) into.set(k, { label: p.label, c: [p.lng, p.lat], w: weight.get(k) ?? 0 });
            })
          );
        const majorCities = new Map<string, City>();
        collect(major, majorCities);
        collect(backdrop, majorCities);
        const minorCities = new Map<string, City>();
        collect(minor, minorCities);
        minorCities.forEach((_, k) => {
          if (majorCities.has(k)) minorCities.delete(k);
        });

        // Le globe doit tenir entier dans le carré : on règle le zoom sur la largeur réelle.
        const w = mapRef.current.clientWidth || 340;
        const base = Math.max(0.4, Math.log2((0.9 * w * Math.PI * Math.cos((LAT * Math.PI) / 180)) / 512));
        const maxZ = base + MAX_EXTRA_ZOOM;
        const detailZ = base + DETAIL_ZOOM;

        map = new mapboxgl.Map({
          container: mapRef.current,
          style: "mapbox://styles/mapbox/light-v11",
          projection: "globe",
          center: [0, LAT],
          zoom: base,
          // Les gestes sont gérés plus bas : un glissement vertical continue de faire
          // défiler la page sur mobile, et la molette ne zoome pas la carte par accident.
          interactive: false,
          attributionControl: false,
        });
        map.addControl(new mapboxgl.AttributionControl({ compact: true }));

        map.on("style.load", () => {
          map.setFog({ color: "#EAF0FF", "high-color": "#EAF0FF", "space-color": WARM, "horizon-blend": 0.04, "star-intensity": 0 });
          // Aux couleurs de Coliz : terres blanc chaud, océans bleu clair, frontières très
          // discrètes. Les noms du fond de carte sont masqués (les nôtres sont ajoutés plus bas).
          map.getStyle().layers?.forEach((l: any) => {
            try {
              if (l.type === "background") {
                map.setPaintProperty(l.id, "background-color", LAND);
              } else if (l.id === "water") {
                map.setPaintProperty(l.id, "fill-color", WATER);
              } else if (l.type === "line" && /admin/.test(l.id)) {
                map.setPaintProperty(l.id, "line-color", BORDER);
                map.setPaintProperty(l.id, "line-opacity", 0.8);
              } else {
                map.setLayoutProperty(l.id, "visibility", "none");
              }
            } catch {
              // Un calque que le style ne laisse pas modifier : on l'ignore.
            }
          });

          const dotRadius = (small: number, big: number) => ["interpolate", ["linear"], ["zoom"], base, small, maxZ, big];
          const lineLayer = (id: string, data: any, paint: any, minzoom?: number) => {
            map.addSource(id, { type: "geojson", data });
            map.addLayer({ id, type: "line", source: id, ...(minzoom ? { minzoom } : {}), layout: { "line-cap": "round" }, paint });
          };
          const pointLayer = (id: string, data: any, paint: any, minzoom?: number) => {
            map.addSource(id, { type: "geojson", data });
            map.addLayer({ id, type: "circle", source: id, ...(minzoom ? { minzoom } : {}), paint });
          };

          if (backdrop.length > 0) {
            lineLayer("backdrop-lines", linesOf(backdrop, () => 1.5), { "line-color": BLUE, "line-width": 1.5, "line-opacity": BACKDROP_OPACITY });
            pointLayer("backdrop-points", pointsOf(backdrop), { "circle-radius": dotRadius(2.2, 4), "circle-color": BLUE, "circle-opacity": BACKDROP_OPACITY });
          }

          const realPaint = { "line-color": BLUE, "line-width": ["get", "w"], "line-opacity": 0.85 };
          const dotPaint = { "circle-radius": dotRadius(2.8, 5), "circle-color": BLUE, "circle-stroke-color": "#fff", "circle-stroke-width": 1.2 };
          if (minor.length > 0) {
            lineLayer("minor-lines", linesOf(minor, widthOf), realPaint, detailZ);
            pointLayer("minor-points", pointsOf(minor), dotPaint, detailZ);
          }
          if (major.length > 0) {
            lineLayer("major-lines", linesOf(major, widthOf), realPaint);
            pointLayer("major-points", pointsOf(major), dotPaint);
          }

          const labelLayer = (id: string, cities: Map<string, City>, minzoom?: number) => {
            if (cities.size === 0) return;
            map.addSource(id, { type: "geojson", data: labelsOf(cities) });
            map.addLayer({
              id,
              type: "symbol",
              source: id,
              ...(minzoom ? { minzoom } : {}),
              layout: {
                "text-field": ["get", "label"],
                "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
                "text-size": 11,
                "text-anchor": "top",
                "text-offset": [0, 0.7],
                "symbol-sort-key": ["get", "rank"],
              },
              paint: {
                "text-color": INK,
                "text-halo-color": "#FFFFFF",
                "text-halo-width": 1.5,
                "text-opacity": ["case", ["==", ["get", "rank"], 0], 0.75, 1],
              },
            });
          };
          labelLayer("labels-minor", minorCities, detailZ);
          labelLayer("labels-major", majorCities);

          if (!cancelled) setReady(true);
        });

        // --- Gestes : un doigt tourne le globe (à plat) ou le déplace (zoomé), deux doigts zooment.
        const el = gestureRef.current as HTMLDivElement;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let lng = 0;
        let lat = LAT;
        let z = base;
        let isZoomed = false;
        let dragging = false;
        let pausedUntil = 0;
        let lastX = 0;
        let lastY = 0;
        let pinchDist = 1;
        let pinchZ = base;
        const pts = new Map<number, { x: number; y: number }>();

        const wrap = (v: number) => ((((v + 180) % 360) + 360) % 360) - 180;
        const clampZ = (v: number) => Math.min(maxZ, Math.max(base, v));
        const degPerPx = () => 360 / (512 * 2 ** z);

        // Zoomé, le conteneur capte aussi les glissements verticaux (déplacer la carte) ;
        // à plat, ils servent à faire défiler la page.
        const syncUi = () => {
          const nowZoomed = z > base + 0.05;
          el.style.touchAction = nowZoomed ? "none" : "pan-y";
          el.style.cursor = nowZoomed ? "move" : "grab";
          if (nowZoomed !== isZoomed) {
            isZoomed = nowZoomed;
            if (!cancelled) setZoomed(nowZoomed);
          }
        };
        const apply = () => {
          map.jumpTo({ center: [wrap(lng), lat], zoom: z });
          syncUi();
        };
        const ease = () => {
          pausedUntil = performance.now() + 2500;
          map.easeTo({ center: [wrap(lng), lat], zoom: z, duration: 350 });
          syncUi();
        };

        const onDown = (e: PointerEvent) => {
          pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
          try { el.setPointerCapture(e.pointerId); } catch {}
          dragging = true;
          if (pts.size === 1) {
            lastX = e.clientX;
            lastY = e.clientY;
          } else if (pts.size === 2) {
            const [a, b] = Array.from(pts.values());
            pinchDist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
            pinchZ = z;
          }
        };
        const onMove = (e: PointerEvent) => {
          if (!pts.has(e.pointerId)) return;
          pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pts.size >= 2) {
            const [a, b] = Array.from(pts.values());
            const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
            z = clampZ(pinchZ + Math.log2(d / pinchDist));
            apply();
            return;
          }
          const dx = e.clientX - lastX;
          const dy = e.clientY - lastY;
          lastX = e.clientX;
          lastY = e.clientY;
          lng -= dx * degPerPx();
          // La latitude ne bouge que zoomé : à plat, on ne fait que tourner autour de l'axe.
          if (isZoomed) lat = Math.max(-60, Math.min(70, lat + dy * degPerPx() * Math.cos((lat * Math.PI) / 180)));
          apply();
        };
        const onUp = (e: PointerEvent) => {
          pts.delete(e.pointerId);
          if (pts.size === 1) {
            const p = Array.from(pts.values())[0];
            lastX = p.x;
            lastY = p.y;
          }
          if (pts.size === 0) {
            dragging = false;
            pausedUntil = performance.now() + 2500;
          }
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

        controls.current = {
          zoomBy: (d: number) => {
            z = clampZ(z + d);
            ease();
          },
          reset: () => {
            z = base;
            lat = LAT;
            ease();
          },
        };

        // Rotation lente : seulement en vue d'ensemble, section visible, sans doigt posé.
        // Dès qu'on zoome, elle s'arrête ; elle reprend si l'on revient à la vue d'ensemble.
        if (!reduce) {
          let last = performance.now();
          const tick = (now: number) => {
            const dt = now - last;
            last = now;
            if (inView.current && !dragging && now > pausedUntil && z <= base + 0.05) {
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
      controls.current = null;
      map?.remove();
    };
  }, [near, token]);

  // Sans clé Mapbox (ou si Mapbox échoue), la section n'apparaît tout simplement pas.
  if (!token || failed) return null;

  const btn =
    "w-10 h-10 rounded-full bg-surface border border-line shadow-card text-ink text-xl leading-none flex items-center justify-center active:bg-sender-light";

  return (
    <section ref={sectionRef} className="max-w-2xl mx-auto px-5 pt-14">
      <h2 className="text-[28px] leading-[1.1] font-extrabold tracking-tight text-ink">Des trajets dans toute la France et le monde</h2>
      <p className="text-ink-muted mt-2">Les routes sur lesquelles des colis peuvent voyager.</p>
      <div className="relative mt-4 mx-auto w-full max-w-md aspect-square">
        <div
          ref={gestureRef}
          role="img"
          aria-label="Globe montrant les routes entre les villes desservies par Coliz"
          className="absolute inset-0 touch-pan-y cursor-grab select-none"
        >
          <div ref={mapRef} className="w-full h-full" />
        </div>
        {ready && (
          <>
            <div className="absolute top-2 right-2 flex flex-col gap-2">
              <button type="button" aria-label="Zoomer" className={btn} onClick={() => controls.current?.zoomBy(0.9)}>+</button>
              <button type="button" aria-label="Dézoomer" className={btn} onClick={() => controls.current?.zoomBy(-0.9)}>−</button>
            </div>
            {zoomed && (
              <button
                type="button"
                onClick={() => controls.current?.reset()}
                className="absolute top-2 left-2 h-10 px-4 rounded-full bg-surface border border-line shadow-card text-ink text-[13px] font-bold active:bg-sender-light"
              >
                Vue d&apos;ensemble
              </button>
            )}
          </>
        )}
      </div>
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
