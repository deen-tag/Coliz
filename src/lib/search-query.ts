// Une ville saisie dans un champ de recherche : le texte tapé, et les coordonnées
// si la personne a choisi une suggestion de la liste.
export type PlaceInput = { text: string; lat?: number; lng?: number };

// Nom de la ville seul (« Paris », pas « Paris, Île-de-France, France »).
export const cityName = (t: string) => t.split(",")[0].trim();

// Paramètres d'URL de /recherche : la ville, et ses coordonnées quand on les a
// (elles permettent de chercher dans un rayon autour de la ville).
export function searchQuery(from: PlaceInput, to: PlaceInput) {
  const q = new URLSearchParams();
  const add = (key: "from" | "to", p: PlaceInput) => {
    const name = cityName(p.text);
    if (!name) return;
    q.set(key, name);
    if (p.lat !== undefined && p.lng !== undefined) {
      q.set(`${key}Lat`, p.lat.toFixed(4));
      q.set(`${key}Lng`, p.lng.toFixed(4));
    }
  };
  add("from", from);
  add("to", to);
  return q.toString();
}
