const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");
const path = require("path");
const mqtt = require("mqtt");

const app = express();
app.use(cors());
app.use(express.json());

const SECRET_KEY = "12345";

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "pet_health",
});

app.use(express.static(path.join(__dirname, "public")));

// ================== MQTT ==================
const client = mqtt.connect("mqtt://localhost:1883");
let petTemperatures = {}; // кеш температур

client.on("connect", () => {
  console.log("Підключено до MQTT брокера");
  client.subscribe("pets/temperature", (err) => {
    if (!err) console.log("Підписка на тему pets/temperature успішна");
  });
});

client.on("message", (topic, message) => {
  if (topic === "pets/temperature") {
    const [id, temp] = message.toString().split(",");
    petTemperatures[id] = parseFloat(temp);
    console.log(`Оновлено температуру тварини ${id}: ${temp}`);
  }
});

// ================== Мідлвар для авторизації ==================
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Не авторизовано" });
  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Не авторизовано" });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Не авторизовано" });
  }
};

// ================== Аутентифікація ==================
app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "Всі поля обов'язкові" });

    const [existing] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (existing.length > 0)
      return res.status(400).json({ error: "Користувач вже існує" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [
      name,
      email,
      hashedPassword,
    ]);

    res.json({ message: "Користувач зареєстрований" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка сервера" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0)
      return res.status(400).json({ error: "Невірний email або пароль" });

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Невірний email або пароль" });

    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: "1h" });
    res.json({ message: "Успішний вхід", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка сервера" });
  }
});

// ================== CRUD для тварин ==================

app.get("/pets", authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM pets WHERE ownerId = ?", [req.user.id]);
    const petsWithTemp = rows.map(pet => ({
      ...pet,
      temperature: petTemperatures[pet.id] || (37 + Math.random() * 2).toFixed(1)
    }));
    res.json(petsWithTemp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка сервера" });
  }
});

// Додати тварину
app.post("/pets", authMiddleware, async (req, res) => {
  const { name, species, breed } = req.body;
  try {
    const [result] = await db.query(
      "INSERT INTO pets (name, species, breed, ownerId) VALUES (?, ?, ?, ?)",
      [name, species, breed, req.user.id]
    );
    const [rows] = await db.query("SELECT * FROM pets WHERE id = ?", [result.insertId]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка додавання тварини" });
  }
});

// Видалити тварину
app.delete("/pets/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM pets WHERE id = ? AND ownerId = ?", [id, req.user.id]);
    res.json({ message: "Тварина видалена" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка видалення тварини" });
  }
});

// ================== Старт сервера ==================
const PORT = 3000;
app.listen(PORT, () => console.log(`Сервер працює на порту ${PORT}`));
