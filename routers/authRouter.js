import {register,verifyOTP } from "../controllers/authController.js";
import { upload } from "../middlewares/upload.js";
import express from "express";

const router = express.Router()

router.post('/register',register);
router.post('/verify/otp',verifyOTP)

export default router;