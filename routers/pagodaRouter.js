import { pagodaCreate, pagodaList, pagodaUpdate, pagodaDelete, pagodaDetails } from "../controllers/pagodaController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()
// Admin
router.post("/admin/pagoda/create",authenticated,isAdmin,upload.array("images", 3),pagodaCreate);
router.get('/admin/pagoda/list', authenticated, isAdmin, pagodaList)
router.put('/admin/pagoda/update/:id', authenticated, isAdmin, upload.single("image"), pagodaUpdate);
router.delete('/admin/pagoda/delete/:id', authenticated, isAdmin, pagodaDelete);

// Mobile
router.get('/mobile/pagoda/list', authenticated, pagodaList);
router.get('/mobile/pagoda/details/:id', authenticated, pagodaDetails);
export default router;