// src/graphql/typeDefs/resetPassword.schema.js

const { gql } = require("apollo-server-express");

const typeDefs = gql`
  type ResetOtpPayload {
    reset_otp_token: String!
    otp_expires_at: String!
  }
  extend type Mutation {
    requestPasswordReset(email: String!): ResetOtpPayload!
    resetPasswordByOtp(
      token: String!
      otp_code: String!
      new_pass_key: String!
    ): AuthPayload!
  }
`;

module.exports = { typeDefs };
