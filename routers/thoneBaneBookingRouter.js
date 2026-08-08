import { thonebaneBookingCreate, thonebaneBookingList } from "../controllers/thonebaneBookingController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()
// Admin
router.get('/admin/thonebane/booking/list', authenticated, thonebaneBookingList)


// Mobile
router.post('/mobile/thonebane/booking/create', authenticated, thonebaneBookingCreate);
export default router;  