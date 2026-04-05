const { gql } = require("apollo-server-express");

const typeDefs = gql`
  type ElectionPostListResponse {
    posts: [ElectionPostDetails!]!
    pagination: Pagination!
  }

  type ElectionPostDetails {
    id: String!
    deleted: Boolean!
    info: String!
    info_show: Boolean!
    h: Float!
    w: Float!
    title: String!
    backgroundurl: String!
    download_counter: Int!
    data: JSON!
    msg: String
    apiData: JSON
    image: String
    published: Boolean!
    track: Boolean!
    created_at: String
    updated_at: String
    deleted_at: String
    subcategory_id: ID
    category: PostCategory
    subcategory: PostSubcategory
    target_organization_type: String
    templateType: String
  }

  type TemplateAssignments {
    organizationIds: [Int!]!
    candidateIds: [Int!]!
  }

  input ElectionPostUpdateInput {
    id: String!
    deleted: Boolean
    h: Float
    w: Float
    title: String
    info: String
    info_show: Boolean
    backgroundurl: String
    data: JSON
    download_counter: Int
    published: Boolean
    track: Boolean
    category_id: ID
    subcategory_id: ID
    apiData: JSON
    target_organization_type: String
    templateType: String
  }

  input TemplateAssignmentsInput {
    templateId: String!
    organizationIds: [Int!]!
    candidateIds: [Int!]!
  }

  extend type Query {
    getAllElectionPosts(
      page: Int!
      limit: Int
      search: String
      sortBy: String
      order: String
      published: Boolean
      info_show: Boolean
      subcategory_id: ID
    ): ElectionPostListResponse!
    getElectionPostById(id: String!): ElectionPostDetails
    getAllSoftDeletedElectionPosts(
      page: Int!
      limit: Int
      search: String
      sortBy: String
      order: String
    ): ElectionPostListResponse!
    getTotalElectionPostLength: Int!
    getTotalDeletedElectionPostLength: Int!
    getElectionDownloadCounter(id: String!): Int!
    updateElectionDownloadCounter(id: String!): Int!
    getTemplateAssignments(templateId: String!): TemplateAssignments!
  }

  extend type Mutation {
    updateElectionPost(input: ElectionPostUpdateInput!): ElectionPostDetails!
    softDeleteElectionPost(id: String!): Boolean!
    recoverElectionPost(id: String!): Boolean!
    hardDeleteElectionPost(id: String!): Boolean!
    uploadElectionThumbnail(postId: String!, file: Upload!): String!
    assignElectionTemplate(input: TemplateAssignmentsInput!): Boolean!
  }
`;

module.exports = { typeDefs };
