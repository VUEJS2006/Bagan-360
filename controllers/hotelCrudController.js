import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";

const parseFacilities = (value) => {
    if (value === undefined) return undefined;

    let facilities = value;
    if (typeof facilities === "string") {
        try {
            facilities = JSON.parse(facilities);
        } catch {
            throw new Error("Invalid facilities format!");
        }
    }

    if (!Array.isArray(facilities)) {
        throw new Error("Facilities must be an array!");
    }

    for (const facility of facilities) {
        if (
            !facility ||
            typeof facility !== "object" ||
            typeof facility.name !== "string" ||
            !facility.name.trim()
        ) {
            throw new Error("Each facility must have a valid name!");
        }
    }

    return facilities;
};

const parseBoolean = (value, fieldName) => {
    if (value === true || value === 1 || value === "1" || value === "true") return 1;
    if (value === false || value === 0 || value === "0" || value === "false") return 0;
    throw new Error(`Invalid ${fieldName} value!`);
};

const isEnabled = (value) => value === true || value === 1 || value === "1" || value === "true";

const parsePrice = (value) => {
    const price = Number(value);
    if (!Number.isFinite(price) || price < 0) {
        throw new Error("Price must be a valid non-negative number!");
    }
    return price;
};

const storeImage = async (file, folderName, createdFiles) => {
    const folder = path.join(process.cwd(), "images", folderName);
    await fs.promises.mkdir(folder, { recursive: true });

    const fileName = `${uuid()}.webp`;
    const absolutePath = path.join(folder, fileName);
    await sharp(file.buffer)
        .resize({ width: 1920, withoutEnlargement: true })
        .webp({ quality: 90 })
        .toFile(absolutePath);

    createdFiles.push(absolutePath);
    return `images/${folderName}/${fileName}`;
};

const removeFiles = async (files) => {
    for (const file of files) {
        try {
            await fs.promises.unlink(file);
        } catch (error) {
            if (error.code !== "ENOENT") {
                console.error("Failed to remove hotel image:", error);
            }
        }
    }
};

const toAbsoluteImagePath = (image) => path.join(process.cwd(), image);

const getShopForCreate = async (connection, req) => {
    if (!["admin", "shop"].includes(req.user.role)) {
        return { error: { status: 403, message: "Access denied!" } };
    }

    let shopId;
    if (req.user.role === "shop") {
        const [shops] = await connection.query(
            "SELECT id, type FROM shops WHERE user_id = ?",
            [req.user.id]
        );
        if (shops.length === 0) {
            return { error: { status: 404, message: "Shop not found!" } };
        }
        if (shops[0].type !== "hotel") {
            return { error: { status: 400, message: "This shop is not a hotel!" } };
        }
        shopId = shops[0].id;
    } else {
        shopId = req.body.shop_id;
        if (!shopId || !Number.isInteger(Number(shopId)) || Number(shopId) <= 0) {
            return { error: { status: 400, message: "Shop is required!" } };
        }
        shopId = Number(shopId);
    }

    const [shops] = await connection.query(
        "SELECT id FROM shops WHERE id = ? AND type = 'hotel'",
        [shopId]
    );
    if (shops.length === 0) {
        return { error: { status: 404, message: "Hotel shop not found!" } };
    }

    return { shopId };
};

export const hotelCreate = asyncHandel(async (req, res) => {
    let connection;
    const createdFiles = [];

    try {
        const { name, price, description, location } = req.body;
        if (
            typeof name !== "string" ||
            !name.trim() ||
            price === undefined ||
            typeof location !== "string" ||
            !location.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Name, price and location are required!"
            });
        }

        let facilities;
        let parsedPrice;
        let isActive = 1;
        try {
            facilities = parseFacilities(req.body.facilities);
            parsedPrice = parsePrice(price);
            if (req.body.is_active !== undefined) {
                isActive = parseBoolean(req.body.is_active, "is_active");
            }
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        connection = await db.getConnection();
        const shopResult = await getShopForCreate(connection, req);
        if (shopResult.error) {
            return res.status(shopResult.error.status).json({
                success: false,
                message: shopResult.error.message
            });
        }

        await connection.beginTransaction();
        const mainImage = req.files?.image?.[0];
        const imagePath = mainImage
            ? await storeImage(mainImage, "hotel", createdFiles)
            : null;

        const [hotelResult] = await connection.query(
            `INSERT INTO hotels
                (shop_id, name, price, description, image, location, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                shopResult.shopId,
                name.trim(),
                parsedPrice,
                typeof description === "string" && description.trim() ? description.trim() : null,
                imagePath,
                location.trim(),
                isActive
            ]
        );
        const hotelId = hotelResult.insertId;

        for (const facility of facilities || []) {
            await connection.query(
                `INSERT INTO hotel_facilities (hotel_id, name, description)
                 VALUES (?, ?, ?)`,
                [
                    hotelId,
                    facility.name.trim(),
                    typeof facility.description === "string" && facility.description.trim()
                        ? facility.description.trim()
                        : null
                ]
            );
        }

        const hotelImages = req.files?.hotel_images || [];
        for (const file of hotelImages) {
            const image = await storeImage(file, "hotel_image", createdFiles);
            await connection.query(
                "INSERT INTO hotel_images (hotel_id, image) VALUES (?, ?)",
                [hotelId, image]
            );
        }

        await connection.commit();
        return res.status(201).json({
            success: true,
            message: "Hotel created successfully.",
            hotel_id: hotelId,
            shop_id: shopResult.shopId
        });
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("Failed to roll back hotel creation:", rollbackError);
            }
        }
        await removeFiles(createdFiles);
        console.error(error);
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        connection?.release();
    }
});

export const hotelUpdate = asyncHandel(async (req, res) => {
    let connection;
    const createdFiles = [];
    let oldFilesToRemove = [];

    try {
        const hotelId = Number(req.params.id);
        if (!Number.isInteger(hotelId) || hotelId <= 0) {
            return res.status(400).json({ success: false, message: "Invalid hotel id!" });
        }
        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: "Access denied!" });
        }

        let facilities;
        let updatedPrice;
        let updatedIsActive;
        try {
            facilities = parseFacilities(req.body.facilities);
            if (req.body.price !== undefined) updatedPrice = parsePrice(req.body.price);
            if (req.body.is_active !== undefined) {
                updatedIsActive = parseBoolean(req.body.is_active, "is_active");
            }
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        if (req.body.name !== undefined &&
            (typeof req.body.name !== "string" || !req.body.name.trim())) {
            return res.status(400).json({ success: false, message: "Name cannot be empty!" });
        }
        if (req.body.location !== undefined &&
            (typeof req.body.location !== "string" || !req.body.location.trim())) {
            return res.status(400).json({ success: false, message: "Location cannot be empty!" });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        let hotelQuery = "SELECT * FROM hotels WHERE id = ?";
        const hotelParams = [hotelId];
        if (req.user.role === "shop") {
            const [shops] = await connection.query(
                "SELECT id, type FROM shops WHERE user_id = ?",
                [req.user.id]
            );
            if (shops.length === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: "Shop not found!" });
            }
            if (shops[0].type !== "hotel") {
                await connection.rollback();
                return res.status(400).json({ success: false, message: "This shop is not a hotel!" });
            }
            hotelQuery += " AND shop_id = ?";
            hotelParams.push(shops[0].id);
        }
        hotelQuery += " FOR UPDATE";

        const [hotels] = await connection.query(hotelQuery, hotelParams);
        if (hotels.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: "Hotel not found!" });
        }

        const oldHotel = hotels[0];
        const oldMainImage = oldHotel.image;
        const oldGalleryImages = [];
        const mainImage = req.files?.image?.[0];
        const updatedImage = mainImage
            ? await storeImage(mainImage, "hotel", createdFiles)
            : isEnabled(req.body.remove_image)
                ? null
                : oldHotel.image;

        const updatedName = req.body.name === undefined ? oldHotel.name : req.body.name.trim();
        const updatedLocation = req.body.location === undefined
            ? oldHotel.location
            : req.body.location.trim();
        const updatedDescription = req.body.description === undefined
            ? oldHotel.description
            : typeof req.body.description === "string" && req.body.description.trim()
                ? req.body.description.trim()
                : null;

        await connection.query(
            `UPDATE hotels
             SET name = ?, price = ?, description = ?, image = ?, location = ?, is_active = ?
             WHERE id = ?`,
            [
                updatedName,
                updatedPrice === undefined ? oldHotel.price : updatedPrice,
                updatedDescription,
                updatedImage,
                updatedLocation,
                updatedIsActive === undefined ? oldHotel.is_active : updatedIsActive,
                hotelId
            ]
        );

        if (facilities !== undefined) {
            await connection.query("DELETE FROM hotel_facilities WHERE hotel_id = ?", [hotelId]);
            for (const facility of facilities) {
                await connection.query(
                    `INSERT INTO hotel_facilities (hotel_id, name, description)
                     VALUES (?, ?, ?)`,
                    [
                        hotelId,
                        facility.name.trim(),
                        typeof facility.description === "string" && facility.description.trim()
                            ? facility.description.trim()
                            : null
                    ]
                );
            }
        }

        const hotelImages = req.files?.hotel_images || [];
        const replaceGallery = isEnabled(req.body.replace_hotel_images);
        if (hotelImages.length > 0 || replaceGallery) {
            const [oldImages] = await connection.query(
                "SELECT image FROM hotel_images WHERE hotel_id = ?",
                [hotelId]
            );
            oldGalleryImages.push(...oldImages.map(({ image }) => image).filter(Boolean));
            await connection.query("DELETE FROM hotel_images WHERE hotel_id = ?", [hotelId]);

            for (const file of hotelImages) {
                const image = await storeImage(file, "hotel_image", createdFiles);
                await connection.query(
                    "INSERT INTO hotel_images (hotel_id, image) VALUES (?, ?)",
                    [hotelId, image]
                );
            }
        }

        const [updatedFacilities] = await connection.query(
            `SELECT id, name, description FROM hotel_facilities
             WHERE hotel_id = ? ORDER BY id ASC`,
            [hotelId]
        );
        const [updatedImages] = await connection.query(
            `SELECT id, image FROM hotel_images
             WHERE hotel_id = ? ORDER BY id ASC`,
            [hotelId]
        );

        await connection.commit();
        oldFilesToRemove = [
            ...(oldMainImage && oldMainImage !== updatedImage ? [oldMainImage] : []),
            ...oldGalleryImages
        ];
        await removeFiles(oldFilesToRemove.map(toAbsoluteImagePath));

        return res.status(200).json({
            success: true,
            message: "Hotel updated successfully.",
            data: {
                id: hotelId,
                hotel_id: hotelId,
                shop_id: oldHotel.shop_id,
                name: updatedName,
                price: updatedPrice === undefined ? oldHotel.price : updatedPrice,
                description: updatedDescription,
                image: updatedImage,
                location: updatedLocation,
                is_active: Boolean(updatedIsActive === undefined ? oldHotel.is_active : updatedIsActive),
                facilities: updatedFacilities,
                images: updatedImages
            }
        });
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("Failed to roll back hotel update:", rollbackError);
            }
        }
        await removeFiles(createdFiles);
        console.error(error);
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        connection?.release();
    }
});
