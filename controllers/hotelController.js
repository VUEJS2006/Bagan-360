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
            location,
            is_active
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

        if (!name || price === undefined || price === null || !location) {
            return res.status(400).json({
                success: false,
                message: "Name, price and location are required!"
            });
        }

        const hotelPrice = Number(price);

        if (Number.isNaN(hotelPrice)) {
            return res.status(400).json({
                success: false,
                message: "Price must be a valid number!"
            });
        }

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

        if (
            facilities !== undefined &&
            facilities !== null &&
            !Array.isArray(facilities)
        ) {
            return res.status(400).json({
                success: false,
                message: "Facilities must be an array!"
            });
        }

        if (Array.isArray(facilities)) {
            for (const facility of facilities) {
                if (
                    !facility ||
                    typeof facility !== "object" ||
                    !facility.name ||
                    !String(facility.name).trim()
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Each facility must have a valid name!"
                    });
                }
            }
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
            "hotel"
        );

        if (!fs.existsSync(uploadFolder)) {
            fs.mkdirSync(uploadFolder, {
                recursive: true
            });
        }

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

        const [data] = await db.query(
            `
            INSERT INTO hotels
            (
                shop_id,
                name,
                price,
                description,
                image,
                location,
                is_active
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                shop_id,
                String(name).trim(),
                hotelPrice,
                description
                    ? String(description).trim()
                    : null,
                imagePath,
                String(location).trim(),
                active
            ]
        );

        const hotel_id = data.insertId;

        if (Array.isArray(facilities)) {
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
                        hotel_id,
                        String(facility.name).trim(),
                        facility.description
                            ? String(facility.description).trim()
                            : null
                    ]
                );
            }
        }

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

        const hotelImages = req.files?.hotel_images || [];

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

            const imagePath =
                `images/hotel_image/${fileName}`;

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
                    imagePath
                ]
            );
        }

        return res.status(201).json({
            success: true,
            message: "Hotel created successfully.",
            hotel_id,
            shop_id
        });

    } catch (error) {
        console.log(error);

        return res.status(500).json({
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
                    h.is_active
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
                    h.image,
                    h.is_active
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
                ORDER BY id ASC
                `, [
                hotel.id
            ]
            )
            hotel.facilities = facilities;

            const [images] = await db.query(
                `
                SELECT id,image 
                FROM hotel_images WHERE hotel_id = ?
                ORDER BY id ASC
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

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Hotel id is required!"
            });
        }

        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        let {
            name,
            price,
            facilities,
            description,
            location,
            is_active
        } = req.body;

        const [hotel] = await db.query(
            `
            SELECT *
            FROM hotels
            WHERE id = ?
            `,
            [id]
        );

        if (hotel.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Hotel not found!"
            });
        }

        const currentHotel = hotel[0];

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

            if (currentHotel.shop_id !== shops[0].id) {
                return res.status(403).json({
                    success: false,
                    message: "You can only update your own hotel!"
                });
            }
        }

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

        if (
            facilities !== undefined &&
            facilities !== null &&
            !Array.isArray(facilities)
        ) {
            return res.status(400).json({
                success: false,
                message: "Facilities must be an array!"
            });
        }

        if (Array.isArray(facilities)) {
            for (const facility of facilities) {
                if (
                    !facility ||
                    typeof facility !== "object" ||
                    !facility.name ||
                    !String(facility.name).trim()
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Each facility must have a valid name!"
                    });
                }
            }
        }

        let hotelPrice = currentHotel.price;

        if (price !== undefined && price !== null && price !== "") {
            hotelPrice = Number(price);

            if (Number.isNaN(hotelPrice)) {
                return res.status(400).json({
                    success: false,
                    message: "Price must be a valid number!"
                });
            }
        }

        let active = currentHotel.is_active;

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

        let updatedImage = currentHotel.image;

        const mainImage = req.files?.image?.[0];

        if (mainImage) {
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

            if (currentHotel.image) {
                const oldImagePath = path.join(
                    process.cwd(),
                    currentHotel.image
                );

                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }

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

        const [data] = await db.query(
            `
            UPDATE hotels
            SET
                name = ?,
                price = ?,
                description = ?,
                image = ?,
                location = ?,
                is_active = ?
            WHERE id = ?
            `,
            [
                name !== undefined
                    ? String(name).trim()
                    : currentHotel.name,

                hotelPrice,

                description !== undefined
                    ? (
                        description
                            ? String(description).trim()
                            : null
                    )
                    : currentHotel.description,

                updatedImage,

                location !== undefined
                    ? String(location).trim()
                    : currentHotel.location,

                active,

                id
            ]
        );

        if (Array.isArray(facilities)) {
            const [oldFacilities] = await db.query(
                `
                SELECT
                    id,
                    name,
                    description
                FROM hotel_facilities
                WHERE hotel_id = ?
                ORDER BY id ASC
                `,
                [id]
            );

            for (let i = 0; i < facilities.length; i++) {
                const facility = facilities[i];

                if (oldFacilities[i]) {
                    await db.query(
                        `
                        UPDATE hotel_facilities
                        SET
                            name = ?,
                            description = ?
                        WHERE id = ?
                        AND hotel_id = ?
                        `,
                        [
                            String(facility.name).trim(),
                            facility.description
                                ? String(facility.description).trim()
                                : null,
                            oldFacilities[i].id,
                            id
                        ]
                    );
                } else {
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
                            String(facility.name).trim(),
                            facility.description
                                ? String(facility.description).trim()
                                : null
                        ]
                    );
                }
            }

            if (facilities.length < oldFacilities.length) {
                const deleteFacilities =
                    oldFacilities.slice(facilities.length);

                for (const facility of deleteFacilities) {
                    await db.query(
                        `
                        DELETE FROM hotel_facilities
                        WHERE id = ?
                        AND hotel_id = ?
                        `,
                        [
                            facility.id,
                            id
                        ]
                    );
                }
            }
        }

        const hotelImages = req.files?.hotel_images || [];

        if (hotelImages.length > 0) {
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

            const [oldImages] = await db.query(
                `
                SELECT
                    id,
                    image
                FROM hotel_images
                WHERE hotel_id = ?
                ORDER BY id ASC
                `,
                [id]
            );

            for (let i = 0; i < hotelImages.length; i++) {
                const file = hotelImages[i];

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

                const newImagePath =
                    `images/hotel_image/${fileName}`;

                if (oldImages[i]) {
                    const oldImagePath = path.join(
                        process.cwd(),
                        oldImages[i].image
                    );

                    if (
                        oldImages[i].image &&
                        fs.existsSync(oldImagePath)
                    ) {
                        fs.unlinkSync(oldImagePath);
                    }

                    await db.query(
                        `
                        UPDATE hotel_images
                        SET image = ?
                        WHERE id = ?
                        AND hotel_id = ?
                        `,
                        [
                            newImagePath,
                            oldImages[i].id,
                            id
                        ]
                    );
                } else {
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
                            id,
                            newImagePath
                        ]
                    );
                }
            }

            if (hotelImages.length < oldImages.length) {
                const deleteImages =
                    oldImages.slice(hotelImages.length);

                for (const image of deleteImages) {
                    const oldImagePath = path.join(
                        process.cwd(),
                        image.image
                    );

                    if (
                        image.image &&
                        fs.existsSync(oldImagePath)
                    ) {
                        fs.unlinkSync(oldImagePath);
                    }

                    await db.query(
                        `
                        DELETE FROM hotel_images
                        WHERE id = ?
                        AND hotel_id = ?
                        `,
                        [
                            image.id,
                            id
                        ]
                    );
                }
            }
        }

        return res.status(200).json({
            success: true,
            message: "Hotel updated successfully.",
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


        // HOTEL CHECK


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


        // DELETE MAIN HOTEL IMAGE


        if (hotel[0].image) {

            const imagePath = path.join(
                process.cwd(),
                hotel[0].image
            );

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }


        // GET EXTRA HOTEL IMAGES


        const [images] = await db.query(
            `
            SELECT image
            FROM hotel_images
            WHERE hotel_id = ?
            `,
            [id]
        );


        // DELETE EXTRA IMAGE FILES


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


        // DELETE HOTEL


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


export const hotelShopList = asyncHandel(async (req, res) => {
    try {

        let query = "";
        let params = [];


        // ADMIN


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
                    s.is_active,
                    s.user_id,
                    u.image
                FROM shops s
                JOIN users u ON s.user_id = u.id
                WHERE s.type = 'hotel'
                ORDER BY s.id DESC
            `;
        }


        // SHOP


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


        // USER


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
                WHERE s.type = 'hotel'
                AND s.status = 'approved'
                ORDER BY s.id DESC
            `;
        }


        // OTHER ROLE


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

export const hotelShopDetails = asyncHandel(async (req, res) => {
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
        h.is_active,
        h.image AS hotel_image

    FROM hotels h

    INNER JOIN shops s
        ON h.shop_id = s.id

    INNER JOIN users u
        ON s.user_id = u.id

    WHERE h.shop_id = ?
    AND s.status = 'approved'
    AND s.type = 'hotel'
    AND h.is_active = true

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
            is_active: hotel.is_active,
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

export const hotelDetails = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;
        const [data] = await db.query(
            `
            SELECT
                h.id,
                h.shop_id,

                h.name,
                h.price,
                h.location,
                h.description,
                h.is_active,
                h.image AS hotel_image,

                s.shop_name,
                s.shop_phone,
                s.shop_address,
                s.is_active,
                s.location AS shop_location

            FROM hotels h

            INNER JOIN shops s
                ON h.shop_id = s.id

            WHERE h.id = ?
            AND s.status = 'approved'
            AND s.type = 'hotel'

            `,
            [id]
        );

        if (data.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Hotel Not Found!"
            });
        }

        const hotel = data[0];
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

        const shop = {
            shop_id: hotel.shop_id,
            shop_name: hotel.shop_name,
            shop_phone: hotel.shop_phone,
            shop_address: hotel.shop_address,
            location: hotel.shop_location
        };

        const hotelData = {
            id: hotel.id,
            shop_id: hotel.shop_id,
            name: hotel.name,
            price: hotel.price,
            location: hotel.location,
            is_active: hotel.is_active,
            description: hotel.description,
            image: hotel.hotel_image,
            facilities,
            images
        };


        return res.status(200).json({
            success: true,
            message: "Hotel Detail Success",

            data: {
                hotel: hotelData
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