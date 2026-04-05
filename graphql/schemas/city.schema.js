const { gql } = require("apollo-server-express");

const typeDefs = gql`
  type City {
    id: ID!
    name: String!
    gu_name: String!
    is_metro: Boolean!
    is_deleted: Boolean!
  }

  input CityInput {
    name: String!
    gu_name: String!
    is_metro: Boolean!
  }

  input UpdateCityInput {
    id: ID!
    name: String
    gu_name: String
    is_metro: Boolean
  }

  input PaginationInput {
    page: Int
    limit: Int
    sortBy: String
    sortOrder: String
    search: String
  }

  type CityStats {
    totalCities: Int!
    activeCities: Int!
    deletedCities: Int!
    totalMetro: Int!
    totalRegular: Int!
  }

  extend type Query {
    getCities(pagination: PaginationInput, is_metro: Boolean): [City]
    getDeletedCities(pagination: PaginationInput): [City]
    getCityById(id: ID!): City
    getCityStats: CityStats!
  }

  extend type Mutation {
    createCity(name: String!, gu_name: String!, is_metro: Boolean!): City
    updateCity(id: ID!, name: String, gu_name: String, is_metro: Boolean): City
    softDeleteCity(id: ID!): City
    restoreCity(id: ID!): City
    hardDeleteCity(id: ID!): Boolean
  }
`;

module.exports = { typeDefs };
