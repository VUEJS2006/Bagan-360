import { thonebaneCreate, thonebaneList, thonebaneUpdate, thonebaneDelete, thonebaneMobileList, thonebaneDetails } from "../controllers/thoneBaneController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";
import { isShop, checkShop } from "../middlewares/shopMiddleware.js";
const router = express.Router()
// Admin
router.post('/admin/thonebane/create', authenticated, upload.single("image"), thonebaneCreate);
router.get('/admin/thonebane/list', authenticated, thonebaneList);
router.put('/admin/thonebane/update/:id', authenticated, upload.single("image"), thonebaneUpdate);
router.delete('/admin/thonebane/delete/:id', authenticated, thonebaneDelete);

// Mobile
router.get('/mobile/thonebane/list', authenticated, thonebaneMobileList);
router.get('/mobile/thonebane/details/:id', authenticated, thonebaneDetails)
export default router;