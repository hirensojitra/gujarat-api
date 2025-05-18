require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { ApolloServer, gql } = require("apollo-server-express");
const { graphqlUploadExpress, GraphQLUpload } = require("graphql-upload");
const jwt = require("jsonwebtoken");
const pool = require("./database");

const app = express();
const JWT_SECRET = process.env.JWT_SECRET;

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

// ─── Handle file uploads via graphql-upload middleware ──────────────────────
app.use(
  graphqlUploadExpress({
    maxFileSize: 10_000_000, // 10 MB
    maxFiles: 10,
  })
);
const getUserWithRoleById = async (userId) => {
  const sql = `
    SELECT ui.id as userid, r.code as role
    FROM users_info ui
    JOIN roles r ON ui.role_id = r.id
    WHERE ui.id = $1
    LIMIT 1;
  `;
  const result = await pool.query(sql, [userId]);
  return result.rows[0]; // returns { userid, role }
};
// ─── REST ENDPOINTS ─────────────────────────────────────────────────────────
app.use("/api/v1/posts", require("./routes/posts.router"));
app.use("/api/v1/post-detail", require("./routes/post-detail.router"));
app.use("/api/v1/auth", require("./routes/auth.router"));
app.use("/api/v1/district", require("./routes/district.router"));
app.use("/api/v1/taluka", require("./routes/taluka.router"));
app.use("/api/v1/village", require("./routes/village.router"));
app.use("/api/v1/images", require("./routes/images.router"));
app.use("/api/v1/thumb-images", require("./routes/thumb-images.router"));
app.use("/api/v1/img", require("./routes/img.router"));
app.use("/api/v1/user-img", require("./routes/user-img.router"));
app.use("/api/v1/track", require("./routes/track.router"));
app.use("/api/v1", require("./routes/token.router"));

// ─── GraphQL root types ─────────────────────────────────────────────────────
const rootTypeDefs = gql`
  scalar Upload
  type Query
  type Mutation
`;

// ─── GraphQL Schemas & Resolvers ────────────────────────────────────────────
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
const { typeDefs: imgTypeDefs } = require("./graphql/schemas/img.schema");
const {
  resolvers: imgResolvers,
} = require("./graphql/resolvers/img.resolvers");

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
      imgTypeDefs,
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
      imgResolvers,
    ],
    context: async ({ req, res }) => {
      const authHeader = req.headers.authorization || "";
      let token = null;

      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.replace("Bearer ", "");
      } else if (authHeader.split(".").length === 3) {
        token = authHeader;
      }

      let user = null;

      if (token) {
        try {
          const payload = jwt.verify(token, JWT_SECRET);
          user = await getUserWithRoleById(payload.user_id); // Adds `role`
        } catch (err) {
          console.warn("❌ JWT verification failed:", err.message);
        }
      }

      return { req, res, user };
    },
  });

  await server.start();
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
