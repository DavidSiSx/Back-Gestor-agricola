const express = require("express")
const axios = require("axios")
const bcrypt = require("bcrypt") // Necesitarás instalar: npm install bcrypt
const jwt = require("jsonwebtoken") // Necesitarás instalar: npm install jsonwebtoken
const pool = require("../config/db") // pool de MySQL
const router = express.Router()

// Clave secreta para JWT (en producción, usar variables de entorno)
const JWT_SECRET = "tu_clave_secreta_muy_segura"
const JWT_EXPIRES_IN = "24h"

// URL de la API externa - ACTUALIZADA
const API_EXTERNAL_URL = "https://moriahmkt.com/iotapp/updated/"
// URL de la API de zonas de riego
const API_ZONAS_RIEGO_URL = "http://moriahmkt.com/iotapp/am"

// Middleware para verificar token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "Acceso denegado. Token no proporcionado." })
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET)
    req.user = verified
    next()
  } catch (error) {
    res.status(401).json({ error: "Token inválido o expirado." })
  }
}

// Función que actualiza la base de datos usando la API externa
async function updateData() {
  try {
    // Usar la nueva URL de la API
    const apiResponse = await axios.get(API_EXTERNAL_URL)
    const data = apiResponse.data

    console.log("Datos recibidos de la API:", JSON.stringify(data, null, 2))

    // Verificar si los datos tienen la estructura esperada
    if (!data || !data.sensores) {
      console.error("Error: La API no devolvió datos de sensores válidos")
      // Crear un objeto de sensores con valores predeterminados
      data.sensores = {
        humedad: 0,
        temperatura: 0,
        lluvia: 0,
        sol: 0,
      }
    }

    // Asegurarse de que todos los valores de sensores existan
    data.sensores.humedad = data.sensores.humedad !== undefined ? data.sensores.humedad : 0
    data.sensores.temperatura = data.sensores.temperatura !== undefined ? data.sensores.temperatura : 0
    data.sensores.lluvia = data.sensores.lluvia !== undefined ? data.sensores.lluvia : 0
    data.sensores.sol = data.sensores.sol !== undefined ? data.sensores.sol : 0

    // Procesar datos globales
    const [globalResult] = await pool.query(
      "SELECT * FROM historico_sensores_globales ORDER BY fecha_registro DESC LIMIT 1",
    )
    const lastGlobal = globalResult[0]

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
      `
      await pool.query(insertGlobalQuery, [
        data.sensores.humedad,
        data.sensores.temperatura,
        data.sensores.lluvia,
        data.sensores.sol,
      ])
    }

    // Verificar si hay datos de parcelas
    if (!data.parcelas || !Array.isArray(data.parcelas) || data.parcelas.length === 0) {
      console.warn("No se encontraron datos de parcelas en la respuesta de la API")
      return // Salir de la función si no hay parcelas
    }

    // Procesar cada parcela
    // Convertir IDs a número
    const apiParcelasIds = data.parcelas.map((p) => Number(p.id))
    console.log("API Parcelas IDs:", apiParcelasIds)

    for (const parcela of data.parcelas) {
      // Verificar si la parcela tiene todos los datos necesarios
      if (!parcela.id) {
        console.warn("Parcela sin ID, omitiendo:", parcela)
        continue
      }

      const [result] = await pool.query("SELECT * FROM parcelas WHERE id = ?", [Number(parcela.id)])
      if (result.length === 0) {
        const insertParcelaQuery = `
          INSERT INTO parcelas (id, nombre, ubicacion, responsable, tipo_cultivo, ultimo_riego, latitud, longitud, is_deleted)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, false)
        `
        await pool.query(insertParcelaQuery, [
          Number(parcela.id),
          parcela.nombre || `Parcela ${parcela.id}`,
          parcela.ubicacion || "",
          parcela.responsable || "",
          parcela.tipo_cultivo || "",
          parcela.ultimo_riego || new Date().toISOString().slice(0, 10),
          parcela.latitud || 0,
          parcela.longitud || 0,
        ])
      } else {
        const updateParcelaQuery = `
          UPDATE parcelas
          SET nombre = ?, ubicacion = ?, responsable = ?, tipo_cultivo = ?, ultimo_riego = ?,
              latitud = ?, longitud = ?, is_deleted = false
          WHERE id = ?
        `
        await pool.query(updateParcelaQuery, [
          parcela.nombre || result[0].nombre,
          parcela.ubicacion || result[0].ubicacion,
          parcela.responsable || result[0].responsable,
          parcela.tipo_cultivo || result[0].tipo_cultivo,
          parcela.ultimo_riego || result[0].ultimo_riego,
          parcela.latitud || result[0].latitud,
          parcela.longitud || result[0].longitud,
          Number(parcela.id),
        ])
      }

      // Verificar si la parcela tiene datos de sensor
      if (!parcela.sensor) {
        console.warn(`Parcela ${parcela.id} sin datos de sensor, creando valores predeterminados`)
        parcela.sensor = {
          humedad: 0,
          temperatura: 0,
          lluvia: 0,
          sol: 0,
        }
      } else {
        // Asegurarse de que todos los valores de sensores existan
        parcela.sensor.humedad = parcela.sensor.humedad !== undefined ? parcela.sensor.humedad : 0
        parcela.sensor.temperatura = parcela.sensor.temperatura !== undefined ? parcela.sensor.temperatura : 0
        parcela.sensor.lluvia = parcela.sensor.lluvia !== undefined ? parcela.sensor.lluvia : 0
        parcela.sensor.sol = parcela.sensor.sol !== undefined ? parcela.sensor.sol : 0
      }

      const [sensorResult] = await pool.query(
        "SELECT * FROM historico_sensores_parcela WHERE parcela_id = ? ORDER BY fecha_registro DESC LIMIT 1",
        [Number(parcela.id)],
      )
      const lastSensor = sensorResult[0]

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
        `
        await pool.query(insertSensorQuery, [
          Number(parcela.id),
          parcela.sensor.humedad,
          parcela.sensor.temperatura,
          parcela.sensor.lluvia,
          parcela.sensor.sol,
        ])
      }
    }

    // Marcar parcelas eliminadas: si en la BD existen parcelas que no están en la API, se actualiza is_deleted a 1
    const [dbParcelasResult] = await pool.query("SELECT id FROM parcelas WHERE is_deleted = false")
    const dbParcelasIds = dbParcelasResult.map((row) => Number(row.id))
    console.log("DB Parcelas IDs:", dbParcelasIds)

    for (const id of dbParcelasIds) {
      if (!apiParcelasIds.includes(id)) {
        console.log(`Marcando la parcela ${id} como eliminada`)
        await pool.query("UPDATE parcelas SET is_deleted = true WHERE id = ?", [id])
      }
    }

    console.log("Actualización completada")
  } catch (err) {
    console.error("Error en updateData:", err)
    throw err
  }
}

// Endpoint para obtener datos generales (sensores globales)
router.get("/datos-generales", async (req, res) => {
  try {
    // Obtener datos directamente de la API externa
    const apiResponse = await axios.get(API_EXTERNAL_URL)
    const apiData = apiResponse.data

    console.log("Datos recibidos directamente de la API:", JSON.stringify(apiData, null, 2))

    // Verificar si los datos tienen la estructura esperada
    if (!apiData || !apiData.sensores) {
      console.error("Error: La API no devolvió datos de sensores válidos")
      // Devolver valores predeterminados
      return res.json({
        status: "success",
        data: {
          temperatura: 0,
          humedad: 0,
          lluvia: 0,
          sol: 0,
          fecha: new Date().toISOString(),
        },
      })
    }

    // Asegurarse de que todos los valores de sensores existan y sean números válidos
    const temperatura =
      typeof apiData.sensores.temperatura === "number"
        ? apiData.sensores.temperatura
        : typeof apiData.sensores.temperatura === "string"
          ? Number.parseFloat(apiData.sensores.temperatura)
          : 0

    const humedad =
      typeof apiData.sensores.humedad === "number"
        ? apiData.sensores.humedad
        : typeof apiData.sensores.humedad === "string"
          ? Number.parseFloat(apiData.sensores.humedad)
          : 0

    const lluvia =
      typeof apiData.sensores.lluvia === "number"
        ? apiData.sensores.lluvia
        : typeof apiData.sensores.lluvia === "string"
          ? Number.parseFloat(apiData.sensores.lluvia)
          : 0

    const sol =
      typeof apiData.sensores.sol === "number"
        ? apiData.sensores.sol
        : typeof apiData.sensores.sol === "string"
          ? Number.parseFloat(apiData.sensores.sol)
          : 0

    // Devolver los datos directamente de la API
    res.json({
      status: "success",
      data: {
        temperatura,
        humedad,
        lluvia,
        sol,
        fecha: new Date().toISOString(),
      },
      source: "api_direct",
    })
  } catch (err) {
    console.error("Error al obtener datos generales desde la API:", err)

    // Intentar obtener el último registro de la base de datos como respaldo
    try {
      const [rows] = await pool.query("SELECT * FROM historico_sensores_globales ORDER BY fecha_registro DESC LIMIT 1")

      if (rows.length === 0) {
        // Si no hay datos en la BD, devolver valores predeterminados
        return res.json({
          status: "success",
          data: {
            temperatura: 0,
            humedad: 0,
            lluvia: 0,
            sol: 0,
            fecha: new Date().toISOString(),
          },
          source: "default_values",
        })
      }

      // Mapear los nombres de columnas de la BD a los nombres esperados por el frontend
      const data = {
        temperatura: rows[0].temperatura_global || 0,
        humedad: rows[0].humedad_global || 0,
        lluvia: rows[0].lluvia_global || 0,
        sol: rows[0].sol_global || 0,
        fecha: rows[0].fecha_registro,
      }

      res.json({
        status: "success",
        data,
        source: "database_fallback",
      })
    } catch (dbErr) {
      // En caso de error, devolver valores predeterminados
      res.json({
        status: "error",
        message: err.message,
        data: {
          temperatura: 0,
          humedad: 0,
          lluvia: 0,
          sol: 0,
          fecha: new Date().toISOString(),
        },
        source: "error_fallback",
      })
    }
  }
})

// Modificar el endpoint para obtener zonas de riego para que use datos reales de la API externa
router.get("/zonas-riego", verifyToken, async (req, res) => {
  try {
    // Obtener datos directamente de la API externa
    console.log("Obteniendo datos directamente de la API externa:", API_ZONAS_RIEGO_URL)
    const apiResponse = await axios.get(API_ZONAS_RIEGO_URL)
    const apiData = apiResponse.data

    console.log("Datos recibidos de la API externa:", JSON.stringify(apiData, null, 2))

    // Verificar si los datos tienen la estructura esperada
    if (!apiData || !apiData.zonas || !Array.isArray(apiData.zonas)) {
      console.error("Error: La API externa no devolvió datos de zonas de riego válidos")
      return res.status(500).json({
        status: "error",
        message: "La API externa no devolvió datos válidos",
        data: [],
      })
    }

    // Devolver los datos directamente de la API externa
    return res.json({
      status: "success",
      data: apiData.zonas,
      source: "api_direct",
    })
  } catch (err) {
    console.error("Error al obtener zonas de riego desde la API externa:", err)

    // Intentar obtener datos de la base de datos como respaldo
    try {
      const [rows] = await pool.query("SELECT * FROM zonas_riego ORDER BY sector")

      if (rows.length > 0) {
        return res.json({
          status: "success",
          data: rows,
          source: "database_fallback",
        })
      } else {
        // Si no hay datos en la base de datos, devolver un error
        return res.status(500).json({
          status: "error",
          message: "No se pudieron obtener datos de zonas de riego y no hay respaldo en la base de datos",
          data: [],
        })
      }
    } catch (dbErr) {
      console.error("Error al obtener datos de respaldo de la base de datos:", dbErr)
      return res.status(500).json({
        status: "error",
        message: "Error al obtener datos de zonas de riego",
        data: [],
      })
    }
  }
})

// Añadir un endpoint para actualizar manualmente las zonas de riego
router.get("/update-zonas-riego", verifyToken, async (req, res) => {
  try {
    // Verificar si el usuario es admin (opcional)
    if (req.user.rol !== "admin") {
      return res.status(403).json({ error: "No tienes permisos para realizar esta acción." })
    }

    // Obtener datos directamente de la API externa
    const apiResponse = await axios.get(API_ZONAS_RIEGO_URL)
    const apiData = apiResponse.data

    // Verificar si los datos tienen la estructura esperada
    if (!apiData || !apiData.zonas || !Array.isArray(apiData.zonas)) {
      return res.status(500).json({ error: "La API externa no devolvió datos válidos" })
    }

    // Actualizar la base de datos con los datos de la API
    for (const zona of apiData.zonas) {
      // Verificar si la zona tiene todos los datos necesarios
      if (!zona.id || !zona.sector || !zona.nombre || !zona.estado) {
        console.warn("Zona sin datos completos, omitiendo:", zona)
        continue
      }

      // Verificar si la zona ya existe en la base de datos
      const [result] = await pool.query("SELECT * FROM zonas_riego WHERE id = ?", [Number(zona.id)])

      if (result.length === 0) {
        // Si no existe, insertar nueva zona
        const insertZonaQuery = `
          INSERT INTO zonas_riego (
            id, sector, nombre, tipo_riego, estado, latitud, longitud, 
            motivo, fecha, color
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        await pool.query(insertZonaQuery, [
          Number(zona.id),
          zona.sector,
          zona.nombre,
          zona.tipo_riego || null,
          zona.estado,
          zona.latitud || null,
          zona.longitud || null,
          zona.motivo || null,
          zona.fecha || new Date().toISOString(),
          zona.color || null,
        ])
      } else {
        // Si existe, actualizar la zona
        const updateZonaQuery = `
          UPDATE zonas_riego
          SET sector = ?, nombre = ?, tipo_riego = ?, estado = ?,
              latitud = ?, longitud = ?, motivo = ?, fecha = ?, color = ?
          WHERE id = ?
        `
        await pool.query(updateZonaQuery, [
          zona.sector,
          zona.nombre,
          zona.tipo_riego || result[0].tipo_riego,
          zona.estado,
          zona.latitud || result[0].latitud,
          zona.longitud || result[0].longitud,
          zona.motivo || result[0].motivo,
          zona.fecha || result[0].fecha,
          zona.color || result[0].color,
          Number(zona.id),
        ])
      }
    }

    res.json({ status: "Zonas de riego actualizadas correctamente desde la API externa" })
  } catch (err) {
    console.error("Error al actualizar zonas de riego desde la API externa:", err)
    res.status(500).json({ error: err.message })
  }
})

// ===== ENDPOINTS DE AUTENTICACIÓN =====

// Registro de usuario
router.post("/auth/register", async (req, res) => {
  try {
    const { email, password, nombre } = req.body

    // Validar datos
    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña son requeridos." })
    }

    // Verificar si el usuario ya existe
    const [existingUser] = await pool.query("SELECT * FROM usuarios WHERE email = ?", [email])
    if (existingUser.length > 0) {
      return res.status(400).json({ error: "El email ya está registrado." })
    }

    // Hash de la contraseña
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Insertar usuario en la base de datos
    const insertQuery = `
      INSERT INTO usuarios (email, password, nombre, rol)
      VALUES (?, ?, ?, 'usuario')
    `
    const [result] = await pool.query(insertQuery, [email, hashedPassword, nombre || null])

    // Generar token JWT
    const token = jwt.sign({ id: result.insertId, email, rol: "usuario" }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

    res.status(201).json({
      message: "Usuario registrado exitosamente",
      token,
      user: {
        id: result.insertId,
        email,
        nombre: nombre || null,
        rol: "usuario",
      },
    })
  } catch (error) {
    console.error("Error en registro:", error)
    res.status(500).json({ error: "Error al registrar usuario." })
  }
})

// Login de usuario
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body

    // Validar datos
    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña son requeridos." })
    }

    // Buscar usuario en la base de datos
    const [users] = await pool.query("SELECT * FROM usuarios WHERE email = ?", [email])
    if (users.length === 0) {
      return res.status(401).json({ error: "Credenciales inválidas." })
    }

    const user = users[0]

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return res.status(401).json({ error: "Credenciales inválidas." })
    }

    // Generar token JWT
    const token = jwt.sign({ id: user.id, email: user.email, rol: user.rol }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

    res.json({
      message: "Login exitoso",
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
      },
    })
  } catch (error) {
    console.error("Error en login:", error)
    res.status(500).json({ error: "Error al iniciar sesión." })
  }
})

// Obtener información del usuario actual
router.get("/auth/me", verifyToken, async (req, res) => {
  try {
    // Buscar usuario en la base de datos
    const [users] = await pool.query("SELECT id, email, nombre, rol, fecha_creacion FROM usuarios WHERE id = ?", [
      req.user.id,
    ])

    if (users.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" })
    }

    res.json({ user: users[0] })
  } catch (error) {
    console.error("Error al obtener usuario:", error)
    res.status(500).json({ error: "Error al obtener información del usuario" })
  }
})

// ===== ENDPOINTS PROTEGIDOS =====

// Endpoint para actualizar la BD manualmente (ahora protegido)
router.get("/update-data", verifyToken, async (req, res) => {
  try {
    // Verificar si el usuario es admin (opcional)
    if (req.user.rol !== "admin") {
      return res.status(403).json({ error: "No tienes permisos para realizar esta acción." })
    }

    await updateData()
    res.json({ status: "Base de datos actualizada correctamente" })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Endpoint para obtener parcelas activas (ahora protegido)
router.get("/parcelas", verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM parcelas WHERE is_deleted = false")
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Endpoint para obtener el histórico de sensores de una parcela (ahora protegido)
router.get("/historico/parcelas/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    const [rows] = await pool.query(
      "SELECT * FROM historico_sensores_parcela WHERE parcela_id = ? ORDER BY fecha_registro ASC",
      [Number(id)],
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Endpoint para obtener parcelas eliminadas (ahora protegido)
router.get("/parcelas/eliminadas", verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM parcelas WHERE is_deleted = true")
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Endpoint para mostrar el contenido completo de la BD (ahora protegido)
router.get("/dump", verifyToken, async (req, res) => {
  try {
    const [parcelas] = await pool.query("SELECT * FROM parcelas")
    const [historico] = await pool.query("SELECT * FROM historico_sensores_parcela")
    let globales = []
    try {
      const [globalResult] = await pool.query("SELECT * FROM historico_sensores_globales")
      globales = globalResult
    } catch (err) {
      console.warn("No se encontró la tabla historico_sensores_globales (opcional).")
    }
    res.json({
      parcelas,
      historico,
      globales,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = { router, updateData }

