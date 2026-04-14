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
    required_image_set_id: ID
    required_image_set: OrganizationImageSet
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
      required_image_set_id: ID
    ): OrgPosterTemplate

    updateOrgPosterTemplate(
      id: ID!
      label: String
      sort_order: Int
      is_active: Boolean
      required_image_set_id: ID
    ): OrgPosterTemplate

    removeOrgPosterTemplate(id: ID!): Boolean
  }
`;

module.exports = { typeDefs };
