const googleMapsSearchUrl = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

export function goldenMapHref(placeOrUrl: string) {
  return placeOrUrl.startsWith("https://")
    ? placeOrUrl
    : googleMapsSearchUrl(placeOrUrl);
}
