# Coliz

**Vos colis voyagent avec ceux qui voyagent.**

Marketplace mettant en relation des expéditeurs et des voyageurs pour l'envoi
de colis. Coliz est un intermédiaire : commission sur transaction, pas de
statut de transporteur, pas de garantie de livraison ni de valeur par défaut.
Marque universelle (Nantes → Paris, Paris → Alger, Lyon → Casablanca...),
avec une acquisition initiale ciblée sur les flux France ↔ Maghreb.

## Identité graphique

Les assets officiels sont dans `public/brand/` (déclinés depuis la maquette de
référence, ne pas régénérer un nouveau logo) :
- `logo-primary.svg` — logo complet, usage par défaut
- `logo-light.svg` / `logo-dark.svg` — sur fond clair / fond navy
- `logo-mono.svg` — monochrome (usage restreint : tampons, gravure, etc.)
- `symbol.svg` / `symbol-social.svg` — symbole seul (app icon, réseaux sociaux)
- `favicon.svg` — favicon du site

Palette (`tailwind.config.ts`) : bleu principal `#0B57D0`, dégradé badge
`#4FA8FF → #0B57D0`, bleu clair de fond `#E7F1FF`, encre `#0B1B3A`, succès `#20A66A`.

## Stack retenue (solo dev)

- **Next.js 14 (App Router) + TypeScript** — front + back dans un seul projet, déploiement simple (Vercel).
- **PostgreSQL + Prisma** — schéma typé, migrations versionnées.
- **NextAuth (Credentials)** — auth email/mot de passe, JWT.
- **Stripe Connect (comptes Express)** — paiements marketplace.
- **Tailwind CSS** — charte Coliz (bleu `#0B57D0`, cartes arrondies, beaucoup de blanc).
- **Zod** — validation de toutes les entrées API.

## Ce qui est en place

| # | Module | État |
|---|--------|------|
| 1 | Architecture projet | ✅ structure App Router complète |
| 2 | Base de données | ✅ schéma Prisma complet (toutes entités) + seed |
| 3 | Authentification | ✅ inscription, connexion NextAuth |
| 4 | Profils / vérification | ✅ modèle + badge "Profil vérifié" détaillé (email/téléphone/identité séparés) |
| 5 | Création de colis | ✅ API + écran (validation limites admin) |
| 6 | Création de trajets | ✅ API (contrainte cotransportage mode voiture) |
| 7 | Matching | ✅ moteur de scoring (distance + date + capacité) |
| 8 | Recherche | ✅ API `/api/trips/search` (carte à brancher : Mapbox/Google Maps) |
| 9 | Profil voyageur | ✅ écran public (avis, note, badge vérifié détaillé) |
| 10 | Réservation | ✅ écran récapitulatif + API (calcul commission/contribution/total) |
| 11 | Stripe Connect | ✅ onboarding, écran paiement (Stripe Elements), webhook, transfert, remboursement par règle, portefeuille |
| 12 | Messagerie | ✅ liste de conversations + écran de chat (polling 4s) |
| 13 | Suivi colis | ✅ écran timeline + transitions de statut, déclenche le transfert à la livraison |
| 14 | Notifications | ✅ service centralisé + API (email/push à brancher) |
| 15 | Évaluations | ✅ API (uniquement après livraison confirmée) |
| 16 | Incidents | ✅ API + déclaration depuis l'écran de suivi |
| 17 | Dashboard utilisateur | ✅ écran d'accueil (colis/trajets en cours, notifications) |
| 18 | Back-office admin | ✅ écran compteurs + incidents, API suspension utilisateur (journal d'audit) |
| 19 | Sécurité | ✅ middleware (headers, routes protégées, contrôle rôle admin) |
| 20 | Responsive mobile | ✅ Tailwind mobile-first, composants UI de base (`Card`, boutons, badges) |

## Décisions techniques prises (pour avancer sans bloquer)

- **Paiement** : stratégie "separate charges & transfers" — l'expéditeur paie le
  montant total au compte plateforme, le transfert vers le voyageur est déclenché
  par une règle métier (ici : livraison confirmée), pas par Stripe automatiquement.
  Ce n'est pas un séquestre juridique, juste un ordre d'opérations Stripe.
- **Commission** : 15% de la contribution du voyageur, centralisée dans
  `computeBookingAmounts()` — à rendre configurable en admin plus tard.
- **Remboursement** : barème par défaut 100% (>48h) / 50% (24-48h) / 0% (<24h)
  avant le départ du trajet — isolé dans `computeRefundRate()`, à valider et
  rendre configurable.
- **Badge "Profil vérifié"** : n'apparaît que si identité ET email sont vérifiés ;
  chaque type de vérification reste consultable séparément (`getVerificationSummary`).

## Rebranding Coliz (ex-ColisLink)

- Renommage complet du code, de la config et des textes (`ColisLink` → `Coliz`).
- Nouvelle homepage (`src/app/page.tsx`) : hero + slogan, recherche directe (départ/destination/date), deux CTA (« J'envoie un colis » / « Je propose un trajet »), bloc confiance, « Comment ça marche » en 4 étapes.
- Nouvelle route `GET /api/trips/search-public` : recherche sans colis préalable, en plus de `/api/trips/search` (recherche liée à un colis existant).
- Logo et déclinaisons dans `public/brand/` + composant `src/components/logo.tsx`.
- Pack d'icônes ligne (`src/components/icons.tsx`) remplaçant tous les emojis de l'interface.

## Ce qui vient d'être terminé

- **Écran Paramètres** (`/parametres`) — profil, statut de vérification par type, préférences email/push, langue, déconnexion, suppression de compte (`/api/settings`, `/api/settings/delete-account`). C'était le seul écran des 11 jamais construit.
- **Emails transactionnels réels** — `src/server/notifications/email.ts` (Resend), branché dans `notifyUser()` ; respecte la préférence `notifyEmail` de l'utilisateur ; no-op silencieux si `RESEND_API_KEY` absent (dev local).
- **Vérification d'identité réelle** — Stripe Identity : `/api/stripe/identity/session` crée la session, écran dédié (`/parametres/verification-identite`), webhook (`identity.verification_session.verified` / `requires_input`) met à jour `identityVerifiedAt`.
- **Autocomplete d'adresses** — `/api/geocode` (proxy serveur vers Mapbox Geocoding, clé jamais exposée au client) + composant `CityAutocomplete`, intégré aux formulaires colis et trajet (fini les coordonnées Paris/Lyon codées en dur).
- **Mini-carte sur l'écran recherche** — `ResultsMap` (Mapbox GL chargé depuis un CDN, sans dépendance npm lourde), hauteur fixe (~160px) pour ne jamais dominer la liste de résultats ; dégradé proprement si aucun token Mapbox n'est configuré.
- **Tests unitaires** (`vitest`) sur les trois fonctions les plus sensibles : `computeBookingAmounts`, `computeRefundRate`, et le trio géométrique du matching (`haversineKm`, `fitsDimensions`, `computeMatchScore`). Vérifiés manuellement en Node dans ce environnement (pas d'accès réseau ici pour `npm install` et lancer `npm test` en conditions réelles) — à relancer avec `npm test` une fois les dépendances installées.

## Ce qu'il reste réellement à faire

1. `npm install`, configurer `.env` (copier `.env.example` : Stripe, Mapbox, Resend), `npx prisma migrate dev`, `npm run seed`.
2. `npm test` pour rejouer la suite vitest en conditions réelles.
3. Créer le compte Stripe (mode test), configurer le webhook, activer le produit Stripe Identity.
4. Créer un compte Mapbox (token `MAPBOX_TOKEN` / `NEXT_PUBLIC_MAPBOX_TOKEN`) et un compte Resend (`RESEND_API_KEY`).
5. Tester le parcours complet de bout en bout : inscription → colis → trajet (2ᵉ compte) → matching → réservation → paiement test Stripe → suivi → avis → vérification d'identité.
6. Brancher le push mobile (OneSignal/FCM) — seul `notifyPush` reste un champ sans effet pour l'instant.
7. Formaliser avec un juriste le processus RGPD complet de suppression de compte (la mécanique technique de base est en place, la purge différée légale reste à définir).
