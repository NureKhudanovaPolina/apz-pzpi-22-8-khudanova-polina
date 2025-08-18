const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');

// Тимчасові дані
let pets = [
  { id: 1, name: "Барсік", species: "кіт", breed: "сибірська", ownerId: 1 },
  { id: 2, name: "Рекс", species: "собака", breed: "лабрадор", ownerId: 1 }
];

// GET /pets
router.get('/', authMiddleware, (req, res) => {
  const userPets = pets.filter(p => p.ownerId === req.user.id);
  res.json(userPets);
});

// POST /pets
router.post('/', authMiddleware, (req, res) => {
  const { name, species, breed } = req.body;
  if (!name || !species || !breed) return res.status(400).json({ error: "Вкажіть name, species і breed" });

  const newPet = { id: pets.length + 1, name, species, breed, ownerId: req.user.id };
  pets.push(newPet);
  res.json(newPet);
});

// PUT /pets/:id
router.put('/:id', authMiddleware, (req, res) => {
  const pet = pets.find(p => p.id == req.params.id && p.ownerId === req.user.id);
  if (!pet) return res.status(404).json({ error: "Тварина не знайдена" });

  const { name, species, breed } = req.body;
  if (name) pet.name = name;
  if (species) pet.species = species;
  if (breed) pet.breed = breed;

  res.json(pet);
});

// DELETE /pets/:id
router.delete('/:id', authMiddleware, (req, res) => {
  const index = pets.findIndex(p => p.id == req.params.id && p.ownerId === req.user.id);
  if (index === -1) return res.status(404).json({ error: "Тварина не знайдена" });

  const deleted = pets.splice(index, 1);
  res.json({ message: "Тварина видалена", pet: deleted[0] });
});

module.exports = router;
