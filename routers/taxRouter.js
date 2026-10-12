import { taxCreate, taxList, taxUpdate, taxDelete, taxShopList } from "../controllers/taxController.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";
const router = express.Router()
// Admin
router.post('/admin/tax/create', authenticated, taxCreate);
router.get('/admin/tax/list', authenticated, taxList);
router.put('/admin/tax/update/:id', authenticated, taxUpdate);
router.delete('/admin/tax/delete/:id', authenticated, taxDelete);


// Mobile
router.get('/shop/tax/list', authenticated, taxShopList);
export default router;