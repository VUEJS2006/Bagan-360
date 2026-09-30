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
            facilities,
            description,
            location
        } = req.body;

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
        // SHOP ROLE
        // =========================

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

        // =========================
        // ADMIN ROLE
        // =========================

        if (req.user.role === "admin") {

            if (!bodyShopId) {
                return res.status(400).json({
                    success: false,
                    message: "Shop is required!"
                });
            }

            shop_id = bodyShopId;
        }

        // =========================
        // CHECK SHOP
        // =========================

        const [shop] = await db.query(
            `
            SELECT id, type
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

        if (shop[0].type !== "hotel") {
            return res.status(400).json({
                success: false,
                message: "This shop is not a hotel!"
            });
        }

        // =========================
        // VALIDATION
        // =========================

        if (!name || !price || !location) {
            return res.status(400).json({
                success: false,
                message: "Name, price and location are required!"
            });
        }

        // =========================
        // FACILITIES JSON
        // =========================

        if (typeof facilities === "string") {

            try {
                facilities = JSON.parse(facilities);
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid facilities format!"
                });
            }
        }

        if (facilities && !Array.isArray(facilities)) {
            return res.status(400).json({
                success: false,
                message: "Facilities must be an array!"
            });
        }

        // =========================
        // MAIN IMAGE FOLDER
        // =========================

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

        // =========================
        // MAIN IMAGE
        // =========================

        let imagePath = null;

        const mainImage = req.files?.image?.[0];

        if (mainImage) {

            const fileName = `${uuid()}.webp`;

            const savePath = path.join(
                uploadFolder,
                fileName
            );

            await sharp(mainImage.buffer)
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

        // =========================
        // CREATE HOTEL
        // =========================

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

        // =========================
        // CREATE FACILITIES
        // =========================

        if (facilities && facilities.length > 0) {

            for (const facility of facilities) {

                if (!facility.name) {
                    return res.status(400).json({
                        success: false,
                        message: "Facility name is required!"
                    });
                }

                await db.query(
                    `
                    INSERT INTO hotel_facilities
                    (
                        hotel_id,
                        name,
                        description
                    )
                    VALUES (?, ?, ?)
                    `,
                    [
                        hotel_id,
                        facility.name,
                        facility.description || null
                    ]
                );
            }
        }

        // =========================
        // EXTRA IMAGE FOLDER
        // =========================

        const hotelFolder = path.join(
            process.cwd(),
            "images",
            "hotel_image"
        );

        if (!fs.existsSync(hotelFolder)) {
            fs.mkdirSync(hotelFolder, {
                recursive: true
            });
        }

        // =========================
        // EXTRA HOTEL IMAGES
        // =========================

        let imagePaths = [];

        const hotelImages = req.files?.hotel_images || [];

        if (hotelImages.length > 0) {

            for (const file of hotelImages) {

                const fileName = `${uuid()}.webp`;

                const savePath = path.join(
                    hotelFolder,
                    fileName
                );

                await sharp(file.buffer)
                    .resize({
                        width: 1920,
                        withoutEnlargement: true
                    })
                    .webp({
                        quality: 90
                    })
                    .toFile(savePath);

                imagePaths.push(
                    `images/hotel_image/${fileName}`
                );
            }
        }

        // =========================
        // INSERT EXTRA IMAGES
        // =========================

        for (const image of imagePaths) {

            await db.query(
                `
                INSERT INTO hotel_images
                (
                    hotel_id,
                    image
                )
                VALUES (?, ?)
                `,
                [
                    hotel_id,
                    image
                ]
            );
        }

        // =========================
        // RESPONSE
        // =========================

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
                    h.image
                FROM hotels h
                LEFT JOIN shops s
                    ON h.shop_id = s.id
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
                    h.image
                FROM hotels h
                LEFT JOIN shops s
                    ON h.shop_id = s.id
                WHERE h.shop_id = ?
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
            const [facilities] = await db.query(
                `
                SELECT id,name,description
                FROM hotel_facilities WHERE hotel_id = ?
                ORDER BY id DESC
                `, [
                hotel.id
            ]
            )
            hotel.facilities = facilities;

            const [images] = await db.query(
                `
                SELECT id,image 
                FROM hotel_images WHERE hotel_id = ?
                ORDER BY id DESC
                `, [
                hotel.id
            ]
            )
            hotel.images = images;
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
            facilities,
            location
        } = req.body;

        // =========================
        // ROLE CHECK
        // =========================

        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        let shop_id = null;

        // =========================
        // SHOP ROLE
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

            if (shop[0].type !== "hotel") {
                return res.status(400).json({
                    success: false,
                    message: "This shop is not a hotel!"
                });
            }

            shop_id = shop[0].id;
        }

        // =========================
        // CHECK HOTEL
        // =========================

        let hotelQuery = `
            SELECT *
            FROM hotels
            WHERE id = ?
        `;

        let hotelParams = [id];

        if (req.user.role === "shop") {

            hotelQuery += `
                AND shop_id = ?
            `;

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

        // =========================
        // FACILITIES JSON
        // =========================

        if (typeof facilities === "string") {

            try {

                facilities = JSON.parse(facilities);

            } catch (error) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid facilities format!"
                });
            }
        }

        if (facilities && !Array.isArray(facilities)) {

            return res.status(400).json({
                success: false,
                message: "Facilities must be an array!"
            });
        }

        if (facilities && facilities.length > 0) {

            for (const facility of facilities) {

                if (!facility.name) {

                    return res.status(400).json({
                        success: false,
                        message: "Facility name is required!"
                    });
                }
            }
        }

        // =========================
        // MAIN HOTEL IMAGE
        // =========================

        let updatedImage = hotel[0].image;

        const mainImage = req.files?.image?.[0];

        if (mainImage) {

            // DELETE OLD MAIN IMAGE

            if (hotel[0].image) {

                const oldPath = path.join(
                    process.cwd(),
                    hotel[0].image
                );

                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }

            // CREATE FOLDER

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

            // CREATE NEW IMAGE

            const fileName = `${uuid()}.webp`;

            const savePath = path.join(
                uploadFolder,
                fileName
            );

            await sharp(mainImage.buffer)
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

        // =========================
        // UPDATE HOTEL
        // =========================

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

        // =========================
        // UPDATE FACILITIES
        // =========================

        if (facilities) {

            // DELETE OLD FACILITIES

            await db.query(
                `
                DELETE FROM hotel_facilities
                WHERE hotel_id = ?
                `,
                [id]
            );

            // INSERT NEW FACILITIES

            for (const facility of facilities) {

                await db.query(
                    `
                    INSERT INTO hotel_facilities
                    (
                        hotel_id,
                        name,
                        description
                    )
                    VALUES (?, ?, ?)
                    `,
                    [
                        id,
                        facility.name,
                        facility.description || null
                    ]
                );
            }
        }

        // =========================
        // EXTRA HOTEL IMAGE FOLDER
        // =========================

        const hotelFolder = path.join(
            process.cwd(),
            "images",
            "hotel_image"
        );

        if (!fs.existsSync(hotelFolder)) {

            fs.mkdirSync(hotelFolder, {
                recursive: true
            });
        }

        // =========================
        // EXTRA HOTEL IMAGES
        // =========================

        let imagePaths = [];

        const hotelImages = req.files?.hotel_images || [];

        if (hotelImages.length > 0) {

            for (const file of hotelImages) {

                const fileName = `${uuid()}.webp`;

                const savePath = path.join(
                    hotelFolder,
                    fileName
                );

                await sharp(file.buffer)
                    .resize({
                        width: 1920,
                        withoutEnlargement: true
                    })
                    .webp({
                        quality: 90
                    })
                    .toFile(savePath);

                imagePaths.push(
                    `images/hotel_image/${fileName}`
                );
            }

            const [oldImages] = await db.query(
                `
                SELECT image
                FROM hotel_images
                WHERE hotel_id = ?
                `,
                [id]
            );

            const connection = await db.getConnection();

            try {
                await connection.beginTransaction();
                await connection.query(
                    `
                    DELETE FROM hotel_images
                    WHERE hotel_id = ?
                    `,
                    [id]
                );

                for (const image of imagePaths) {
                    await connection.query(
                        `
                        INSERT INTO hotel_images
                        (
                            hotel_id,
                            image
                        )
                        VALUES (?, ?)
                        `,
                        [id, image]
                    );
                }

                await connection.commit();
            } catch (error) {
                await connection.rollback();

                for (const image of imagePaths) {
                    const imagePath = path.join(process.cwd(), image);
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                    }
                }

                throw error;
            } finally {
                connection.release();
            }

            for (const image of oldImages) {
                if (!image.image) {
                    continue;
                }

                const oldPath = path.join(process.cwd(), image.image);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
        }

        // =========================
        // RESPONSE
        // =========================

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

        // =========================
        // HOTEL CHECK
        // =========================

        let hotelQuery = `
            SELECT *
            FROM hotels
            WHERE id = ?
        `;

        let hotelParams = [id];

        if (req.user.role === "shop") {

            hotelQuery += `
                AND shop_id = ?
            `;

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

        // =========================
        // DELETE MAIN HOTEL IMAGE
        // =========================

        if (hotel[0].image) {

            const imagePath = path.join(
                process.cwd(),
                hotel[0].image
            );

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        // =========================
        // GET EXTRA HOTEL IMAGES
        // =========================

        const [images] = await db.query(
            `
            SELECT image
            FROM hotel_images
            WHERE hotel_id = ?
            `,
            [id]
        );

        // =========================
        // DELETE EXTRA IMAGE FILES
        // =========================

        for (const image of images) {

            if (image.image) {

                const imagePath = path.join(
                    process.cwd(),
                    image.image
                );

                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }
        }

        // =========================
        // DELETE HOTEL
        // =========================

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
                    s.location,
                    s.shop_phone,
                    s.status,
                    s.type,
                    s.user_id,
                    u.image
                FROM shops s
                JOIN users u ON s.user_id = u.id
                WHERE s.type = 'hotel'
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
                    s.location,
                    s.shop_address,
                    s.shop_phone,
                    s.status,
                    s.type,
                    u.image,
                    s.user_id

                FROM shops s
                JOIN users u ON s.user_id = u.id
                WHERE s.id = ?
                AND s.type = 'hotel'
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
                    s.location,
                    s.status,
                    s.type,
                    u.image,
                    s.user_id

                FROM shops s
                JOIN users u ON s.user_id = u.id
                WHERE s.type = 'hotel'
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
            message: "Hotel Data Success",
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

        s.shop_name,
        s.shop_phone,
        s.shop_address,
        s.user_id,

        u.image AS user_image,

        h.name,
        h.price,
        h.location,
        h.description,
        h.image AS hotel_image

    FROM hotels h

    INNER JOIN shops s
        ON h.shop_id = s.id

    INNER JOIN users u
        ON s.user_id = u.id

    WHERE h.shop_id = ?
    AND s.status = 'approved'
    AND s.type = 'hotel'

    ORDER BY h.id DESC

`, [id]);

        if (data.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Hotel Not Found!"
            });
        }
        for (const hotel of data) {


            const [facilities] = await db.query(
                `
                SELECT
                    id,
                    name,
                    description
                FROM hotel_facilities
                WHERE hotel_id = ?
                ORDER BY id DESC
                `,
                [hotel.id]
            );

            hotel.facilities = facilities;
            const [images] = await db.query(
                `
                SELECT
                    id,
                    image
                FROM hotel_images
                WHERE hotel_id = ?
                ORDER BY id DESC
                `,
                [hotel.id]
            );

            hotel.images = images;
        }

        const shop = {
            shop_id: data[0].shop_id,
            shop_name: data[0].shop_name,
            shop_phone: data[0].shop_phone,
            shop_address: data[0].shop_address,
             image: data[0].user_image
        };

        const hotels = data.map(hotel => ({
            id: hotel.id,
            shop_id: hotel.shop_id,
            name: hotel.name,
            price: hotel.price,
            location: hotel.location,
            description: hotel.description,
            image: hotel.image,
            images: hotel.images
        }));


        return res.status(200).json({
            success: true,
            data: {
                shop,
                hotels
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

