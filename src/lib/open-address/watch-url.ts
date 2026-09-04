export const FOLIO_HOST = "https://efficient-raccoon-976.convex.site";

export function watchHref(watchKey: string | null | undefined) {
  if (!watchKey) return "";
  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : FOLIO_HOST;
  return `${origin}/watch/${watchKey}`;
}

export function qrSrc(url: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;
}
