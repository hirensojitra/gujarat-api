require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { ApolloServer, gql } = require("apollo-server-express");
const {
  apolloUploadExpress,
  GraphQLUpload,
} = require("@apollographql/apollo-upload-server");

// GraphQL schemas & resolvers
const {
  typeDefs: districtTypeDefs,
} = require("./graphql/schemas/district.schema");
const {
  resolvers: districtResolvers,
} = require("./graphql/resolvers/district.resolvers");
const { typeDefs: talukaTypeDefs } = require("./graphql/schemas/taluka.schema");
const {
  resolvers: talukaResolvers,
} = require("./graphql/resolvers/taluka.resolvers");
const {
  typeDefs: villageTypeDefs,
} = require("./graphql/schemas/village.schema");
const {
  resolvers: villageResolvers,
} = require("./graphql/resolvers/village.resolvers");
const {
  typeDefs: registerTypeDefs,
} = require("./graphql/schemas/register.schema");
const {
  resolvers: registerResolvers,
} = require("./graphql/resolvers/register.resolvers");
const { typeDefs: loginTypeDefs } = require("./graphql/schemas/login.schema");
const {
  resolvers: loginResolvers,
} = require("./graphql/resolvers/login.resolvers");
const {
  typeDefs: userUpdateTypeDefs,
} = require("./graphql/schemas/update-user.schema");
const {
  resolvers: userUpdateResolvers,
} = require("./graphql/resolvers/update-user.resolvers");
const {
  typeDefs: languageTypeDefs,
} = require("./graphql/schemas/language.schema");
const {
  resolvers: languageResolvers,
} = require("./graphql/resolvers/language.resolvers");
const { typeDefs: roleTypeDefs } = require("./graphql/schemas/role.schema");
const {
  resolvers: roleResolvers,
} = require("./graphql/resolvers/role.resolvers");
const {
  typeDefs: postDetailTypeDefs,
} = require("./graphql/schemas/post-detail.schema");
const {
  resolvers: postDetailResolvers,
} = require("./graphql/resolvers/post-detail.resolvers");
const {
  typeDefs: postCategoriesTypeDefs,
} = require("./graphql/schemas/post-category.schema");
const {
  resolvers: postCategoriesResolvers,
} = require("./graphql/resolvers/post-category.resolvers");
const {
  typeDefs: postSubCategoriesTypeDefs,
} = require("./graphql/schemas/post-subcategory.schema");
const {
  resolvers: postSubCategoriesResolvers,
} = require("./graphql/resolvers/post-subcategory.resolvers");

// REST routes
const postsRouter = require("./routes/posts.router");
const postDetail = require("./routes/post-detail.router");
const authRouter = require("./routes/auth.router");
const districtRouter = require("./routes/district.router");
const talukaRouter = require("./routes/taluka.router");
const villageRouter = require("./routes/village.router");
const imagesRouter = require("./routes/images.router");
const thumbImagesRouter = require("./routes/thumb-images.router");
const folderRouter = require("./routes/img.router");
const userImgRouter = require("./routes/user-img.router");
const tokenRouter = require("./routes/token.router");
const trackRouter = require("./routes/track.router");

const app = express();

// ─── CORS CONFIG ────────────────────────────────────────────────────────────
const allowedOrigins = [
  "https://www.postnew.in",
  "http://192.168.151.203:4500",
  "https://studio.apollographql.com",
];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.options("/graphql", cors(corsOptions));

// ─── REST ENDPOINTS ─────────────────────────────────────────────────────────
app.use("/api/v1/posts", postsRouter);
app.use("/api/v1/post-detail", postDetail);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/district", districtRouter);
app.use("/api/v1/taluka", talukaRouter);
app.use("/api/v1/village", villageRouter);
app.use("/api/v1/images", imagesRouter);
app.use("/api/v1/thumb-images", thumbImagesRouter);
app.use("/api/v1/img", folderRouter);
app.use("/api/v1/user-img", userImgRouter);
app.use("/api/v1/track", trackRouter);
app.use("/api/v1", tokenRouter);

// ─── GraphQL root types ─────────────────────────────────────────────────────
const rootTypeDefs = gql`
  scalar Upload
  type Query
  type Mutation
`;

// ─── Start Apollo Server and attach to Express ──────────────────────────────
async function startGraphQL() {
  const server = new ApolloServer({
    typeDefs: [
      rootTypeDefs,
      districtTypeDefs,
      talukaTypeDefs,
      villageTypeDefs,
      registerTypeDefs,
      loginTypeDefs,
      userUpdateTypeDefs,
      languageTypeDefs,
      roleTypeDefs,
      postDetailTypeDefs,
      postCategoriesTypeDefs,
      postSubCategoriesTypeDefs,
    ],
    resolvers: [
      { Upload: GraphQLUpload },
      districtResolvers,
      talukaResolvers,
      villageResolvers,
      registerResolvers,
      loginResolvers,
      userUpdateResolvers,
      languageResolvers,
      roleResolvers,
      postDetailResolvers,
      postCategoriesResolvers,
      postSubCategoriesResolvers,
    ],
    context: ({ req, res }) => ({
      req,
      res,
      user: req.headers.authorization || null,
    }),
  });

  await server.start();

  // handle file uploads via multipart requests
  app.use(
    "/graphql",
    apolloUploadExpress({
      maxFieldSize: 1_000_000, // 1 MB
      maxFileSize: 10_000_000, // 10 MB per file
      maxFiles: 10, // max 10 files
    })
  );

  // Disable built-in CORS (we did it above)
  server.applyMiddleware({ app, path: "/graphql", cors: false });
}

// ─── Launch server ────────────────────────────────────────────────────────────
startGraphQL()
  .then(() => {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server ready at http://localhost:${PORT}`);
      console.log(`🔮 GraphQL endpoint at http://localhost:${PORT}/graphql`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to start server:", err);
  });
