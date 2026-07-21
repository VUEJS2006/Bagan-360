import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { json } from "stream/consumers";
import { v4 as uuid } from "uuid";

export const restaurantCreate = asyncHandel(async (req, res) => {
    try {

        let { name, location, address, dishes, phone, description } = req.body;
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
            (name,location,address,dishes,phone,description,image) VALUES (?,?,?,?,?,?,?)
            `,
            [
                name, location, address, JSON.stringify(dishes), phone, description, imagePath
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
        const [data] = await db.query(
            `
        SELECT 
        id,
        name,
        location,
        address,
        phone,
        description,
        dishes,
        image,
        DATE_FORMAT(created_at, '%d-%m-%Y') as created_at
        FROM restaurants
        `
        )
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
        let { name, location, address, dishes, phone, description } = req.body || {};

        const [restaurant] = await db.query(`SELECT * FROM restaurants WHERE id = ?`, [id]);
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
            image=?
            WHERE id= ?
            `,
            [
                name, location, address, JSON.stringify(dishes), phone, description, updateImage, id
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
        const [restaurant] = await db.query("SELECT *  FROM restaurants WHERE id = ?", [id]);
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
        id,
        name,
        location,
        address,
        phone,
        description,
        dishes,
        image,
        DATE_FORMAT(created_at, '%d-%m-%Y') as created_at
        FROM restaurants
        WHERE id = ?
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