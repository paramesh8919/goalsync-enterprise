const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');
const { listPending, decide } = require('../controllers/approvals.controller');

router.use(authenticate, requireRole('MANAGER', 'ADMIN'));

router.get('/users', listPending);
router.post('/users/:id/decision', decide);

module.exports = router;
