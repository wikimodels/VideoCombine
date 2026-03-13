/**
 * render-all.mjs — batch render all pipeline jobs
 * Usage: npm run render:all
 */
import { execSync } from 'child_process';
import { renders } from '../src/pipeline.config.ts';
import path from 'path';
import fs from 'fs';

const outDir = path.resolve('build');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

console.log(`\n🎬 Starting pipeline render — ${renders.length} job(s)\n`);

for (const job of renders) {
    const outFile = path.join(outDir, `${job.id}.mp4`);
    console.log(`▶ Rendering: ${job.id} → build/${job.id}.mp4`);
    try {
        execSync(
            `npx remotion render ${job.id} "${outFile}" --log=brief`,
            { stdio: 'inherit' }
        );
        console.log(`✅ Done: ${job.id}\n`);
    } catch (err) {
        console.error(`❌ Failed: ${job.id}\n`);
    }
}

console.log('🏁 Pipeline complete!');
