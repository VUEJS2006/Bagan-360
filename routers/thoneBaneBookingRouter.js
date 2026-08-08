import { thonebaneBookingCreate, thonebaneBookingList,thonebane_bookingApproved } from "../controllers/thonebaneBookingController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()
// Admin
router.get('/admin/thonebane/booking/list', authenticated, thonebaneBookingList)
router.put('/admin/thonebane/booking/approved',authenticated,thonebane_bookingApproved)

// Mobile
router.post('/mobile/thonebane/booking/create', authenticated, thonebaneBookingCreate);
export default router;  