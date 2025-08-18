const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET_KEY = "supersecret"; // ключ для JWT

// Тимчасові дані користувачів
let users = [];

// POST /register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body; // тут req.body тепер буде визначений
  if (!name || !email || !password) return res.status(400).json({ error: "Всі поля обов'язкові" });

  const existingUser = users.find(u => u.email === email);
  if (existingUser) return res.status(400).json({ error: "Користувач вже існує" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = { id: users.length + 1, name, email, password: hashedPassword };
  users.push(newUser);

  res.json({ message: "Користувач зареєстрований" });
});

// POST /login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).json({ error: "Невірний email або пароль" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ error: "Невірний email або пароль" });

  const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '1h' });
  res.json({ message: "Успішний вхід", token });
});

// Мідлвар для перевірки токена
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Токен відсутній" });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Невірний токен" });
  }
}

module.exports = { router, authMiddleware };
