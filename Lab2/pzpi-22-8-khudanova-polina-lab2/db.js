const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',       
  password: '',       
  database: 'pet_health'
});

module.exports = pool.promise(); 
