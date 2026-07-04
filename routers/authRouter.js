import { register, verifyOTP, login, userList, roleUpdate } from "../controllers/authController.js";
import { upload } from "../middlewares/upload.js";
import { validateRegister } from "../middlewares/authMiddleware.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()

router.post('/register', validateRegister, register);
router.get('/user/list', authenticated, userList);
router.put('/role/update/:id', authenticated, isAdmin, roleUpdate)
router.post('/verify/otp', verifyOTP)
router.post('/login', validateRegister, login)
export default router;