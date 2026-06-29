import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";


export const hotelCreate = asyncHandel(async (req, res) => {
    try {

        const { name, type, price, discount, start_date, end_date, description, facilities } = req.body;

        if (!name || !type || !price || !discount || !start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: "All field are required!"
            });
        }
        const total_amount = Number(price) - (Number(price) * Number(discount) / 100);

        const uploadFolder = path.join(process.cwd(), "images", "hotel");
        if (!fs.existsSync(uploadFolder)) {
            fs.mkdirSync(uploadFolder, { recursive: true })
        }
        const imagePaths = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const fileName = `${uuid()}.webp`;
                const savePath = path.join(uploadFolder, fileName)

                await sharp(file.buffer)
                    .resize({
                        width: 1920,
                        withoutEnlargement: true
                    })
                    .webp({
                        quality: 90
                    })
                    .toFile(savePath);
                imagePaths.push(`images/hotel/${fileName}`);
            }
        }
        const [data] = await db.query(
            `INSERT INTO hotels
            
            (
            name,
            type,
            price,
            discount,
            total_amount,
            start_date,
            end_date,
            description,
            facilities,
            image
            )

            VALUES(?,?,?,?,?,?,?,?,?,?)

            `, [name, type, price, discount, total_amount, start_date, end_date, description, facilities, JSON.stringify(imagePaths)]
        );

        return res.status(201).json({
            success: true,
            message: "Hotel created successfully.",
            images: imagePaths,
            data
        })

    } catch (error) {
        console.log(err);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
})

export const hotelList = asyncHandel(async (req, res) => {
    try {

        const [data] = await db.query("SELECT  FROM hotels ORDER BY id DESC");
        res.status(200).json({
            success: true,
            count: data.length,
            data
        });

    } catch (error) {
        console.log(err);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
})


export const hotelUpdate = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;
        const { name, type, price, discount, start_date, end_date, description, facilities } = req.body;

        const [hotel] = await db.query("SELECT  FROM hotels WHERE id = ?", [id]);
        if (hotel.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Hotel not found"
            });
        }
        let imagePaths = JSON.parse(hotel[0].image || "[]");

        if (req.files && req.files.length > 0) {
            for (const image of imagePaths) {
                const oldPath = path.join(process.cwd(), image);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath)
                }
            }
        }

        imagePaths = [];
        const uploadFolder = path.join(process.cwd(), "images", "hotels");
        if (!fs.existsSync(uploadFolder)) {
            fs.mkdirSync(uploadFolder, { recursive: true })
        }
        for (const file of req.files) {
            const fileName = `${uuid()}.webp`;
            const savePath = path.join(uploadFolder, fileName);
            await sharp(file.buffer)
                .resize({ width: 1920, withoutEnlargement: true })
                .webp({ quality: 90 })
                .toFile(savePath)

            imagePaths.push(`images/hotel/${fileName}`)
        }

        const total_amount = Number(price) - (Number(price) * Number(discount) / 100);

        await db.query(
            `
            UPDATE hotels SET 
            name=?,
            type=?,
            price=?,
            discount=?,
            total_amount=?,
            start_date=?,
            end_date=?,
            description=?,
            facilities=?,
            image=?
            WHERE id=?
            `,
            [name, type, price, discount, total_amount, start_date, end_date, description, facilities, JSON.stringify(imagePaths), id]

        );
        res.status(200).json({
            success: true,
            message: "Hotel Updated Successfully",
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

export const hotelDelete = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;
        const [hotel] = await db.query("SELECT *  FROM hotels WHERE id = ?", [id]);
        if (hotel.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Hotel not found"
            });
        }

        const images = JSON.parse(hotel[0].image || "[]");
        for (const image of images) {
            const imagePaths = path.join(process.cwd(), image);
            if (fs.existsSync(imagePaths)) {
                fs.unlinkSync(imagePaths)
            }
        }

        await db.query("DELETE FROM hotels WHERE id = ?", [id]);
        res.status(200).json({
            success: true,
            message: "Hotel deleted successfully"
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
})
