// role.schema.js
const { gql } = require("apollo-server-express");

const typeDefs = gql`
  type Role {
    id: ID!
    code: String! # e.g. "ADMIN", "USER"
    name: String! # e.g. "Administrator", "Regular User"
    description: String
  }

  input CreateRoleInput {
    code: String!
    name: String!
    description: String
  }

  input UpdateRoleInput {
    code: String
    name: String
    description: String
  }

  extend type Query {
    roles: [Role!]!
    role(id: ID!): Role
  }

  extend type Mutation {
    createRole(input: CreateRoleInput!): Role!

    updateRole(id: ID!, input: UpdateRoleInput!): Role!

    deleteRole(id: ID!): Boolean!
  }
`;

module.exports = { typeDefs };
