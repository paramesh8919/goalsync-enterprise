const express = require('express');
const router = express.Router({ mergeParams: true });
const authenticate = require('../middleware/auth');
const ctrl = require('../controllers/milestones.controller');

router.use(authenticate);

// Nested under /api/projects/:projectId/milestones
router.post('/', ctrl.create);
router.get('/', ctrl.list);

module.exports = router;

// Standalone /api/milestones/:id routes are exported separately for index.js to mount.
const standalone = express.Router();
standalone.use(authenticate);
standalone.patch('/:id', ctrl.update);
standalone.delete('/:id', ctrl.remove);
module.exports.standalone = standalone;
