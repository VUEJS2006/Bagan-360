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
            fs.mkdirSync(uploadFolder, { recursive: true });
        }

        let imagePath = null;

        if (req.file) {
            const fileName = `${uuid()}.webp`;
            const savePath = path.join(uploadFolder, fileName);

            await sharp(req.file.buffer)
                .resize({
                    width: 1920,
                    withoutEnlargement: true
                })
                .webp({ quality: 90 })
                .toFile(savePath);

            imagePath = `images/hotel/${fileName}`;
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

            `, [name, type, price, discount, total_amount, start_date, end_date, description, facilities, imagePath]
        );

        return res.status(201).json({
            success: true,
            message: "Hotel created successfully.",
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

        const [data] = await db.query(`SELECT id, name, type, price, discount, total_amount, DATE_FORMAT(start_date, '%d-%m-%Y') as start_date, DATE_FORMAT(end_date, '%d-%m-%Y') as end_date, description, facilities, image FROM hotels ORDER BY id DESC`);
        res.status(200).json({
            success: true,
            count: data.length,
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


export const hotelUpdate = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;

        let {
            name,
            type,
            price,
            discount,
            start_date,
            end_date,
            description,
            facilities
        } = req.body;

        const [hotel] = await db.query(
            "SELECT * FROM hotels WHERE id = ?",
            [id]
        );

        if (hotel.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Hotel not found"
            });
        }

        let updatedImageString = hotel[0].image;

        // New Image Upload
        if (req.file) {

            // Delete Old Image
            if (hotel[0].image) {
                const oldPath = path.join(
                    process.cwd(),
                    hotel[0].image
                );

                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }

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

        const total_amount =
            price - (price * discount / 100);

        const [data] = await db.query(
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
            [
                name,
                type,
                price,
                discount,
                total_amount,
                start_date,
                end_date,
                description,
                facilities,
                updatedImageString,
                id
            ]
        );

        return res.status(200).json({
            success: true,
            message: "Hotel Updated Successfully",
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

        if (hotel[0].image) {
            const imagePath = path.join(process.cwd(), hotel[0].image);

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
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

export const hotelDetails = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;
        const [data] = await db.query("SELECT id, name, type, price, discount, total_amount, DATE_FORMAT(start_date, '%d-%m-%Y') as start_date, DATE_FORMAT(end_date, '%d-%m-%Y') as end_date, description, facilities, image FROM hotels  WHERE id = ?",[id]);
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