import { hotelBookingCreate,hotelBookingList,hotel_bookingApproved,hotel_bookingCancelled,hotelMobileBooking } from "../controllers/hotelBookingController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()
// Admin
router.get('/admin/hotel/booking/list', authenticated, hotelBookingList)
router.put('/admin/hotel/booking/approved/:id', authenticated, hotel_bookingApproved)
router.put('/admin/hotel/booking/cancelled/:id', authenticated, hotel_bookingCancelled)
// Mobile
router.post('/mobile/hotel/booking/create', authenticated, hotelBookingCreate);
router.get('/mobile/hotel/booking/list', authenticated, hotelMobileBooking)
export default router;  