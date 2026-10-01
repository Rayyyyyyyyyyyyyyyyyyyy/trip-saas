import { mapSearchHref } from "../result/mapSearchHref";

export function goldenMapHref(placeOrUrl: string) {
  return placeOrUrl.startsWith("https://")
    ? placeOrUrl
    : mapSearchHref(placeOrUrl);
}
