// /api/user

import express from 'express';
import User from '../models/user.js'; // Asegúrate de tener un modelo de usuario definido
import { methods as authorization } from "../middlewares/authorization.js";

import {
  countUsers,
  getAllUsers,
  getUserEmailById,
  createUser,
  updateUser,
  deleteUser,
  deleteUserWithEntidades,
  cambiarFoto,
  getUsersWithLocations,
  readUser
} from '../controllers/userController.js';

const router = express.Router();

router.get('/count', countUsers);
router.get('/mapa/locations', getUsersWithLocations);
router.get('/', getAllUsers);
router.post('/', authorization.soloAdmin, createUser);
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.get('/email/:id', getUserEmailById);
router.put('/:id', authorization.soloAdmin, updateUser);
router.delete('/:id', authorization.soloAdmin, deleteUser);
router.delete('/:id/with-entidades', authorization.soloAdmin, deleteUserWithEntidades);
router.put('/cambiarFoto/:id', cambiarFoto);


// Ruta para obtener perfil de usuario
router.get('/perfil/:id', readUser);



export default router;