const express = require('express');
const router = express.Router();
const imgController = require('../controller/img.controller');

router.post('/folders', imgController.createFolder);
router.get('/folders', imgController.getFolders);
router.put('/folders/:folderId/rename', imgController.renameFolder);
router.post('/folders/:folderId/images', imgController.uploadImage);
router.get('/folders/:folderId/images', imgController.getImagesInFolder);
router.delete('/folders/:folderId/images/:imageId', imgController.deleteImage);
router.get('/uploads/:imageId', imgController.getImageData);
router.delete('/folders/:folderId', imgController.deleteFolder);
router.post('/folders/:folderId/images/:imageId/refresh', imgController.refreshImage);
router.get('/folders/count', imgController.getTotalFolderCount);
router.get('/folders/:folderId/images/count', imgController.getTotalImageCountInFolder);
module.exports = router;
