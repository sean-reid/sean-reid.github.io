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

function setPost(html, description) {
  fs.writeFileSync(postFile, html);
  const posts = JSON.parse(originalPosts);
  if (description) posts.find((p) => p.slug === 'haiku').description = description;
  fs.writeFileSync(postsFile, JSON.stringify(posts));
}

const bare = original
  .replace(/\s*<p class="meta">[\s\S]*?<\/p>/, '')
  .replace(/\s*<p class="links-row">[\s\S]*?<\/p>/, '');

try {
  setPost(bare);
  let r = build();
  assert.strictEqual(r.status, 1, 'a post with no summary and no description must fail');
  assert.match(r.stderr, /haiku: no <p class="meta"> and no "description" in posts.json/);

  setPost(bare, 'A screensaver that writes haiku.');
  r = build();
  assert.strictEqual(r.status, 0, r.stderr);
  let out = fs.readFileSync(postFile, 'utf8');
  assert.match(out, /<meta name="description" content="A screensaver that writes haiku\.">/);
  assert.match(out, /og:image" content="https:\/\/seanre\.id\/blog\/img\/haiku\.webp"/);

  const noImage = bare.replace(/<figure>[\s\S]*?<\/figure>/, '');
  setPost(noImage, 'A screensaver that writes haiku.');
  r = build();
  assert.strictEqual(r.status, 0, r.stderr);
  out = fs.readFileSync(postFile, 'utf8');
  assert.doesNotMatch(out, /og:image/);
  assert.match(out, /twitter:card" content="summary"/);

  setPost(original);
  r = build();
  assert.strictEqual(r.status, 0, r.stderr);
  console.log('ok: build.js tolerates posts without a summary, buttons, or image');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
