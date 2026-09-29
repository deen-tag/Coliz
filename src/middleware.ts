import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// Pages réservées aux utilisateurs connectés. Recherche, détail d'un trajet et
// profil voyageur restent publics : le visiteur ne se connecte qu'au moment
// où il agit (réserver, envoyer un colis, proposer un trajet…).
const PROTECTED = [
  "/dashboard",
  "/admin",
  "/activite",
  "/mes-colis",
  "/mes-voyages",
  "/reservations",
  "/messagerie",
  "/notifications",
  "/parametres",
  "/portefeuille",
  "/suivi",
  "/colis",
  "/trajets/nouveau",
];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // En-têtes de sécurité de base — à compléter avec une vraie CSP une fois
  // la liste des domaines externes (Stripe.js, cartes, storage images) figée.
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "geolocation=(self), camera=()");

  const { pathname, search } = req.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isProtected) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const loginUrl = new URL("/connexion", req.url);
      // On garde aussi les paramètres (ex. ?tripId=…) pour reprendre exactement où l'on était.
      loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }
    if (pathname.startsWith("/admin") && token.role !== "ADMIN" && token.role !== "MODERATOR") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/activite/:path*",
    "/mes-colis/:path*",
    "/mes-voyages/:path*",
    "/reservations/:path*",
    "/messagerie/:path*",
    "/notifications/:path*",
    "/parametres/:path*",
    "/portefeuille/:path*",
    "/suivi/:path*",
    "/colis/:path*",
    "/trajets/nouveau",
  ],
};
