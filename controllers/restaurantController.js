import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";

export const restMenuCreate = asyncHandel(async (req, res) => {
    try {

        let {
            shop_id: bodyShopId,
            name,
            description,
            prices
        } = req.body;

        let shop_id;

        // =========================
        // ROLE CHECK
        // =========================

        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        // =========================
        // SHOP
        // =========================

        if (req.user.role === "shop") {

            const [shop] = await db.query(
                `
                SELECT id, type
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

            // Login ဝင်ထားတဲ့ shop ကိုပဲ သုံးမယ်
            shop_id = shop[0].id;
        }

        // =========================
        // ADMIN
        // =========================

        if (req.user.role === "admin") {

            if (!bodyShopId) {
                return res.status(400).json({
                    success: false,
                    message: "Shop is required!"
                });
            }

            const [shop] = await db.query(
                `
                SELECT id, type
                FROM shops
                WHERE id = ?
                `,
                [bodyShopId]
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

            shop_id = bodyShopId;
        }

        // =========================
        // MENU VALIDATION
        // =========================

        if (!name || !description) {
            return res.status(400).json({
                success: false,
                message: "Name and description are required!"
            });
        }

        // =========================
        // PRICES PARSE
        // =========================

        if (typeof prices === "string") {
            try {
                prices = JSON.parse(prices);
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid prices format!"
                });
            }
        }

        if (!Array.isArray(prices) || prices.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one menu price is required!"
            });
        }

        // =========================
        // PRICE VALIDATION
        // =========================

        for (const item of prices) {

            if (
                !item.size ||
                item.price === undefined ||
                item.price === null
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Each price must have size and price!"
                });
            }

            if (Number(item.price) <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Price must be greater than 0!"
                });
            }
        }

        // =========================
        // IMAGE
        // =========================

        let imagePath = null;

        if (req.file) {

            const uploadFolder = path.join(
                process.cwd(),
                "images",
                "res_menu"
            );

            if (!fs.existsSync(uploadFolder)) {
                fs.mkdirSync(uploadFolder, {
                    recursive: true
                });
            }

            const fileName = `${uuid()}.webp`;

            const savePath = path.join(
                uploadFolder,
                fileName
            );

            await sharp(req.file.buffer)
                .resize({
                    width: 1920,
                    withoutEnlargement: true
                })
                .webp({
                    quality: 90
                })
                .toFile(savePath);

            imagePath = `images/res_menu/${fileName}`;
        }

        // =========================
        // CREATE MENU
        // =========================

        const [menuData] = await db.query(
            `
            INSERT INTO res_menu
            (
                shop_id,
                name,
                image,
                description
            )
            VALUES (?, ?, ?, ?)
            `,
            [
                shop_id,
                name,
                imagePath,
                description
            ]
        );

        const menu_id = menuData.insertId;

        // =========================
        // CREATE PRICES
        // =========================

        for (const item of prices) {

            await db.query(
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
                    item.size,
                    item.price
                ]
            );
        }

        return res.status(201).json({
            success: true,
            message: "Restaurant Menu Create Success",
            menu_id,
            data: {
                shop_id,
                name,
                image: imagePath,
                description,
                prices
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

export const restaurantList = asyncHandel(async (req, res) => {
    try {

        let query = "";
        let params = [];

        // =========================
        // ADMIN
        // =========================

        if (req.user.role === "admin") {

            query = `
                SELECT
                    s.id,
                    s.shop_name,
                    s.shop_address,
                    s.shop_phone,
                    s.image,
                    s.status,
                    s.type
                FROM shops s
                WHERE s.type = 'restaurant'
                ORDER BY s.id DESC
            `;
        }

        // =========================
        // SHOP
        // =========================

        else if (req.user.role === "shop") {

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

            query = `
                SELECT
                    s.id,
                    s.shop_name,
                    s.shop_address,
                    s.shop_phone,
                    s.status,
                    s.type
                FROM shops s
                WHERE s.id = ?
                AND s.type = 'restaurant'
                ORDER BY s.id DESC
            `;

            params = [shop[0].id];
        }

        // =========================
        // USER
        // =========================

        else if (req.user.role === "user") {

            query = `
                SELECT
                    s.id,
                    s.shop_name,
                    s.shop_address,
                    s.shop_phone,
                    s.status,
                    s.type
                FROM shops s
                WHERE s.type = 'restaurant'
                AND s.status = 'approved'
                ORDER BY s.id DESC
            `;
        }

        // =========================
        // OTHER ROLE
        // =========================

        else {

            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        const [data] = await db.query(query, params);

        return res.status(200).json({
            success: true,
            message: "Restaurant Data Success",
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

export const restMenuList = asyncHandel(async (req, res) => {
    try {

        let query = "";
        let params = [];

        // =========================
        // ADMIN
        // =========================

        if (req.user.role === "admin") {

            query = `
                SELECT
                    m.id,
                    m.shop_id,
                    s.shop_name,
                    s.address AS shop_address,
                    s.phone AS shop_phone,
                    m.name,
                    m.image,
                    m.description
                FROM res_menu m
                INNER JOIN shops s
                    ON m.shop_id = s.id
                WHERE s.type = 'restaurant'
                ORDER BY m.id DESC
            `;
        }

        // =========================
        // SHOP
        // =========================

        else if (req.user.role === "shop") {

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

            query = `
                SELECT
                    m.id,
                    m.shop_id,
                    s.shop_name,
                    s.address AS shop_address,
                    s.phone AS shop_phone,
                    m.name,
                    m.image,
                    m.description
                FROM res_menu m
                INNER JOIN shops s
                    ON m.shop_id = s.id
                WHERE m.shop_id = ?
                AND s.type = 'restaurant'
                ORDER BY m.id DESC
            `;

            params = [shop[0].id];
        }

        // =========================
        // USER
        // =========================

        else if (req.user.role === "user") {

            query = `
                SELECT
                    m.id,
                    m.shop_id,
                    s.shop_name,
                    s.address AS shop_address,
                    s.phone AS shop_phone,
                    m.name,
                    m.image,
                    m.description
                FROM res_menu m
                INNER JOIN shops s
                    ON m.shop_id = s.id
                WHERE s.type = 'restaurant'
                AND s.status = 'approved'
                ORDER BY m.id DESC
            `;
        }

        // =========================
        // OTHER ROLE
        // =========================

        else {

            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        const [data] = await db.query(query, params);

        // =========================
        // GET MENU PRICES
        // =========================

        for (const menu of data) {

            const [prices] = await db.query(
                `
                SELECT
                    id,
                    menu_id,
                    size,
                    price
                FROM menu_price
                WHERE menu_id = ?
                ORDER BY id ASC
                `,
                [menu.id]
            );

            menu.prices = prices;
        }

        return res.status(200).json({
            success: true,
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

export const resMenuUpdate = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;

        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        let {
            name,
            description,
            prices
        } = req.body;

        let shop_id = null;

        // =========================
        // SHOP
        // =========================

        if (req.user.role === "shop") {

            const [shop] = await db.query(
                `
                SELECT id, type
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

        // =========================
        // PRICES PARSE
        // =========================

        if (typeof prices === "string") {

            try {
                prices = JSON.parse(prices);
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid prices format!"
                });
            }
        }

        if (
            prices !== undefined &&
            !Array.isArray(prices)
        ) {
            return res.status(400).json({
                success: false,
                message: "Prices must be an array!"
            });
        }

        // =========================
        // MENU CHECK
        // =========================

        let menuQuery = `
            SELECT
                m.id,
                m.shop_id,
                m.name,
                m.image,
                m.description
            FROM res_menu m

            INNER JOIN shops s
                ON m.shop_id = s.id

            WHERE m.id = ?
            AND s.type = 'restaurant'
        `;

        let menuParams = [id];

        // SHOP → သူ့ menu ပဲ
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

        // =========================
        // IMAGE
        // =========================

        let updateImage = menu[0].image;

        if (req.file) {

            if (menu[0].image) {

                const oldPath = path.join(
                    process.cwd(),
                    menu[0].image
                );

                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }

            const uploadFolder = path.join(
                process.cwd(),
                "images",
                "res_menu"
            );

            if (!fs.existsSync(uploadFolder)) {
                fs.mkdirSync(uploadFolder, {
                    recursive: true
                });
            }

            const fileName = `${uuid()}.webp`;

            const savePath = path.join(
                uploadFolder,
                fileName
            );

            await sharp(req.file.buffer)
                .resize({
                    width: 1920,
                    withoutEnlargement: true
                })
                .webp({
                    quality: 90
                })
                .toFile(savePath);

            updateImage = `images/res_menu/${fileName}`;
        }

        // =========================
        // MENU UPDATE
        // =========================

        await db.query(
            `
            UPDATE res_menu
            SET
                name = ?,
                description = ?,
                image = ?
            WHERE id = ?
            `,
            [
                name,
                description,
                updateImage,
                id
            ]
        );

        // =========================
        // PRICE UPDATE
        // =========================

        if (prices !== undefined) {

            const [oldPrices] = await db.query(
                `
                SELECT
                    size,
                    price
                FROM menu_price
                WHERE menu_id = ?
                `,
                [id]
            );

            for (const item of prices) {

                if (!item.size) {
                    return res.status(400).json({
                        success: false,
                        message: "Size is required!"
                    });
                }

                if (
                    item.price === undefined ||
                    item.price === null
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Price is required!"
                    });
                }

                if (Number(item.price) <= 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Price must be greater than 0!"
                    });
                }

                const existingPrice = oldPrices.find(
                    old => old.size === item.size
                );

                if (existingPrice) {

                    await db.query(
                        `
                        UPDATE menu_price
                        SET price = ?
                        WHERE menu_id = ?
                        AND size = ?
                        `,
                        [
                            item.price,
                            id,
                            item.size
                        ]
                    );

                } else {

                    await db.query(
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
                            id,
                            item.size,
                            item.price
                        ]
                    );
                }
            }

            // Request ထဲမပါတဲ့ old size တွေ delete
            const requestSizes = prices.map(
                item => item.size
            );

            for (const oldPrice of oldPrices) {

                if (!requestSizes.includes(oldPrice.size)) {

                    await db.query(
                        `
                        DELETE FROM menu_price
                        WHERE menu_id = ?
                        AND size = ?
                        `,
                        [
                            id,
                            oldPrice.size
                        ]
                    );
                }
            }
        }

        return res.status(200).json({
            success: true,
            message: "Restaurant Menu Update Success"
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export const resMenuDelete = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;

        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        let shop_id = null;

        // =========================
        // SHOP
        // =========================

        if (req.user.role === "shop") {

            const [shop] = await db.query(
                `
                SELECT id, type
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

        // =========================
        // MENU CHECK
        // =========================

        let menuQuery = `
            SELECT
                m.id,
                m.shop_id,
                m.image
            FROM res_menu m

            INNER JOIN shops s
                ON m.shop_id = s.id

            WHERE m.id = ?
            AND s.type = 'restaurant'
        `;

        let menuParams = [id];

        // SHOP → သူ့ menu ပဲ
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

        // =========================
        // DELETE IMAGE
        // =========================

        if (menu[0].image) {

            const imagePath = path.join(
                process.cwd(),
                menu[0].image
            );

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        // =========================
        // DELETE MENU
        // =========================

        await db.query(
            `
            DELETE FROM res_menu
            WHERE id = ?
            `,
            [id]
        );

        return res.status(200).json({
            success: true,
            message: "Restaurant Menu deleted successfully"
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export const restaurantDetails = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;
        const [shop] = await db.query(
            `
            SELECT 
                s.id AS shop_id,
                s.shop_name,
                s.shop_phone,
                s.shop_address,
                s.type,
                s.status
            FROM shops s
            WHERE s.id = ?
            AND s.type = 'restaurant'
            AND s.status = 'approved'
            `,
            [id]
        );

        if (shop.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Restaurant shop not found!"
            });
        }

        const [menuData] = await db.query(
            `
            SELECT 
                m.id,
                m.shop_id,
                m.name,
                m.image,
                m.description,
                DATE_FORMAT(m.created_at, '%d-%m-%Y') AS created_at,

                mp.id AS price_id,
                mp.size,
                mp.price

            FROM res_menu m

            LEFT JOIN menu_price mp
                ON m.id = mp.menu_id

            WHERE m.shop_id = ?

            ORDER BY m.id DESC, mp.id ASC
            `,
            [id]
        );

        const menu = [];

        menuData.forEach((item) => {

            let existingMenu = menu.find(
                (menuItem) => menuItem.id === item.id
            );

            if (!existingMenu) {

                existingMenu = {
                    id: item.id,
                    shop_id: item.shop_id,
                    name: item.name,
                    image: item.image,
                    description: item.description,
                    created_at: item.created_at,
                    prices: []
                };

                menu.push(existingMenu);
            }

            // price ရှိမှထည့်
            if (item.price_id) {
                existingMenu.prices.push({
                    id: item.price_id,
                    size: item.size,
                    price: item.price
                });
            }
        });


        return res.status(200).json({
            success: true,
            data: {
                shop: shop[0],
                menu
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

export const restMenuDeatils = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;

        const [data] = await db.query(
            `
            SELECT
                m.id,
                m.shop_id,
                m.name,
                m.image,
                m.description,

                DATE_FORMAT(
                    m.created_at,
                    '%d-%m-%Y'
                ) AS created_at,

                mp.size,
                mp.price

            FROM res_menu m

            INNER JOIN shops s
                ON m.shop_id = s.id

            LEFT JOIN menu_price mp
                ON m.id = mp.menu_id

            WHERE m.id = ?
            AND s.type = 'restaurant'
            `,
            [id]
        );

        // =========================
        // MENU NOT FOUND
        // =========================

        if (data.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Res Menu not found!"
            });
        }

        // =========================
        // RESULT
        // =========================

        const result = {
            id: data[0].id,
            shop_id: data[0].shop_id,
            name: data[0].name,
            image: data[0].image,
            description: data[0].description,
            created_at: data[0].created_at,

            prices: []
        };

        // =========================
        // PRICES
        // =========================

        data.forEach((item) => {

            if (item.size !== null) {

                result.prices.push({
                    size: item.size,
                    price: item.price
                });

            }

        });

        // =========================
        // RESPONSE
        // =========================

        return res.status(200).json({
            success: true,
            message: "Restaurant Menu Details Success",
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