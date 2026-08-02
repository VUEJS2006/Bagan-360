import { shopList, AccountDelete, register, verifyOTP, login, userList, roleUpdate, logout, userProfile, userProfileEdit, userChangePassword, shopRegister, shopVerifyOTP, shopApproved, shopCancel } from "../controllers/authController.js";
import { validateRegister } from "../middlewares/authMiddleware.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";
import { upload } from "../middlewares/upload.js";

const router = express.Router()


// Mobile 
router.post('/register', validateRegister, register);
router.get('/user/profile', authenticated, userProfile);
router.put('/user/profile/edit', authenticated, upload.single("image"), userProfileEdit)
router.put('/user/change/password', authenticated, userChangePassword)
router.post('/verify/otp', verifyOTP)
router.delete('/user/account/delete', authenticated, AccountDelete);

// Shop 
router.post('/shop/register', validateRegister, shopRegister);
router.post('/shop/verify/otp', shopVerifyOTP);
router.put('/shop/account/approved/:id', authenticated, isAdmin, shopApproved);
router.put('/shop/account/cancelled/:id', authenticated, isAdmin, shopCancel)
router.get('/shop/list', authenticated, isAdmin, shopList)

// Mobile + Admin
router.post('/login', validateRegister, login)
router.post('/logout', logout)



// Admin
router.get('/user/list', authenticated, userList);
router.put('/role/update/:id', authenticated, isAdmin, roleUpdate)



export default router;