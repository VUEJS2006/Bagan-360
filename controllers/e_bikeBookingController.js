import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";


export const e_bikeBookingCreate = asyncHandel(async (req, res) => {
    try {

        const {
            e_bike_id,
            price_id,
            customer_name,
            customer_phone,
            booking_date,
            passenger_count,
            note
        } = req.body;

        if (req.user.role !== "user") {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        if (
            !e_bike_id ||
            !price_id ||
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

        const [e_bike] = await db.query(
            `
            SELECT *
            FROM e_bikes
            WHERE id = ?
            `,
            [e_bike_id]
        );


        if (e_bike.length === 0) {
            return res.status(404).json({
                success: false,
                message: "E-Bike not found!"
            });
        }


        const item = e_bike[0];

        if (item.status !== "available") {
            return res.status(400).json({
                success: false,
                message: "E-Bike is unavailable!"
            });
        }

        const [pricing] = await db.query(
            `
            SELECT
                id,
                e_bike_id,
                price_type,
                start_time,
                end_time,
                price
            FROM e_bike_prices
            WHERE id = ?
            AND e_bike_id = ?
            `,
            [
                price_id,
                e_bike_id
            ]
        );


        if (pricing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "E-bike pricing not found!"
            });
        }


        const selectedPrice = pricing[0];


        const [booking] = await db.query(
            `
            INSERT INTO e_bike_bookings
            (
                user_id,
                shop_id,
                e_bike_id,
                price_id,

                customer_name,
                customer_phone,
                passenger_count,
                booking_date,
                note
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                req.user.id,
                item.shop_id,
                item.id,
                selectedPrice.id,

                customer_name,
                customer_phone,
                passenger_count,
                booking_date,
                note || null
            ]
        );


        return res.status(201).json({
            success: true,
            message: "Booking created successfully.",

            booking_id: booking.insertId,

            price: {
                id: selectedPrice.id,
                price_type: selectedPrice.price_type,
                start_time: selectedPrice.start_time,
                end_time: selectedPrice.end_time,
                price: selectedPrice.price
            }
        });


    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export const e_bikeBookingList = asyncHandel(async (req, res) => {
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
                b.e_bike_id,
                b.price_id,

                b.customer_name,
                b.customer_phone,
                DATE_FORMAT(b.booking_date, '%d-%m-%Y') AS booking_date,
                b.passenger_count,

                b.status,
                b.note,

                e.name AS e_bike_name,
                e.code,
                e.brand,
                e.color,
                e.location,
                e.image,

                e.status AS bike_status,
                e.battery_percentage,
                e.helmet,
                e.battery_voltage,
                e.battery_capacity,
                e.passenger_count AS bike_passenger_count,
                e.phone_holder,

                t.name AS type_name,
                t.distance,

                s.shop_name,

                CASE
                    WHEN p.price_type = 'full_day' THEN 'Full Day'
                    WHEN p.price_type = 'half_day_1' THEN 'Half Day 1'
                    WHEN p.price_type = 'half_day_2' THEN 'Half Day 2'
                    WHEN p.price_type = 'hourly' THEN 'Hourly'
                    ELSE p.price_type
                END AS selected_price_type,

                p.start_time,
                p.end_time,
                p.price AS selected_price

            FROM e_bike_bookings b

            JOIN e_bikes e
                ON b.e_bike_id = e.id

            JOIN e_bike_types t
                ON e.type_id = t.id

            JOIN shops s
                ON b.shop_id = s.id

            JOIN e_bike_prices p
                ON b.price_id = p.id
        `;

        let params = [];
        let shop_id = null;

        // Shop user
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

            shop_id = shops[0].id;

            query += ` WHERE b.shop_id = ?`;
            params.push(shop_id);
        }

        query += ` ORDER BY b.id DESC`;

        const [booking] = await db.query(query, params);




        let countQuery = `
            SELECT
                COUNT(*) AS total_count,

                COALESCE(
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END),
                    0
                ) AS pending_count,

                COALESCE(
                    SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END),
                    0
                ) AS approved_count,

                COALESCE(
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END),
                    0
                ) AS cancelled_count

            FROM e_bike_bookings
        `;

        let countParams = [];

        if (req.user.role === "shop") {
            countQuery += ` WHERE shop_id = ?`;
            countParams.push(shop_id);
        }

        const [counts] = await db.query(countQuery, countParams);

        let typeQuery = `
        SELECT t.id AS type_id,
        t.name AS type_name,
        COUNT(b.id) AS count
        FROM e_bike_bookings b JOIN e_bikes e ON b.e_bike_id = e.id
        JOIN e_bike_types t ON e.type_id = t.id
        `
        let typeParams = [];

        if (req.user.role === "shop") {
            typeQuery += ` WHERE b.shop_id = ?`;
            typeParams.push(shop_id);
        }
        typeQuery += `
            GROUP BY t.id, t.name
            ORDER BY count DESC
        `;
        const [type_count] = await db.query(
            typeQuery,
            typeParams
        );

        let priceQuery = `
        SELECT 
        CASE 
            WHEN p.pice_type = 'full_day' THEN 'Full Day'
            WHEN p.price_type = 'half_day_1' THEN 'Half Day 1'
            WHEN p.price_type = 'half_day_2' THEN 'Half Day 2'
            WHEN p.price_type = 'hourly' THEN 'Hourly'
            ELSE p.price_type,
        
        ELSE AS price_type,
        COUNT(b.id) AS count
        FROM e_bike_bookings b 
        JOIN e_bike_prices p 
        ON b.price_id = p.id
    
        `
        let priceParams = [];
        if (req.user.role === "shop") {
            priceQuery += ` WHERE b.shop_id = ?`;
            priceParams.push(shop_id);
        }

        priceQuery += `
            GROUP BY p.price_type
            ORDER BY count DESC
        `;

        const [price_count] = await db.query(
            priceQuery,
            priceParams
        );

        return res.status(200).json({
            success: true,
            message: "Booking List Success",

            total_count: counts[0].total_count,
            pending_count: counts[0].pending_count,
            approved_count: counts[0].approved_count,
            cancelled_count: counts[0].cancelled_count,
            type_count,
            price_count,
            booking
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export const e_bikeBookingApproved = asyncHandel(async (req, res) => {
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

        let bookingQuery = "SELECT * FROM e_bike_bookings WHERE id = ?";
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


        const [data] = await db.query("UPDATE e_bike_bookings SET status ='approved'  WHERE id = ? AND shop_id = ?", [id, shop_id]);

        return res.status(200).json({
            success: true,
            message: "E-Bike Booking Approved Successfully",
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

export const e_bikeBookingCancelled = asyncHandel(async (req, res) => {
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

        let bookingQuery = "SELECT * FROM e_bike_bookings WHERE id = ?";
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


        const [data] = await db.query("UPDATE e_bike_bookings SET status ='cancelled'  WHERE id = ? AND shop_id = ?", [id, shop_id]);

        return res.status(200).json({
            success: true,
            message: "E-Bike Booking Cancelled Successfully",
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

export const e_bikeMobileBooking = asyncHandel(async (req, res) => {
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
                b.e_bike_id,
                b.price_id,

                b.customer_name,
                b.customer_phone,
                DATE_FORMAT(b.booking_date, '%d-%m-%Y') AS booking_date,
                b.passenger_count,

              
                b.status,
                b.note,


                e.name AS e_bike_name,
                e.code,
                e.brand,
                e.color,
                e.location,
                e.image,

               

                e.status AS bike_status,
                e.battery_percentage,
                e.helmet,
                e.battery_voltage,
                e.battery_capacity,
                e.passenger_count AS bike_passenger_count,
                e.phone_holder,

                t.name AS type_name,
                t.distance,

                s.shop_name,

                CASE
                    WHEN p.price_type = 'full_day' THEN 'Full Day'
                    WHEN p.price_type = 'half_day_1' THEN 'Half Day 1'
                    WHEN p.price_type = 'half_day_2' THEN 'Half Day 2'
                    WHEN p.price_type = 'hourly' THEN 'Hourly'
                    ELSE p.price_type
                END AS selected_price_type,
                p.start_time,
                p.end_time,
                p.price AS selected_price

            FROM e_bike_bookings b

            JOIN e_bikes e
                ON b.e_bike_id = e.id

            JOIN e_bike_types t
                ON e.type_id = t.id

            JOIN shops s
                ON b.shop_id = s.id

            JOIN e_bike_prices p
                ON b.price_id = p.id

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