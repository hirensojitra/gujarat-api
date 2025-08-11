const pool = require('../../database');
const exceljs = require('exceljs');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const resolvers = {
  Query: {
    getTrackData: async (_, { imgParam }) => {
      const client = await pool.connect();
      try {
        const result = await client.query(
          `SELECT vs.value_data, vs.timestamp
           FROM KeySet ks
           JOIN ValueSet vs ON ks.id = vs.key_set_id
           WHERE ks.img_id = $1
           ORDER BY vs.timestamp`,
          [imgParam]
        );
        return result.rows.map(row => ({ ...row.value_data, timestamp: row.timestamp }));
      } catch (error) {
        console.error("Error fetching track data:", error);
        throw new Error("Failed to fetch track data");
      } finally {
        client.release();
      }
    },
    exportTrackExcel: async (_, { imgParam }, context) => {
      if (!context.user || (context.user.role !== 'admin' && context.user.role !== 'editor')) {
        throw new Error("Unauthorized: Only admin or editor can export Excel.");
      }

      const client = await pool.connect();
      try {
        const result = await client.query(
          `SELECT ks.keys_array, vs.value_data, vs.timestamp
           FROM KeySet ks
           JOIN ValueSet vs ON ks.id = vs.key_set_id
           WHERE ks.img_id = $1
           ORDER BY vs.timestamp`,
          [imgParam]
        );

        if (result.rows.length === 0) {
          throw new Error("No data found for this imgParam");
        }

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet('Data');

        // Collect all unique keys from all value_data entries
        let allKeys = new Set();
        result.rows.forEach(row => {
          Object.keys(row.value_data).forEach(key => allKeys.add(key));
        });

        // Add 'Timestamp' as the first header
        const headers = ['Timestamp', ...Array.from(allKeys)];
        worksheet.addRow(headers);

        // Add data rows
        result.rows.forEach(row => {
          const rowData = [
            new Date(row.timestamp).toLocaleString(), // Format timestamp
            ...headers.slice(1).map(header => row.value_data[header] || '')
          ];
          worksheet.addRow(rowData);
        });

        const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'track');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const filePath = path.join(uploadsDir, `${imgParam}.xlsx`);
        await workbook.xlsx.writeFile(filePath);

        return `/uploads/track/${imgParam}.xlsx`; // Return URL to the file
      } catch (error) {
        console.error("Error generating Excel:", error);
        throw new Error("Failed to generate Excel");
      } finally {
        client.release();
      }
    },
    exportTrackPdf: async (_, { imgParam }, context) => {
      if (!context.user || (context.user.role !== 'admin' && context.user.role !== 'editor')) {
        throw new Error("Unauthorized: Only admin or editor can export PDF.");
      }

      const client = await pool.connect();
      try {
        const result = await client.query(
          `SELECT ks.keys_array, vs.value_data, vs.timestamp
           FROM KeySet ks
           JOIN ValueSet vs ON ks.id = vs.key_set_id
           WHERE ks.img_id = $1
           ORDER BY vs.timestamp`,
          [imgParam]
        );

        if (result.rows.length === 0) {
          throw new Error("No data found for this imgParam");
        }

        const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'track');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const filePath = path.join(uploadsDir, `${imgParam}.pdf`);

        const doc = new PDFDocument();
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        doc.fontSize(20).text(`Track Data for ${imgParam}`, { align: 'center' });
        doc.moveDown();

        // Collect all unique keys for headers
        let allKeys = new Set();
        result.rows.forEach(row => {
          Object.keys(row.value_data).forEach(key => allKeys.add(key));
        });
        const headers = ['Timestamp', ...Array.from(allKeys)];

        const tableTop = 150;
        const itemHeight = 30;
        const colWidth = (doc.page.width - 100) / headers.length; // Distribute columns evenly
        let currentY = tableTop;

        // Draw table headers
        doc.font('Helvetica-Bold').fontSize(10);
        headers.forEach((header, i) => {
          doc.text(header, 50 + i * colWidth, currentY, { width: colWidth, align: 'center' });
        });
        currentY += itemHeight;
        doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, currentY - 5).lineTo(doc.page.width - 50, currentY - 5).stroke();

        // Draw table rows
        doc.font('Helvetica').fontSize(9);
        result.rows.forEach(row => {
          const rowData = [
            new Date(row.timestamp).toLocaleString(),
            ...headers.slice(1).map(header => row.value_data[header] || '')
          ];

          rowData.forEach((data, i) => {
            doc.text(data, 50 + i * colWidth, currentY, { width: colWidth, align: 'center' });
          });
          currentY += itemHeight;
          doc.strokeColor('#aaaaaa').lineWidth(0.5).moveTo(50, currentY - 5).lineTo(doc.page.width - 50, currentY - 5).stroke();
        });

        doc.end();

        await new Promise((resolve, reject) => {
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        });

        return `/uploads/track/${imgParam}.pdf`; // Return URL to the file
      } catch (error) {
        console.error("Error generating PDF:", error);
        throw new Error("Failed to generate PDF");
      } finally {
        client.release();
      }
    },
  },
  Mutation: {
    saveTrackData: async (_, { input }) => {
      const client = await pool.connect();
      try {
        const { formData, imgParam } = input;
        if (!imgParam || !formData) {
          throw new Error("imgParam and formData are required");
        }

        const imgId = imgParam;
        const keysArray = Object.keys(formData);

        await client.query(`
          CREATE TABLE IF NOT EXISTS KeySet (
            id SERIAL PRIMARY KEY,
            img_id VARCHAR(255) NOT NULL,
            keys_array JSONB NOT NULL
          );
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS ValueSet (
            id SERIAL PRIMARY KEY,
            key_set_id INTEGER REFERENCES KeySet(id),
            value_data JSONB NOT NULL,
            timestamp TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        let keySetId;
        const keySetResult = await client.query(
          'SELECT id FROM KeySet WHERE img_id = $1 AND keys_array = $2',
          [imgId, JSON.stringify(keysArray)]
        );

        if (keySetResult.rows.length > 0) {
          keySetId = keySetResult.rows[0].id;
        } else {
          const insertKeySetResult = await client.query(
            'INSERT INTO KeySet (img_id, keys_array) VALUES ($1, $2) RETURNING id',
            [imgId, JSON.stringify(keysArray)]
          );
          keySetId = insertKeySetResult.rows[0].id;
        }

        await client.query(
          'INSERT INTO ValueSet (key_set_id, value_data) VALUES ($1, $2)',
          [keySetId, JSON.stringify(formData)]
        );

        return { message: "Data saved successfully to database" };
      } catch (error) {
        console.error("Error saving data:", error);
        throw new Error("Failed to save data");
      } finally {
        client.release();
      }
    },
  },
};

module.exports = { resolvers };
