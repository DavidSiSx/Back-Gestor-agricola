const express = require('express');
const axios = require('axios');
const bcrypt = require('bcrypt'); // Necesitarás instalar: npm install bcrypt
const jwt = require('jsonwebtoken'); // Necesitarás instalar: npm install jsonwebtoken
const pool = require('../config/db'); // pool de MySQL
const router = express.Router();

// Clave secreta para JWT (en producción, usar variables de entorno)
const JWT_SECRET = 'tu_clave_secreta_muy_segura';
const JWT_EXPIRES_IN = '24h';

// Middleware para verificar token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

// Función que actualiza la base de datos usando la API externa
async function updateData() {
  try {
    const apiResponse = await axios.get('https://moriahmkt.com/iotapp/test/');
    const data = apiResponse.data;

    // Procesar datos globales
    const [globalResult] = await pool.query(
      'SELECT * FROM historico_sensores_globales ORDER BY fecha_registro DESC LIMIT 1'
    );
    const lastGlobal = globalResult[0];

    if (
      !lastGlobal ||
      lastGlobal.humedad_global != data.sensores.humedad ||
      lastGlobal.temperatura_global != data.sensores.temperatura ||
      lastGlobal.lluvia_global != data.sensores.lluvia ||
      lastGlobal.sol_global != data.sensores.sol
    ) {
      const insertGlobalQuery = `
        INSERT INTO historico_sensores_globales
          (humedad_global, temperatura_global, lluvia_global, sol_global)
        VALUES (?, ?, ?, ?)
      `;
      await pool.query(insertGlobalQuery, [
        data.sensores.humedad,
        data.sensores.temperatura,
        data.sensores.lluvia,
        data.sensores.sol,
      ]);
    }

    // Procesar cada parcela
    // Convertir IDs a número
    const apiParcelasIds = data.parcelas.map(p => Number(p.id));
    console.log("API Parcelas IDs:", apiParcelasIds);

    for (const parcela of data.parcelas) {
      const [result] = await pool.query('SELECT * FROM parcelas WHERE id = ?', [Number(parcela.id)]);
      if (result.length === 0) {
        const insertParcelaQuery = `
          INSERT INTO parcelas (id, nombre, ubicacion, responsable, tipo_cultivo, ultimo_riego, latitud, longitud, is_deleted)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, false)
        `;
        await pool.query(insertParcelaQuery, [
          Number(parcela.id),
          parcela.nombre,
          parcela.ubicacion,
          parcela.responsable,
          parcela.tipo_cultivo,
          parcela.ultimo_riego,
          parcela.latitud,
          parcela.longitud,
        ]);
      } else {
        const updateParcelaQuery = `
          UPDATE parcelas
          SET nombre = ?, ubicacion = ?, responsable = ?, tipo_cultivo = ?, ultimo_riego = ?,
              latitud = ?, longitud = ?, is_deleted = false
          WHERE id = ?
        `;
        await pool.query(updateParcelaQuery, [
          parcela.nombre,
          parcela.ubicacion,
          parcela.responsable,
          parcela.tipo_cultivo,
          parcela.ultimo_riego,
          parcela.latitud,
          parcela.longitud,
          Number(parcela.id),
        ]);
      }

      const [sensorResult] = await pool.query(
        'SELECT * FROM historico_sensores_parcela WHERE parcela_id = ? ORDER BY fecha_registro DESC LIMIT 1',
        [Number(parcela.id)]
      );
      const lastSensor = sensorResult[0];

      if (
        !lastSensor ||
        lastSensor.humedad != parcela.sensor.humedad ||
        lastSensor.temperatura != parcela.sensor.temperatura ||
        lastSensor.lluvia != parcela.sensor.lluvia ||
        lastSensor.sol != parcela.sensor.sol
      ) {
        const insertSensorQuery = `
          INSERT INTO historico_sensores_parcela
            (parcela_id, humedad, temperatura, lluvia, sol)
          VALUES (?, ?, ?, ?, ?)
        `;
        await pool.query(insertSensorQuery, [
          Number(parcela.id),
          parcela.sensor.humedad,
          parcela.sensor.temperatura,
          parcela.sensor.lluvia,
          parcela.sensor.sol,
        ]);
      }
    }

    // Marcar parcelas eliminadas: si en la BD existen parcelas que no están en la API, se actualiza is_deleted a 1
    const [dbParcelasResult] = await pool.query('SELECT id FROM parcelas WHERE is_deleted = false');
    const dbParcelasIds = dbParcelasResult.map(row => Number(row.id));
    console.log("DB Parcelas IDs:", dbParcelasIds);

    for (const id of dbParcelasIds) {
      if (!apiParcelasIds.includes(id)) {
        console.log(`Marcando la parcela ${id} como eliminada`);
        await pool.query('UPDATE parcelas SET is_deleted = true WHERE id = ?', [id]);
      }
    }

    console.log("Actualización completada");
  } catch (err) {
    console.error("Error en updateData:", err);
    throw err;
  }
}

// ===== ENDPOINTS DE AUTENTICACIÓN =====

// Registro de usuario
router.post('/auth/register', async (req, res) => {
  try {
    const { email, password, nombre } = req.body;

    // Validar datos
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
    }

    // Verificar si el usuario ya existe
    const [existingUser] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado.' });
    }

    // Hash de la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insertar usuario en la base de datos
    const insertQuery = `
      INSERT INTO usuarios (email, password, nombre, rol)
      VALUES (?, ?, ?, 'usuario')
    `;
    const [result] = await pool.query(insertQuery, [email, hashedPassword, nombre || null]);

    // Generar token JWT
    const token = jwt.sign(
      { id: result.insertId, email, rol: 'usuario' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        id: result.insertId,
        email,
        nombre: nombre || null,
        rol: 'usuario'
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error al registrar usuario.' });
  }
});

// Login de usuario
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar datos
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
    }

    // Buscar usuario en la base de datos
    const [users] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const user = users[0];

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    // Generar token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión.' });
  }
});

// Obtener información del usuario actual
router.get('/auth/me', verifyToken, async (req, res) => {
  try {
    // Buscar usuario en la base de datos
    const [users] = await pool.query(
      'SELECT id, email, nombre, rol, fecha_creacion FROM usuarios WHERE id = ?', 
      [req.user.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ error: 'Error al obtener información del usuario' });
  }
});

// ===== ENDPOINTS PROTEGIDOS =====

// Endpoint para actualizar la BD manualmente (ahora protegido)
router.get('/update-data', verifyToken, async (req, res) => {
  try {
    // Verificar si el usuario es admin (opcional)
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'No tienes permisos para realizar esta acción.' });
    }
    
    await updateData();
    res.json({ status: 'Base de datos actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para obtener parcelas activas (ahora protegido)
router.get('/parcelas', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM parcelas WHERE is_deleted = false');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para obtener el histórico de sensores de una parcela (ahora protegido)
router.get('/historico/parcelas/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      'SELECT * FROM historico_sensores_parcela WHERE parcela_id = ? ORDER BY fecha_registro ASC',
      [Number(id)]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para obtener parcelas eliminadas (ahora protegido)
router.get('/parcelas/eliminadas', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM parcelas WHERE is_deleted = true');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para mostrar el contenido completo de la BD (ahora protegido)
router.get('/dump', verifyToken, async (req, res) => {
  try {
    const [parcelas] = await pool.query('SELECT * FROM parcelas');
    const [historico] = await pool.query('SELECT * FROM historico_sensores_parcela');
    let globales = [];
    try {
      const [globalResult] = await pool.query('SELECT * FROM historico_sensores_globales');
      globales = globalResult;
    } catch (err) {
      console.warn("No se encontró la tabla historico_sensores_globales (opcional).");
    }
    res.json({
      parcelas,
      historico,
      globales
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, updateData };