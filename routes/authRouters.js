import express from "express";
import { register, login, logout, pendingUser, approvedUser, cancelledUser, pendingCheckUser, getProfile, updateProfile } from "../controllers/authControllers.js"
import { validateRegister,isAdmin,isAuth } from "../middleware/authMiddleware.js";
const router = express.Router();

router.post('/register',validateRegister,register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/profile/user/:id',isAuth,getProfile);
router.put('/update/profile/',isAuth,updateProfile);
router.get('/pending/check/user', isAuth, isAdmin, pendingCheckUser);
router.put('/approved/user/:id', isAuth, isAdmin, approvedUser);
router.put('/cancelled/user/:id', isAuth, isAdmin, cancelledUser);
router.put('/pending/user/:id', isAuth, isAdmin, pendingUser)
export default router;