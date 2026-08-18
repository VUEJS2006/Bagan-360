import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";


export const eBikeTypeCreate = asyncHandel(async (req, res) => {
    try {

        let { shop_id: bodyShopId, name, distance } = req.body;

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


        if (!name || !distance) {
            return res.status(400).json({
                success: false,
                message: "All filed are required!"
            });
        }

        const [existingType] = await db.query(
            `SELECT * FROM e_bike_types WHERE name = ?`,
            [name]
        );


        const [data] = await db.query(
            `
            INSERT INTO e_bike_types (shop_id,name,distance) VALUES(?,?,?)
            `,
            [shop_id, name, distance]
        );
        return res.status(201).json({
            success: true,
            message: "E-bike Type Create Success",
            data
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
})

export const eBikeTypeList = asyncHandel(async (req, res) => {
    try {

        let query = "";
        let params = [];

        if (req.user.role === "admin") {

            query = `
                SELECT
                    id,
                    shop_id,
                    name,
                    distance
                FROM e_bike_types
                ORDER BY id DESC
            `;
        }

        else if (req.user.role === "shop") {

            const [shop] = await db.query(
                "SELECT id FROM shops WHERE user_id = ?",
                [req.user.id]
            );

            if (shop.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Shop not found!"
                });
            }

            query = `
                SELECT
                    id,
                    shop_id,
                    name,
                    distance
                FROM e_bike_types
                WHERE shop_id = ?
                ORDER BY id DESC
            `;

            params.push(shop[0].id);
        }

        else {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        const [data] = await db.query(
            query,
            params
        );

        return res.status(200).json({
            success: true,
            message: "E-bike Type List Success",
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

export const eBikeTypeUpdate = asyncHandel(async (req, res) => {
    try {
        const { id } = req.params;
        const { name, distance } = req.body || {};
        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        let shop_id = null;
        if (req.user.role === "shop") {

            const [shop] = await db.query(
                "SELECT id FROM shops WHERE user_id = ?",
                [req.user.id]
            );

            if (shop.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Shop not found!"
                });
            }

            shop_id = shop[0].id;
        }

        let typeQuery = `
            SELECT *
            FROM e_bike_types
            WHERE id = ?
        `;

        let typeParams = [id];
        if (req.user.role === "shop") {

            typeQuery += `
                AND shop_id = ?
            `;

            bikeParams.push(shop_id);
        }
        const [type] = await db.query(
            typeQuery,
            typeParams
        );
        if (type.length === 0) {
            return res.status(404).json({
                success: false,
                message: "E-bike Type not found!"
            });
        }


        const [data] = await db.query(
            `
            UPDATE e_bike_types SET name = ?,distance = ? WHERE id = ?
            `,
            [name, distance, id]
        );

        return res.status(200).json({
            success: true,
            message: "E-bike Type Update Success",
            data
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
})

export const eBikeTypeDelete = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;
        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }


        let shop_id = null;

        if (req.user.role === "shop") {

            const [shop] = await db.query(
                "SELECT id FROM shops WHERE user_id = ?",
                [req.user.id]
            );

            if (shop.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Shop not found!"
                });
            }

            shop_id = shop[0].id;
        }

        let typeQuery = `
            SELECT *
            FROM e_bike_types
            WHERE id = ?
        `;

        let typeParams = [id];
        if (req.user.role === "shop") {
            typeQuery += `
                AND shop_id = ?
            `;
            typeParams.push(shop_id);
        }


        const [type] = await db.query(
            typeQuery,
            typeParams
        );

        if (type.length === 0) {
            return res.status(404).json({
                success: false,
                message: "E-bike Type not found!"
            });
        }




        const [data] = await db.query(
            `
            DELETE FROM e_bike_types
            WHERE id = ?
            `,
            [id]
        );

        return res.status(200).json({
            success: true,
            message: "E-bike Type Delete Success",
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

