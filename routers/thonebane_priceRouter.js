import { thonebanePriceCreate,thonebanePriceList,thonebanePriceUpdate,thonebanePriceDelete } from "../controllers/thonebane_priceController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()
// Admin
router.post('/admin/thonebane/price/create', authenticated, thonebanePriceCreate);
router.get('/admin/thonebane/price/list', authenticated, thonebanePriceList);
router.put('/admin/thonebane/price/update/:id', authenticated, thonebanePriceUpdate);
router.delete('/admin/thonebane/price/delete/:id', authenticated, thonebanePriceDelete);

// Mobile
router.get('/mobile/thonebane/price/list', authenticated, thonebanePriceList);
export default router;
