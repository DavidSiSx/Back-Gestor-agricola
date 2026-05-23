<p align="center">
  <img src="https://img.icons8.com/color/96/sprout.png" width="80" alt="Sprout Icon" />
</p>

<h1 align="center">🌱 Smart Farm (Gestor Agrícola)</h1>
<p align="center">
  <strong>Full-Stack IoT Land Monitoring & Real-Time Dashboard | Trazabilidad de Parcelas y Monitoreo IoT en Tiempo Real</strong><br/>
  An interactive telemetry agricultural dashboard combining Mapbox GL mapping, Chart.js analytics, Node.js API and Firebase sync.<br/>
  *Un panel interactivo de telemetría agrícola que combina mapeo con Mapbox GL, analíticas con Chart.js, API en Node.js y sincronización Firebase.*
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20.x-339933?logo=nodedotjs" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-4.21-black?logo=express" alt="Express" />
  <img src="https://img.shields.io/badge/React-19.0-61DAFB?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Mapbox_GL-3.10-0080FF?logo=mapbox" alt="Mapbox GL" />
  <img src="https://img.shields.io/badge/Firebase-11.5-FFCA28?logo=firebase" alt="Firebase" />
  <img src="https://img.shields.io/badge/Chart.js-4.4-FF6384?logo=chartdotjs" alt="Chart.js" />
  <img src="https://img.shields.io/badge/UT_Cancún-Academic_Project-blue" alt="UT Cancún" />
</p>

---

<p align="center">
  <a href="#english"><img src="https://img.shields.io/badge/Language-English-blue?style=for-the-badge" alt="English" /></a>
  <a href="#español"><img src="https://img.shields.io/badge/Idioma-Espa%C3%B1ol-green?style=for-the-badge" alt="Español" /></a>
</p>

---

<h2 id="english">🇬🇧 English</h2>

### 🎓 Academic Context
This application was developed as a **school project** for the **Universidad Tecnológica de Cancún** (UT de Cancún) to explore client-side data analytics, geospatial plotting of IoT coordinates, and real-time database synchronization workflows.

### What is Smart Farm?
It is a comprehensive full-stack platform that connects hardware IoT sensors on agricultural fields with a centralized dashboard. Farmers can manage land parcel coordinates, monitor soil moisture, temperature, and atmospheric metrics, and analyze crop history widgets.

---

### Architecture & Technical Design

1. **Geospatial UI & Chart.js Visuals**:
   * Uses **Mapbox GL** to plot field polygon boundaries, mapping sensor modules on top of real geographic terrains.
   * Leverages **Chart.js** (`react-chartjs-2`) to render historical datasets of temperature, soil moisture, and humidity values.
   * Synchronizes instant sensor readings in real-time using **Firebase**.

2. **Decoupled Node.js REST API**:
   * Express backend handles authorization routes secured by JWT tokens and hashes credentials with Bcrypt.
   * Saves general field layout, structural configurations, and user settings inside a relational MySQL database via the `mysql2` driver client.

---

### Technology Stack
* **Backend**: Node.js, Express, MySQL, JWT, Bcrypt.
* **Frontend**: React 19, Vite, TypeScript, Mapbox GL JS, Chart.js, Firebase.

---

### 🚀 Getting Started

#### Prerequisites
* Node.js (v18.x or higher)
* MySQL Database Server
* Mapbox Access Token
* Firebase Web App SDK credentials

#### Installation & Setup

1. **Clone the repositories**:
   ```bash
   # Clone Backend
   git clone https://github.com/DavidSiSx/Back-Gestor-agricola.git backend-agricola
   
   # Clone Frontend
   git clone https://github.com/DavidSiSx/Front-Gestor-agricola-Terminado.git frontend-agricola
   ```

2. **Run Backend REST API**:
   ```bash
   cd backend-agricola
   npm install
   ```
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=yourpassword
   DB_NAME=gestor_agricola
   JWT_SECRET=yourjwtsecret
   ```
   Start the backend:
   ```bash
   node server.js
   ```

3. **Run Frontend Client**:
   ```bash
   cd ../frontend-agricola/iot-def
   npm install
   ```
   * Set up your Mapbox and Firebase SDK keys in your local environment variables.
   * Start dev server:
   ```bash
   npm run dev
   ```

---

<h2 id="español">🇪🇸 Español</h2>

### 🎓 Contexto Académico
Esta aplicación fue desarrollada como un **proyecto escolar** para la **Universidad Tecnológica de Cancún** (UT de Cancún), enfocado en la analítica de datos del lado del cliente, el mapeo geoespacial de coordenadas IoT y flujos de trabajo de sincronización en tiempo real.

### ¿Qué es Smart Farm?
Es una plataforma full-stack completa que conecta sensores físicos de IoT en campos agrícolas con un panel de control centralizado. Permite a los agricultores gestionar coordenadas de parcelas de terreno, monitorear la humedad del suelo, la temperatura y las variables atmosféricas, y analizar el historial de cultivos.

---

### Arquitectura y Diseño Técnico

1. **Interfaz Geoespacial e Interactividad**:
   * Utiliza **Mapbox GL** para trazar límites poligonales de los campos, mapeando módulos de sensores físicos sobre terrenos geográficos reales.
   * Incorpora **Chart.js** (`react-chartjs-2`) para generar gráficas interactivas del historial de lecturas de humedad y temperatura.
   * Escucha y actualiza estados de sensores en tiempo real conectándose a **Firebase**.

2. **REST API en Node.js**:
   * El servidor Express gestiona rutas de autorización protegidas por tokens JWT y contraseñas encriptadas con Bcrypt.
   * Persiste la configuración del perfil, parcelas y usuarios en una base de datos MySQL relacional a través del driver `mysql2`.

---

### Stack Tecnológico
* **Backend**: Node.js, Express, MySQL, JWT, Bcrypt.
* **Frontend**: React 19, Vite, TypeScript, Mapbox GL JS, Chart.js, Firebase.

---

### 🚀 Guía de Inicio

#### Requisitos Previos
* Node.js (v18.x o superior)
* Servidor MySQL activo
* Token de acceso de Mapbox
* Credenciales de Firebase

#### Instalación y Configuración

1. **Clonar los repositorios**:
   ```bash
   # Clonar Backend
   git clone https://github.com/DavidSiSx/Back-Gestor-agricola.git backend-agricola
   
   # Clonar Frontend
   git clone https://github.com/DavidSiSx/Front-Gestor-agricola-Terminado.git frontend-agricola
   ```

2. **Ejecutar la API Backend**:
   ```bash
   cd backend-agricola
   npm install
   ```
   Crea un archivo `.env` en la raíz del backend:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=tu_contraseña
   DB_NAME=gestor_agricola
   JWT_SECRET=tu_firma_jwt
   ```
   Inicia el servidor:
   ```bash
   node server.js
   ```

3. **Ejecutar el Cliente Frontend**:
   ```bash
   cd ../frontend-agricola/iot-def
   npm install
   ```
   * Configura tus llaves de Mapbox y SDK de Firebase en las variables de entorno.
   * Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

---

<p align="center">Hecho por David Alejandro Sierra Sosa | Universidad Tecnológica de Cancún</p>
