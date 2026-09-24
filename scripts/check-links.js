#!/usr/bin/env node
'use strict';

// Fails if any local href or src in index.html or blog/*.html points at a
// file that does not exist, or if a post is missing from posts.json.

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const posts = new Set(JSON.parse(fs.readFileSync(path.join(root, 'posts.json'), 'utf8')).map((p) => p.slug));
const pages = ['index.html', '404.html'].concat(
  fs.readdirSync(path.join(root, 'blog')).filter((f) => f.endsWith('.html')).map((f) => path.join('blog', f)));

let bad = 0;
for (const page of pages) {
  const file = path.join(root, page);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  const dir = path.dirname(file);
  for (const m of html.matchAll(/\s(?:href|src)="([^"#?]+)[^"]*"/g)) {
    const target = m[1];
    if (/^(https?:|mailto:|data:|\/\/)/.test(target)) continue;
    const resolved = target.startsWith('/') ? path.join(root, target) : path.join(dir, target);
    if (!fs.existsSync(resolved)) {
      console.error(`${page}: ${target} does not exist`);
      bad++;
    }
  }
  const slug = path.basename(page, '.html');
  if (page.startsWith('blog/') && slug !== 'index' && !posts.has(slug)) {
    console.error(`${page}: not in posts.json`);
    bad++;
  }
}
if (bad) process.exit(1);
console.log(`ok: ${pages.length} pages, all local links resolve`);
