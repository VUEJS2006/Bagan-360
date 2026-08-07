import { thonebaneBookingCreate} from "../controllers/thonebaneBookingController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()
// Admin



// Mobile
router.post('/mobile/thonebane/booking/create', authenticated, thonebaneBookingCreate);
export default router;  