const express = require('express');
const multer = require('multer');
const path = require('path');
const imageController = require('../controller/image.controller');

const router = express.Router();
const imagesDir = path.join(__dirname, '../images');
const fs = require('fs-extra');
// Ensure the images directory exists
fs.ensureDirSync(imagesDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, imagesDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

router.get('/image', imageController.getAllImages);
router.get('/image/deleted', imageController.getAllDeletedImages);
router.post('/image', upload.single('image'), imageController.addImage);
router.patch('/image/soft-delete/:id', imageController.softDeleteImage);
router.patch('/image/restore/:id', imageController.restoreImage);
router.delete('/image/:id', imageController.hardDeleteImage);

module.exports = router;
