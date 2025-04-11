const express = require('express');
const exceljs = require('exceljs');
const fs = require('fs');
const path = require('path');

const trackController = {
  saveData: async (req, res) => {
    try {
      const { formData, imgParam } = req.body;
      if (!imgParam || !formData) {
        return res.status(400).json({ error: "imgParam and formData are required" });
      }

      // Define the uploads directory and Excel file path.
      const uploadsDir = path.join(__dirname, '..', 'uploads', 'track');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filePath = path.join(uploadsDir, `${imgParam}.xlsx`);

      let workbook;
      let worksheet;

      if (fs.existsSync(filePath)) {
        // Load existing workbook if file exists.
        workbook = new exceljs.Workbook();
        await workbook.xlsx.readFile(filePath);
        worksheet = workbook.getWorksheet(1);
      } else {
        // Create new workbook and worksheet.
        workbook = new exceljs.Workbook();
        worksheet = workbook.addWorksheet('Data');
        // Create header row from initial formData keys.
        const headers = Object.keys(formData);
        worksheet.addRow(headers);
      }

      // Get the current header row.
      const headerRow = worksheet.getRow(1);
      // Use headerRow.values.slice(1) if the row was initially read with a dummy element,
      // but when updating we want to set the row without a leading null.
      let currentHeaders = headerRow.values;
      // If the first element is falsy (as it may be, due to 1-indexing), filter it out.
      if (!currentHeaders[0]) {
        currentHeaders = currentHeaders.slice(1);
      }

      // Determine new keys present in the incoming formData that are not in currentHeaders.
      const submissionKeys = Object.keys(formData);
      const keysToAdd = submissionKeys.filter(key => !currentHeaders.includes(key));

      // If new keys exist, update the header row.
      if (keysToAdd.length > 0) {
        currentHeaders = currentHeaders.concat(keysToAdd);
        // Update header row without a leading null.
        headerRow.values = currentHeaders;
        headerRow.commit();
      }

      // Build the new row using the unified header order.
      // For each header key, pick the value from formData, or '' if it doesn't exist.
      const newRowValues = currentHeaders.map(key =>
        formData.hasOwnProperty(key) ? formData[key] : ''
      );
      worksheet.addRow(newRowValues);

      // Write out the workbook to disk.
      await workbook.xlsx.writeFile(filePath);

      res.status(200).json({ message: "Data saved successfully", file: `${imgParam}.xlsx` });
    } catch (error) {
      console.error("Error saving data:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
};

module.exports = trackController;
