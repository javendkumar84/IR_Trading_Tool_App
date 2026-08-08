import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { EvidenceCollector, TradeScenarioResult } from './EvidenceCollector';

export class PdfReportGenerator {
  /**
   * Generates a PDF Test Evidence Report based on EvidenceCollector metrics.
   */
  public async generateReport(collector: EvidenceCollector, outputPath?: string): Promise<string> {
    const results = collector.getResults();
    const finalPath = outputPath || path.join(process.cwd(), 'reports', 'pdf', 'test-evidence-report.pdf');

    const pdfDir = path.dirname(finalPath);
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 36, size: 'A4', autoFirstPage: false });
      const stream = fs.createWriteStream(finalPath);
      doc.pipe(stream);

      // Color Palette
      const primaryColor = '#0f172a'; // slate-900
      const accentColor = '#2563eb'; // blue-600
      const passColor = '#16a34a'; // green-600
      const failColor = '#dc2626'; // red-600
      const textColor = '#334155'; // slate-700
      const bgColor = '#f8fafc'; // slate-50

      // PAGE 1: COVER PAGE
      doc.addPage();
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(primaryColor);

      doc.fillColor('#ffffff').fontSize(26).text('ENTERPRISE FINANCIAL TRADING SYSTEM', 40, 150, { align: 'center' });
      doc.fontSize(18).fillColor('#93c5fd').text('Trade Capture & Lifecycle Test Evidence Report', { align: 'center' });
      
      doc.moveTo(100, 220).lineTo(doc.page.width - 100, 220).strokeColor('#3b82f6').lineWidth(2).stroke();

      doc.fontSize(12).fillColor('#cbd5e1');
      const coverDetailsY = 260;
      doc.text(`Project Name: Enterprise IR Trading Tool Suite`, 100, coverDetailsY);
      doc.text(`Application Name: IR Derivatives Trade Capture Engine`, 100, coverDetailsY + 25);
      doc.text(`Environment: Localhost / Staging (Port 3000)`, 100, coverDetailsY + 50);
      doc.text(`Execution Date: ${new Date().toLocaleString()}`, 100, coverDetailsY + 75);
      doc.text(`Framework Version: Playwright v1.62.1 (TypeScript)`, 100, coverDetailsY + 100);
      doc.text(`Executed By: Senior Playwright Automation Architect`, 100, coverDetailsY + 125);
      doc.text(`Total Duration: ${collector.getTotalDurationSeconds()} seconds`, 100, coverDetailsY + 150);

      doc.fontSize(10).fillColor('#64748b').text('CONFIDENTIAL & PROPRIETARY - QA AUTOMATION EVIDENCE', 40, doc.page.height - 60, { align: 'center' });

      // PAGE 2: EXECUTIVE SUMMARY & SCENARIO METRICS
      doc.addPage();
      this.drawHeader(doc, 'Executive Summary & Execution Overview', primaryColor);

      const totalProducts = new Set(results.map((r) => r.productType)).size;
      const bookedCount = results.filter((r) => r.scenarioName === 'Booking').length;
      const amendedCount = results.filter((r) => r.scenarioName === 'Amendment').length;
      const maturedCount = results.filter((r) => r.scenarioName === 'Maturity').length;
      const cancelledCount = results.filter((r) => r.scenarioName === 'Cancellation').length;
      const passCount = results.filter((r) => r.status === 'PASS').length;
      const failCount = results.filter((r) => r.status === 'FAIL').length;
      const skipCount = results.filter((r) => r.status === 'SKIPPED').length;
      const totalScenarios = results.length;
      const successRate = totalScenarios > 0 ? ((passCount / totalScenarios) * 100).toFixed(1) : '100.0';

      doc.fontSize(11).fillColor(textColor);
      doc.text(`Total Supported Products Tested: ${totalProducts}`, 40, 90);
      doc.text(`Trades Booked: ${bookedCount} | Amended: ${amendedCount} | Matured: ${maturedCount} | Cancelled: ${cancelledCount}`, 40, 110);
      doc.text(`Passed: ${passCount} | Failed: ${failCount} | Skipped: ${skipCount}`, 40, 130);
      doc.text(`Overall Success Rate: ${successRate}%`, 40, 150);

      // Summary Table
      doc.fontSize(12).fillColor(primaryColor).text('Execution Summary Matrix', 40, 190);
      
      let tableY = 215;
      this.drawTableRow(doc, tableY, ['Scenario', 'PASS', 'FAIL', 'SKIPPED', 'TOTAL'], true);
      tableY += 25;

      const scenarioNames: Array<'Booking' | 'Amendment' | 'Maturity' | 'Cancellation'> = ['Booking', 'Amendment', 'Maturity', 'Cancellation'];
      for (const sc of scenarioNames) {
        const scPass = results.filter((r) => r.scenarioName === sc && r.status === 'PASS').length;
        const scFail = results.filter((r) => r.scenarioName === sc && r.status === 'FAIL').length;
        const scSkip = results.filter((r) => r.scenarioName === sc && r.status === 'SKIPPED').length;
        const scTot = scPass + scFail + scSkip;
        this.drawTableRow(doc, tableY, [sc, String(scPass), String(scFail), String(scSkip), String(scTot)]);
        tableY += 20;
      }

      // PAGE 3+: DETAILED SCENARIO VALIDATIONS & EVIDENCE
      for (const res of results) {
        doc.addPage();
        this.drawHeader(doc, `${res.productType} - ${res.scenarioName} Validation`, primaryColor);

        let curY = 65;

        // Scenario Status Badge Header
        const badgeColor = res.status === 'PASS' ? passColor : res.status === 'FAIL' ? failColor : '#64748b';
        doc.rect(40, curY, doc.page.width - 80, 26).fill(bgColor);
        doc.rect(40, curY, 6, 26).fill(badgeColor);

        doc.fontSize(11).fillColor(primaryColor).font('Helvetica-Bold');
        doc.text(`PRODUCT: ${res.productType}  |  SCENARIO: ${res.scenarioName.toUpperCase()}  |  TRADE ID: ${res.tradeId || 'PENDING'}`, 52, curY + 7);

        doc.fontSize(10).fillColor(badgeColor).font('Helvetica-Bold');
        doc.text(`[ ${res.status} ]`, doc.page.width - 100, curY + 7, { align: 'right' });

        curY += 38;

        // Execution Details Box
        doc.fontSize(9).font('Helvetica').fillColor(textColor);
        doc.text(`Execution Time: ${res.executionTimeMs} ms`, 40, curY);
        curY += 15;
        doc.text(`Expected Contract: ${res.expectedResult}`, 40, curY);
        curY += 15;
        doc.text(`Actual Runtime Result: ${res.actualResult}`, 40, curY);
        curY += 20;

        // RENDER FAILURE ROOT-CAUSE BREAKDOWN (IF FAILED)
        if (res.status === 'FAIL' || res.reason || res.failureRootCause) {
          doc.rect(40, curY, doc.page.width - 80, 55).fill('#fef2f2');
          doc.rect(40, curY, 4, 55).fill(failColor);

          doc.fontSize(10).font('Helvetica-Bold').fillColor(failColor);
          doc.text(`FAILED TEST DIAGNOSIS & ROOT CAUSE ANALYSIS`, 50, curY + 6);

          doc.fontSize(8.5).font('Helvetica').fillColor('#991b1b');
          const catText = res.failureCategory ? `Category: ${res.failureCategory} | ` : '';
          const reasonText = res.failureRootCause || res.reason || res.actualResult;
          doc.text(`${catText}${reasonText}`, 50, curY + 20, { width: doc.page.width - 100 });

          curY += 65;
        }

        // RENDER XML COMPARISON & FIELD DIFFERENCES TABLE
        if (res.xmlDifferences && res.xmlDifferences.length > 0) {
          doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor);
          doc.text('FpML XML & UI Field Structural Node Comparison Matrix', 40, curY);
          curY += 14;

          // Diff Table Header
          doc.rect(40, curY, 515, 18).fill('#e2e8f0');
          doc.fontSize(8.5).font('Helvetica-Bold').fillColor(primaryColor);
          doc.text('XML Node Path', 45, curY + 4, { width: 180 });
          doc.text('Type', 230, curY + 4, { width: 65, align: 'center' });
          doc.text('Expected / Booked Value', 300, curY + 4, { width: 125 });
          doc.text('Actual / Amended Value', 430, curY + 4, { width: 120 });
          curY += 18;

          for (const diff of res.xmlDifferences.slice(0, 8)) {
            const diffColor = diff.type === 'MODIFIED' ? '#d97706' : diff.type === 'ADDED' ? '#2563eb' : failColor;
            doc.rect(40, curY, 515, 16).fill('#f8fafc');
            doc.fontSize(8).font('Helvetica-Bold').fillColor('#334155');
            doc.text(diff.path.slice(-32), 45, curY + 3, { width: 180 });

            doc.fillColor(diffColor).text(diff.type, 230, curY + 3, { width: 65, align: 'center' });

            doc.font('Helvetica').fillColor('#475569');
            doc.text(String(diff.expectedValue ?? 'N/A').slice(0, 24), 300, curY + 3, { width: 125 });
            doc.text(String(diff.actualValue ?? 'N/A').slice(0, 24), 430, curY + 3, { width: 120 });

            doc.moveTo(40, curY + 16).lineTo(555, curY + 16).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
            curY += 16;
          }

          if (res.xmlDifferences.length > 8) {
            doc.fontSize(8).font('Helvetica-Oblique').fillColor('#64748b');
            doc.text(`... and ${res.xmlDifferences.length - 8} more node comparison differences logged cleanly.`, 40, curY + 3);
            curY += 14;
          }
          curY += 15;
        } else if (res.diffSummary) {
          doc.fontSize(9.5).font('Helvetica-Bold').fillColor(primaryColor);
          doc.text('XML Node Comparison Summary', 40, curY);
          curY += 14;

          doc.rect(40, curY, doc.page.width - 80, 28).fill('#f1f5f9');
          doc.font('Courier').fontSize(8).fillColor('#334155').text(res.diffSummary, 48, curY + 7, { width: 500 });
          curY += 38;
        }

        // RENDER SCREENSHOT EVIDENCE
        if (res.screenshots && res.screenshots.length > 0) {
          for (const shot of res.screenshots) {
            if (fs.existsSync(shot.filePath)) {
              if (curY + 190 > doc.page.height - 40) {
                doc.addPage();
                this.drawHeader(doc, `${res.productType} - ${res.scenarioName} Visual Evidence`, primaryColor);
                curY = 65;
              }

              doc.fontSize(9.5).font('Helvetica-Bold').fillColor(accentColor);
              doc.text(`Visual Screenshot Evidence: ${shot.stepName} (${shot.timestamp.split('T')[1].split('.')[0]} UTC)`, 40, curY);
              curY += 14;

              try {
                doc.image(shot.filePath, 40, curY, { fit: [515, 170], align: 'center' });
                doc.rect(40, curY, 515, 170).strokeColor('#cbd5e1').lineWidth(1).stroke();
                curY += 180;
              } catch (e) {
                doc.fontSize(8).fillColor(failColor).text(`Failed to embed screenshot image: ${e}`, 40, curY);
                curY += 20;
              }
            }
          }
        }
      }

      // PAGE OVERALL RESULT
      doc.addPage();
      this.drawHeader(doc, 'Overall Final Test Result', primaryColor);

      const overallStatus = failCount === 0 ? 'PASS' : 'FAIL';
      const statusBgColor = overallStatus === 'PASS' ? passColor : failColor;

      doc.rect(40, 100, doc.page.width - 80, 100).fill(statusBgColor);
      doc.fontSize(28).fillColor('#ffffff').text(`OVERALL RESULT: ${overallStatus}`, 40, 135, { align: 'center' });

      doc.fontSize(12).fillColor(textColor);
      doc.text(`Total Products Tested: ${totalProducts}`, 40, 230);
      doc.text(`Total Scenarios Executed: ${results.length}`, 40, 255);
      doc.text(`Total Passed: ${passCount}`, 40, 280);
      doc.text(`Total Failed: ${failCount}`, 40, 305);
      doc.text(`Success Rate: ${successRate}%`, 40, 330);
      doc.text(`Execution Time: ${collector.getTotalDurationSeconds()} seconds`, 40, 355);

      doc.end();

      stream.on('finish', () => {
        collector.log(`PDF report generated successfully at: ${finalPath}`);
        resolve(finalPath);
      });
      stream.on('error', (err) => reject(err));
    });
  }

  private drawHeader(doc: PDFKit.PDFDocument, title: string, color: string) {
    doc.rect(0, 0, doc.page.width, 50).fill(color);
    doc.fontSize(14).fillColor('#ffffff').text(title, 40, 18);
  }

  private drawTableRow(doc: PDFKit.PDFDocument, y: number, cols: string[], isHeader = false) {
    const colWidths = [150, 80, 80, 80, 80];
    let x = 40;

    if (isHeader) {
      doc.rect(x, y, 470, 20).fill('#e2e8f0');
      doc.fontSize(10).fillColor('#0f172a').font('Helvetica-Bold');
    } else {
      doc.fontSize(9).fillColor('#334155').font('Helvetica');
    }

    cols.forEach((c, idx) => {
      doc.text(c, x + 5, y + 4, { width: colWidths[idx] - 10, align: idx === 0 ? 'left' : 'center' });
      x += colWidths[idx];
    });

    doc.moveTo(40, y + 20).lineTo(510, y + 20).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
  }
}
