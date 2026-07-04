import { destinationCreate, destinationList, destinationUpdate, destinationDelete, destinationDetails } from "../controllers/destinationController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()
// Admin
router.post('/admin/destination/create', authenticated, isAdmin, upload.single("image"), destinationCreate);
router.get('/admin/destination/list', authenticated, isAdmin, destinationList);
router.put('/admin/destination/update/:id', authenticated, isAdmin, upload.single("image"), destinationUpdate);
router.delete('/admin/destination/delete/:id', authenticated, isAdmin, destinationDelete);

// Mobile
router.get('/mobile/destination/list', authenticated, destinationList);
router.get('/mobile/destination/details/:id', authenticated, destinationDetails)
export default router;