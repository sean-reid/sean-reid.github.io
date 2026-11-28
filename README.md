# sean-reid.github.io

Personal site and project writeups, at [seanre.id](https://seanre.id/). Static HTML on GitHub Pages. A small Node script generates the homepage, the publications page, the per-post metadata, the search index, the sitemap, and the feed from two manifests and the post files.

## Layout

```
site.json           Name, bio, links, project groups
posts.json          One entry per post: slug, name, short line, group, date, a description for a
                    post without a meta line, and optionally an image. Order is rank.
publications.json   One entry per paper: title, one line, venue, date, links. Order is display order.
build.js            Writes index.html, publications.html, search.json, sitemap.xml, feed.xml,
                    robots.txt, 404.html, and rewrites each post's head metadata, nav, footer,
                    and image sizes
templates/          Nav and footer shared by every page
home.css            Homepage styles
publications.css    Publications page styles
nav.css, nav.js     Color palette, shared nav, search, random, KaTeX loading
scripts/            check-links.js: every local href and src resolves; test-build.js: the
                    build handles posts without a meta line, links, or image
screenshot.js       Puppeteer captures of the live projects into blog/img/<slug>.webp
blog/<slug>.html    One writeup per project
blog/style.css      Writeup styles
blog/img/           Hero screenshots and figures
```

## Adding a project

1. Copy a writeup in `blog/` with the layout you want to `blog/<slug>.html`. Change the title, preload, h1, images, links, and the article. A post without a meta line needs a description in `posts.json`. Leave the nav and footer alone; the build replaces them.
2. Add an entry to `posts.json` at the position it should rank. The first eight entries are the featured cards.
3. Add the site to `screenshot.js` and run `npm run screenshot -- <slug>`. It needs `cwebp` on the path.
4. Run `npm run build`, then `npm run check`. Commit the generated files with the post.

## Adding a publication

Add an entry to `publications.json` with the title, a one-line description, the venue, the date, and the links. The first link is the one the title points at. Run `npm run build` and commit the generated page with it.

## Checks

`npm run check` fails if any generated file is out of date, any local link is broken, or the build mishandles a post without a meta line, links, or image. CI runs the same three commands on every push and pull request.
