import { hotelCreate, hotelList, hotelUpdate, hotelDelete } from "../controllers/hotelController.js";
import { upload } from "../middlewares/upload.js";
import express from "express";

const router = express.Router()
// Admin
router.post('/admin/hotel/create', upload.single("image"), hotelCreate);
router.get('/admin/hotel/list', hotelList);
router.put('/admin/hotel/update/:id', upload.single("image"), hotelUpdate);
router.delete('/admin/hotel/delete/:id', hotelDelete);
// Mobile
router.get('/mobile/hotel/list', hotelList);

export default router;