// graphql/village.schema.js
const { gql } = require('apollo-server-express');
const pool = require('../../database/index');

const typeDefs = gql`type District {
    id: ID
    name: String
    gu_name: String
    is_deleted: Boolean
  }
  
  type Taluka {
    id: ID
    name: String
    gu_name: String
    district: District  # Taluka will now include the associated District
    is_deleted: Boolean
  }
  
  type Village {
    id: ID
    name: String
    gu_name: String
    taluka: Taluka  # Taluka includes District info
    is_deleted: Boolean
  }
  
  input PaginationInput {
    page: Int
    limit: Int
    sortBy: String
    sortOrder: String
  }
  
  type Query {
    getVillagesAll(pagination: PaginationInput): [Village]
    getVillageById(id: ID!): Village
    getVillagesByTalukaId(talukaId: ID!, pagination: PaginationInput): [Village]
    getVillagesByDistrictId(districtId: ID!, pagination: PaginationInput): [Village]
  
    getTalukasAll(pagination: PaginationInput): [Taluka]
    getTalukaById(id: ID!): Taluka
    getTalukasByDistrictId(districtId: ID!, pagination: PaginationInput): [Taluka]
  
    getDistricts(pagination: PaginationInput): [District]
    getDistrictById(id: ID!): District
  }
  
  type Mutation {
    updateDistrict(id: ID!, name: String!, gu_name: String!, is_deleted: Boolean!): District
    deleteDistrict(id: ID!): District
  
    createTaluka(name: String!, gu_name: String!, district_id: ID!, is_deleted: Boolean!): Taluka
    updateTaluka(id: ID!, name: String!, gu_name: String!, district_id: ID!, is_deleted: Boolean!): Taluka
    deleteTaluka(id: ID!): Taluka
  
    createVillage(name: String!, gu_name: String!, taluka_id: ID!, is_deleted: Boolean!): Village
    updateVillage(id: ID!, name: String!, gu_name: String!, taluka_id: ID!, is_deleted: Boolean!): Village
    deleteVillage(id: ID!): Village
  }
`;
const resolvers = {
    Query: {
      getVillagesAll: async (_, { pagination }) => {
        const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'ASC' } = pagination;
        const offset = (page - 1) * limit;
  
        const query = `SELECT * FROM village WHERE is_deleted = 0 ORDER BY ${sortBy} ${sortOrder} LIMIT $1 OFFSET $2`;
        const result = await pool.query(query, [limit, offset]);
  
        return result.rows;
      },
      getVillageById: async (_, { id }) => {
        const query = `SELECT * FROM village WHERE id = $1 AND is_deleted = 0`;
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
      },
      getVillagesByTalukaId: async (_, { talukaId, pagination }) => {
        const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'ASC' } = pagination;
        const offset = (page - 1) * limit;
  
        const query = `SELECT * FROM village WHERE taluka_id = $1 AND is_deleted = 0 ORDER BY ${sortBy} ${sortOrder} LIMIT $2 OFFSET $3`;
        const result = await pool.query(query, [talukaId, limit, offset]);
  
        return result.rows;
      },
      getVillagesByDistrictId: async (_, { districtId, pagination }) => {
        const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'ASC' } = pagination;
        const offset = (page - 1) * limit;
  
        const query = `SELECT * FROM village WHERE district_id = $1 AND is_deleted = 0 ORDER BY ${sortBy} ${sortOrder} LIMIT $2 OFFSET $3`;
        const result = await pool.query(query, [districtId, limit, offset]);
  
        return result.rows;
      },
  
      getTalukasAll: async (_, { pagination }) => {
        const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'ASC' } = pagination;
        const offset = (page - 1) * limit;
  
        const query = `SELECT * FROM taluka WHERE is_deleted = 0 ORDER BY ${sortBy} ${sortOrder} LIMIT $1 OFFSET $2`;
        const result = await pool.query(query, [limit, offset]);
  
        return result.rows;
      },
      getTalukaById: async (_, { id }) => {
        const query = "SELECT * FROM taluka WHERE id = $1 AND is_deleted = 0";
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
      },
      getTalukasByDistrictId: async (_, { districtId, pagination }) => {
        const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'ASC' } = pagination;
        const offset = (page - 1) * limit;
  
        const query = `SELECT * FROM taluka WHERE district_id = $1 AND is_deleted = 0 ORDER BY ${sortBy} ${sortOrder} LIMIT $2 OFFSET $3`;
        const result = await pool.query(query, [districtId, limit, offset]);
  
        return result.rows;
      },
  
      getDistricts: async (_, { pagination }) => {
        const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'ASC' } = pagination;
        const offset = (page - 1) * limit;
  
        const query = `SELECT * FROM district WHERE is_deleted = 0 ORDER BY ${sortBy} ${sortOrder} LIMIT $1 OFFSET $2`;
        const result = await pool.query(query, [limit, offset]);
  
        return result.rows;
      },
      getDistrictById: async (_, { id }) => {
        const query = "SELECT * FROM district WHERE id = $1 AND is_deleted = 0";
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
      }
    },
  
    Village: {
      taluka: async (village) => {
        // Fetch taluka with district
        const query = `SELECT t.*, d.* FROM taluka t
                       JOIN district d ON t.district_id = d.id
                       WHERE t.id = $1 AND t.is_deleted = 0 AND d.is_deleted = 0`;
        const result = await pool.query(query, [village.taluka_id]);
        const taluka = result.rows[0];
        if (!taluka) return null;
  
        // Attach district data to taluka
        taluka.district = {
          id: taluka.district_id,
          name: taluka.district_name,
          gu_name: taluka.district_gu_name,
          is_deleted: taluka.district_is_deleted
        };
        return taluka;
      }
    },
  
    Taluka: {
      district: async (taluka) => {
        const query = "SELECT * FROM district WHERE id = $1 AND is_deleted = 0";
        const result = await pool.query(query, [taluka.district_id]);
        return result.rows[0] || null;
      }
    },
  
    Mutation: {
      // Define Mutation Logic (create, update, delete)
    }
  };
  
  module.exports = { typeDefs, resolvers };
  