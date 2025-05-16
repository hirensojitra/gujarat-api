// update-user.schema.js
const { gql } = require("apollo-server-express");

const typeDefs = gql`
  scalar Upload
  input UpdateUserInput {
    firstname: String
    middlename: String
    lastname: String
    number: String
    birthday: Date
    gender: Gender
    marital_status: MaritalStatus
    language_id: ID
  }

  extend type Mutation {
    updateUserProfile(input: UpdateUserInput!, image: Upload): UserPublicInfo
  }
`;

module.exports = { typeDefs };
