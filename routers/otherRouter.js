
import {
    otherCreate,
    otherList,
    otherDelete,
    otherUpdate,
    otherDetails,
    otherShopList,
    otherShopDetails
} from "../controllers/otherController.js";

import { upload } from "../middlewares/upload.js";

import { authenticated } from "../middlewares/authenticatedMiddleware.js";

import express from "express";

const router = express.Router();

router.post(
    "/admin/other/create",
    authenticated,
    upload.fields([
        { name: "other_image1", maxCount: 1 },
        { name: "other_image2", maxCount: 1 },
        { name: "other_image3", maxCount: 1 }
    ]),
    otherCreate
);

router.get(
    "/admin/other/list",
    authenticated,
    otherList
);

router.put(
    "/admin/other/update/:id",
    authenticated,
    upload.fields([
        { name: "other_image1", maxCount: 1 },
        { name: "other_image2", maxCount: 1 },
        { name: "other_image3", maxCount: 1 }
    ]),
    otherUpdate
);

router.delete(
    "/admin/other/delete/:id",
    authenticated,
    otherDelete
);

router.get(
    "/other/shop/list",
    authenticated,
    otherShopList
);

router.get(
    "/other/shop/details/:id",
    authenticated,
    otherShopDetails
);

router.get(
    "/mobile/other/details/:id",
    authenticated,
    otherDetails
);

export default router;
