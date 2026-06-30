import jwt from "jsonwebtoken";
import "dotenv/config"

export const validateRegister = (req, res, next) => {
    const { email, password } = req.body;

    const emailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailFormat.test(email)) {
        return res.status(400).json({
            message: "Invalid email format",
            success: false
        });
    }
    if (password.length < 6) {
        return res.status(400).json({
            message: "Password must be at least 6 characters",
            success: false
        });
    }
    next();
}
