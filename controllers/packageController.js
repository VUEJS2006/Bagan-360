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

