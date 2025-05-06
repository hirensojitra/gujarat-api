const { gql } = require("apollo-server-express");
const typeDefs = gql`
  type UserInfo {
    id: String!
    firstname: String!
    lastname: String!
    middlename: String
    pass_key: String!
    number: String!
    number_verified: Boolean!
    role_id: String!
    created_at: String!
  }

  input RegisterInput {
    firstname: String!
    lastname: String!
    middlename: String
    pass_key: String!
    number: String!
    email: String!
    username: String!
    role_id: String!
  }

  input LoginInput {
    login_id: String!
    pass_key: String!
  }

  type AuthPayload {
    token: String!
    user_id: String!
    role_id: String!
    username: String!
  }

  extend type Query {
    getUserById(id: String!): UserInfo
  }

  extend type Mutation {
    registerUser(input: RegisterInput!): AuthPayload
    login(input: LoginInput!): AuthPayload
  }
`;

module.exports = { typeDefs };
