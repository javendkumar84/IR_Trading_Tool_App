import * as fs from 'fs';
import * as path from 'path';

export interface ScreenshotEvidence {
  stepName: string;
  filePath: string;
  timestamp: string;
  hyperlink?: string;
}

export interface XmlDiffDetail {
  path: string;
  type: 'ADDED' | 'REMOVED' | 'MODIFIED';
  expectedValue: any;
  actualValue: any;
  details?: string;
  isUnexpectedChange?: boolean;
}

export interface TradeScenarioResult {
  productType: string;
  tradeId?: string;
  scenarioName: 'Booking' | 'Amendment' | 'Maturity' | 'Cancellation' | 'MarketStandardValidation';
  status: 'PASS' | 'FAIL' | 'SKIPPED';
  executionTimeMs: number;
  expectedResult: string;
  actualResult: string;
  reason?: string;
  failureCategory?: 'SCHEMA_MISMATCH' | 'VALUE_MISMATCH' | 'NETWORK_ERROR' | 'UI_STATE_ERROR' | 'DATABASE_MISMATCH' | 'UNEXPECTED_DIFF';
  failureRootCause?: string;
  fieldsTested?: number;
  tradeXml?: string;
  amendedXml?: string;
  maturedXml?: string;
  cancelledXml?: string;
  diffSummary?: string;
  diffTableHtml?: string;
  xmlDifferences?: XmlDiffDetail[];
  comparisonRows?: Array<{
    field: string;
    booked?: any;
    amended?: any;
    matured?: any;
    cancelled?: any;
    expected: any;
    actual: any;
    result: 'PASS' | 'FAIL';
  }>;
  screenshots: ScreenshotEvidence[];
  evidenceHyperlink?: string;
}

export class EvidenceCollector {
  private outputDir: string;
  private scenarioResults: TradeScenarioResult[] = [];
  private executionLogs: string[] = [];
  private startTime: number;

  constructor() {
    this.outputDir = path.join(process.cwd(), 'reports', 'evidence');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    this.startTime = Date.now();
    this.log(`EvidenceCollector initialized. Output directory: ${this.outputDir}`);
  }

  public log(message: string): void {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}`;
    console.log(logLine);
    this.executionLogs.push(logLine);
  }

  public recordScenarioResult(result: TradeScenarioResult): void {
    this.scenarioResults.push(result);
    this.log(
      `Recorded Scenario: ${result.scenarioName} | Product: ${result.productType} | Status: ${result.status} | Hyperlink: ${result.evidenceHyperlink || 'N/A'}`
    );
  }

  public getResults(): TradeScenarioResult[] {
    return this.scenarioResults;
  }

  public getLogs(): string[] {
    return this.executionLogs;
  }

  public getTotalDurationSeconds(): number {
    return Math.round((Date.now() - this.startTime) / 1000);
  }

  public saveScreenshot(stepName: string, buffer: Buffer): ScreenshotEvidence {
    const sanitizedStep = stepName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${sanitizedStep}_${timestamp}.png`;
    const filePath = path.join(this.outputDir, fileName);

    fs.writeFileSync(filePath, buffer);
    this.log(`Screenshot saved: ${filePath}`);

    return {
      stepName,
      filePath,
      timestamp: new Date().toISOString(),
      hyperlink: `file://${filePath}`,
    };
  }

  public createEvidenceHtmlReport(result: TradeScenarioResult): string {
    const reportFileName = `${result.productType}_${result.scenarioName}_${result.tradeId || 'EVIDENCE'}.html`.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const reportPath = path.join(this.outputDir, reportFileName);

    const screenshotItems = result.screenshots
      .map(
        (s) => `
        <div style="margin-bottom: 20px; border: 1px solid #334155; padding: 12px; border-radius: 8px; background: #0f172a;">
          <h4 style="color: #60a5fa; margin: 0 0 8px 0; font-family: monospace;">Step: ${s.stepName}</h4>
          <a href="file://${s.filePath}" target="_blank" style="color: #34d399; font-size: 12px; font-family: monospace;">🔗 Open Full Resolution Screenshot Image</a>
          <div style="margin-top: 10px;">
            <img src="file://${s.filePath}" alt="${s.stepName}" style="max-width: 100%; border-radius: 6px; border: 1px solid #1e293b;" />
          </div>
        </div>
      `
      )
      .join('');

    const diffRows = (result.xmlDifferences || [])
      .map(
        (d) => `
        <tr style="background: ${d.isUnexpectedChange ? '#451a1a' : '#1e293b'}; color: ${d.isUnexpectedChange ? '#fca5a5' : '#f8fafc'}; font-family: monospace; font-size: 12px;">
          <td style="padding: 8px; border-bottom: 1px solid #334155;">${d.path}</td>
          <td style="padding: 8px; border-bottom: 1px solid #334155; font-weight: bold;">${d.type}</td>
          <td style="padding: 8px; border-bottom: 1px solid #334155;">${String(d.expectedValue ?? 'N/A')}</td>
          <td style="padding: 8px; border-bottom: 1px solid #334155;">${String(d.actualValue ?? 'N/A')}</td>
          <td style="padding: 8px; border-bottom: 1px solid #334155;">${d.isUnexpectedChange ? '⚠️ UNEXPECTED MUTATION' : '✅ INTENDED CHANGE'}</td>
        </tr>
      `
      )
      .join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Evidence Report: ${result.productType} - ${result.scenarioName}</title>
  <style>
    body { background-color: #0b0f19; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; }
    .card { background-color: #151b28; border: 1px solid #232d42; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .badge-pass { background: #064e3b; color: #34d399; border: 1px solid #059669; padding: 4px 12px; border-radius: 6px; font-weight: bold; font-family: monospace; }
    .badge-fail { background: #7f1d1d; color: #fca5a5; border: 1px solid #dc2626; padding: 4px 12px; border-radius: 6px; font-weight: bold; font-family: monospace; }
    h1, h2, h3 { margin-top: 0; color: #ffffff; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #1e293b; color: #94a3b8; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; font-family: monospace; }
    pre { background: #090d16; padding: 12px; border-radius: 6px; overflow-x: auto; color: #38bdf8; font-size: 12px; border: 1px solid #1e293b; }
  </style>
</head>
<body>
  <div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h2>Evidence Audit Report: ${result.productType} (${result.scenarioName})</h2>
      <span class="${result.status === 'PASS' ? 'badge-pass' : 'badge-fail'}">${result.status}</span>
    </div>
    <p><strong>Trade ID:</strong> <code style="color: #60a5fa;">${result.tradeId || 'N/A'}</code> | <strong>Execution Time:</strong> ${result.executionTimeMs} ms</p>
    <p><strong>Expected:</strong> ${result.expectedResult}</p>
    <p><strong>Actual:</strong> ${result.actualResult}</p>
  </div>

  ${
    result.xmlDifferences && result.xmlDifferences.length > 0
      ? `
  <div class="card">
    <h3>XML Node Differential Matrix</h3>
    <table>
      <thead>
        <tr>
          <th>XPath / Node Path</th>
          <th>Change Type</th>
          <th>Before Value</th>
          <th>After Value</th>
          <th>Validation Rule</th>
        </tr>
      </thead>
      <tbody>
        ${diffRows}
      </tbody>
    </table>
  </div>
  `
      : ''
  }

  <div class="card">
    <h3>Visual Screenshots Evidence (${result.screenshots.length})</h3>
    ${screenshotItems}
  </div>

  ${
    result.tradeXml
      ? `
  <div class="card">
    <h3>Trade Raw FpML XML</h3>
    <pre>${result.tradeXml.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
  </div>
  `
      : ''
  }
</body>
</html>`;

    fs.writeFileSync(reportPath, htmlContent);
    const hyperlink = `file://${reportPath}`;
    result.evidenceHyperlink = hyperlink;
    return hyperlink;
  }
}
