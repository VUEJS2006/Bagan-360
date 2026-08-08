import { thonebaneMobileBooking,thonebaneBookingCreate, thonebaneBookingList,thonebane_bookingApproved ,thonebane_bookingCancelled} from "../controllers/thonebaneBookingController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()
// Admin
router.get('/admin/thonebane/booking/list', authenticated, thonebaneBookingList)
router.put('/admin/thonebane/booking/approved/:id',authenticated,thonebane_bookingApproved)
router.put('/admin/thonebane/booking/cancelled/:id',authenticated,thonebane_bookingCancelled)
// Mobile
router.post('/mobile/thonebane/booking/create', authenticated, thonebaneBookingCreate);
router.get('/mobile/thonebane/booking/list', authenticated, thonebaneMobileBooking)
export default router;  