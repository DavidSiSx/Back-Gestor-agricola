// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { router, updateData } = require('./routes/api');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
  origin: "*"
}));

app.use(express.json());
app.use('/api', router);

// Llamada inicial y luego cada 30 segundos para actualizar la BD
updateData();
setInterval(updateData, 10 * 1000);

app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});
