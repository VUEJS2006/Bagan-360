import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";


const saveAirballonImage = async (file, uploadFolder) => {
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

    return `images/airballon/${fileName}`;
};

export const airballonCreate = asyncHandel(async (req, res) => {
    try {
        let shop_id = null;

        const {
            shop_id: bodyShopId,
            price_from,
            price_to,
            dollor_from,
            dollor_to,
            guest,
            description,
            name,
            rule,
            phone1,
            phone2,
            is_active,
            location,
            status
        } = req.body;

        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        if (req.user.role === "shop") {
            const [shops] = await db.query(
                `SELECT id, type FROM shops WHERE user_id = ?`,
                [req.user.id]
            );

            if (shops.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Shop not found!"
                });
            }

            if (shops[0].type !== "air_balloon") {
                return res.status(403).json({
                    success: false,
                    message: "This shop is not an Air Balloon shop!"
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
                `SELECT id, type FROM shops WHERE id = ?`,
                [Number(bodyShopId)]
            );

            if (shops.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Shop not found!"
                });
            }

            if (shops[0].type !== "air_balloon") {
                return res.status(400).json({
                    success: false,
                    message: "Selected shop is not an Air Balloon shop!"
                });
            }

            shop_id = shops[0].id;
        }

        const requiredFields = {
            price_from,
            price_to,
            guest,
            rule,
            phone1,
            name,
            location
        };

        const missingField = Object.entries(requiredFields).some(
            ([key, value]) =>
                value === undefined ||
                value === null ||
                String(value).trim() === ""
        );

        if (missingField) {
            return res.status(400).json({
                success: false,
                message: "All required fields must be provided!"
            });
        }

        for (const [key, value] of Object.entries({
            price_from,
            price_to,
            guest
        })) {
            if (
                !Number.isFinite(Number(value)) ||
                Number(value) < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: `${key} must be a valid non-negative number!`
                });
            }
        }

        for (const [key, value] of Object.entries({
            dollor_from,
            dollor_to
        })) {
            if (
                value !== undefined &&
                value !== null &&
                value !== "" &&
                (
                    !Number.isFinite(Number(value)) ||
                    Number(value) < 0
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message: `${key} must be a valid non-negative number!`
                });
            }
        }

        const finalStatus = status || "available";

        if (!["available", "unavailable"].includes(finalStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status!"
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
            "airballon"
        );

        const airballon_image1 = await saveAirballonImage(
            req.files?.airballon_image1?.[0],
            uploadFolder
        );

        const airballon_image2 = await saveAirballonImage(
            req.files?.airballon_image2?.[0],
            uploadFolder
        );

        const airballon_image3 = await saveAirballonImage(
            req.files?.airballon_image3?.[0],
            uploadFolder
        );

        const [data] = await db.query(
            `INSERT INTO airballons
            (
                shop_id,
                price_from,
                price_to,
                dollor_from,
                dollor_to,
                description,
                guest,
                name,
                rule,
                phone1,
                phone2,
                airballon_image1,
                airballon_image2,
                airballon_image3,
                location,
                status,
                is_active
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                shop_id,
                Number(price_from),
                Number(price_to),
                dollor_from === undefined || dollor_from === ""
                    ? null
                    : dollor_from,
                dollor_to === undefined || dollor_to === ""
                    ? null
                    : dollor_to,
                description || null,
                Number(guest),
                name,
                rule,
                phone1,
                phone2 || null,
                airballon_image1,
                airballon_image2,
                airballon_image3,
                location,
                finalStatus,
                active
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Air Balloon created successfully!",
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

export const airballonList = asyncHandel(async (req, res) => {
    try {
        let query = "";
        let params = [];

        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        if (req.user.role === "admin") {
            query = `
                SELECT
                    a.id,
                    a.shop_id,
                    a.price_from,
                    a.price_to,
                    a.dollor_from,
                    a.dollor_to,
                    a.guest,
                    a.description,
                    a.rule,
                    a.name,
                    a.phone1,
                    a.phone2,
                    a.airballon_image1,
                    a.airballon_image2,
                    a.airballon_image3,
                    a.status,
                    a.is_active,
                    a.location,
                    s.shop_name,
                    s.shop_address,
                    s.shop_phone
                FROM airballons a
                LEFT JOIN shops s ON a.shop_id = s.id
                ORDER BY a.id DESC
            `;
        } else {
            const [shops] = await db.query(
                `SELECT id, type FROM shops WHERE user_id = ?`,
                [req.user.id]
            );

            if (shops.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Shop not found!"
                });
            }

            if (shops[0].type !== "air_balloon") {
                return res.status(403).json({
                    success: false,
                    message: "This shop is not an Air Balloon shop!"
                });
            }

            query = `
                SELECT
                    a.id,
                    a.shop_id,
                    a.price_from,
                    a.price_to,
                    a.dollor_from,
                    a.dollor_to,
                    a.guest,
                    a.description,
                    a.rule,
                    a.name,
                    a.phone1,
                    a.phone2,
                    a.airballon_image1,
                    a.airballon_image2,
                    a.airballon_image3,
                    a.status,
                    a.is_active,
                    a.location,
                    s.shop_name,
                    s.shop_address,
                    s.shop_phone
                FROM airballons a
                LEFT JOIN shops s ON a.shop_id = s.id
                WHERE a.shop_id = ?
                ORDER BY a.id DESC
            `;

            params = [shops[0].id];
        }

        const [data] = await db.query(query, params);

        return res.status(200).json({
            success: true,
            message: "Air Balloon list success!",
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



export const airballonUpdate = asyncHandel(async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid Air Balloon id is required!"
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
            dollor_from,
            dollor_to,
            guest,
            rule,
            description,
            name,
            phone1,
            phone2,
            location,
            status,
            is_active
        } = req.body;

        const [airballons] = await db.query(
            `SELECT * FROM airballons WHERE id = ?`,
            [id]
        );

        if (airballons.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Air Balloon not found!"
            });
        }

        const currentAirballon = airballons[0];

        if (req.user.role === "shop") {
            const [shops] = await db.query(
                `SELECT id, type FROM shops WHERE user_id = ?`,
                [req.user.id]
            );

            if (shops.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Shop not found!"
                });
            }

            if (shops[0].type !== "air_balloon") {
                return res.status(403).json({
                    success: false,
                    message: "This shop is not an Air Balloon shop!"
                });
            }

            if (Number(currentAirballon.shop_id) !== Number(shops[0].id)) {
                return res.status(403).json({
                    success: false,
                    message: "You can only update your own Air Balloon!"
                });
            }
        }

        let active = currentAirballon.is_active;

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

        const updatedStatus = status !== undefined
            ? status
            : currentAirballon.status;

        if (
            status !== undefined &&
            !["available", "unavailable"].includes(status)
        ) {
            return res.status(400).json({
                success: false,
                message: "Status must be available or unavailable!"
            });
        }

        const uploadFolder = path.join(
            process.cwd(),
            "images",
            "airballon"
        );

        const imageFields = [
            "airballon_image1",
            "airballon_image2",
            "airballon_image3"
        ];

        const updatedImages = {
            airballon_image1: currentAirballon.airballon_image1,
            airballon_image2: currentAirballon.airballon_image2,
            airballon_image3: currentAirballon.airballon_image3
        };

        const oldImages = [];

        for (const field of imageFields) {
            const file = req.files?.[field]?.[0];

            if (file) {
                const newImage = await saveAirballonImage(
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
            UPDATE airballons SET
                price_from = ?,
                price_to = ?,
                dollor_from = ?,
                dollor_to = ?,
                guest = ?,
                rule = ?,
                description = ?,
                name = ?,
                phone1 = ?,
                phone2 = ?,
                location = ?,
                airballon_image1 = ?,
                airballon_image2 = ?,
                airballon_image3 = ?,
                status = ?,
                is_active = ?
            WHERE id = ?
            `,
            [
                price_from !== undefined ? price_from : currentAirballon.price_from,
                price_to !== undefined ? price_to : currentAirballon.price_to,
                dollor_from !== undefined ? dollor_from : currentAirballon.dollor_from,
                dollor_to !== undefined ? dollor_to : currentAirballon.dollor_to,
                guest !== undefined ? guest : currentAirballon.guest,
                rule !== undefined ? rule : currentAirballon.rule,
                description !== undefined ? description : currentAirballon.description,
                name !== undefined ? name : currentAirballon.name,
                phone1 !== undefined ? phone1 : currentAirballon.phone1,
                phone2 !== undefined ? phone2 : currentAirballon.phone2,
                location !== undefined ? location : currentAirballon.location,
                updatedImages.airballon_image1,
                updatedImages.airballon_image2,
                updatedImages.airballon_image3,
                updatedStatus,
                active,
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
            message: "Air Balloon updated successfully!",
            status: updatedStatus,
            is_active: Boolean(active),
            data: {
                id: Number(id),
                ...updatedImages,
                affectedRows: data.affectedRows
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



export const airballonDelete = asyncHandel(async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid Air Balloon id is required!"
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
                `SELECT id, type FROM shops WHERE user_id = ?`,
                [req.user.id]
            );

            if (shops.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Shop not found!"
                });
            }

            if (shops[0].type !== "air_balloon") {
                return res.status(403).json({
                    success: false,
                    message: "This shop is not an Air Balloon shop!"
                });
            }

            shop_id = shops[0].id;
        }

        let query = `
            SELECT
                id,
                shop_id,
                airballon_image1,
                airballon_image2,
                airballon_image3
            FROM airballons
            WHERE id = ?
        `;

        const params = [id];

        if (req.user.role === "shop") {
            query += ` AND shop_id = ?`;
            params.push(shop_id);
        }

        const [airballons] = await db.query(query, params);

        if (airballons.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Air Balloon not found!"
            });
        }

        const currentAirballon = airballons[0];

        await db.query(
            `DELETE FROM airballons WHERE id = ?`,
            [id]
        );

        const images = [
            currentAirballon.airballon_image1,
            currentAirballon.airballon_image2,
            currentAirballon.airballon_image3
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
            message: "Air Balloon deleted successfully!"
        });
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


export const airballonShopList = asyncHandel(async (req, res) => {
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
                WHERE s.type = 'air_balloon'
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
                AND s.type = 'air_balloon'
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
                WHERE s.type = 'air_balloon'
                AND s.status = 'approved'
                AND s.is_active = true
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
            message: "Air Ballon Data Success",
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

export const airballonShopDetails = asyncHandel(async (req, res) => {
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
                a.id,
                a.shop_id,

                s.shop_name,
                s.shop_phone,
                s.shop_address,
                s.user_id,

                u.image AS user_image,

                a.name,
                a.price_from,
                a.price_to,
                a.dollor_from,
                a.dollor_to,
                a.guest,
                a.description,
                a.rule,
                a.phone1,
                a.phone2,
                a.location,
                a.status,
                a.is_active,

                a.airballon_image1,
                a.airballon_image2,
                a.airballon_image3

            FROM airballons a

            INNER JOIN shops s
                ON a.shop_id = s.id

            INNER JOIN users u
                ON s.user_id = u.id

            WHERE a.shop_id = ?
            AND s.status = 'approved'
            AND s.is_active = 1
            AND s.type = 'air_balloon'
            AND a.is_active = 1

            ORDER BY a.id DESC
            `,
            [id]
        );

        if (data.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Air Balloon Not Found!"
            });
        }

        const shop = {
            shop_id: data[0].shop_id,
            shop_name: data[0].shop_name,
            shop_phone: data[0].shop_phone,
            shop_address: data[0].shop_address,
            image: data[0].user_image
        };

        const airballons = data.map(airballon => ({
            id: airballon.id,
            shop_id: airballon.shop_id,
            name: airballon.name,
            price_from: airballon.price_from,
            price_to: airballon.price_to,
            dollor_from: airballon.dollor_from !== null
                ? Number(airballon.dollor_from)
                : null,
            dollor_to: airballon.dollor_to !== null
                ? Number(airballon.dollor_to)
                : null,
            guest: airballon.guest,
            description: airballon.description,
            rule: airballon.rule,
            phone1: airballon.phone1,
            phone2: airballon.phone2,
            location: airballon.location,
            status: airballon.status,
            is_active: Boolean(airballon.is_active),
            airballon_image1: airballon.airballon_image1,
            airballon_image2: airballon.airballon_image2,
            airballon_image3: airballon.airballon_image3
        }));

        return res.status(200).json({
            success: true,
            data: {
                shop,
                airballons
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

export const airballonDetails = asyncHandel(async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Air Balloon id is required!"
            });
        }

        const [data] = await db.query(
            `
            SELECT
                a.id,
                a.shop_id,

                a.name,
                a.price_from,
                a.price_to,
                a.dollor_from,
                a.dollor_to,
                a.guest,
                a.rule,
                a.description,
                a.phone1,
                a.phone2,
                a.location,
                a.status,
                a.is_active,

                a.airballon_image1,
                a.airballon_image2,
                a.airballon_image3,

                s.shop_name,
                s.shop_phone,
                s.shop_address,
                s.location AS shop_location

            FROM airballons a

            INNER JOIN shops s
                ON a.shop_id = s.id

            WHERE a.id = ?
            AND s.status = 'approved'
            AND s.is_active = 1
            AND s.type = 'air_balloon'
            AND a.is_active = 1
            `,
            [id]
        );

        if (data.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Air Balloon Not Found!"
            });
        }

        const airballon = data[0];

        const shop = {
            shop_id: airballon.shop_id,
            shop_name: airballon.shop_name,
            shop_phone: airballon.shop_phone,
            shop_address: airballon.shop_address,
            location: airballon.shop_location
        };

        const airballonData = {
            id: airballon.id,
            shop_id: airballon.shop_id,
            name: airballon.name,
            price_from: airballon.price_from,
            price_to: airballon.price_to,
            dollor_from: airballon.dollor_from !== null
                ? Number(airballon.dollor_from)
                : null,
            dollor_to: airballon.dollor_to !== null
                ? Number(airballon.dollor_to)
                : null,
            guest: airballon.guest,
            rule: airballon.rule,
            description: airballon.description,
            phone1: airballon.phone1,
            phone2: airballon.phone2,
            location: airballon.location,
            status: airballon.status,
            is_active: Boolean(airballon.is_active),
            airballon_image1: airballon.airballon_image1,
            airballon_image2: airballon.airballon_image2,
            airballon_image3: airballon.airballon_image3
        };

        return res.status(200).json({
            success: true,
            message: "Air Balloon Detail Success",
            data: {
                shop,
                airballon: airballonData
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