const ensureTrailingSlash = (value: string): string =>
  value.endsWith('/') ? value : `${value}/`;

export const publicAssetPath = (assetPath: string): string => {
  const base = ensureTrailingSlash(import.meta.env.BASE_URL || '/');
  const normalizedPath = assetPath.replace(/^\/+/, '');
  return `${base}${normalizedPath}`;
};
