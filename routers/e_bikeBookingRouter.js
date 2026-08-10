import { e_bikeBookingApproved, e_bikeBookingCancelled, e_bikeBookingCreate, e_bikeBookingList, e_bikeMobileBooking } from "../controllers/e_bikeBookingController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()
// Admin
router.get('/admin/e-bike/booking/list', authenticated, e_bikeBookingList)
router.put('/admin/e-bike/booking/approved/:id', authenticated, e_bikeBookingApproved)
router.put('/admin/e-bike/booking/cancelled/:id', authenticated, e_bikeBookingCancelled)
// Mobile
router.post('/mobile/e-bike/booking/create', authenticated, e_bikeBookingCreate);
router.get('/mobile/e-bike/booking/list', authenticated, e_bikeMobileBooking)
export default router;  