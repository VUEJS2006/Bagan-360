import { hotelCreate, hotelList, hotelUpdate, hotelDelete } from "../controllers/hotelController.js";
import { upload } from "../middlewares/upload.js";
import express from "express";

const router = express.Router()

router.post('/hotel/create', upload.array("images", 10), hotelCreate);
router.get('/hotel/list', hotelList);
router.put('/hotel/update/:id', upload.array("images", 10), hotelUpdate);
router.delete('/hotel/delete/:id', hotelDelete);

export default router;