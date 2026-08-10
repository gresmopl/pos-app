/**
 * Buduje pelny adres aplikacji z origin przegladarki i base path z Vite.
 *
 * Samo `window.location.origin` zgubiloby przedrostek "/pos-app" na GitHub Pages
 * i kod QR prowadzilby na 404. Base path pochodzi z `base` w vite.config.ts,
 * wiec po przeprowadzce na wlasna domene adres dostosuje sie sam.
 */
export function buildAppUrl(origin: string, basePath: string): string {
  const path = basePath.endsWith("/") ? basePath : `${basePath}/`;
  return new URL(path, origin).href;
}
