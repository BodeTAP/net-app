const express = require('express');
const { getSettings, updateSetting } = require('../controllers/settingController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getSettings);
router.put('/:key', authMiddleware, updateSetting);

module.exports = router;
