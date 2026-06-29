import { hotelCreate, hotelList, hotelUpdate, hotelDelete } from "../controllers/hotelController.js";
import { upload } from "../middlewares/upload.js";
import express from "express";

const router = express.Router()

router.post('/hotel/create', upload.single("image"), hotelCreate);
router.get('/hotel/list', hotelList);
router.put('/hotel/update/:id', upload.single("image"), hotelUpdate);
router.delete('/hotel/delete/:id', hotelDelete);

export default router;