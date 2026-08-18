import { eBikePriceCreate,eBikePriceList,eBikePriceUpdate,eBikePriceDelete } from "../controllers/e_bike_priceController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()
// Admin
router.post('/admin/e-bike/price/create', authenticated, eBikePriceCreate);
router.get('/admin/e-bike/price/list', authenticated, eBikePriceList);
router.put('/admin/e-bike/price/update/:id', authenticated, eBikePriceUpdate);
router.delete('/admin/e-bike/price/delete/:id', authenticated, eBikePriceDelete);

// Mobile
router.get('/mobile/e-bike/price/list', authenticated, eBikePriceList);
export default router;