// Módulos externos
import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import path from 'path';
import cors from 'cors';
import http from 'http';
import { initSocketIO } from './config/socketUtils.js';

import { Server } from 'socket.io';
import { fileURLToPath } from 'url';

// Configuración inicial
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base de datos y modelos
import sequelize from './config/database.js';
import './models/associations.js';

// Middleware y rutas
import { methods as authentication } from './controllers/authentication.controller.js';
import { methods as authorization } from './middlewares/authorization.js';
import routes from './routes/index.js';

// Swagger
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger/swaggerConfig.js';

// Configurar Express
const app = express();
app.use(cors({ origin: 'http://127.0.0.1:5500', credentials: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(cookieParser());

// --- WebSocket para notificaciones en tiempo real ---
// Crear servidor HTTP desde Express
const server = http.createServer(app);
// Crear instancia de Socket.IO vinculada al servidor HTTP
const io = new Server(server, {
  cors: { origin: '*' } // Para desarrollo, ajusta en producción
});


// Inicializa lógica del socket
initSocketIO(io);

// Configuración de almacenamiento con multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'app/public/logos'),
  filename: (req, file, cb) => {
    const empresaNombre = req.body.numIdentificacion;
    const extension = path.extname(file.originalname);
    cb(null, empresaNombre + extension);
  }
});
const upload = multer({ storage });

// API: rutas agrupadas
app.use('/api', routes);

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Auth endpoints
app.post('/api/login', authentication.login);
app.post('/api/register', authentication.register);
app.post('/api/recuperarPass', authentication.recuperarPassword);

// Subida de archivos
app.post('/upload', upload.single('logo'), (req, res) => {
  console.log(`Empresa: ${req.body.nombre}, Archivo: ${req.file.filename}`);
  res.send('Logo subido con éxito.');
});

// Rutas HTML públicas
app.get('/', authorization.soloPublico, (req, res) => res.sendFile(path.join(__dirname, 'pages/home.html')));
app.get('/register', authorization.soloPublico, (req, res) => res.sendFile(path.join(__dirname, 'pages/register.html')));
app.get('/reestablecerpass', authorization.soloPublico, (req, res) => res.sendFile(path.join(__dirname, 'pages/restablecer.html')));

// Rutas HTML para usuarios
app.get('/helice', authorization.soloUser, (req, res) => res.sendFile(path.join(__dirname, 'pages/User/helice.html')));
app.get('/innovacion', authorization.soloUser, (req, res) => res.sendFile(path.join(__dirname, 'pages/User/innovacion.html')));
app.get('/eventos', authorization.soloUser, (req, res) => res.sendFile(path.join(__dirname, 'pages/User/eventos.html')));
app.get('/convocatorias', authorization.soloUser, (req, res) => res.sendFile(path.join(__dirname, 'pages/User/convocatorias.html')));
app.get('/construccion', authorization.soloUser, (req, res) => res.sendFile(path.join(__dirname, 'pages/construccion.html')));
app.get('/conocimiento', authorization.soloUser, (req, res) => res.sendFile(path.join(__dirname, 'pages/User/conocimiento.html')));
app.get('/mapa-usuarios', authorization.soloUser, (req, res) => res.sendFile(path.join(__dirname, 'pages/User/mapa-usuarios.html')));
app.get('/proyectos', authorization.soloUser, (req, res) => res.sendFile(path.join(__dirname, 'pages/User/proyectos.html')));
app.get('/postulaciones', authorization.soloUser, (req, res) => res.sendFile(path.join(__dirname, 'pages/User/postulaciones.html')));
app.get('/perfil', authorization.soloUser, (req, res) => res.sendFile(path.join(__dirname, 'pages/User/perfil.html')));


app.get('/mapa-publico', (req, res) => res.sendFile(path.join(__dirname, 'pages/User/mapa-usuarios.html')));

// Rutas HTML para admins
app.get('/dashboard', authorization.soloAdmin, (req, res) => res.sendFile(path.join(__dirname, 'pages/admin/dashboard.html')));
app.get('/entidades', authorization.soloAdmin, (req, res) => res.sendFile(path.join(__dirname, 'pages/admin/entidades.html')));
app.get('/usuarios', authorization.soloAdmin, (req, res) => res.sendFile(path.join(__dirname, 'pages/admin/usuarios.html')));
app.get('/creareto', authorization.soloAdmin, (req, res) => res.sendFile(path.join(__dirname, 'pages/admin/crearReto.html')));
app.get('/retos', authorization.soloAdmin, (req, res) => res.sendFile(path.join(__dirname, 'pages/admin/retos.html')));
app.get('/muro', authorization.soloAdmin, (req, res) => res.sendFile(path.join(__dirname, 'pages/admin/muro.html')));
app.get('/conocimientoDashboard', authorization.soloAdmin, (req, res) => res.sendFile(path.join(__dirname, 'pages/admin/conocimientoDashboard.html')));
app.get('/cursoDashboard', authorization.soloAdmin, (req, res) => res.sendFile(path.join(__dirname, 'pages/admin/cursoDashboard.html')));
app.get('/eventosDashboard', authorization.soloAdmin, (req, res) => res.sendFile(path.join(__dirname, 'pages/admin/eventosDashboard.html')));

// Inicializar servidor con sequelize y luego escuchar con 'server'
sequelize.sync()  // Usar { force: true } para reiniciar tablas, { alter: true } para actualizar sin perder datos
  .then(() => {
    console.log('Base de datos sincronizada');
    server.listen(process.env.PORT, () => {
      console.log(`Servidor corriendo en el puerto ${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.error('Error al sincronizar la base de datos:', error);
  });
