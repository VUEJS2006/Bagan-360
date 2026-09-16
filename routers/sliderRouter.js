import { sliderCreate, sliderUpdate, sliderDelete, sliderList, sliderMobileList, sliderActivate } from "../controllers/sliderCotroller.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";
import { isShop, checkShop } from "../middlewares/shopMiddleware.js";
const router = express.Router()
// Admin
router.post('/admin/slider/create', authenticated, upload.single("image"), sliderCreate);
router.get('/admin/slider/list', authenticated, sliderList);
router.put('/admin/slider/update/:id', authenticated, upload.single("image"), sliderUpdate);
router.put('/admin/slider/status/:id', authenticated, sliderActivate);
router.delete('/admin/slider/delete/:id', authenticated, sliderDelete);


// Mobile
router.get('/mobile/slider/list', authenticated, sliderMobileList);
export default router;