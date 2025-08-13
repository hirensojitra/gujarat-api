const { gql } = require("apollo-server-express");

const typeDefs = gql`
  scalar Upload
  scalar JSON

  enum UserRole {
    VIEWER
    OWNER
    ADMINISTRATOR
    PREMIUM_USER
  }

  type Folder {
    id: ID!
    name: String!
    created_at: String!
  }

  type Image {
    id: ID!
    folder_id: ID!
    image_url: String!
    metadata: JSON
  }

  type FolderResult {
    folders: [Folder]!
    total: Int!
  }

  type ImageResult {
    images: [Image!]!
    total: Int!
  }

  type RefreshImageResponse {
    id: ID!
    imageUrl: String!
    message: String!
  }

  type getInitialFolderDataResponse {
    folders: FolderResult!
    folderImages: ImageResult!
  }

  type Query {
    getFolders(
      page: Int
      limit: Int
      search: String
      sortBy: String
      order: String
    ): FolderResult!

    getImagesInFolder(
      folderId: ID!
      page: Int
      limit: Int
      search: String
      sort: String
    ): ImageResult!

    getImageUrl(imageId: ID!): String!

    getInitialFolderData(folderLimit: Int!, imageLimit: Int!): getInitialFolderDataResponse!
  }

  type Mutation {
    createFolder(name: String!): Folder!
    deleteFolder(folderId: ID!): Boolean!
    renameFolder(folderId: ID!, name: String!): Boolean!
    uploadImage(folderId: ID!, image: Upload!, metadata: String): Image!
    deleteImage(folderId: ID!, imageId: ID!): Boolean!
    refreshImage(folderId: ID!, imageId: ID!, image: Upload!): RefreshImageResponse!
  }
`;

module.exports = { typeDefs };
