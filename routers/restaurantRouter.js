import { restaurantCreate, restaurantList, restaurantUpdate, restaurantDelete, restaurantDetails } from "../controllers/restaurantController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()
// Admin
router.post("/admin/restaurant/create", authenticated, upload.single("image"), restaurantCreate);
router.get('/admin/restaurant/list', authenticated,restaurantList)
router.put('/admin/restaurant/update/:id', authenticated, upload.single("image"),restaurantUpdate)
router.delete('/admin/restaurant/delete/:id', authenticated, restaurantDelete)
// Mobile
router.get('/mobile/restaurant/list', authenticated, restaurantList);
router.get('/mobile/restaurant/details/:id', authenticated, restaurantDetails);
export default router;