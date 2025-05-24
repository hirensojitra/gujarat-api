const { gql } = require("apollo-server-express");

const typeDefs = gql`
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
  }
  type ResendOtpPayload {
    email_otp_token: String!
    otp_expires_at: String!
  }
`;

module.exports = { typeDefs };
