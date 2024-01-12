const express = require("express")
const cors = require('cors');
const app = express()

app.use(cors());
require('dotenv').config()

app.use(express.urlencoded({extended: false}))
app.use(express.json())

const postsRouter = require('./routes/posts.router')
const authRouter = require('./routes/auth.router')
const districtRouter = require('./routes/district.router')
const talukaRouter = require('./routes/taluka.router')
const villageRouter = require('./routes/village.router')

app.use("/api/v1/posts", postsRouter)
app.use("/api/v1/auth", authRouter)
app.use("/api/v1/district", districtRouter)
app.use("/api/v1/taluka", talukaRouter)
app.use("/api/v1/village", villageRouter)

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
    console.log("Server is running....")
})