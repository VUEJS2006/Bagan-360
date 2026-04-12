import express from "express";
import { register, login, logout, pendingUser, approvedUser, cancelledUser, pendingCheckUser } from "../controllers/authController.js"
import { validateRegister,isAdmin,isAuth } from "../middleware/authmiddlewares.js";
// import { upload } from "../Middleware/upload.js";
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/pending/check/user', isAuth, isAdmin, pendingCheckUser);
router.put('/approved/user/:id', isAuth, isAdmin, approvedUser);
router.put('/cancelled/user/:id', isAuth, isAdmin, cancelledUser);
router.put('/pending/user/:id', isAuth, isAdmin, pendingUser)
export default router;