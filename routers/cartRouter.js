import { cartCreate, updateCart, deleteCart,cartList } from "../controllers/cartController.js";
import { upload } from "../middlewares/upload.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()

router.get('/mobile/cart/list', authenticated, cartList);
router.post('/mobile/cart/create', authenticated, cartCreate);
router.put('/mobile/cart/update/:id', authenticated, updateCart);
router.delete('/mobile/cart/delete:id', authenticated, deleteCart)
export default router;