const express = require('express');
const router = express.Router();
const userImgController = require('../controller/user-img.controller');
const authenticateToken = require("../middleware/authenticateToken");

router.post('/folders', authenticateToken, userImgController.createFolder);
router.get('/folders', userImgController.getFolders);
router.put('/folders/:folderId/rename', authenticateToken, userImgController.renameFolder);
router.post('/folders/:folderId/images', authenticateToken, userImgController.uploadImage);
router.get('/folders/:folderId/images', userImgController.getImagesInFolder);
router.delete('/folders/:folderId/images/:imageId', authenticateToken, userImgController.deleteImage);
router.get('/uploads/:imageId', userImgController.getImageData);
router.delete('/folders/:folderId', authenticateToken, userImgController.deleteFolder);
router.post('/folders/:folderId/images/:imageId/refresh', authenticateToken, userImgController.refreshImage);
router.get('/folders/count', userImgController.getTotalFolderCount);
router.get('/folders/:folderId/images/count', userImgController.getTotalImageCountInFolder);

module.exports = router;
