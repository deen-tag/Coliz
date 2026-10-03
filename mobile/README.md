# Coliz — application mobile

Application native **Android** (React Native + Expo SDK 55 + TypeScript), branchée sur le site et son API.

_Dernière mise à jour : 3 octobre 2026._

## État

- **Android** : une APK de test (profil `preview`) est installée et fonctionne.
- **iPhone** : pas fait. Il faut un compte Apple Developer payant (voir plus bas).
- **EAS Update** (mises à jour sans nouvelle APK) : installé (`expo-updates`), **premier envoi pas encore testé**.

## Comment l'appli et le site sont liés

L'appli parle au site (adresse dans `coliz.config.json`, aujourd'hui `https://coliz-app.vercel.app`) via les routes `/api/...`. Ce sont **deux interfaces séparées** :

| Ce que je change | Visible dans l'appli ? |
|---|---|
| Données (trajets, comptes, messages) | Oui, tout de suite |
| API et base de données du site | Oui, après le déploiement Vercel |
| Page, design ou texte du **site** | Non |
| Écrans, couleurs, textes de l'**appli** (`mobile/src`) | Seulement après un build, ou une mise à jour EAS Update |
| Paquets, permissions, icône, changement de domaine | Seulement après un nouveau build (APK) |

Une nouveauté qui doit exister dans les deux demande du travail des deux côtés : une route `/api/mobile/...` côté site, un écran dans `mobile/src/app/` côté appli.

## Envoyer un changement (depuis Termux)

```
cd ~/coliz-seed
# copier les fichiers modifiés (ou dézipper le zip fourni), puis :
git status --short            # vérifier que seuls les fichiers prévus sont listés
git add mobile/src            # ou les fichiers précis
git commit -m "message"
git push
```

## Fabriquer l'APK (build)

Sur **expo.dev** (compte `cloiz`, projet `Coliz`, relié à GitHub) :

1. **Builds** → **Build from GitHub** (en haut à droite).
2. Base directory `/mobile` · Platform **Android** · Git ref `main` · EAS Build profile `preview` · Environment **Preview**.
3. **Confirm** une seule fois, puis ouvrir **Builds**. Le build dure 10 à 15 minutes.
4. Quand la ligne est verte : ouvrir le build, menu **⋮** de « Build artifact » → télécharger l'APK (le bouton **Install** n'affiche qu'un QR code).
5. Ouvrir le fichier `.apk` dans Téléchargements. Si Play Protect bloque : **Plus de détails → Installer quand même**. Si « Appli non installée » : réessayer, ou désinstaller l'ancienne version d'abord.

## Mises à jour sans nouvelle APK (EAS Update)

Configuré dans `app.config.ts` : `runtimeVersion` en politique `fingerprint` (une mise à jour n'est reçue que par les APK dont le code natif est identique) et `updates.url` basée sur l'identifiant du projet. Le canal est `preview` (`eas.json`). Plan gratuit d'Expo : 1 000 utilisateurs actifs par mois.

Envoi d'une mise à jour, depuis Termux (**procédure à valider au premier essai**) :

```
cd ~/coliz-seed/mobile
npm install --no-audit --no-fund        # il faut node_modules pour fabriquer la mise à jour
export EXPO_TOKEN=<jeton>               # voir ci-dessous, ne jamais l'écrire dans le dépôt
eas update --channel preview --message "texte"
```

- Le jeton est celui du robot **Termux** (rôle Developer), créé sur expo.dev → Account → Access tokens. Il ne vaut que pour la session Termux en cours.
- L'appli cherche la mise à jour à l'ouverture et l'affiche à l'ouverture suivante : l'ouvrir **deux fois**.
- Un changement de paquet, de permission ou d'icône exige toujours un nouveau build.

## Pièges rencontrés (à ne pas refaire)

- **Versions `"*"` dans `package.json`** : `typescript` s'est installé en 7.x et a fait échouer la lecture de `app.config.ts`. Les versions sont maintenant fixées (`typescript ~5.9.2`, `@types/react ~19.2.10`).
- **`package-lock.json` obligatoire** dans `mobile/` : Expo exige un fichier de versions complet. Après un changement de paquet, le régénérer et l'envoyer sur GitHub.
- **Ajouter un paquet** : `npx expo install <paquet>` (il choisit la version compatible Expo 55), jamais `npm install <paquet>` à la main.
- **`npx expo` sans `node_modules`** télécharge Expo 57 au lieu de 55. Toujours faire d'abord `npm install` dans `mobile/`.
- **Téléphone plein** : `node_modules` pèse plus de 600 Mo. Le supprimer quand on n'en a plus besoin : `rm -rf ~/coliz-seed/mobile/node_modules`. Le build cloud réinstalle tout lui-même.
- **Lancer les commandes dans le bon dossier** : `~/coliz-seed/mobile` pour l'appli, `~/coliz-seed` pour le site.
- **Platform « All »** lance aussi iOS, qui échoue sans compte Apple : choisir **Android**.
- **Environment** du formulaire de build : le remettre sur **Preview** (il revient parfois sur Default ou Production).
- **Se connecter à l'appli avec le compte de l'autre** : on ne peut pas réserver son propre trajet (« C'est votre trajet »).

## Réglages (`coliz.config.json`)

| Clé | État |
|---|---|
| `apiUrl` | `https://coliz-app.vercel.app` |
| `stripePublishableKey` | Vide : paiement non disponible dans l'appli (clé `pk_` uniquement, jamais `sk_`) |
| `googleMapsAndroidKey` | Vide : sans clé, l'appli propose des boutons « Ouvrir dans Maps » |
| `universalLinkHost` | Vide : les liens du site n'ouvrent pas l'appli |

Toute modification de ce fichier demande un nouveau build, car les valeurs sont copiées dans l'APK.

## iPhone

Apple impose un compte Apple Developer (environ 99 $ par an) pour installer sur un vrai iPhone. Sans lui : pas d'APK équivalent, pas de build iOS. Voie gratuite : utiliser le **site** dans Safari (ajout à l'écran d'accueil). `app.config.ts` contient déjà la partie iOS.

## Ce qui a été ajouté côté site pour l'appli

- `src/server/auth/session.ts` : `requireUser()` accepte aussi `Authorization: Bearer <jeton>`.
- `src/server/auth/mobile-token.ts` et `src/app/api/mobile/*` : connexion mobile, renouvellement, `/me`, appareils push. Le jeton s'invalide si le mot de passe change ou si le compte est suspendu.
- `prisma/schema.prisma` : modèle `PushToken`.
- `src/server/notifications/service.ts` : push Expo en plus des notifications et emails.
- `src/app/api/uploads/parcel-photo` : envoi de photo de colis.

## Sécurité

Aucune clé secrète dans l'appli (seulement l'adresse du site et la clé Stripe publique). Jeton de connexion rangé dans le coffre du téléphone. Paiement par la feuille Stripe (les cartes ne passent jamais par le serveur). Verrouillage par empreinte ou Face ID en option.
