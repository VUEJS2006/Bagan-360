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


        // =========================================
        // 1. ROLE CHECK
        // =========================================

        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }


        // =========================================
        // 2. SHOP ROLE
        // =========================================

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


        // =========================================
        // 3. ADMIN ROLE
        // =========================================

        if (req.user.role === "admin") {

            if (!bodyShopId) {
                return res.status(400).json({
                    success: false,
                    message: "Shop is required!"
                });
            }

            shop_id = bodyShopId;
        }


        // =========================================
        // 4. HOTEL REQUIRED DATA
        // =========================================

        if (
            !name ||
            price === undefined ||
            price === null ||
            !location
        ) {
            return res.status(400).json({
                success: false,
                message: "Name, price and location are required!"
            });
        }


        // =========================================
        // 5. PARSE FACILITIES
        // =========================================

        try {

            facilities =
                typeof facilities === "string"
                    ? JSON.parse(facilities)
                    : facilities;

        } catch (error) {

            return res.status(400).json({
                success: false,
                message: "Facilities must be a valid JSON array!"
            });
        }


        // =========================================
        // 6. CHECK FACILITIES ARRAY
        // =========================================

        if (!Array.isArray(facilities)) {

            return res.status(400).json({
                success: false,
                message: "Facilities must be a valid JSON array!"
            });
        }


        // =========================================
        // 7. CHECK FACILITY DATA
        // =========================================

        for (const facility of facilities) {

            if (!facility.name || !facility.description) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Facility name and description are required!"
                });
            }
        }


        // =========================================
        // 8. GET FILES
        // =========================================

        const mainImage =
            req.files?.image?.[0] || null;

        const facilityImages =
            req.files?.facility_images || [];


        // =========================================
        // 9. HOTEL IMAGE FOLDER
        // =========================================

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


        // =========================================
        // 10. SAVE HOTEL IMAGE
        // =========================================

        let imagePath = null;


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


            imagePath =
                `images/hotel/${fileName}`;
        }


        // =========================================
        // 11. CREATE HOTEL
        // =========================================

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


        // =========================================
        // 12. FACILITY IMAGE FOLDER
        // =========================================

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


        // =========================================
        // 13. CREATE FACILITIES
        // =========================================

        for (let i = 0; i < facilities.length; i++) {

            const facility = facilities[i];

            // default NULL
            let facilityImage = null;


            // =====================================
            // image ရှိရင် save
            // image မရှိရင် NULL
            // =====================================

            if (facilityImages[i]) {

                const fileName =
                    `${uuid()}.webp`;


                const savePath =
                    path.join(
                        facilityFolder,
                        fileName
                    );


                await sharp(
                    facilityImages[i].buffer
                )
                    .resize({
                        width: 1920,
                        withoutEnlargement: true
                    })
                    .webp({
                        quality: 90
                    })
                    .toFile(savePath);


                facilityImage =
                    `images/hotel/facility/${fileName}`;
            }


            // =====================================
            // INSERT FACILITY
            // =====================================

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


        // =========================================
        // 14. SUCCESS
        // =========================================

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

        // =========================
        // ADMIN
        // =========================

        if (req.user.role === "admin") {

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

        // =========================
        // SHOP
        // =========================

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

        // =========================
        // OTHER ROLES
        // =========================

        else {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        // =========================
        // QUERY
        // =========================

        const [data] = await db.query(query, params);

        // =========================
        // FACILITIES JSON PARSE
        // =========================

        for (const hotel of data) {

            if (typeof hotel.facilities === "string") {
                hotel.facilities = JSON.parse(hotel.facilities);
            }

            hotel.facilities = (hotel.facilities || []).filter(
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

        const {
            shop_id: bodyShopId,
            name,
            price,
            description,
            location,
            facilities
        } = req.body;


        // =========================================
        // 1. ROLE CHECK
        // =========================================

        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }


        // =========================================
        // 2. GET SHOP ID
        // =========================================

        let shop_id = bodyShopId;

        if (req.user.role === "shop") {

            const [checkShop] = await db.query(
                `
                SELECT id, type
                FROM shops
                WHERE user_id = ?
                `,
                [req.user.id]
            );

            if (checkShop.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Shop not found!"
                });
            }

            if (checkShop[0].type !== "hotel") {
                return res.status(403).json({
                    success: false,
                    message: "This shop is not a hotel!"
                });
            }

            shop_id = checkShop[0].id;
        }


        // =========================================
        // 3. CHECK HOTEL
        // =========================================

        let checkHotelQuery = `
            SELECT *
            FROM hotels
            WHERE id = ?
        `;

        let checkHotelValues = [id];


        if (req.user.role === "shop") {

            checkHotelQuery += `
                AND shop_id = ?
            `;

            checkHotelValues.push(shop_id);
        }


        const [checkHotel] = await db.query(
            checkHotelQuery,
            checkHotelValues
        );


        if (checkHotel.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Hotel not found!"
            });
        }


        const oldHotel = checkHotel[0];


        // =========================================
        // 4. PARSE FACILITIES
        // =========================================

        let facilityList = null;


        if (facilities !== undefined) {

            try {

                facilityList =
                    typeof facilities === "string"
                        ? JSON.parse(facilities)
                        : facilities;

            } catch (error) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid facilities JSON!"
                });
            }


            if (!Array.isArray(facilityList)) {
                return res.status(400).json({
                    success: false,
                    message: "Facilities must be an array!"
                });
            }


            // -----------------------------
            // Validate facilities
            // -----------------------------

            for (const facility of facilityList) {

                if (!facility.name) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "Each facility must have a name!"
                    });
                }

                if (!facility.description) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "Each facility must have a description!"
                    });
                }
            }
        }


        // =========================================
        // 5. GET IMAGES
        // =========================================

        const hotelImage =
            req.files?.image?.[0];

        const facilityImages =
            req.files?.facility_images || [];


        // =========================================
        // 6. HOTEL IMAGE
        // =========================================

        let updatedImage = oldHotel.image;

        const oldImagesToDelete = [];


        if (hotelImage) {

            const hotelImageName =
                `${uuid()}.webp`;


            const hotelImagePath =
                path.join(
                    process.cwd(),
                    "images",
                    "hotel",
                    hotelImageName
                );


            await fs.promises.mkdir(
                path.dirname(hotelImagePath),
                {
                    recursive: true
                }
            );


            await sharp(hotelImage.buffer)
                .resize({
                    width: 1920,
                    withoutEnlargement: true
                })
                .webp({
                    quality: 90
                })
                .toFile(hotelImagePath);


            updatedImage =
                `images/hotel/${hotelImageName}`;


            if (oldHotel.image) {
                oldImagesToDelete.push(
                    oldHotel.image
                );
            }
        }


        // =========================================
        // 7. UPDATE HOTEL
        // =========================================

        await db.query(
            `
            UPDATE hotels
            SET
                name = ?,
                price = ?,
                description = ?,
                location = ?,
                image = ?
            WHERE id = ?
            `,
            [
                name ?? oldHotel.name,
                price ?? oldHotel.price,
                description ?? oldHotel.description,
                location ?? oldHotel.location,
                updatedImage,
                id
            ]
        );


        // =========================================
        // 8. UPDATE FACILITIES
        // =========================================

        if (facilityList !== null) {

            // -----------------------------------------
            // Get old facilities
            // -----------------------------------------

            const [oldFacilities] = await db.query(
                `
                SELECT
                    id,
                    name,
                    description,
                    image
                FROM hotel_facilities
                WHERE hotel_id = ?
                ORDER BY id ASC
                `,
                [id]
            );


            // -----------------------------------------
            // Save old images before deleting
            // -----------------------------------------

            for (const oldFacility of oldFacilities) {

                if (oldFacility.image) {

                    oldImagesToDelete.push(
                        oldFacility.image
                    );
                }
            }


            // -----------------------------------------
            // DELETE ALL OLD FACILITIES
            // -----------------------------------------

            await db.query(
                `
                DELETE FROM hotel_facilities
                WHERE hotel_id = ?
                `,
                [id]
            );


            // -----------------------------------------
            // CREATE NEW FACILITIES
            // -----------------------------------------

            const facilityFolder =
                path.join(
                    process.cwd(),
                    "images",
                    "hotel",
                    "facility"
                );


            await fs.promises.mkdir(
                facilityFolder,
                {
                    recursive: true
                }
            );


            // -----------------------------------------
            // Insert new facilities
            // -----------------------------------------

            for (
                let i = 0;
                i < facilityList.length;
                i++
            ) {

                const facility =
                    facilityList[i];


                let facilityImage = null;


                // -------------------------------------
                // Image ရှိရင်
                // -------------------------------------

                if (facilityImages[i]) {

                    const facilityImageName =
                        `${uuid()}.webp`;


                    const facilityImagePath =
                        path.join(
                            facilityFolder,
                            facilityImageName
                        );


                    await sharp(
                        facilityImages[i].buffer
                    )
                        .resize({
                            width: 1920,
                            withoutEnlargement: true
                        })
                        .webp({
                            quality: 90
                        })
                        .toFile(
                            facilityImagePath
                        );


                    facilityImage =
                        `images/hotel/facility/${facilityImageName}`;
                }


                // -------------------------------------
                // INSERT
                // -------------------------------------

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
                        id,
                        facility.name,
                        facility.description,
                        facilityImage
                    ]
                );
            }
        }


        // =========================================
        // 9. DELETE OLD IMAGE FILES
        // =========================================

        for (
            const oldImage
            of oldImagesToDelete
        ) {

            const oldImagePath =
                path.join(
                    process.cwd(),
                    oldImage
                );


            try {

                await fs.promises.unlink(
                    oldImagePath
                );

            } catch (error) {

                // file မရှိရင် ignore
            }
        }


        // =========================================
        // 10. SUCCESS
        // =========================================

        return res.status(200).json({
            success: true,
            message: "Hotel updated successfully!"
        });


    } catch (error) {

        console.error(
            "Hotel Update Error:",
            error
        );

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

        const [facilities] = await db.query(
            `
            SELECT image
            FROM hotel_facilities
            WHERE hotel_id = ?
            `,
            [id]
        );


        if (hotel[0].image) {

            const imagePath = path.join(
                process.cwd(),
                hotel[0].image
            );

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        for (const facility of facilities) {

            if (facility.image) {

                const imagePath = path.join(
                    process.cwd(),
                    facility.image
                );

                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
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
            message: "Hotel and facilities deleted successfully"
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

            WHERE h.id = ?
                AND s.status = 'approved'
                AND s.type = 'hotel'

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

