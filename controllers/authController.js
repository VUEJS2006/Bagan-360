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
        const { username, email, password, nrc, township, region, phone, address, birthday, role } = req.body;

        if (!username || !email || !password || !phone || !nrc) {
            return res.status(401).json({
                message: 'All field are required!',
                success: false
            })
        }

        const [CheckUser] = await db.query("SELECT  FROM users WHERE email = ?", [email]);
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
                nrc,
                phone
            },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
        );
        res.status(200).json({
            message: "OTP sent successfully",
            success: true,
            token: tempToken,
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
        if (CheckOTP === 0) {
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

        const hashPassword = await bcrypt.hash(use.password, 12);
        const [user] = await db.query("INSERT INTO users (username,email,password,nrc,phone,address,region,township,birthday,role) VALUES (?,?,?,?,?,?,?,?,?,?)"
        [
            user.username,
            user.email,
            user.phone,
            user.address,
            user.nrc,
            user.region,
            user.township,
            user.birthday,
            user.role,
            hashPassword
        ]
        );

        await db.query("DELETE FROM otp_codes WHERE email = ?", [email]);
        await sendMail(
            email,
            "Account Pending",
            `<h3>Hello your account is pending!!</h3>`

        );
        res.status(201).json({
            message: "Register success, waiting admin approval",
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