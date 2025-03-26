// config/db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,      // Ejemplo: 'localhost'
  user: process.env.DB_USER,      // Tu usuario de MySQL
  password: process.env.DB_PASS,  // Tu contraseña de MySQL
  database: process.env.DB_NAME,  // Nombre de la base de datos
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
