// Island Hopper — main.ts
// The entrypoint: copies game/ and screenshots/ into the output directory
// and writes /output/dossier.json with buildDossier from vendor/makefun-game.ts.
// Node 22, standard library only. Two runs write byte-identical output.

import { buildDossier } from './vendor/makefun-game.ts';
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)));
const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

function copyTreeInto(sourceDir: string, targetDir: string): void {
  mkdirSync(targetDir, { recursive: true });
  for (const entry of readdirSync(sourceDir).sort()) {
    const source = join(sourceDir, entry);
    const target = join(targetDir, entry);
    const info = statSync(source);
    if (info.isDirectory()) {
      copyTreeInto(source, target);
    } else if (info.isFile()) {
      cpSync(source, target);
    }
  }
}

function main(): void {
  const gameDir = join(repoRoot, 'game');
  const shotsDir = join(repoRoot, 'screenshots');
  if (!existsSync(gameDir)) throw new Error('main.ts: game/ is missing from the repository');
  if (!existsSync(shotsDir)) throw new Error('main.ts: screenshots/ is missing from the repository');

  // Do NOT remove the output directory: in the grader /output is a mounted
  // volume and rmdir on a mount point fails (EBUSY) -> exit 1. The grader
  // starts with an empty /output, so mkdir + copy is enough (starter pattern).
  mkdirSync(outputDir, { recursive: true });

  copyTreeInto(gameDir, join(outputDir, 'game'));
  copyTreeInto(shotsDir, join(outputDir, 'screenshots'));

  const dossier = buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
  console.log(`Island Hopper entry written to ${outputDir}`);
}

main();
