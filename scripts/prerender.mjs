import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadEnv } from 'vite';
import {
  absoluteUrl,
  buildRobots,
  buildSitemap,
  ensureRouteDirectory,
  escapeHtml,
  normalizeOrigin,
  renderDocument,
  stripMarkup,
  summary,
  writeRoute,
} from './prerender-lib.mjs';

const rootDir = process.cwd();
const distDir = resolve(rootDir, 'dist');
const env = loadEnv('production', rootDir, '');
const apiBase = (process.env.VITE_API_BASE_URL ?? env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const siteOrigin = normalizeOrigin(process.env.SITE_ORIGIN ?? env.VITE_SITE_ORIGIN);

if (!apiBase) throw new Error('VITE_API_BASE_URL is required for prerendering.');

const apiOrigin = new URL(apiBase).origin;
const defaultImage = `${siteOrigin}/mjucraftLogo_Blue_Round.png`;
const template = await readFile(resolve(distDir, 'index.html'), 'utf8');
const entries = [];
const counts = { static: 0, projects: 0, items: 0, notices: 0 };
const media = new Map();
let mediaFallbacks = 0;

function unwrap(payload) {
  if (payload && typeof payload === 'object' && 'resultType' in payload) {
    if (payload.resultType !== 'SUCCESS') {
      throw new Error(payload.message || 'Public API returned a failure envelope.');
    }
    return payload.data;
  }
  return payload;
}

async function getPublic(path, { allow404 = false } = {}) {
  const url = new URL(`${apiBase}${path}`);
  if (url.origin !== apiOrigin) throw new Error(`Blocked non-public API origin: ${url.origin}`);

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    redirect: 'manual',
  });
  if (response.status === 404 && allow404) return null;
  if (!response.ok) throw new Error(`Public API failed: ${path} (${response.status})`);
  return unwrap(await response.json());
}

function array(value, name) {
  if (!Array.isArray(value)) throw new Error(`Expected an array from ${name}.`);
  return value;
}

function text(value, fallback = '') {
  return stripMarkup(value) || fallback;
}

function extension(contentType) {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  if (contentType.includes('svg')) return 'svg';
  return 'jpg';
}

async function image(value) {
  if (!value) return defaultImage;

  const source = new URL(value, `${siteOrigin}/`);
  if (source.origin === siteOrigin) return source.href;
  if (source.protocol !== 'https:' || source.hostname === 'localhost') {
    console.warn(`prerender: skipped unsafe image URL ${source.href}`);
    mediaFallbacks += 1;
    return defaultImage;
  }

  // MinIO 이미지 URL은 짧은 만료 시간의 서명을 포함한다. 경로를 기준으로 파일명을
  // 고정해 빌드마다 동일한 공개 asset URL을 만들고, 서명은 다운로드에만 사용한다.
  const key = `${source.origin}${source.pathname}`;
  if (media.has(key)) return media.get(key);

  const filename = `${createHash('sha256').update(key).digest('hex').slice(0, 16)}.jpg`;
  const target = `/seo-media/${filename}`;
  const output = resolve(distDir, target.slice(1));

  try {
    const response = await fetch(source, { redirect: 'manual' });
    const contentType = response.headers.get('content-type') ?? '';
    if (!response.ok || !contentType.startsWith('image/')) {
      throw new Error(`status=${response.status}, content-type=${contentType || 'unknown'}`);
    }
    const finalTarget = target.replace(/\.jpg$/, `.${extension(contentType)}`);
    await mkdir(resolve(distDir, 'seo-media'), { recursive: true });
    await writeFile(resolve(distDir, finalTarget.slice(1)), Buffer.from(await response.arrayBuffer()));
    media.set(key, finalTarget);
    return finalTarget;
  } catch (error) {
    console.warn(`prerender: image fallback for ${source.pathname} (${error.message})`);
    mediaFallbacks += 1;
    media.set(key, defaultImage);
    return defaultImage;
  }
}

function projectPath(projectId) {
  return `/projects/${encodeURIComponent(String(projectId))}`;
}

function itemPath(projectId, itemId) {
  return `${projectPath(projectId)}/items/${encodeURIComponent(String(itemId))}`;
}

function noticePath(noticeId) {
  return `/notices/${encodeURIComponent(String(noticeId))}`;
}

function pageShell({ heading, description, children = '' }) {
  return `<main><header><p>명지공방</p><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(description)}</p></header>${children}</main>`;
}

async function projectCard(project) {
  const href = projectPath(project.id);
  const title = text(project.title, '프로젝트');
  const description = summary(normalizeBrandCopy(project.summary), '명지공방 프로젝트');
  const thumbnail = await image(project.thumbnailUrl);
  return `<article><a href="${escapeHtml(href)}"><img src="${escapeHtml(thumbnail)}" alt="${escapeHtml(title)}" /><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></a></article>`;
}

async function itemCard(projectId, item) {
  const href = itemPath(projectId, item.id);
  const title = text(item.name, '상품');
  const description = summary(normalizeBrandCopy(item.description ?? item.summary), `${title} 상품 정보`);
  const thumbnail = await image(item.thumbnailUrl);
  return `<article><a href="${escapeHtml(href)}"><img src="${escapeHtml(thumbnail)}" alt="${escapeHtml(title)}" /><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p><p>${escapeHtml(Number(item.price ?? 0).toLocaleString('ko-KR'))}원</p></a></article>`;
}

async function addPage({ route, title, description, image: pageImage, body, category }) {
  const html = renderDocument(template, {
    origin: siteOrigin,
    route,
    title,
    description,
    image: pageImage,
    body,
  });
  await ensureRouteDirectory(distDir, route, mkdir);
  await writeRoute(distDir, route, html, writeFile);
  entries.push({ route });
  counts[category] += 1;
}

async function getItem(projectId, itemId) {
  const direct = await getPublic(`/items/${encodeURIComponent(String(itemId))}`, { allow404: true });
  if (direct) return direct;
  return getPublic(
    `/projects/${encodeURIComponent(String(projectId))}/items/${encodeURIComponent(String(itemId))}`,
    { allow404: true },
  );
}

const [projectsPayload, noticesPayload, introMainPayload, introPayload] = await Promise.all([
  getPublic('/projects'),
  getPublic('/notices'),
  getPublic('/introduce/main', { allow404: true }),
  getPublic('/introduce', { allow404: true }),
]);

const projects = array(projectsPayload, '/projects').sort((a, b) => String(a.id).localeCompare(String(b.id)));
const notices = array(noticesPayload, '/notices').sort((a, b) => String(a.id).localeCompare(String(b.id)));
const introMain = introMainPayload ?? {};
const intro = introPayload ?? {};

function normalizeBrandCopy(value) {
  return String(value ?? '')
    .replaceAll('(明智工房)', '')
    .replace(/본 프로젝트는 명지대학교와 무관하며,\s*교내\s+창업\s*동아리\s+소속\s*[‘’']?명지공방[‘’']?이\s+기획\s+및\s+프로젝트를\s+진행합니다\./g, '명지대학교 굿즈 제작 동아리 ‘명지공방’이 기획 및 프로젝트를 진행합니다.')
    .replace(/This project has nothing to do with Myongji University\.\s*MJU Craft, a member of the school.?s start up club, will carry out the planning and project\./gi, "MJU Craft, Myongji University's merchandise-making club, plans and runs this project.")
    .replace(/명지대학교\s+비공식\s+굿즈\s+제작\s+프로젝트\s+팀/g, '명지대학교 굿즈 제작 동아리')
    .replace(/명지대학교\s+창업\s*동아리\s+소속\s+자체\s+제작\s+굿즈\s+프로젝트\s+팀/g, '명지대학교 굿즈 제작 동아리');
}

const homeTitle = text(normalizeBrandCopy(introMain.title), '명지공방');
const homeDescription = summary(normalizeBrandCopy(introMain.summary ?? introMain.subtitle), '명지대학교 굿즈 제작 동아리 명지공방입니다.');
const projectCards = await Promise.all(projects.map(projectCard));
await addPage({
  route: '/',
  title: `${homeTitle} | 명지공방`,
  description: homeDescription,
  image: await image(introMain.heroLogos?.[0]?.imageUrl),
  category: 'static',
  body: pageShell({
    heading: homeTitle,
    description: homeDescription,
    children: `<section><h2>프로젝트</h2>${projectCards.join('')}</section><p><a href="/projects">모든 프로젝트 보기</a></p>`,
  }),
});

await addPage({
  route: '/projects',
  title: '프로젝트 목록 | 명지공방',
  description: '명지공방의 진행 중인 프로젝트와 상품을 확인하세요.',
  image: await image(projects[0]?.thumbnailUrl),
  category: 'static',
  body: pageShell({
    heading: '프로젝트 목록',
    description: '명지공방의 프로젝트와 상품을 확인하세요.',
    children: `<section>${projectCards.join('')}</section>`,
  }),
});

const aboutTitle = text(normalizeBrandCopy(intro.brand?.title ?? intro.intro?.title), '명지공방 소개');
const aboutDescription = summary(normalizeBrandCopy(intro.intro?.body ?? intro.purpose?.description), '명지공방의 소개와 활동 방향을 확인하세요.');
await addPage({
  route: '/about',
  title: `${aboutTitle} | 명지공방`,
  description: aboutDescription,
  image: await image(intro.currentLogo?.imageUrl),
  category: 'static',
  body: pageShell({ heading: aboutTitle, description: aboutDescription }),
});

await addPage({
  route: '/notices',
  title: '공지사항 | 명지공방',
  description: '명지공방 프로젝트 소식과 공지사항을 확인하세요.',
  image: await image(notices[0]?.imageUrls?.[0]),
  category: 'static',
  body: pageShell({
    heading: '공지사항',
    description: '명지공방 프로젝트 소식과 공지사항을 확인하세요.',
    children: `<section>${notices.map((notice) => `<article><a href="${escapeHtml(noticePath(notice.id))}"><h2>${escapeHtml(text(notice.title, '공지사항'))}</h2><p>${escapeHtml(summary(notice.content, '명지공방 공지사항'))}</p></a></article>`).join('')}</section>`,
  }),
});

for (const listedProject of projects) {
  const id = listedProject.id;
  const project = await getPublic(`/projects/${encodeURIComponent(String(id))}`, { allow404: true });
  if (!project) {
    console.warn(`prerender: skipped missing project ${id}`);
    continue;
  }

  const itemsPayload = await getPublic(`/projects/${encodeURIComponent(String(id))}/items`);
  const items = array(itemsPayload, `/projects/${id}/items`).sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const projectTitle = text(project.title, '프로젝트');
  const projectCopy = normalizeBrandCopy(project.description ?? project.summary);
  const projectDescription = summary(projectCopy, `${projectTitle} 프로젝트 소개`);
  const projectBody = text(projectCopy, projectDescription);
  const itemCards = await Promise.all(items.map((item) => itemCard(id, item)));
  await addPage({
    route: projectPath(id),
    title: `${projectTitle} | 명지공방`,
    description: projectDescription,
    image: await image(project.thumbnailUrl ?? project.imageUrls?.[0]),
    category: 'projects',
    body: pageShell({
      heading: projectTitle,
      description: projectDescription,
      children: `<p><a href="/projects">프로젝트 목록</a></p><section><h2>프로젝트 소개</h2><p>${escapeHtml(projectBody)}</p></section><section><h2>상품</h2>${itemCards.join('')}</section>`,
    }),
  });

  for (const listedItem of items) {
    const item = await getItem(id, listedItem.id);
    if (!item) {
      console.warn(`prerender: skipped missing item ${id}/${listedItem.id}`);
      continue;
    }
    const itemTitle = text(item.name, '상품');
    const itemCopy = normalizeBrandCopy(item.description ?? item.summary);
    const itemDescription = summary(itemCopy, `${itemTitle} 상품 정보`);
    const itemBody = text(itemCopy, itemDescription);
    const price = Number(item.price ?? 0).toLocaleString('ko-KR');
    const itemImage = await image(item.thumbnailUrl ?? project.thumbnailUrl);
    const itemPageTitle = itemTitle === projectTitle
      ? `${itemTitle} | 명지공방`
      : `${itemTitle} | ${projectTitle} | 명지공방`;
    await addPage({
      route: itemPath(id, item.id),
      title: itemPageTitle,
      description: itemDescription,
      image: itemImage,
      category: 'items',
      body: pageShell({
        heading: itemTitle,
        description: itemDescription,
        children: `<p>가격: ${escapeHtml(price)}원</p><p>프로젝트: <a href="${escapeHtml(projectPath(id))}">${escapeHtml(projectTitle)}</a></p><section><h2>상품 설명</h2><p>${escapeHtml(itemBody)}</p></section><img src="${escapeHtml(itemImage)}" alt="${escapeHtml(itemTitle)}" />`,
      }),
    });
  }
}

for (const listedNotice of notices) {
  const notice = await getPublic(`/notices/${encodeURIComponent(String(listedNotice.id))}`, { allow404: true });
  if (!notice) {
    console.warn(`prerender: skipped missing notice ${listedNotice.id}`);
    continue;
  }
  const title = text(notice.title, '공지사항');
  const description = summary(notice.content, '명지공방 공지사항');
  const images = Array.isArray(notice.imageUrls) ? notice.imageUrls.filter(Boolean) : [];
  const staticImages = await Promise.all(images.map(image));
  await addPage({
    route: noticePath(notice.id),
    title: `${title} | 명지공방`,
    description,
    image: staticImages[0],
    category: 'notices',
    body: pageShell({
      heading: title,
      description,
      children: `<p><a href="/notices">공지사항 목록</a></p><article><p>${escapeHtml(text(notice.content, description))}</p>${staticImages.map((url, index) => `<img src="${escapeHtml(url)}" alt="${escapeHtml(`${title} 이미지 ${index + 1}`)}" />`).join('')}</article>`,
    }),
  });
}

entries.sort((a, b) => a.route.localeCompare(b.route));
await writeFile(resolve(distDir, 'sitemap.xml'), buildSitemap(siteOrigin, entries), 'utf8');
await writeFile(resolve(distDir, 'robots.txt'), buildRobots(siteOrigin), 'utf8');
await writeFile(
  resolve(distDir, 'prerender-manifest.json'),
  `${JSON.stringify({ origin: siteOrigin, counts, routes: entries.map((entry) => entry.route) }, null, 2)}\n`,
  'utf8',
);

console.log(`prerender: static=${counts.static}, projects=${counts.projects}, items=${counts.items}, notices=${counts.notices}`);
console.log(`prerender: static media=${media.size}, fallbacks=${mediaFallbacks}`);
console.log('prerender: analytics isolation=Node public API fetch only; no browser or GA4 host executed');
