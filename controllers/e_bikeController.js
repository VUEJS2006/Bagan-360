import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";


export const eBikeCreate = asyncHandel(async (req, res) => {
    try {

        let {
            shop_id: bodyShopId,
            type_id,
            name,
            code,
            brand,
            color,
            location,
            price,
            discount,
            total_price,
            status,
            battery_percentage,
            helmet,
            battery_voltage,
            battery_capacity,
            passenger_count,
            phone_holder,
            description
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

        if (!type_id || !name || !code || !price) {
            return res.status(400).json({
                success: false,
                message: "Type, name and code are required!"
            });
        }

        const [type] = await db.query(
            `
            SELECT *
            FROM e_bike_types
            WHERE id = ?
            `,
            [type_id]
        );

        if (type.length === 0) {
            return res.status(404).json({
                success: false,
                message: "E-bike Type not found!"
            });
        }


        const [existingBike] = await db.query(
            `
            SELECT *
            FROM e_bikes
            WHERE code = ?
            `,
            [code]
        );

        if (existingBike.length > 0) {
            return res.status(400).json({
                success: false,
                message: "E-bike code already exists!"
            });
        }


        const uploadFolder = path.join(
            process.cwd(),
            "images",
            "e-bike"
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

            imagePath = `images/e-bike/${fileName}`;
        }


        price = Number(price);
        discount = Number(discount || 0);

        const total_amount =
            price - (price * discount / 100);


        const [data] = await db.query(
            `
            INSERT INTO e_bikes
            (
                shop_id,
                type_id,
                name,
                code,
                brand,
                color,
                location,
                image,
                price,
                discount,
                total_price,
                status,
                battery_percentage,
                helmet,
                battery_voltage,
                battery_capacity,
                passenger_count,
                phone_holder,
                description
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                shop_id,
                type_id,
                name,
                code,
                brand || null,
                color || null,
                location || null,
                imagePath,
                price,
                discount,
                total_amount,
                status || "available",
                battery_percentage ?? 100,
                helmet,
                battery_voltage || null,
                battery_capacity || null,
                passenger_count || 1,
                phone_holder,
                description || null
            ]
        );


        return res.status(201).json({
            success: true,
            message: "E-bike Create Success",
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

export const eBikeList = asyncHandel(async (req, res) => {
    try {

        let query = "";
        let params = [];

        if (req.user.role === "admin") {

            query = `
                SELECT
                    e.id,
                    e.shop_id,
                    s.shop_name,

                    e.type_id,
                    t.name AS type_name,
                    t.distance,

                    e.name,
                    e.code,
                    e.brand,
                    e.color,
                    e.location,
                    e.image,

                    e.price,
                    e.discount,
                    e.total_price,

                    e.status,
                    e.battery_percentage,

                    e.helmet,
                    e.battery_voltage,
                    e.battery_capacity,
                    e.passenger_count,
                    e.phone_holder,

                    e.description,

                    DATE_FORMAT(
                        e.created_at,
                        '%d-%m-%Y'
                    ) AS created_at

                FROM e_bikes e

                JOIN e_bike_types t
                    ON e.type_id = t.id

                LEFT JOIN shops s
                    ON e.shop_id = s.id

                ORDER BY e.id DESC
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
                    e.id,
                    e.shop_id,

                    e.type_id,
                    t.name AS type_name,
                    t.distance,

                    e.name,
                    e.code,
                    e.brand,
                    e.color,
                    e.location,
                    e.image,

                    e.price,
                    e.discount,
                    e.total_price,

                    e.status,
                    e.battery_percentage,

                    e.helmet,
                    e.battery_voltage,
                    e.battery_capacity,
                    e.passenger_count,
                    e.phone_holder,

                    e.description,

                    DATE_FORMAT(
                        e.created_at,
                        '%d-%m-%Y'
                    ) AS created_at

                FROM e_bikes e

                JOIN e_bike_types t
                    ON e.type_id = t.id

                WHERE e.shop_id = ?

                ORDER BY e.id DESC
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

        const [prices] = await db.query(
            `
            SELECT
                id,
                e_bike_id,
                price_type,
                start_time,
                end_time,
                price

            FROM e_bike_prices

            ORDER BY created_at ASC
            `
        );

        const result = data.map((bike) => {

            return {
                ...bike,

                prices: prices.filter(
                    (price) =>
                        price.e_bike_id === bike.id
                )
            };

        });

        return res.status(200).json({
            success: true,
            message: "E-bike List Success",
            count: result.length,
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

export const eBikeUpdate = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;

        let {
            type_id,
            name,
            code,
            brand,
            color,
            location,
            price,
            discount,
            total_price,
            status,
            battery_percentage,
            helmet,
            battery_voltage,
            battery_capacity,
            passenger_count,
            phone_holder,
            description
        } = req.body || {};


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


        let bikeQuery = `
            SELECT *
            FROM e_bikes
            WHERE id = ?
        `;

        let bikeParams = [id];


        if (req.user.role === "shop") {

            bikeQuery += `
                AND shop_id = ?
            `;

            bikeParams.push(shop_id);
        }


        const [bike] = await db.query(
            bikeQuery,
            bikeParams
        );


        if (bike.length === 0) {
            return res.status(404).json({
                success: false,
                message: "E-bike not found!"
            });
        }


        const [type] = await db.query(
            `
            SELECT *
            FROM e_bike_types
            WHERE id = ?
            `,
            [type_id]
        );

        if (type.length === 0) {
            return res.status(404).json({
                success: false,
                message: "E-bike Type not found!"
            });
        }


        const [existingBike] = await db.query(
            `
            SELECT *
            FROM e_bikes
            WHERE code = ?
            AND id != ?
            `,
            [
                code,
                id
            ]
        );

        if (existingBike.length > 0) {
            return res.status(400).json({
                success: false,
                message: "E-bike code already exists!"
            });
        }


        let updateImage = bike[0].image;


        if (req.file) {

            // Delete old image
            if (bike[0].image) {

                const oldPath = path.join(
                    process.cwd(),
                    bike[0].image
                );

                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }


            // Upload folder
            const uploadFolder = path.join(
                process.cwd(),
                "images",
                "e-bike"
            );

            if (!fs.existsSync(uploadFolder)) {
                fs.mkdirSync(uploadFolder, {
                    recursive: true
                });
            }


            // New image
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


            updateImage = `images/e-bike/${fileName}`;
        }

        price = Number(price);
        discount = Number(discount || 0);

        const total_amount =
            price - (price * discount / 100);


        const [data] = await db.query(
            `
            UPDATE e_bikes SET

                type_id = ?,
                name = ?,
                code = ?,
                brand = ?,
                color = ?,
                location = ?,
                image = ?,

                price = ?,
                discount = ?,
                total_price = ?,

                status = ?,
                battery_percentage = ?,

                helmet = ?,
                battery_voltage = ?,
                battery_capacity = ?,
                passenger_count = ?,
                phone_holder = ?,

                description = ?

            WHERE id = ?
            `,
            [
                type_id,
                name,
                code,
                brand || null,
                color || null,
                location || null,
                updateImage,

                price,
                discount,
                total_amount,

                status || "available",
                battery_percentage ?? 100,

                helmet ?? true,
                battery_voltage || null,
                battery_capacity || null,
                passenger_count || 1,
                phone_holder ?? true,

                description || null,

                id
            ]
        );


        return res.status(200).json({
            success: true,
            message: "E-bike Update Success",
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

export const eBikeDelete = asyncHandel(async (req, res) => {
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


        let bikeQuery = `
            SELECT *
            FROM e_bikes
            WHERE id = ?
        `;

        let bikeParams = [id];


        if (req.user.role === "shop") {

            bikeQuery += `
                AND shop_id = ?
            `;

            bikeParams.push(shop_id);
        }


        const [bike] = await db.query(
            bikeQuery,
            bikeParams
        );


        if (bike.length === 0) {
            return res.status(404).json({
                success: false,
                message: "E-bike not found!"
            });
        }


        if (bike[0].image) {

            const imagePath = path.join(
                process.cwd(),
                bike[0].image
            );

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        const [data] = await db.query(
            `
            DELETE FROM e_bikes
            WHERE id = ?
            `,
            [id]
        );


        return res.status(200).json({
            success: true,
            message: "E-bike Delete Success",
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

export const eBikeDetail = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;


        const [data] = await db.query(
            `
            SELECT
                e.id,

                e.name,
                e.code,
                e.brand,
                e.color,
                e.location,
                e.image,

                e.price,
                e.discount,
                e.total_price,

                e.status,
                e.battery_percentage,

                e.helmet,
                e.battery_voltage,
                e.battery_capacity,
                e.passenger_count,
                e.phone_holder,

                e.description,

                DATE_FORMAT(
                    e.created_at,
                    '%d-%m-%Y'
                ) AS created_at,


          
                t.id AS type_id,
                t.name AS type_name,
                t.distance,


                s.id AS shop_id,
                s.shop_name,
                s.shop_phone,
                s.shop_address,


           
                COALESCE(
                    JSON_ARRAYAGG(
                        CASE
                            WHEN p.id IS NOT NULL THEN
                                JSON_OBJECT(
                                    'id', p.id,
                                    'price_type', p.price_type,
                                    'start_time', p.start_time,
                                    'end_time', p.end_time,
                                    'price', p.price
                                )
                        END
                    ),
                    JSON_ARRAY()
                ) AS prices


            FROM e_bikes e


            INNER JOIN e_bike_types t
                ON e.type_id = t.id


            INNER JOIN shops s
                ON e.shop_id = s.id


            LEFT JOIN e_bike_prices p
                ON e.id = p.e_bike_id


            WHERE
                e.id = ?
                AND s.status = 'approved'


            GROUP BY
                e.id,
                e.name,
                e.code,
                e.brand,
                e.color,
                e.location,
                e.image,

                e.price,
                e.discount,
                e.total_price,

                e.status,
                e.battery_percentage,

                e.helmet,
                e.battery_voltage,
                e.battery_capacity,
                e.passenger_count,
                e.phone_holder,

                e.description,
                e.created_at,

                t.id,
                t.name,
                t.distance,

                s.id,
                s.shop_name,
                s.shop_phone,
                s.shop_address
            `,
            [id]
        );

        if (data.length === 0) {
            return res.status(404).json({
                success: false,
                message: "E-bike not found!"
            });
        }


        return res.status(200).json({
            success: true,
            message: "E-bike Detail Success",
            data: data[0]
        });


    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export const eBikeMobileList = asyncHandel(async (req, res) => {
    try {


        const [data] = await db.query(
            `
            SELECT
                e.id,

                e.name,
                e.code,
                e.brand,
                e.color,
                e.location,
                e.image,

                e.price,
                e.discount,
                e.total_price,

                e.status,
                e.battery_percentage,

                e.helmet,
                e.battery_voltage,
                e.battery_capacity,
                e.passenger_count,
                e.phone_holder,

                e.description,

                t.id AS type_id,
                t.name AS type_name,
                t.distance,

                s.id AS shop_id,
                s.shop_name,
                s.shop_phone,
                s.shop_address

            FROM e_bikes e

            INNER JOIN e_bike_types t
                ON e.type_id = t.id

            INNER JOIN shops s
                ON e.shop_id = s.id

            WHERE s.status = 'approved'

            ORDER BY e.id DESC
            `
        );


        const [prices] = await db.query(
            `
            SELECT
                id,
                e_bike_id,
                price_type,
                start_time,
                end_time,
                price

            FROM e_bike_prices

            ORDER BY created_at ASC
            `
        );


        const result = data.map((bike) => {

            return {
                ...bike,

                prices: prices.filter(
                    (price) =>
                        price.e_bike_id === bike.id
                )
            };

        });


        return res.status(200).json({
            success: true,
            message: "E-Bike Success!",
            count: result.length,
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