const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const bodyParser = require('body-parser');

const { router: authRouter } = require('./api/auth');
const petsRouter = require('./api/pets');

const app = express();

// --- Підключаємо body-parser ПЕРЕД маршрутами ---
app.use(bodyParser.json());  // <-- важливо для JSON
app.use(bodyParser.urlencoded({ extended: true })); // на всяк випадок

const swaggerDocument = YAML.load(__dirname + '/swagger/openapi.yaml');

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Маршрути
app.use('/auth', authRouter);
app.use('/pets', petsRouter);

// Запуск
app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
  console.log('Swagger UI at http://localhost:3000/api-docs');
});
