const express = require("express");
const router = express.Router();

const imagesController = require("../controller/thumb-images.controller");

router.post("/upload", imagesController.putImage);
router.get("/:id?", imagesController.getImages);
router.put("/:id", imagesController.updateImage);
router.delete("/:id", imagesController.deleteImages);

module.exports = router;
