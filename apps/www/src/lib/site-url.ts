const FALLBACK_SITE_URL = "https://darkdocs.ameyalambat.com";

const normalizeUrl = (value: string) => {
  const withProtocol = value.startsWith("http") ? value : `https://${value}`;
  return withProtocol.endsWith("/") ? withProtocol.slice(0, -1) : withProtocol;
};

const resolveSiteUrl = () => {
  const envValue =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL;

  if (!envValue) return FALLBACK_SITE_URL;
  return normalizeUrl(envValue);
};

export const SITE_URL = resolveSiteUrl();
