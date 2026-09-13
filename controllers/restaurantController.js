import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";

export const restMenuCreate = asyncHandel(async (req, res) => {
    try {

        let { shop_id: bodyShopId, name, description } = req.body;
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
            if (shops[0].type !== "restaurant") {
                return res.status(400).json({
                    success: false,
                    message: "This shop is not a restaurant!"
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





        if (!name || !description) {
            return res.status(400).json({
                success: false,
                message: "All fields are required!"
            });
        }

        const uploadFolder = path.join(process.cwd(), "images", "res_menu");
        if (!fs.existsSync(uploadFolder)) {
            fs.mkdirSync(uploadFolder, { recursive: true })
        }
        let imagePath = null;
        if (req.file) {
            const fileName = `${uuid()}.webp`;
            const savePath = path.join(uploadFolder, fileName)

            await sharp(req.file.buffer)
                .resize({ width: 1920, withoutEnlargement: true })
                .webp({ quality: 90 })
                .toFile(savePath)

            imagePath = `images/res_menu/${fileName}`
        }
        const [data] = await db.query(
            `
            INSERT INTO res_menu
            (shop_id,name,image,description) VALUES (?,?,?,?)
            `,
            [
                shop_id, name, imagePath, description
            ]
        )
        return res.status(201).json({
            message: "Res Menu Create Success",
            success: true,
            data

        })
    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
});

export const restaurantList = asyncHandel(async (req, res) => {
    try {

        let query = "";
        let params = [];

        if (req.user.role === "admin") {

            query = `
                SELECT
                    s.id,
                    s.shop_name,
                    s.shop_address,
                    s.shop_phone,
                    s.image,
                    s.status,
                    s.type
                FROM shops s
                WHERE s.type = 'restaurant'
                ORDER BY s.id DESC
            `;
        }


        else if (req.user.role === "shop") {

            const [shop] = await db.query(
                `
                SELECT id
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
                    s.shop_address,
                    s.shop_phone,
                    s.image,
                    s.status,
                    s.type
                FROM shops s
                WHERE s.id = ?
                AND s.type = 'restaurant'
                ORDER BY s.id DESC
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
            message: "Restaurant Data Success",
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

export const resMenuList = asyncHandel(async (req, res) => {
    try {
        if (!["admin", "shop"], includes(req.user.role)) {
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
                    m.id,
                    m.shop_id,
                    s.shop_name,
                    s.type AS shop_type,
                    m.name,
                    m.image,
                    m.description,
                    DATE_FORMAT(m.created_at, '%d-%m-%Y') AS created_at,
                    DATE_FORMAT(m.updated_at, '%d-%m-%Y') AS updated_at
                FROM res_menu m
                INNER JOIN shops s
                    ON m.shop_id = s.id
                WHERE s.type = 'restaurant'
                ORDER BY m.id DESC
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

            if (shop[0].type !== "restaurant") {
                return res.status(400).json({
                    success: false,
                    message: "This shop is not a restaurant!"
                });
            }

            query = `
                SELECT
                    m.id,
                    m.shop_id,
                    s.shop_name,
                    s.type AS shop_type,
                    m.name,
                    m.image,
                    m.description,
                    DATE_FORMAT(m.created_at, '%d-%m-%Y') AS created_at,
                    DATE_FORMAT(m.updated_at, '%d-%m-%Y') AS updated_at
                FROM res_menu m
                INNER JOIN shops s
                    ON m.shop_id = s.id
                WHERE m.shop_id = ?
                AND s.type = 'restaurant'
                ORDER BY m.id DESC
            `;
            params = [shop[0].id];
        }
        const [data] = await db.query(query, params);
        return res.status(200).json({
            success: true,
            message: "Restaurant Menu Data Success",
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
})

export const resMenuUpdate = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;
        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }
        const { name, description } = req.body;
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
            if (shop[0].type !== "restaurant") {
                return res.status(400).json({
                    success: false,
                    message: "This shop is not a restaurant!"
                });
            }

            shop_id = shop[0].id;
        }

        let menuQuery = `
            SELECT
                m.*,
                s.type AS shop_type
            FROM res_menu m
            INNER JOIN shops s
                ON m.shop_id = s.id
            WHERE m.id = ?
        `;

        let menuParams = [id];

        if (req.user.role === "shop") {
            menuQuery += `
                AND m.shop_id = ?
                AND s.type = 'restaurant'
            `;

            menuParams.push(shop_id);
        }
        if (req.user.role === "admin") {
            menuQuery += `
                AND s.type = 'restaurant'
            `;
        }
        const [menu] = await db.query(
            menuQuery,
            menuParams
        );

        if (menu.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Menu not found!"
            });
        }
        let updateImage = menu[0].image;
        if (req.file) {
            if (menu[0].image) {
                const oldPath = path.join(process.cwd(), menu[0].image)

                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath)
                }
            }

            const uploadFolder = path.join(
                process.cwd(),
                "images",
                "res_menu"
            );
            if (!fs.existsSync(uploadFolder)) {
                fs.mkdirSync(uploadFolder, { recursive: true })
            }

            const fileName = `${uuid()}.webp`;
            const savePath = path.join(uploadFolder, fileName)
            await sharp(req.file.buffer)
                .resize({
                    width: 1920,
                    withoutEnlargement: true
                })
                .webp({
                    quality: 90
                })
                .toFile(savePath);


            updateImage = `images/res_menu/${fileName}`;

        }

        const [data] = await db.query(
            `
            UPDATE  res_menu SET
            name=?,
            description=?,
            image=?,
            WHERE id= ?
            `,
            [
                name, description, updateImage, id
            ]
        );

        return res.status(200).json({
            message: "Res Menu  Update Success",
            success: true,
            data
        })

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
})

export const resMenuDelete = asyncHandel(async (req, res) => {
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
            if (shop[0].type !== "restaurant") {
                return res.status(400).json({
                    success: false,
                    message: "This shop is not a restaurant!"
                });
            }

            shop_id = shop[0].id;
        }

        let menuQuery = `
            SELECT
                m.*,
                s.type AS shop_type
            FROM res_menu m
            INNER JOIN shops s
                ON m.shop_id = s.id
            WHERE m.id = ?
        `;

        let menuParams = [id];

        if (req.user.role === "shop") {
            menuQuery += `
                AND m.shop_id = ?
                AND s.type = 'restaurant'
            `;

            menuParams.push(shop_id);
        }
        if (req.user.role === "admin") {

            menuQuery += `
                AND s.type = 'restaurant'
            `;
        }
        const [menu] = await db.query(
            menuQuery,
            menuParams
        );

        if (menu.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Menu not found!"
            });
        }

        if (menu[0].image) {
            const oldPath = path.join(process.cwd(), menu[0].image);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath)
            }
        }
        await db.query("DELETE FROM res_menu WHERE id = ?", [id]);
        res.status(200).json({
            success: true,
            message: "Res Menu deleted successfully"
        });

    } catch (error) {

        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
})

export const restaurantDetails = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;
        const [shop] = await db.query(
            `
            SELECT
                s.id AS shop_id,
                s.shop_name,
                s.phone,
                s.address,
                s.image,
                s.type,
                s.status,
                DATE_FORMAT(s.created_at, '%d-%m-%Y') AS created_at
            FROM shops s
            WHERE s.id = ?
            AND s.type = 'restaurant'
            AND s.status = 'approved'
            `,
            [id]
        );
        if (shop.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Restaurant shop not found!"
            });
        }
        const [menu] = await db.query(
            `
            SELECT
                m.id,
                m.shop_id,
                m.name,
                m.image,
                m.description,
                DATE_FORMAT(m.created_at, '%d-%m-%Y') AS created_at
            FROM res_menu m
            WHERE m.shop_id = ?
            ORDER BY m.id DESC
            `,
            [id]
        );
        return res.status(200).json({
            success: true,
            data: {
                shop: shop[0],
                menu
            }
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
})
