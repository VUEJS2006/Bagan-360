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

        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        if (req.user.role === "shop") {

            const [shops] = await db.query(
                `
                SELECT id, type
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

        if (!name || !description) {
            return res.status(400).json({
                success: false,
                message: "Name and description are required!"
            });
        }

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

        for (const item of prices) {

            if (!item.size || item.price === undefined || item.price === null) {
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

        let imagePath = null;

        if (req.file) {

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
            menu_id: menu_id,
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


        else if (req.user.role === "shop") {

            const [shop] = await db.query(
                `
                SELECT id,type
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
                    s.image,
                    s.status,
                    s.type
                FROM shops s
                WHERE s.id = ?
                AND s.type = 'restaurant'
                ORDER BY s.id DESC
            `;

            params = [shop[0].id];
        }

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

export const resMenuList = asyncHandel(async (req, res) => {
    try {

        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        let query = "";
        let params = [];

        if (req.user.role === "admin") {

            query = `
                SELECT
                    m.id,
                    m.shop_id,
                    s.shop_name,
                    s.type AS shop_type,
                    m.name,
                    m.image,
                    m.description,
                    DATE_FORMAT(m.created_at, '%d-%m-%Y') AS created_at,
                    DATE_FORMAT(m.updated_at, '%d-%m-%Y') AS updated_at
                FROM res_menu m
                INNER JOIN shops s
                    ON m.shop_id = s.id
                WHERE s.type = 'restaurant'
                ORDER BY m.id DESC
            `;

        } else {

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

            query = `
                SELECT
                    m.id,
                    m.shop_id,
                    s.shop_name,
                    s.type AS shop_type,
                    m.name,
                    m.image,
                    m.description,
                    DATE_FORMAT(m.created_at, '%d-%m-%Y') AS created_at,
                    DATE_FORMAT(m.updated_at, '%d-%m-%Y') AS updated_at
                FROM res_menu m
                INNER JOIN shops s
                    ON m.shop_id = s.id
                WHERE m.shop_id = ?
                AND s.type = 'restaurant'
                ORDER BY m.id DESC
            `;

            params = [shop[0].id];
        }

        const [data] = await db.query(query, params);


        // Price List ထည့်
        for (const menu of data) {

            const [prices] = await db.query(
                `
                SELECT
                    id,
                    menu_id,
                    size,
                    price,
                    DATE_FORMAT(created_at, '%d-%m-%Y') AS created_at
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
            message: "Restaurant Menu Data Success",
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


        // prices JSON string ဖြစ်ရင် parse
        if (typeof prices === "string") {
            prices = JSON.parse(prices);
        }

        if (!Array.isArray(prices)) {
            return res.status(400).json({
                success: false,
                message: "Prices must be an array!"
            });
        }


        // Menu check
        let menuQuery = `
            SELECT
                m.*,
                s.type AS shop_type
            FROM res_menu m
            INNER JOIN shops s
                ON m.shop_id = s.id
            WHERE m.id = ?
            AND s.type = 'restaurant'
        `;

        let menuParams = [id];

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


        // Image
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


        // Menu Update
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


        // Price Update
        for (const item of prices) {

            if (!item.id || !item.size || item.price === undefined) {
                return res.status(400).json({
                    success: false,
                    message: "Price id, size and price are required!"
                });
            }

            await db.query(
                `
                UPDATE menu_price mp
                INNER JOIN res_menu m
                    ON mp.menu_id = m.id
                SET
                    mp.size = ?,
                    mp.price = ?
                WHERE mp.id = ?
                AND mp.menu_id = ?
                `,
                [
                    item.size,
                    item.price,
                    item.id,
                    id
                ]
            );
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


        // Menu Check
        let menuQuery = `
            SELECT
                m.*,
                s.type AS shop_type
            FROM res_menu m
            INNER JOIN shops s
                ON m.shop_id = s.id
            WHERE m.id = ?
            AND s.type = 'restaurant'
        `;

        let menuParams = [id];

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


        // Delete Image
        if (menu[0].image) {

            const oldPath = path.join(
                process.cwd(),
                menu[0].image
            );

            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }


        // Delete Prices
        await db.query(
            `
            DELETE FROM menu_price
            WHERE menu_id = ?
            `,
            [id]
        );


        // Delete Menu
        await db.query(
            `
            DELETE FROM res_menu
            WHERE id = ?
            `,
            [id]
        );


        return res.status(200).json({
            success: true,
            message: "Restaurant Menu and Prices deleted successfully"
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
                s.image,
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
        const [menu] = await db.query("SELECT * FROM res_menu WHERE id = ?", [id]);
        if (menu.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Res Menu not found!"
            });
        }
        const [data] = await db.query(
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
            WHERE m.id = ?
            `, [id]
        )
        const result = {
            id: data[0].id,
            shop_id: data[0].shop_id,
            name: data[0].name,
            image: data[0].image,
            description: data[0].description,
            created_at: data[0].created_at,

            prices: []
        };
        data.forEach((item) => {
            if (item.price_id) {
                result.prices.push({
                    id: item.price_id,
                    size: item.size,
                    price: item.price
                });
            }
        })
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
