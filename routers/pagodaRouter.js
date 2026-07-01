import {pagodaCreate,pagodaList,pagodaUpdate,pagodaDelete} from "../controllers/pagodaController.js";
import { upload } from "../middlewares/upload.js";
import express from "express";

const router = express.Router()
// Admin
router.post('/admin/pagoda/create', upload.single("image"), pagodaCreate);
router.get('/admin/pagoda/list',pagodaList)
router.put('/admin/pagoda/update/:id', upload.single("image"),pagodaUpdate);
router.delete('/admin/pagoda/delete/:id',pagodaDelete);

// Mobile
router.get('/mobile/pagoda/list',pagodaList);
export default router;