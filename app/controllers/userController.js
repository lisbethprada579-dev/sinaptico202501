import User from '../models/user.js';
import Entidad from '../models/entidad.js';
import bcrypt from 'bcryptjs';

// Crear nuevo usuario
export const createUser = async (req, res) => {
  try {
    const { name, email, telefono, password, rol } = req.body;

    // Verificar si el email ya existe
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear el usuario
    const newUser = await User.create({
      name,
      email,
      telefono,
      password: hashedPassword,
      rol,
      aceptoPoliticas: true,
      estado: '1' // Usuario activo por defecto
    });

    // Remover la contraseña de la respuesta
    const { password: _, ...userResponse } = newUser.toJSON();

    res.status(201).json({
      message: 'Usuario creado correctamente',
      user: userResponse
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error al crear el usuario' });
  }
};

// Obtener cantidad de usuarios
export const countUsers = async (req, res) => {
  try {
    const userCount = await User.count();
    res.status(200).json({ count: userCount });
  } catch (error) {
    console.error('Error al contar usuarios:', error);
    res.status(500).json({ error: 'Error al obtener la cantidad de usuarios' });
  }
};

// Obtener todos los usuarios
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    res.status(200).json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error al obtener los usuarios' });
  }
};

// Obtener solo el correo por ID
export const getUserEmailById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['email']
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error al obtener correo del usuario:', error);
    res.status(500).json({ error: 'Error al obtener el correo del usuario' });
  }
};

// Actualizar usuario
export const updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const { name, email, telefono, rol, estado } = req.body;
    await user.update({ name, email, telefono, rol, estado });

    res.status(200).json({ message: 'Usuario actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error al actualizar el usuario' });
  }
};

// Eliminar usuario (solo si no tiene entidades)
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const entidadesAsociadas = await Entidad.findAll({ where: { UserAdminId: user.id } });

    if (entidadesAsociadas.length > 0) {
      return res.status(400).json({
        error: 'Este usuario tiene entidades asociadas. ¿Deseas eliminar también las entidades?',
        decision: 'Confirmar eliminación de usuario y entidades asociadas'
      });
    }

    await user.destroy();
    res.status(200).json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error al eliminar el usuario' });
  }
};

// Eliminar usuario + entidades asociadas
export const deleteUserWithEntidades = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    await Entidad.destroy({ where: { UserAdminId: user.id } });
    await user.destroy();

    res.status(200).json({ message: 'Usuario y entidades eliminados correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario y entidades:', error);
    res.status(500).json({ error: 'Error al eliminar el usuario y las entidades' });
  }
};
import multer from 'multer';

import upload from '../config/multerConfig.js'; // Importa la configuración de multer
import fs from 'fs/promises';
import path from 'path';

export const cambiarFoto = async (req, res) => {
  upload.single('fotoPerfil')(req, res, async (err) => {
    if (err) {
      return res.status(500).json({ error: 'Error al subir la imagen' });
    }

    try {
      const user = await User.findByPk(req.params.id);
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

      // Eliminar la foto anterior si existe
      if (user.fotoPerfil) {
        const oldPath = path.join(process.cwd(), 'app/public/photo', user.fotoPerfil);
        try {
          await fs.unlink(oldPath);
          console.log(`Foto anterior eliminada: ${oldPath}`);
        } catch (unlinkErr) {
          console.warn(`No se pudo eliminar la foto anterior (puede que no exista): ${unlinkErr.message}`);
        }
      }

      const { filename } = req.file;
      await user.update({ fotoPerfil: filename });

      res.status(200).json({ message: 'Foto de perfil actualizada correctamente' });
    } catch (error) {
      console.error('Error al actualizar foto de perfil:', error);
      res.status(500).json({ error: 'Error al actualizar la foto de perfil' });
    }
  });
};

// Obtener usuarios con ubicaciones para el mapa
export const getUsersWithLocations = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'rol', 'fotoPerfil', 'ciudad', 'latitud', 'longitud', 'estado', 'updatedAt'],
      include: [{
        model: Entidad,
        as: 'entidadAdministrada',
        attributes: ['razonSocial', 'tipoActor'],
        required: false
      }],
      where: {
        estado: 1 // Solo usuarios activos
      }
    });

    // Formatear datos para el mapa
    const usersForMap = users.map(user => {
      let userType = 'user';
      let company = 'Sin empresa';
      
      if (user.rol === 'admin') {
        userType = 'admin';
      }
      
      if (user.entidadAdministrada) {
        userType = 'empresa';
        company = user.entidadAdministrada.razonSocial;
      }

      // Generar coordenadas aleatorias si no existen (para demostración)
      let lat = user.latitud;
      let lng = user.longitud;
      
      if (!lat || !lng) {
        // Coordenadas aleatorias en Colombia
        const colombianCities = [
          { name: 'Bogotá', lat: 4.7110, lng: -74.0721 },
          { name: 'Medellín', lat: 6.2442, lng: -75.5812 },
          { name: 'Cali', lat: 3.4516, lng: -76.5320 },
          { name: 'Barranquilla', lat: 10.9685, lng: -74.7813 },
          { name: 'Cartagena', lat: 10.3910, lng: -75.4794 },
          { name: 'Bucaramanga', lat: 7.1193, lng: -73.1227 },
          { name: 'Pereira', lat: 4.8087, lng: -75.6906 },
          { name: 'Manizales', lat: 5.0703, lng: -75.5138 }
        ];
        
        const randomCity = colombianCities[Math.floor(Math.random() * colombianCities.length)];
        lat = randomCity.lat + (Math.random() - 0.5) * 0.1; // Pequeña variación
        lng = randomCity.lng + (Math.random() - 0.5) * 0.1;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        type: userType,
        company: company,
        city: user.ciudad || 'Colombia',
        lat: lat,
        lng: lng,
        status: Math.random() > 0.3 ? 'online' : 'offline', // Simulado
        lastSeen: getRandomLastSeen(),
        role: user.rol || 'Usuario',
        projects: Math.floor(Math.random() * 20) + 1, // Simulado
        avatar: user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'
      };
    });

    res.status(200).json(usersForMap);
  } catch (error) {
    console.error('Error al obtener usuarios para el mapa:', error);
    res.status(500).json({ error: 'Error al obtener usuarios para el mapa' });
  }
};

// Función auxiliar para generar tiempo aleatorio de última conexión
function getRandomLastSeen() {
  const options = [
    'Hace 5 minutos',
    'Hace 15 minutos',
    'Hace 30 minutos',
    'Hace 1 hora',
    'Hace 2 horas',
    'Hace 4 horas',
    'Ayer',
    'Hace 2 días'
  ];
  return options[Math.floor(Math.random() * options.length)];
}


// Obtener solo el correo por ID
export const readUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'name', 'email', 'telefono'],
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error al obtener correo del usuario:', error);
    res.status(500).json({ error: 'Error al obtener el correo del usuario' });
  }
};
