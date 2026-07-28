const express = require('express');
const router = express.Router({ mergeParams: true });
const authenticate = require('../middleware/auth');
const ctrl = require('../controllers/documents.controller');

router.use(authenticate);

// Nested under /api/projects/:projectId/documents
router.post('/', ctrl.upload.single('file'), ctrl.upload_);
router.get('/', ctrl.list);

module.exports = router;

const standalone = express.Router();
standalone.use(authenticate);
standalone.delete('/:id', ctrl.remove);
module.exports.standalone = standalone;
