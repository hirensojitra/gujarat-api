const express = require("express")
const router = express.Router()

const villageController = require("../controller/village.controller")

router.get("/", villageController.getAll)
router.get("/taluka/:id", villageController.getByTalukaId)
router.get("/deleted", villageController.getDeletedAll)
router.get("/deleted-by-taluka/:id", villageController.getDeletedByTalukaId)
router.get("/:id", villageController.getById)
router.post("/", villageController.create)
router.put("/:id", villageController.update)
router.put("/delete/:id", villageController.delete)
router.put("/restore/:id", villageController.restore)
router.get('/deleted/:id',villageController.deletedLength)

module.exports = router