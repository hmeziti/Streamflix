import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const constantsPath = path.resolve('constants.ts');
const outputDir = path.resolve('public', 'thumbnails');

const constantsContent = await readFile(constantsPath, 'utf8');
const videoMatches = [...constantsContent.matchAll(/thumbnail_url:\s*'data:image\/jpeg;base64,([^']+)'.*?video_key:\s*'([^']+)'/gs)];

if (videoMatches.length === 0) {
  console.warn('No embedded thumbnails found in constants.ts.');
  process.exit(0);
}

await mkdir(outputDir, { recursive: true });

await Promise.all(
  videoMatches.map(async ([, base64Data, videoKey]) => {
    const outputPath = path.join(outputDir, `${videoKey}.jpg`);
    const buffer = Buffer.from(base64Data, 'base64');
    await writeFile(outputPath, buffer);
  }),
);

console.log(`Generated ${videoMatches.length} thumbnail(s) in ${outputDir}`);
