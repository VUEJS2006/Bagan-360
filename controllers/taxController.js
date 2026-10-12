import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";

export const taxCreate = asyncHandel(async (req, res) => {
    try {

        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        const {
            shop_id,
            amount,
            reason,
            payment
        } = req.body;

        if (
            !shop_id ||
            amount === undefined ||
            amount === null ||
            amount === "" ||
            !payment
        ) {
            return res.status(400).json({
                success: false,
                message: "shop_id, amount and payment are required!"
            });
        }

        // Check shop
        const [shop] = await db.query(
            `
            SELECT id, shop_name
            FROM shops
            WHERE id = ?
            `,
            [shop_id]
        );

        if (shop.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Shop not found!"
            });
        }

        const [result] = await db.query(
            `
            INSERT INTO tax
            (
                shop_id,
                amount,
                payment,
                reason
            )
            VALUES (?, ?, ?, ?)
            `,
            [
                shop_id,
                amount,
                payment,
                reason || null
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Tax created successfully!",
            data: {
                id: result.insertId,
                shop_id: Number(shop_id),
                shop_name: shop[0].shop_name,
                amount: Number(amount),
                payment,
                reason: reason || null
            }
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export const taxList = asyncHandel(async (req, res) => {
    try {

        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        const [data] = await db.query(
            `
            SELECT
                t.id,
                t.shop_id,
                s.shop_name,
                t.amount,
                t.payment,
                t.reason,
                DATE_FORMAT(
                    t.created_at,
                    '%Y-%m-%d %H:%i:%s'
                ) AS created_at

            FROM tax t

            INNER JOIN shops s
                ON t.shop_id = s.id

            ORDER BY t.id DESC
            `
        );

        const formattedData = data.map(item => ({
            ...item,
            amount: Number(item.amount)
        }));

        return res.status(200).json({
            success: true,
            message: "Tax list success!",
            data: formattedData,
            total: formattedData.length
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export const taxUpdate = asyncHandel(async (req, res) => {
    try {

        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        const { id } = req.params;

        const {
            shop_id,
            amount,
            reason,
            payment
        } = req.body;

        // Check tax
        const [tax] = await db.query(
            `
            SELECT id
            FROM tax
            WHERE id = ?
            `,
            [id]
        );

        if (tax.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Tax ID not found!"
            });
        }

        // Check shop
        const [shop] = await db.query(
            `
            SELECT id, shop_name
            FROM shops
            WHERE id = ?
            `,
            [shop_id]
        );

        if (shop.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Shop not found!"
            });
        }

        const [result] = await db.query(
            `
            UPDATE tax
            SET
                shop_id = ?,
                amount = ?,
                reason = ?,
                payment = ?

            WHERE id = ?
            `,
            [
                shop_id,
                amount,
                reason || null,
                payment,
                id
            ]
        );

        return res.status(200).json({
            success: true,
            message: "Tax updated successfully!",
            data: {
                id: Number(id),
                shop_id: Number(shop_id),
                shop_name: shop[0].shop_name,
                amount: Number(amount),
                payment,
                reason: reason || null
            }
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export const taxDelete = asyncHandel(async (req, res) => {
    try {

        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        const { id } = req.params;

        const [tax] = await db.query(
            `
            SELECT id
            FROM tax
            WHERE id = ?
            `,
            [id]
        );

        if (tax.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Tax ID not found!"
            });
        }

        const [result] = await db.query(
            `
            DELETE FROM tax
            WHERE id = ?
            `,
            [id]
        );

        return res.status(200).json({
            success: true,
            message: "Tax deleted successfully!",
            data: result
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export const taxShopList = asyncHandel(async (req, res) => {
    try {

        if (req.user.role !== "shop") {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        const [data] = await db.query(
            `
            SELECT
                t.id,
                t.shop_id,
                s.shop_name,
                t.amount,
                t.payment,
                t.reason,
                DATE_FORMAT(
                    t.created_at,
                    '%Y-%m-%d %H:%i:%s'
                ) AS created_at

            FROM tax t

            INNER JOIN shops s
                ON t.shop_id = s.id

            WHERE s.user_id = ?

            ORDER BY t.id DESC
            `,
            [
                req.user.id
            ]
        );

        const formattedData = data.map(item => ({
            ...item,
            amount: Number(item.amount)
        }));

        return res.status(200).json({
            success: true,
            message: "Tax list success!",
            data: formattedData,
            total: formattedData.length
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});