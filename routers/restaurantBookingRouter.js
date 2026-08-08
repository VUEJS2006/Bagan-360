import { restaurantMobileBooking, restaurantBookingCreate, restaurant_bookingApproved, restaurant_bookingCancelled, restaurantBookingList } from "../controllers/restaurantBookingController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()
// Admin
router.get('/admin/restaurant/booking/list', authenticated, restaurantBookingList)
router.put('/admin/restaurant/booking/approved/:id', authenticated, restaurant_bookingApproved)
router.put('/admin/restaurant/booking/cancelled/:id', authenticated, restaurant_bookingCancelled)
// Mobile
router.post('/mobile/restaurant/booking/create', authenticated, restaurantBookingCreate);
router.get('/mobile/restaurant/booking/list', authenticated, restaurantMobileBooking)
export default router;  