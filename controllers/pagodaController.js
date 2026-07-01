import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";


export const pagodaCreate = asyncHandel(async (req, res) => {
    try {

        const { name, location, tags, fee, visit_date, discount, description, history } = req.body;
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