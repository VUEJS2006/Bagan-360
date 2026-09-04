import multer from "multer";
import path from "path";

const storage = multer.memoryStorage();

export const upload = multer({
    storage,

    limits: {
        fileSize: 20 * 1024 * 1024 // 20MB
    },

    fileFilter: (req, file, cb) => {

        const allowTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "image/avif",
        ];

        const ext = path.extname(file.originalname).toLowerCase();

        const allowExtensions = [
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
            ".avif"
        ];

        if (
            allowTypes.includes(file.mimetype) ||
            allowExtensions.includes(ext)
        ) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed."));
        }
    }
});