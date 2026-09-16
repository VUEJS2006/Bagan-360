import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";



export const sliderCreate = asyncHandel(async (req, res) => {
    try {
        const { link } = req.body;
        const uploadFolder = path.join(process.cwd(), "images", "slider")

        if (!fs.existsSync(uploadFolder)) {
            fs.mkdirSync(uploadFolder, { recursive: true })
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
                .toFile(savePath)
            imagePath = `images/slider/${fileName}`
        }

        const [data] = await db.query("INSERT INTO sliders (link,image) VALUES (?,?)", [link, imagePath]);
        return res.status(201).json({
            message: "slider Create Success",
            success: true,
            data
        })

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export const sliderList = asyncHandel(async (req, res) => {
    try {

        const [data] = await db.query("SELECT id,link,image,is_active FROM sliders ORDER BY id DESC");
        return res.status(404).json({
            message: "Slider List Success",
            success: true,
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

export const sliderUpdate = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;
        const { link } = req.body;
        const [sliders] = await db.query("SELECT * FROM sliders WHERE id = ?", [id]);
        if (sliders.length === 0) {
            return res.status(404).json({
                message: "Slider Not Found",
                success: false
            })
        }
        const updateImage = sliders[0].image;
        if (req.file) {
            const oldPath = path.join(process.cwd(), sliders[0].image);
            if (sliders[0].image) {
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath)
                }
            }
            const uploadFolder = path.join(process.cwd(), "images", "slider")
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

            updateImage = `images/slider/${fileName}`;
        }
        const [data] = await db.query("UPDATE sliders SET link = ?,image = ? WHERE id = ?", [link, updateImage, id]);
        return res.status(200).json({
            success: true,
            message: "Slider Updated Successfully",
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

export const sliderDelete = asyncHandel(async (req, res) => {
    try {
        const { id } = req.params;
        const [sliders] = await db.query("SELECT * FROM sliders WHERE id = ?", [id]);
        if (sliders.length === 0) {
            return res.status(404).json({
                message: "Slider Not Found",
                success: false
            })
        }
        if (sliders[0].image) {
            const imagePath = path.join(process.cwd(), sliders[0].image);

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await db.query("DELETE FROM sliders WHERE id = ?", [id]);
        res.status(200).json({
            success: true,
            message: "Slider deleted successfully"
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
})

// export const sliderActivate = asyncHandel(async (req, res) => {
//     try {

//         const { id } = req.params;
//         const [sliders] = await db.query("SELECT * FROM sliders WHERE id = ?", [id]);
//         if (sliders.length === 0) {
//             return res.status(404).json({
//                 message: "Slider Not Found",
//                 success: false
//             })
//         }
//         const activate = sliders[0].is_active

//     } catch (error) {
//         console.log(error);
//         return res.status(500).json({
//             success: false,
//             message: error.message
//         });
//     }
// })