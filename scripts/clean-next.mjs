import { existsSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const nextDir = join(process.cwd(), '.next');

if (!existsSync(nextDir)) {
  process.exit(0);
}

const entries = readdirSync(nextDir, { withFileTypes: true });

for (const entry of entries) {
  const target = join(nextDir, entry.name);

  try {
    rmSync(target, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    });
  } catch (error) {
    console.error(`Failed to clean ${target} before build. Stop any running Next dev server and try again.`);
    console.error(error);
    process.exit(1);
  }
}
