import { percentageCreate, percentageList } from "../controllers/percentageController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()
// Admin
router.post("/admin/percentage/create", authenticated, percentageCreate);
router.get("/admin/percentage/list", authenticated, percentageList);


export default router;