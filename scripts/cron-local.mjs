/**
 * Local cron simulator — hits /api/cron/order-status every INTERVAL_MS.
 *
 * Usage:
 *   npm run cron:local
 *
 * Make sure the dev server is running first (npm run dev).
 */

const INTERVAL_MS = 60 * 1000; // 1 minute
const ENDPOINT = 'http://localhost:1000/api/cron/order-status';

async function tick() {
  const now = new Date().toLocaleTimeString();
  console.log(`\n[${now}] Running cron...`);

  try {
    const res = await fetch(ENDPOINT);
    const data = await res.json();

    if (!res.ok) {
      console.error(`  Status: ${res.status}`, data.error || '');
      return;
    }

    console.log(`  Ready: ${data.toReady}  Dispatched: ${data.dispatched}`);

    if (data.dispatchResults?.length) {
      for (const r of data.dispatchResults) {
        const icon = r.success ? 'OK' : 'FAIL';
        console.log(`  [${icon}] ${r.order_id}${r.error ? ' — ' + r.error : ''}`);
      }
    }

    if (data.debug?.length) {
      console.log('  --- Debug ---');
      for (const d of data.debug) {
        const { step, timestamp, ...rest } = d;
        const extra = Object.keys(rest).length ? ' ' + JSON.stringify(rest.data ?? rest) : '';
        console.log(`  ${step}${extra}`);
      }
    }
  } catch (err) {
    console.error(`  Fetch failed:`, err.message);
    console.error('  Is the dev server running on port 1000?');
  }
}

console.log('Local cron started — hitting', ENDPOINT, 'every', INTERVAL_MS / 1000, 'seconds');
console.log('Press Ctrl+C to stop.\n');

// Run immediately, then every INTERVAL_MS
tick();
setInterval(tick, INTERVAL_MS);
