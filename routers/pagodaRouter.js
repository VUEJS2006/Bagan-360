import {pagodaCreate,pagodaList,pagodaUpdate} from "../controllers/pagodaController.js";
import { upload } from "../middlewares/upload.js";
import express from "express";

const router = express.Router()
// Admin
router.post('/admin/pagoda/create', upload.single("image"), pagodaCreate);
router.get('/admin/pagoda/list',pagodaList)
router.put('/admin/pagoda/update/:id', upload.single("image"),pagodaUpdate);
export default router;