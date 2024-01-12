const express = require("express")
const router = express.Router()

const talukaController = require("../controller/taluka.controller")

router.get("/", talukaController.getAll)
router.get("/district/:id", talukaController.getByDistrictId)
router.get("/deleted", talukaController.getDeletedAll)
router.get("/deleted-by-district/:id", talukaController.getDeletedByDistrictId)
router.get("/:id", talukaController.getById)
router.post("/", talukaController.create)
router.put("/:id", talukaController.update)
router.put("/delete/:id", talukaController.delete)
router.put("/restore/:id", talukaController.restore)
router.get('/deleted/:id',talukaController.deletedLength)

module.exports = router