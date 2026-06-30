import {register,verifyOTP,login } from "../controllers/authController.js";
import { upload } from "../middlewares/upload.js";
import { validateRegister } from "../middlewares/authMiddleware.js";
import express from "express";

const router = express.Router()

router.post('/register',validateRegister,register);
router.post('/verify/otp',verifyOTP)
router.post('/login',validateRegister,login)
export default router;