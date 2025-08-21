const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const bodyParser = require('body-parser');

const { router: authRouter } = require('./api/auth');
const petsRouter = require('./api/pets');

const app = express();

app.use(bodyParser.json());  
app.use(bodyParser.urlencoded({ extended: true }));

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
