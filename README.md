# sean-reid.github.io

Personal site and project writeups, at [sean-reid.github.io](https://sean-reid.github.io/). Static HTML on GitHub Pages. A small Node script generates the homepage, the per-post metadata, the search index, the sitemap, and the feed from a manifest and the post files.

## Layout

```
site.json           Name, bio, links, project groups
posts.json          One entry per post: slug, name, short line, group, date. Order is rank.
build.js            Writes index.html, search.json, sitemap.xml, feed.xml, robots.txt, 404.html,
                    and rewrites each post's head metadata, nav, footer, date line, and image sizes
templates/          Nav and footer shared by every page
home.css            Homepage styles
nav.css, nav.js     Shared nav, search, random, KaTeX loading
scripts/            check-links.js: every local href and src resolves
screenshot.js       Puppeteer captures of the live projects into blog/img/<slug>.webp
blog/<slug>.html    One writeup per project
blog/style.css      Writeup styles
blog/img/           Hero screenshots and figures
```

## Adding a project

1. Copy any writeup in `blog/` to `blog/<slug>.html`. Change the title, preload, h1, meta line, the two links, the hero image, and the article. Leave the nav and footer alone; the build replaces them.
2. Add an entry to `posts.json` at the position it should rank. The first eight entries are the featured cards.
3. Add the site to `screenshot.js` and run `npm run screenshot -- <slug>`. It needs `cwebp` on the path.
4. Run `npm run build`, then `npm run check`. Commit the generated files with the post.

## Checks

`npm run check` fails if any generated file is out of date or any local link is broken. CI runs the same two commands on every push and pull request.
