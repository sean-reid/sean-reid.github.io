#!/usr/bin/env node
'use strict';

// Runs build.js against a scratch copy of the site with posts stripped of
// their summary line, button row, or image, and checks the output.

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'site-'));
fs.cpSync(root, tmp, {
  recursive: true,
  filter: (src) => !/[\\/](\.git|node_modules)([\\/]|$)/.test(src),
});

const postFile = path.join(tmp, 'blog', 'haiku.html');
const original = fs.readFileSync(postFile, 'utf8');
const postsFile = path.join(tmp, 'posts.json');
const originalPosts = fs.readFileSync(postsFile, 'utf8');

function build() {
  return spawnSync('node', ['build.js'], { cwd: tmp, encoding: 'utf8' });
}

function setPost(html, fields = {}, slug = 'haiku') {
  const file = path.join(tmp, 'blog', `${slug}.html`);
  fs.writeFileSync(file, html);
  const posts = JSON.parse(originalPosts);
  Object.assign(posts.find((p) => p.slug === slug), fields);
  fs.writeFileSync(postsFile, JSON.stringify(posts));
}

const description = { description: 'A screensaver that writes haiku.' };

const bare = original
  .replace(/\s*<p class="meta">[\s\S]*?<\/p>/, '')
  .replace(/\s*<p class="links-row">[\s\S]*?<\/p>/, '');

try {
  setPost(bare);
  let r = build();
  assert.strictEqual(r.status, 1, 'a post with no summary and no description must fail');
  assert.match(r.stderr, /haiku: no <p class="meta"> and no "description" in posts.json/);

  setPost(original.replace(/<p class="meta">[\s\S]*?<\/p>/, '<p class="meta"></p>'), description);
  r = build();
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(fs.readFileSync(postFile, 'utf8'), /<meta name="description" content="A screensaver that writes haiku\.">/);

  setPost(original, description);
  r = build();
  assert.strictEqual(r.status, 0, r.stderr);
  assert.doesNotMatch(fs.readFileSync(postFile, 'utf8'), /<meta name="description" content="A screensaver that writes haiku\.">/);

  setPost(original.replace(/(<p class="links-row">[\s\S]*?)<a href="[^"]*">Source<\/a>/, '$1'));
  r = build();
  assert.strictEqual(r.status, 1, 'a links-row without a source link must fail');
  assert.match(r.stderr, /haiku: links-row has no source link/);

  setPost(bare, description);
  r = build();
  assert.strictEqual(r.status, 0, r.stderr);
  let out = fs.readFileSync(postFile, 'utf8');
  assert.match(out, /<meta name="description" content="A screensaver that writes haiku\.">/);
  assert.match(out, /og:image" content="https:\/\/seanre\.id\/blog\/img\/haiku\.webp"/);

  const noImage = bare.replace(/<figure>[\s\S]*?<\/figure>/, '');
  setPost(noImage, description);
  r = build();
  assert.strictEqual(r.status, 0, r.stderr);
  out = fs.readFileSync(postFile, 'utf8');
  assert.doesNotMatch(out, /og:image/);
  assert.match(out, /twitter:card" content="summary"/);

  setPost(noImage.replace('</article>', '</article><img src="img/tron.webp" alt="">'), { ...description, image: 'img/haiku.webp' });
  r = build();
  assert.strictEqual(r.status, 0, r.stderr);
  out = fs.readFileSync(postFile, 'utf8');
  assert.match(out, /og:image" content="https:\/\/seanre\.id\/blog\/img\/haiku\.webp"/);
  assert.match(out, /twitter:card" content="summary_large_image"/);

  setPost(noImage, { ...description, image: 'img/missing.webp' });
  r = build();
  assert.strictEqual(r.status, 1, 'a posts.json image that does not exist must fail');
  assert.match(r.stderr, /haiku: hero image img\/missing\.webp missing/);

  setPost(original);
  const first = JSON.parse(originalPosts)[0].slug;
  const firstFile = path.join(tmp, 'blog', `${first}.html`);
  const firstOriginal = fs.readFileSync(firstFile, 'utf8');
  setPost(firstOriginal.replace(/<figure[^>]*>[\s\S]*?<\/figure>/g, ''), {}, first);
  r = build();
  assert.strictEqual(r.status, 1, 'the first post must have an image');
  assert.match(r.stderr, new RegExp(`${first}: the first post feeds the index og:image`));

  setPost(firstOriginal, {}, first);
  r = build();
  assert.strictEqual(r.status, 0, r.stderr);
  for (const f of ['index.html', 'search.json', 'feed.xml', 'blog/haiku.html', `blog/${first}.html`]) {
    assert.ok(
      fs.readFileSync(path.join(tmp, f)).equals(fs.readFileSync(path.join(root, f))),
      `${f} must build to the committed file`,
    );
  }
  console.log('ok: build.js tolerates posts without a summary, buttons, or image');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
