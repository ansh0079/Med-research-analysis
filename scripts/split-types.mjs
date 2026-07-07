import fs from 'fs';
import path from 'path';

const root = process.cwd();
const typesDir = path.join(root, 'src/types');
const modules = [
  'article',
  'quiz',
  'ui',
  'clinical',
  'search',
  'knowledge',
  'collaboration',
  'team',
  'review',
  'learning',
];

const expectedBarrel = `${modules.map((name) => `export * from './${name}';`).join('\n')}\n`;
const barrelPath = path.join(typesDir, 'index.ts');
const actualBarrel = fs.readFileSync(barrelPath, 'utf8').replace(/\r\n/g, '\n');

if (actualBarrel !== expectedBarrel) {
  console.error('src/types/index.ts does not match the expected domain barrel.');
  process.exitCode = 1;
}

for (const name of modules) {
  const file = path.join(typesDir, `${name}.ts`);
  if (!fs.existsSync(file)) {
    console.error(`Missing src/types/${name}.ts`);
    process.exitCode = 1;
    continue;
  }

  const lineCount = fs.readFileSync(file, 'utf8').trimEnd().split(/\r?\n/).length;
  console.log(`${name}.ts ${lineCount}`);
}
