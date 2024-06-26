const express = require("express")
const cors = require('cors');
const app = express()

app.use(cors());
require('dotenv').config()

app.use(express.urlencoded({extended: false}))
app.use(express.json())

const postsRouter = require('./routes/posts.router')
const postDetail = require('./routes/post-detail.router')
const authRouter = require('./routes/auth.router')
const districtRouter = require('./routes/district.router')
const talukaRouter = require('./routes/taluka.router')
const villageRouter = require('./routes/village.router')
const imagesRouter = require('./routes/images.router')

app.use("/api/v1/posts", postsRouter)
app.use("/api/v1/post-detail", postDetail)
app.use("/api/v1/auth", authRouter)
app.use("/api/v1/district", districtRouter)
app.use("/api/v1/taluka", talukaRouter)
app.use("/api/v1/village", villageRouter)
app.use("/api/v1/images", imagesRouter)

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
    console.log("Server is running....", PORT)
})