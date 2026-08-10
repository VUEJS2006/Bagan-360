import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";


export const restaurantBookingCreate = asyncHandel(async (req, res) => {
    try {

        const { restaurant_id, customer_name, customer_phone, booking_date, booking_time, guests, customer_request } = req.body;
        if (req.user.role !== "user") {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }
        if (
            !restaurant_id ||
            !customer_name ||
            !customer_phone ||
            !booking_date ||
            !booking_time ||
            !guests
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required!"
            });
        }
        const [restaurant] = await db.query("SELECT id,shop_id,dishes FROM restaurants WHERE id = ?", [restaurant_id]);
        if (restaurant.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found!"
            });
        }
        const item = restaurant[0]

        const [data] = await db.query(`
            INSERT INTO restaurant_bookings  
            (
            user_id,
            shop_id,
            restaurant_id,
            customer_name,
            customer_phone,
            guests,
            booking_date,
            booking_time,
            customer_request
            )
            VALUES (?,?,?,?,?,?,?,?,?)
            `, [
            req.user.id,
            item.shop_id,
            item.id,
            customer_name,
            customer_phone,
            guests,
            booking_date,
            booking_time,
            customer_request || null
        ])
        return res.status(201).json({
            success: true,
            message: "Restaurant Booking created successfully.",
            restaurant_id: data.insertId,
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
})

export const restaurantBookingList = asyncHandel(async (req, res) => {
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
        b.restaurant_id,
        
        b.customer_name,
        b.customer_phone,
        DATE_FORMAT(b.booking_date, '%d-%m-%Y') AS booking_date,
        TIME_FORMAT(b.booking_time, '%h:%i %p') AS booking_time,
        b.guests,
        b.status,
        b.customer_request,

       r.name AS restaurant_name,
        r.dishes,
        r.location,
        r.image,
        r.discount,
        r.phone,
        r.address,

        s.shop_name

        FROM restaurant_bookings b JOIN restaurants r ON b.restaurant_id = r.id
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

export const restaurant_bookingApproved = asyncHandel(async (req, res) => {
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

        let bookingQuery = "SELECT * FROM restaurant_bookings WHERE id = ?";
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


        const [data] = await db.query("UPDATE restaurant_bookings SET status ='approved'  WHERE id = ? AND shop_id = ?", [id, shop_id]);

        return res.status(200).json({
            success: true,
            message: "Restaurant Booking Approved Successfully",
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

export const restaurant_bookingCancelled = asyncHandel(async (req, res) => {
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

        let bookingQuery = "SELECT * FROM restaurant_bookings WHERE id = ?";
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


        const [data] = await db.query("UPDATE restaurant_bookings SET status ='cancelled'  WHERE id = ? AND shop_id = ?", [id, shop_id]);

        return res.status(200).json({
            success: true,
            message: "Restaurant Booking Cancelled Successfully",
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

export const restaurantMobileBooking = asyncHandel(async (req, res) => {
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
        b.restaurant_id,
        
        b.customer_name,
        b.customer_phone,
        b.booking_date,
        b.booking_time,
        b.guests,
        b.status,
        b.customer_request,

        r.name AS restaurant_name,
        r.dishes,
        r.location,
        r.image,
        r.discount,
        r.phone,
        r.address,

        s.shop_name

        FROM restaurant_bookings b

        JOIN restaurants r
        ON b.restaurant_id = r.id

        JOIN shops s
        ON b.shop_id = s.id

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