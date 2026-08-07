import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";


export const thonebaneBookingCreate = asyncHandel(async (req, res) => {
    try {

        const { thonebane_id, customer_name, customer_phone, pickup_location, destination, passenger_count, booking_date, pickup_time, note } = req.body;
        if (req.user.role === "user") {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }
        if (
            !thonebane_id ||
            !customer_name ||
            !customer_phone ||
            !pickup_location ||
            !passenger_count ||
            !booking_date ||
            !pickup_time
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

      
        const total_price = item.price;
        const [data] = await db.query(`
            INSERT INTO thonebane_bookings  
            (
            user_id,
            shop_id,
            thonebane_id,
            customer_name,
            customer_phone,
            pickup_location,
            destination,
            passenger_count,
            booking_date,
            pickup_time,
            total_price,
            note
            )
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            `, [
            req.user.id,
            item.shop_id,
            item.id,
            customer_name,
            customer_phone,
            pickup_location,
            destination,
            passenger_count,
            booking_date,
            pickup_time,
            total_price,
            note
        ])
        return res.status(201).json({
            success: true,
            message: "Booking created successfully.",
            booking_id: booking.insertId,
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