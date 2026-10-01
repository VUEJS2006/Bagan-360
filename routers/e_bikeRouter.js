import { eBikeDetails,eBikeShopDetail, eBikeCreate, eBikeList, eBikeUpdate, eBikeDelete, eBikeShopList } from "../controllers/e_bikeController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()
// Admin
router.post('/admin/e-bike/create', authenticated, upload.single("image"), eBikeCreate);
router.get('/admin/e-bike/list', authenticated, eBikeList);
router.put('/admin/e-bike/update/:id', authenticated, upload.single("image"), eBikeUpdate);
router.delete('/admin/e-bike/delete/:id', authenticated, eBikeDelete);

// Mobile
router.get('/e-bike/shop/list', authenticated, eBikeShopList);
router.get('/e-bike/shop/details/:id', authenticated, eBikeShopDetail);
router.get('/mobile/e-bike/details/:id', authenticated, eBikeDetails);
export default router;