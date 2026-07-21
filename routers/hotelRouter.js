import { hotelSearch, hotelFilter, hotelCreate, hotelList, hotelUpdate, hotelDelete, hotelDetails } from "../controllers/hotelController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()
// Admin
router.post('/admin/hotel/create', authenticated, isAdmin, upload.single("image"), hotelCreate);
router.get('/admin/hotel/list', authenticated, isAdmin, hotelList);
router.put('/admin/hotel/update/:id', authenticated, isAdmin, upload.single("image"), hotelUpdate);
router.delete('/admin/hotel/delete/:id', authenticated, isAdmin, hotelDelete);
router.get('/admin/hotel/search', authenticated, isAdmin, hotelSearch);
router.get('/admin/hotel/filter', authenticated, isAdmin, hotelFilter);

// Mobile
router.get('/mobile/hotel/list', authenticated, hotelList);
router.get('/mobile/hotel/details/:id', authenticated, hotelDetails)
export default router;