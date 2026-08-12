import betterSqlite3 from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * Enterprise Performance Optimization & Vacuum Scheduler Script
 * Performs SQLite VACUUM, PRAGMA optimize, WAL checkpoint, and cache cleanup.
 */
export function runSystemPerformanceOptimization() {
  const dbPath = path.resolve(process.cwd(), 'ir_swap_trades.db');
  console.log(`[OPTIMIZER] Starting Alternate-Day Application Performance Optimization for: ${dbPath}`);
  
  if (!fs.existsSync(dbPath)) {
    console.log('[OPTIMIZER] Database file not found, skipping SQLite vacuum.');
    return;
  }

  try {
    const db = betterSqlite3(dbPath);

    // 1. Analyze and optimize queries
    db.pragma('optimize');
    console.log('[OPTIMIZER] ✓ PRAGMA optimize executed.');

    // 2. WAL Checkpoint to truncate Write-Ahead Log
    db.pragma('wal_checkpoint(TRUNCATE)');
    console.log('[OPTIMIZER] ✓ WAL Checkpoint TRUNCATE executed.');

    // 3. SQLite VACUUM to reclaim defragmented storage
    db.exec('VACUUM;');
    console.log('[OPTIMIZER] ✓ SQLite VACUUM database defragmentation complete.');

    db.close();
    console.log('[OPTIMIZER] ✓ Application performance optimization completed successfully.');
  } catch (err: any) {
    console.error('[OPTIMIZER] Error during database optimization:', err.message);
  }
}

// Execute directly if called from command line
if (import.meta.url === `file://${process.argv[1]}`) {
  runSystemPerformanceOptimization();
}
