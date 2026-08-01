import db from "../config/db.js"
import { asyncHandel } from "./asyncMiddleware.js"

export const checkShop = asyncHandel(async (req, res, next) => {
    try {
        const [shop] = await db.query(
            "SELECT status FROM shops WHERE user_id = ?",
            [req.user.id]
        );

        if (shop.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Shop account not found!"
            });
        }
        if (shop[0].status === "pending") {
            return res.status(403).json({
                success: false,
                message: "Your shop account is waiting for admin approval."
            });
        }


        if (shop[0].status === "cancelled") {
            return res.status(403).json({
                success: false,
                message: "Your shop account has been rejected."
            });
        }

        next();
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
})

export const isShop = (req, res, next) => {

    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized!"
        });
    }

    if (req.user.role !== "shop") {
        return res.status(403).json({
            success: false,
            message: "Shop only!"
        });
    }

    next();
};