# Coliz

**Vos colis voyagent avec ceux qui voyagent.**

Marketplace qui met en relation des expéditeurs et des voyageurs pour l'envoi de colis. Coliz est un intermédiaire : commission sur transaction, pas de statut de transporteur, pas de garantie de livraison ni de valeur par défaut. Marque universelle, avec une acquisition initiale ciblée sur les flux France ↔ Maghreb.

_Dernière mise à jour de ce fichier : 3 octobre 2026._

## Où on en est

| Élément | État |
|---|---|
| Site web (Next.js, Vercel) | En ligne : https://coliz-app.vercel.app |
| Base de données (Neon / PostgreSQL) | En place, avec des données de démonstration |
| Application Android (dossier `mobile/`) | Fonctionne (APK de test). Voir `mobile/README.md` |
| Mises à jour de l'appli sans nouvelle APK (EAS Update) | Installé, premier envoi pas encore testé |
| Application iPhone | Pas faite : demande un compte Apple Developer payant |
| Paiement Stripe | Code écrit (site et appli), **compte Stripe pas créé** : paiement non testable |
| Emails (Resend), carte du site (Mapbox) | Code écrit, comptes à créer ou à vérifier |

## Comment je travaille (depuis le téléphone)

Tout se fait depuis un téléphone Android, sans ordinateur :

- **Termux** : écrire et envoyer le code. Les fichiers modifiés sont copiés dans `~/coliz-seed`, puis `git add`, `git commit`, `git push` vers GitHub (`deen-tag/Coliz`, branche `main`).
- **Vercel** : redéploie le site tout seul à chaque `git push`.
- **Expo (expo.dev)** : fabrique l'APK dans le cloud depuis GitHub. Voir `mobile/README.md`.
- **Neon** : la base de données.

```
Termux (code) ──git push──► GitHub (deen-tag/Coliz)
                              ├──► Vercel ──► site + API ──► Neon (base)
                              └──► Expo (builds) ──► APK Android ──► API du site
```

### Limite importante : Prisma ne marche pas dans Termux
Termux tourne sur un processeur ARM64, alors que le moteur de Prisma est prévu pour x86_64. On ne peut donc pas lancer `prisma`, `seed` ou une migration depuis le téléphone. Pour toucher à la base : écrire une route API temporaire dans `src/app/api/admin/...`, la déployer, l'appeler une fois, puis la supprimer. Le schéma est appliqué au déploiement par `prisma db push` (le projet n'a jamais utilisé de dossier `prisma/migrations`).

## Stack

- **Next.js 14 (App Router) + TypeScript** : site et API dans un seul projet.
- **PostgreSQL (Neon) + Prisma** : schéma typé.
- **NextAuth (Credentials)** : email / mot de passe. L'appli mobile utilise un jeton (`/api/mobile/*`).
- **Stripe Connect (comptes Express)** : paiements.
- **Tailwind CSS** : charte Coliz.
- **Zod** : validation des entrées API.
- **Vitest** : tests unitaires (`npm test`).

## Identité graphique

Logos dans `public/brand/` (ne pas régénérer de nouveau logo) : `logo-primary.svg` (par défaut), `logo-light.svg`, `logo-dark.svg`, `logo-mono.svg`, `symbol.svg`, `symbol-social.svg`, `favicon.svg`.

Palette (`tailwind.config.ts`, reprise dans `mobile/src/lib/theme.ts`) : bleu pétrole `#1B5E6E` (marque et expéditeur), cuivre `#A9501E` (voyageur), fond `#FAF8F4`, encre `#14262D`, succès `#16A34A`.

## Fonctionnalités en place

Inscription et connexion, profils avec badge « Profil vérifié », création de colis et de trajets, recherche et matching (distance, date, capacité), réservation (calcul de commission), paiement Stripe Connect, messagerie, suivi du colis avec **codes de remise et de réception**, notifications, avis (après livraison confirmée), incidents, paramètres, back-office admin (compteurs, incidents, suspension), emails transactionnels (Resend), vérification d'identité (Stripe Identity), autocomplétion d'adresses et mini-carte (Mapbox).

## Décisions techniques

- **Paiement** : « separate charges & transfers ». L'expéditeur paie la plateforme, le transfert au voyageur est déclenché à la livraison confirmée. Ce n'est pas un séquestre juridique.
- **Commission** : 15 % de la contribution du voyageur, dans `computeBookingAmounts()`.
- **Remboursement** : 100 % (plus de 48 h avant le départ), 50 % (24 à 48 h), 0 % (moins de 24 h), dans `computeRefundRate()`.
- **Badge « Profil vérifié »** : seulement si identité **et** email sont vérifiés.
- **Codes de remise et de réception** : codes chiffrés (AES-256-GCM, modèle `TransferCode`), générés au paiement. Les événements du colis sont gardés dans `BookingEvent` (preuve en cas de litige). Le voyageur ne peut plus déclarer lui-même une livraison.

## À savoir / à ne pas oublier

- **`TRANSFER_CODE_KEY`** (variable d'environnement Vercel) : ne jamais la perdre ni la changer sans plan de migration, sinon les codes déjà émis deviennent illisibles.
- **Route temporaire `src/app/api/admin/seed-demo-bulk-temp`** : elle sert à créer les données de démo et est protégée par un mot de passe écrit dans le code. **À supprimer dès que les tests sont finis**, et avant tout lancement public. Le dépôt GitHub doit rester **privé** tant qu'elle existe.
- **Comptes de démo** : tous les emails finissent par `@demo.coliz` (mot de passe commun de démo), pour pouvoir tout supprimer d'un coup. À purger avant un vrai lancement.
- **Écart avec le cahier des charges** : le destinataire doit recevoir son propre code de réception de la part de Coliz. Pour l'instant les deux codes passent par l'expéditeur.
- Aucun secret (clé `sk_`, mot de passe, jeton Expo) ne doit être écrit dans le dépôt ou dans ce fichier.

## Ce qui reste à faire

1. Créer le compte Stripe (mode test), configurer le webhook, puis renseigner la clé secrète sur Vercel et la clé publique `pk_` dans `mobile/coliz.config.json`.
2. Créer les comptes Mapbox et Resend si ce n'est pas fait (variables dans `.env.example`).
3. Tester le parcours complet : inscription, colis, trajet (2ᵉ compte), réservation, paiement test, deux codes, avis.
4. Brancher le push mobile (Firebase pour Android).
5. Trancher l'écart « destinataire », puis le système de garantie / caution du voyageur (`Coliz_plan_systeme_caution.docx`, rien n'est codé).
6. RGPD : formaliser la suppression de compte avec un juriste.
7. Quand les tests sont finis : supprimer la route temporaire et purger les comptes de démo.
