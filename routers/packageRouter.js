import { packageCreate } from "../controllers/packageController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()
// Admin
router.post("/admin/package/create", authenticated, isAdmin, upload.array("images"), packageCreate);


// Mobile
// router.get('/mobile/pagoda/list', authenticated, pagodaList);
// router.get('/mobile/pagoda/details/:id', authenticated, pagodaDetails);
export default router;