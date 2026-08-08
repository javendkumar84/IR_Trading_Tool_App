import { getAllTrades, getAuditLogs, getDatabase, getDatabasePath } from '../src/db/sqliteDb';

async function main() {
  await getDatabase();

  const trades = await getAllTrades();
  const auditLogs = await getAuditLogs();

  console.log('SQLite database initialized.');
  console.log(`Path: ${getDatabasePath()}`);
  console.log(`Trades: ${trades.length}`);
  console.log(`Audit logs: ${auditLogs.length}`);

  if (trades.length > 0) {
    console.log('\nSample trades:');
    for (const trade of trades.slice(0, 5)) {
      console.log(`- ${trade.tradeId} [${trade.productType}] ${trade.counterpartyName} (${trade.status})`);
    }
  }
}

main().catch((err) => {
  console.error('Failed to initialize SQLite database:', err);
  process.exit(1);
});
