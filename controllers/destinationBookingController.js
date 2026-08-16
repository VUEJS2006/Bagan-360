import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";


export const destinationBookingCreate = asyncHandel(async (req, res) => {
    try {

        const {
            destination_id,
            price_id,
            customer_name,
            customer_phone,
            booking_date,
            note
        } = req.body;

        if (req.user.role !== "user") {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        if (
            !destination_id ||
            !price_id ||
            !customer_name ||
            !customer_phone ||
            !booking_date
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required!"
            });
        }

        const [destination] = await db.query(
            `
            SELECT *
            FROM destinations
            WHERE id = ?
            `,
            [destination_id]
        );


        if (destination.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Destination  not found!"
            });
        }


        const item = destination[0];

        const [pricing] = await db.query(
            `
            SELECT
                id,
                destination_id,
                passenger,
                price
            FROM destination_prices
            WHERE id = ?
            AND destination_id = ?
            `,
            [
                price_id,
                destination_id
            ]
        );


        if (pricing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Destination pricing not found!"
            });
        }


        const selectedPrice = pricing[0];


        const [booking] = await db.query(
            `
            INSERT INTO destination_bookings
            (
                user_id,
                destination_id,
                price_id,

                customer_name,
                customer_phone,
                booking_date,
                note
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                req.user.id,
                item.id,
                selectedPrice.id,

                customer_name,
                customer_phone,
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
                passenger: selectedPrice.passenger,
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

export const destinationBookingList = asyncHandel(async (req, res) => {
    try {

        let query = `
            SELECT
                b.id AS booking_id,

                b.user_id,
                b.destination_id,
                b.price_id,

                b.customer_name,
                b.customer_phone,
                DATE_FORMAT(
                    b.booking_date,
                    '%d-%m-%Y'
                ) AS booking_date,

                b.status,
                b.note,

                d.title AS destination_name,
                d.zone,
                d.duration,
                d.image,
                d.transport,

                p.passenger,
                p.price AS selected_price

            FROM destination_bookings b

            JOIN destinations d
                ON b.destination_id = d.id

            JOIN destination_prices p
                ON b.price_id = p.id
                AND b.destination_id = p.destination_id
        `;

        let params = [];

        query += ` ORDER BY b.id DESC`;

        const [booking] = await db.query(
            query,
            params
        );

        return res.status(200).json({
            success: true,
            message: "Booking List Success",
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

export const destinationBookingApproved = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;


        let bookingQuery = "SELECT * FROM destination_bookings WHERE id = ?";
        let bookingParams = [id];

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


        const [data] = await db.query("UPDATE destination_bookings SET status ='approved'  WHERE id = ?",[id]);

        return res.status(200).json({
            success: true,
            message: "Destination Booking Approved Successfully",
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

export const destinationBookingCancelled = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;


        let bookingQuery = "SELECT * FROM destination_bookings WHERE id = ?";
        let bookingParams = [id];

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


        const [data] = await db.query("UPDATE destination_bookings SET status ='cancelled'  WHERE id = ?",[id]);

        return res.status(200).json({
            success: true,
            message: "Destination Booking Cancelled Successfully",
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


export const destinationMobileBooking = asyncHandel(async (req, res) => {
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
                b.destination_id,
                b.price_id,

                b.customer_name,
                b.customer_phone,

                DATE_FORMAT(
                    b.booking_date,
                    '%d-%m-%Y'
                ) AS booking_date,

                b.status,
                b.note,

                d.title AS destination_name,
                d.zone,
                d.duration,
                d.transport,
                d.tips,
                d.image,
                d.description,

                p.passenger,
                p.price AS selected_price

            FROM destination_bookings b

            JOIN destinations d
                ON b.destination_id = d.id

            JOIN destination_prices p
                ON b.price_id = p.id
                AND b.destination_id = p.destination_id

            WHERE b.user_id = ?

            ORDER BY b.id DESC
        `, [
            req.user.id
        ]);

        return res.status(200).json({
            success: true,
            message: "Destination Booking Success",
            count: data.length,
            data
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});