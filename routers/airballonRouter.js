
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
    "/admin/air_balloon/create",
    authenticated,
    upload.fields([
        { name: "airballon_image1", maxCount: 1 },
        { name: "airballon_image2", maxCount: 1 },
        { name: "airballon_image3", maxCount: 1 }
    ]),
    airballonCreate
);

router.get(
    "/admin/air_balloon/list",
    authenticated,
    airballonList
);

router.put(
    "/admin/air_balloon/update/:id",
    authenticated,
    upload.fields([
        { name: "airballon_image1", maxCount: 1 },
        { name: "airballon_image2", maxCount: 1 },
        { name: "airballon_image3", maxCount: 1 }
    ]),
    airballonUpdate
);

router.delete(
    "/admin/air_balloon/delete/:id",
    authenticated,
    airballonDelete
);

router.get(
    "/air_balloon/shop/list",
    authenticated,
    airballonShopList
);

router.get(
    "/air_balloon/shop/details/:id",
    authenticated,
    airballonShopDetails
);

router.get(
    "/mobile/air_balloon/details/:id",
    authenticated,
    airballonDetails
);

export default router;
