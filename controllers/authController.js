import db from "../config/db.js"
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs"
import path from "path"
import sharp from "sharp";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import { generateOTP } from "../helper/generatorOTP.js";
import { sendMail, sentOTP } from "../helper/mail.js";


export const register = asyncHandel(async (req, res) => {
    try {
        const { username, email, password, gender, township, region, phone, address, role } = req.body;

        if (!username || !email || !password || !phone || !gender) {
            return res.status(401).json({
                message: 'All field are required!',
                success: false
            })
        }

        const [checkUser] = await db.query("SELECT *  FROM users WHERE email = ?", [email]);
        if (checkUser.length > 0) {
            return res.status(401).json({
                message: 'Email Already Exists!',
                success: false
            })
        }

        const otp = generateOTP()

        await db.query("DELETE FROM otp_codes WHERE email = ?", [email]);
        await db.query("INSERT INTO otp_codes (email,otp,expires_at) VALUES (?,?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))", [email, otp]);
        await sentOTP(email, otp);

        const generateToken = jwt.sign(
            {
                username,
                email,
                gender,
                phone,
                password,
                township,
                region,
                address,
                role

            },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
        );
        res.status(200).json({
            message: "OTP sent successfully",
            success: true,
            token: generateToken,
        });
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            message: error.message,
            success: false
        })
    }
})

export const verifyOTP = asyncHandel(async (req, res) => {
    try {
        const { email, otp, token } = req.body;
        if (!email || !otp || !token) {
            return res.status(401).json({
                message: 'All field are required!',
                success: false
            })
        }
        const [CheckOTP] = await db.query("SELECT *  FROM otp_codes WHERE email = ? AND otp = ? AND expires_at > NOW()", [email, otp]);
        if (CheckOTP.length === 0) {
            return res.status(400).json({
                message: "Invalid or expired OTP",
                success: false
            });
        }
        let user;
        try {
            user = jwt.verify(token, process.env.JWT_SECRET);

        } catch (error) {
            return res.status(400).json({
                message: "Token expired"
            });
        }

        const hashPassword = await bcrypt.hash(user.password, 12);
        const [data] = await db.query("INSERT INTO users (username,email,password,gender,phone,address,region,township,role) VALUES (?,?,?,?,?,?,?,?,?)",
            [
                user.username,
                user.email,
                hashPassword,
                user.gender,
                user.phone,
                user.address,
                user.region,
                user.township,
                user.role,

            ]
        );

        await db.query("DELETE FROM otp_codes WHERE email = ?", [email]);
        await sendMail(
            email,
            "Account Registration Successfully",
            `<h3>please sign in to my Bagan 360 App</h3>`

        );
        res.status(201).json({
            message: "Register Success",
            success: true,
        });

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            message: error.message,
            success: false
        })
    }
})

export const login = asyncHandel(async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(401).json({
                message: 'All field are required!',
                success: false
            })
        }
        const [userdata] = await db.query("SELECT * FROM users WHERE email=?", [email]);
        const user = userdata[0]
        if (!user) {
            return res.status(401).json({
                message: 'user not found!',
                success: false
            })
        }
        if (!user.password) {
            return res.status(401).json({
                message: 'password not found!',
                success: false
            })
        }
        if (!user.email) {
            return res.status(500).json({
                message: "Email not found!",
                success: false
            });
        }
        const MatchPassword = await bcrypt.compare(password, user.password);
        if (!MatchPassword) {
            return res.status(401).json({ message: "Password does not match" });
        }
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" })
        res.cookie("access_token", token, {
            httpOnly: true,
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        })
        return res.status(200).json({
            message: 'success',
            success: true,
            token,
            user: {
                id: user.id,
                name: user.username,
                email: user.email,
                nrc: user.nrc,
                birthday: user.birthday,
                phone: user.phone,
                role: user.role,
                region: user.region,
                township: user.township,
                address: user.address,
                status: user.status,
                image: user.image
            }
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            message: error.message,
            success: false
        })
    }
})