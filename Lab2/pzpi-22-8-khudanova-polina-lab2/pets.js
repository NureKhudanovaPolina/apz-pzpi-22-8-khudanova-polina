const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const db = require('../db');

// GET /pets
router.get('/', authMiddleware, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM pets WHERE ownerId = ?', [req.user.id]);
  res.json(rows);
});

// POST /pets
router.post('/', authMiddleware, async (req, res) => {
  const { name, species, breed } = req.body;
  const [result] = await db.query(
    'INSERT INTO pets (name, species, breed, ownerId) VALUES (?, ?, ?, ?)',
    [name, species, breed, req.user.id]
  );
  const [rows] = await db.query('SELECT * FROM pets WHERE id = ?', [result.insertId]);
  res.json(rows[0]);
});

// PUT /pets/:id
router.put('/:id', authMiddleware, async (req, res) => {
  const { name, species, breed } = req.body;
  await db.query(
    'UPDATE pets SET name = ?, species = ?, breed = ? WHERE id = ? AND ownerId = ?',
    [name, species, breed, req.params.id, req.user.id]
  );
  const [rows] = await db.query('SELECT * FROM pets WHERE id = ?', [req.params.id]);
  res.json(rows[0]);
});

// DELETE /pets/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM pets WHERE id = ? AND ownerId = ?', [req.params.id, req.user.id]);
  if (rows.length === 0) return res.status(404).json({ error: "Тварина не знайдена" });

  await db.query('DELETE FROM pets WHERE id = ? AND ownerId = ?', [req.params.id, req.user.id]);
  res.json({ message: "Тварина видалена", pet: rows[0] });
});

module.exports = router;
