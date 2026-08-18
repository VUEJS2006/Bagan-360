import { eBikeTypeCreate, eBikeTypeList, eBikeTypeUpdate, eBikeTypeDelete } from "../controllers/e_bike_typeController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()
// Admin
router.post('/admin/e-bike/type/create', authenticated, eBikeTypeCreate);
router.get('/admin/e-bike/type/list', authenticated, eBikeTypeList);
router.put('/admin/e-bike/type/update/:id', authenticated, eBikeTypeUpdate);
router.delete('/admin/e-bike/type/delete/:id', authenticated, eBikeTypeDelete);

// Mobile
router.get('/mobile/e-bike/type/list', authenticated, eBikeTypeList);
export default router;