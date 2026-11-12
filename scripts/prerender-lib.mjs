import { dirname, join, relative, resolve } from 'node:path';

export const DEFAULT_SITE_ORIGIN = 'https://mju-craft.shop';

// prerender 본문의 이미지는 <noscript>로 감싼다.
// JS가 켜진 브라우저는 noscript 안의 이미지를 내려받지 않으므로, React가 마운트하기 전에
// 같은 이미지를 한 번 더 받는 낭비를 막는다(loading="lazy"는 화면 근처 이미지를 모두 받아 효과가 없었다).
// JS 없이 HTML만 읽는 크롤러는 noscript 안의 <img>를 그대로 읽는다.
export function seoImage(src, alt) {
  return `<noscript><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" /></noscript>`;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function stripMarkup(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/!?(?:\[[^\]]*\])?\([^)]*\)/g, ' ')
    .replace(/[`*_>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function summary(value, fallback) {
  const text = stripMarkup(value) || fallback;
  return text.length > 155 ? `${text.slice(0, 152).trim()}...` : text;
}

export function normalizeOrigin(value) {
  const origin = (value || DEFAULT_SITE_ORIGIN).trim().replace(/\/$/, '');
  const parsed = new URL(origin);
  if (parsed.protocol !== 'https:' || parsed.hostname === 'localhost') {
    throw new Error('SITE_ORIGIN must be a non-localhost HTTPS origin.');
  }
  return parsed.origin;
}

export function absoluteUrl(origin, value) {
  if (!value) return `${origin}/mjucraftLogo_Blue_Round.png`;
  return new URL(value, `${origin}/`).href;
}

export function routeOutputPath(distDir, route) {
  if (route === '/') return join(distDir, 'index.html');
  const safePath = route.replace(/^\/+/, '');
  const output = resolve(distDir, safePath, 'index.html');
  const distRoot = `${resolve(distDir)}${process.platform === 'win32' ? '\\' : '/'}`;
  if (!output.startsWith(distRoot)) throw new Error(`Unsafe route: ${route}`);
  return output;
}

export function renderDocument(template, { origin, route, title, description, image, body }) {
  const canonical = absoluteUrl(origin, route);
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImage = escapeHtml(absoluteUrl(origin, image));
  const metadata = [
    `<meta name="description" content="${safeDescription}" />`,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    '<meta name="robots" content="index,follow" />',
    `<meta property="og:title" content="${safeTitle}" />`,
    `<meta property="og:description" content="${safeDescription}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:image" content="${safeImage}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${safeTitle}" />`,
    `<meta name="twitter:description" content="${safeDescription}" />`,
    `<meta name="twitter:image" content="${safeImage}" />`,
  ].join('\n    ');

  const withTitle = template.replace(/<title>[^<]*<\/title>/i, `<title>${safeTitle}</title>`);
  const withHead = withTitle.replace('</head>', `    ${metadata}\n  </head>`);
  const root = `<div id="root" data-prerendered="true">${body}</div>`;
  if (!withHead.includes('<div id="root"></div>')) {
    throw new Error('Vite HTML template is missing an empty #root.');
  }
  return withHead.replace('<div id="root"></div>', root);
}

export function buildSitemap(origin, entries) {
  const urls = [...entries]
    .sort((a, b) => a.route.localeCompare(b.route))
    .map(({ route }) => `  <url><loc>${escapeHtml(absoluteUrl(origin, route))}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function buildRobots(origin) {
  return `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${origin}/sitemap.xml\n`;
}

export async function writeRoute(distDir, route, html, writeFile) {
  const output = routeOutputPath(distDir, route);
  await writeFile(output, html, 'utf8');
  return relative(distDir, output);
}

export async function ensureRouteDirectory(distDir, route, mkdir) {
  await mkdir(dirname(routeOutputPath(distDir, route)), { recursive: true });
}
