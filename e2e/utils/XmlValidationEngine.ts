import { XMLParser, XMLBuilder } from 'fast-xml-parser';

export interface XmlNodeDifference {
  path: string;
  type: 'ADDED' | 'REMOVED' | 'MODIFIED';
  expectedValue: any;
  actualValue: any;
  details?: string;
}

export interface XmlComparisonResult {
  status: 'PASS' | 'FAIL';
  totalNodesCompared: number;
  matchedNodesCount: number;
  differences: XmlNodeDifference[];
  htmlReport: string;
  summaryTableText: string;
}

export class XmlValidationEngine {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      trimValues: true,
    });
  }

  /**
   * Parse raw XML string to JS object.
   */
  public parseXml(xmlString: string): any {
    if (!xmlString || typeof xmlString !== 'string') {
      throw new Error('Invalid XML string provided');
    }
    return this.parser.parse(xmlString);
  }

  /**
   * Compare expected XML vs actual XML or Booked XML vs Amended XML
   */
  public compareXml(expectedXml: string, actualXml: string, ignoredPaths: string[] = []): XmlComparisonResult {
    const expectedObj = this.parseXml(expectedXml);
    const actualObj = this.parseXml(actualXml);

    const differences: XmlNodeDifference[] = [];
    let totalCompared = 0;
    let totalMatched = 0;

    const walkAndCompare = (exp: any, act: any, path: string) => {
      if (ignoredPaths.includes(path)) {
        return;
      }

      if (typeof exp === 'object' && exp !== null && typeof act === 'object' && act !== null) {
        const expKeys = Object.keys(exp);
        const actKeys = Object.keys(act);
        const allKeys = Array.from(new Set([...expKeys, ...actKeys]));

        for (const key of allKeys) {
          const currentPath = path ? `${path}.${key}` : key;
          if (ignoredPaths.includes(currentPath)) continue;

          if (!(key in exp)) {
            differences.push({
              path: currentPath,
              type: 'ADDED',
              expectedValue: undefined,
              actualValue: act[key],
              details: `Node ${currentPath} was added in actual XML`,
            });
            totalCompared++;
          } else if (!(key in act)) {
            differences.push({
              path: currentPath,
              type: 'REMOVED',
              expectedValue: exp[key],
              actualValue: undefined,
              details: `Node ${currentPath} was removed in actual XML`,
            });
            totalCompared++;
          } else {
            walkAndCompare(exp[key], act[key], currentPath);
          }
        }
      } else {
        totalCompared++;
        const expStr = String(exp ?? '').trim();
        const actStr = String(act ?? '').trim();

        if (expStr === actStr) {
          totalMatched++;
        } else {
          differences.push({
            path,
            type: 'MODIFIED',
            expectedValue: expStr,
            actualValue: actStr,
            details: `Value mismatch at ${path}`,
          });
        }
      }
    };

    walkAndCompare(expectedObj, actualObj, '');

    const isPass = differences.length === 0;
    const status = isPass ? 'PASS' : 'FAIL';

    const htmlReport = this.generateHtmlDiffTable(status, differences);
    const summaryTableText = this.generateSummaryTableText(status, totalCompared, totalMatched, differences);

    return {
      status,
      totalNodesCompared: totalCompared,
      matchedNodesCount: totalMatched,
      differences,
      htmlReport,
      summaryTableText,
    };
  }

  /**
   * Generates a clean HTML table highlighting node differences
   */
  public generateHtmlDiffTable(status: 'PASS' | 'FAIL', differences: XmlNodeDifference[]): string {
    if (differences.length === 0) {
      return `
        <div class="xml-diff-container pass">
          <div class="diff-header pass">XML VALIDATION PASSED - EXACT MATCH</div>
          <p>All XML nodes and attributes match perfectly.</p>
        </div>
      `;
    }

    const rowsHtml = differences
      .map(
        (diff) => `
      <tr class="diff-row ${diff.type.toLowerCase()}">
        <td><code>${diff.path}</code></td>
        <td><span class="badge ${diff.type.toLowerCase()}">${diff.type}</span></td>
        <td><pre>${diff.expectedValue ?? 'N/A'}</pre></td>
        <td><pre>${diff.actualValue ?? 'N/A'}</pre></td>
        <td>${diff.details || ''}</td>
      </tr>
    `
      )
      .join('');

    return `
      <div class="xml-diff-container fail">
        <div class="diff-header fail">XML VALIDATION ${status} - ${differences.length} DIFFERENCE(S) FOUND</div>
        <table class="diff-table">
          <thead>
            <tr>
              <th>Node Path</th>
              <th>Diff Type</th>
              <th>Expected / Booked Value</th>
              <th>Actual / Amended Value</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }

  private generateSummaryTableText(
    status: 'PASS' | 'FAIL',
    compared: number,
    matched: number,
    differences: XmlNodeDifference[]
  ): string {
    let summary = `Status: ${status} | Total Compared: ${compared} | Matched: ${matched} | Diffs: ${differences.length}\n`;
    if (differences.length > 0) {
      summary += `Differences Summary:\n`;
      differences.forEach((d, idx) => {
        summary += ` ${idx + 1}. [${d.type}] ${d.path}: Expected '${d.expectedValue}' vs Actual '${d.actualValue}'\n`;
      });
    }
    return summary;
  }
}
