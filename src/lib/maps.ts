export function criarLinkGoogleMaps(local?: string | null): string | null {
  if (!local || !local.trim()) {
    return null;
  }

  const query = encodeURIComponent(local.trim());

  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function criarLinkRotaGoogleMaps(local?: string | null): string | null {
  if (!local || !local.trim()) {
    return null;
  }

  const destination = encodeURIComponent(local.trim());

  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}
