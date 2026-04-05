const express = require("express");
const router = express.Router();
const electionPostController = require("../controller/election-post-detail.controller");

router.get("/", electionPostController.getAllData);
router.put("/update/", electionPostController.updateData);
router.get("/get/:id", electionPostController.getDataById);
router.delete("/soft-delete/:id", electionPostController.softDeleteData);
router.delete("/recover/:id", electionPostController.recoverData);
router.delete("/hard-delete/:id", electionPostController.hardDeleteData);
router.get("/soft-deleted/", electionPostController.getAllSoftDeletedData);
router.get("/post-length/", electionPostController.getPostLength);
router.get("/post-deleted-length/", electionPostController.getDeletedPostLength);
router.get("/download-counter/:id", electionPostController.getDownloadCounter);
router.get("/update-download-counter/:id", electionPostController.updateDownloadCounter);
router.post('/:postId/thumbnail', electionPostController.uploadThumbnail);
router.post('/', electionPostController.addPost);

module.exports = router;
