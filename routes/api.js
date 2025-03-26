// routes/api.js

const express = require('express');
const axios = require('axios');
const pool = require('../config/db'); // pool de MySQL
const router = express.Router();

// Endpoint para actualizar la base de datos con datos de la API externa
router.get('/update-data', async (req, res) => {
  try {
    const apiResponse = await axios.get('http://moriahmkt.com/iotapp/updated/');
    const data = apiResponse.data;

    // Procesar datos globales
    const [globalResult] = await pool.query('SELECT * FROM historico_sensores_globales ORDER BY fecha_registro DESC LIMIT 1');
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
    const apiParcelasIds = data.parcelas.map(p => p.id);

    for (const parcela of data.parcelas) {
      const [result] = await pool.query('SELECT * FROM parcelas WHERE id = ?', [parcela.id]);
      if (result.length === 0) {
        const insertParcelaQuery = `
          INSERT INTO parcelas (id, nombre, ubicacion, responsable, tipo_cultivo, ultimo_riego, latitud, longitud, is_deleted)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, false)
        `;
        await pool.query(insertParcelaQuery, [
          parcela.id,
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
          parcela.id,
        ]);
      }

      const [sensorResult] = await pool.query(
        'SELECT * FROM historico_sensores_parcela WHERE parcela_id = ? ORDER BY fecha_registro DESC LIMIT 1',
        [parcela.id]
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
          parcela.id,
          parcela.sensor.humedad,
          parcela.sensor.temperatura,
          parcela.sensor.lluvia,
          parcela.sensor.sol,
        ]);
      }
    }

    // Marcar parcelas eliminadas
    const [dbParcelasResult] = await pool.query('SELECT id FROM parcelas WHERE is_deleted = false');
    const dbParcelasIds = dbParcelasResult.map(row => row.id);

    for (const id of dbParcelasIds) {
      if (!apiParcelasIds.includes(id)) {
        await pool.query('UPDATE parcelas SET is_deleted = true WHERE id = ?', [id]);
      }
    }

    res.json({ status: 'Base de datos actualizada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para obtener parcelas activas
router.get('/parcelas', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM parcelas WHERE is_deleted = false');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para obtener el histórico de sensores de una parcela
router.get('/historico/parcelas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      'SELECT * FROM historico_sensores_parcela WHERE parcela_id = ? ORDER BY fecha_registro ASC',
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para obtener parcelas eliminadas
router.get('/parcelas/eliminadas', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM parcelas WHERE is_deleted = true');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// NUEVO Endpoint para mostrar el contenido de la BD
router.get('/dump', async (req, res) => {
  try {
    // Consulta la tabla 'parcelas'
    const [parcelas] = await pool.query('SELECT * FROM parcelas');
    // Consulta la tabla 'historico_sensores_parcela'
    const [historico] = await pool.query('SELECT * FROM historico_sensores_parcela');

    // Si usas 'historico_sensores_globales'
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
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
