const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type Candidate {
    id: ID!
    full_name: String!
    electoral_roll_name: String
    mobile_number: String!
    party_id: ID
    political_party: PoliticalParty
    seat_name: String
    organization_id: ID
    organization: Organization
    img_front: String
    img_left: String
    img_right: String
    is_active: Boolean
    created_at: String
    updated_at: String
  }

  extend type Query {
    getCandidates(organization_id: ID, is_active: Boolean): [Candidate]
    getCandidate(id: ID!): Candidate
  }

  extend type Mutation {
    createCandidate(
      full_name: String!
      electoral_roll_name: String
      mobile_number: String!
      party_id: ID
      seat_name: String
      organization_id: ID
      is_active: Boolean
    ): Candidate

    updateCandidate(
      id: ID!
      full_name: String
      electoral_roll_name: String
      mobile_number: String
      party_id: ID
      seat_name: String
      organization_id: ID
      is_active: Boolean
    ): Candidate

    uploadCandidateImage(
      candidate_id: ID!
      angle: String!
      image: Upload!
    ): Candidate

    deleteCandidate(id: ID!): Boolean
  }
`;

module.exports = { typeDefs };
