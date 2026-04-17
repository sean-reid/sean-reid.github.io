const puppeteer = require('puppeteer');
const path = require('path');

const outDir = path.join(__dirname, 'blog', 'img');

// Per-project interaction scripts
const interactions = {
  'crossword-generator': async (page) => {
    // Select a smaller grid size for faster generation
    const select = await page.$('select');
    if (select) {
      await select.select('5');  // Try smallest available option
      await new Promise(r => setTimeout(r, 300));
    }
    // Click generate
    await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        if (b.textContent.includes('Generate')) { b.click(); break; }
      }
    });
    // Wait up to 60s for generation to complete
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const done = await page.evaluate(() => {
        // Check if a crossword grid is visible (numbered cells, clue lists, etc)
        return document.querySelectorAll('td, .cell, [class*="grid"], [class*="clue"]').length > 10;
      });
      if (done) break;
    }
    await new Promise(r => setTimeout(r, 2000));
  },
  'gravity': async (page) => {
    // The callsign screen uses custom rendered elements, not a regular input
    // Click directly on the letter elements on screen
    await page.evaluate(() => {
      // Find all clickable letter elements and click S, E, A, N
      const letters = ['S', 'E', 'A', 'N'];
      const allEls = document.querySelectorAll('span, div, td, a, button');
      for (const letter of letters) {
        for (const el of allEls) {
          if (el.textContent.trim() === letter && el.offsetParent !== null) {
            el.click();
            break;
          }
        }
      }
    });
    await new Promise(r => setTimeout(r, 1000));
    // Click CONFIRM
    await page.evaluate(() => {
      const allEls = document.querySelectorAll('span, div, td, a, button');
      for (const el of allEls) {
        if (el.textContent.trim() === 'CONFIRM') {
          el.click();
          break;
        }
      }
    });
    await new Promise(r => setTimeout(r, 8000));
  },
  'sprouts': async (page) => {
    // Click "4 NODES" button to start
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('4')) {
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1000));
    // Try to draw a line between two nodes by clicking and dragging on the canvas
    const canvas = await page.$('canvas');
    if (canvas) {
      const box = await canvas.boundingBox();
      // Click near center-ish area to start a move, drag to another node
      await page.mouse.move(box.x + box.width * 0.43, box.y + box.height * 0.45);
      await page.mouse.down();
      await new Promise(r => setTimeout(r, 100));
      // Drag toward another node
      for (let i = 0; i < 20; i++) {
        await page.mouse.move(
          box.x + box.width * (0.43 + i * 0.008),
          box.y + box.height * (0.45 + i * 0.01)
        );
        await new Promise(r => setTimeout(r, 30));
      }
      await page.mouse.up();
      await new Promise(r => setTimeout(r, 500));
      // Click to place node
      await page.mouse.click(box.x + box.width * 0.55, box.y + box.height * 0.55);
    }
    await new Promise(r => setTimeout(r, 3000));
  },
  'papermaker': async (page) => {
    // Click generate paper and wait for PDF
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Generate')) {
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 15000));
  },
  'flow': async (page) => {
    // Paste text into the textarea
    const textarea = await page.$('textarea');
    if (textarea) {
      await textarea.click();
      await page.evaluate((el) => {
        el.value = 'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness, it was the spring of hope, it was the winter of despair, we had everything before us, we had nothing before us, we were all going direct to Heaven, we were all going direct the other way.';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, textarea);
      await new Promise(r => setTimeout(r, 500));
    }
    // Click every button/element that might say PARSE or READ
    await page.evaluate(() => {
      const allEls = document.querySelectorAll('button, a, div, span');
      for (const el of allEls) {
        if (el.textContent && el.textContent.includes('PARSE')) {
          el.click();
          break;
        }
      }
    });
    await new Promise(r => setTimeout(r, 5000));
  },
  'lacuna': async (page) => {
    // Just screenshot the lobby, it already looks good
    await new Promise(r => setTimeout(r, 2000));
  },
  'points': async (page) => {
    // Click points on the grid roughly forming an ellipse
    const canvas = await page.$('canvas');
    if (canvas) {
      const box = await canvas.boundingBox();
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      const r = Math.min(box.width, box.height) * 0.2;
      const angles = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2, Math.PI / 4];
      for (const a of angles) {
        await page.mouse.click(cx + r * Math.cos(a), cy + r * Math.sin(a));
        await new Promise(r => setTimeout(r, 300));
      }
    }
    await new Promise(r => setTimeout(r, 2000));
  },
  'brainrotter': async (page) => {
    // Click the generate button
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && (text.includes('ROT') || text.includes('rot') || text.includes('Generate'))) {
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 2000));
  },
  'haiku': async (page) => {
    // Wait for a haiku to appear
    await new Promise(r => setTimeout(r, 5000));
  },
  'what-are-you': async (page) => {
    // Just show the category selection screen
    await new Promise(r => setTimeout(r, 3000));
  },
  'the-count-of-monte-carlo': async (page) => {
    // Let convergence run for a bit
    await new Promise(r => setTimeout(r, 6000));
  },
  'frankenpeanuts': async (page) => {
    // Panels load from peanuts-search.com - can be flaky. Retry up to 10 times.
    for (let attempt = 0; attempt < 10; attempt++) {
      // Wait for images to attempt loading
      await new Promise(r => setTimeout(r, 15000));
      const loadedCount = await page.evaluate(() => {
        // Count actual rendered panel images (not loading/failed text)
        const imgs = document.querySelectorAll('img');
        let loaded = 0;
        for (const img of imgs) {
          if (img.naturalWidth > 50 && img.complete) loaded++;
        }
        return loaded;
      });
      console.log(`    attempt ${attempt + 1}: ${loadedCount} panels loaded`);
      if (loadedCount >= 4) break;
      // Click "New Comic" and try again
      await page.evaluate(() => {
        const els = document.querySelectorAll('button, a, div, span');
        for (const el of els) {
          if (el.textContent && el.textContent.includes('New Comic')) {
            el.click();
            break;
          }
        }
      });
    }
    await new Promise(r => setTimeout(r, 2000));
  },
  'perfect-hindsight': async (page) => {
    // Wait for chart to render
    await new Promise(r => setTimeout(r, 4000));
  },
  'creature-garden': async (page) => {
    // Click start, place some food
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Start')) {
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 500));
    // Click a few times to place food
    for (let i = 0; i < 5; i++) {
      await page.mouse.click(400 + i * 100, 400);
      await new Promise(r => setTimeout(r, 300));
    }
    await new Promise(r => setTimeout(r, 3000));
  },
  'entropy-bus': async (page) => {
    // Mash some keys
    const keys = 'qwertyuiopasdfghjklzxcvbnm1234567890';
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press(keys[Math.floor(Math.random() * keys.length)]);
      await new Promise(r => setTimeout(r, 50));
    }
    await new Promise(r => setTimeout(r, 1000));
  },
  'tron': async (page) => {
    // Wait for game to load, maybe press space/enter to start
    await new Promise(r => setTimeout(r, 2000));
    await page.keyboard.press('Space');
    await new Promise(r => setTimeout(r, 3000));
  },
  'meta-tictactoe': async (page) => {
    // Wait for board to load, click a cell
    await new Promise(r => setTimeout(r, 3000));
    await page.mouse.click(400, 300);
    await new Promise(r => setTimeout(r, 2000));
  },
  'wikipedia-unscrambler': async (page) => {
    // Click a difficulty button to load an article
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && (text.includes('Easy') || text.includes('easy'))) {
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 4000));
  },
  'nyt-crosswords': async (page) => {
    // Wait for the puzzle to load
    await new Promise(r => setTimeout(r, 4000));
  },
  'discern': async (page) => {
    // Wait for the game to load and first image to appear
    await new Promise(r => setTimeout(r, 8000));
  },
  'bananas-for-scale': async (page) => {
    // Wait for homepage to fully render with featured items
    await new Promise(r => setTimeout(r, 5000));
  },
  'bananas-for-scale-entry': async (page) => {
    // Wait for thing page to fully render with measurements and conversions
    await new Promise(r => setTimeout(r, 5000));
  },
  'deconflict': async (page) => {
    // Clear localStorage to get fresh state with sample buttons
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000));
    // Dismiss welcome dialog
    await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        if (b.textContent && b.textContent.includes('Get Started')) { b.click(); break; }
      }
    });
    await new Promise(r => setTimeout(r, 1000));
    // Click Floorplan tab (last one, near APs tab)
    await page.evaluate(() => {
      const fpBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.trim() === 'Floorplan');
      if (fpBtns.length) fpBtns[fpBtns.length - 1].click();
    });
    await new Promise(r => setTimeout(r, 1000));
    // Click Office sample
    await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        if (b.textContent && b.textContent.includes('Office')) { b.click(); break; }
      }
    });
    await new Promise(r => setTimeout(r, 4000));
    // Click Fit to center the floorplan
    await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        if (b.textContent.trim() === 'Fit') { b.click(); break; }
      }
    });
    await new Promise(r => setTimeout(r, 1000));
    // Place APs on the centered floorplan
    const canvas = await page.$('canvas');
    if (canvas) {
      const box = await canvas.boundingBox();
      const aps = [
        [0.25, 0.35], [0.5, 0.3], [0.35, 0.6], [0.6, 0.55]
      ];
      for (const [rx, ry] of aps) {
        await page.mouse.click(box.x + box.width * rx, box.y + box.height * ry);
        await new Promise(r => setTimeout(r, 600));
      }
    }
    // Toggle heatmap
    await page.keyboard.press('h');
    await new Promise(r => setTimeout(r, 2000));
  },
  'mastery': async (page) => {
    // Wait for page to load and animations to settle, then scroll down a bit to show skill cards
    await new Promise(r => setTimeout(r, 4000));
    await page.evaluate(() => window.scrollBy(0, 600));
    await new Promise(r => setTimeout(r, 2000));
  },
  'severed': async (page) => {
    // Wait for globe and data to load, then click a scenario
    await new Promise(r => setTimeout(r, 6000));
    // Try to click a scenario button (e.g., Red Sea)
    await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        if (b.textContent && b.textContent.includes('Red Sea')) { b.click(); break; }
      }
    });
    await new Promise(r => setTimeout(r, 4000));
  },
};

const sites = [
  { name: 'captcha-royale', url: 'https://sean-reid.github.io/captcha-royale/' },
  { name: 'crossword-generator', url: 'https://sean-reid.github.io/crossword-generator/' },
  { name: 'gravity', url: 'https://sean-reid.github.io/gravity/' },
  { name: 'sprouts', url: 'https://sean-reid.github.io/sprouts/' },
  { name: 'papermaker', url: 'https://sean-reid.github.io/papermaker/' },
  { name: 'flow', url: 'https://sean-reid.github.io/flow/' },
  { name: 'lacuna', url: 'https://sean-reid.github.io/lacuna/' },
  { name: 'anagram', url: 'https://sean-reid.github.io/anagram/' },
  { name: 'lasers', url: 'https://sean-reid.github.io/lasers/' },
  { name: 'meta-tictactoe', url: 'https://sean-reid.github.io/meta-tictactoe/' },
  { name: 'tron', url: 'https://sean-reid.github.io/tron/' },
  { name: 'points', url: 'https://sean-reid.github.io/points/' },
  { name: 'the-count-of-monte-carlo', url: 'https://sean-reid.github.io/the-count-of-monte-carlo/' },
  { name: 'creature-garden', url: 'https://sean-reid.github.io/creature-garden/' },
  { name: 'entropy-bus', url: 'https://sean-reid.github.io/entropy-bus/' },
  { name: 'wikipedia-unscrambler', url: 'https://sean-reid.github.io/wikipedia-unscrambler/' },
  { name: 'antibook', url: 'https://sean-reid.github.io/antibook/' },
  { name: 'perfect-hindsight', url: 'https://sean-reid.github.io/perfect-hindsight/' },
  { name: 'tongue-simulator', url: 'https://sean-reid.github.io/tongue-simulator/' },
  { name: 'frankenpeanuts', url: 'https://sean-reid.github.io/frankenpeanuts/' },
  { name: 'crochet-pattern-generator', url: 'https://sean-reid.github.io/crochet-pattern-generator/' },
  { name: 'how-will-i-die', url: 'https://sean-reid.github.io/how-will-i-die/' },
  { name: 'dependencies', url: 'https://sean-reid.github.io/dependencies/' },
  { name: 'haiku', url: 'https://sean-reid.github.io/haiku/' },
  { name: 'licenseplategame', url: 'https://sean-reid.github.io/licenseplategame/' },
  { name: 'what-are-you', url: 'https://sean-reid.github.io/what-are-you/' },
  { name: 'brainrotter', url: 'https://sean-reid.github.io/brainrotter/' },
  { name: 'nyt-crosswords', url: 'https://sean-reid.github.io/nyt-crosswords/' },
  { name: 'random-game', url: 'https://sean-reid.github.io/random-game/' },
  { name: 'severed', url: 'https://sean-reid.github.io/severed/' },
  { name: 'discern', url: 'https://discern.seanreid.workers.dev/' },
  { name: 'bananas-for-scale', url: 'https://sean-reid.github.io/bananas-for-scale/' },
  { name: 'bananas-for-scale-entry', url: 'https://sean-reid.github.io/bananas-for-scale/thing/giraffe/' },
  { name: 'deconflict', url: 'https://deconflict.app/' },
  { name: 'mastery', url: 'https://sean-reid.github.io/mastery/' },
];

const filter = process.argv.slice(2);

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });

  const targets = filter.length > 0
    ? sites.filter(s => filter.includes(s.name))
    : sites;

  for (const site of targets) {
    try {
      console.log(`Screenshotting ${site.name}...`);
      const waitStrategy = site.name === 'frankenpeanuts' ? 'domcontentloaded' : 'networkidle2';
      await page.goto(site.url, { waitUntil: waitStrategy, timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));

      // Run interaction if defined
      if (interactions[site.name]) {
        console.log(`  interacting...`);
        await interactions[site.name](page);
      } else {
        await new Promise(r => setTimeout(r, 2000));
      }

      await page.screenshot({
        path: path.join(outDir, `${site.name}.png`),
        fullPage: false,
      });
      console.log(`  saved ${site.name}.png`);
    } catch (err) {
      console.error(`  FAILED ${site.name}: ${err.message}`);
    }
  }

  await browser.close();
  console.log('Done.');
})();
