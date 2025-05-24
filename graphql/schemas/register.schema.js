const { gql } = require("apollo-server-express");

const typeDefs = gql`
  type GoogleAuthPayload {
    token: String # only present if they already have a password
    userId: ID!
    email: String!
    requiresPassword: Boolean!
  }

  type RegisterPayload {
    token: String!
    user_id: ID!
    role_id: String!
    username: String
    is_email_verified: Boolean!
    email_otp_token: String
    otp_expires_at: String
  }

  input RegisterInput {
    email: String!
    pass_key: String!
    role_id: String
  }

  extend type Mutation {
    register(input: RegisterInput!): RegisterPayload
    verifyEmailOtp(token: String!, otp_code: String!): AuthPayload!
    resendEmailOtp(email: String!): ResendOtpPayload!
    googleAuth(idToken: String!): GoogleAuthPayload!
    setPassword(userId: ID!, newPassword: String!): AuthPayload!
  }
  type ResendOtpPayload {
    email_otp_token: String!
    otp_expires_at: String!
  }
`;

module.exports = { typeDefs };
