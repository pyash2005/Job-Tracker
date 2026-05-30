const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all routes
app.use(cors());

// Middleware for parsing JSON requests
app.use(express.json());

// Serve static frontend files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Helper to format dates consistently from database
const SELECT_COLUMNS = "id, company, role, status, DATE_FORMAT(apply_date, '%Y-%m-%d') AS apply_date, job_link, notes, created_at";

/**
 * 1. GET /api/jobs
 * Fetch all job applications, ordered by created_at DESC (newest first).
 */
app.get('/api/jobs', async (req, res) => {
  try {
    const queryStr = `SELECT ${SELECT_COLUMNS} FROM jobs ORDER BY created_at DESC`;
    const jobs = await db.query(queryStr);
    res.json(jobs);
  } catch (error) {
    console.error('GET /api/jobs error:', error);
    res.status(500).json({ error: 'Failed to retrieve job applications from database.' });
  }
});

/**
 * 2. POST /api/jobs
 * Add a new job application. Company, role, and apply_date are required.
 */
app.post('/api/jobs', async (req, res) => {
  try {
    const { company, role, status, apply_date, job_link, notes } = req.body;

    // Validate required fields
    if (!company || !company.trim()) {
      return res.status(400).json({ error: 'Company name is required.' });
    }
    if (!role || !role.trim()) {
      return res.status(400).json({ error: 'Job role is required.' });
    }
    if (!apply_date) {
      return res.status(400).json({ error: 'Apply date is required.' });
    }

    // Insert into MySQL
    const insertQuery = `
      INSERT INTO jobs (company, role, status, apply_date, job_link, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      company.trim(),
      role.trim(),
      status || 'Applied',
      apply_date,
      job_link ? job_link.trim() : null,
      notes ? notes.trim() : null
    ];

    const result = await db.query(insertQuery, params);
    
    // Fetch and return the newly created job
    const fetchQuery = `SELECT ${SELECT_COLUMNS} FROM jobs WHERE id = ?`;
    const jobs = await db.query(fetchQuery, [result.insertId]);
    
    res.status(201).json(jobs[0]);
  } catch (error) {
    console.error('POST /api/jobs error:', error);
    res.status(500).json({ error: 'Failed to create job application.' });
  }
});

/**
 * 3. PUT /api/jobs/:id
 * Update an existing job application by ID.
 */
app.put('/api/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { company, role, status, apply_date, job_link, notes } = req.body;

    // Validate required fields
    if (!company || !company.trim()) {
      return res.status(400).json({ error: 'Company name is required.' });
    }
    if (!role || !role.trim()) {
      return res.status(400).json({ error: 'Job role is required.' });
    }
    if (!apply_date) {
      return res.status(400).json({ error: 'Apply date is required.' });
    }

    // Check if the job exists first
    const checkQuery = 'SELECT id FROM jobs WHERE id = ?';
    const checkResult = await db.query(checkQuery, [id]);
    if (checkResult.length === 0) {
      return res.status(404).json({ error: 'Job application not found.' });
    }

    // Update in MySQL
    const updateQuery = `
      UPDATE jobs
      SET company = ?, role = ?, status = ?, apply_date = ?, job_link = ?, notes = ?
      WHERE id = ?
    `;
    const params = [
      company.trim(),
      role.trim(),
      status || 'Applied',
      apply_date,
      job_link ? job_link.trim() : null,
      notes ? notes.trim() : null,
      id
    ];

    await db.query(updateQuery, params);

    // Fetch and return the updated job
    const fetchQuery = `SELECT ${SELECT_COLUMNS} FROM jobs WHERE id = ?`;
    const jobs = await db.query(fetchQuery, [id]);

    res.json(jobs[0]);
  } catch (error) {
    console.error(`PUT /api/jobs/${req.params.id} error:`, error);
    res.status(500).json({ error: 'Failed to update job application.' });
  }
});

/**
 * 4. DELETE /api/jobs/:id
 * Delete a job application by ID.
 */
app.delete('/api/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the job exists
    const checkQuery = 'SELECT id FROM jobs WHERE id = ?';
    const checkResult = await db.query(checkQuery, [id]);
    if (checkResult.length === 0) {
      return res.status(404).json({ error: 'Job application not found.' });
    }

    // Delete from MySQL
    const deleteQuery = 'DELETE FROM jobs WHERE id = ?';
    await db.query(deleteQuery, [id]);

    res.json({ message: 'Job application deleted successfully.' });
  } catch (error) {
    console.error(`DELETE /api/jobs/${req.params.id} error:`, error);
    res.status(500).json({ error: 'Failed to delete job application.' });
  }
});

// Start the server after initializing the database
async function startServer() {
  try {
    await db.initDB();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Open http://localhost:${PORT} in your browser to view the application.`);
    });
  } catch (error) {
    console.error('Failed to start server due to database initialization failure:', error);
    process.exit(1);
  }
}

startServer();
