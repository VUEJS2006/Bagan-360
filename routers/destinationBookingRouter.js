import { destinationBookingCreate, destinationBookingList, destinationBookingApproved, destinationBookingCancelled, destinationMobileBooking } from "../controllers/destinationBookingController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()
// Admin
router.get('/admin/destination/booking/list', authenticated, isAdmin, destinationBookingList)
router.put('/admin/destination/booking/approved/:id', authenticated, isAdmin, destinationBookingApproved)
router.put('/admin/destination/booking/cancelled/:id', authenticated, isAdmin, destinationBookingCancelled)
// Mobile
router.post('/mobile/destination/booking/create', authenticated, destinationBookingCreate);
router.get('/mobile/destination/booking/list', authenticated, destinationMobileBooking)
export default router;  