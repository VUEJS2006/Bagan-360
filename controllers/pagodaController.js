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

        const [data] = await db.query(
            ` SELECT 
            p.id,
            p.name,
            p.location,
            p.tags,
            p.visit_date,
            p.description,
            p.history,
            DATE_FORMAT(p.created_at,'%d-%m-%Y') AS created_at,
           COALESCE(
                    JSON_ARRAYAGG(pi.image),
                    JSON_ARRAY()
                ) AS images
            FROM pagodas p 
            LEFT JOIN pagoda_images pi
            ON p.id = pi.pagoda_id
            GROUP BY p.id 
            ORDER BY p.id DESC
            `
        );

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
            visit_date,
            description,
            history
        } = req.body;


        const [pagoda] = await db.query(
            "SELECT * FROM pagodas WHERE id=?",
            [id]
        );

        if (pagoda.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Pagoda not found"
            });
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

        // Update Pagoda
        const [data] = await db.query(
            `
            UPDATE pagodas
            SET
                name=?,
                location=?,
                tags=?,
                visit_date=?,
                description=?,
                history=?
            WHERE id=?
            `,
            [
                name,
                location,
                JSON.stringify(tags),
                visit_date,
                description,
                history,
                id
            ]
        );


        if (req.files && req.files.length > 0) {


            const [oldImages] = await db.query(
                "SELECT * FROM pagoda_images WHERE pagoda_id=?",
                [id]
            );


            for (const img of oldImages) {

                const oldPath = path.join(
                    process.cwd(),
                    img.image
                );

                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }

            }


            await db.query(
                "DELETE FROM pagoda_images WHERE pagoda_id=?",
                [id]
            );

            // Upload Folder
            const uploadFolder = path.join(
                process.cwd(),
                "images",
                "pagoda"
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
                    INSERT INTO pagoda_images
                    (pagoda_id,image)
                    VALUES (?,?)
                    `,
                    [
                        id,
                        `images/pagoda/${fileName}`
                    ]
                );

            }

        }

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

        const [images] = await db.query("SELECT * FROM pagoda_images WHERE pagoda_id=?", [id]);
        for (const img of images) {
            const imagePath = path.join(process.cwd(), img.image);

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath)
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
        const [data] = await db.query(`
            SELECT
                p.id,
                p.name,
                p.location,
                p.tags,
                p.visit_date,
                p.description,
                p.history,
                DATE_FORMAT(p.created_at,'%d-%m-%Y') AS created_at,
                 COALESCE(
                    JSON_ARRAYAGG(pi.image),
                    JSON_ARRAY()
                ) AS images
            FROM pagodas p
            LEFT JOIN pagoda_images pi
            ON p.id = pi.pagoda_id
            WHERE p.id=?
            GROUP BY p.id
        `, [id]);
        if (data.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Pagoda not found"
            });
        }

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

export const pagodaSearch = asyncHandel(async (req, res) => {
    try {
        const { search = "" } = req.query;
        const keyword = `%${search}%`;
        const [data] = await db.query(
            `SELECT 
             p.id,
             p.name,
             p.location,
             p.tags,
             p.visit_date,
             p.description,
             p.history,
            DATE_FORMAT(p.created_at,'%d-%m-%Y') AS created_at,
            COALESCE(
                    JSON_ARRAYAGG(pi.image),
                    JSON_ARRAY()
                ) AS images
            
            FROM pagodas p LEFT JOIN pagoda_images pi ON p.id  = pi.pagoda_id
            WHERE p.name LIKE ? OR p.location LIKE ? OR p.description LIKE ? OR p.history LIKE ? OR JSON_SEARCH(p.tags, 'one', ?) IS NOT NULL
            GROUP BY p.id ORDER BY p.id DESC
            `,
            [keyword, keyword, keyword, keyword, search]
        );
        return res.status(200).json({
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

export const pagodaFilter = asyncHandel(async (req, res) => {
    try {

        const { location = "", name = "", tags = "", visit_date = " " } = req.query;
        let data = `
                SELECT
                P.id,
                p.name,
                p.location,
                p.tags,
                p.visit_date,
                p.description,
                p.history,
                DATE_FORMAT(p.created_at,'%d-%m-%Y') AS created_at,
                COALESCE(
                    JSON_ARRAYAGG(pi.image),
                    JSON_ARRAY()
                ) AS images
               FROM pagodas p LEFT JOIN pagoda_images pi ON p.id = pi.pagoda_id WHERE 1 = 1;
               `;
        const values = []
        if (name) {
            data += `AND p.name = ?`;
            values.push(name)
        }
        if (location) {
            data += `AND p.location = ?`;
            values.push(location)
        }
        if (tags) {
            data += `AND JSON_SEARCH(p.tags,'one',?) IS NOT NULL = ?`;
            values.push(tags)
        }
        if (visit_date) {
            data += `AND p.visit_date = ?`;
            values.push(visit_date)
        }
        data += `GROUP BY p.id ORDER BY pi.id DESC`

        const [pagoda] = await db.query(sql, values);

        return res.status(200).json({
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