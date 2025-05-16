// ./graphql/schemas/post-category.schema.js
const { gql } = require("apollo-server-express");

const typeDefs = gql`
  type PostCategory {
    id: ID
    name: String
    description: String
    active: Boolean
  }

  input PostCategoryInput {
    name: String!
    description: String!
  }

  input UpdatePostCategoryInput {
    id: ID!
    name: String
    description: String
    active: Boolean
  }

  input PaginationInput {
    page: Int
    limit: Int
    sortBy: String
    sortOrder: String
  }

  type PostCategoryStats {
    postCategoryLength: Int!
    activePostCategoryLength: Int!
    deletedPostCategoryLength: Int!
  }

  type Query {
    getPostCategories(pagination: PaginationInput): [PostCategory]
    getDeletedPostCategories(pagination: PaginationInput): [PostCategory]
    getPostCategoryById(id: ID!): PostCategory
    getDeletedPostCategoryById(id: ID!): PostCategory
    getPostCategoryStats: PostCategoryStats!
  }

  type Mutation {
    createPostCategory(name: String!, description: String!): PostCategory
    createPostCategories(postCategories: [PostCategoryInput]!): [PostCategory]
    updatePostCategory(id: ID!, name: String, description: String, active: Boolean): PostCategory
    updatePostCategories(postCategories: [UpdatePostCategoryInput]!): [PostCategory]
    softDeletePostCategory(id: ID!): PostCategory
    softDeletePostCategories(ids: [ID]!): [PostCategory]
    hardDeletePostCategory(id: ID!): Boolean
    hardDeletePostCategories(ids: [ID]!): Boolean
    restorePostCategory(id: ID!): PostCategory
    restorePostCategories(ids: [ID]!): [PostCategory]
  }
`;

module.exports = { typeDefs };
