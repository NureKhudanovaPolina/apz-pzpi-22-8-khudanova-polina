const loginBtn = document.getElementById("login-btn");
const registerBtn = document.getElementById("register-btn");
const showRegister = document.getElementById("show-register");
const showLogin = document.getElementById("show-login");

const authContainer = document.getElementById("auth-container");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

const appContainer = document.getElementById("app-container");
const logoutBtn = document.getElementById("logout-btn");

const addPetBtn = document.getElementById("add-pet-btn");
const addPetForm = document.getElementById("add-pet-form");
const savePetBtn = document.getElementById("save-pet-btn");
const petsContainer = document.getElementById("pets-container");
const refreshTempBtn = document.getElementById("refresh-temp-btn");

let token = localStorage.getItem("token") || "";
let role = localStorage.getItem("role") || "user";

if (token) {
  authContainer.style.display = "none";
  appContainer.style.display = "block";
  loadPets();
}

showRegister.onclick = () => {
  registerForm.style.display = "block";
  loginForm.style.display = "none";
};
showLogin.onclick = () => {
  loginForm.style.display = "block";
  registerForm.style.display = "none";
};

// Реєстрація
registerBtn.onclick = async () => {
  const name = document.getElementById("register-name").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value.trim();

  if (!name || !email || !password) {
    alert("Всі поля обов'язкові");
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (data.error) alert(data.error);
    else {
      alert(data.message);
      showLogin.click();
    }
  } catch (err) {
    console.error(err);
    alert("Помилка підключення до сервера");
  }
};

// Логін
loginBtn.onclick = async () => {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();

  if (!email || !password) {
    alert("Всі поля обов'язкові");
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (data.token) {
      token = data.token;
      localStorage.setItem("token", token);
      role = data.role || "user";
      localStorage.setItem("role", role);

      authContainer.style.display = "none";
      appContainer.style.display = "block";
      loadPets();
    } else {
      alert(data.error);
    }
  } catch (err) {
    console.error(err);
    alert("Помилка підключення до сервера");
  }
};

// Вихід
logoutBtn.onclick = () => {
  token = "";
  role = "user";
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  appContainer.style.display = "none";
  authContainer.style.display = "block";
};

addPetBtn.onclick = () => {
  addPetForm.style.display = addPetForm.style.display === "none" ? "block" : "none";
};

// Додати тварину
savePetBtn.onclick = async () => {
  const name = document.getElementById("pet-name").value.trim();
  const species = document.getElementById("pet-species").value.trim();
  const breed = document.getElementById("pet-breed").value.trim();

  if (!name || !species || !breed) {
    alert("Всі поля обов'язкові");
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/pets", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ name, species, breed }),
    });
    const pet = await res.json();
    if (pet.error) alert(pet.error);
    else {
      addPetCard(pet);
      addPetForm.style.display = "none";
      document.getElementById("pet-name").value = "";
      document.getElementById("pet-species").value = "";
      document.getElementById("pet-breed").value = "";
    }
  } catch (err) {
    console.error(err);
  }
};

refreshTempBtn.onclick = loadPets;

// Завантажити тварин
async function loadPets() {
  try {
    const res = await fetch("http://localhost:3000/pets", {
      headers: { "Authorization": "Bearer " + token }
    });
    const pets = await res.json();
    petsContainer.innerHTML = "";
    pets.forEach(addPetCard);
  } catch (err) {
    console.error(err);
  }
}

// Створення картки тварини
function addPetCard(pet) {
  const card = document.createElement("div");
  card.className = "pet-card";

  card.innerHTML = `
    <div style="font-weight:bold">
      ${pet.name} ${role === "admin" ? `(ownerId: ${pet.ownerId})` : ''}
    </div>
    <div>
      Вид: ${pet.species}<br>
      Порода: ${pet.breed}<br>
      Температура: ${pet.temperature} °C
    </div>
    <button class="delete-btn red-btn">Видалити</button>
  `;

  card.querySelector(".delete-btn").onclick = async () => {
    await fetch(`http://localhost:3000/pets/${pet.id}`, {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + token }
    });
    card.remove();
  };

  petsContainer.appendChild(card);
}
