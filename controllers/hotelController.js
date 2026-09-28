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
            price,
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

            if (shops[0].type !== "hotel") {
                return res.status(400).json({
                    success: false,
                    message: "This shop is not a hotel!"
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

        if (!name || !price || !location) {
            return res.status(400).json({
                success: false,
                message: "Name and price are required!"
            });
        }

        try {
            facilities = JSON.parse(facilities);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: "Facilities must be a valid JSON array!"
            });
        }


        for (const facility of facilities) {
            if (!facility.name || !facility.description) {
                return res.status(400).json({
                    success: false,
                    message: "Facility name and description are required!"
                });
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

        let imagePath = null;

        if (req.files?.image?.[0]) {

            const fileName = `${uuid()}.webp`;

            const savePath = path.join(
                uploadFolder,
                fileName
            );

            await sharp(req.files.image[0].buffer)
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
                price,
                description,
                image,
                location
            )
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                shop_id,
                name,
                Number(price),
                description || null,
                imagePath,
                location
            ]
        );

        const hotel_id = data.insertId;

        const facilityFolder = path.join(
            process.cwd(),
            "images",
            "hotel",
            "facility"
        );

        if (!fs.existsSync(facilityFolder)) {
            fs.mkdirSync(facilityFolder, {
                recursive: true
            });
        }

        const facilityImages = req.files?.facility_images || [];

        if (facilityImages.length !== facilities.length) {
            return res.status(400).json({
                success: false,
                message: "Each facility must have one image!"
            });
        }

        for (let i = 0; i < facilities.length; i++) {

            const facility = facilities[i];
            const fileName = `${uuid()}.webp`;

            const savePath = path.join(
                facilityFolder,
                fileName
            );

            await sharp(facilityImages[i].buffer)
                .resize({
                    width: 1920,
                    withoutEnlargement: true
                })
                .webp({
                    quality: 90
                })
                .toFile(savePath);

            const facilityImage = `images/hotel/facility/${fileName}`;

            await db.query(
                `
                INSERT INTO hotel_facilities
                (
                    hotel_id,
                    name,
                    description,
                    image
                )
                VALUES (?, ?, ?, ?)
                `,
                [
                    hotel_id,
                    facility.name,
                    facility.description,
                    facilityImage
                ]
            );
        }

        return res.status(201).json({
            success: true,
            message: "Hotel created successfully.",
            hotel_id: hotel_id,
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
                    s.shop_address,
                    s.shop_phone,
                    h.name,
                    h.price,
                    h.location,
                    h.description,
                    h.image,
                    COALESCE (
                     JOIN_ARRAYAGG(
                     CASE WHEN hf.id IS NOT NULL THEN 
                     JOIN_OBJECT (
                      'id',hf.id,
                      'name', hf.name,
                      'description', hf.description,
                      'image', hf.image
                     )
                      END
                     ),
                     JSON_ARRAY()

                    )AS facilites

                FROM hotels h
                LEFT JOIN shops s
                    ON h.shop_id = s.id
                    LEFT JOIN hotel_facilities hf
                    ON h.id = hf.hotel_id
                  GROUP BY
                    h.id,
                    h.shop_id,
                    s.shop_name,
                    s.shop_address,
                    s.shop_phone,
                    h.name,
                    h.price,
                    h.location,
                    h.description,
                    h.image
                ORDER BY h.id DESC
            `;
        }

        else if (req.user.role === "shop") {

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

            if (shop[0].type !== "hotel") {
                return res.status(400).json({
                    success: false,
                    message: "This shop is not a hotel!"
                });
            }

            query = `
                SELECT
                    h.id,
                    h.shop_id,
                    s.shop_name,
                    s.shop_address,
                    s.shop_phone,
                    h.name,
                    h.location,
                    h.price,
                    h.description,
                    h.image,
                    COALESCE(
                        JSON_ARRAYAGG(
                            CASE
                                WHEN hf.id IS NOT NULL THEN
                                    JSON_OBJECT(
                                        'id', hf.id,
                                        'name', hf.name,
                                        'description', hf.description,
                                        'image', hf.image
                                    )
                            END
                        ),
                        JSON_ARRAY()
                    ) AS facilities
                FROM hotels h
                LEFT JOIN shops s
                    ON h.shop_id = s.id
                LEFT JOIN hotel_facilities hf
                    ON h.id = hf.hotel_id
                WHERE h.shop_id = ?
                GROUP BY
                    h.id,
                    h.shop_id,
                    s.shop_name,
                    s.shop_address,
                    s.shop_phone,
                    h.name,
                    h.price,
                    h.location,
                    h.description,
                    h.image
                ORDER BY h.id DESC
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
        for (const hotel of data) {
            if (typeof hotel.facilities === "string") {
                hotel.facilities = JSON.parse(hotel.facilities);
            }

            hotel.facilities = hotel.facilities.filter(
                facility => facility !== null
            );
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

export const hotelUpdate = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;

        let {
            name,
            price,
            description,
            location
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

            if (shop[0].type !== "hotel") {
                return res.status(400).json({
                    success: false,
                    message: "This shop is not a hotel!"
                });
            }

            shop_id = shop[0].id;
        }

        let hotelQuery = `
            SELECT *
            FROM hotels
            WHERE id = ?
        `;

        let hotelParams = [id];
        if (req.user.role === "shop") {
            hotelQuery += ` AND shop_id = ?`;
            hotelParams.push(shop_id);
        }

        const [hotel] = await db.query(
            hotelQuery,
            hotelParams
        );

        if (hotel.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Hotel not found!"
            });
        }


        let updatedImage = hotel[0].image;
        if (req.file) {
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

            updatedImage = `images/hotel/${fileName}`;
        }

        const [data] = await db.query(
            `
            UPDATE hotels
            SET
                name = ?,
                price = ?,
                description = ?,
                image = ?,
                location = ?
            WHERE id = ?
            `,
            [
                name,
                Number(price),
                description || null,
                updatedImage,
                location,
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

            if (shop[0].type !== "hotel") {
                return res.status(400).json({
                    success: false,
                    message: "This shop is not a hotel!"
                });
            }

            shop_id = shop[0].id;
        }

        let hotelQuery = `
            SELECT *
            FROM hotels
            WHERE id = ?
        `;

        let hotelParams = [id];
        if (req.user.role === "shop") {
            hotelQuery += ` AND shop_id = ?`;
            hotelParams.push(shop_id);
        }

        const [hotel] = await db.query(
            hotelQuery,
            hotelParams
        );

        if (hotel.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Hotel not found!"
            });
        }

        if (hotel[0].image) {

            const imagePath = path.join(
                process.cwd(),
                hotel[0].image
            );

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await db.query(
            `
            DELETE FROM hotels
            WHERE id = ?
            `,
            [id]
        );

        return res.status(200).json({
            success: true,
            message: "Hotel deleted successfully"
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export const hotelMobileList = asyncHandel(async (req, res) => {
    try {

        const [data] = await db.query(`
            SELECT
                h.id,
                h.shop_id,
                h.name,
                h.price
                h.location,
                h.description,
                h.image,
               s.shop_name,
               s.shop_phone,
               s.shop_address

            FROM hotels h

            INNER JOIN shops s
                ON h.shop_id = s.id

            WHERE s.status = 'approved'
            AND s.type = 'hotel'

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
                h.shop_id,
                h.name,
                h.price,
                h.location,
                h.description,
                h.image,

                s.shop_name,
               s.shop_phone,
                s.shop_address

            FROM hotels h

            INNER JOIN shops s
                ON h.shop_id = s.id

            WHERE h.id = ?
            AND s.status = 'approved'
            AND s.type = 'hotel'

        `, [id]);

        if (data.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Hotel Not Found!"
            });
        }


        return res.status(200).json({
            success: true,
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
            image,
            location 
            FROM 
            hotels 
            WHERE 
            name LIKE ? OR type LIKE ? OR location LIKE ? OR LIKE ? OR description LIKE ?
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