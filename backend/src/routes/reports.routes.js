const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');
const prisma = require('../config/db');

router.use(authenticate, requireRole('MANAGER', 'ADMIN'));

async function fetchProjectRows() {
  const projects = await prisma.project.findMany({
    include: { team: { select: { name: true } }, _count: { select: { tasks: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return projects.map((p) => ({
    title: p.title,
    team: p.team?.name || '',
    status: p.status,
    priority: p.priority,
    tasks: p._count.tasks,
    dueDate: p.dueDate ? p.dueDate.toISOString().slice(0, 10) : '',
  }));
}

// GET /api/reports/projects.pdf
router.get('/projects.pdf', async (req, res, next) => {
  try {
    const rows = await fetchProjectRows();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="projects-report.pdf"');

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);
    doc.fontSize(18).text('GoalSync — Projects Report', { align: 'center' }).moveDown();
    doc.fontSize(10);
    rows.forEach((r) => {
      doc.text(`${r.title}  |  Team: ${r.team}  |  Status: ${r.status}  |  Priority: ${r.priority}  |  Tasks: ${r.tasks}  |  Due: ${r.dueDate}`);
      doc.moveDown(0.3);
    });
    doc.end();
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/projects.xlsx
router.get('/projects.xlsx', async (req, res, next) => {
  try {
    const rows = await fetchProjectRows();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Projects');
    sheet.columns = [
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Team', key: 'team', width: 20 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Tasks', key: 'tasks', width: 10 },
      { header: 'Due Date', key: 'dueDate', width: 14 },
    ];
    sheet.addRows(rows);
    sheet.getRow(1).font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="projects-report.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
