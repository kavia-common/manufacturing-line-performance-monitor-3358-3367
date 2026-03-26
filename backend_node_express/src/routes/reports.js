const express = require("express");
const PDFDocument = require("pdfkit");
const { requireAuth, requireRole } = require("../middleware/auth");
const { computeOeeSummary } = require("../services/oeeService");

const router = express.Router();

function writeHeader(doc, title) {
  doc.fontSize(18).text(title, { align: "left" });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor("#666").text(`Generated: ${new Date().toISOString()}`);
  doc.moveDown(1);
  doc.fillColor("#000");
}

// PUBLIC_INTERFACE
router.get("/oee.pdf", requireAuth(), requireRole(["manager", "admin"]), (req, res) => {
  /**
   * Generates a simple PDF report for OEE summary.
   * Query: lineId, windowMin
   */
  const lineId = String(req.query.lineId || "LINE-1");
  const windowMin = req.query.windowMin ? Number(req.query.windowMin) : 480;
  const summary = computeOeeSummary({ lineId, windowMin });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="oee-report-${lineId}.pdf"`);

  const doc = new PDFDocument({ margin: 48, size: "A4" });
  doc.pipe(res);

  writeHeader(doc, `Ocean OEE Report — ${lineId}`);

  doc.fontSize(12).text(`Window: last ${summary.windowMin} minutes`);
  doc.moveDown(0.5);

  const k = summary.kpis;
  const pct = (v) => `${(Math.round(v * 1000) / 10).toFixed(1)}%`;
  doc.fontSize(12).text(`OEE: ${pct(k.oee)}`);
  doc.text(`Availability: ${pct(k.availability)}`);
  doc.text(`Performance: ${pct(k.performance)}`);
  doc.text(`Quality: ${pct(k.quality)}`);

  doc.moveDown(1);
  doc.fontSize(11).text(`Counts`);
  doc.fontSize(10).text(`Total: ${k.totalCount}`);
  doc.text(`Good: ${k.goodCount}`);
  doc.text(`Reject: ${k.rejectCount}`);

  doc.moveDown(1);
  doc.fontSize(11).text(`Time (minutes)`);
  doc.fontSize(10).text(`Planned: ${k.plannedProductionTimeMin}`);
  doc.text(`Downtime: ${k.downtimeMin}`);
  doc.text(`Runtime: ${k.runtimeMin}`);

  doc.end();
});

module.exports = router;
