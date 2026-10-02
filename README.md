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

Palette (`tailwind.config.ts`) : bleu pétrole de marque et expéditeur `#1B5E6E`, cuivre voyageur `#A9501E`
(accent uniquement), fond blanc chaud `#FAF8F4`, encre `#14262D`, succès `#16A34A`.
Dégradé du badge : `#2B8AA0 → #1B5E6E`, colis du logo en cuivre (`#F0B993`, trait `#A9501E`).

## Stack retenue (solo dev)

- **Next.js 14 (App Router) + TypeScript** — front + back dans un seul projet, déploiement simple (Vercel).
- **PostgreSQL + Prisma** — schéma typé, migrations versionnées.
- **NextAuth (Credentials)** — auth email/mot de passe, JWT.
- **Stripe Connect (comptes Express)** — paiements marketplace.
- **Tailwind CSS** — charte Coliz (bleu pétrole `#1B5E6E`, cartes arrondies, beaucoup de blanc).
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
| 13 | Suivi colis | ✅ écran timeline + **codes de remise/réception** (plus de transition libre par le voyageur), déclenche le transfert à la livraison confirmée |
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
8. **Système de garantie / caution du voyageur** (cf. `Coliz_plan_systeme_caution.docx`, §5-7 et §9-11) — rien n'est codé pour l'instant (pas de statut "Garantie requise/validée", pas de blocage de fonds proportionnel à la valeur déclarée, pas de libération/récupération). Nécessite d'abord de choisir un prestataire de paiement compatible et une validation juridique — priorité explicite du cahier des charges avant développement.

## Journal de session — 26/09/2026 (mise en route base de données + données démo)

### Contexte de départ
La base PostgreSQL (Neon) était vide : aucune donnée de configuration (`TransportModeRule`, `ParcelRuleSettings`) ni de contenu (trajets, colis).

### Blocage technique rencontré : Prisma sur Termux
Termux tourne sur processeur **ARM64** (mobile), alors que l'engine binaire de Prisma est prévu pour **x86_64** (ordinateur classique). Résultat : impossible d'exécuter une requête Prisma (`seed`, migration, script) directement depuis Termux sur le téléphone.

**Méthode retenue pour tout ce qui touche à la base de données :** écrire le code depuis Termux, puis créer une route API Next.js temporaire, protégée par une clé secrète en dur dans le code, qu'on exécute une seule fois en visitant son URL sur le déploiement Vercel (qui lui tourne sur x86_64 et n'a donc pas le problème). La route est ensuite supprimée et le projet redéployé, pour ne rien laisser d'exposé publiquement.

### Étape 1 — Config de base (`transportModeRule` + `parcelRuleSettings`)
Seedé via une route temporaire (`/api/admin/seed-temp`, secret `coliz-seed-9f3k2`), supprimée après usage. Résultat : les 9 modes de transport (CAR, TRAIN, PLANE...) et les limites globales de colis (poids/dimensions/valeur max) sont configurés en base.

### Étape 2 — Pourquoi la carte Mapbox affichait "pas de données"
Ce n'était **pas un bug** : le composant `ResultsMap` (Mapbox GL, chargé depuis un CDN) ne s'affiche que si des résultats de recherche existent (`results.length > 0`, cf. `src/app/(app)/recherche/page.tsx`). La base ne contenait que la config (étape 1), aucun vrai `Trip`. D'où le message "Aucun trajet compatible pour l'instant" et l'absence de carte — comportement normal d'une base sans contenu.

### Étape 3 — Données de démonstration
Créé et exécuté via une deuxième route temporaire (`/api/admin/seed-demo-temp`, secret `coliz-demo-7h2m9`, supprimée après usage) :
- **6 voyageurs** : Karim B., Sofia M., Yanis T., Nour K., Amine R., Lina D. (badge vérifié pour Karim, Sofia, Amine, Lina)
- **3 expéditeurs** : Farid S., Meriem A., Yasmine H.
- **10 trajets** entre villes réalistes (Nantes, Paris, Lyon, Alger, Casablanca), différents modes de transport et statuts
- **3 colis** publiés
- **3 réservations** à différents stades (confirmée, en cours, terminée), avec messages et un avis
- Tous les comptes démo utilisent l'email `prenom.role@demo.coliz` (ex: `karim.voyageur@demo.coliz`) et le mot de passe `Demo1234!`

**Convention importante :** tous les comptes démo se terminent par `@demo.coliz`, exprès, pour pouvoir tout supprimer d'un coup sans toucher aux vrais comptes.

### Comment tout supprimer d'un coup plus tard
La route de nettoyage (`cleanup-demo-temp`) a été supprimée après avoir servi (comme prévu, pour ne rien laisser exposé). Pour purger les données démo un jour :
1. Recréer `src/app/api/admin/cleanup-demo-temp/route.ts` (recherche `email: { endsWith: "@demo.coliz" }`, supprime en cascade reviews → messages → incidents → transactions → bookings → trips/parcels → user)
2. `vercel --prod`
3. Visiter l'URL avec la clé secrète une seule fois
4. Supprimer la route, redéployer

### État actuel (fin de session)
- ✅ Base Neon configurée et peuplée de données démo réalistes
- ✅ Aucune route temporaire exposée en production (toutes supprimées après usage)
- ✅ Carte Mapbox et recherche fonctionnels avec du contenu à afficher
- ⚠️ Comptes de test à usage interne uniquement (`@demo.coliz` / `Demo1234!`) — à nettoyer avant un vrai lancement public

## Journal de session — 27/09/2026 (codes de remise/réception + fix déploiement)

### Contexte
Faille corrigée : l'ancienne route `PATCH /api/bookings/[id]/status` permettait au voyageur de déclarer lui-même une réservation "livrée", sans preuve. Cf. `Coliz_plan_systeme_caution.docx` (§3) et cahier UX (§10-11) : *"le voyageur ne doit pas pouvoir déclarer seul qu'il a reçu le colis / qu'il a livré."*

### Ce qui a été ajouté
- **Modèles Prisma** `TransferCode` (code chiffré AES-256-GCM, réversible — l'expéditeur doit pouvoir le reconsulter à tout moment) et `BookingEvent` (journal immuable, preuve en cas de litige).
- **Nouveaux statuts** `PICKED_UP` / `DELIVERED` / `DELIVERY_FAILED` dans `BookingStatus` (`IN_PROGRESS` conservé pour compatibilité des anciennes données, à ne plus utiliser).
- **Routes API** : `GET/POST /api/bookings/[id]/pickup-code` et `.../delivery-code` (consultation/régénération, expéditeur uniquement), `.../verify` pour la saisie voyageur (anti-brute-force), `.../delivery/report-issue` pour le cas "réceptionniste injoignable".
- **Suppression** de l'ancienne route `PATCH /status`.
- **Webhook Stripe** : les 2 codes sont générés dès `payment_intent.succeeded`.
- **UI `/suivi/[id]`** : codes visibles côté expéditeur (+ régénération), champ de saisie côté voyageur à chaque étape.

### Écart connu avec le cahier des charges
Le cahier (§11, §18, §23-C) prévoit que le **destinataire** reçoive son propre code de réception directement de Coliz. Ce qui est codé fait transiter les deux codes uniquement par l'expéditeur, qui transmet lui-même le code de réception à qui il veut hors application — pas de compte ni de notification "destinataire" séparé. Fonctionnel, mais à trancher si important.

### Blocage de déploiement rencontré et corrigé
Le script `build` avait été changé en `prisma generate && prisma migrate deploy && next build`, mais le projet n'a **jamais utilisé de dossier `prisma/migrations`** (gestion en `db push`) → `migrate deploy` plantait (dossier introuvable), build en échec sur Vercel.
**Fix** : `"build": "prisma generate && prisma db push --accept-data-loss=false && next build"` — applique le schéma directement au build, cohérent avec la façon dont ce projet est géré depuis le début. Déploiement réussi ensuite.

### Reste à faire avant mise en prod de cette fonctionnalité
- Tester le parcours complet réel (paiement → 2 codes → saisie voyageur aux deux étapes) — pas encore fait en conditions réelles.
- Trancher l'écart destinataire ci-dessus.
- `TRANSFER_CODE_KEY` généré et ajouté en variable d'environnement Vercel (secret) — ne jamais la perdre/changer sans plan de migration des codes déjà émis (ils deviendraient indéchiffrables).
