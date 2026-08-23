import http from 'http';

async function checkUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 3000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function runDiagnostics() {
  console.log("==================================================");
  console.log("🔍 LIVE PLATFORM DIAGNOSTIC & HEALTH VERIFICATION");
  console.log("==================================================");

  const pyEngineOk = await checkUrl('http://127.0.0.1:8000/health');
  console.log(`Python Quant Engine (http://127.0.0.1:8000/health): ${pyEngineOk ? '✅ ONLINE' : '⚠️ OFFLINE (Run npm run start:all)'}`);

  const nodeServerOk = await checkUrl('http://127.0.0.1:3000/api/health');
  console.log(`Node Express Server (http://127.0.0.1:3000/api/health): ${nodeServerOk ? '✅ ONLINE' : '⚠️ OFFLINE (Run npm run start:all)'}`);

  console.log("==================================================");
}

runDiagnostics();
