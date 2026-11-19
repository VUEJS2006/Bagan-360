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
            UPDATE e_bike_types
            SET
                name = ?,
                distance = ?
            WHERE id = ?
            `,
            [
                name,
                distance,
                id
            ]
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
});

export const eBikeTypeDelete = asyncHandel(async (req, res) => {
    const connection = await db.getConnection();

    try {
        const { id } = req.params;
        const typeId = Number(id);

        if (!Number.isSafeInteger(typeId) || typeId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid E-Bike Type ID!"
            });
        }

        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        await connection.beginTransaction();

        let shop_id = null;

        // SHOP
        if (req.user.role === "shop") {
            const [shop] = await connection.query(
                `SELECT id FROM shops
                 WHERE user_id = ? AND type = 'e_bike'
                 LIMIT 1`,
                [req.user.id]
            );

            if (shop.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    message: "E-Bike Shop Not Found!"
                });
            }

            shop_id = shop[0].id;
        }

        // CHECK TYPE
        let typeQuery = `
            SELECT id, shop_id
            FROM e_bike_types
            WHERE id = ?
        `;

        const typeParams = [typeId];

        if (req.user.role === "shop") {
            typeQuery += ` AND shop_id = ?`;
            typeParams.push(shop_id);
        }

        typeQuery += ` FOR UPDATE`;

        const [type] = await connection.query(
            typeQuery,
            typeParams
        );

        if (type.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: "E-Bike Type Not Found!"
            });
        }

        // DELETE RELATED E-BIKES FIRST
        let deleteBikeQuery = `
            DELETE FROM e_bikes
            WHERE type_id = ?
        `;

        const deleteBikeParams = [typeId];

        if (req.user.role === "shop") {
            deleteBikeQuery += ` AND shop_id = ?`;
            deleteBikeParams.push(shop_id);
        }

        const [deletedBikes] = await connection.query(
            deleteBikeQuery,
            deleteBikeParams
        );

        // DELETE TYPE
        let deleteTypeQuery = `
            DELETE FROM e_bike_types
            WHERE id = ?
        `;

        const deleteTypeParams = [typeId];

        if (req.user.role === "shop") {
            deleteTypeQuery += ` AND shop_id = ?`;
            deleteTypeParams.push(shop_id);
        }

        const [deletedType] = await connection.query(
            deleteTypeQuery,
            deleteTypeParams
        );

        if (deletedType.affectedRows === 0) {
            throw new Error("E-Bike Type Delete Failed!");
        }

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: "E-Bike Type Delete Success!",
            data: {
                deleted_type_id: typeId,
                deleted_ebike_count: deletedBikes.affectedRows
            }
        });

    } catch (error) {
        await connection.rollback();

        return res.status(500).json({
            success: false,
            message: error.message
        });

    } finally {
        connection.release();
    }
});

