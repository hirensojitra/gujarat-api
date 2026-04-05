const { gql } = require('apollo-server-express');

const typeDefs = gql`
  scalar JSON

  type KeySet {
    id: ID!
    img_id: String!
    keys_array: JSON!
  }

  type ValueSet {
    id: ID!
    key_set_id: ID!
    value_data: JSON!
    timestamp: String!
  }

  input FormDataInput {
    imgParam: String!
    formData: JSON!
  }

  type TrackSaveResponse {
    message: String!
  }

  type TrackedPosterStats {
    img_id: String!
    total_downloads: Int!
    latest_download: String
  }

  type Query {
    getTrackData(imgParam: String!): [ValueSet]
    getAllTrackedPosters: [TrackedPosterStats]
  }

  type Mutation {
    saveTrackData(input: FormDataInput!): TrackSaveResponse
    deleteTrackData(imgParam: String!): TrackSaveResponse
  }
`;

module.exports = { typeDefs };
