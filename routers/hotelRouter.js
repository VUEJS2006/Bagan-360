import {
    hotelList,
    hotelDelete,
    hotelDetails,
    hotelSearch,
    hotelFilter,
    hotelShopList,
    hotelShopDetails,
} from "../controllers/hotelController.js";
import { hotelCreate, hotelUpdate } from "../controllers/hotelCrudController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router();

// =============================================================
// HOTEL CRUD
// =============================================================

// Create a hotel and its facilities/gallery images in one request.
router.post(
    "/admin/hotel/create",
    authenticated,
    upload.fields([
        { name: "images", maxCount: 10 },
        { name: "hotel_images", maxCount: 10 }
    ]),
    hotelCreate
);

// LIST
router.get("/admin/hotel/list", authenticated, hotelList);

// Update hotel fields and related facilities/gallery images by hotel ID.
router.put(
    "/admin/hotel/update/:id",
    authenticated,
    upload.fields([
        { name: "images", maxCount: 10 },
        { name: "hotel_images", maxCount: 10 }
    ]),
    hotelUpdate
);

// DELETE hotel (cascade facilities + images)
router.delete("/admin/hotel/delete/:id", authenticated, hotelDelete);

// SEARCH / FILTER
router.get("/admin/hotel/search", authenticated, isAdmin, hotelSearch);
router.get("/admin/hotel/filter", authenticated, isAdmin, hotelFilter);

// =============================================================
// MOBILE
// =============================================================
router.get("/hotel/shop/list", authenticated, hotelShopList);
router.get("/hotel/shop/details/:id", authenticated, hotelShopDetails);
router.get("/mobile/hotel/details/:id", authenticated, hotelDetails);

export default router;