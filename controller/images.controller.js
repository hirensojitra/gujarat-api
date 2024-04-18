const pool = require("../database/index");

const imagesController = {
    putImage: async (req, res) => {
        try {
            const { data } = req.body;
            const {
                id,
                title,
                url_viewer,
                url,
                display_url,
                size,
                time,
                expiration,
                image,
                thumb,
                medium,
                delete_url,
            } = data;

            const query = `
        INSERT INTO images (id, title, url_viewer, url, display_url, size, time, expiration, 
                            filename, name, mime, extension, thumb_filename, thumb_name, thumb_mime, thumb_extension, thumb_url,
                            medium_filename, medium_name, medium_mime, medium_extension, medium_url, delete_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,$22,$23) ON CONFLICT (id) DO NOTHING`;

            // Execute the query with image data as parameters
            await pool.query(query, [
                id,
                title,
                url_viewer,
                url,
                display_url,
                size,
                time,
                expiration,
                image.filename,
                image.name,
                image.mime,
                image.extension,
                thumb.filename,
                thumb.name,
                thumb.mime,
                thumb.extension,
                thumb.url,
                medium ? medium.filename : null,
                medium ? medium.name : null,
                medium ? medium.mime : null,
                medium ? medium.extension : null,
                medium ? medium.url : null,
                delete_url,
            ]);

            res.status(200).json({ success: true, message: 'Image data inserted successfully' });
        } catch (error) {
            console.error('Error inserting image data:', error);
            res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    },
    getImages: async (req, res) => {
        try {
            const { page = 1, limit = 10 } = req.query;
            const offset = (page - 1) * limit;

            // Construct the query to retrieve images with pagination
            const query = `
        SELECT * FROM images
        ORDER BY id DESC
        LIMIT $1 OFFSET $2
      `;

            // Execute the query with pagination parameters
            const { rows } = await pool.query(query, [limit, offset]);

            // Retrieve total count of images for pagination metadata
            const countQuery = `SELECT COUNT(*) FROM images`;
            const { rows: countRows } = await pool.query(countQuery);
            const totalItems = countRows[0].count;

            // Send paginated images data and pagination metadata in response
            res.status(200).json({
                success: true,
                data: rows,
                pagination: {
                    totalItems,
                    totalPages: Math.ceil(totalItems / limit),
                    currentPage: page,
                    pageSize: limit
                }
            });
        } catch (error) {
            console.error('Error retrieving images:', error);
            res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    },
    deleteImages: async (req, res) => {
        try {
            const { ids } = req.body;

            // Construct the query to delete images by IDs
            const query = `
                DELETE FROM images
                WHERE id = ANY($1)
            `;
            
            // Execute the query to delete images by IDs
            await pool.query(query, [ids]);

            res.status(200).json({ success: true, message: 'Images deleted successfully' });
        } catch (error) {
            console.error('Error deleting images:', error);
            res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }
};

module.exports = imagesController;
