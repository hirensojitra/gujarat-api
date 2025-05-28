// graphql/resolvers/post-thumb.resolver.js
const {
  AuthenticationError,
  ForbiddenError,
} = require("apollo-server-express");
const thumbCtrl = require("../controllers/post-thumb.controller");
// assumes you export functions:
//   bulkUpload(postId, uploads: Upload[]),
//   listThumbs(postId),
//   deleteThumbs(postId, filenames: string[]),
//   bulkUpdate(postId, updates: { filename, file }[])

const resolvers = {
  Query: {
    getPostThumbs: async (_parent, { postId }) => {
      return await thumbCtrl.listThumbs(postId);
    },
  },

  Mutation: {
    uploadPostThumbs: async (_parent, { postId, thumbnails }, context) => {
      console.log("uploadPostThumbs called", postId, thumbnails, context);
      if (!context.user) throw new AuthenticationError("Login required");
      if (!["ADMINISTRATOR", "OWNER"].includes(context.user.role))
        throw new ForbiddenError("Not permitted");

      // thumbnails is an array of Upload promises
      return await thumbCtrl.bulkUploadPostThumbs(postId, thumbnails);
    },

    deletePostThumbs: async (_parent, { postId, filenames }, context) => {
      //   if (!context.user) throw new AuthenticationError('Login required');
      //   if (!['admin','master'].includes(context.user.role))
      //     throw new ForbiddenError('Not permitted');

      return await thumbCtrl.deleteThumbs(postId, filenames);
      // returns array of filenames actually deleted
    },

    updatePostThumbs: async (_parent, { postId, updates }, context) => {
      //   if (!context.user) throw new AuthenticationError('Login required');
      //   if (!['admin','master'].includes(context.user.role))
      //     throw new ForbiddenError('Not permitted');

      // updates is [{ filename, file: Upload }, …]
      return await thumbCtrl.bulkUpdate(postId, updates);
      // returns array of { filename, path } for new files
    },
  },
};

module.exports = {
  resolvers,
};
