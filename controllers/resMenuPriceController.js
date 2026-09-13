import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";

export const restMenuPriceCreate = asyncHandel(async (req, res) => {
    try {

        let { menu_id, size, price } = req.body;

        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }
        if (!menu_id || !size || !price) {
            return res.status(400).json({
                success: false,
                message: "All fields are required!"
            });
        }
        let shop_id = null
        if (req.user.role === "shop") {

            const [shop] = await db.query(
                `
                SELECT
                    id,
                    type
                FROM shops
                WHERE user_id = ?
                `,
                [req.user.id]
            );

            if (shop.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Shop not found!"
                });
            }
            if (shop[0].type !== "restaurant") {
                return res.status(400).json({
                    success: false,
                    message: "This shop is not a restaurant!"
                });
            }
            shop_id = shop[0].id
        }
        let menuQuery = `
            SELECT 
            m.id,
            m.shop_id,
            s.type
            FROM res_menu m 
            INNER JOIN shops s
            ON m.shop_id = s.id
            WHERE m.id = ?
            AND s.type =  'restaurant'
        `
        let menuParams = [menu_id]
        if (req.user.role === "shop") {
            menuQuery += `
                AND m.shop_id = ?
            `;
            menuParams.push(shop_id);
        }
        const [menu] = await db.query(
            menuQuery,
            menuParams
        );

        if (menu.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Menu not found!"
            });
        }
        const [data] = await db.query(
            `
            INSERT INTO menu_price
            (
                menu_id,
                size,
                price
            )
            VALUES (?, ?, ?)
            `,
            [
                menu_id,
                size,
                price
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Menu Price Create Success",
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

export const resMenuPriceList = asyncHandel(async (req, res) => {
    try {

        const { menu_id } = req.params;

        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        if (!menu_id) {
            return res.status(400).json({
                success: false,
                message: "Menu ID is required!"
            });
        }

        let shop_id = null;

        if (req.user.role === "shop") {

            const [shops] = await db.query(
                `
                SELECT 
                    id,
                    type
                FROM shops
                WHERE user_id = ?
                `,
                [req.user.id]
            );

            if (shops.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Shop not found!"
                });
            }

            if (shops[0].type !== "restaurant") {
                return res.status(400).json({
                    success: false,
                    message: "This shop is not a restaurant!"
                });
            }

            shop_id = shops[0].id;
        }

        let query = `
            SELECT 
                mp.id,
                mp.menu_id,
                mp.size,
                mp.price,
                s.shop_name,
                m.name AS menu_name,
                m.shop_id,
                DATE_FORMAT(mp.created_at, '%d-%m-%Y') AS created_at

            FROM menu_price mp

            INNER JOIN res_menu m 
                ON mp.menu_id = m.id

            INNER JOIN shops s
                ON m.shop_id = s.id

            WHERE mp.menu_id = ?
            AND s.type = 'restaurant'
        `;

        let params = [menu_id];

        if (req.user.role === "shop") {

            query += `
                AND m.shop_id = ?
            `;

            params.push(shop_id);
        }

        query += `
            ORDER BY mp.id DESC
        `;

        const [data] = await db.query(
            query,
            params
        );

        return res.status(200).json({
            success: true,
            message: "Menu Price List Success",
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

export const resMenuPriceUpdate = asyncHandel(async (req, res) => {
    try {
        const { id } = req.params;
        let { size, price } = req.body;

        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Menu Price ID is required!"
            });
        }
        let shop_id = null;
        if (req.user.role === "shop") {

            const [shop] = await db.query(
                `
                SELECT
                    id,
                    type
                FROM shops
                WHERE user_id = ?
                `,
                [req.user.id]
            );

            if (shop.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Shop not found!"
                });
            }

            if (shop[0].type !== "restaurant") {
                return res.status(400).json({
                    success: false,
                    message: "This shop is not a restaurant!"
                });
            }

            shop_id = shop[0].id;
        }
        let query = `
         SELECT 
         mp.id,
         mp.menu_id,
         mp.size,
         mp.price,
         m.name AS menu_name,
         m.shop_id,
         s.type

         FROM menu_price mp

         INNER JOIN res_menu m
         ON mp.menu_id = m.id

        INNER JOIN shops s
        ON m.shop_id = s.id

        WHERE mp.id = ?
        AND s.type = 'restaurant'
        `
        let params = [id];
        if (req.user.role === "shop") {
            query += `
                AND m.shop_id = ?
            `;

            params.push(shop_id);
        }

        const [menuPrice] = await db.query(
            query,
            params
        );

        if (menuPrice.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Menu Price not found!"
            });
        }
        const [data] = await db.query(`
            UPDATE menu_price SET
            size = ?,
            price = ?
            WHERE id = ?
            `, [size, price, id])
        return res.status(200).json({
            success: true,
            message: "Menu Price Update Success",
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

export const resMenuPriceDelete = asyncHandel(async (req, res) => {
    try {
        const { id } = req.params;
        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Menu Price ID is required!"
            });
        }
        let shop_id = null
        if (req.user.role === "shop") {
            const [shop] = await db.query("SELECT id,type FROM shops WHERE user_id = ?", [req.user.id]);
            if (shop.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Shop not found!"
                });
            }

            if (shop[0].type !== "restaurant") {
                return res.status(400).json({
                    success: false,
                    message: "This shop is not a restaurant!"
                });
            }
            shop_id = shop[0].id
        }
        let query = `
        SELECT
         mp.id,
         mp.menu_id,
         mp.size,
         mp.price,
         m.name AS menu_name,
         m.shop_id,
         s.type

         FROM menu_price mp
         INNER JOIN res_menu m
         ON mp.menu_id = m.id

         INNER JOIN shops s
         ON m.shop_id = s.id

         WHERE m.id = ?
         AND s.type = 'restaurant'
        `;
        let params = [id];
        if (req.user.role === "shop") {
            query += `
                AND m.shop_id = ?
            `;
            params.push(shop_id);
        }

        const [menuPrice] = await db.query(query, params)
        if (menuPrice.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Menu Price not found!"
            });
        }
        const [data] = await db.query(
            `
            DELETE FROM menu_price
            WHERE id = ?
            `,
            [id]
        );

        return res.status(200).json({
            success: true,
            message: "Menu Price Delete Success"
        });


    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
})