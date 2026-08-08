import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";


export const thonebaneBookingCreate = asyncHandel(async (req, res) => {
    try {

        const { thonebane_id, customer_name, customer_phone, booking_date, passenger_count, note } = req.body;
        if (req.user.role !== "user") {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }
        if (
            !thonebane_id ||
            !customer_name ||
            !customer_phone ||
            !booking_date ||
            !passenger_count
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required!"
            });
        }
        const [thonebane] = await db.query("SELECT id,shop_id,capacity,price,price_per_day,status FROM thonebanes WHERE id = ?", [thonebane_id]);
        if (thonebane.length === 0) {
            return res.status(404).json({
                success: false,
                message: "ThoneBane not found!"
            });
        }

        const item = thonebane[0]
        if (item.status !== "available") {
            return res.status(400).json({
                success: false,
                message: "ThoneBane is unavailable!"
            });
        }

        const [booking] = await db.query(`
            INSERT INTO thonebane_bookings  
            (
            user_id,
            shop_id,
            thonebane_id,
            customer_name,
            customer_phone,
            passenger_count,
            booking_date,
            note
            )
            VALUES (?,?,?,?,?,?,?,?)
            `, [
            req.user.id,
            item.shop_id,
            item.id,
            customer_name,
            customer_phone,
            passenger_count,
            booking_date,
            note || null
        ])
        return res.status(201).json({
            success: true,
            message: "Booking created successfully.",
            booking_id: booking.insertId,
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
})

export const thonebaneBookingList = asyncHandel(async (req, res) => {
    try {

        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }
        let query = ` 
        SELECT 
        b.id AS booking_id,
        b.user_id,
        b.shop_id,
        b.thonebane_id,
        
        b.customer_name,
        b.customer_phone,
        b.booking_date,
        b.passenger_count,
        b.status,
        b.note,

        t.name AS thonebane_name,
        t.price,
        t.price_per_day,

        s.shop_name

        FROM thonebane_bookings b JOIN thonebanes t ON b.thonebane_id = t.id
        JOIN shops s ON b.shop_id = s.id 
        `;

        let params = [];
        if (req.user.role === "shop") {
            const [shops] = await db.query(
                "SELECT id FROM shops WHERE user_id = ?",
                [req.user.id]
            );
            if (shops.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Shop not found!"
                });
            }
            const shop_id = shops[0].id;
            query += ` WHERE b.shop_id = ?`;
            params.push(shop_id)
        }

        query += ` ORDER BY b.id DESC`
        const [booking] = await db.query(query, params);
        return res.status(200).json({
            success: true,
            message: "Booking List Success",
            booking
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
})

export const thonebane_bookingApproved = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;

        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        let shop_id;

        if (req.user.role === "shop") {

            const [shop] = await db.query(
                "SELECT id FROM shops WHERE user_id = ?",
                [req.user.id]
            );

            if (shop.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Shop not found!"
                });
            }

            shop_id = shop[0].id;
        }

        let bookingQuery = "SELECT * FROM thonebane_bookings WHERE id = ?";
        let bookingParams = [id];

        if (req.user.role === "shop") {
            bookingQuery += " AND shop_id = ?";
            bookingParams.push(shop_id);
        }

        const [booking] = await db.query(
            bookingQuery,
            bookingParams
        );

        if (booking.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found!"
            });
        }


        const [data] = await db.query("UPDATE thonebane_bookings SET status ='approved'  WHERE id = ? AND shop_id = ?", [id, shop_id]);

        return res.status(200).json({
            success: true,
            message: "ThoneBane Booking Approved Successfully",
            data
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export const thonebane_bookingCancelled = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;

        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        let shop_id;

        if (req.user.role === "shop") {

            const [shop] = await db.query(
                "SELECT id FROM shops WHERE user_id = ?",
                [req.user.id]
            );

            if (shop.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Shop not found!"
                });
            }

            shop_id = shop[0].id;
        }

        let bookingQuery = "SELECT * FROM thonebane_bookings WHERE id = ?";
        let bookingParams = [id];

        if (req.user.role === "shop") {
            bookingQuery += " AND shop_id = ?";
            bookingParams.push(shop_id);
        }

        const [booking] = await db.query(
            bookingQuery,
            bookingParams
        );

        if (booking.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Booking not found!"
            });
        }


        const [data] = await db.query("UPDATE thonebane_bookings SET status ='cancelled'  WHERE id = ? AND shop_id = ?", [id, shop_id]);

        return res.status(200).json({
            success: true,
            message: "ThoneBane Booking Cancelled Successfully",
            data
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export const thonebaneMobileBooking = asyncHandel(async (req, res) => {
    try {
        if (req.user.role !== "user") {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }
        const [data] = await db.query(`
        SELECT
        b.id AS booking_id,
        b.user_id,
        b.shop_id,
        b.thonebane_id,
        
        b.customer_name,
        b.customer_phone,
        b.booking_date,
        b.passenger_count,
        b.status,
        b.note,

        t.name AS thonebane_name,
        t.price,
        t.price_per_day,

        s.shop_name

        FROM thonebane_bookings b JOIN thonebanes t ON b.thonebane_id = t.id
        JOIN shops s ON b.shop_id = s.id 

        WHERE b.user_id = ?

        ORDER BY b.id DESC
        `, [req.user.id])
        return res.status(200).json({
            success: true,
            message: "Booking Success",
            count: data.length,
            data
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
})