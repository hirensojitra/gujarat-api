const { gql } = require("apollo-server-express");

const typeDefs = gql`
  type Taluka {
    id: ID!
    name: String!
    gu_name: String!
    district_id: ID!
    is_deleted: Boolean!
  }
  type DistrictInfo {
    name: String!
    gu_name: String!
  }

  type TalukaWithDistrict {
    id: ID!
    name: String!
    gu_name: String!
    district: DistrictInfo
  }

  type TalukaStatsByDistrict {
    districts: [District!]!
    selectedId: ID!
    activeTalukasByDistrictId: [TalukaWithDistrict!]!
    deletedTalukasByDistrictId: [TalukaWithDistrict!]!
    totalTalukasByDistrictId: Int!
    totalActiveTalukasByDistrictId: Int!
    totalDeletedTalukasByDistrictId: Int!
  }

  input TalukaInput {
    name: String!
    gu_name: String!
    district_id: ID!
  }

  input UpdateTalukaInput {
    id: ID!
    name: String
    gu_name: String
    district_id: ID
  }

  input PaginationInput {
    page: Int
    limit: Int
    sortBy: String
    sortOrder: String
  }

  type TalukaStats {
    totalTalukas: Int!
    activeTalukas: Int!
    deletedTalukas: Int!
  }

  type Query {
    getSelectedDistrictId: ID
    getTalukas(district_id: ID!, pagination: PaginationInput): [Taluka]
    getTalukasByDistrictId(
      district_id: ID!
      pagination: PaginationInput
    ): [Taluka]
    getDeletedTalukasByDistrictId(
      district_id: ID!
      pagination: PaginationInput
    ): [Taluka]
    getDeletedTalukas(pagination: PaginationInput): [Taluka]
    getTalukaById(id: ID!): Taluka
    getDeletedTalukaById(id: ID!): Taluka
    getTalukaStats: TalukaStats!
    getTalukaStatsByDistrict(
      district_id: ID
      activePagination: PaginationInput
      deletedPagination: PaginationInput
    ): TalukaStatsByDistrict!
  }

  type Mutation {
    createTaluka(
      name: String!
      gu_name: String!
      district_id: ID!
    ): Taluka
    createTalukas(talukas: [TalukaInput]!): [Taluka]
    updateTaluka(
      id: ID!
      name: String
      gu_name: String
      district_id: ID
    ): Taluka
    updateTalukas(talukas: [UpdateTalukaInput]!): [Taluka]
    softDeleteTaluka(id: ID!): Taluka
    softDeleteTalukas(ids: [ID]!): [Taluka]
    restoreTaluka(id: ID!): Taluka
    restoreTalukas(ids: [ID]!): [Taluka]
    hardDeleteTaluka(id: ID!): Boolean
    hardDeleteTalukas(ids: [ID]!): Boolean
  }
`;

module.exports = { typeDefs };
