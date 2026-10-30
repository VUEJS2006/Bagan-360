import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";



export const airballoonBookingCreate = asyncHandel(async (req, res) => {
    try {
        const {
            airballoon_id,
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
            !airballoon_id ||
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

        const [airballoon] = await db.query(
            `
            SELECT
                id,
                shop_id,
                is_active
            FROM airballons
            WHERE id = ?
            `,
            [airballoon_id]
        );

        if (airballoon.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Air Balloon not found!"
            });
        }

        const item = airballoon[0];

        if (item.status !== "available" || item.is_active !== 1) {
            return res.status(400).json({
                success: false,
                message: "Air Balloon is unavailable!"
            });
        }


        const [booking] = await db.query(
            `
            INSERT INTO airballoon_bookings
            (
                user_id,
                shop_id,
                airballoon_id,
                customer_name,
                customer_phone,
                passenger_count,
                booking_date,
                note
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                req.user.id,
                item.shop_id,
                item.id,
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
        });

    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});



export const airballoonBookingList = asyncHandel(async (req, res) => {
    try {
        if (!["admin", "shop"].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        let shop_id = null;

        if (req.user.role === "shop") {
            const [shops] = await db.query(
                `
                SELECT id
                FROM shops
                WHERE user_id = ?
                AND type = 'air_balloon'
                `,
                [req.user.id]
            );

            if (shops.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Shop not found!"
                });
            }

            shop_id = shops[0].id;
        }

        let query = `
            SELECT
                b.id AS booking_id,
                b.user_id,
                b.shop_id,
                b.airballoon_id,
                b.customer_name,
                b.customer_phone,

                DATE_FORMAT(
                    b.booking_date,
                    '%d-%m-%Y'
                ) AS booking_date,

                b.passenger_count,
                b.status,
                b.note,

                a.name,
                a.location,
                a.price_from,
                a.price_to,
                a.dollor_from,
                a.dollor_to,
                a.guest,
                a.description,
                a.rule,
                a.airballon_image1,
                a.airballon_image2,
                a.airballon_image3,

                s.shop_name,
                s.shop_phone,
                s.shop_address,
                s.location AS shop_location

            FROM airballon_bookings b

            JOIN airballons a
                ON b.airballoon_id = a.id

            JOIN shops s
                ON b.shop_id = s.id
        `;

        const params = [];

        if (req.user.role === "shop") {
            query += ` WHERE b.shop_id = ? `;
            params.push(shop_id);
        }

        query += ` ORDER BY b.id DESC `;

        const [booking] = await db.query(query, params);

        let countQuery = `
            SELECT
                COUNT(*) AS total_count,
                COALESCE(SUM(status = 'pending'), 0) AS pending_count,
                COALESCE(SUM(status = 'approved'), 0) AS approved_count,
                COALESCE(SUM(status = 'cancelled'), 0) AS cancelled_count
            FROM airballon_bookings
        `;

        const countParams = [];

        if (req.user.role === "shop") {
            countQuery += ` WHERE shop_id = ? `;
            countParams.push(shop_id);
        }

        const [counts] = await db.query(
            countQuery,
            countParams
        );

        const [totalApproved] = await db.query(
            `
            SELECT
                COUNT(*) AS total_approved_count
            FROM airballon_bookings
            WHERE status = 'approved'
            ${req.user.role === "shop" ? "AND shop_id = ?" : ""}
            `,
            req.user.role === "shop" ? [shop_id] : []
        );

        return res.status(200).json({
            success: true,
            message: "Air Balloon Booking List Success",
            total_count: counts[0].total_count,
            pending_count: counts[0].pending_count,
            approved_count: counts[0].approved_count,
            cancelled_count: counts[0].cancelled_count,
            total_approved_count: totalApproved[0].total_approved_count,
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


export const air_balloon_bookingApproved = asyncHandel(async (req, res) => {
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

        let bookingQuery = "SELECT * FROM airballoon_bookings WHERE id = ?";
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


        const [data] = await db.query("UPDATE airballoon_bookings SET status ='approved'  WHERE id = ? AND shop_id = ?", [id, shop_id]);

        return res.status(200).json({
            success: true,
            message: "Air Balloon Booking Approved Successfully",
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

export const airballon_bookingCancelled = asyncHandel(async (req, res) => {
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

        let bookingQuery = "SELECT * FROM airballoon_bookings WHERE id = ?";
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


        const [data] = await db.query("UPDATE airballoon_bookings SET status ='cancelled'  WHERE id = ? AND shop_id = ?", [id, shop_id]);

        return res.status(200).json({
            success: true,
            message: "Air Balloon Booking Cancelled Successfully",
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


export const airballoonMobileBooking = asyncHandel(async (req, res) => {
    try {
        if (req.user.role !== "user") {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        const [data] = await db.query(
            `
            SELECT
                b.id AS booking_id,
                b.user_id,
                b.shop_id,
                b.airballoon_id,
                b.customer_name,
                b.customer_phone,

                DATE_FORMAT(
                    b.booking_date,
                    '%d-%m-%Y'
                ) AS booking_date,

                b.passenger_count,
                b.status,
                b.note,

                a.name,
                a.location,
                a.price_from,
                a.price_to,
                a.dollor_from,
                a.dollor_to,
                a.guest,
                a.description,
                a.rule,
                a.airballon_image1,
                a.airballon_image2,
                a.airballon_image3,

                s.shop_name,
                s.shop_phone,
                s.shop_address,
                s.location AS shop_location

            FROM airballon_bookings b

            JOIN airballons a
                ON b.airballoon_id = a.id

            JOIN shops s
                ON b.shop_id = s.id

            WHERE b.user_id = ?

            ORDER BY b.id DESC
            `,
            [req.user.id]
        );

        return res.status(200).json({
            success: true,
            message: "Air Balloon Booking Success",
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