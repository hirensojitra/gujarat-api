const express = require('express');
const router = express.Router();
const imgController = require('../controller/img.controller'); // Ensure this is correctly defined

// Create a new folder
router.post('/folders', imgController.createFolder);
router.get('/folders', imgController.getFolders);
router.post('/folders/:folderId/images', imgController.uploadImage);
router.get('/folders/:folderId/images', imgController.getImagesInFolder);
router.delete('/folders/:folderId/images/:imageId', imgController.deleteImage);
router.get('/uploads/:folderId/:imageName', imgController.getImageData);

module.exports = router;
