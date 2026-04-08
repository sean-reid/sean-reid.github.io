# sean-reid.github.io

Personal website and project portfolio. Plain HTML/CSS/JS, no build step, hosted on GitHub Pages.

**[sean-reid.github.io](https://sean-reid.github.io/)**

## Structure

```
index.html          Landing page
nav.css             Shared nav/footer styles
nav.js              Search (Fuse.js), random, keyboard shortcuts
favicon.svg         SVG favicon (adapts to light/dark mode)
screenshot.js       Puppeteer script for project screenshots
blog/
  style.css         Shared stylesheet for writeups
  img/              Project screenshots (WebP)
  *.html            Individual project writeups (33)
```

## Adding a project

1. Create a new HTML file in `blog/` using any existing writeup as a template (includes static nav, footer, and script/css links)
2. Add an entry to `index.html` (featured grid or project list)
3. Run `node screenshot.js <name>` to capture the screenshot
