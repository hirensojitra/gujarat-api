// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { ApolloServer, gql } = require("apollo-server-express");

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
const { typeDefs: villageTypeDefs } = require("./graphql/schemas/village.schema");
const {
  resolvers: villageResolvers,
} = require("./graphql/resolvers/village.resolvers");
// 3️⃣ Create Express app
const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());

const rootTypeDefs = gql`
  type Query
  type Mutation
`;

// 6️⃣ Set up ApolloServer for GraphQL
async function startGraphQL() {
  const server = new ApolloServer({
    typeDefs: [rootTypeDefs, districtTypeDefs, talukaTypeDefs, villageTypeDefs],
    resolvers: [districtResolvers, talukaResolvers, villageResolvers],
    context: ({ req }) => {
      return { user: req.headers.authorization || null };
    },
  });

  await server.start();
  server.applyMiddleware({ app, path: "/hiren" });
}

startGraphQL()
  .then(() => {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server ready on ${PORT}`);
      console.log(`   REST endpoints under /api/v1/...`);
      console.log(`   GraphQL endpoint at /graphql`);
    });
  })
  .catch((err) => {
    console.error("Failed to start GraphQL server:", err);
  });
