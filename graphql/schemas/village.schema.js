const { gql } = require("apollo-server-express");

const typeDefs = gql`
  type Village {
    id: ID!
    name: String!
    gu_name: String!
    taluka_id: ID!
    is_deleted: Boolean!
  }

  type TalukaInfo {
    id: ID!
    name: String!
    gu_name: String!
  }

  type VillageWithTaluka {
    id: ID!
    name: String!
    gu_name: String!
    taluka: TalukaInfo!
  }

  type VillageStatsByTaluka {
    talukas: [Taluka!]!
    selectedDistrictId: ID!
    selectedTalukaId: ID!
    activeVillagesByTalukaId: [VillageWithTaluka!]!
    deletedVillagesByTalukaId: [VillageWithTaluka!]!
    totalVillagesByTalukaId: Int!
    totalActiveVillagesByTalukaId: Int!
    totalDeletedVillagesByTalukaId: Int!
  }

  input VillageInput {
    name: String!
    gu_name: String!
    taluka_id: ID!
    is_deleted: Boolean!
  }

  input UpdateVillageInput {
    id: ID!
    name: String
    gu_name: String
    taluka_id: ID
    is_deleted: Boolean
  }

  input PaginationInput {
    page: Int
    limit: Int
    sortBy: String
    sortOrder: String
  }

  type VillageStats {
    totalVillages: Int!
    activeVillages: Int!
    deletedVillages: Int!
  }

  type Query {
    getSelectedDistrictId: ID
    getSelectedTalukaId: ID
    getVillages(taluka_id: ID!, pagination: PaginationInput): [Village]
    getVillagesByTalukaId(taluka_id: ID!, pagination: PaginationInput): [Village]
    getDeletedVillagesByTalukaId(taluka_id: ID!, pagination: PaginationInput): [Village]
    getDeletedVillages(pagination: PaginationInput): [Village]
    getVillageById(id: ID!): Village
    getDeletedVillageById(id: ID!): Village
    getVillageStats: VillageStats!
    getVillageStatsByTaluka(
      taluka_id: ID
      district_id: ID
      activePagination: PaginationInput
      deletedPagination: PaginationInput
    ): VillageStatsByTaluka!
  }

  type Mutation {
    createVillage(name: String!, gu_name: String!, taluka_id: ID!, is_deleted: Boolean!): Village
    createVillages(villages: [VillageInput]!): [Village]
    updateVillage(id: ID!, name: String, gu_name: String, taluka_id: ID, is_deleted: Boolean): Village
    updateVillages(villages: [UpdateVillageInput]!): [Village]
    softDeleteVillage(id: ID!): Village
    softDeleteVillages(ids: [ID]!): [Village]
    restoreVillage(id: ID!): Village
    restoreVillages(ids: [ID]!): [Village]
    hardDeleteVillage(id: ID!): Boolean
    hardDeleteVillages(ids: [ID]!): Boolean
  }
`;

module.exports = { typeDefs };
