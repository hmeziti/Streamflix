#!/usr/bin/env node

/**
 * Simple Vidmoly folder scraper.
 *
 * Usage:
 *   node scripts/scrape_vidmoly.mjs --url "https://vidmoly.net/folder/..." --cookie "cf_clearance=...; PHPSESSID=..."
 *   node scripts/scrape_vidmoly.mjs --file ./vidmoly-page.html
 */

import fs from 'node:fs/promises';

const args = process.argv.slice(2);

const getArg = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : '';
};

const hasFlag = (name) => args.includes(name);

const usage = () => {
  console.log(`\nVidmoly scraper\n\n` +
`Options:\n` +
`  --url <https://...>      Folder/page URL on vidmoly\n` +
`  --cookie <cookie string> Session cookies for protected pages\n` +
`  --file <path>            Parse already-downloaded HTML file\n` +
`  --out <path>             Output JSON path (default: vidmoly-videos.json)\n` +
`  --csv <path>             Also write CSV (default: vidmoly-videos.csv)\n` +
`  --help                   Show this help\n\n`);
};

const stripTags = (text) => text.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const normalizeTitle = (title) => title.replace(/\s+/g, ' ').trim();

const isLikelyId = (value) => /^[a-z0-9]{8,}$/i.test(value.trim());

const parseVidmolyHtml = (html) => {
  const items = new Map();

  const addItem = (id, title) => {
    const cleanId = id?.trim();
    const cleanTitle = normalizeTitle(title || 'Untitled');
    if (!cleanId || !isLikelyId(cleanId)) return;
    if (!items.has(cleanId)) {
      items.set(cleanId, { id: cleanId, title: cleanTitle, embed: `https://vidmoly.net/embed-${cleanId}.html` });
      return;
    }
    const prev = items.get(cleanId);
    if (prev.title === 'Untitled' && cleanTitle !== 'Untitled') {
      items.set(cleanId, { ...prev, title: cleanTitle });
    }
  };

  // 1) JSON-like payloads seen in some file manager pages
  const jsonLike = /"name"\s*:\s*"([^"]+)"[\s\S]{0,180}?"(?:file_code|code|slug|id)"\s*:\s*"([a-z0-9]{8,})"/gi;
  for (const match of html.matchAll(jsonLike)) {
    addItem(match[2], match[1]);
  }

  // 2) direct embed links
  const embedLinks = /<a[^>]+href=["'][^"']*embed-([a-z0-9]{8,})\.html[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(embedLinks)) {
    addItem(match[1], stripTags(match[2]));
  }

  // 3) generic rows where title and id appear near each other
  const rowLike = /<tr[\s\S]*?<\/tr>/gi;
  for (const row of html.matchAll(rowLike)) {
    const text = stripTags(row[0]);
    const tokens = text.split(' ').filter(Boolean);
    const id = tokens.find((t) => isLikelyId(t));
    if (!id) continue;
    const beforeId = text.split(id)[0].trim();
    const title = beforeId.split(' ').slice(-6).join(' ');
    addItem(id, title || 'Untitled');
  }

  // 4) ultra fallback: title line followed by id line
  const lines = html
    .replace(/<br\s*\/?/gi, '\n')
    .replace(/<[^>]+>/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (let i = 0; i < lines.length - 1; i++) {
    if (isLikelyId(lines[i + 1])) {
      const title = normalizeTitle(lines[i]);
      if (title.length > 1 && !/^(name|upload)$/i.test(title)) {
        addItem(lines[i + 1], title);
      }
    }
  }

  return Array.from(items.values());
};

const toCsv = (rows) => {
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const header = ['title', 'id', 'embed'];
  const body = rows.map((r) => [r.title, r.id, r.embed].map(esc).join(','));
  return [header.join(','), ...body].join('\n');
};

const main = async () => {
  if (hasFlag('--help') || args.length === 0) {
    usage();
    process.exit(0);
  }

  const url = getArg('--url');
  const cookie = getArg('--cookie');
  const file = getArg('--file');
  const outPath = getArg('--out') || 'vidmoly-videos.json';
  const csvPath = getArg('--csv') || 'vidmoly-videos.csv';

  if (!url && !file) {
    console.error('Provide either --url or --file');
    process.exit(1);
  }

  let html = '';

  if (file) {
    html = await fs.readFile(file, 'utf8');
  } else {
    const headers = cookie ? { Cookie: cookie } : {};
    const response = await fetch(url, { headers });
    if (!response.ok) {
      console.error(`Failed to fetch: ${response.status} ${response.statusText}`);
      process.exit(1);
    }
    html = await response.text();
  }

  const results = parseVidmolyHtml(html);
  await fs.writeFile(outPath, JSON.stringify(results, null, 2), 'utf8');
  await fs.writeFile(csvPath, toCsv(results), 'utf8');

  console.log(`Saved ${results.length} videos:`);
  console.log(`- JSON: ${outPath}`);
  console.log(`- CSV : ${csvPath}`);
  console.log('\nPreview:');
  console.table(results.slice(0, 10));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
