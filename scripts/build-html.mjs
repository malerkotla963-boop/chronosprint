// Turns the original single-file HTML into an offline-ready www/index.html:
//  - removes the Tailwind CDN <script> + inline tailwind.config (CSS is compiled to www/app.css)
//  - removes the Google Fonts @import (fonts are bundled in www/fonts)
//  - adds the native bridge script (www/native.js)
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync('src/revision_diary.original.html', 'utf8');
let html = src;

function must(label, before, after) {
  if (before === after) throw new Error(`build-html: pattern not found -> ${label}`);
  return after;
}

// 1) Tailwind CDN + inline config
html = must('tailwind cdn', html,
  html.replace('<script src="https://cdn.tailwindcss.com"></script>', '<link rel="stylesheet" href="app.css">'));
{
  const next = html.replace(/<script>\s*tailwind\.config = \{[\s\S]*?\n  <\/script>\n/, '');
  html = must('tailwind inline config', html, next);
}

// 2) Google Fonts import
html = must('google fonts import', html,
  html.replace(/\s*@import url\('https:\/\/fonts\.googleapis\.com[^\n]*\n/, '\n'));

// 3) Viewport + theme colour
html = must('viewport', html,
  html.replace('<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">\n  <meta name="theme-color" content="#000000">\n  <meta name="color-scheme" content="dark">'));

// 4) Native bridge, loaded after the app's own script so it can wrap its functions
html = must('body end', html, html.replace('</body>', '  <script src="native.js"></script>\n</body>'));

if (/https?:\/\/(cdn\.tailwindcss|fonts\.googleapis)/.test(html)) throw new Error('build-html: external URL still present');

fs.mkdirSync('www/fonts', { recursive: true });
fs.writeFileSync('www/index.html', html);

// Fonts (latin subset only)
const copy = (pkg, names) => {
  for (const n of names) fs.copyFileSync(path.join('node_modules/@fontsource', pkg, 'files', n), path.join('www/fonts', n));
};
copy('inter', [300,400,500,600,700,800].map(w => `inter-latin-${w}-normal.woff2`));
copy('jetbrains-mono', [400,600,700].map(w => `jetbrains-mono-latin-${w}-normal.woff2`));
console.log('www/index.html written');
