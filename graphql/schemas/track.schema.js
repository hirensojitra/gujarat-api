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

  type Query {
    getTrackData(imgParam: String!): [ValueSet]
    exportTrackExcel(imgParam: String!): String # Returns a URL to the generated Excel file
    exportTrackPdf(imgParam: String!): String   # Returns a URL to the generated PDF file
  }

  type Mutation {
    saveTrackData(input: FormDataInput!): TrackSaveResponse
  }
`;

module.exports = { typeDefs };
