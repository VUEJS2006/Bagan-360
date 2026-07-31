import db from "../config/db.js"
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs"
import path from "path"
import sharp from "sharp";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import { generateOTP } from "../helper/generatorOTP.js";
import { sendMail, sentOTP } from "../helper/mail.js";
import { v4 as uuid } from "uuid";

export const register = asyncHandel(async (req, res) => {
    try {
        const { username, email, password, gender, township, region, phone, address } = req.body;

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
                role: "user"

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
                phone: user.phone,
                role: user.role,
                region: user.region,
                township: user.township,
                address: user.address,
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

export const logout = asyncHandel(async (req, res) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        return res.status(200).json({
            message: "Logout successful",
            success: true
        });
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            message: error.message,
            success: false
        })
    }
})

export const userList = asyncHandel(async (req, res) => {
    try {

        const [data] = await db.query("SELECT * FROM users ORDER BY id DESC");
        return res.status(200).json({
            success: true,
            data
        })

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            message: error.message,
            success: false
        })
    }
})

export const roleUpdate = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;
        const { role } = req.body;
        const [roleCheck] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
        if (roleCheck.length === 0) {
            return res.status(401).json({
                message: "User not found!",
                success: false
            })
        }

        const [data] = await db.query("UPDATE users SET role = ? WHERE id = ?", [role, id]);
        return res.status(200).json({
            message: "Role Update Success!",
            success: true
        })

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            message: error.message,
            success: false
        })
    }
})

export const userProfile = asyncHandel(async (req, res) => {
    try {

        const userId = req.user.id;
        const [userProfile] = await db.query("SELECT id,username,email,phone,gender,region,township,address,image FROM users WHERE id = ?", [userId])
        res.status(200).json({
            success: true,
            data: userProfile[0]
        });
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            message: error.message,
            success: false
        })
    }
})

export const userProfileEdit = asyncHandel(async (req, res) => {
    try {
        const userId = req.user.id;
        const { username, email, region, township, phone, address } = req.body;

        const [checkUser] = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
        if (checkUser.length === 0) {
            return res.status(401).json({
                message: "User is not authenticated!",
                success: false
            })
        }

        let newImageUpdate = checkUser[0].image;
        if (req.file) {
            if (checkUser[0].image) {
                const oldPath = path.join(process.cwd(), checkUser[0].image);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath)
                }
            }

            const uploadFolder = path.join(process.cwd(), "images", "authentication");
            if (!fs.existsSync(uploadFolder)) {
                fs.mkdirSync(uploadFolder, { recursive: true })
            }
            const fileName = `${uuid()}.webp`;
            const savePath = path.join(uploadFolder, fileName);
            await sharp(req.file.buffer)
                .resize({
                    width: 1920,
                    withoutEnlargement: true
                })
                .webp({
                    quality: 90
                })
                .toFile(savePath);


            newImageUpdate = `images/authentication/${fileName}`;

        }
        const [data] = await db.query("UPDATE users SET username = ?,email = ?,phone = ? ,address = ?,region = ?,township = ?,image = ? WHERE id = ?",
            [username || checkUser[0].username,
            email || checkUser[0].email,
            phone || checkUser[0].phone,
            address || checkUser[0].address,
            region || checkUser[0].region,
            township || checkUser[0].township,
                newImageUpdate,
                userId
            ]
        );
        return res.status(200).json({
            message: "Profile updated successfully",
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

export const userChangePassword = asyncHandel(async (req, res) => {
    try {

        const userId = req.user.id;
        const { CurrentPassword, NewPassword, ConfirmPassword } = req.body || {};
        const [checkUser] = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
        if (checkUser.length === 0) {
            return res.status(401).json({
                message: "User is not found!",
                success: false
            })
        }
        const isMatch = await bcrypt.compare(CurrentPassword, checkUser[0].password);
        if (!isMatch) {
            return res.status(401).json({
                message: "Current password is incorrect!",
                success: false
            })
        }
        if (NewPassword !== ConfirmPassword) {
            return res.status(400).json({
                message: "New password and confirm password do not match!",
                success: false
            });
        }
        if (CurrentPassword === NewPassword) {
            return res.status(400).json({
                message: "New password cannot be same as old password!",
                success: false
            });
        }

        const hashPassword = await bcrypt.hash(NewPassword, 12);

        const [data] = await db.query("UPDATE users SET password = ? WHERE id = ?", [hashPassword, userId]);
        return res.status(200).json({
            message: "Change Password successfully",
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

export const AccountDelete = asyncHandel(async (req, res) => {
    try {

        const userID = req.user.id;
        const { email, text, password } = req.body;

        const [checkUser] = await db.query("SELECT * FROM users WHERE id = ?", [userID]);

        if (checkUser.length === 0) {
            return res.status(401).json({
                message: "User is not found!",
                success: false
            })
        }

        if (email !== checkUser[0].email) {
            return res.status(401).json({
                message: "Email Invalid!",
                success: false
            })
        }

        const isMatch = await bcrypt.compare(password, checkUser[0].password);
        if (!isMatch) {
            return res.status(401).json({
                message: "Password Does not match!",
                success: false
            })
        }

        if (text !== "DELETE") {
            return res.status(401).json({
                message: "Please Write DELETE!",
                success: false
            })
        }

        const [data] = await db.query("DELETE FROM users WHERE id = ?", [userID]);
        res.status(200).json({
            success: true,
            message: "User Account Deleted Successfully!",
            data: { data }
        });

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            message: error.message,
            success: false
        })
    }
})

export const shopRegister = asyncHandel(async (req, res) => {
    try {

        const {
            username,
            email,
            password,
            address,
            township,
            region,

            shop_name,
            shop_address,
            shop_phone,
            nrc,
            type
        } = req.body


        if (
            !username || !email || !password || !shop_name || !shop_address || !shop_phone || !type
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required!"
            });
        }

        const [checkEmail] = await db.query("SELECT * FROM users WHERE  email = ?", [email]);
        if (checkEmail.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Email is Already Exists!"
            });
        }

        const otp = generateOTP();
        await db.query(
            "DELETE FROM otp_codes WHERE email = ?",
            [email]
        );

        await db.query(
            `INSERT INTO otp_codes
            (email, otp, expires_at)
            VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
            [email, otp]
        );


        await sentOTP(email, otp)
        const generateToken = jwt.sign({
            username,
            email,
            password,
            address,
            township,
            region,
            shop_name,
            shop_address,
            shop_phone,
            nrc,
            type,
            role: "shop"
        }, process.env.JWT_SECRET, { expiresIn: "15m" })

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully",
            token: generateToken
        });

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            message: error.message,
            success: false
        })
    }
})

export const shopVerifyOTP = asyncHandel(async (req, res) => {
    try {

        const { email, otp, token } = req.body;
        if (!email || !otp || !token) {
            return res.status(400).json({
                success: false,
                message: "All fields are required!"
            });
        }

        const [CheckOTP] = await db.query("SELECT * FROM otp_codes WHERE email = ? AND otp = ? AND expires_at > NOW()", [email, otp]);

        if (CheckOTP.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP"
            });
        }
        let user;
        try {
            user = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: "Token expired"
            });
        }

        const hashPassword = await bcrypt.hashSync(user.password, 12);

        const [userResult] = await db.query(`
            INSERT INTO users
            (
            username,
            email,
            password,
            address,
            region,
            township,
            role
            )
            VALUES (?,?,?,?,?,?,?)
            `, [user.username, user.email, hashPassword, user.address, user.region, user.township, "shop"]);

        const userId = userResult.insertId;

        await db.query(`
            INSERT INTO shops
            (user_id,shop_name,shop_address,shop_phone,nrc,type)
            VALUES (?,?,?,?,?,?)
            `, [userId, user.shop_name, user.shop_address, user.shop_phone, user.nrc, user.type]);

        await db.query(
            "DELETE FROM otp_codes WHERE email = ?",
            [email]
        );

        await sendMail(
            email,
            `
                <h3>Shop Registration Successfully</h3>

                <p>
                   သင့်ဆိုင်အား အကောက်ဖွ့င်ခြင်း အောင်မြင်ပါသည်။
                </p>

                <p>
                   ကျေးဇူးပြု၍ စောင့်ပေးပါ သင့်အကောက်အား အက်စ်မင်မှ စစ်ဆေးနေပါသည်။
                </p>
            `
        );

        return res.status(201).json({
            success: true,
            message: "Shop register successfully wait for admin approved!"
        });



    } catch (error) {
        console.log(error)
        return res.status(500).json({
            message: error.message,
            success: false
        })
    }
})

export const shopApproved = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;

        const [checkUser] = await db.query("SELECT * FROM shops WHERE id = ?", [id]);
        if (checkUser === 0) {
            return res.status(404).json({
                message: "User not found!",
                success: false
            })
        }

        const user = checkUser[0]

        const [data] = await db.query("UPDATE shops SET status = 'approved' WHERE id = ?", [id]);

        await sendMail(
            user.email,
            `<h3>Hello ${user.shop_name}, သင့်အကောက်အား အတည်ပြု စစ်ဆေး ပြီးပါပြီ။ </h3>`
        )
        res.status(200).json({
            success: true,
            message: "User approved successfully",
            data
        });



    } catch (error) {
        console.log(error)
        return res.status(500).json({
            message: error.message,
            success: false
        })
    }
})

export const shopCancel = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;

        const [checkUser] = await db.query("SELECT * FROM shops WHERE id = ?", [id]);
        if (checkUser === 0) {
            return res.status(404).json({
                message: "User not found!",
                success: false
            })
        }

        const user = checkUser[0]

        const [data] = await db.query("UPDATE shops SET status = 'cancelled' WHERE id = ?", [id]);

        await sendMail(
            user.email,
            `<h3>Hello ${user.shop_name}, သင့်အကောက်အား လက်မခံပါ ငြင်းပယ်လိက်ပါသည်။ </h3>`
        )
        res.status(200).json({
            success: true,
            message: "User Cancelled successfully",
            data
        });



    } catch (error) {
        console.log(error)
        return res.status(500).json({
            message: error.message,
            success: false
        })
    }
})