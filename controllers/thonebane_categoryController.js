import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";


export const thoneBaneCategoryCreate = asyncHandel(async (req, res) => {
    try {

        const {
            shop_id: bodyShopId,
            name
        } = req.body;

        let shop_id;

     
        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

       
        if (req.user.role === "shop") {

            const [shops] = await db.query(
                "SELECT id FROM shops WHERE user_id = ?",
                [req.user.id]
            );

            if (shops.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Shop not found!"
                });
            }

            shop_id = shops[0].id;
        }

        
        if (req.user.role === "admin") {

            if (!bodyShopId) {
                return res.status(400).json({
                    success: false,
                    message: "Shop is required!"
                });
            }

            shop_id = bodyShopId;
        }

    
        const [shop] = await db.query(
            "SELECT * FROM shops WHERE id = ?",
            [shop_id]
        );

        if (shop.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Shop not found!"
            });
        }

      
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Name is required!"
            });
        }

      
        const [data] = await db.query(
            `
            INSERT INTO thonebane_categories
            (
                shop_id,
                name
            )
            VALUES (?, ?)
            `,
            [
                shop_id,
                name
            ]
        );

        return res.status(201).json({
            success: true,
            message: "ThoneBane Category Create Success",
            data
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export const thoneBaneCategoryList = asyncHandel(async (req, res) => {
    try {

        const { shop_id } = req.query;

        let query = `
            SELECT *
            FROM thonebane_categories
        `;

        let params = [];

       
        if (req.user.role === "shop") {

            const [shops] = await db.query(
                "SELECT id FROM shops WHERE user_id = ?",
                [req.user.id]
            );

            if (shops.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Shop not found!"
                });
            }

            query += ` WHERE shop_id = ?`;
            params.push(shops[0].id);
        }

        
        if (req.user.role === "admin" && shop_id) {
            query += ` WHERE shop_id = ?`;
            params.push(shop_id);
        }

        query += ` ORDER BY id DESC`;

        const [data] = await db.query(query, params);

        return res.status(200).json({
            success: true,
            message: "ThoneBane Category List Success",
            count: data.length,
            data
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export const thoneBaneCategoryUpdate = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;
        const { name } = req.body;

        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Name is required!"
            });
        }

        const [existThoneBane] = await db.query(
            `
            SELECT *
            FROM thonebane_categories
            WHERE id = ?
            `,
            [id]
        );

        if (existThoneBane.length === 0) {
            return res.status(404).json({
                success: false,
                message: "ThoneBane Category not found!"
            });
        }

      
        if (req.user.role === "shop") {

            const [shops] = await db.query(
                "SELECT id FROM shops WHERE user_id = ?",
                [req.user.id]
            );

            if (shops.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Shop not found!"
                });
            }

            if (existThoneBane[0].shop_id !== shops[0].id) {
                return res.status(403).json({
                    success: false,
                    message: "You cannot update this category!"
                });
            }
        }

        const [data] = await db.query(
            `
            UPDATE thonebane_categories
            SET name = ?
            WHERE id = ?
            `,
            [name, id]
        );

        return res.status(200).json({
            success: true,
            message: "ThoneBane Category Update Success",
            data
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export const thoneBaneCategoryDelete = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;

        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        const [thonebane] = await db.query(
            `
            SELECT *
            FROM thonebane_categories
            WHERE id = ?
            `,
            [id]
        );

        if (thonebane.length === 0) {
            return res.status(404).json({
                success: false,
                message: "ThoneBane Category not found!"
            });
        }

    
        if (req.user.role === "shop") {

            const [shops] = await db.query(
                "SELECT id FROM shops WHERE user_id = ?",
                [req.user.id]
            );

            if (shops.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Shop not found!"
                });
            }

            if (thonebane[0].shop_id !== shops[0].id) {
                return res.status(403).json({
                    success: false,
                    message: "You cannot delete this category!"
                });
            }
        }

        const [data] = await db.query(
            `
            DELETE FROM thonebane_categories
            WHERE id = ?
            `,
            [id]
        );

        return res.status(200).json({
            success: true,
            message: "ThoneBane Category Delete Success",
            data
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});