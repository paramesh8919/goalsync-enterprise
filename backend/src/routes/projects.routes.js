const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const ctrl = require('../controllers/projects.controller');

router.use(authenticate);

router.post('/', ctrl.create);
router.get('/', ctrl.list);
router.get('/pending-approval', ctrl.listPendingApproval);
router.get('/:id', ctrl.getOne);
router.patch('/:id', ctrl.update);
router.post('/:id/submit', ctrl.submit);
router.post('/:id/decision', ctrl.decide);

module.exports = router;
