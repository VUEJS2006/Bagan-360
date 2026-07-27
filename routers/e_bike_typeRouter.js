import { eBikeTypeCreate, eBikeTypeList, eBikeTypeUpdate, eBikeTypeDelete } from "../controllers/e_bike_typeController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()
// Admin
router.post('/admin/e-bike/type/create', authenticated, isAdmin, eBikeTypeCreate);
router.get('/admin/e-bike/type/list', authenticated, isAdmin, eBikeTypeList);
router.put('/admin/e-bike/type/update/:id', authenticated, isAdmin, eBikeTypeUpdate);
router.delete('/admin/e-bike/type/delete/:id', authenticated, isAdmin, eBikeTypeDelete);

// Mobile
router.get('/mobile/e-bike/type/list', authenticated, eBikeTypeList);
export default router;