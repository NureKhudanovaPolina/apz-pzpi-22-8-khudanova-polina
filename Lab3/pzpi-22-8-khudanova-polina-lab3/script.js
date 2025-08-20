const loginBtn = document.getElementById("login-btn");
const registerBtn = document.getElementById("register-btn");
const showRegister = document.getElementById("show-register");
const showLogin = document.getElementById("show-login");
const authContainer = document.getElementById("auth-container");
const registerForm = document.getElementById("register-form");
const appContainer = document.getElementById("app-container");
const addPetBtn = document.getElementById("add-pet-btn");
const addPetForm = document.getElementById("add-pet-form");
const savePetBtn = document.getElementById("save-pet-btn");
const petsContainer = document.getElementById("pets-container");
const refreshTempBtn = document.getElementById("refresh-temp-btn");

let token = localStorage.getItem("token") || "";

showRegister.onclick = () => registerForm.style.display = "block";
showLogin.onclick = () => registerForm.style.display = "none";


if (token) {
  authContainer.style.display = "none";
  appContainer.style.display = "block";
  loadPets();
}

registerBtn.onclick = async () => {
  const name = document.getElementById("register-name").value;
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;

  if (!name || !email || !password) {
    alert("Всі поля обов'язкові");
    return;
  }

  const res = await fetch("http://localhost:3000/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json();
  alert(data.message || data.error);
};

loginBtn.onclick = async () => {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  if (!email || !password) {
    alert("Всі поля обов'язкові");
    return;
  }

  const res = await fetch("http://localhost:3000/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.token) {
    token = data.token;
    localStorage.setItem("token", token);
    authContainer.style.display = "none";
    appContainer.style.display = "block";
    loadPets();
  } else {
    alert(data.error);
  }
};

document.getElementById("logout-btn").onclick = () => {
  token = "";
  localStorage.removeItem("token");
  appContainer.style.display = "none";
  authContainer.style.display = "block";
};

addPetBtn.onclick = () => addPetForm.style.display = addPetForm.style.display === "none" ? "block" : "none";


savePetBtn.onclick = async () => {
  const name = document.getElementById("pet-name").value;
  const species = document.getElementById("pet-species").value;
  const breed = document.getElementById("pet-breed").value;

  if (!name || !species || !breed) {
    alert("Всі поля обов'язкові");
    return;
  }

  const res = await fetch("http://localhost:3000/pets", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({ name, species, breed }),
  });
  const pet = await res.json();
  loadPets();
};

async function loadPets() {
  try {
    const res = await fetch("http://localhost:3000/pets", {
      headers: { "Authorization": "Bearer " + token }
    });
    const pets = await res.json();

    let temps = [];
    try {
      const tempRes = await fetch("http://127.0.0.1:5000/temperature");
      temps = await tempRes.json();
    } catch (err) {
      console.error("Помилка підключення до IoT-сервера:", err.message);
    }

    petsContainer.innerHTML = "";
    pets.forEach(pet => {
      const tempObj = temps.find(t => t.id === pet.id);
      pet.temperature = tempObj ? tempObj.temperature : (37 + Math.random() * 2).toFixed(1);
      addPetCard(pet);
    });
  } catch (err) {
    console.error(err);
  }
}

refreshTempBtn.onclick = loadPets;

function addPetCard(pet) {
  const card = document.createElement("div");
  card.className = "pet-card";

  const nameDiv = document.createElement("div");
  nameDiv.textContent = pet.name;
  nameDiv.style.fontWeight = "bold";

  const infoDiv = document.createElement("div");
  infoDiv.innerHTML = `
    Вид: ${pet.species} <br>
    Порода: ${pet.breed} <br>
    Температура: ${pet.temperature} °C
  `;

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Видалити";
  deleteBtn.style.background = "red";
  deleteBtn.style.color = "white";
  deleteBtn.onclick = async () => {
    await fetch(`http://localhost:3000/pets/${pet.id}`, {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + token }
    });
    loadPets();
  };

  card.appendChild(nameDiv);
  card.appendChild(infoDiv);
  card.appendChild(deleteBtn);
  petsContainer.appendChild(card);
}
