// in your typeDefs file (e.g. district.typeDefs.js)

const { gql } = require("apollo-server-express");

const typeDefs = gql`
  type District {
    id: ID
    name: String
    gu_name: String
    is_deleted: Boolean
  }

  input DistrictInput {
    name: String!
    gu_name: String!
    is_deleted: Boolean!
  }

  input UpdateDistrictInput {
    id: ID!
    name: String
    gu_name: String
    is_deleted: Boolean
  }

  input PaginationInput {
    page: Int
    limit: Int
    sortBy: String
    sortOrder: String
  }

  type DistrictStats {
    districtLength: Int!
    activeDistrictLength: Int!
    deletedDistrictLength: Int!
  }

  type Query {
    getDistricts(pagination: PaginationInput): [District]
    getDeletedDistricts(pagination: PaginationInput): [District]
    getDistrictById(id: ID!): District
    getDeletedDistrictById(id: ID!): District
    getDistrictStats: DistrictStats!
  }

  type Mutation {
    createDistrict(name: String!, gu_name: String!, is_deleted: Boolean!): District
    createDistricts(districts: [DistrictInput]!): [District]
    updateDistrict(id: ID!, name: String, gu_name: String, is_deleted: Boolean): District
    updateDistricts(districts: [UpdateDistrictInput]!): [District]
    softDeleteDistrict(id: ID!): District
    softDeleteDistricts(ids: [ID]!): [District]
    hardDeleteDistrict(id: ID!): Boolean
    hardDeleteDistricts(ids: [ID]!): Boolean
    restoreDistrict(id: ID!): District
    restoreDistricts(ids: [ID]!): [District]
  }
`;

module.exports = { typeDefs };
