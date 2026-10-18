import db from "./config/db.js";
import { asyncHandel } from "./middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";

export const thonebanePriceCreate = asyncHandel(async (req, res) => {
    try {

        let { shop_id: bodyShopId, op_id, thonebane_id, price_type, start_time, end_time, price } = req.body;
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

        if (!thonebane_id || !price_type || !price) {
            return res.status(400).json({
                success: false,
                message: "All fields are required!"
            });
        }

        const [thonebane] = await db.query("SELECT id FROM thonebanes WHERE id = ?", [thonebane_id]);
        if (thonebane.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Thonebane not found!"
            });
        }

        const [data] = await db.query("INSERT INTO thonebane_prices (shop_id,thonebane_id,price_type,start_time,end_time,price) VALUES (?,?, ?, ?, ?, ?)", [shop_id, thonebane_id, price_type, start_time, end_time, price]);
        return res.status(201).json({
            success: true,
            message: "Thonebane price created successfully!",
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

export const thonebanePriceList = asyncHandel(async (req, res) => {
    try {

        let query = "";
        let params = [];

        if (req.user.role === "admin") {

            query = `
                SELECT
                    thonebane_prices.id,
                    thonebane_prices.shop_id,
                    thonebane_prices.thonebane_id,
                    thonebane_prices.price_type,
                    thonebane_prices.start_time,
                    thonebane_prices.end_time,
                    thonebane_prices.price,

                    thonebanes.name AS thonebane_name

                FROM thonebane_prices

                LEFT JOIN thonebanes
                    ON thonebane_prices.thonebane_id = thonebanes.id

                ORDER BY thonebane_prices.created_at DESC
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
                    thonebane_prices.id,
                    thonebane_prices.shop_id,
                    thonebane_prices.thonebane_id,
                    thonebane_prices.price_type,
                    thonebane_prices.start_time,
                    thonebane_prices.end_time,
                    thonebane_prices.price,

                    thonebanes.name AS thonebane_name

                FROM thonebane_prices

                LEFT JOIN thonebanes
                    ON thonebane_prices.thonebane_id = thonebanes.id

                WHERE thonebane_prices.shop_id = ?

                ORDER BY thonebane_prices.created_at DESC
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
            message: "Thonebane Price List Success",
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

export const thonebanePriceUpdate = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;

        const {
            thonebane_id,
            price_type,
            start_time,
            end_time,
            price
        } = req.body;

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


        // Thonebane price ရှိ/မရှိစစ်မယ်
        let priceQuery = `
            SELECT *
            FROM thonebane_prices
            WHERE id = ?
        `;

        let priceParams = [id];


        // Shop ဖြစ်ရင် ကိုယ့် shop ရဲ့ price ပဲ update လုပ်ခွင့်ရှိမယ်
        if (req.user.role === "shop") {

            priceQuery += `
                AND shop_id = ?
            `;

            priceParams.push(shop_id);
        }


        // price မသုံးဘဲ priceData လို့သုံးမယ်
        // req.body က price နဲ့ variable name မတူအောင်
        const [priceData] = await db.query(
            priceQuery,
            priceParams
        );


        if (priceData.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Thonebane Price not found!"
            });
        }


        // Update လုပ်မယ့် Thonebane ရှိ/မရှိစစ်မယ်
        const [thonebane] = await db.query(
            "SELECT id FROM thonebanes WHERE id = ?",
            [thonebane_id]
        );

        if (thonebane.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Thonebane not found!"
            });
        }


        const [data] = await db.query(
            `
            UPDATE thonebane_prices
            SET
                thonebane_id = ?,
                price_type = ?,
                start_time = ?,
                end_time = ?,
                price = ?
            WHERE id = ?
            `,
            [
                thonebane_id,
                price_type,
                start_time,
                end_time,
                price,
                id
            ]
        );


        return res.status(200).json({
            success: true,
            message: "Thonebane price Update successfully!",
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

export const thonebanePriceDelete = asyncHandel(async (req, res) => {
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

        let priceQuery = `
            SELECT *
            FROM thonebane_prices
            WHERE id = ?
        `;

        let priceParams = [id];
        if (req.user.role === "shop") {
            priceQuery += `
                AND shop_id = ?
            `;
            priceParams.push(shop_id);
        }


        const [price] = await db.query(
            priceQuery,
            priceParams
        );

        if (price.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Thonebane Price not found!"
            });
        }


        const [data] = await db.query(
            `
            DELETE FROM thonebane_prices
            WHERE id = ?
            `,
            [id]
        );

        return res.status(200).json({
            success: true,
            message: "Thonebane Price Delete Success",
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
