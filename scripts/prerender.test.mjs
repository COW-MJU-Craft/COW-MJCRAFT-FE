import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRobots,
  buildSitemap,
  normalizeOrigin,
  renderDocument,
  routeOutputPath,
  seoImage,
} from './prerender-lib.mjs';

test('route metadata is route-specific and never uses localhost', () => {
  const html = renderDocument(
    '<html><head><title>명지공방</title></head><body><div id="root"></div></body></html>',
    {
      origin: normalizeOrigin('https://mju-craft.shop'),
      route: '/projects/12',
      title: '프로젝트 | 명지공방',
      description: '프로젝트 소개',
      image: '/logo.png',
      body: '<main><h1>프로젝트</h1></main>',
    },
  );

  assert.match(html, /<link rel="canonical" href="https:\/\/mju-craft\.shop\/projects\/12"/);
  assert.match(html, /<h1>프로젝트<\/h1>/);
  assert.doesNotMatch(html, /localhost/);
});

test('sitemap and robots reserve Disallow for private admin routes', () => {
  const origin = 'https://mju-craft.shop';
  const sitemap = buildSitemap(origin, [{ route: '/' }, { route: '/projects/1' }]);
  assert.match(sitemap, /https:\/\/mju-craft\.shop\/projects\/1/);
  const robots = buildRobots(origin);
  assert.match(robots, /Disallow: \/admin\//);
  assert.doesNotMatch(robots, /Disallow: \/(?:cart|order|orders|mypage|login|apply|feedback|payouts)/);
});

test('route output cannot leave dist directory', () => {
  assert.throws(() => routeOutputPath('/tmp/dist', '/../outside'));
});

test('prerender images are wrapped in noscript and escaped', () => {
  const html = seoImage('/seo-media/a.webp?x=1&y="2"', '입학키트 <특별>');

  assert.equal(
    html,
    '<noscript><img src="/seo-media/a.webp?x=1&amp;y=&quot;2&quot;" alt="입학키트 &lt;특별&gt;" /></noscript>',
  );
  assert.doesNotMatch(html.replace(/<\/?noscript>/g, ''), /<img[^>]*>[^<]*<img/);
});
