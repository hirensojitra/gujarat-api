// graphql/typeDefs/post-thumb.schema.js
const { gql } = require("apollo-server-express");

 const typeDefs = gql`
  scalar Upload

  type PostThumb {
    filename: String!
    path: String!
  }

  input PostThumbUpdateInput {
    filename: String!
    file: Upload!
  }

  type Query {
    getPostThumbs(postId: ID!): [PostThumb!]!
  }

  type Mutation {
    uploadPostThumbs(postId: ID!, thumbnails: [Upload!]!): [PostThumb!]!
    deletePostThumbs(postId: ID!, filenames: [String!]!): [String!]!
    updatePostThumbs(
      postId: ID!
      updates: [PostThumbUpdateInput!]!
    ): [PostThumb!]!
  }
`;
module.exports = { typeDefs };