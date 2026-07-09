const express = require('express');
const { getSettings, updateSetting } = require('../controllers/settingController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authenticate, authorize(['SUPERADMIN']), getSettings);
router.put('/:key', authenticate, authorize(['SUPERADMIN']), updateSetting);

module.exports = router;
