import { thoneBaneCategoryCreate,thoneBaneCategoryList,thoneBaneCategoryUpdate,thoneBaneCategoryDelete } from "../controllers/thonebane_categoryController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()
// Admin
router.post('/admin/thonebane/category/create', authenticated, isAdmin, thoneBaneCategoryCreate);
router.get('/admin/thonebane/category/list', authenticated, isAdmin, thoneBaneCategoryList);
router.put('/admin/thonebane/category/update/:id', authenticated, isAdmin, thoneBaneCategoryUpdate);
router.delete('/admin/thonebane/category/delete/:id', authenticated, isAdmin, thoneBaneCategoryDelete);

// Mobile
router.get('/mobile/thonebane/category/list', authenticated, thoneBaneCategoryList);
export default router;  