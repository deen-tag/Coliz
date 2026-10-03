# Coliz — application mobile (Android + iPhone)

Application **native** (React Native + Expo + TypeScript) branchée sur votre site et votre backend existants.
Le site web n'est pas modifié dans son fonctionnement : seuls des ajouts ont été faits (voir « Ce qui a changé côté site »).

## Pourquoi ces choix (en clair)
- **React Native + Expo** : un seul code pour Android et iPhone, vrai rendu natif (pas une WebView).
- **EAS Build (service d'Expo)** : les applications sont fabriquées **dans le cloud**. Vous n'avez besoin ni d'Android Studio, ni de Xcode, ni d'un Mac.
- **Votre backend est conservé** : Next.js, Prisma, Stripe, Resend, Mapbox restent identiques. L'app parle aux mêmes routes `/api/...`.

---
## ÉTAPE 0 — Déployer les modifications du site (obligatoire, une seule fois)
Des fichiers ont été ajoutés au site (connexion mobile, notifications push, envoi de photos).
1. Copiez le contenu du dossier `Coliz-main` (qui contient `mobile/`, `src/`, `prisma/`) dans votre dépôt GitHub, comme d'habitude.
2. Vercel redéploie tout seul. Votre commande `build` exécute déjà `prisma db push` : la nouvelle table `PushToken` est créée automatiquement.
3. Résultat attendu : le site continue de fonctionner comme avant. Aucune nouvelle variable d'environnement n'est nécessaire (le jeton mobile utilise votre `NEXTAUTH_SECRET` existant).

## ÉTAPE 1 — Installer les outils sur votre ordinateur (Windows ou Mac)
1. Allez sur https://nodejs.org → bouton **LTS** → installez (Suivant, Suivant…). Redémarrez l'ordinateur.
2. Ouvrez un terminal : **Windows** : touche Windows, tapez `PowerShell`, Entrée. **Mac** : Cmd+Espace, tapez `Terminal`, Entrée.
3. Tapez `node -v` puis Entrée. Résultat attendu : un numéro de version (ex. `v22.x.x`).
4. Créez un compte gratuit sur https://expo.dev/signup (retenez email + mot de passe).

## ÉTAPE 2 — Renseigner vos 2 réglages
Ouvrez `mobile/coliz.config.json` avec le Bloc-notes et remplacez :
- `apiUrl` : l'adresse de votre site, ex. `https://coliz.vercel.app` (sans `/` à la fin)
- `stripePublishableKey` : votre clé Stripe **publique** (commence par `pk_test_`). Jamais la clé `sk_`.
Laissez le reste vide pour l'instant. (`googleMapsAndroidKey` : voir « Carte sur Android » plus bas.)

## ÉTAPE 3 — Installer le projet
Dans le terminal, allez dans le dossier (remplacez le chemin par le vôtre) :
```
cd chemin/vers/Coliz-main/mobile
npm install
npx expo install --fix
```
Résultat attendu : de longues lignes défilent, puis le terminal rend la main sans mot « ERROR ». Cela peut prendre 3-5 minutes. (`expo install --fix` aligne automatiquement toutes les versions.)

## ÉTAPE 4 — Créer l'APK Android pour tester
```
npm install -g eas-cli
eas login
eas init
eas build --platform android --profile preview
```
- `eas login` : saisissez votre compte expo.dev.
- `eas init` : répondez **Y** (oui) à chaque question. Cela crée votre projet Expo.
- `eas build` : à la question « Generate a new Android Keystore? » répondez **Y**.
- Attendez 10-20 minutes. Résultat attendu : un **lien** et un **QR code** s'affichent.
- Sur votre téléphone Android : ouvrez le lien (ou scannez le QR code), téléchargez l'APK, ouvrez-le. Si Android demande « Autoriser l'installation depuis cette source » : acceptez. Installez, ouvrez **Coliz**.

## ÉTAPE 5 — Tester sur iPhone
Apple impose un compte **Apple Developer (99 $/an)** pour installer sur un vrai iPhone. Je ne peux pas le créer à votre place (paiement + vos informations).
1. Inscrivez-vous sur https://developer.apple.com/programs/enroll (validation : 1 à 2 jours).
2. Branchez-vous : `eas device:create` → suivez le lien affiché **depuis votre iPhone** pour enregistrer le téléphone (Réglages > Profil téléchargé > Installer).
3. `eas build --platform ios --profile preview` → connectez-vous avec votre identifiant Apple quand demandé, acceptez les propositions par défaut.
4. À la fin, ouvrez le lien depuis l'iPhone et installez. (iOS 16+ : Réglages > Confidentialité et sécurité > **Mode développeur** : activez et redémarrez.)
Alternative sans iPhone : sur un **Mac** avec Xcode, `eas build --platform ios --profile preview-simulator` donne une app pour le simulateur.

## ÉTAPE 6 — Builds pour une future publication (rien n'est publié)
```
eas build --platform android --profile production   # fichier .aab pour Google Play
eas build --platform ios --profile production       # pour l'App Store (compte Apple requis)
```

## Notifications push
Après `eas init`, rien d'autre à faire pour Android/iPhone avec le service Expo. Le serveur envoie les push via `exp.host` (aucune clé secrète). **Pour Android**, Google exige en plus un fichier Firebase : https://docs.expo.dev/push-notifications/fcm-credentials/ (je ne peux pas créer votre compte Firebase). Sans lui, tout marche sauf les push Android.

## Carte sur Android (facultatif)
iPhone : carte Apple, aucune clé. Android : sans clé, l'app propose des boutons « Ouvrir dans Maps ». Pour la carte intégrée : créez une clé Google Maps (Maps SDK for Android) restreinte à l'app, collez-la dans `googleMapsAndroidKey`, relancez le build.

## Lancer en mode développement (optionnel)
`npx expo start` puis scannez le QR avec l'app **Expo Go** — ⚠️ Stripe et les notifications exigent un vrai build (étape 4) : Expo Go ne suffit pas.

## Ce qui a changé côté site (ajouts uniquement)
- `src/server/auth/session.ts` : `requireUser()` accepte maintenant aussi `Authorization: Bearer <jeton>` (le cookie web fonctionne comme avant).
- `src/server/auth/mobile-token.ts` + `src/app/api/mobile/*` : connexion mobile, renouvellement, `/me`, enregistrement des appareils push. Le jeton s'invalide si le mot de passe change ou si le compte est suspendu.
- `prisma/schema.prisma` : modèle `PushToken` (+ relation sur `User`).
- `src/server/notifications/service.ts` : envoi push Expo en plus des notifications et emails existants.
- `src/app/api/uploads/parcel-photo` : envoi de photo de colis (même contrôle du contenu que l'avatar).
- Messages / demandes / acceptations : les push contiennent l'identifiant de réservation (ouverture directe).

## Sécurité
Aucune clé secrète dans l'app (uniquement l'URL du site et la clé Stripe `pk_`). Jeton dans le coffre natif (Keychain / Keystore). Paiement via PaymentSheet Stripe (cartes jamais en contact avec votre serveur). Verrouillage Face ID / empreinte facultatif.

## Correspondance avec le site
Accueil, recherche (liste + carte), détail trajet, partage, création de colis (photo caméra/galerie), trajets compatibles, création de trajet, réservation (accepter / refuser / négocier / payer / annuler), codes de remise et de réception, suivi, messagerie, avis, incidents, notifications, portefeuille Stripe Connect, vérification d'identité, paramètres, suppression de compte.
Non repris (usage web) : back-office admin.
