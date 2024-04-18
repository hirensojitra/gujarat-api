const express = require("express");
const router = express.Router();

const imagesController = require("../controller/images.controller");

router.post("/", imagesController.putImage);
router.get("/", imagesController.getImages);
router.delete("/", imagesController.deleteImages);

module.exports = router;
