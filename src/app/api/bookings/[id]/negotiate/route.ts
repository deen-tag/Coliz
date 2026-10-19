// Ancien point d'entrée (utilisé par l'application mobile) : il crée désormais une offre dans le
// fil de négociation, au même titre que POST /api/bookings/[id]/offers. Le montant est le prix
// TOUT COMPRIS payé par l'expéditeur, et ne s'applique qu'à l'acceptation de l'autre partie.
export { POST } from "../offers/route";
