import express from "express"
import { memberCreate, memberDelete, memberList, memberUpdate } from "../controllers/memberControllers.js"
import { isAdmin,isAuth } from "../middleware/authMiddleware.js";
const router = express.Router()

router.post("/member/create",isAuth,isAdmin,memberCreate);
router.get("/member/list",isAuth,isAdmin,memberList);
router.put("/member/update/:id",isAuth,isAdmin,memberUpdate);
router.delete("/member/delete/:id",isAuth,isAdmin,memberDelete);
export default router;