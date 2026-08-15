import esbuild from 'esbuild';
import { minify } from 'terser';
import { minify as minifyHtml } from 'html-minifier-terser';
import { Packer } from 'roadroller';
import archiver from 'archiver';
import advzip from 'advzip-bin';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { createWriteStream, existsSync } from 'node:fs';
import path from 'node:path';
// Not part of terser's public package exports, so imported by relative file
// path rather than bare specifier — this is terser's own curated list of
// every real DOM/BOM/JS-builtin property name, used to safely mangle only
// our own object properties without touching Canvas/DOM/Array/Math etc.
import { domprops } from '../node_modules/terser/tools/domprops.js';

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const BUILD = path.join(ROOT, 'build');
const BUDGET = 13312;

const args = process.argv.slice(2);
const sizeOnly = args.includes('--size-only');
const watch = args.includes('--watch');
const useRoadroller = !args.includes('--no-roadroller');

async function bundle() {
  await mkdir(DIST, { recursive: true });
  const result = await esbuild.build({
    entryPoints: [path.join(ROOT, 'src/main.ts')],
    bundle: true,
    format: 'esm',
    target: 'es2020',
    minify: true,
    write: false,
    outdir: DIST,
    define: { __DEV__: 'false' },
  });
  return result.outputFiles[0].text;
}

// Fast, unminified bundle written to dist/bundle.js — this is what
// src/html/index.html's <script src="../../dist/bundle.js"> loads, so serving
// the repo root and opening src/html/index.html gives a live local dev flow
// without running the full minify/Terser/Roadroller/zip pipeline.
async function devBuild() {
  await mkdir(DIST, { recursive: true });
  await esbuild.build({
    entryPoints: [path.join(ROOT, 'src/main.ts')],
    bundle: true,
    format: 'esm',
    target: 'es2020',
    minify: false,
    sourcemap: 'inline',
    outfile: path.join(DIST, 'bundle.js'),
    define: { __DEV__: 'true' },
  });
}

async function terserPass(code) {
  const result = await minify(code, {
    module: true,
    toplevel: true,
    compress: {
      toplevel: true,
      passes: 3,
      unsafe: true,
      unsafe_arrows: true,
      unsafe_methods: true,
      unsafe_math: true,
      unsafe_comps: true,
      pure_getters: true,
      booleans_as_integers: true,
    },
    mangle: {
      toplevel: true,
      properties: {
        reserved: domprops,
      },
    },
    format: { comments: false },
  });
  return result.code;
}

async function roadrollPack(jsCode) {
  const packer = new Packer([
    {
      data: jsCode,
      type: 'js',
      action: 'eval',
    },
  ], {});
  await packer.optimize(2);
  return packer.makeDecoder().firstLine + packer.makeDecoder().secondLine;
}

async function buildHtml(jsCode) {
  const htmlSrc = await readFile(path.join(ROOT, 'src/html/index.html'), 'utf8');
  let inlined = htmlSrc.replace(
    /<script[^>]*src="[^"]*"[^>]*><\/script>/,
    `<script>${jsCode}</script>`
  );
  return minifyHtml(inlined, {
    collapseWhitespace: true,
    removeComments: true,
    removeAttributeQuotes: true,
    removeOptionalTags: true,
    minifyCSS: true,
    minifyJS: false,
  });
}

async function zipAndCompress(htmlContent) {
  await mkdir(BUILD, { recursive: true });
  const finalHtmlPath = path.join(BUILD, 'index.html');
  await writeFile(finalHtmlPath, htmlContent);

  const zipPath = path.join(ROOT, 'game.zip');
  await rm(zipPath, { force: true });

  await new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.file(finalHtmlPath, { name: 'index.html' });
    archive.finalize();
  });

  try {
    await execFileAsync(advzip, ['--recompress', '--shrink-insane', zipPath]);
  } catch (err) {
    console.warn('advzip recompression skipped:', err.message);
  }

  return zipPath;
}

async function reportSize(zipPath) {
  const { size } = await (await import('node:fs/promises')).stat(zipPath);
  const remaining = BUDGET - size;
  const pct = ((size / BUDGET) * 100).toFixed(1);
  console.log(
    `Final zip size: ${size} / ${BUDGET} bytes (${pct}%) — ${remaining} bytes free`
  );
  if (remaining < 0) {
    console.error('OVER BUDGET by', -remaining, 'bytes');
    process.exitCode = 1;
  }
  return size;
}

async function run() {
  console.time('build');
  console.log('[1/5] bundling with esbuild...');
  let code = await bundle();

  console.log('[2/5] minifying with terser...');
  code = await terserPass(code);

  if (useRoadroller) {
    console.log('[3/5] packing with roadroller (this is the slow step, ~15-25s)...');
    try {
      code = await roadrollPack(code);
    } catch (err) {
      console.warn('Roadroller pack failed, falling back to plain minified JS:', err.message);
    }
  } else {
    console.log('[3/5] skipping roadroller (--no-roadroller)');
  }

  console.log('[4/5] inlining html...');
  const html = await buildHtml(code);

  console.log('[5/5] zipping + advzip recompression...');
  const zipPath = await zipAndCompress(html);
  await reportSize(zipPath);
  console.timeEnd('build');
}

if (sizeOnly) {
  const zipPath = path.join(ROOT, 'game.zip');
  if (!existsSync(zipPath)) {
    console.error('game.zip does not exist yet, run `npm run build` first.');
    process.exit(1);
  }
  await reportSize(zipPath);
} else if (watch) {
  console.log('Watch mode: writing dist/bundle.js on changes to src/** (unminified, dev build)');
  await devBuild();
  console.log('dist/bundle.js ready — serve the repo root (e.g. `npx serve .` or `python3 -m http.server`) and open src/html/index.html');
  const { watch: fsWatch } = await import('node:fs');
  let pending = false;
  fsWatch(path.join(ROOT, 'src'), { recursive: true }, () => {
    if (pending) return;
    pending = true;
    setTimeout(async () => {
      pending = false;
      try {
        await devBuild();
        console.log('rebuilt dist/bundle.js');
      } catch (err) {
        console.error(err);
      }
    }, 150);
  });
} else {
  await run();
}
