import { restMenuCreate, resMenuList, resMenuUpdate, resMenuDelete, restaurantList, restaurantDetails } from "../controllers/restaurantController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()
// Admin
router.post("/admin/res/menu/create", authenticated, upload.single("image"), restMenuCreate);
router.get('/admin/res/menu/list', authenticated, resMenuList)
router.put('/admin/res/menu/update/:id', authenticated, upload.single("image"), resMenuUpdate)
router.delete('/admin/res/menu/delete/:id', authenticated, resMenuDelete)


router.get('/restaurant/list', authenticated, restaurantList);
router.get('/restaurant/details/:id', authenticated, restaurantDetails);
export default router;