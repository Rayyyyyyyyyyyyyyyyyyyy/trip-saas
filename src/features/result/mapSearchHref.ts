/**
 * A Google Maps *search* for verbatim place text. It resolves no coordinates
 * and asserts no specific place, so it is labeled as a search wherever it is
 * offered. Shared by the generalized projection and the Golden Viewer.
 */
export function mapSearchHref(placeText: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeText)}`;
}
