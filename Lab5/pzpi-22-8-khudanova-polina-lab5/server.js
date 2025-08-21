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

// ================== Middleware ==================
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

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: "Доступ заборонено" });
  }
  next();
};

// ================== Auth ==================
app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "Всі поля обов'язкові" });

    const [existing] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (existing.length > 0)
      return res.status(400).json({ error: "Користувач вже існує" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, "user"]
    );

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

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: "1h" });
    res.json({ message: "Успішний вхід", token, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка сервера" });
  }
});

// ================== CRUD Pets ==================
app.get("/pets", authMiddleware, async (req, res) => {
  try {
    let rows;
    if (req.user.role === "admin") {
      [rows] = await db.query("SELECT * FROM pets");
    } else {
      [rows] = await db.query("SELECT * FROM pets WHERE ownerId = ?", [req.user.id]);
    }
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
  try {
    const { name, species, breed } = req.body;

    if (!name || !species || !breed) {
      return res.status(400).json({ error: "Всі поля обов'язкові" });
    }

    const [result] = await db.query(
      "INSERT INTO pets (name, species, breed, ownerId) VALUES (?, ?, ?, ?)",
      [name, species, breed, req.user.id] 
    );

    const [rows] = await db.query("SELECT * FROM pets WHERE id = ?", [result.insertId]);
    const pet = rows[0];
    const petWithTemp = {
      ...pet,
      temperature: petTemperatures[pet.id] || (37 + Math.random() * 2).toFixed(1)
    };

    res.json(petWithTemp);  
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка додавання тварини" });
  }
});

app.put("/pets/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, species, breed } = req.body;
  try {
    const [result] = await db.query(
      "UPDATE pets SET name = ?, species = ?, breed = ? WHERE id = ? AND (ownerId = ? OR ? = 'admin')",
      [name, species, breed, id, req.user.id, req.user.role]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Тварину не знайдено або немає прав" });
    const [rows] = await db.query("SELECT * FROM pets WHERE id = ?", [id]);
    const pet = rows[0];
    res.json({ ...pet, temperature: petTemperatures[pet.id] || (37 + Math.random() * 2).toFixed(1) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка оновлення тварини" });
  }
});

app.delete("/pets/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(
      "DELETE FROM pets WHERE id = ? AND (ownerId = ? OR ? = 'admin')",
      [id, req.user.id, req.user.role]
    );
    res.json({ message: "Тварина видалена" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка видалення тварини" });
  }
});

// ================== Admin routes ==================
app.get("/admin/users", authMiddleware, adminMiddleware, async (req, res) => {
  const [users] = await db.query("SELECT id, name, email, role FROM users");
  res.json(users);
});

app.delete("/admin/users/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const { id } = req.params;
  await db.query("DELETE FROM users WHERE id = ?", [id]);
  await db.query("DELETE FROM pets WHERE ownerId = ?", [id]);
  res.json({ message: "Користувач та його тварини видалені" });
});

// ================== Старт сервера ==================
const PORT = 3000;
app.listen(PORT, () => console.log(`Сервер працює на порту ${PORT}`));
