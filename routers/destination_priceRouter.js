import { destinationPriceCreate, destinationPriceList, destinationPriceUpdate, destinationPriceDelete } from "../controllers/deatination_priceController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()
// Admin
router.post('/admin/destination/price/create', authenticated, isAdmin, destinationPriceCreate);
router.get('/admin/destination/price/list', authenticated, isAdmin, destinationPriceList);
router.put('/admin/destination/price/update/:id', authenticated, isAdmin, destinationPriceUpdate);
router.delete('/admin/destination/price/delete/:id', authenticated, isAdmin, destinationPriceDelete);

// Mobile
router.get('/mobile/destination/price/list', authenticated, destinationPriceCreate);
export default router;