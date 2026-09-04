import { packageCreate, packageList, packageUpdate, packageDelete } from "../controllers/packageController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()
// Admin
router.post("/admin/package/create", authenticated, isAdmin, upload.array("images"), packageCreate);
router.get("/admin/package/list", authenticated, isAdmin, packageList);
router.put("/admin/package/update/:id", authenticated, isAdmin, upload.array("images"), packageUpdate);
router.delete("/admin/package/delete/:id", authenticated, isAdmin, packageDelete);

// Mobile
router.get('/mobile/package/list', authenticated, packageList);
// router.get('/mobile/pagoda/details/:id', authenticated, pagodaDetails);

export default router;