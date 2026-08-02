import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";


export const thonebaneCreate = asyncHandel(async (req, res) => {
    try {

        const { shop_id: bodyShopId, category_id, name, price, discount, phone, location, description, status } = req.body;
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

            shop_id = shops[0].id;
        }

        if (req.user.role === "admin") {
            if (!bodyShopId) {
                return res.status(400).json({
                    success: false,
                    message: "Shop is required!"
                });
            }
            shop_id = bodyShopId
        }

        const [shop] = await db.query("SELECT * FROM shops WHERE id = ?", [shop_id]);
        if (shop.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Shop not found!"
            });
        }

        if (!name || !price || !phone || !location || !status) {
            return res.status(400).json({
                success: false,
                message: "All field are required!"
            });
        }

        const total_price = Number(price) - Number(price) * Number(discount || 0) / 100;

        const uploadFolder = path.join(process.cwd(), "images", "thonebane")
        if (!fs.existsSync(uploadFolder)) {
            fs.mkdirSync(uploadFolder, { recursive: true })
        }

        let imagePath = null;

        if (req.file) {
            const fileName = `${uuid()}.webp`;

            const savePath = path.join(uploadFolder, fileName)

            await sharp(req.file.buffer)
                .resize({
                    width: 1920,
                    withoutEnlargement: true
                })
                .webp({ quality: 90 })
                .toFile(savePath)

            imagePath = `images/thonebane/${fileName}`
        }

        const [data] = await db.query(`
            INSERT INTO thonebanes (shop_id,category_id,name,price,discount,total_price,phone,location,description,status,image)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
            `,
            [
                shop_id,
                category_id,
                name,
                price,
                discount || 0,
                total_price,
                phone,
                location,
                description,
                status,
                imagePath
            ])
        return res.status(201).json({
            success: true,
            message: "ThoneBane Create successfully.",
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

export const thonebaneList = asyncHandel(async (req, res) => {
    try {

        let query = "";
        let params = [];

        if (req.user.role === "admin") {
            query = `
              SELECT
                    t.id,
                    t.shop_id,
                    s.shop_name,
                    t.category_id,
                    c.name AS category_name,
                    t.name,
                    t.price,
                    t.discount,
                    t.total_price,
                    t.phone,
                    t.location,
                    t.description,
                    t.status,
                    t.image,
                    DATE_FORMAT(t.created_at,'%d-%m-%Y') AS created_at
                FROM thonebanes t
                LEFT JOIN thonebane_categories c
                    ON t.category_id = c.id
                LEFT JOIN shops s
                    ON t.shop_id = s.id
                ORDER BY t.id DESC
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
                    t.id,
                    t.shop_id,
                    t.category_id,
                    c.name AS category_name,
                    t.name,
                    t.price,
                    t.discount,
                    t.total_price,
                    t.phone,
                    t.location,
                    t.description,
                    t.status,
                    t.image,
                    DATE_FORMAT(t.created_at,'%d-%m-%Y') AS created_at
                FROM thonebanes t
                LEFT JOIN thonebane_categories c
                    ON t.category_id = c.id
                WHERE t.shop_id = ?
                ORDER BY t.id DESC
            `;
            params.push(shop[0].id);

        }
        const [data] = await db.query(query, params);

        return res.status(200).json({
            success: true,
            count: data.length,
            data: data
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
})

export const thonebaneUpdate = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;
        let { name, category_id, price, discount, phone, location, description, status } = req.body;

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

        let thoneBaneQuery = "SELECT * FROM thonebanes WHERE id = ?";
        let thoneBaneParams = [id];

        if (req.user.role === "shop") {
            thoneBaneQuery += " AND shop_id = ?";
            thoneBaneParams.push(shop_id);
        }

        const [thonebane] = await db.query(thoneBaneQuery, thoneBaneParams);

        if (thonebane.length === 0) {
            return res.status(404).json({
                success: false,
                message: "ThoneBane not found"
            });
        }

        let updatedImageString = thonebane[0].image;
        if (req.file) {
            if (thonebane[0].image) {
                const oldPath = path.join(process.cwd(), thonebane[0].image)

                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath)
                }
            }

            const uploadFolder = path.join(process.cwd(), "images", "thonebane")
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

        const total_price = price - (price * discount / 100);

        const [data] = await db.query(
            `
            UPDATE thonebanes SET
                
                category_id=?,
                name=?,
                price=?,
                discount=?,
                total_price=?,
                phone=?,
                location=?,
                description=?,
                status=?,
                image=?
            WHERE id=?
            `,
            [
                category_id,
                name,
                price,
                discount,
                total_price,
                phone,
                location,
                description,
                status,
                updatedImageString,
                id
            ]
        );

        return res.status(200).json({
            success: true,
            message: "ThoneBane Updated Successfully",
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

export const thonebaneDelete = asyncHandel(async (req, res) => {
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
        let thonebaneQuery = "SELECT * FROM thonebanes WHERE id = ?";
        let thonebaneParams = [id];

        if (req.user.role === "shop") {
            thonebaneQuery += " AND shop_id = ?";
            thonebaneParams.push(shop_id);
        }

        const [thonebane] = await db.query(thonebaneQuery, thonebaneParams);
        if (thonebane.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Hotel not found"
            });
        }

        if (thonebane[0].image) {
            const imagePath = path.join(process.cwd(), thonebane[0].image);

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await db.query("DELETE FROM thonebanes WHERE id = ?", [id]);
        res.status(200).json({
            success: true,
            message: "ThoneBane deleted successfully"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
})

export const thonebaneMobileList = asyncHandel(async (req, res) => {
    try {

        const [data] = await db.query(`
            SELECT
                t.id,
                t.name,
                t.price,
                t.discount,
                t.total_price,
                t.phone,
                t.location,
                t.description,
                t.status,
                t.image,

                c.id AS category_id,
                c.name AS category_name,

                s.id AS shop_id,
                s.shop_name,
                s.shop_phone,
                s.shop_address

            FROM thonebane t

            INNER JOIN thonebane_categories c
                ON t.category_id = c.id

            INNER JOIN shops s
                ON t.shop_id = s.id

            WHERE s.status = 'approved'

            ORDER BY t.id DESC
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

export const thonebaneDetails = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;

        const [data] = await db.query(`
            SELECT
                t.id,
                t.name,
                t.price,
                t.discount,
                t.total_price,
                t.phone,
                t.location,
                t.description,
                t.status,
                t.image,

                c.id AS category_id,
                c.name AS category_name,

                s.id AS shop_id,
                s.shop_name,
                s.shop_phone,
                s.shop_address

            FROM thonebane t

            INNER JOIN thonebane_categories c
                ON t.category_id = c.id

            INNER JOIN shops s
                ON t.shop_id = s.id

            WHERE t.id = ?
            AND s.status = 'approved'
        `, [id]);

        if (data.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Thonebane not found!"
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