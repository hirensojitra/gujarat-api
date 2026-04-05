const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type OrgPosterTemplate {
    id: ID!
    organization_id: ID!
    post_id: String!
    role: String!
    label: String
    sort_order: Int
    is_active: Boolean
    created_at: String
  }

  extend type Query {
    getOrgPosterTemplates(organization_id: ID!): [OrgPosterTemplate]
  }

  extend type Mutation {
    addOrgPosterTemplate(
      organization_id: ID!
      post_id: String!
      role: String!
      label: String
      sort_order: Int
    ): OrgPosterTemplate

    updateOrgPosterTemplate(
      id: ID!
      label: String
      sort_order: Int
      is_active: Boolean
    ): OrgPosterTemplate

    removeOrgPosterTemplate(id: ID!): Boolean
  }
`;

module.exports = { typeDefs };
