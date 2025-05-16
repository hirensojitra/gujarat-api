const { gql } = require("apollo-server-express");

const typeDefs = gql`
  type PostSubcategory {
    id: ID!
    name: String!
    description: String!
    category_id: ID!
    active: Boolean!
  }

  type PostSubcategoryWithCategory {
    id: ID!
    name: String!
    description: String!
    category: PostCategory
  }

  type PostSubcategoryStatsByCategory {
    categories: [PostCategory!]!
    selectedId: ID
    activePostSubcategoriesByCategoryId: [PostSubcategoryWithCategory!]!
    deletedPostSubcategoriesByCategoryId: [PostSubcategoryWithCategory!]!
    totalPostSubcategoriesByCategoryId: Int!
    totalActivePostSubcategoriesByCategoryId: Int!
    totalDeletedPostSubcategoriesByCategoryId: Int!
  }

  type PostSubcategoryStats {
    totalSubcategories: Int!
    activeSubcategories: Int!
    deletedSubcategories: Int!
  }

  input PostSubcategoryInput {
    name: String!
    description: String!
    category_id: ID!
  }

  input UpdatePostSubcategoryInput {
    id: ID!
    name: String
    description: String
    category_id: ID
  }

  input PaginationInput {
    page: Int
    limit: Int
    sortBy: String
    sortOrder: String
  }

  type Query {
    getSelectedPostCategoryId: ID

    getPostSubcategoriesByCategoryId(
      category_id: ID!
      pagination: PaginationInput
    ): [PostSubcategory]!

    getDeletedPostSubcategoriesByCategoryId(
      category_id: ID!
      pagination: PaginationInput
    ): [PostSubcategory]!

    getDeletedPostSubcategories(pagination: PaginationInput): [PostSubcategory]!

    getPostSubcategoryById(id: ID!): PostSubcategory

    getDeletedPostSubcategoryById(id: ID!): PostSubcategory

    getPostSubcategoryStats: PostSubcategoryStats!

    getPostSubcategoryStatsByCategory(
      category_id: ID
      activePagination: PaginationInput
      deletedPagination: PaginationInput
    ): PostSubcategoryStatsByCategory!
  }

  type Mutation {
    createPostSubcategory(
      name: String!
      description: String!
      category_id: ID!
    ): PostSubcategory

    createPostSubcategories(
      subcategories: [PostSubcategoryInput!]!
    ): [PostSubcategory!]!

    updatePostSubcategory(
      id: ID!
      name: String
      description: String
      category_id: ID
    ): PostSubcategory

    updatePostSubcategories(
      subcategories: [UpdatePostSubcategoryInput!]!
    ): [PostSubcategory!]!

    softDeletePostSubcategories(ids: [ID!]!): [PostSubcategory!]!
    restorePostSubcategories(ids: [ID!]!): [PostSubcategory!]!
    hardDeletePostSubcategories(ids: [ID!]!): Boolean
  }
`;

module.exports = { typeDefs };
