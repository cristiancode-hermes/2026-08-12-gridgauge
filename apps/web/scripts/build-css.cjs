#!/usr/bin/env node
/**
 * Pre-compila Tailwind v4 a CSS puro (Angular 22 no procesa @import "tailwindcss").
 * Lee SIEMPRE desde styles.source.css (fuente con @theme, versionado en git)
 * y escribe styles.css (compilado). Uso: node scripts/build-css.cjs
 */
const postcss = require('postcss');
const tailwindcss = require('@tailwindcss/postcss');
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../src/styles.source.css');
const OUT = path.resolve(__dirname, '../src/styles.css');

async function build() {
  if (!fs.existsSync(SRC)) {
    // Fallback: si no hay fuente, compilar el propio styles.css (idempotente)
    if (fs.existsSync(OUT)) {
      fs.copyFileSync(OUT, SRC);
    } else {
      console.error('No styles.source.css found');
      process.exit(1);
    }
  }
  const source = fs.readFileSync(SRC, 'utf8');
  console.log('Processing:', path.basename(SRC), '-', (source.length / 1024).toFixed(1) + 'KB');
  const result = await postcss([tailwindcss()]).process(source, { from: SRC });
  fs.writeFileSync(OUT, result.css, 'utf8');
  const sizeKB = (result.css.length / 1024).toFixed(1);
  console.log('Done:', sizeKB + 'KB written to', path.basename(OUT));
  console.log('  @theme:', result.css.includes('@theme') ? 'REMAINS' : 'cleaned');
  console.log('  .card:', result.css.includes('.card') ? 'present' : 'missing');
  return result.css;
}

build().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
