import jwt from "jsonwebtoken";
import "dotenv/config"

export const isAuth = (req, res, next) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ message: "Unauthorized", success: false });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        console.log("Decoded user:", req.user);
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid Token", success: false });
    }
};
export const isAdmin = (req, res, next) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({
            message: "Admin only!",
            success: false
        });
    }
    next();
};

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


