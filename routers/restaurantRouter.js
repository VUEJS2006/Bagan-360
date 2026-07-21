import { restaurantCreate, restaurantList } from "../controllers/restaurantController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()
// Admin
router.post("/admin/restaurant/create", authenticated, isAdmin, upload.single("image"), restaurantCreate);
router.get('/admin/restaurant/list', authenticated, isAdmin, restaurantList)


// Mobile
router.get('/mobile/restaurant/list', authenticated, restaurantList);
export default router;