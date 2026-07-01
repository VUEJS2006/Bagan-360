import {pagodaCreate} from "../controllers/pagodaController.js";
import { upload } from "../middlewares/upload.js";
import express from "express";

const router = express.Router()
// Admin
router.post('/admin/pagoda/create', upload.single("image"), pagodaCreate);

export default router;