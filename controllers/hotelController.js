import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";

export const hotelCreate = asyncHandel(async (req, res) => {
    try {
        let shop_id = null;

        let {
            shop_id: bodyShopId,
            name,
            type,
            price,
            discount,
            start_date,
            end_date,
            description,
            facilities,
            location
        } = req.body;

        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        if (req.user.role === "shop") {

            const [shops] = await db.query(
                `
                SELECT id
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

            // Shop user ရဲ့ shop_id
            shop_id = shops[0].id;
        }

        if (req.user.role === "admin") {

            // Admin အတွက် body က shop_id လိုအပ်
            if (!bodyShopId) {
                return res.status(400).json({
                    success: false,
                    message: "Shop is required!"
                });
            }

            shop_id = bodyShopId;
        }

        const [shop] = await db.query(
            `
            SELECT id
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

        if (
            !name ||
            !type ||
            !start_date ||
            !end_date ||
            !location
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required!"
            });
        }

        const finalPrice = Number(price || 0);
        const finalDiscount = Number(discount || 0);

        const total_amount =
            finalPrice -
            (finalPrice * finalDiscount / 100);

        const uploadFolder = path.join(
            process.cwd(),
            "images",
            "hotel"
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

            imagePath = `images/hotel/${fileName}`;
        }

        const [data] = await db.query(
            `
            INSERT INTO hotels
            (
                shop_id,
                name,
                type,
                price,
                discount,
                total_amount,
                start_date,
                end_date,
                description,
                facilities,
                location,
                image
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                shop_id,
                name,
                type,
                finalPrice,
                finalDiscount,
                total_amount,
                start_date,
                end_date,
                description || null,
                facilities || null,
                location,
                imagePath
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Hotel created successfully.",
            hotel_id: data.insertId,
            shop_id: shop_id
        });


    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export const hotelList = asyncHandel(async (req, res) => {
    try {

        let query = "";
        let params = [];


        if (req.user.role === "admin") {

            query = `
                SELECT
                    h.id,
                    h.shop_id,
                    s.shop_name,
                    h.name,
                    h.type,
                    h.price,
                    h.discount,
                    h.total_amount,
                    DATE_FORMAT(h.start_date,'%d-%m-%Y') AS start_date,
                    DATE_FORMAT(h.end_date,'%d-%m-%Y') AS end_date,
                    h.description,
                    h.facilities,
                    h.image,
                    h.location
                FROM hotels h
                LEFT JOIN shops s ON h.shop_id = s.id
                ORDER BY h.id DESC
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
                    type,
                    price,
                    discount,
                    total_amount,
                    DATE_FORMAT(start_date,'%d-%m-%Y') AS start_date,
                    DATE_FORMAT(end_date,'%d-%m-%Y') AS end_date,
                    description,
                    facilities,
                    image,
                    location
                FROM hotels
                WHERE shop_id = ?
                ORDER BY id DESC
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


export const hotelUpdate = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;

        let {
            name,
            type,
            price,
            discount,
            start_date,
            end_date,
            description,
            location,
            facilities
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

        let hotelQuery = "SELECT * FROM hotels WHERE id = ?";

        let hotelParams = [id];

        if (req.user.role === "shop") {
            hotelQuery += " AND shop_id = ?";
            hotelParams.push(shop_id);
        }


        const [hotel] = await db.query(hotelQuery, hotelParams);

        if (hotel.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Hotel not found"
            });
        }

        let updatedImageString = hotel[0].image;

        // New Image Upload
        if (req.file) {

            // Delete Old Image
            if (hotel[0].image) {
                const oldPath = path.join(
                    process.cwd(),
                    hotel[0].image
                );

                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }

            const uploadFolder = path.join(
                process.cwd(),
                "images",
                "hotel"
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

            updatedImageString = `images/hotel/${fileName}`;
        }

        price = Number(price);
        discount = Number(discount || 0);

        const total_amount =
            price - (price * discount / 100);

        const [data] = await db.query(
            `
            UPDATE hotels SET
                name=?,
                type=?,
                price=?,
                discount=?,
                total_amount=?,
                start_date=?,
                end_date=?,
                description=?,
                facilities=?,
                location=?,
                image=?
            WHERE id=?
            `,
            [
                name,
                type,
                price,
                discount,
                total_amount,
                start_date,
                end_date,
                description,
                facilities,
                location,
                updatedImageString,
                id
            ]
        );

        return res.status(200).json({
            success: true,
            message: "Hotel Updated Successfully",
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

export const hotelDelete = asyncHandel(async (req, res) => {
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

        let hotelQuery = "SELECT * FROM hotels WHERE id = ?";
        let hotelParams = [id];

        if (req.user.role === "shop") {
            hotelQuery += " AND shop_id = ?";
            hotelParams.push(shop_id);
        }

        const [hotel] = await db.query(hotelQuery, hotelParams);
        if (hotel.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Hotel not found"
            });
        }

        if (hotel[0].image) {
            const imagePath = path.join(process.cwd(), hotel[0].image);

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await db.query("DELETE FROM hotels WHERE id = ?", [id]);
        res.status(200).json({
            success: true,
            message: "Hotel deleted successfully"
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
})

export const hotelMobileList = asyncHandel(async (req, res) => {
    try {

        const [data] = await db.query(`
            SELECT
                h.id,
                h.name,
                h.type,
                h.price,
                h.discount,
                h.total_amount,
                DATE_FORMAT(h.start_date, '%d-%m-%Y') AS start_date,
                DATE_FORMAT(h.end_date, '%d-%m-%Y') AS end_date,
                h.description,
                h.facilities,
                h.location,
                h.image,

                s.id AS shop_id,
                s.shop_name,
                s.shop_phone,
                s.shop_address

            FROM hotels h

            INNER JOIN shops s
                ON h.shop_id = s.id

            WHERE s.status = 'approved'

            ORDER BY h.id DESC
        `);

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

export const hotelDetails = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;
        const [data] = await db.query(`
            SELECT
                h.id,
                h.name,
                h.type,
                h.price,
                h.discount,
                h.total_amount,
                DATE_FORMAT(h.start_date, '%d-%m-%Y') AS start_date,
                DATE_FORMAT(h.end_date, '%d-%m-%Y') AS end_date,
                h.description,
                h.facilities,
                h.location,
                h.image,

                s.id AS shop_id,
                s.shop_name,
                s.shop_phone,
                s.shop_address

            FROM hotels h

            INNER JOIN shops s
                ON h.shop_id = s.id

            WHERE s.status = 'approved'
        `, [id]);
        res.status(200).json({
            success: true,
            data
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
})

export const hotelSearch = asyncHandel(async (req, res) => {
    try {

        const { search = "" } = req.query;
        if (!search.trim()) {
            return res.status(200).json({
                success: true,
                count: 0,
                data: []
            });
        }

        const keyword = `%${search}%`;

        const [data] = await db.query(
            `
            SELECT
            id,
            name,
            type,
            price,
            discount,
            total_amount,
            DATE_FORMAT(start_date, '%d-%m-%Y') as start_date,
            DATE_FORMAT(end_date, '%d-%m-%Y') as end_date, 
            description,
            facilities,
            image,
            location 
            FROM 
            hotels 
            WHERE 
            name LIKE ? OR type LIKE ? OR location LIKE ? OR facilities LIKE ? OR description LIKE ?
            ORDER BY id DESC
            `,
            [
                keyword,
                keyword,
                keyword,
                keyword,
                keyword
            ]

        )
        return res.status(200).json({
            message: "Search Success",
            success: true,
            data
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
})

export const hotelFilter = asyncHandel(async (req, res) => {
    try {
        const { location = "", name = "", type = "" } = req.query;
        let sql = `
            SELECT
            id,
            name,
            type,
            price,
            discount,
            total_amount,
            DATE_FORMAT(start_date, '%d-%m-%Y') as start_date,
            DATE_FORMAT(end_date, '%d-%m-%Y') as end_date, 
            description,
            facilities,
            image,
            location 
            FROM 
            hotels 
            WHERE
            1=1
            `;
        const values = [];
        if (location) {
            sql += ` AND location LIKE ?`;
            values.push(`%${location}%`)
        }
        if (name) {
            sql += ` AND name LIKE ?`;
            values.push(`%${name}%`)
        }
        if (type) {
            sql += ` AND type LIKE ?`;
            values.push(`%${type}%`)
        }
        sql += `
         ORDER BY id DESC
        `;
        const [hotel] = await db.query(sql, values);


        res.status(200).json({
            success: true,
            count: hotel.length,
            hotel
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
})