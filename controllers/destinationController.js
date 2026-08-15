import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";


export const destinationCreate = asyncHandel(async (req, res) => {
    try {

        let {
            title,
            zone,
            duration,
            transport,
            tips,
            tags,
            itinerary,
            description
        } = req.body;

        if (!title || !zone || !duration) {
            return res.status(400).json({
                success: false,
                message: "Title, zone and duration are required!"
            });
        }


        if (!transport) {
            transport = [];
        }

        if (typeof transport === "string") {
            try {
                transport = JSON.parse(transport);
            } catch (error) {
                transport = transport
                    .split(",")
                    .map(item => item.trim())
                    .filter(Boolean);
            }
        }


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


        if (!itinerary) {
            itinerary = [];
        }

        if (typeof itinerary === "string") {
            try {
                itinerary = JSON.parse(itinerary);
            } catch (error) {
                itinerary = [];
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

        let imagePath = null;

        if (req.file) {

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

            imagePath = `images/destination/${fileName}`;
        }

        const [data] = await db.query(
            `
            INSERT INTO destinations
            (
                title,
                zone,
                duration,
                transport,
                tips,
                tags,
                itinerary,
                image,
                description
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ? ,?)
            `,
            [
                title,
                zone,
                duration,
                JSON.stringify(transport),
                tips,
                JSON.stringify(tags),
                JSON.stringify(itinerary),
                imagePath,
                description
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Destination created successfully.",
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


export const destinationList = asyncHandel(async (req, res) => {
    try {

        const [data] = await db.query(`
            SELECT
                id,
                title,
                zone,
                duration,
                transport,
                tips,
                tags,
                itinerary,
                image,
                description,
                DATE_FORMAT(created_at, '%Y-%m-%d') AS created_at
            FROM destinations
        `);
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
            title,
            zone,
            duration,
            transport,
            tips,
            tags,
            itinerary,
            description
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

        // Transport
        if (!transport) {
            transport = [];
        }

        if (typeof transport === "string") {
            try {
                transport = JSON.parse(transport);
            } catch (error) {
                transport = transport
                    .split(",")
                    .map(item => item.trim())
                    .filter(Boolean);
            }
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

        // Itinerary
        if (!itinerary) {
            itinerary = [];
        }

        if (typeof itinerary === "string") {
            try {
                itinerary = JSON.parse(itinerary);
            } catch (error) {
                itinerary = [];
            }
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

            updatedImageString =
                `images/destination/${fileName}`;
        }

        const [data] = await db.query(
            `
            UPDATE destinations SET
                title=?,
                zone=?,
                duration=?,
                transport=?,
                tips=?,
                tags=?,
                itinerary=?,
                image=?,
                description = ?
            WHERE id=?
            `,
            [
                title,
                zone,
                duration,
                JSON.stringify(transport),
                tips,
                JSON.stringify(tags),
                JSON.stringify(itinerary),
                updatedImageString,
                description,
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
        const [data] = await db.query(
            ` SELECT
                id,
                title,
                zone,
                duration,
                transport,
                tips,
                tags,
                itinerary,
                image,
                description,
                DATE_FORMAT(created_at, '%Y-%m-%d') AS created_at
                FROM destinations WHERE id = ?`,
            [id]);

        res.status(200).json({
            success: true,
            message: "Success!",
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