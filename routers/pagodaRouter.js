import {pagodaCreate,pagodaList} from "../controllers/pagodaController.js";
import { upload } from "../middlewares/upload.js";
import express from "express";

const router = express.Router()
// Admin
router.post('/admin/pagoda/create', upload.single("image"), pagodaCreate);
router.get('/pagoda/list',pagodaList)
export default router;