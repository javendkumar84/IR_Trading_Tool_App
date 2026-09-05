import { getOfficialHistoricalFixingRate, normalizeToIsoDate } from './lib/historicalFixingStore';

console.log('========================================================================');
console.log('       HISTORICAL BENCHMARK INDEX FIXING ENGINE VERIFICATION            ');
console.log('========================================================================\n');

interface TestConfig {
  date: string;
  symbol: string;
  tenor?: string;
  expectedRate: number;
}

const tests: TestConfig[] = [
  // 1. User Explicit Benchmark Targets: 03 Jan 2023
  { date: '2023-01-03', symbol: 'ESTR', expectedRate: 1.904 },
  { date: '2023-01-03', symbol: 'EURIBOR', tenor: '6M', expectedRate: 2.739 },
  { date: '2023-01-03', symbol: 'EURIBOR', tenor: '3M', expectedRate: 2.162 },
  { date: '2023-01-03', symbol: 'EURIBOR', tenor: '1M', expectedRate: 1.880 },
  { date: '2023-01-03', symbol: 'EURIBOR', tenor: '12M', expectedRate: 3.328 },

  // 2. User Explicit Benchmark Targets: 03 Jul 2023
  { date: '2023-07-03', symbol: 'ESTR', expectedRate: 3.399 },
  { date: '2023-07-03', symbol: 'EURIBOR', tenor: '6M', expectedRate: 3.913 },
  { date: '2023-07-03', symbol: 'EURIBOR', tenor: '3M', expectedRate: 3.577 },
  { date: '2023-07-03', symbol: 'EURIBOR', tenor: '1M', expectedRate: 3.400 },
  { date: '2023-07-03', symbol: 'EURIBOR', tenor: '12M', expectedRate: 4.128 },

  // 3. USD SOFR Policy Step Benchmarks
  { date: '2023-01-03', symbol: 'SOFR', expectedRate: 4.300 },
  { date: '2023-07-03', symbol: 'SOFR', expectedRate: 5.060 },
  { date: '2024-08-01', symbol: 'SOFR', expectedRate: 5.350 },

  // 4. GBP SONIA Policy Step Benchmarks
  { date: '2023-01-03', symbol: 'SONIA', expectedRate: 3.430 },
  { date: '2023-07-03', symbol: 'SONIA', expectedRate: 4.930 },

  // 5. CHF SARON Policy Step Benchmarks
  { date: '2023-01-03', symbol: 'SARON', expectedRate: 0.950 },
  { date: '2023-07-03', symbol: 'SARON', expectedRate: 1.700 },

  // 6. CAD CORRA Policy Step Benchmarks
  { date: '2023-01-03', symbol: 'CORRA', expectedRate: 4.250 },
  { date: '2023-07-03', symbol: 'CORRA', expectedRate: 4.750 },

  // 7. AUD AONIA Policy Step Benchmarks
  { date: '2023-01-03', symbol: 'AONIA', expectedRate: 3.000 },
  { date: '2023-07-03', symbol: 'AONIA', expectedRate: 4.000 },

  // 8. JPY TONA Policy Step Benchmarks
  { date: '2023-01-03', symbol: 'TONA', expectedRate: -0.020 },
  { date: '2024-08-01', symbol: 'TONA', expectedRate: 0.250 },
];

let passed = 0;
let failed = 0;

for (const t of tests) {
  const res = getOfficialHistoricalFixingRate(t.symbol, t.date, t.tenor);
  if (!res) {
    console.error(`❌ [FAIL] ${t.date} ${t.symbol} ${t.tenor || ''} -> Got null result`);
    failed++;
    continue;
  }
  const diff = Math.abs(res.ratePct - t.expectedRate);
  if (diff < 0.001) {
    console.log(`✅ [PASS] ${t.date} ${t.symbol} ${t.tenor ? '(' + t.tenor + ')' : ''} -> ${res.ratePct.toFixed(3)}% (Publisher: ${res.publisher})`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${t.date} ${t.symbol} ${t.tenor ? '(' + t.tenor + ')' : ''} -> Expected ${t.expectedRate}%, Got ${res.ratePct}%`);
    failed++;
  }
}

console.log(`\n------------------------------------------------------------------------`);
console.log(`TOTAL RESULT: ${passed} PASSED, ${failed} FAILED (${passed + failed} TOTAL)`);
console.log(`========================================================================`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
