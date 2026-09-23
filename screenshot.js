const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

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
  'string': async (page) => {
    // Helpers scoped to this interaction. The palette picker only
    // renders the [+] / swatch / × controls when the solver isn't
    // running, so we use the [+] button's presence as a proxy for
    // "solve is finished and the rail is interactive again."
    const waitForSolveDone = async (timeoutMs) => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const ready = await page.evaluate(() => {
          const btn = document.querySelector('[aria-label="Add thread color"]');
          return !!btn && !btn.disabled;
        });
        if (ready) return true;
        await new Promise(r => setTimeout(r, 500));
      }
      return false;
    };

    const findCanvasContainer = () => page.evaluateHandle(() => {
      const canvases = document.querySelectorAll('canvas');
      if (canvases.length === 0) return null;
      let el = canvases[0];
      while (el && el.parentElement) {
        if (el.classList && el.classList.contains('aspect-square')) return el;
        el = el.parentElement;
      }
      return canvases[0].parentElement;
    });

    await new Promise(r => setTimeout(r, 3000));

    // Click the third sample photo (default palette is mono).
    await page.evaluate(() => {
      const imgs = document.querySelectorAll('img');
      const samples = [];
      for (const img of imgs) {
        if (img.naturalWidth > 50 && img.closest('button, [role="button"], a, [class*="sample"]')) {
          samples.push(img);
        }
      }
      const target = samples[2] ?? samples[samples.length - 1];
      if (target) target.click();
    });

    // Give the solver a moment to actually start so we don't race
    // through waitForSolveDone before it has flipped to running.
    await new Promise(r => setTimeout(r, 2000));
    if (!await waitForSolveDone(90000)) {
      console.log('  warning: mono solve did not complete in 90s');
    }
    // Brief settle so the final batch paints to the canvas.
    await new Promise(r => setTimeout(r, 1000));

    // Capture canvas-only mono result.
    const monoEl = await findCanvasContainer();
    if (monoEl && monoEl.asElement()) {
      await monoEl.asElement().screenshot({
        path: path.join(outDir, 'string-mono.png'),
      });
      console.log('  saved string-mono.png');
    }

    // Grow the palette from 1 to 4 via the [+] button. setPhysical
    // alone doesn't restart the solver - we have to click Generate
    // afterwards. Each click here calls suggestNextColor, which is
    // an async WASM round-trip, so leave it a beat to settle.
    for (let i = 0; i < 3; i++) {
      const clicked = await page.evaluate(() => {
        const btn = document.querySelector('[aria-label="Add thread color"]');
        if (btn && !btn.disabled) {
          btn.click();
          return true;
        }
        return false;
      });
      if (!clicked) {
        console.log(`  warning: add-color click ${i + 1} did not register`);
        break;
      }
      await new Promise(r => setTimeout(r, 1500));
    }

    // Auto-pick replaces all four slots with OKLab-extracted colors
    // chosen for gamut diversity on this specific image, instead of
    // the per-slot suggestions accumulated by [+].
    await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        const t = (b.textContent || '').trim();
        if (t === 'Auto-pick all' && !b.disabled) {
          b.click();
          return;
        }
      }
    });
    await new Promise(r => setTimeout(r, 4000));

    // Trigger the color solve. The Generate button text flips to
    // "Generate again" once a mono solve has completed.
    const generateClicked = await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        const t = (b.textContent || '').trim();
        if ((t === 'Generate again' || t === 'Generate') && !b.disabled) {
          b.click();
          return true;
        }
      }
      return false;
    });
    if (!generateClicked) {
      console.log('  warning: Generate button click did not register');
    }

    // Color solves are 3-channel + per-step joint candidate scoring
    // and run on a larger default line budget than mono. Give the
    // worker generous time to finish.
    await new Promise(r => setTimeout(r, 3000));
    if (!await waitForSolveDone(180000)) {
      console.log('  warning: color solve did not complete in 180s');
    }
    await new Promise(r => setTimeout(r, 1500));

    const colorEl = await findCanvasContainer();
    if (colorEl && colorEl.asElement()) {
      await colorEl.asElement().screenshot({
        path: path.join(outDir, 'string-color.png'),
      });
      console.log('  saved string-color.png');
    }
  },
  'fourier': async (page) => {
    // Upload banana and dog images
    const dropzones = await page.$$('input[type="file"]');
    if (dropzones.length >= 2) {
      await dropzones[0].uploadFile('/Users/seanreid/Downloads/banana-7h4m9.webp');
      await new Promise(r => setTimeout(r, 1000));
      await dropzones[1].uploadFile('/Users/seanreid/Downloads/dog-puppy-on-garden-royalty-free-image-1586966191.jpg.avif');
      await new Promise(r => setTimeout(r, 2000));
    } else {
      // Try clicking dropzones and using file chooser
      const zones = await page.$$('[class*="drop"], [class*="zone"], [class*="upload"]');
      if (zones.length >= 2) {
        const [fileChooser1] = await Promise.all([
          page.waitForFileChooser(),
          zones[0].click(),
        ]);
        await fileChooser1.accept(['/Users/seanreid/Downloads/banana-7h4m9.webp']);
        await new Promise(r => setTimeout(r, 1000));
        const [fileChooser2] = await Promise.all([
          page.waitForFileChooser(),
          zones[1].click(),
        ]);
        await fileChooser2.accept(['/Users/seanreid/Downloads/dog-puppy-on-garden-royalty-free-image-1586966191.jpg.avif']);
      }
    }
    // Wait for processing (200 iterations)
    await new Promise(r => setTimeout(r, 30000));
    // Click through to reveal phase spectra
    await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (const b of btns) {
        if (b.textContent && (b.textContent.includes('Next') || b.textContent.includes('Continue') || b.textContent.includes('Reveal'))) {
          b.click();
          break;
        }
      }
    });
    await new Promise(r => setTimeout(r, 2000));
    // Click an amplitude spectrum to trigger the reveal
    const canvases = await page.$$('canvas');
    if (canvases.length > 2) {
      await canvases[2].click();
      await new Promise(r => setTimeout(r, 2000));
    }
  },
  'sounds': async (page) => {
    // Click to trigger pointer lock and start audio context
    await page.mouse.click(640, 400);
    await new Promise(r => setTimeout(r, 2000));
    // Walk forward a bit to get into the world
    await page.keyboard.down('w');
    await new Promise(r => setTimeout(r, 4000));
    await page.keyboard.up('w');
    // Look around slightly
    await page.mouse.move(700, 380);
    await new Promise(r => setTimeout(r, 1000));
    // Let the scene settle
    await new Promise(r => setTimeout(r, 3000));
  },
  'blotter': async (page) => {
    // Type a broad time range to load events, then wait for map pins
    const input = await page.$('input[type="text"]');
    if (input) {
      await input.click({ clickCount: 3 });
      await input.type('last 24 hours', { delay: 30 });
      await page.keyboard.press('Enter');
    }
    await new Promise(r => setTimeout(r, 5000));
  },
  'how-will-i-die': async (page) => {
    // Pick a non-default country, set age and sex, submit, wait for the ranking
    await page.waitForSelector('#query:not([hidden])', { timeout: 20000 });
    await page.click('#country-input');
    await page.evaluate(() => { document.getElementById('country-input').value = ''; });
    await page.type('#country-input', 'Japan', { delay: 40 });
    await page.waitForSelector('#country-list:not([hidden]) li');
    await page.click('#country-list li');
    await page.click('#age', { clickCount: 3 });
    await page.type('#age', '55');
    await page.click('input[name="sex"][value="male"]');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.ranking li', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 800));
  },
  'unquote': async (page) => {
    // URL carries the query; just wait for results to render
    await page.waitForSelector('.results', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 2500));
  },
  'randomify': async (page) => {
    // The app spins on mount; wait for the result card and platform links
    await page.waitForSelector('[data-testid="result"]', { timeout: 45000 });
    await page.waitForSelector('[data-testid="links"] a', { timeout: 45000 });
    await new Promise(r => setTimeout(r, 2500));
  },
  'rebase': async (page) => {
    // Skip the first-visit help modal, then play into attempt 2
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('rebase-visited', '1');
    });
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('.card');
    // First attempt: correct solution with two cards swapped -> 2 green, 2 yellow
    await page.evaluate(() => {
      const sol = state.puzzle.solution.slice();
      const guess = sol.slice();
      guess[0] = sol[1]; guess[1] = sol[0];
      for (let i = 0; i < 4; i++) placeBase(guess[i], i);
      renderGame();
      checkAttempt();
    });
    await new Promise(r => setTimeout(r, 2500));
    // Second attempt in progress: place one remaining base correctly
    await page.evaluate(() => {
      const sol = state.puzzle.solution;
      for (let i = 0; i < 4; i++) {
        if (!state.locked[i]) { placeBase(sol[i], i); break; }
      }
      renderGame();
    });
    await new Promise(r => setTimeout(r, 500));
  },
  'movie-quotes': async (page) => {
    await page.waitForSelector('[data-testid="start-button"]', { timeout: 30000 });
    await page.click('[data-testid="start-button"]');
    await page.waitForSelector('[data-testid="choice"]', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 1000));
  },
  'eigencircuits': async (page) => {
    // Paper IDs rotate through a 90-day window; if the pinned ID 404s,
    // pick a fresh one from the homepage listing and edit the URL below
    await page.waitForSelector('.paper .katex', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));
  },
  'squares': async (page) => {
    // Feed a public-domain image, then wait for the search to settle
    const input = await page.$('input#file');
    if (input) {
      const img = path.join(require('os').tmpdir(), 'squares-sample.jpg');
      if (!fs.existsSync(img)) {
        const res = await fetch('https://commons.wikimedia.org/wiki/Special:FilePath/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg?width=1280',
          { headers: { 'User-Agent': 'sean-reid.github.io screenshot script' } });
        fs.writeFileSync(img, Buffer.from(await res.arrayBuffer()));
      }
      await input.uploadFile(img);
      await page.waitForFunction(() => /growing|refining/.test((document.querySelector('#status') || {}).textContent || ''), { timeout: 20000 }).catch(() => {});
      await page.waitForFunction(() => !((document.querySelector('#status') || {}).textContent || '').trim(), { timeout: 60000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 800));
    }
  },
  'time': async (page) => {
    await new Promise(r => setTimeout(r, 7000));
  },
  'kakeya': async (page) => {
    await page.evaluate(() => { const el = document.querySelector('#playground'); if (el) el.scrollIntoView(); });
    await new Promise(r => setTimeout(r, 1500));
    const play = await page.$('[data-testid="play"]');
    if (play) await play.click();
    await new Promise(r => setTimeout(r, 4000));
  },
  'urls': async (page) => {
    await page.type('#url', 'https://en.wikipedia.org/wiki/Spoonerism');
    await page.click('input[name="style"][value="chess"]');
    await page.click('button[type="submit"]');
    await page.waitForSelector('#result:not([hidden]) .url', { timeout: 20000 });
    await new Promise(r => setTimeout(r, 800));
  },
  'latex-preview': async (page) => {
    await page.click('#compile');
    await page.waitForFunction(() => /Compiled in/.test((document.querySelector('#status') || {}).textContent || ''), { timeout: 120000 });
    await new Promise(r => setTimeout(r, 4000));
  },
  'polish-notation': async (page) => {
    await page.click('#formula-input');
    await page.type('#formula-input', 'CCpqCCqrCpr');
    await page.waitForSelector('mjx-container', { timeout: 20000 });
    await new Promise(r => setTimeout(r, 1500));
  },
  'rhythm': async (page) => {
    await page.waitForSelector('canvas');
    await clickText(page, 'button', 'play');
    await new Promise(r => setTimeout(r, 6000));
  },
  'cyclical': async (page) => {
    await new Promise(r => setTimeout(r, 1500));
    await clickText(page, 'button', 'search');
    await new Promise(r => setTimeout(r, 5000));
    const items = await page.$$('li');
    if (items[2]) await items[2].click();
    await new Promise(r => setTimeout(r, 1000));
  },
  'wason': async (page) => {
    // Cards 1 and 7 are the answer for 2026-09-23; other dates need dailyPuzzle(date).answer
    await new Promise(r => setTimeout(r, 1000));
    const cards = await page.$$('button.card');
    if (cards[2]) await cards[2].click();
    if (cards[3]) await cards[3].click();
  },
  'keynote': async (page) => {
    await new Promise(r => setTimeout(r, 4000));
    const toggle = await page.$('button[aria-label="Toggle sound"]');
    if (toggle) await toggle.click();
    await new Promise(r => setTimeout(r, 7000));
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
  { name: 'string', url: 'https://string-loom.pages.dev/' },
  { name: 'fourier', url: 'https://sean-reid.github.io/fourier/' },
  { name: 'sounds', url: 'https://sean-reid.github.io/sounds/' },
  { name: 'pulse', url: 'https://sean-reid.github.io/pulse/', interactive: true },
  { name: 'unquote', url: 'https://unquote.dwainosaur.com/?q=' + encodeURIComponent('i have a bad feeling about this') },
  { name: 'randomify', url: 'https://randomify.net' },
  { name: 'rebase', url: 'https://sean-reid.github.io/rebase/' },
  { name: 'movie-quotes', url: 'https://quotes.dwainosaur.com' },
  { name: 'miditool', url: 'https://sean-reid.github.io/miditool/' },
  { name: 'eigencircuits', url: 'https://eigencircuits.seanreid.workers.dev/html/2607.00427' },
  { name: 'clowns-and-mimes', url: 'https://sean-reid.github.io/clowns-and-mimes' },
  { name: 'antipodal', url: 'https://antipodal.pages.dev' },
  { name: 'gardeners-dilemma', url: 'https://gardeners-dilemma.pages.dev' },
  { name: 'jamstream', url: 'https://sean-reid.github.io/jamstream/' },
  { name: 'voting', url: 'https://sean-reid.github.io/voting/' },
  { name: 'squares', url: 'https://squares.dwainosaur.com' },
  { name: 'time', url: 'https://time.dwainosaur.com/?s=' + timeScene() },
  { name: 'kakeya', url: 'https://sean-reid.github.io/kakeya/' },
  { name: 'oeis-pi-search', url: 'https://oeis-pi-search.dwainosaur.com/A000045' },
  { name: 'urls', url: 'https://urls.dwainosaur.com/' },
  { name: 'pikiwedia', url: 'https://pikiwedia.dwainosaur.com/wiki/Ham_sandwich' },
  { name: 'latex-preview', url: 'https://sean-reid.github.io/latex-preview/' },
  { name: 'polish-notation', url: 'https://sean-reid.github.io/polish-notation/' },
  { name: 'rhythm', url: 'https://rhythm.dwainosaur.com', autoplay: true },
  { name: 'cyclical', url: 'https://sean-reid.github.io/cyclical/' },
  { name: 'wason', url: 'https://sean-reid.github.io/wason/' },
  { name: 'keynote', url: 'https://keynote.dwainosaur.com', autoplay: true, wait: 'domcontentloaded' },
];

// Sgr A* at twice the prograde ISCO for spin 0.9, matching blog/time.html
function timeScene() {
  const r = 2 * 2.3209 * 4.297e6 * 1476.625;
  const payload = JSON.stringify(['sgr-a-star', [r, -0.785398, 'o', 1], [], 60, 2000]);
  return Buffer.from(payload).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function clickText(page, selector, text) {
  await page.evaluate((selector, text) => {
    for (const el of document.querySelectorAll(selector)) {
      if (el.textContent.trim().toLowerCase() === text) { el.click(); return; }
    }
  }, selector, text);
}

const readline = require('readline');

const filter = process.argv.slice(2);

function waitForEnter(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(prompt, () => { rl.close(); resolve(); });
  });
}

(async () => {
  const targets = filter.length > 0
    ? sites.filter(s => filter.includes(s.name))
    : sites;

  const hasInteractive = targets.some(s => s.interactive);

  const args = ['--autoplay-policy=no-user-gesture-required'];
  if (hasInteractive) args.push('--use-fake-ui-for-media-stream', '--enable-usermedia-screen-capturing');
  const browser = await puppeteer.launch({ headless: !hasInteractive, args });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });

  const context = browser.defaultBrowserContext();
  for (const site of targets) {
    if (site.interactive) {
      const origin = new URL(site.url).origin;
      await context.overridePermissions(origin, ['camera', 'microphone']);
    }
  }

  for (const site of targets) {
    try {
      console.log(`Screenshotting ${site.name}...`);
      const waitStrategy = site.wait || (site.name === 'frankenpeanuts' ? 'domcontentloaded' : 'networkidle2');
      await page.goto(site.url, { waitUntil: waitStrategy, timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));

      if (site.interactive) {
        console.log(`  Interactive mode: arrange the page, then press Enter to capture.`);
        await waitForEnter('  Press Enter to take screenshot...');
      } else if (interactions[site.name]) {
        console.log(`  interacting...`);
        await interactions[site.name](page);
      } else {
        await new Promise(r => setTimeout(r, 2000));
      }

      const png = path.join(require('os').tmpdir(), `${site.name}.png`);
      const webp = path.join(outDir, `${site.name}.webp`);
      await page.screenshot({ path: png, fullPage: false });
      execFileSync('cwebp', ['-quiet', '-q', '82', png, '-o', webp]);
      fs.unlinkSync(png);
      console.log(`  saved ${path.relative(__dirname, webp)}`);
    } catch (err) {
      console.error(`  FAILED ${site.name}: ${err.message}`);
    }
  }

  await browser.close();
  console.log('Done.');
})();
