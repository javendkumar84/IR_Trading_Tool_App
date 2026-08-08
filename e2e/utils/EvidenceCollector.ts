import * as fs from 'fs';
import * as path from 'path';

export interface ScreenshotEvidence {
  stepName: string;
  filePath: string;
  timestamp: string;
}

export interface XmlDiffDetail {
  path: string;
  type: 'ADDED' | 'REMOVED' | 'MODIFIED';
  expectedValue: any;
  actualValue: any;
  details?: string;
}

export interface TradeScenarioResult {
  productType: string;
  tradeId?: string;
  scenarioName: 'Booking' | 'Amendment' | 'Maturity' | 'Cancellation';
  status: 'PASS' | 'FAIL' | 'SKIPPED';
  executionTimeMs: number;
  expectedResult: string;
  actualResult: string;
  reason?: string;
  failureCategory?: 'SCHEMA_MISMATCH' | 'VALUE_MISMATCH' | 'NETWORK_ERROR' | 'UI_STATE_ERROR' | 'DATABASE_MISMATCH';
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
    this.log(`EvidenceCollector initialized. Output dir: ${this.outputDir}`);
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
      `Recorded Scenario: ${result.scenarioName} | Product: ${result.productType} | Status: ${result.status}`
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
    };
  }
}
