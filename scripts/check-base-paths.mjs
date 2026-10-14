#!/usr/bin/env node
// 扫描构建产物的链接，确保站内链接都带部署子路径前缀。
// 用法: node scripts/check-base-paths.mjs [base] [site]
//   base 默认 /DoubleX；site 默认 https://jianchuxin.github.io/DoubleX
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const argBase = process.argv[2] ?? '/DoubleX';
const argSite = process.argv[3] ?? 'https://jianchuxin.github.io/DoubleX';
const base = argBase === '/' ? '/' : argBase.replace(/\/+$/, '');
const site = argSite.replace(/\/+$/, '');
const siteHost = new URL(site).host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const absoluteRe = new RegExp(`https?://${siteHost}/[^"'\\s<>()]*`, 'g');
const dist = 'dist';

const problems = [];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

for (const file of walk(dist)) {
  if (!/\.(html|xml)$/.test(file)) continue;
  const text = readFileSync(file, 'utf8');
  const where = relative(process.cwd(), file);

  if (base !== '/') {
    for (const match of text.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) {
      const href = match[1];
      if (href === base || href.startsWith(`${base}/`)) continue;
      problems.push(`${where}: ${href}`);
    }
  }

  for (const match of text.matchAll(absoluteRe)) {
    const url = match[0];
    if (url === site || url.startsWith(`${site}/`)) continue;
    problems.push(`${where}: ${url}`);
  }
}

if (problems.length > 0) {
  console.error(`发现 ${problems.length} 处缺少 base 前缀的链接:`);
  for (const line of problems) console.error(`  ${line}`);
  process.exit(1);
}

console.log(`OK: dist 内链接全部带 ${base} 前缀（site: ${site}）`);
