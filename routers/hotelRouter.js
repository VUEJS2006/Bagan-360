import {hotelCreate, hotelList, hotelMobileList, hotelUpdate, hotelDelete, hotelDetails } from "../controllers/hotelController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";
import { isShop, checkShop } from "../middlewares/shopMiddleware.js";
const router = express.Router()
// Admin
router.post(
    '/admin/hotel/create',
    authenticated,
    upload.fields([
        { name: "image", maxCount: 1 },
        { name: "facility_images", maxCount: 10 }
    ]),
    hotelCreate
);
router.get('/admin/hotel/list', authenticated, hotelList);
router.put(
    '/admin/hotel/update/:id',
    authenticated,
    upload.fields([
        { name: "image", maxCount: 1 },
        { name: "facility_images", maxCount: 10 }
    ]),
    hotelUpdate
);
router.delete('/admin/hotel/delete/:id', authenticated, hotelDelete);


// Mobile
router.get('/mobile/hotel/list', authenticated, hotelMobileList);
router.get('/mobile/hotel/details/:id', authenticated, hotelDetails)
export default router;