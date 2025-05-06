require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { ApolloServer, gql } = require("apollo-server-express");

// GraphQL schemas & resolvers
const { typeDefs: districtTypeDefs } = require("./graphql/schemas/district.schema");
const { resolvers: districtResolvers } = require("./graphql/resolvers/district.resolvers");
const { typeDefs: talukaTypeDefs } = require("./graphql/schemas/taluka.schema");
const { resolvers: talukaResolvers } = require("./graphql/resolvers/taluka.resolvers");
const { typeDefs: villageTypeDefs } = require("./graphql/schemas/village.schema");
const { resolvers: villageResolvers } = require("./graphql/resolvers/village.resolvers");
const { typeDefs: registerTypeDefs } = require("./graphql/schemas/register.schema");
const { resolvers: registerResolvers} = require("./graphql/resolvers/register.resolvers");

const { typeDefs: loginTypeDefs } = require("./graphql/schemas/login.schema");
const { resolvers: loginResolvers} = require("./graphql/resolvers/login.resolvers");

// REST routes
const postsRouter = require('./routes/posts.router');
const postDetail = require('./routes/post-detail.router');
const authRouter = require('./routes/auth.router');
const districtRouter = require('./routes/district.router');
const talukaRouter = require('./routes/taluka.router');
const villageRouter = require('./routes/village.router');
const imagesRouter = require('./routes/images.router');
const thumbImagesRouter = require('./routes/thumb-images.router');
const folderRouter = require('./routes/img.router');
const userImgRouter = require('./routes/user-img.router');
const tokenRouter = require('./routes/token.router');
const trackRouter = require('./routes/track.router');

// Create Express app
const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());

// REST endpoints
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
app.use("/api/v1", tokenRouter); // Keep this last in REST chain if it uses wildcard routes

// GraphQL root types
const rootTypeDefs = gql`
  type Query
  type Mutation
`;

// Start Apollo Server and attach to Express
async function startGraphQL() {
  const server = new ApolloServer({
    typeDefs: [rootTypeDefs, districtTypeDefs, talukaTypeDefs, villageTypeDefs, registerTypeDefs, loginTypeDefs],
    resolvers: [districtResolvers, talukaResolvers, villageResolvers, registerResolvers, loginResolvers],
    context: ({ req }) => ({
      user: req.headers.authorization || null,
    }),
  });

  await server.start();
  server.applyMiddleware({ app, path: "/graphql" });
}

// Launch server
startGraphQL()
  .then(() => {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server ready at http://localhost:${PORT}`);
      console.log(`📦 REST endpoints under http://localhost:${PORT}/api/v1/...`);
      console.log(`🔮 GraphQL endpoint at http://localhost:${PORT}/graphql`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to start server:", err);
  });
