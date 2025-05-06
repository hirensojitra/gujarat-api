// language.schema.js
const { gql } = require("apollo-server-express");

const typeDefs = gql`
  type Language {
    id: ID!
    code: String!        # e.g. "en", "hi"
    name: String!        # e.g. "English", "Hindi"
    local_name: String!  # e.g. "English", "हिंदी"
  }
  input LanguageInput {
    code: String!
    name: String!
    local_name: String!
  }
  input LanguageUpdateInput {
    code: String
    name: String
    local_name: String
  }

  extend type Query {
    languages: [Language!]!
    language(id: ID!): Language
  }

  extend type Mutation {
    createLanguage(input: LanguageInput!): Language!
    updateLanguage(id: ID!, input: LanguageUpdateInput!): Language!
    deleteLanguage(id: ID!): Boolean!
  }
`;

module.exports = { typeDefs };
