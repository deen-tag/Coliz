"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { TransportMode } from "@prisma/client";
import { TransportModeBadge } from "@/components/ui";

type LngLat = [number, number];
type Place = { label: string; lat: number; lng: number };
type Route = { from: Place; to: Place };
type RealRoute = Route & { count: number; mode?: string };
// Un départ réel : « de from vers to » avec son moyen de transport (sert aux cartes sous le globe).
type Dep = { from: string; to: string; mode: string; count: number };
type Picked = { label: string; deps: Dep[] };
type Link_ = Route & { count: number; real: boolean };
type CityInfo = { key: string; label: string; c: LngLat; w: number; real: boolean };

const BLUE = "#1B5E6E";
const WARM = "#FAF8F4";
const LAND = "#FCFAF7";
const WATER = "#D3E4E8";
const BORDER = "#CBD8DA";
const INK = "#14262D";

// Latitude de la vue de départ : l'Europe et New York tiennent dans le même cadre.
const LAT = 28;
const MAX_EXTRA_ZOOM = 4.5;
// Marge autour d'une ville pour la toucher au doigt (le point seul est trop petit à viser).
const TAP_RADIUS = 24;

const cityKey = (p: Place) => `${p.lat.toFixed(1)}|${p.lng.toFixed(1)}`;

// Empreinte stable d'un texte : sert à choisir, une fois pour toutes, de quel côté une route se courbe.
function hashOf(text: string) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h;
}

// Courbe légèrement l'arc : sans ça, Bruxelles-Madrid passe presque en ligne droite par Paris
// et se confond avec Paris-Madrid. La courbure grandit avec la longueur de la route, et le côté
// est fixé par la paire de villes (même courbe dans les deux sens), donc les routes qui partent
// d'une même ville s'écartent en éventail au lieu de se superposer. Les extrémités ne bougent pas.
function bend(pts: LngLat[], a: LngLat, b: LngLat): LngLat[] {
  const dx = pts[pts.length - 1][0] - pts[0][0];
  const dy = pts[pts.length - 1][1] - pts[0][1];
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return pts;

  const ka = `${a[1].toFixed(1)}|${a[0].toFixed(1)}`;
  const kb = `${b[1].toFixed(1)}|${b[0].toFixed(1)}`;
  const forward = ka < kb;
  const h = hashOf(forward ? `${ka}>${kb}` : `${kb}>${ka}`);
  const side = (h % 2 === 0 ? 1 : -1) * (forward ? 1 : -1);
  const curve = 0.14 + 0.08 * (((h >>> 1) % 3) / 2);
  const nx = -dy / len;
  const ny = dx / len;

  return pts.map((p, i) => {
    const off = side * curve * len * Math.sin((Math.PI * i) / (pts.length - 1));
    return [p[0] + nx * off, Math.max(-85, Math.min(85, p[1] + ny * off))] as LngLat;
  });
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
  return bend(out, a, b);
}

// Les arcs d'une ville : w = épaisseur (une route très active est plus épaisse, échelle en
// racine carrée), o = opacité. Aucun chiffre n'est affiché.
function linesOf(routes: Route[], propsOf: (r: Route) => { w: number; o: number }) {
  return {
    type: "FeatureCollection" as const,
    features: routes.map((r) => ({
      type: "Feature" as const,
      properties: propsOf(r),
      geometry: { type: "LineString" as const, coordinates: greatCircle([r.from.lng, r.from.lat], [r.to.lng, r.to.lat]) },
    })),
  };
}

const EMPTY = { type: "FeatureCollection" as const, features: [] as any[] };

// Distance angulaire (en degrés) entre deux points du globe : sert à ignorer les villes
// qui sont sur la face cachée.
function angleBetween(a: LngLat, b: LngLat) {
  const rad = Math.PI / 180;
  const c =
    Math.sin(a[1] * rad) * Math.sin(b[1] * rad) +
    Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.cos((a[0] - b[0]) * rad);
  return Math.acos(Math.min(1, Math.max(-1, c))) / rad;
}

type Controls = { zoomBy: (d: number) => void; reset: () => void };

// Globe d'accueil : aucune ligne au repos, seulement le nom des villes. Toucher une ville
// affiche toutes ses routes ; le reste s'estompe. Mapbox n'est chargé que lorsque la section
// arrive à l'écran (un visiteur qui ne descend pas ne coûte rien).
export function RoutesGlobe() {
  const sectionRef = useRef<HTMLElement>(null);
  const gestureRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const controls = useRef<Controls | null>(null);
  const [near, setNear] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);
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
        // Départs réels par ville (sens du trajet respecté) : alimentent les cartes sous le globe.
        const departures = new Map<string, Dep[]>();
        try {
          const res = await fetch("/api/routes/globe");
          if (res.ok) {
            const data = await res.json();
            const list: RealRoute[] = (data.routes ?? []).map((r: any) => ({ ...r, count: Number(r.count) || 1 }));
            list.forEach((r) => {
              const k = cityKey(r.from);
              const arr = departures.get(k) ?? [];
              arr.push({ from: r.from.label, to: r.to.label, mode: r.mode ?? "OTHER", count: r.count });
              departures.set(k, arr);
            });
            departures.forEach((arr) => arr.sort((a, b) => b.count - a.count));
            // Un seul arc par paire de villes, quel que soit le sens du trajet.
            const byPair = new Map<string, RealRoute>();
            list.forEach((r) => {
              const k = [cityKey(r.from), cityKey(r.to)].sort().join(">");
              const found = byPair.get(k);
              if (found) found.count += r.count;
              else byPair.set(k, { ...r });
            });
            real = Array.from(byPair.values());
          }
        } catch {
          // Lecture impossible : on traite comme « aucun trajet ».
        }
        if (cancelled || !mapRef.current || !gestureRef.current) return;
        // Sans aucun trajet, un globe vide ferait « site vide » : on masque la section.
        if (real.length === 0) {
          setFailed(true);
          return;
        }

        // Toutes les routes viennent de ta base (trajets de démo compris, traités comme de vrais trajets).
        const links: Link_[] = real.map((r) => ({ ...r, real: true }));

        // Les villes, avec leur poids (nombre de trajets qui les touchent) et leurs routes.
        const cities = new Map<string, CityInfo>();
        const byCity = new Map<string, number[]>();
        links.forEach((l, i) =>
          [l.from, l.to].forEach((p) => {
            const k = cityKey(p);
            let c = cities.get(k);
            if (!c) {
              c = { key: k, label: p.label, c: [p.lng, p.lat], w: 0, real: false };
              cities.set(k, c);
              byCity.set(k, []);
            }
            c.w += l.count;
            if (l.real) c.real = true;
            byCity.get(k)!.push(i);
          })
        );
        const maxW = Math.max(1, ...Array.from(cities.values()).map((c) => c.w));
        const cityFeatures = {
          type: "FeatureCollection" as const,
          features: Array.from(cities.values()).map((c) => ({
            type: "Feature" as const,
            properties: {
              key: c.key,
              label: c.label,
              // Les villes les plus actives passent en premier pour leur nom et ont un point plus gros.
              rank: -c.w,
              r: c.real ? 3 + 6 * Math.sqrt(c.w / maxW) : 3,
              real: c.real ? 1 : 0,
            },
            geometry: { type: "Point" as const, coordinates: c.c },
          })),
        };

        // Arcs de la ville choisie : toutes ses routes, sans limite.
        const arcsOf = (key: string) => {
          const mine = (byCity.get(key) ?? []).map((i) => links[i]);
          const maxLocal = Math.max(1, ...mine.map((l) => l.count));
          return linesOf(mine, (r) => {
            const l = r as Link_;
            return l.real ? { w: 1.4 + 2.6 * Math.sqrt(l.count / maxLocal), o: 0.9 } : { w: 1.5, o: 0.45 };
          });
        };

        // Le globe doit tenir entier dans le carré : on règle le zoom sur la largeur réelle.
        const w = mapRef.current.clientWidth || 340;
        const base = Math.max(0.4, Math.log2((0.9 * w * Math.PI * Math.cos((LAT * Math.PI) / 180)) / 512));
        const maxZ = base + MAX_EXTRA_ZOOM;

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

        const BASE_DOT_OPACITY = ["case", ["==", ["get", "real"], 1], 1, 0.55];
        const BASE_LABEL_OPACITY = ["case", ["==", ["get", "real"], 1], 1, 0.75];
        const BASE_STROKE = 1.2;

        map.on("style.load", () => {
          map.setFog({ color: "#E3EEF1", "high-color": "#E3EEF1", "space-color": WARM, "horizon-blend": 0.04, "star-intensity": 0 });
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

          // Les arcs de la ville choisie (vides au repos), sous les points.
          map.addSource("sel-lines", { type: "geojson", data: EMPTY });
          map.addLayer({
            id: "sel-lines",
            type: "line",
            source: "sel-lines",
            layout: { "line-cap": "round" },
            paint: {
              "line-color": BLUE,
              "line-width": ["interpolate", ["linear"], ["zoom"], base, ["get", "w"], maxZ, ["*", ["get", "w"], 0.5]],
              "line-opacity": ["get", "o"],
            },
          });

          map.addSource("cities", { type: "geojson", data: cityFeatures });
          map.addLayer({
            id: "city-dots",
            type: "circle",
            source: "cities",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], base, ["get", "r"], maxZ, ["*", ["get", "r"], 1.6]],
              "circle-color": BLUE,
              "circle-opacity": BASE_DOT_OPACITY,
              "circle-stroke-color": "#fff",
              "circle-stroke-width": BASE_STROKE,
            },
          });
          map.addLayer({
            id: "city-labels",
            type: "symbol",
            source: "cities",
            layout: {
              "text-field": ["get", "label"],
              "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
              "text-size": 11,
              "text-anchor": "top",
              "text-offset": [0, 0.9],
              "symbol-sort-key": ["get", "rank"],
            },
            paint: {
              "text-color": INK,
              "text-halo-color": "#FFFFFF",
              "text-halo-width": 1.5,
              "text-opacity": BASE_LABEL_OPACITY,
            },
          });

          if (!cancelled) setReady(true);
        });

        // --- Gestes : un doigt tourne le globe (à plat) ou le déplace (zoomé), deux doigts
        // zooment, un simple toucher choisit une ville.
        const el = gestureRef.current as HTMLDivElement;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let lng = 0;
        let lat = LAT;
        let z = base;
        let isZoomed = false;
        let selectedKey: string | null = null;
        let dragging = false;
        let pausedUntil = 0;
        let lastX = 0;
        let lastY = 0;
        let downX = 0;
        let downY = 0;
        let moved = false;
        let multi = false;
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
        const ease = (duration = 350) => {
          pausedUntil = performance.now() + 2500;
          map.easeTo({ center: [wrap(lng), lat], zoom: z, duration });
          syncUi();
        };

        // Choisit une ville (ou aucune) : ses arcs apparaissent, les autres villes s'estompent.
        const select = (key: string | null) => {
          if (!map.getLayer("city-dots")) return;
          selectedKey = key;
          if (!key) {
            map.getSource("sel-lines").setData(EMPTY);
            map.setPaintProperty("city-dots", "circle-opacity", BASE_DOT_OPACITY);
            map.setPaintProperty("city-dots", "circle-stroke-width", BASE_STROKE);
            map.setPaintProperty("city-labels", "text-opacity", BASE_LABEL_OPACITY);
            if (!cancelled) setPicked(null);
            return;
          }
          map.getSource("sel-lines").setData(arcsOf(key));
          const linked = new Set<string>([key]);
          (byCity.get(key) ?? []).forEach((i) => {
            linked.add(cityKey(links[i].from));
            linked.add(cityKey(links[i].to));
          });
          const list = Array.from(linked);
          map.setPaintProperty("city-dots", "circle-opacity", ["match", ["get", "key"], list, 1, 0.2]);
          map.setPaintProperty("city-dots", "circle-stroke-width", ["match", ["get", "key"], [key], 3, BASE_STROKE]);
          map.setPaintProperty("city-labels", "text-opacity", ["match", ["get", "key"], list, 1, 0.2]);
          // On centre la ville choisie, sans changer le zoom.
          const c = cities.get(key)!.c;
          lng = c[0];
          lat = Math.max(-50, Math.min(60, c[1]));
          ease(600);
          if (!cancelled) setPicked({ label: cities.get(key)!.label, deps: departures.get(key) ?? [] });
        };

        // Un simple toucher : la ville la plus proche du doigt, dans une marge confortable.
        const handleTap = (clientX: number, clientY: number) => {
          if (!map.getLayer("city-dots")) return;
          const rect = el.getBoundingClientRect();
          const x = clientX - rect.left;
          const y = clientY - rect.top;
          const center = map.getCenter();
          const hits = map.queryRenderedFeatures(
            [[x - TAP_RADIUS, y - TAP_RADIUS], [x + TAP_RADIUS, y + TAP_RADIUS]],
            { layers: ["city-dots"] }
          );
          let best: string | null = null;
          let bestDist = Infinity;
          for (const f of hits) {
            const c = f.geometry.coordinates as LngLat;
            if (angleBetween([center.lng, center.lat], c) > 85) continue; // face cachée du globe
            const p = map.project(c);
            const d = Math.hypot(p.x - x, p.y - y);
            if (d < bestDist) {
              bestDist = d;
              best = f.properties.key as string;
            }
          }
          if (best && best !== selectedKey) select(best);
          else select(null); // même ville ou toucher à côté : retour à la vue de départ
        };

        const onDown = (e: PointerEvent) => {
          pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
          try { el.setPointerCapture(e.pointerId); } catch {}
          dragging = true;
          if (pts.size === 1) {
            lastX = downX = e.clientX;
            lastY = downY = e.clientY;
            moved = false;
            multi = false;
          } else if (pts.size === 2) {
            multi = true;
            const [a, b] = Array.from(pts.values());
            pinchDist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
            pinchZ = z;
          }
        };
        const onMove = (e: PointerEvent) => {
          if (!pts.has(e.pointerId)) return;
          pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) moved = true;
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
          if (!moved) return;
          lng -= dx * degPerPx();
          // La latitude ne bouge que zoomé : à plat, on ne fait que tourner autour de l'axe.
          if (isZoomed) lat = Math.max(-60, Math.min(70, lat + dy * degPerPx() * Math.cos((lat * Math.PI) / 180)));
          apply();
        };
        const end = (e: PointerEvent, allowTap: boolean) => {
          const wasLast = pts.size === 1;
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
          if (allowTap && wasLast && !moved && !multi) handleTap(e.clientX, e.clientY);
        };
        const onUp = (e: PointerEvent) => end(e, true);
        const onCancel = (e: PointerEvent) => end(e, false);
        el.addEventListener("pointerdown", onDown);
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerup", onUp);
        el.addEventListener("pointercancel", onCancel);
        removeListeners = () => {
          el.removeEventListener("pointerdown", onDown);
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerup", onUp);
          el.removeEventListener("pointercancel", onCancel);
        };

        controls.current = {
          zoomBy: (d: number) => {
            z = clampZ(z + d);
            ease();
          },
          reset: () => {
            select(null);
            z = base;
            lat = LAT;
            ease();
          },
        };

        // Rotation lente : seulement en vue d'ensemble, sans ville choisie, section visible,
        // sans doigt posé. Dès qu'on zoome ou qu'on choisit une ville, elle s'arrête.
        if (!reduce) {
          let last = performance.now();
          const tick = (now: number) => {
            const dt = now - last;
            last = now;
            if (inView.current && !dragging && now > pausedUntil && z <= base + 0.05 && selectedKey === null) {
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
      <p className="text-ink-muted mt-2">Touchez une ville pour voir ses routes.</p>
      <div className="relative mt-4 mx-auto w-full max-w-md aspect-square">
        <div
          ref={gestureRef}
          role="img"
          aria-label="Globe des villes desservies par Coliz : touchez une ville pour voir ses routes"
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
            {(zoomed || picked) && (
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

      {picked && (
        <div className="mt-4">
          {picked.deps.length > 0 ? (
            <>
              <p className="text-sm font-semibold text-ink mb-2">Au départ de {picked.label}</p>
              <div className="-mx-5 px-5 flex gap-3 overflow-x-auto snap-x pb-2">
                {picked.deps.map((d) => (
                  <Link
                    key={d.to}
                    href={`/recherche?from=${encodeURIComponent(d.from)}&to=${encodeURIComponent(d.to)}`}
                    className="snap-start shrink-0 min-w-[150px] rounded-2xl border border-line bg-surface shadow-card px-4 py-3 active:bg-sender-light"
                  >
                    <span className="block text-[15px] font-bold text-ink leading-tight">{d.to}</span>
                    <span className="mt-2 block">
                      <TransportModeBadge mode={d.mode as TransportMode} variant="plain" />
                    </span>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-muted">
              Pas encore de départ depuis {picked.label}.{" "}
              <Link href={`/recherche?to=${encodeURIComponent(picked.label)}`} className="font-semibold text-sender underline">
                Voir les trajets vers {picked.label}
              </Link>
            </p>
          )}
        </div>
      )}
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
