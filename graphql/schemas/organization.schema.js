const { gql } = require("apollo-server-express");

const typeDefs = gql`
  type Organization {
    id: ID!
    name: String!
    type: String!
    district_id: ID
    taluka_id: ID
    village_id: ID
    city_id: ID
    is_deleted: Boolean!
    is_active: Boolean
    district: District
    taluka: Taluka
    village: Village
    city: City
    candidates: [Candidate]
  }

  input OrganizationInput {
    name: String!
    type: String!
    district_id: ID
    taluka_id: ID
    village_id: ID
    city_id: ID
  }

  input UpdateOrganizationInput {
    id: ID!
    name: String
    type: String
    district_id: ID
    taluka_id: ID
    village_id: ID
    city_id: ID
    is_active: Boolean
  }

  extend type Query {
    getOrganizations(is_active: Boolean): [Organization]
    getOrganizationById(id: ID!): Organization
  }

  extend type Mutation {
    createOrganization(input: OrganizationInput!): Organization
    updateOrganization(input: UpdateOrganizationInput!): Organization
    deleteOrganization(id: ID!): Boolean
  }
`;

module.exports = { typeDefs };
