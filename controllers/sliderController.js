import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";



export const sliderCreate = asyncHandel(async (req, res) => {
    try {
        const { link, title, timer = 10 } = req.body;

        const sliderTimer = Number(timer);

        if (!Number.isInteger(sliderTimer) || sliderTimer <= 0) {
            return res.status(400).json({
                success: false,
                message: "Timer must be a positive integer!"
            });
        }

        const uploadFolder = path.join(process.cwd(), "images", "slider");

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

            imagePath = `images/slider/${fileName}`;
        }

        const [data] = await db.query(
            "INSERT INTO sliders (link, image, title, timer) VALUES (?, ?, ?, ?)",
            [link, imagePath, title, sliderTimer]
        );

        return res.status(201).json({
            message: "Slider Create Success",
            success: true,
            data: {
                id: data.insertId,
                link,
                image: imagePath,
                title,
                timer: sliderTimer
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
export const sliderList = asyncHandel(async (req, res) => {
    try {
        const [data] = await db.query(
            `
            SELECT
                id,
                link,
                image,
                title,
                timer,
                is_active
            FROM sliders
            ORDER BY id DESC
            `
        );

        return res.status(200).json({
            message: "Slider List Success",
            success: true,
            count: data.length,
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


export const sliderUpdate = asyncHandel(async (req, res) => {
    try {
        const { id } = req.params;
        const { link, title, timer } = req.body;

        if (!id || !Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Slider id is required!"
            });
        }

        const [sliders] = await db.query(
            "SELECT * FROM sliders WHERE id = ?",
            [Number(id)]
        );

        if (sliders.length === 0) {
            return res.status(404).json({
                message: "Slider Not Found",
                success: false
            });
        }

        const currentSlider = sliders[0];

        const updateTimer = timer === undefined
            ? currentSlider.timer
            : Number(timer);

        if (!Number.isInteger(updateTimer) || updateTimer <= 0) {
            return res.status(400).json({
                success: false,
                message: "Timer must be a positive integer!"
            });
        }

        let updateImage = currentSlider.image;

        if (req.file) {
            const uploadFolder = path.join(process.cwd(), "images", "slider");

            if (!fs.existsSync(uploadFolder)) {
                fs.mkdirSync(uploadFolder, {
                    recursive: true
                });
            }

            const fileName = `${uuid()}.webp`;
            const savePath = path.join(uploadFolder, fileName);

            await sharp(req.file.buffer)
                .resize({
                    width: 1920,
                    withoutEnlargement: true
                })
                .webp({ quality: 90 })
                .toFile(savePath);

            updateImage = `images/slider/${fileName}`;
        }

        const [data] = await db.query(
            `
            UPDATE sliders
            SET link = ?, image = ?, title = ?, timer = ?
            WHERE id = ?
            `,
            [
                link === undefined ? currentSlider.link : link,
                updateImage,
                title === undefined ? currentSlider.title : title,
                updateTimer,
                Number(id)
            ]
        );

        if (req.file && currentSlider.image) {
            const oldPath = path.join(process.cwd(), currentSlider.image);

            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        return res.status(200).json({
            success: true,
            message: "Slider Updated Successfully",
            data: {
                id: Number(id),
                link: link === undefined ? currentSlider.link : link,
                image: updateImage,
                title: title === undefined ? currentSlider.title : title,
                timer: updateTimer
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

export const sliderActivate = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;
        const [sliders] = await db.query("SELECT * FROM sliders WHERE id = ?", [id]);
        if (sliders.length === 0) {
            return res.status(404).json({
                message: "Slider Not Found",
                success: false
            })
        }
        const currentStatus = sliders[0].is_active;
        const newStatus = currentStatus ? false : true
        await db.query(
            "UPDATE sliders SET is_active = ? WHERE id = ?",
            [newStatus, id]
        );
        return res.status(200).json({
            success: true,
            message: newStatus
                ? "Slider Activated Successfully"
                : "Slider Deactivated Successfully",
            is_active: newStatus
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
})

export const sliderMobileList = asyncHandel(async (req, res) => {
    try {
        const [data] = await db.query(
            `
            SELECT
                id,
                link,
                title,
                image,
                timer,
                is_active
            FROM sliders
            WHERE is_active = 1
            ORDER BY id DESC
            `
        );

        return res.status(200).json({
            message: "Slider Mobile List Success",
            success: true,
            count: data.length,
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















