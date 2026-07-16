import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";


export const pagodaCreate = asyncHandel(async (req, res) => {
    try {

        let {
            name,
            location,
            tags,
            visit_date,
            description,
            history
        } = req.body;

        if (!name || !location || !visit_date) {
            return res.status(400).json({
                success: false,
                message: "All fields are required!"
            });
        }

        // tags
        if (!tags) {
            tags = [];
        }

        if (typeof tags === "string") {
            try {
                tags = JSON.parse(tags);
            } catch (error) {
                tags = tags
                    .split(",")
                    .map(item => item.trim())
                    .filter(Boolean);
            }
        }

        // Upload Folder
        const uploadFolder = path.join(process.cwd(), "images", "pagoda");

        if (!fs.existsSync(uploadFolder)) {
            fs.mkdirSync(uploadFolder, { recursive: true });
        }

        // Image Upload
        let imagePaths = [];

        if (req.files && req.files.length > 0) {

            for (const file of req.files) {

                const fileName = `${uuid()}.webp`;

                const savePath = path.join(uploadFolder, fileName);

                await sharp(file.buffer)
                    .resize({
                        width: 1920,
                        withoutEnlargement: true
                    })
                    .webp({
                        quality: 90
                    })
                    .toFile(savePath);

                imagePaths.push(`images/pagoda/${fileName}`);
            }

        }

        // Insert Pagoda
        const [result] = await db.query(
            `
            INSERT INTO pagodas
            (
                name,
                location,
                tags,
                visit_date,
                description,
                history
            )
            VALUES (?,?,?,?,?,?)
            `,
            [
                name,
                location,
                JSON.stringify(tags),
                visit_date,
                description,
                history
            ]
        );

        const pagodaId = result.insertId;

        for (const image of imagePaths) {

            await db.query(
                `
                INSERT INTO pagoda_images
                (
                    pagoda_id,
                    image
                )
                VALUES (?,?)
                `,
                [
                    pagodaId,
                    image
                ]
            );

        }
        return res.status(201).json({
            success: true,
            message: "Pagoda created successfully.",
            data: {
                pagodaId,
                images: imagePaths
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

export const pagodaList = asyncHandel(async (req, res) => {
    try {

        const [data] = await db.query("SELECT id,name,location,tags,fee,visit_date,total_fee,image,description,history,DATE_FORMAT(created_at, '%d-%m-%Y') as created_at FROM pagodas ORDER BY id DESC");

        return res.status(200).json({
            success: true,
            count: data.length,
            data
        })

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            message: error.message,
            success: false
        })
    }
})

export const pagodaUpdate = asyncHandel(async (req, res) => {
    try {
        const { id } = req.params;

        let {
            name,
            location,
            tags,
            fee,
            visit_date,
            discount,
            description,
            history
        } = req.body;

        const [pagoda] = await db.query(
            "SELECT * FROM pagodas WHERE id = ?",
            [id]
        );

        if (pagoda.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Pagoda not found"
            });
        }

        // Default old image
        let updatedImageString = pagoda[0].image;

        // Upload new image
        if (req.file) {

            // Delete old image
            if (pagoda[0].image) {
                const oldPath = path.join(process.cwd(), pagoda[0].image);

                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }

            const uploadFolder = path.join(process.cwd(), "images", "pagoda");

            if (!fs.existsSync(uploadFolder)) {
                fs.mkdirSync(uploadFolder, { recursive: true });
            }

            const fileName = `${uuid()}.webp`;
            const savePath = path.join(uploadFolder, fileName);

            await sharp(req.file.buffer)
                .resize({
                    width: 1920,
                    withoutEnlargement: true
                })
                .webp({
                    quality: 90
                })
                .toFile(savePath);

            updatedImageString = `images/pagoda/${fileName}`;
        }

        // Tags
        if (!tags) {
            tags = [];
        }

        if (typeof tags === "string") {
            try {
                tags = JSON.parse(tags);
            } catch (error) {
                tags = tags
                    .split(",")
                    .map(item => item.trim())
                    .filter(Boolean);
            }
        }

        fee = Number(fee);
        discount = Number(discount || 0);

        const total_fee = fee - (fee * discount / 100);

        const [data] = await db.query(
            `
            UPDATE pagodas SET
                name=?,
                location=?,
                tags=?,
                fee=?,
                visit_date=?,
                discount=?,
                total_fee=?,
                description=?,
                history=?,
                image=?
            WHERE id=?
            `,
            [
                name,
                location,
                JSON.stringify(tags),
                fee,
                visit_date,
                discount,
                total_fee,
                description,
                history,
                updatedImageString,
                id
            ]
        );

        return res.status(200).json({
            success: true,
            message: "Pagoda Updated Successfully",
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

export const pagodaDelete = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;
        const [pagoda] = await db.query("SELECT * FROM pagodas WHERE id = ?", [id]);
        if (pagoda.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Pagoda not found"
            });
        }

        if (pagoda[0].image) {
            const imagePath = path.join(process.cwd(), pagoda[0].image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }
        await db.query("DELETE FROM pagodas WHERE id = ?", [id]);
        res.status(200).json({
            success: true,
            message: "Pagoda deleted successfully"
        });

    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
})

export const pagodaDetails = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;
        const [data] = await db.query("SELECT id,name,location,tags,fee,visit_date,total_fee,image,description,history,DATE_FORMAT(created_at, '%d-%m-%Y') as created_at FROM pagodas WHERE id = ?", [id]);
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