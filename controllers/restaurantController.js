import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";

import { v4 as uuid } from "uuid";

export const restaurantCreate = asyncHandel(async (req, res) => {
    try {

        let { shop_id: bodyShopId, name, location, address, dishes, phone, description, discount } = req.body;
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

            shop_id = bodyShopId;
        }
        const [shop] = await db.query(
            "SELECT id FROM shops WHERE id = ?",
            [shop_id]
        );

        if (shop.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Shop not found!"
            });
        }


        if (!name || !location || !phone) {
            return res.status(400).json({
                success: false,
                message: "All fields are required!"
            });
        }

        if (!dishes) {
            dishes = []
        }
        if (typeof dishes === "string") {
            try {
                dishes = JSON.parse(dishes)
            } catch (error) {
                dishes = dishes.split(",").map(item => item.trim()).filter(Boolean);
            }
        }

        const uploadFolder = path.join(process.cwd(), "images", "restaurant");
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

            imagePath = `images/restaurant/${fileName}`
        }
        const [data] = await db.query(
            `
            INSERT INTO restaurants 
            (shop_id,name,location,address,dishes,phone,description,image,discount) VALUES (?,?,?,?,?,?,?,?,?)
            `,
            [
                shop_id, name, location, address, JSON.stringify(dishes), phone, description, imagePath, discount
            ]
        )
        return res.status(201).json({
            message: "Restaurant Create Success",
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
                r.id,
                r.shop_id,
                s.shop_name,
                r.name,
                r.location,
                r.address,
                r.phone,
                r.description,
                r.dishes,
                r.image,
                r.discount,
                DATE_FORMAT(r.created_at, '%d-%m-%Y') as created_at
                FROM restaurants r
                LEFT JOIN shops s
                ON r.shop_id = s.id
                ORDER BY r.id DESC
              `
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
                r.id,
                r.shop_id,
                s.shop_name,
                r.name,
                r.location,
                r.address,
                r.phone,
                r.description,
                r.dishes,
                r.image,
                r.discount,
                DATE_FORMAT(r.created_at, '%d-%m-%Y') as created_at
                FROM restaurants r
                LEFT JOIN shops s
                ON r.shop_id = s.id
                WHERE r.shop_id = ?
                ORDER BY r.id DESC
            `
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
            message: "Restaurant Data Success",
            success: true,
            count: data.length,
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

export const restaurantUpdate = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;
        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }
        let { name, location, address, dishes, phone, description, discount } = req.body || {};

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
        let restaurantQuery = "SELECT * FROM restaurants WHERE id = ?";

        let restaurantParams = [id];

        if (req.user.role === "shop") {
            restaurantParams += " AND shop_id = ?";
        }
        const [restaurant] = await db.query(restaurantQuery,restaurantParams);
        if (restaurant.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found"
            });
        }
        if (!dishes) {
            dishes = [];
        }

        if (typeof dishes === "string") {
            try {
                dishes = JSON.parse(dishes);
            } catch (error) {
                dishes = dishes
                    .split(",")
                    .map(item => item.trim())
                    .filter(Boolean);
            }
        }

        let updateImage = restaurant[0].image;
        if (req.file) {
            if (restaurant[0].image) {
                const oldPath = path.join(process.cwd(), restaurant[0].image)

                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath)
                }
            }

            const uploadFolder = path.join(
                process.cwd(),
                "images",
                "restaurant"
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


            updateImage = ` images/restaurant/${fileName}`;

        }

        const [data] = await db.query(
            `
            UPDATE  restaurants SET
            name=?,
            location=?,
            address=?,
            dishes=?,
            phone=?,
            description=?,
            image=?,
            discount=?
            WHERE id= ?
            `,
            [
                name, location, address, JSON.stringify(dishes), phone, description, updateImage, discount, id
            ]
        );

        return res.status(200).json({
            message: "Restaurant Update Success",
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

export const restaurantDelete = asyncHandel(async (req, res) => {
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

        let restaurantQuery = "SELECT * FROM restaurants WHERE id = ?";
        let restaurantParams = [id];
        if (req.user.role === "shop") {
            restaurantQuery += " AND shop_id = ?";
            restaurantParams.push(shop_id);
        }
        const [restaurant] = await db.query(restaurantQuery, restaurantParams);

        if (restaurant.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found"
            });
        }
        if (restaurant[0].image) {
            const oldPath = path.join(process.cwd(), restaurant[0].image);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath)
            }
        }
        await db.query("DELETE FROM restaurants WHERE id = ?", [id]);
        res.status(200).json({
            success: true,
            message: "Restaurants deleted successfully"
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
        const [data] = await db.query(
            `
        SELECT 
        r.id,
        r.r.name,
        r.location,
        r.address,
        r.phone,
        r.description,
        r.dishes,
        r.image,
        r.discount,
        s.id AS shop_id,
        s.shop_name,
        s.shop_phone,
        s.shop_address
        DATE_FORMAT(r.created_at, '%d-%m-%Y') as created_at
        FROM restaurants r  
        INNER JOIN shops s
        ON r.shop_id = s.id
        WHERE r.id = ?
        AND s.status = 'approved'
        `,
            [id]
        )
        res.status(200).json({
            success: true,
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

export const restaurantMobileList = asyncHandel(async (req, res) => {
    try {
        const [data] = await db.query(
            `
        SELECT 
        r.id,
        r.name,
        r.location,
        r.address,
        r.phone,
        r.description,
        r.dishes,
        r.image,
        r.discount,
        s.id AS shop_id,
        s.shop_name,
        s.shop_phone,
        s.shop_address
        DATE_FORMAT(r.created_at, '%d-%m-%Y') as created_at
        FROM restaurants r  
        INNER JOIN shops s
        ON r.shop_id = s.id
        WHERE r.id = ?
        AND s.status = 'approved'
        ORDER BY r.id DESC
        `,
        )
        res.status(200).json({
            success: true,
            count: data.length,
            message: "Success data",
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