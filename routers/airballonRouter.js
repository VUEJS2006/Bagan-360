
import {
    airballonCreate,
    airballonList,
    airballonUpdate,
    airballonDelete,
    airballonShopList,
    airballonShopDetails,
    airballonDetails
} from "../controllers/airballonController.js";

import { upload } from "../middlewares/upload.js";

import { authenticated } from "../middlewares/authenticatedMiddleware.js";

import express from "express";

const router = express.Router();

router.post(
    "/admin/airballon/create",
    authenticated,
    upload.fields([
        { name: "airballon_image1", maxCount: 1 },
        { name: "airballon_image2", maxCount: 1 },
        { name: "airballon_image3", maxCount: 1 }
    ]),
    airballonCreate
);

router.get(
    "/admin/airballon/list",
    authenticated,
    airballonList
);

router.put(
    "/admin/airballon/update/:id",
    authenticated,
    upload.fields([
        { name: "airballon_image1", maxCount: 1 },
        { name: "airballon_image2", maxCount: 1 },
        { name: "airballon_image3", maxCount: 1 }
    ]),
    airballonUpdate
);

router.delete(
    "/admin/airballon/delete/:id",
    authenticated,
    airballonDelete
);

router.get(
    "/airballon/shop/list",
    authenticated,
    airballonShopList
);

router.get(
    "/airballon/shop/details/:id",
    authenticated,
    airballonShopDetails
);

router.get(
    "/mobile/airballon/details/:id",
    authenticated,
    airballonDetails
);

export default router;
