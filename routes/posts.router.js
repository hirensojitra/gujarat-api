const express = require("express");
const router = express.Router();
const postController = require("../controller/posts.controller");

router.get("/", postController.getAllData);
router.put("/update/", postController.updateData);
router.get("/get/:id", postController.getDataById);
router.delete("/soft-delete/:id", postController.softDeleteData);
router.delete("/hard-delete/:id", postController.hardDeleteData);
router.get("/soft-deleted/", postController.getAllSoftDeletedData);
router.get("/post-length/", postController.getPostLength);
router.get("/post-deleted-length/", postController.getDeletedPostLength);
router.post('/', postController.addPost);

module.exports = router;
