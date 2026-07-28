const express = require('express');
const router = express.Router({ mergeParams: true });
const authenticate = require('../middleware/auth');
const ctrl = require('../controllers/tasks.controller');

router.use(authenticate);

// Nested under /api/projects/:projectId/tasks
router.post('/', ctrl.create);
router.get('/', ctrl.list);

module.exports = router;

// Standalone /api/tasks routes
const standalone = express.Router();
standalone.use(authenticate);
standalone.get('/my', ctrl.myTasks);
standalone.patch('/:id', ctrl.update);
module.exports.standalone = standalone;
