#!/usr/bin/env node
'use strict';

// Generates index.html, per-post head metadata, search.json, sitemap.xml,
// feed.xml, robots.txt, and 404.html from site.json, posts.json, and the
// post files under blog/. `node build.js --check` fails if any output on
// disk differs from what it would write.

const fs = require('fs');
const path = require('path');

const root = __dirname;
const check = process.argv.includes('--check');
const site = JSON.parse(fs.readFileSync(path.join(root, 'site.json'), 'utf8'));
const posts = JSON.parse(fs.readFileSync(path.join(root, 'posts.json'), 'utf8'));
const nav = fs.readFileSync(path.join(root, 'templates', 'nav.html'), 'utf8').trim();
const footer = fs.readFileSync(path.join(root, 'templates', 'footer.html'), 'utf8').trim();

const outputs = new Map();
const errors = [];

function fail(msg) {
  errors.push(msg);
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function text(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function imageSize(file) {
  let buf;
  try {
    buf = fs.readFileSync(file);
  } catch (e) {
    return null;
  }
  if (buf.length < 30) return null;
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = buf.toString('ascii', 12, 16);
    if (chunk === 'VP8 ') {
      return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    }
    if (chunk === 'VP8L') {
      const b0 = buf[21], b1 = buf[22], b2 = buf[23], b3 = buf[24];
      return { w: 1 + (((b1 & 0x3f) << 8) | b0), h: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)) };
    }
    if (chunk === 'VP8X') {
      return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
    }
    return null;
  }
  if (buf.toString('ascii', 0, 3) === 'GIF') {
    return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
  }
  if (buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  return null;
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? m[1] : null;
}

function extract(slug, html) {
  const h1 = html.match(/<h1>([\s\S]*?)<\/h1>/);
  const meta = html.match(/<p class="meta">([\s\S]*?)<\/p>/);
  const links = html.match(/<p class="links-row">([\s\S]*?)<\/p>/);
  const hero = html.match(/<article>[\s\S]*?<img[^>]*>/);
  const article = html.match(/<article>([\s\S]*?)<\/article>/);
  if (!h1) fail(`${slug}: no <h1>`);
  if (!meta) fail(`${slug}: no <p class="meta">`);
  if (!links) fail(`${slug}: no <p class="links-row">`);
  if (!hero) fail(`${slug}: no hero image in <article>`);
  if (!article) fail(`${slug}: no <article>`);
  const anchors = links ? [...links[1].matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)] : [];
  const demo = anchors.find((a) => /demo|download|play|site/i.test(a[2]));
  const source = anchors.find((a) => /source/i.test(a[2]));
  if (!demo) fail(`${slug}: links-row has no demo link`);
  if (!source) fail(`${slug}: links-row has no source link`);
  const heroTag = hero ? hero[0].match(/<img[^>]*>/)[0] : '';
  return {
    title: h1 ? text(h1[1]) : slug,
    meta: meta ? text(meta[1]) : '',
    demo: demo ? demo[1] : '',
    demoLabel: demo ? demo[2] : '',
    source: source ? source[1] : '',
    heroSrc: attr(heroTag, 'src') || '',
    body: article ? text(article[1]) : '',
  };
}

function headBlock(post, info) {
  const url = `${site.url}/blog/${post.slug}.html`;
  const image = `${site.url}/blog/${info.heroSrc}`;
  return [
    `    <meta name="description" content="${esc(info.meta)}">`,
    `    <link rel="canonical" href="${url}">`,
    `    <link rel="alternate" type="application/atom+xml" title="${esc(site.name)}" href="/feed.xml">`,
    `    <meta property="og:type" content="article">`,
    `    <meta property="og:site_name" content="${esc(site.name)}">`,
    `    <meta property="og:title" content="${esc(info.title)}">`,
    `    <meta property="og:description" content="${esc(info.meta)}">`,
    `    <meta property="og:url" content="${url}">`,
    `    <meta property="og:image" content="${image}">`,
    `    <meta property="article:published_time" content="${post.date}">`,
    `    <meta name="twitter:card" content="summary_large_image">`,
  ].join('\n');
}

const generatedHead = /^\s*<(?:meta (?:name="description"|property="og:[^"]*"|property="article:[^"]*"|name="twitter:[^"]*")|link rel="(?:canonical|alternate)")[^>]*>\s*\n/gm;

function renderPost(post, html) {
  const info = extract(post.slug, html);
  let out = html.replace(generatedHead, '');
  out = out.replace(/\n?\s*<\/head>/, `\n${headBlock(post, info)}\n</head>`);
  out = out.replace(/<nav class="site-nav">[\s\S]*?<\/nav>/, nav);
  out = out.replace(/<footer class="site-footer">[\s\S]*?<\/footer>/, footer);
  out = out.replace(/\s*<p class="date">[\s\S]*?<\/p>/, '');
  out = out.replace(/<img([^>]*)>/g, (tag, attrs) => {
    const src = attr(tag, 'src');
    if (!src || /^https?:/.test(src) || /\.svg$/.test(src)) return tag;
    if (/\swidth="/.test(attrs)) return tag;
    const size = imageSize(path.join(root, 'blog', src));
    if (!size) {
      fail(`${post.slug}: cannot read image size for ${src}`);
      return tag;
    }
    return `<img${attrs} width="${size.w}" height="${size.h}">`;
  });
  return { out, info };
}

function card(post, info) {
  return `                <a href="/blog/${post.slug}.html" class="project-link"><div class="project">
                    <div class="project-name">${esc(post.name)}</div>
                    <p class="project-desc">${esc(info.meta)}</p>
                </div></a>`;
}

function listItem(post) {
  return `                <li><a href="/blog/${post.slug}.html"><span class="project-list-name">${esc(post.name)}</span> <span class="list-desc">${esc(post.desc)}</span></a></li>`;
}

function renderIndex(infos) {
  const featured = posts.slice(0, site.featuredCount);
  const groups = site.groups.map((g) => ({
    ...g,
    posts: posts.filter((p) => p.group === g.id),
  }));
  const bio = site.bio.map((p) => `            <p>${esc(p)}</p>`).join('\n');
  const links = site.links.map((l) => `<a href="${l.href}">${esc(l.label)}</a>`).join('\n                ');
  const sections = groups.map((g) => `        <section class="group" id="${g.id}">
            <h2>${esc(g.label)}</h2>
            <ul class="project-list">
${g.posts.map(listItem).join('\n')}
            </ul>
        </section>`).join('\n\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content">
    <title>${esc(site.name)}</title>
    <meta name="description" content="${esc(site.description)}">
    <link rel="canonical" href="${site.url}/">
    <link rel="alternate" type="application/atom+xml" title="${esc(site.name)}" href="/feed.xml">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${esc(site.name)}">
    <meta property="og:title" content="${esc(site.name)}">
    <meta property="og:description" content="${esc(site.description)}">
    <meta property="og:url" content="${site.url}/">
    <meta property="og:image" content="${site.url}/blog/${infos.get(featured[0].slug).heroSrc}">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="stylesheet" href="/home.css">
    <link rel="stylesheet" href="/nav.css">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
</head>
<body>
${nav}
    <main class="site-content">
    <div class="container">

        <header class="intro">
            <h1>${esc(site.name)}</h1>
${bio}
            <p class="intro-links">
                ${links}
                <a href="/feed.xml">Feed</a>
            </p>
        </header>

        <section class="projects">
            <h2>Featured</h2>
            <div class="featured-grid">
${featured.map((p) => card(p, infos.get(p.slug))).join('\n\n')}
            </div>
        </section>

${sections}

    </div>
    </main>
${footer}
    <script src="/nav.js"></script>
</body>
</html>
`;
}

function renderSitemap() {
  const urls = [`  <url><loc>${site.url}/</loc></url>`].concat(
    posts.map((p) => `  <url><loc>${site.url}/blog/${p.slug}.html</loc><lastmod>${p.date}</lastmod></url>`));
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}

function renderFeed(infos) {
  const byDate = [...posts].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const updated = byDate[0].date;
  const entries = byDate.map((p) => {
    const info = infos.get(p.slug);
    const url = `${site.url}/blog/${p.slug}.html`;
    return `  <entry>
    <title>${esc(info.title)}</title>
    <link href="${url}"/>
    <id>${url}</id>
    <updated>${p.date}T00:00:00Z</updated>
    <summary>${esc(info.meta)}</summary>
  </entry>`;
  });
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${esc(site.name)}</title>
  <link href="${site.url}/"/>
  <link href="${site.url}/feed.xml" rel="self"/>
  <id>${site.url}/</id>
  <updated>${updated}T00:00:00Z</updated>
  <author><name>${esc(site.name)}</name></author>
${entries.join('\n')}
</feed>
`;
}

function renderNotFound() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content">
    <title>Not found - ${esc(site.name)}</title>
    <meta name="robots" content="noindex">
    <link rel="stylesheet" href="/blog/style.css">
    <link rel="stylesheet" href="/nav.css">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
</head>
<body>
${nav}
    <main class="site-content">
    <div class="container">
        <header>
            <h1>Not found</h1>
            <p class="meta">There is no page at this address. Try the search, or go back to <a href="/">the list of projects</a>.</p>
        </header>
    </div>
    </main>
${footer}
    <script src="/nav.js"></script>
</body>
</html>
`;
}

function main() {
  const blogDir = path.join(root, 'blog');
  const files = fs.readdirSync(blogDir).filter((f) => f.endsWith('.html') && f !== 'index.html');
  const slugs = new Set(posts.map((p) => p.slug));
  for (const f of files) {
    if (!slugs.has(f.replace(/\.html$/, ''))) fail(`blog/${f} has no entry in posts.json`);
  }
  const groupIds = new Set(site.groups.map((g) => g.id));
  const infos = new Map();
  const search = [];
  for (const post of posts) {
    const file = path.join(blogDir, `${post.slug}.html`);
    if (!fs.existsSync(file)) {
      fail(`posts.json: blog/${post.slug}.html does not exist`);
      continue;
    }
    if (!groupIds.has(post.group)) fail(`${post.slug}: unknown group ${post.group}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(post.date)) fail(`${post.slug}: bad date ${post.date}`);
    const { out, info } = renderPost(post, fs.readFileSync(file, 'utf8'));
    if (!fs.existsSync(path.join(blogDir, info.heroSrc))) fail(`${post.slug}: hero image ${info.heroSrc} missing`);
    infos.set(post.slug, info);
    outputs.set(path.join('blog', `${post.slug}.html`), out);
    search.push({ href: `/blog/${post.slug}.html`, title: info.title, meta: info.meta, body: info.body });
  }
  if (errors.length) {
    for (const e of errors) console.error(e);
    process.exit(1);
  }
  outputs.set('index.html', renderIndex(infos));
  outputs.set('search.json', JSON.stringify(search));
  outputs.set('sitemap.xml', renderSitemap());
  outputs.set('feed.xml', renderFeed(infos));
  outputs.set('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
  outputs.set('404.html', renderNotFound());

  const stale = [];
  for (const [rel, content] of outputs) {
    const file = path.join(root, rel);
    const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (current === content) continue;
    stale.push(rel);
    if (!check) fs.writeFileSync(file, content);
  }
  if (check) {
    if (stale.length) {
      console.error(`out of date: ${stale.join(', ')}\nrun: node build.js`);
      process.exit(1);
    }
    console.log(`ok: ${outputs.size} files current`);
  } else {
    console.log(`wrote ${stale.length} of ${outputs.size} files`);
  }
}

main();
