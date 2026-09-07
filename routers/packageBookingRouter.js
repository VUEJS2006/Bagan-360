import { packageBookingCreate, packageBookingList, package_bookingApproved, package_bookingCancelled, packageMobileBooking } from "../controllers/packageBookingController.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()
// Admin
router.get('/admin/package/booking/list', authenticated, isAdmin, packageBookingList)
router.put('/admin/package/booking/approved/:id', authenticated, isAdmin, package_bookingApproved)
router.put('/admin/package/booking/cancelled/:id', authenticated, isAdmin, package_bookingCancelled)
// Mobile
router.post('/mobile/package/booking/create', authenticated, packageBookingCreate);
router.get('/mobile/package/booking/list', authenticated, packageMobileBooking)
export default router;  