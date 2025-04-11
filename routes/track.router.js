const express = require('express');
const router = express.Router();
const trackController = require('../controller/track.controller');


// POST endpoint to save data and generate/update an Excel file
router.post('/saveData', trackController.saveData);

module.exports = router;
