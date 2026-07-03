import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";


export const destinationCreate = asyncHandel(async (req, res) => {
    try {

        const { name, location, price, discount, start_date, end_date, description, visit_date, activities } = req.body;

        if (!name || !location || !price || !discount || !start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: "All field are required!"
            });
        }
        const total_amount = Number(price) - (Number(price) * Number(discount) / 100);

        const uploadFolder = path.join(process.cwd(), "images", "destination");
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

            imagePath = `images/destination/${fileName}`;
        }
        const [data] = await db.query(
            `INSERT INTO destinations
            
            (
            name,
            location,
            price,
            discount,
            total_amount,
            start_date,
            end_date,
            description,
            visit_date,
            activities,
            image
            )

            VALUES(?,?,?,?,?,?,?,?,?,?,?)

            `, [name, location, price, discount, total_amount, start_date, end_date, description, visit_date, activities, imagePath]
        );

        return res.status(201).json({
            success: true,
            message: "Destination created successfully.",
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

export const destinationList = asyncHandel(async (req, res) => {
    try {

        const [data] = await db.query(`SELECT id, name, location, price, discount, total_amount, DATE_FORMAT(start_date, '%d-%m-%Y') as start_date, DATE_FORMAT(end_date, '%d-%m-%Y') as end_date, description,visit_date, activities, image FROM destinations ORDER BY id DESC`);
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


export const destinationUpdate = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;

        let {
            name,
            location,
            price,
            discount,
            start_date,
            end_date,
            description,
            visit_date,
            activities
        } = req.body;

        const [destination] = await db.query(
            "SELECT * FROM destinations WHERE id = ?",
            [id]
        );

        if (destination.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Destination not found"
            });
        }

        let updatedImageString = destination[0].image;

        // New Image Upload
        if (req.file) {

            // Delete Old Image
            if (destination[0].image) {
                const oldPath = path.join(
                    process.cwd(),
                    destination[0].image
                );

                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }

            const uploadFolder = path.join(
                process.cwd(),
                "images",
                "destination"
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

            updatedImageString = `images/destination/${fileName}`;
        }

        price = Number(price);
        discount = Number(discount || 0);

        const total_amount =
            price - (price * discount / 100);

        const [data] = await db.query(
            `
            UPDATE destinations SET
                name=?,
                location=?,
                price=?,
                discount=?,
                total_amount=?,
                start_date=?,
                end_date=?,
                description=?,
                visit_date=?,
                activities=?,
                image=?
            WHERE id=?
            `,
            [
                name,
                location,
                price,
                discount,
                total_amount,
                start_date,
                end_date,
                description,
                visit_date,
                activities,
                updatedImageString,
                id
            ]
        );

        return res.status(200).json({
            success: true,
            message: "Destination Updated Successfully",
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

export const destinationDelete = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;
        const [destination] = await db.query("SELECT *  FROM destinations WHERE id = ?", [id]);
        if (destination.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Destination not found"
            });
        }

        if (destination[0].image) {
            const imagePath = path.join(process.cwd(), destination[0].image);

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await db.query("DELETE FROM destinations WHERE id = ?", [id]);
        res.status(200).json({
            success: true,
            message: "Destination deleted successfully"
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
})

export const destinationDetails = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;
        const [data] = await db.query(`SELECT id, name, location, price, discount, total_amount, DATE_FORMAT(start_date, '%d-%m-%Y') as start_date, DATE_FORMAT(end_date, '%d-%m-%Y') as end_date, description,visit_date, activities, image FROM destinations WHERE id = ?`, [id]);
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