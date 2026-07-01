import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";


export const pagodaCreate = asyncHandel(async (req, res) => {
    try {

        let { name, location, tags, fee, visit_date, discount, description, history } = req.body;
        if (!name || !location || !fee || !visit_date) {
            return res.status(401).json({
                message: 'All field are required!',
                success: false
            })
        }
        if (!tags) {
            tags = []
        }
        if (typeof tags === "string") {
            try {
                tags = JSON.parse(tags);
            } catch (err) {
                tags = tags
                    .split(",")
                    .map(item => item.trim())
                    .filter(Boolean);
            }
        }
        const total_fee = Number(fee) - (Number(fee) * Number(discount) / 100);
        const uploadFolder = path.join(process.cwd(), "images", "pagoda")
        if (!fs.existsSync(uploadFolder)) {
            fs.mkdirSync(uploadFolder, { recursive: true })
        }
        let imagePath = null;
        if (req.file) {
            const fileName = `${uuid()}.webp`;
            const savePath = path.join(uploadFolder, fileName)

            await sharp(req.file.buffer)
                .resize({
                    width: 1920,
                    withoutEnlargement: true
                })
                .webp({ quality: 90 })
                .toFile(savePath)

            imagePath = `images/pagoda/${fileName}`
        }

        const [data] = await db.query(
            `
            INSERT INTO pagodas 
            (name,location,tags,fee,visit_date,discount,total_fee,description,history,image)
            VALUES (?,?,?,?,?,?,?,?,?,?)
            `,
            [name, location, JSON.stringify(tags), fee, visit_date, discount, total_fee, description, history, imagePath]
        );
        return res.status(201).json({
            success: true,
            message: "Pagoda created successfully.",
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
        let { name, location, tags, fee, visit_date, discount, description, history } = req.body;
        const [pagoda] = await db.query("SELECT * FROM pagodas WHERE id = ?", [id]);
        if (pagoda.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Pagoda not found"
            });
        }
        let currentImage = [];
        if (pagoda[0].image) {
            currentImage = pagoda[0].image.split(",").filter(img => img.trim() !== "")
        }
        let updatedImageString = pagoda[0].image;
        if (req.file) {
            for (const image of currentImage) {
                const oldPath = path.join(process.cwd(), image);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath)
                }
            }
            const newImagePath = [];
            const uploadFolder = path.join(process.cwd(), "images", "pagoda");

            if (!fs.existsSync(uploadFolder)) {
                fs.mkdirSync(uploadFolder, { recursive: true });
            }

            const fileName = `${uuid()}.webp`;
            const savePath = path.join(uploadFolder, fileName);

            await sharp(req.file.buffer)
                .resize({ width: 1920, withoutEnlargement: true })
                .webp({ quality: 90 })
                .toFile(savePath);

            newImagePath.push(`images/pagoda/${fileName}`);
        }
        updatedImageString = newImagePath.join(",");

        const total_fee = Number(fee) - (Number(fee) * Number(discount) / 100);
        if (!tags) {
            tags = []
        }
        if (typeof tags === "string") {
            try {
                tags = JSON.parse(tags);
            } catch (err) {
                tags = tags
                    .split(",")
                    .map(item => item.trim())
                    .filter(Boolean);
            }
        }

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
            WHERE id = ?
            `,
            [name, location, JSON.stringify(tags), fee, visit_date, discount, total_fee, description, history, updatedImageString, id]
        );
        res.status(200).json({
            success: true,
            message: "pagoda Updated Successfully",
            data
        });


    } catch (error) {
        console.log(error)
        return res.status(500).json({
            message: error.message,
            success: false
        })
    }
})