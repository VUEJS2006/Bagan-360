import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";


export const packageCreate = asyncHandel(async (req, res) => {
    try {

        let {
            title,
            description,
            hotel_title,
            hotel_description,
            hotel_url,
            restaurant_title,
            restaurant_description,
            restaurant_url,
            transport_title,
            transport_description,
            transport_url,
        } = req.body;

        if (!title || !description || !hotel_title || !restaurant_title || !transport_title) {
            return res.status(400).json({
                success: false,
                message: "All fields are required!"
            })
        }

        const uploadFolder = path.join(process.cwd(), "images", "package");

        if (!fs.existsSync(uploadFolder)) {
            fs.mkdirSync(uploadFolder, { recursive: true })
        }
        let imagePaths = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const fileName = `${uuid()}.webp`;
                const savePath = path.join(uploadFolder, fileName)

                await sharp(file.buffer)
                    .resize({ width: 920, withoutEnlargement: true })
                    .webp({ quality: 90 })
                    .toFile(savePath)

                imagePaths.push(`images/package/${fileName}`)
            }
        }

        const [data] = await db.query(
            `
            INSERT INTO packages
            (
            title,
            description,
            hotel_title,
            hotel_description,
            hotel_url,
            restaurant_title,
            restaurant_description,
            restaurant_url,
            transport_title,
            transport_description,
            transport_url

            )
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
            `,
            [
                title,
                description,
                hotel_title,
                hotel_description,
                hotel_url,
                restaurant_title,
                restaurant_description,
                restaurant_url,
                transport_title,
                transport_description,
                transport_url
            ]
        );
        const packageID = data.insertId;

        for (const image of imagePaths) {
            await db.query(
                `
                  INSERT INTO package_images
                  (package_id,image) VALUES (?,?)

                `,
                [packageID, image]
            )
        }
        return res.status(201).json({
            success: true,
            message: "Package created successfully.",
            data: {
                packageID,
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
})

export const packageList = asyncHandel(async (req, res) => {
    try {

        const [data] = await db.query(
            `
            SELECT
             p.id,
             p.title,
             p.description,
             p.hotel_title,
             p.hotel_description,
             p.hotel_url,
             p.restaurant_title,
             p.restaurant_description,
             p.restaurant_url,
             p.transport_title,
             p.transport_description,
             p.transport_url,
             DATE_FORMAT(p.created_at,'%d-%m-%Y') AS created_at,
            COALESCE(
                    JSON_ARRAYAGG(pi.image),
                    JSON_ARRAY()
            ) AS images

            FROM packages p
            LEFT JOIN package_images pi
            ON p.id = pi.package_id
             GROUP BY p.id 
            `
        )
        return res.status(200).json({
            message: "Package List Success",
            data: data.length,
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

export const packageUpdate = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;
        let {

            title,
            description,
            hotel_title,
            hotel_description,
            hotel_url,
            restaurant_title,
            restaurant_description,
            restaurant_url,
            transport_title,
            transport_description,
            transport_url
        } = req.body;

        const [packages] = await db.query("SLECT * FROM packages WHERE id = ?", [id]);

        if (packages.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Package not found"
            });
        }

        const [data] = await db.query(
            `
            UPDATE packages SET 
            title = ?,
            description = ?,
            hotel_title = ?,
            hotel_description = ? ,
            hotel_url = ?,
            restaurant_title = ?,
            restaurant_description = ?,
            restaurant_url = ?,
            transport_title = ?,
            transport_description = ?,
            transport_url = ?
            WHERE id = ?
            `,
            [
                title,
                description,
                hotel_title,
                hotel_description,
                hotel_url,
                restaurant_title,
                restaurant_description,
                restaurant_url,
                transport_title,
                transport_description,
                transport_url,
                id
            ]
        );

        if (req.files && req.files.length > 0) {
            const [oldImages] = await db.query(
                "SELECT * FROM package_images WHERE package_id=?",
                [id]
            );
            for (const img of oldImages) {
                const oldPath = path.join(process.cwd(), img.image);

                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath)
                }
            }
            await db.query(
                "DELETE FROM package_images WHERE package_id=?",
                [id]
            );
            const uploadFolder = path.join(
                process.cwd(),
                "images",
                "package"
            );

            if (!fs.existsSync(uploadFolder)) {
                fs.mkdirSync(uploadFolder, {
                    recursive: true
                });
            }
            for (const file of req.files) {

                const fileName = `${uuid()}.webp`;

                const savePath = path.join(
                    uploadFolder,
                    fileName
                );

                await sharp(file.buffer)
                    .resize({
                        width: 1920,
                        withoutEnlargement: true
                    })
                    .webp({
                        quality: 90
                    })
                    .toFile(savePath);

                await db.query(
                    `
                    INSERT INTO package_images
                    (package_id,image)
                    VALUES (?,?)
                    `,
                    [
                        id,
                        `images/package/${fileName}`
                    ]
                );
            }
        }
        return res.status(200).json({
            success: true,
            message: "Package Updated Successfully",
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

export const packageDelete = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;
        const [packages] = await db.query("SELECT * FROM packages WHERE id = ?", [id]);
        if (packages.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Package not found"
            });
        }

        const [images] = await db.query("SELECT * FROM package_images WHERE package_id=?", [id]);
        for (const img of images) {
            const imagePath = path.join(process.cwd(), img.image);

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath)
            }
        }
        await db.query("DELETE FROM packages WHERE id = ?", [id]);
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