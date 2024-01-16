const express = require("express")
const router = express.Router()

const authController = require("../controller/auth.controller")

router.post("/register", authController.register)
router.post("/updateUser/:username", authController.updateUser)
router.post("/login", authController.login)

module.exports = router