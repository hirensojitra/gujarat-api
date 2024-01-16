const express = require("express")
const router = express.Router()

const districtController = require("../controller/district.controller")

router.get("/", districtController.getAll)
router.get("/deleted/", districtController.getDeletedAll)
router.get("/:id", districtController.getById)
router.post("/", districtController.create)
router.put("/:id", districtController.update)
router.delete("/:id", districtController.delete)
router.delete("/restore/:id", districtController.restore)
router.get("/deleted/count", districtController.deletedLength)

module.exports = router