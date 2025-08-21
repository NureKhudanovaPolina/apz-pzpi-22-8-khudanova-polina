const axios = require("axios");

// функція для генерації випадкової температури
function getRandomTemperature() {
  return (20 + Math.random() * 10).toFixed(2); // від 20 до 30 °C
}

// кожні 5 секунд відправляємо температуру на сервер
setInterval(async () => {
  const temp = parseFloat(getRandomTemperature());
  try {
    const res = await axios.post("http://localhost:3000/temperature", { value: temp });
    console.log("📡 Sent:", temp, "✅ Server response:", res.data);
  } catch (err) {
    console.error("❌ Error sending data:", err.message);
  }
}, 5000);
