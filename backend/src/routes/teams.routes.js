const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const ctrl = require('../controllers/teams.controller');

router.use(authenticate);

router.post('/', ctrl.create);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.patch('/:id', ctrl.update);
router.post('/:id/members', ctrl.addMember);
router.delete('/:id/members/:userId', ctrl.removeMember);

module.exports = router;
