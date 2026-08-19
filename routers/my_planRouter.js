import { planCreate, planList } from "../controllers/my_planController.js";
import { authenticated, isAdmin } from "../middlewares/authenticatedMiddleware.js";
import express from "express";

const router = express.Router()
// Admin
router.post('/mobile/my-plan/create', authenticated, planCreate);
router.get('/mobile/my-plan/list', authenticated, planList);
export default router;