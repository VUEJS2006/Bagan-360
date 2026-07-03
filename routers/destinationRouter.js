import {destinationCreate,destinationList,destinationUpdate,destinationDelete,destinationDetails } from "../controllers/destinationController.js";
import { upload } from "../middlewares/upload.js";
import express from "express";

const router = express.Router()
// Admin
router.post('/admin/destination/create', upload.single("image"), destinationCreate);
router.get('/admin/destination/list', destinationList);
router.put('/admin/destination/update/:id', upload.single("image"), destinationUpdate);
router.delete('/admin/destination/delete/:id', destinationDelete);

// Mobile
router.get('/mobile/destination/list', destinationList);
router.get('/mobile/destination/details/:id',destinationDetails)
export default router;