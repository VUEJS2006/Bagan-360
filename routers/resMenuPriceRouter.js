import { restMenuPriceCreate, resMenuPriceList, resMenuPriceUpdate, resMenuPriceDelete } from "../controllers/resMenuPriceController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()
// Admin
router.get('/admin/res/menu/price/list', authenticated, resMenuPriceList)
router.post('/admin/res/menu/price/create', authenticated, restMenuPriceCreate);
router.put('/admin/res/menu/price/update/:id', authenticated, resMenuPriceUpdate)
router.delete('/admin/res/menu/price/delete/:id', authenticated, resMenuPriceDelete)


export default router;  