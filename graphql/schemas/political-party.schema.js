const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type PoliticalParty {
    id: ID!
    name: String!
    symbol_url: String
    basic_info: String
    is_active: Boolean
    created_at: String
    updated_at: String
  }

  extend type Query {
    getPoliticalParties: [PoliticalParty]
    getPoliticalParty(id: ID!): PoliticalParty
  }

  extend type Mutation {
    createPoliticalParty(
      name: String!
      symbol_url: String
      basic_info: String
      is_active: Boolean
    ): PoliticalParty

    updatePoliticalParty(
      id: ID!
      name: String
      symbol_url: String
      basic_info: String
      is_active: Boolean
    ): PoliticalParty

    deletePoliticalParty(id: ID!): Boolean
  }
`;

module.exports = { typeDefs };
