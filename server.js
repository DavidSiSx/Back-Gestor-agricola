// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors'); // Importa el paquete cors
const apiRoutes = require('./routes/api');
const app = express();
const port = process.env.PORT || 3001;

// Configura cors para permitir solicitudes desde tu front-end (por ejemplo, localhost:5174)
app.use(cors({
  origin: "http://localhost:5174"
}));

app.use(express.json());
app.use('/api', apiRoutes);

app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});

