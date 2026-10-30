import { air_balloon_bookingApproved, airballon_bookingCancelled, airballoonBookingCreate, airballoonBookingList, airballoonMobileBooking } from "../controllers/airballoonBookingController.js";

import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()
// Admin
router.get('/admin/air_balloon/booking/list', authenticated, airballoonBookingList)
router.put('/admin/air_balloon/booking/approved/:id', authenticated, air_balloon_bookingApproved)
router.put('/admin/air_balloon/booking/cancelled/:id', authenticated, airballon_bookingCancelled)
// Mobile
router.post('/mobile/air_balloon/booking/create', authenticated, airballoonBookingCreate);
router.get('/mobile/air_balloon/booking/list', authenticated, airballoonMobileBooking)
export default router;  