import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";



export const thonebaneCreate = asyncHandel(async (req, res) => {
    try {
        const {
            shop_id: bodyShopId,
            capacity,
            features,
            category_id,
            name,
            phone,
            location,
            description,
            status,
            is_active
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

        if (!name || !phone || !location || !status || !category_id) {
            return res.status(400).json({
                success: false,
                message: "All field are required!"
            });
        }

        let active = 1;

        if (is_active !== undefined) {
            if (
                is_active === true ||
                is_active === "true" ||
                is_active === 1 ||
                is_active === "1"
            ) {
                active = 1;
            } else if (
                is_active === false ||
                is_active === "false" ||
                is_active === 0 ||
                is_active === "0"
            ) {
                active = 0;
            } else {
                return res.status(400).json({
                    success: false,
                    message: "is_active must be true/false or 1/0!"
                });
            }
        }

        const uploadFolder = path.join(
            process.cwd(),
            "images",
            "thonebane"
        );

        if (!fs.existsSync(uploadFolder)) {
            fs.mkdirSync(uploadFolder, { recursive: true });
        }

        let imagePath = null;

        if (req.file) {
            const fileName = `${uuid()}.webp`;
            const savePath = path.join(uploadFolder, fileName);

            await sharp(req.file.buffer)
                .resize({
                    width: 1920,
                    withoutEnlargement: true
                })
                .webp({ quality: 90 })
                .toFile(savePath);

            imagePath = `images/thonebane/${fileName}`;
        }

        const [data] = await db.query(
            `
            INSERT INTO thonebanes (
                shop_id,
                capacity,
                category_id,
                features,
                name,
                phone,
                location,
                description,
                status,
                image,
                is_active
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                shop_id,
                capacity,
                category_id,
                features,
                name,
                phone,
                location,
                description,
                status,
                imagePath,
                active
            ]
        );

        return res.status(201).json({
            success: true,
            message: "ThoneBane Create successfully.",
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


export const thonebaneList = asyncHandel(async (req, res) => {
    try {
        let query = "";
        let params = [];
        let shop_id = null;

        if (req.user.role === "admin") {
            query = `
                SELECT
                    t.id,
                    t.shop_id,
                    s.shop_name,
                    t.capacity,
                    t.features,
                    t.category_id,
                    c.name AS category_name,
                    t.name,
                    t.phone,
                    t.location,
                    t.description,
                    t.status,
                    t.is_active,
                    t.image,
                    DATE_FORMAT(
                        t.created_at,
                        '%d-%m-%Y'
                    ) AS created_at
                FROM thonebanes t
                LEFT JOIN thonebane_categories c
                    ON t.category_id = c.id
                LEFT JOIN shops s
                    ON t.shop_id = s.id
                ORDER BY t.id DESC
            `;
        } else if (req.user.role === "shop") {
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

            query = `
                SELECT
                    t.id,
                    t.shop_id,
                    s.shop_name,
                    t.capacity,
                    t.features,
                    t.category_id,
                    c.name AS category_name,
                    t.name,
                    t.phone,
                    t.location,
                    t.description,
                    t.status,
                    t.is_active,
                    t.image,
                    DATE_FORMAT(
                        t.created_at,
                        '%d-%m-%Y'
                    ) AS created_at
                FROM thonebanes t
                LEFT JOIN thonebane_categories c
                    ON t.category_id = c.id
                LEFT JOIN shops s
                    ON t.shop_id = s.id
                WHERE t.shop_id = ?
                ORDER BY t.id DESC
            `;

            params.push(shop_id);
        } else {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        const [data] = await db.query(query, params);

        let priceQuery = `
            SELECT
                id,
                shop_id,
                thonebane_id,
                CASE
                    WHEN price_type = 'full_day'
                        THEN 'Full Day'
                    WHEN price_type = 'half_day_1'
                        THEN 'Half Day 1'
                    WHEN price_type = 'half_day_2'
                        THEN 'Half Day 2'
                    WHEN price_type = 'hourly'
                        THEN 'Hourly'
                    ELSE price_type
                END AS price_type,
                start_time,
                end_time,
                price
            FROM thonebane_prices
        `;

        let priceParams = [];

        if (req.user.role === "shop") {
            priceQuery += ` WHERE shop_id = ?`;
            priceParams.push(shop_id);
        }

        priceQuery += ` ORDER BY created_at ASC`;

        const [prices] = await db.query(
            priceQuery,
            priceParams
        );

        const result = data.map((thonebane) => ({
            ...thonebane,
            prices: prices.filter(
                (price) =>
                    Number(price.thonebane_id) === Number(thonebane.id) &&
                    Number(price.shop_id) === Number(thonebane.shop_id)
            )
        }));

        let categoryQuery = `
            SELECT COUNT(*) AS category_count
            FROM thonebane_categories
        `;

        let categoryParams = [];

        if (req.user.role === "shop") {
            categoryQuery += ` WHERE shop_id = ?`;
            categoryParams.push(shop_id);
        }

        const [categoryCount] = await db.query(
            categoryQuery,
            categoryParams
        );

        let priceCountQuery = `
            SELECT COUNT(*) AS price_count
            FROM thonebane_prices
        `;

        let priceCountParams = [];

        if (req.user.role === "shop") {
            priceCountQuery += ` WHERE shop_id = ?`;
            priceCountParams.push(shop_id);
        }

        const [priceCount] = await db.query(
            priceCountQuery,
            priceCountParams
        );

        return res.status(200).json({
            success: true,
            message: "Thone Bane List Success!",
            count: result.length,
            category_count: categoryCount[0].category_count,
            price_count: priceCount[0].price_count,
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


export const thonebaneUpdate = asyncHandel(async (req, res) => {
    try {
        const { id } = req.params;

        let {
            name,
            category_id,
            capacity,
            features,
            phone,
            location,
            description,
            status,
            is_active
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

        let thoneBaneQuery = `
            SELECT *
            FROM thonebanes
            WHERE id = ?
        `;

        let thoneBaneParams = [id];

        if (req.user.role === "shop") {
            thoneBaneQuery += " AND shop_id = ?";
            thoneBaneParams.push(shop_id);
        }

        const [thonebane] = await db.query(
            thoneBaneQuery,
            thoneBaneParams
        );

        if (thonebane.length === 0) {
            return res.status(404).json({
                success: false,
                message: "ThoneBane not found!"
            });
        }

        const current = thonebane[0];

        name = name ?? current.name;
        category_id = category_id ?? current.category_id;
        capacity = capacity ?? current.capacity;
        features = features ?? current.features;
        phone = phone ?? current.phone;
        location = location ?? current.location;
        description = description ?? current.description;
        status = status ?? current.status;

        let active = current.is_active;

        if (is_active !== undefined) {
            if (
                is_active === true ||
                is_active === "true" ||
                is_active === 1 ||
                is_active === "1"
            ) {
                active = 1;
            } else if (
                is_active === false ||
                is_active === "false" ||
                is_active === 0 ||
                is_active === "0"
            ) {
                active = 0;
            } else {
                return res.status(400).json({
                    success: false,
                    message: "is_active must be true/false or 1/0!"
                });
            }
        }

        let updatedImageString = current.image;

        if (req.file) {
            const uploadFolder = path.join(
                process.cwd(),
                "images",
                "thonebane"
            );

            if (!fs.existsSync(uploadFolder)) {
                fs.mkdirSync(uploadFolder, {
                    recursive: true
                });
            }

            const fileName = `${uuid()}.webp`;
            const savePath = path.join(uploadFolder, fileName);

            await sharp(req.file.buffer)
                .resize({
                    width: 1920,
                    withoutEnlargement: true
                })
                .webp({ quality: 90 })
                .toFile(savePath);

            updatedImageString = `images/thonebane/${fileName}`;

            if (current.image) {
                const oldPath = path.join(
                    process.cwd(),
                    current.image
                );

                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
        }

        const [data] = await db.query(
            `
            UPDATE thonebanes
            SET
                category_id = ?,
                capacity = ?,
                features = ?,
                name = ?,
                phone = ?,
                location = ?,
                description = ?,
                status = ?,
                image = ?,
                is_active = ?
            WHERE id = ?
            `,
            [
                category_id,
                capacity,
                features,
                name,
                phone,
                location,
                description,
                status,
                updatedImageString,
                active,
                id
            ]
        );

        return res.status(200).json({
            success: true,
            message: "ThoneBane Updated Successfully!",
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


export const thonebaneDelete = asyncHandel(async (req, res) => {
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

        let thonebaneQuery = `
            SELECT *
            FROM thonebanes
            WHERE id = ?
        `;

        let thonebaneParams = [id];

        if (req.user.role === "shop") {
            thonebaneQuery += " AND shop_id = ?";
            thonebaneParams.push(shop_id);
        }

        const [thonebane] = await db.query(
            thonebaneQuery,
            thonebaneParams
        );

        if (thonebane.length === 0) {
            return res.status(404).json({
                success: false,
                message: "ThoneBane not found!"
            });
        }

        const item = thonebane[0];

        const [prices] = await db.query(
            `
            SELECT id
            FROM thonebane_prices
            WHERE thonebane_id = ?
                AND shop_id = ?
            `,
            [id, item.shop_id]
        );

        if (prices.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Please delete ThoneBane prices first!"
            });
        }

        const [bookings] = await db.query(
            `
            SELECT id
            FROM thonebane_bookings
            WHERE thonebane_id = ?
            LIMIT 1
            `,
            [id]
        );

        if (bookings.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Cannot delete ThoneBane because bookings exist!"
            });
        }

        await db.query(
            "DELETE FROM thonebanes WHERE id = ?",
            [id]
        );

        if (item.image) {
            const imagePath = path.join(
                process.cwd(),
                item.image
            );

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        return res.status(200).json({
            success: true,
            message: "ThoneBane deleted successfully!"
        });

    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export const thonebaneShopList = asyncHandel(async (req, res) => {
    try {

        let query = "";
        let params = [];

        if (req.user.role === "admin") {
            query = `
                SELECT
                    s.id,
                    s.shop_name,
                    s.shop_address,
                    s.location,
                    s.shop_phone,
                    s.status,
                    s.is_active,
                    s.type,
                    s.user_id,
                    u.image
                FROM shops s
                JOIN users u ON s.user_id = u.id
                WHERE s.type = 'thonebane'
                ORDER BY s.id DESC
            `
        }
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
                    s.location,
                    s.shop_phone,
                    s.status,
                    s.is_active,
                    s.type,
                    s.user_id,
                    u.image
                FROM shops s
                JOIN users u ON s.user_id = u.id
                WHERE s.type = 'thonebane'
                ORDER BY s.id DESC
            `
            params = [shop[0].id];
        }
        else if (req.user.role === "user") {

            query = `
                SELECT
                    s.id,
                    s.shop_name,
                    s.shop_address,
                    s.shop_phone,
                    s.location,
                    s.status,
                    s.is_active,
                    s.type,
                    u.image,
                    s.user_id

                FROM shops s
                JOIN users u ON s.user_id = u.id
                WHERE s.type = 'thonebane'
                AND s.status = 'approved'
                AND s.is_active = true
                ORDER BY s.id DESC
            `;
        }
        else {

            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        const [data] = await db.query(query, params)
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

export const thonebaneDetails = asyncHandel(async (req, res) => {
    try {
        const { id } = req.params;

        const [data] = await db.query(
            `
            SELECT
                t.id,
                t.shop_id,
                s.shop_name,
                t.capacity,
                t.features,
                t.category_id,
                c.name AS category_name,
                t.name,
                t.phone,
                t.location,
                t.description,
                t.status,
                t.is_active,
                t.image,
                DATE_FORMAT(t.created_at, '%d-%m-%Y') AS created_at
            FROM thonebanes t
            LEFT JOIN thonebane_categories c
                ON t.category_id = c.id
            INNER JOIN shops s
                ON t.shop_id = s.id
            WHERE t.id = ?
                AND t.is_active = 1
                AND s.is_active = 1
                AND s.status = 'approved'
                AND s.type = 'thonebane'
            `,
            [id]
        );

        if (data.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Thonebane not found!"
            });
        }

        const [prices] = await db.query(
            `
            SELECT
                id,
                shop_id,
                thonebane_id,
                CASE
                    WHEN price_type = 'full_day'
                        THEN 'Full Day'
                    WHEN price_type = 'half_day_1'
                        THEN 'Half Day 1'
                    WHEN price_type = 'half_day_2'
                        THEN 'Half Day 2'
                    WHEN price_type = 'hourly'
                        THEN 'Hourly'
                    ELSE price_type
                END AS price_type,
                start_time,
                end_time,
                price
            FROM thonebane_prices
            WHERE thonebane_id = ?
                AND shop_id = ?
            ORDER BY created_at ASC
            `,
            [data[0].id, data[0].shop_id]
        );

        const result = {
            ...data[0],
            prices
        };

        return res.status(200).json({
            success: true,
            message: "ThoneBane Details Success!",
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


export const thonebaneShopDetails = asyncHandel(async (req, res) => {
    try {
        const { id } = req.params;

        const [shop] = await db.query(
            `
            SELECT
                s.id AS shop_id,
                s.shop_name,
                s.shop_phone,
                s.shop_address,
                s.location,
                s.is_active,
                s.type,
                s.user_id,
                u.image,
                s.status
            FROM shops s
            INNER JOIN users u
                ON s.user_id = u.id
            WHERE s.id = ?
                AND s.type = 'thonebane'
                AND s.status = 'approved'
                AND s.is_active = 1
            `,
            [id]
        );

        if (shop.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Thonebane shop not found!"
            });
        }

        const [data] = await db.query(
            `
            SELECT
                t.id,
                t.shop_id,
                t.capacity,
                t.features,
                t.category_id,
                c.name AS category_name,
                t.name,
                t.phone,
                t.location,
                t.description,
                t.status,
                t.is_active,
                t.image,
                DATE_FORMAT(
                    t.created_at,
                    '%d-%m-%Y'
                ) AS created_at
            FROM thonebanes t
            LEFT JOIN thonebane_categories c
                ON t.category_id = c.id
            WHERE t.shop_id = ?
                AND t.is_active = 1
                AND t.status = 'available'
            ORDER BY t.id DESC
            `,
            [id]
        );

        const [prices] = await db.query(
            `
            SELECT
                id,
                shop_id,
                thonebane_id,
                CASE
                    WHEN price_type = 'full_day'
                        THEN 'Full Day'
                    WHEN price_type = 'half_day_1'
                        THEN 'Half Day 1'
                    WHEN price_type = 'half_day_2'
                        THEN 'Half Day 2'
                    WHEN price_type = 'hourly'
                        THEN 'Hourly'
                    ELSE price_type
                END AS price_type,
                start_time,
                end_time,
                price
            FROM thonebane_prices
            WHERE shop_id = ?
            ORDER BY created_at ASC
            `,
            [id]
        );

        const result = data.map((thonebane) => ({
            ...thonebane,
            prices: prices.filter(
                (price) =>
                    Number(price.thonebane_id) === Number(thonebane.id) &&
                    Number(price.shop_id) === Number(thonebane.shop_id)
            )
        }));

        return res.status(200).json({
            success: true,
            message: "Thonebane Shop Detail Success!",
            data: {
                shop: shop[0],
                thonebanes: result
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