const path = require('path');
const multer = require('multer');
const prisma = require('../config/db');
const { logAudit } = require('../utils/audit');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB cap

async function canManage(user, project) {
  return ['ADMIN', 'MANAGER'].includes(user.role) || project.createdById === user.id;
}

// POST /api/projects/:projectId/documents  (multipart/form-data, field name "file")
async function upload_(req, res, next) {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (!(await canManage(req.user, project))) return res.status(403).json({ success: false, message: 'Not authorized' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const doc = await prisma.projectDocument.create({
      data: {
        projectId: project.id,
        fileName: req.file.originalname,
        fileUrl: `/uploads/${req.file.filename}`,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        uploadedById: req.user.id,
      },
    });
    await logAudit({ userId: req.user.id, action: 'DOCUMENT_UPLOADED', entity: 'ProjectDocument', entityId: doc.id });
    res.status(201).json({ success: true, document: doc });
  } catch (err) {
    next(err);
  }
}

// GET /api/projects/:projectId/documents
async function list(req, res, next) {
  try {
    const documents = await prisma.projectDocument.findMany({
      where: { projectId: req.params.projectId },
      include: { uploadedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, documents });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const doc = await prisma.projectDocument.findUnique({ where: { id: req.params.id }, include: { project: true } });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    if (!(await canManage(req.user, doc.project)) && doc.uploadedById !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await prisma.projectDocument.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Document deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { upload, upload_, list, remove };
