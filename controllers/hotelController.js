import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";

// =========================================================================
// HELPER: Parse JSON or Array safely
// =========================================================================
const parseArrayField = (field) => {
    if (!field) return null;
    if (Array.isArray(field)) return field;
    if (typeof field === "string") {
        try {
            const parsed = JSON.parse(field);
            if (Array.isArray(parsed)) return parsed;
            return [parsed];
        } catch {
            return field.split(",").map(item => item.trim()).filter(Boolean);
        }
    }
    return null;
};

// =========================================================================
// CREATE HOTEL
// =========================================================================
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

        // ROLE CHECK
        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        // SHOP ROLE
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

        // ADMIN ROLE
        if (req.user.role === "admin") {
            if (!bodyShopId) {
                return res.status(400).json({
                    success: false,
                    message: "Shop is required!"
                });
            }
            shop_id = bodyShopId;
        }

        // CHECK SHOP
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

        // VALIDATION
        if (!name || price === undefined || price === null || !location) {
            return res.status(400).json({
                success: false,
                message: "Name, price and location are required!"
            });
        }

        // FACILITIES JSON / ARRAY PARSE
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

        if (Array.isArray(facilities)) {
            for (const item of facilities) {
                if (!item || typeof item !== "object" || !item.name || !String(item.name).trim()) {
                    return res.status(400).json({
                        success: false,
                        message: "Each facility must have a valid name!"
                    });
                }
            }
        }

        // INSERT HOTEL
        const [data] = await db.query(
            `
            INSERT INTO hotels
            (
                shop_id,
                name,
                price,
                description,
                location,
                is_active
            )
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                shop_id,
                name.trim(),
                Number(price),
                description || null,
                location.trim(),
                is_active !== undefined ? (is_active === true || is_active === "true" || is_active === 1 || is_active === "1" ? 1 : 0) : 1
            ]
        );

        const hotel_id = data.insertId;

        // INSERT FACILITIES
        if (facilities && facilities.length > 0) {
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
                        facility.description ? String(facility.description).trim() : null
                    ]
                );
            }
        }

        // EXTRA HOTEL IMAGES
        const hotelImages = [
            ...(req.files?.images || []),
            ...(req.files?.hotel_imagess || [])
        ];
        if (hotelImages.length > 0) {
            const hotelFolder = path.join(process.cwd(), "images", "hotel_images");
            if (!fs.existsSync(hotelFolder)) {
                fs.mkdirSync(hotelFolder, { recursive: true });
            }

            for (const file of hotelImages) {
                const fileName = `${uuid()}.webp`;
                const savePath = path.join(hotelFolder, fileName);

                await sharp(file.buffer)
                    .resize({ width: 1920, withoutEnlargement: true })
                    .webp({ quality: 90 })
                    .toFile(savePath);

                const extraImagePath = `images/hotel_image/${fileName}`;

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
                        extraImagePath
                    ]
                );
            }
        }

        return res.status(201).json({
            success: true,
            message: "Hotel created successfully.",
            hotel_id: hotel_id,
            shop_id: shop_id
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// =========================================================================
// SEARCH HOTEL
// =========================================================================
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

        const keyword = `%${search.trim()}%`;

        const [data] = await db.query(
            `
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
                h.is_active
            FROM hotels h
            LEFT JOIN shops s ON h.shop_id = s.id
            WHERE h.name LIKE ? OR h.location LIKE ? OR h.description LIKE ?
            ORDER BY h.id DESC
            `,
            [keyword, keyword, keyword]
        );

        for (const hotel of data) {
            const [facilities] = await db.query(
                `
                SELECT id, name, description
                FROM hotel_facilities
                WHERE hotel_id = ?
                ORDER BY id ASC
                `,
                [hotel.id]
            );
            hotel.facilities = facilities;

            const [images] = await db.query(
                `
                SELECT id, image 
                FROM hotel_images
                WHERE hotel_id = ?
                ORDER BY id ASC
                `,
                [hotel.id]
            );
            hotel.images = images;
        }

        return res.status(200).json({
            message: "Search Success",
            success: true,
            count: data.length,
            data
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// =========================================================================
// FILTER HOTEL
// =========================================================================
export const hotelFilter = asyncHandel(async (req, res) => {
    try {
        const { location = "", name = "" } = req.query;
        let sql = `
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
                h.is_active
            FROM hotels h
            LEFT JOIN shops s ON h.shop_id = s.id
            WHERE 1=1
        `;
        const values = [];
        if (location) {
            sql += ` AND h.location LIKE ?`;
            values.push(`%${location}%`);
        }
        if (name) {
            sql += ` AND h.name LIKE ?`;
            values.push(`%${name}%`);
        }
        sql += ` ORDER BY h.id DESC`;

        const [data] = await db.query(sql, values);

        for (const hotel of data) {
            const [facilities] = await db.query(
                `
                SELECT id, name, description
                FROM hotel_facilities
                WHERE hotel_id = ?
                ORDER BY id ASC
                `,
                [hotel.id]
            );
            hotel.facilities = facilities;

            const [images] = await db.query(
                `
                SELECT id, image 
                FROM hotel_images
                WHERE hotel_id = ?
                ORDER BY id ASC
                `,
                [hotel.id]
            );
            hotel.images = images;
        }

        return res.status(200).json({
            success: true,
            count: data.length,
            hotel: data,
            data: data
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// =========================================================================
// HOTEL LIST
// =========================================================================
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
                    h.is_active
                FROM hotels h
                LEFT JOIN shops s
                    ON h.shop_id = s.id
                ORDER BY h.id DESC
            `;
        } else if (req.user.role === "shop") {
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
                    h.is_active
                FROM hotels h
                LEFT JOIN shops s
                    ON h.shop_id = s.id
                WHERE h.shop_id = ?
                ORDER BY h.id DESC
            `;
            params = [shop[0].id];
        } else {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        const [data] = await db.query(query, params);

        for (const hotel of data) {
            const [facilities] = await db.query(
                `
                SELECT id, name, description
                FROM hotel_facilities
                WHERE hotel_id = ?
                ORDER BY id ASC
                `,
                [hotel.id]
            );
            hotel.facilities = facilities;

            const [images] = await db.query(
                `
                SELECT id, image 
                FROM hotel_images
                WHERE hotel_id = ?
                ORDER BY id ASC
                `,
                [hotel.id]
            );
            hotel.images = images;
        }

        return res.status(200).json({
            success: true,
            count: data.length,
            data
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// =========================================================================
// UPDATE HOTEL
// =========================================================================
export const hotelUpdate = asyncHandel(async (req, res) => {
    try {
        const { id } = req.params;
        const hotelId = Number(id);

        if (!Number.isInteger(hotelId) || hotelId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid hotel id!"
            });
        }

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

        // FIND EXISTING HOTEL
        let hotelQuery = `SELECT * FROM hotels WHERE id = ?`;
        let hotelParams = [hotelId];

        if (req.user.role === "shop") {
            hotelQuery += ` AND shop_id = ?`;
            hotelParams.push(shop_id);
        }

        const [hotel] = await db.query(hotelQuery, hotelParams);
        if (hotel.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Hotel not found!"
            });
        }

        const oldHotel = hotel[0];

        let {
            name,
            price,
            description,
            facilities,
            location,
            is_active,
            deleted_images,
            deleted_image_ids
        } = req.body;

        // Parse facilities
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

        if (facilities !== undefined && !Array.isArray(facilities)) {
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
                    typeof facility.name !== "string" ||
                    !facility.name.trim()
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Each facility must have a valid name!"
                    });
                }
            }
        }

        // FIELD UPDATES
        const updatedName = name !== undefined ? name.trim() : oldHotel.name;
        const updatedPrice = price !== undefined ? Number(price) : oldHotel.price;
        const updatedDescription = description !== undefined ? (description ? description.trim() : null) : oldHotel.description;
        const updatedLocation = location !== undefined ? location.trim() : oldHotel.location;

        let updatedIsActive = oldHotel.is_active;
        if (is_active !== undefined) {
            if (is_active === true || is_active === 1 || is_active === "1" || is_active === "true") {
                updatedIsActive = 1;
            } else if (is_active === false || is_active === 0 || is_active === "0" || is_active === "false") {
                updatedIsActive = 0;
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Invalid is_active value!"
                });
            }
        }

        // UPDATE HOTEL ROW
        await db.query(
            `
            UPDATE hotels
            SET
                name = ?,
                price = ?,
                description = ?,
                location = ?,
                is_active = ?
            WHERE id = ?
            `,
            [
                updatedName,
                updatedPrice,
                updatedDescription,
                updatedLocation,
                updatedIsActive,
                hotelId
            ]
        );

        // =========================================================================
        // FACILITIES UPDATE (ACCURATE ID MATCHING & ORDERING)
        // =========================================================================
        if (Array.isArray(facilities)) {
            const [oldFacilities] = await db.query(
                `
                SELECT id, name, description
                FROM hotel_facilities
                WHERE hotel_id = ?
                ORDER BY id ASC
                `,
                [hotelId]
            );

            const oldFacilitiesMap = new Map();
            for (const f of oldFacilities) {
                oldFacilitiesMap.set(f.id, f);
            }

            const hasExplicitIds = facilities.some(f => f.id !== undefined && f.id !== null && f.id !== "");

            if (hasExplicitIds) {
                const handledIds = new Set();

                for (const facility of facilities) {
                    const facilityId = Number(facility.id);

                    if (Number.isInteger(facilityId) && oldFacilitiesMap.has(facilityId)) {
                        // Update existing facility by exact ID
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
                                facility.name.trim(),
                                facility.description ? String(facility.description).trim() : null,
                                facilityId,
                                hotelId
                            ]
                        );
                        handledIds.add(facilityId);
                    } else {
                        // Insert new facility
                        const [inserted] = await db.query(
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
                                hotelId,
                                facility.name.trim(),
                                facility.description ? String(facility.description).trim() : null
                            ]
                        );
                        handledIds.add(inserted.insertId);
                    }
                }

                // Delete old facilities not included in the update
                const deleteIds = oldFacilities
                    .map(f => f.id)
                    .filter(id => !handledIds.has(id));

                if (deleteIds.length > 0) {
                    await db.query(
                        `
                        DELETE FROM hotel_facilities
                        WHERE hotel_id = ?
                        AND id IN (?)
                        `,
                        [hotelId, deleteIds]
                    );
                }
            } else {
                // If Flutter sent facilities array without explicit IDs, update sequentially by ASC order
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
                                facility.name.trim(),
                                facility.description ? String(facility.description).trim() : null,
                                oldFacilities[i].id,
                                hotelId
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
                                hotelId,
                                facility.name.trim(),
                                facility.description ? String(facility.description).trim() : null
                            ]
                        );
                    }
                }

                if (facilities.length < oldFacilities.length) {
                    const deleteIds = oldFacilities
                        .slice(facilities.length)
                        .map(item => item.id);

                    if (deleteIds.length > 0) {
                        await db.query(
                            `
                            DELETE FROM hotel_facilities
                            WHERE hotel_id = ?
                            AND id IN (?)
                            `,
                            [hotelId, deleteIds]
                        );
                    }
                }
            }
        }

        // =========================================================================
        // EXTRA / GALLERY IMAGES HANDLING
        // =========================================================================
        // 1. Check if specific images should be deleted
        const rawDeletedIds = parseArrayField(deleted_images || deleted_image_ids);
        if (rawDeletedIds && rawDeletedIds.length > 0) {
            const idsToDelete = rawDeletedIds.map(Number).filter(id => Number.isInteger(id) && id > 0);

            if (idsToDelete.length > 0) {
                const [targetImages] = await db.query(
                    `
                    SELECT id, image
                    FROM hotel_images
                    WHERE hotel_id = ?
                    AND id IN (?)
                    `,
                    [hotelId, idsToDelete]
                );

                for (const img of targetImages) {
                    if (img.image) {
                        const imgPath = path.join(process.cwd(), img.image);
                        if (fs.existsSync(imgPath)) {
                            try {
                                fs.unlinkSync(imgPath);
                            } catch (e) {
                                console.error("Failed to delete gallery image file:", e);
                            }
                        }
                    }
                }

                await db.query(
                    `
                    DELETE FROM hotel_images
                    WHERE hotel_id = ?
                    AND id IN (?)
                    `,
                    [hotelId, idsToDelete]
                );
            }
        }

        // 2. Upload and insert new gallery images (if provided)
        const hotelImages = [
            ...(req.files?.images || []),
            ...(req.files?.hotel_imagess || [])
        ];
        if (hotelImages.length > 0) {
            const hotelFolder = path.join(process.cwd(), "images", "hotel_images");
            if (!fs.existsSync(hotelFolder)) {
                fs.mkdirSync(hotelFolder, { recursive: true });
            }

            for (const file of hotelImages) {
                const fileName = `${uuid()}.webp`;
                const savePath = path.join(hotelFolder, fileName);

                await sharp(file.buffer)
                    .resize({ width: 1920, withoutEnlargement: true })
                    .webp({ quality: 90 })
                    .toFile(savePath);

                const newImagePath = `images/hotel_image/${fileName}`;

                await db.query(
                    `
                    INSERT INTO hotel_images
                    (
                        hotel_id,
                        image
                    )
                    VALUES (?, ?)
                    `,
                    [hotelId, newImagePath]
                );
            }
        }

        // FETCH UPDATED FACILITIES AND IMAGES FOR RESPONSE
        const [updatedFacilities] = await db.query(
            `
            SELECT id, name, description
            FROM hotel_facilities
            WHERE hotel_id = ?
            ORDER BY id ASC
            `,
            [hotelId]
        );

        const [updatedImages] = await db.query(
            `
            SELECT id, image
            FROM hotel_images
            WHERE hotel_id = ?
            ORDER BY id ASC
            `,
            [hotelId]
        );

        return res.status(200).json({
            success: true,
            message: "Hotel Updated Successfully",
            data: {
                id: hotelId,
                hotel_id: hotelId,
                shop_id: oldHotel.shop_id,
                name: updatedName,
                price: updatedPrice,
                description: updatedDescription,
                location: updatedLocation,
                is_active: Boolean(updatedIsActive),
                facilities: updatedFacilities,
                images: updatedImages
            }
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// =========================================================================
// DELETE HOTEL
// =========================================================================
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
        let hotelQuery = `SELECT * FROM hotels WHERE id = ?`;
        let hotelParams = [id];

        if (req.user.role === "shop") {
            hotelQuery += ` AND shop_id = ?`;
            hotelParams.push(shop_id);
        }

        const [hotel] = await db.query(hotelQuery, hotelParams);
        if (hotel.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Hotel not found!"
            });
        }

        // DELETE EXTRA HOTEL IMAGES
        const [images] = await db.query(
            `
            SELECT image
            FROM hotel_images
            WHERE hotel_id = ?
            `,
            [id]
        );

        for (const img of images) {
            if (img.image) {
                const imagePath = path.join(process.cwd(), img.image);
                if (fs.existsSync(imagePath)) {
                    try {
                        fs.unlinkSync(imagePath);
                    } catch (e) {
                        console.error("Failed to unlink hotel extra image:", e);
                    }
                }
            }
        }

        // DELETE HOTEL FACILITIES & HOTEL IMAGES & HOTEL
        await db.query(`DELETE FROM hotel_facilities WHERE hotel_id = ?`, [id]);
        await db.query(`DELETE FROM hotel_images WHERE hotel_id = ?`, [id]);
        await db.query(`DELETE FROM hotels WHERE id = ?`, [id]);

        return res.status(200).json({
            success: true,
            message: "Hotel deleted successfully"
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// =========================================================================
// HOTEL SHOP LIST (MOBILE & ADMIN)
// =========================================================================
export const hotelShopList = asyncHandel(async (req, res) => {
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
                    s.type,
                    s.is_active,
                    s.user_id,
                    u.image
                FROM shops s
                JOIN users u ON s.user_id = u.id
                WHERE s.type = 'hotel'
                ORDER BY s.id DESC
            `;
        } else if (req.user.role === "shop") {
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
        } else if (req.user.role === "user") {
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
        } else {
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
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// =========================================================================
// HOTEL SHOP DETAILS (FOR SPECIFIC SHOP)
// =========================================================================
export const hotelShopDetails = asyncHandel(async (req, res) => {
    try {
        const { id } = req.params;
        const [data] = await db.query(
            `
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
                h.is_active
            FROM hotels h
            INNER JOIN shops s ON h.shop_id = s.id
            INNER JOIN users u ON s.user_id = u.id
            WHERE h.shop_id = ?
            AND s.status = 'approved'
            AND s.type = 'hotel'
            AND h.is_active = true
            ORDER BY h.id DESC
            `,
            [id]
        );

        if (data.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Hotel Not Found!"
            });
        }

        for (const hotel of data) {
            const [facilities] = await db.query(
                `
                SELECT id, name, description
                FROM hotel_facilities
                WHERE hotel_id = ?
                ORDER BY id ASC
                `,
                [hotel.id]
            );
            hotel.facilities = facilities;

            const [images] = await db.query(
                `
                SELECT id, image
                FROM hotel_images
                WHERE hotel_id = ?
                ORDER BY id ASC
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
            facilities: hotel.facilities,
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
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// =========================================================================
// HOTEL DETAILS (SINGLE HOTEL BY ID)
// =========================================================================
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
                s.shop_name,
                s.shop_phone,
                s.shop_address,
                s.is_active AS shop_is_active,
                s.location AS shop_location
            FROM hotels h
            INNER JOIN shops s ON h.shop_id = s.id
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
            SELECT id, name, description
            FROM hotel_facilities
            WHERE hotel_id = ?
            ORDER BY id ASC
            `,
            [hotel.id]
        );

        const [images] = await db.query(
            `
            SELECT id, image
            FROM hotel_images
            WHERE hotel_id = ?
            ORDER BY id ASC
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
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
