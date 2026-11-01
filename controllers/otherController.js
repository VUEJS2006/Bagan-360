import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";


const saveOtherImage = async (file, uploadFolder) => {
    if (!file) return null;

    if (!fs.existsSync(uploadFolder)) {
        fs.mkdirSync(uploadFolder, {
            recursive: true
        });
    }

    const fileName = `${uuid()}.webp`;

    await sharp(file.buffer)
        .resize({
            width: 1920,
            withoutEnlargement: true
        })
        .webp({
            quality: 90
        })
        .toFile(path.join(uploadFolder, fileName));

    return `images/other/${fileName}`;
};

export const otherCreate = asyncHandel(async (req, res) => {
    try {
        let shop_id = null;

        const {
            shop_id: bodyShopId,
            price_from,
            price_to,
            description,
            name,
            is_active = true,
            location,
            status = "available"
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

            if (shops[0].type !== "other") {
                return res.status(403).json({
                    success: false,
                    message: "This shop is not an Other shop!"
                });
            }

            shop_id = shops[0].id;
        }

        if (req.user.role === "admin") {
            if (
                !bodyShopId ||
                !Number.isInteger(Number(bodyShopId)) ||
                Number(bodyShopId) <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Valid shop_id is required!"
                });
            }

            const [shops] = await db.query(
                `
                SELECT id, type
                FROM shops
                WHERE id = ?
                `,
                [Number(bodyShopId)]
            );

            if (shops.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Shop not found!"
                });
            }

            if (shops[0].type !== "other") {
                return res.status(400).json({
                    success: false,
                    message: "Selected shop is not an Other shop!"
                });
            }

            shop_id = shops[0].id;
        }

        if (
            price_from === undefined ||
            price_from === null ||
            price_to === undefined ||
            price_to === null ||
            !name ||
            !location
        ) {
            return res.status(400).json({
                success: false,
                message: "All required fields must be provided!"
            });
        }

        const priceFrom = Number(price_from);
        const priceTo = Number(price_to);

        if (
            !Number.isFinite(priceFrom) ||
            !Number.isFinite(priceTo) ||
            priceFrom < 0 ||
            priceTo < priceFrom
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid price range!"
            });
        }

        if (!["available", "unavailable"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status!"
            });
        }

        let activeValue;

        if (
            is_active === true ||
            is_active === "true" ||
            is_active === 1 ||
            is_active === "1"
        ) {
            activeValue = 1;
        } else if (
            is_active === false ||
            is_active === "false" ||
            is_active === 0 ||
            is_active === "0"
        ) {
            activeValue = 0;
        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid is_active value!"
            });
        }

        const uploadFolder = path.join(
            process.cwd(),
            "images",
            "other"
        );

        const other_image1 = await saveOtherImage(
            req.files?.other_image1?.[0],
            uploadFolder
        );

        const other_image2 = await saveOtherImage(
            req.files?.other_image2?.[0],
            uploadFolder
        );

        const other_image3 = await saveOtherImage(
            req.files?.other_image3?.[0],
            uploadFolder
        );

        const [data] = await db.query(
            `
            INSERT INTO others
            (
                shop_id,
                price_from,
                price_to,
                description,
                name,
                other_image1,
                other_image2,
                other_image3,
                location,
                status,
                is_active
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                shop_id,
                priceFrom,
                priceTo,
                description || null,
                name,
                other_image1,
                other_image2,
                other_image3,
                location,
                status,
                activeValue
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Other created successfully!",
            id: data.insertId
        });

    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export const otherList = asyncHandel(async (req, res) => {
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
                    o.id,
                    o.shop_id,
                    o.price_from,
                    o.price_to,
                    o.description,
                    o.name,
                    o.other_image1,
                    o.other_image2,
                    o.other_image3,
                    o.status,
                    o.is_active,
                    o.location,
                    o.created_at,
                    o.updated_at,
                    s.shop_name,
                    s.shop_address,
                    s.shop_phone
                FROM others o
                LEFT JOIN shops s
                    ON o.shop_id = s.id
                ORDER BY o.id DESC
            `;
        } else {
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

            if (shops[0].type !== "other") {
                return res.status(403).json({
                    success: false,
                    message: "This shop is not an Other shop!"
                });
            }

            query = `
                SELECT
                    o.id,
                    o.shop_id,
                    o.price_from,
                    o.price_to,
                    o.description,
                    o.name,
                    o.other_image1,
                    o.other_image2,
                    o.other_image3,
                    o.status,
                    o.is_active,
                    o.location,
                    o.created_at,
                    o.updated_at,
                    s.shop_name,
                    s.shop_address,
                    s.shop_phone
                FROM others o
                LEFT JOIN shops s
                    ON o.shop_id = s.id
                WHERE o.shop_id = ?
                ORDER BY o.id DESC
            `;

            params = [shops[0].id];
        }

        const [data] = await db.query(query, params);

        return res.status(200).json({
            success: true,
            message: "Other list success!",
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


export const otherUpdate = asyncHandel(async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid Other id is required!"
            });
        }

        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        const {
            price_from,
            price_to,
            description,
            name,
            is_active,
            location,
            status
        } = req.body;

        const [others] = await db.query(
            `SELECT * FROM others WHERE id = ?`,
            [id]
        );

        if (others.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Other not found!"
            });
        }

        const currentOther = others[0];

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

            if (shops[0].type !== "other") {
                return res.status(403).json({
                    success: false,
                    message: "This shop is not an Other shop!"
                });
            }

            if (Number(currentOther.shop_id) !== Number(shops[0].id)) {
                return res.status(403).json({
                    success: false,
                    message: "You can only update your own Other!"
                });
            }
        }

        const finalPriceFrom =
            price_from !== undefined ? Number(price_from) : Number(currentOther.price_from);

        const finalPriceTo =
            price_to !== undefined ? Number(price_to) : Number(currentOther.price_to);

        if (
            !Number.isFinite(finalPriceFrom) ||
            !Number.isFinite(finalPriceTo) ||
            finalPriceFrom < 0 ||
            finalPriceTo < finalPriceFrom
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid price range!"
            });
        }

        const finalStatus = status !== undefined ? status : currentOther.status;

        if (!["available", "unavailable"].includes(finalStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status!"
            });
        }

        let finalActive = currentOther.is_active;

        if (is_active !== undefined) {
            if (
                is_active === true ||
                is_active === "true" ||
                is_active === 1 ||
                is_active === "1"
            ) {
                finalActive = 1;
            } else if (
                is_active === false ||
                is_active === "false" ||
                is_active === 0 ||
                is_active === "0"
            ) {
                finalActive = 0;
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Invalid is_active value!"
                });
            }
        }

        const uploadFolder = path.join(
            process.cwd(),
            "images",
            "other"
        );

        const imageFields = [
            "other_image1",
            "other_image2",
            "other_image3"
        ];

        const updatedImages = {
            other_image1: currentOther.other_image1,
            other_image2: currentOther.other_image2,
            other_image3: currentOther.other_image3
        };

        const oldImages = [];

        for (const field of imageFields) {
            const file = req.files?.[field]?.[0];

            if (file) {
                const newImage = await saveOtherImage(
                    file,
                    uploadFolder
                );

                if (updatedImages[field]) {
                    oldImages.push(updatedImages[field]);
                }

                updatedImages[field] = newImage;
            }
        }

        const [data] = await db.query(
            `
            UPDATE others SET
                price_from = ?,
                price_to = ?,
                description = ?,
                name = ?,
                location = ?,
                other_image1 = ?,
                other_image2 = ?,
                other_image3 = ?,
                status = ?,
                is_active = ?
            WHERE id = ?
            `,
            [
                finalPriceFrom,
                finalPriceTo,
                description !== undefined ? description : currentOther.description,
                name !== undefined ? name : currentOther.name,
                location !== undefined ? location : currentOther.location,
                updatedImages.other_image1,
                updatedImages.other_image2,
                updatedImages.other_image3,
                finalStatus,
                finalActive,
                id
            ]
        );

        for (const oldImage of oldImages) {
            const oldImagePath = path.join(process.cwd(), oldImage);

            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        return res.status(200).json({
            success: true,
            message: "Other updated successfully!",
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



export const otherDelete = asyncHandel(async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid Other id is required!"
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

            if (shops[0].type !== "other") {
                return res.status(403).json({
                    success: false,
                    message: "This shop is not an Other shop!"
                });
            }

            shop_id = shops[0].id;
        }

        let query = `
            SELECT
                id,
                shop_id,
                other_image1,
                other_image2,
                other_image3
            FROM others
            WHERE id = ?
        `;

        const params = [id];

        if (req.user.role === "shop") {
            query += ` AND shop_id = ?`;
            params.push(shop_id);
        }

        const [others] = await db.query(query, params);

        if (others.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Other not found!"
            });
        }

        const currentOther = others[0];

        await db.query(
            `DELETE FROM others WHERE id = ?`,
            [id]
        );

        const images = [
            currentOther.other_image1,
            currentOther.other_image2,
            currentOther.other_image3
        ];

        for (const image of images) {
            if (image) {
                const imagePath = path.join(process.cwd(), image);

                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }
        }

        return res.status(200).json({
            success: true,
            message: "Other deleted successfully!"
        });

    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export const otherShopList = asyncHandel(async (req, res) => {
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
                WHERE s.type = 'other'
                ORDER BY s.id DESC
            `;
        } else if (req.user.role === "shop") {
            const [shops] = await db.query(
                `
                SELECT id, type
                FROM shops
                WHERE user_id = ?
                AND type = 'other'
                `,
                [req.user.id]
            );

            if (shops.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Other shop not found!"
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
                    s.is_active,
                    s.user_id,
                    u.image
                FROM shops s
                JOIN users u ON s.user_id = u.id
                WHERE s.id = ?
                ORDER BY s.id DESC
            `;

            params = [shops[0].id];

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
                    s.user_id,
                    u.image
                FROM shops s
                JOIN users u ON s.user_id = u.id
                WHERE s.type = 'other'
                AND s.status = 'approved'
                AND s.is_active = 1
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
            message: "Other Shop Data Success",
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


export const otherShopDetails = asyncHandel(async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Shop id is required!"
            });
        }

        const [data] = await db.query(
            `
            SELECT
                o.id,
                o.shop_id,
                s.shop_name,
                s.shop_phone,
                s.shop_address,
                s.location AS shop_location,
                s.user_id,
                u.image AS user_image,
                o.price_from,
                o.price_to,
                o.description,
                o.name,
                o.other_image1,
                o.other_image2,
                o.other_image3,
                o.status,
                o.is_active,
                o.location

            FROM others o

            INNER JOIN shops s
                ON o.shop_id = s.id

            INNER JOIN users u
                ON s.user_id = u.id

            WHERE o.shop_id = ?
            AND s.status = 'approved'
            AND s.is_active = 1
            AND s.type = 'other'
            AND o.is_active = 1

            ORDER BY o.id DESC
            `,
            [Number(id)]
        );

        if (data.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Other Not Found!"
            });
        }

        const shop = {
            shop_id: data[0].shop_id,
            shop_name: data[0].shop_name,
            shop_phone: data[0].shop_phone,
            shop_address: data[0].shop_address,
            shop_location: data[0].shop_location,
            user_id: data[0].user_id,
            user_image: data[0].user_image
        };

        const others = data.map(item => ({
            id: item.id,
            name: item.name,
            price_from: item.price_from,
            price_to: item.price_to,
            description: item.description,
            other_image1: item.other_image1,
            other_image2: item.other_image2,
            other_image3: item.other_image3,
            status: item.status,
            is_active: item.is_active,
            location: item.location
        }));

        return res.status(200).json({
            success: true,
            message: "Other Shop Details Success",
            count: others.length,
            data: {
                shop,
                others
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


export const otherDetails = asyncHandel(async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid Other id is required!"
            });
        }

        const [data] = await db.query(
            `
            SELECT
                o.id,
                o.shop_id,
                o.name,
                o.price_from,
                o.price_to,
                o.description,
                o.location,
                o.status,
                o.is_active,
                o.other_image1,
                o.other_image2,
                o.other_image3,

                s.shop_name,
                s.shop_phone,
                s.shop_address,
                s.location AS shop_location

            FROM others o

            INNER JOIN shops s
                ON o.shop_id = s.id

            WHERE o.id = ?
            AND s.status = 'approved'
            AND s.is_active = 1
            AND s.type = 'other'
            AND o.is_active = 1
            `,
            [Number(id)]
        );

        if (data.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Other Not Found!"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Other Detail Success",
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