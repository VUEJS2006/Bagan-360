import { restaurantCreate, restaurantList, restaurantUpdate, restaurantDelete, restaurantDetails } from "../controllers/restaurantController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()
// Admin
router.post("/admin/restaurant/create", authenticated, isAdmin, upload.single("image"), restaurantCreate);
router.get('/admin/restaurant/list', authenticated, isAdmin, restaurantList)
router.put('/admin/restaurant/update/:id', authenticated, isAdmin, restaurantUpdate)
router.delete('/admin/restaurant/delete/:id', authenticated, isAdmin, restaurantDelete)
// Mobile
router.get('/mobile/restaurant/list', authenticated, restaurantList);
router.get('/mobile/restaurant/details/:id', authenticated, restaurantDetails);
export default router;