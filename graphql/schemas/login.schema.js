const { gql } = require("apollo-server-express");

const typeDefs = gql`
  scalar Date

  enum Gender {
    MALE
    FEMALE
    NONBINARY
    OTHER
  }

  enum MaritalStatus {
    SINGLE
    MARRIED
    DIVORCED
    WIDOWED
  }

  type Language {
    id: ID!
    name: String!
  }

  type UserPublicInfo {
    id: ID!
    firstname: String
    middlename: String
    lastname: String
    number: String
    number_verified: Boolean!
    role_id: ID!
    email: String!
    email_verified: Boolean!
    username: String

    # newly added fields
    birthday: Date
    gender: Gender
    marital_status: MaritalStatus
    language: Language!
  }

  type AuthPayload {
    token: String
    user: UserPublicInfo!
  }

  input LoginInput {
    login_id: String!
    pass_key: String!
  }

  extend type Mutation {
    login(input: LoginInput!): AuthPayload!
  }

  extend type Query {
    validateToken(token: String): AuthPayload
  }
`;

module.exports = { typeDefs };
