// Готовит архив для программистов: собранный сайт и инструкция по выкладке.
// Запуск: npm run pack → package/ne-pro-beg-site.zip
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync } from 'node:fs';

const out = 'package';
const dir = `${out}/ne-pro-beg`;

execFileSync('npm', ['run', 'build'], { stdio: 'inherit' });
rmSync(out, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
cpSync('dist', `${dir}/site`, { recursive: true });
cpSync('deploy/README-DEPLOY.md', `${dir}/README-DEPLOY.md`);
cpSync('docs/AUDIO-FILES.md', `${dir}/AUDIO-FILES.md`);
execFileSync('zip', ['-qr', 'ne-pro-beg-site.zip', 'ne-pro-beg'], { cwd: out });
console.log(`pack: ${out}/ne-pro-beg-site.zip`);
