import jwt from "jsonwebtoken";
import "dotenv/config"

export const authenticated = (req, res, next) => {
    try {
        const token = req.cookies.access_token || req.headers.authorization?.split(" ")[1];
        console.log(token);
        if (!token) {
            return res.status(401).json({
                message: "Token Not Found!",
                success: false
            })
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        console.log("Decoded user:", req.user);
        console.log(req.headers.authorization);

        next();

    } catch (error) {
        console.log(error)
        return res.status(401).json({ message: "Invalid Token", success: false });
    }
}

export const isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Unauthorized,Please Signin to account!",
            success: false
        })
    }
    if (req.user.role !== "admin") {
        return res.status(401).json({
            message: "Admin Only Accept!",
            success: false
        })
    }
    next()
}