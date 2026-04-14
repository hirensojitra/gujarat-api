const { gql } = require('apollo-server-express');

const typeDefs = gql`
  enum ImageAngle {
    FRONT
    LEFT
    RIGHT
  }

  type OrganizationImageSet {
    id: ID!
    organization_id: ID!
    set_index: Int!
    label: String!
    max_file_size_kb: Int!
    aspect_ratio: String!
    allowed_formats: String!
    is_deleted: Boolean!
    created_at: String
    candidate_usage_count: Int
    total_candidate_count: Int
    complete_candidate_count: Int
  }

  type CandidateImageSet {
    id: ID!
    candidate_id: ID!
    org_image_set_id: ID!
    org_image_set: OrganizationImageSet
    img_front: String
    img_left: String
    img_right: String
    created_at: String
    updated_at: String
  }

  type SetDeletionCheck {
    can_delete: Boolean!
    usage_count: Int!
    candidates: [SetCandidateUsage!]!
    dependent_template_count: Int!
    dependent_templates: [DependentTemplate!]!
  }

  type SetCandidateUsage {
    candidate_id: ID!
    full_name: String!
    img_front_url: String
    img_front: Boolean!
    img_left: Boolean!
    img_right: Boolean!
  }

  type DependentTemplate {
    template_id: ID!
    label: String!
    post_id: String!
    role: String!
  }

  extend type Query {
    checkSetDeletion(set_id: ID!): SetDeletionCheck!
  }

  extend type Mutation {
    addOrganizationImageSet(
      organization_id: ID!
      label: String!
      max_file_size_kb: Int
      aspect_ratio: String
      allowed_formats: String
    ): OrganizationImageSet

    updateOrganizationImageSet(
      id: ID!
      label: String
      max_file_size_kb: Int
      aspect_ratio: String
      allowed_formats: String
    ): OrganizationImageSet

    deleteOrganizationImageSet(id: ID!): Boolean
    restoreOrganizationImageSet(id: ID!): OrganizationImageSet
    purgeOrganizationImageSet(id: ID!): Boolean

    uploadCandidateSetImage(
      candidate_id: ID!
      org_image_set_id: ID!
      angle: ImageAngle!
      image: Upload!
    ): CandidateImageSet
  }
`;

module.exports = { typeDefs };
