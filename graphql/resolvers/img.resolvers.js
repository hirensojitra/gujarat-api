const imgController = require("../controllers/img.controller");
const {
  AuthenticationError,
  ForbiddenError,
} = require("apollo-server-express");

const checkRole = (context, rolesAllowed) => {
  const user = context.user;
  if (!user) throw new AuthenticationError("Authentication required");
  if (!rolesAllowed.includes(user.role))
    throw new ForbiddenError("Access denied");
  return user;
};

const resolvers = {
  Query: {
    getFolders: async (_, args, context) => {
      const user = checkRole(context, ["OWNER", "ADMINISTRATOR"]);
      return imgController.getFoldersGraphQL(_, args, user);
    },
    getImagesInFolder: async (_, args, context) => {
      const user = checkRole(context, [
        "OWNER",
        "ADMINISTRATOR",
        "PREMIUM_USER",
      ]);
      return imgController.getImagesInFolderGraphQL(_, args, user);
    },
    getImageUrl: async (_, { imageId }, context) => {
      const user = checkRole(context, [
        "OWNER",
        "ADMINISTRATOR",
        "PREMIUM_USER",
      ]);
      return imgController.getImageUrlGraphQL(imageId, user);
    },
    getInitialFolderData: async (_, { folderLimit, imageLimit }, context) => {
      const user = checkRole(context, ["OWNER", "ADMINISTRATOR"]);

      // Fetch first page of folders
      const folderData = await imgController.getFoldersGraphQL(
        _,
        { page: 1, limit: folderLimit },
        user
      );
      const folders = folderData.folders || [];

      let folderImages = { images: [], total: 0 };

      if (folders.length > 0) {
        const firstFolder = folders[0];
        folderImages = await imgController.getImagesInFolderGraphQL(
          _,
          {
            folderId: firstFolder.id,
            page: 1,
            limit: imageLimit,
            sort: "DESC",
          },
          user
        );
      }

      return {
        folders: folderData,
        folderImages,
      };
    },
  },

  Mutation: {
    createFolder: async (_, { name }, context) => {
      const user = checkRole(context, ["OWNER", "ADMINISTRATOR"]);
      return await imgController.createFolderGraphQL(_, { name }, user);
    },

    deleteFolder: async (_, { folderId }, context) => {
      const user = checkRole(context, ["OWNER", "ADMINISTRATOR"]);
      return await imgController.deleteFolderGraphQL(_, { folderId }, user);
    },

    renameFolder: async (_, { folderId, name }, context) => {
      const user = checkRole(context, ["OWNER", "ADMINISTRATOR"]);
      return await imgController.renameFolderGraphQL(
        _,
        { folderId, name },
        user
      );
    },
    uploadImage: async (_, args, context) => {
      const user = checkRole(context, ["OWNER", "ADMINISTRATOR"]);
      return imgController.uploadImageGraphQL(_, args, user);
    },
    deleteImage: async (_, { folderId, imageId }, context) => {
      const user = checkRole(context, ["OWNER", "ADMINISTRATOR"]);
      return imgController.deleteImageGraphQL(_, { folderId, imageId }, user);
    },
    refreshImage: async (_, args, context) => {
      const user = checkRole(context, ["OWNER", "ADMINISTRATOR"]);
      return imgController.refreshImageGraphQL(_, args, user);
    },
  },
};

module.exports = { resolvers };
