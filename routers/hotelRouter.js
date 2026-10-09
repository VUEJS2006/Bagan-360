import {
    hotelDetails,
    hotelSearch,
    hotelFilter,
    hotelCreate,
    hotelList,
    hotelShopList,
    hotelUpdate,
    hotelDelete,
    hotelShopDetails
} from "../controllers/hotelController.js";

import { upload } from "../middlewares/upload.js";

import {
    authenticated,
    isAdmin
} from "../middlewares/authenticatedMiddleware.js";

import express from "express";

const router = express.Router();

// =========================
// ADMIN
// =========================

router.post(
    "/admin/hotel/create",
    authenticated,
    upload.fields([
        { name: "image", maxCount: 1 },
        { name: "hotel_image1", maxCount: 1 },
        { name: "hotel_image2", maxCount: 1 },
        { name: "hotel_image3", maxCount: 1 }
    ]),
    hotelCreate
);

router.get(
    "/admin/hotel/list",
    authenticated,
    hotelList
);

router.put(
    "/admin/hotel/update/:id",
    authenticated,
    upload.fields([
        { name: "image", maxCount: 1 },
        { name: "hotel_image1", maxCount: 1 },
        { name: "hotel_image2", maxCount: 1 },
        { name: "hotel_image3", maxCount: 1 }
    ]),
    hotelUpdate
);

router.delete(
    "/admin/hotel/delete/:id",
    authenticated,
    hotelDelete
);

router.get(
    "/admin/hotel/search",
    authenticated,
    isAdmin,
    hotelSearch
);

router.get(
    "/admin/hotel/filter",
    authenticated,
    isAdmin,
    hotelFilter
);

// =========================
// MOBILE
// =========================

router.get(
    "/hotel/shop/list",
    authenticated,
    hotelShopList
);

router.get(
    "/hotel/shop/details/:id",
    authenticated,
    hotelShopDetails
);

router.get(
    "/mobile/hotel/details/:id",
    authenticated,
    hotelDetails
);

export default router;
