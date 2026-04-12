import db from "../config/db.js";
import bcrypt from "bcryptjs";
import { json } from "express";
import jwt from "jsonwebtoken";

import { asyncHandel } from "../middleware/asyncMiddleware.js";

export const register = asyncHandel(async (req, res) => {
    try {

        const { username, email, password, nrc, township, confirmPassword, region, phone, address, birthday } = req.body;
        // const image = req.file ? req.file.filename : null

        if (!username || !email || !password || !nrc || !township || !confirmPassword || !region) {
            return res.status(401).json({
                message: 'All field are required!',
                success: false
            })
        }

        const [checkUser] = await db.query("SELECT * FROM shareholders WHERE email = ? ", [email]);
        if (checkUser.length > 0) {
            return res.status(401).json({
                message: 'Email Already Exists!',
                success: false
            })
        } else if (password !== confirmPassword) {
            return res.status(401).json({
                message: 'Password and Confirm Password are not same!',
                success: false
            })
        }
        const hashedPassword = await bcrypt.hash(password, 12)

        await db.query(
            "INSERT INTO shareholders (username,email,password,region,nrc,township,phone,address,birthday) VALUES (?,?,?,?,?,?,?,?,?)",
            [username, email, hashedPassword, nrc, township, region, phone, address, birthday]
        );
        return res.status(201).json({ message: "User created successfully", success: true });

    } catch (err) {
        console.log(err)
        res.status(500).json({
            message: err.message,
            success: false
        })
    }
})
export const login = asyncHandel(async (req, res) => {
    try {

        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(401).json({
                message: 'All filed are required!',
                success: false
            })
        }

        const [userdata] = await db.query("SELECT * FROM shareholders WHERE email = ?", [email])
        const user = userdata[0]
        if (!user) {
            return res.status(401).json({
                message: 'Invalid system!',
                success: false
            })
        }
        if (!user.password) {
            return res.status(500).json({
                message: "Password not found in DB",
                success: false
            });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Password does not match" });
        }
        if (user.status === 'pending') {
            return res.status(403).json({ message: 'Account is pending approval', success: false });
        } else if (user.status === 'cancel') {
            return res.status(403).json({ message: 'Account has been cancelled', success: false });
        }
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '7d'
        })
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        })
        return res.status(200).json({
            message: 'Login Successfully!',
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                gender: user.gender,
                location: user.location,
                role: user.role,
                status: user.status
            }
        })

    } catch (err) {
        console.log(err)
        res.status(500).json({
            message: err.message,
            success: false
        })
    }
})

export const logout = asyncHandel(async (req, res) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        return res.status(200).json({
            message: "Logout successful",
            success: true
        });
    } catch (err) {
        res.status(500).json({
            message: err.message,
            success: false
        });
    }
})

export const pendingCheckUser = asyncHandel(async (req, res) => {
    try {
        const [users] = await db.query("SELECT * FROM shareholders WHERE status = 'pending'")
        res.status(200).json({
            success: true,
            message: 'pendingUser',
            data: users
        });

    } catch (err) {
        console.log(err)
        res.status(500).json({
            message: err.message,
            success: false
        });
    }
})

export const approvedUser = asyncHandel(async (req, res) => {
    try {
        const userId = req.params.id;
        const [checkUser] = await db.query("SELECT * FROM shareholders WHERE id = ?", [userId]);
        if (checkUser.length === 0) {
            return res.status(404).json({
                message: "User not found",
                success: false
            });
        }

        await db.query("UPDATE shareholders SET  status = 'approved' WHERE id = ?", [userId]);

        res.status(200).json({
            success: true,
            message: "User approved successfully"
        });


    } catch (err) {
        console.log(err)
        res.status(500).json({
            message: err.message,
            success: false
        });
    }
})
export const cancelledUser = asyncHandel(async (req, res) => {
    try {

        const userId = req.params.id;
        const [data] = await db.query("UPDATE shareholders SET status = 'cancel' WHERE id = ?",
            [userId]);
        res.status(200).json({
            message: "User cancelled successfully",
            success: true,
            data: {
                data
            }
        })


    }
    catch (err) {
        res.status(500).json({
            message: err.message,
            success: false
        });
    }
})

export const pendingUser = asyncHandel(async (req, res) => {
    try {

        const userId = req.params.id;
        const [data] = await db.query("UPDATE shareholders SET status = 'pending' WHERE id = ?",
            [userId]);
        res.status(200).json({
            message: "User Pending successfully",
            success: true,
            data: {
                data
            }
        })


    }
    catch (err) {
        res.status(500).json({
            message: err.message,
            success: false
        });
    }
})