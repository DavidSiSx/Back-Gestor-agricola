const jwt = require('jsonwebtoken');

// Clave secreta para firmar los tokens (en producción, usar variables de entorno)
const JWT_SECRET = 'tu_clave_secreta_muy_segura';
const JWT_EXPIRES_IN = '24h'; // Tiempo de expiración del token

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN
};