import multer from "multer";

const storage = multer.memoryStorage();

export const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {

        const allowTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "image/avif",
        ];

        if (allowTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed."));
        }

    }
});