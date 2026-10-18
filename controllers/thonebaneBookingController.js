import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";



export const thonebaneBookingCreate = asyncHandel(async (req, res) => {
    try {
        const {
            thonebane_id,
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
            !thonebane_id ||
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

        const [thonebane] = await db.query(
            `
            SELECT
                id,
                shop_id,
                capacity,
                status,
                is_active
            FROM thonebanes
            WHERE id = ?
            `,
            [thonebane_id]
        );

        if (thonebane.length === 0) {
            return res.status(404).json({
                success: false,
                message: "ThoneBane not found!"
            });
        }

        const item = thonebane[0];

        if (item.status !== "available" || item.is_active !== 1) {
            return res.status(400).json({
                success: false,
                message: "ThoneBane is unavailable!"
            });
        }

        const [pricing] = await db.query(
            `
            SELECT
                id,
                shop_id,
                thonebane_id,
                price_type,
                start_time,
                end_time,
                price
            FROM thonebane_prices
            WHERE id = ?
                AND thonebane_id = ?
                AND shop_id = ?
            `,
            [
                price_id,
                item.id,
                item.shop_id
            ]
        );

        if (pricing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "ThoneBane pricing not found!"
            });
        }

        const selectedPrice = pricing[0];

        const [booking] = await db.query(
            `
            INSERT INTO thonebane_bookings
            (
                user_id,
                shop_id,
                thonebane_id,
                price_id,
                customer_name,
                customer_phone,
                passenger_count,
                booking_date,
                price,
                note
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                selectedPrice.price,
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


export const thonebaneBookingList = asyncHandel(async (req, res) => {
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
                    AND type = 'thonebane'
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
                b.thonebane_id,
                b.price_id,
                b.customer_name,
                b.customer_phone,

                DATE_FORMAT(
                    b.booking_date,
                    '%d-%m-%Y'
                ) AS booking_date,

                b.passenger_count,
                tp.price_type,
                tp.start_time,
                tp.end_time,
                b.status,
                b.note,
                tp.price,

                t.name AS thonebane_name,
                t.location,
                t.image,
                s.shop_name

            FROM thonebane_bookings b

            JOIN thonebanes t
                ON b.thonebane_id = t.id

            JOIN shops s
                ON b.shop_id = s.id

            LEFT JOIN thonebane_prices tp
                ON b.price_id = tp.id
                AND tp.thonebane_id = b.thonebane_id
                AND tp.shop_id = b.shop_id
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
            FROM thonebane_bookings
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
                COALESCE(SUM(tp.price), 0) AS approved_total_price
            FROM thonebane_bookings b

            LEFT JOIN thonebane_prices tp
                ON b.price_id = tp.id
                AND tp.thonebane_id = b.thonebane_id
                AND tp.shop_id = b.shop_id

            ${req.user.role === "shop" ? "WHERE b.shop_id = ? AND b.status = 'approved'" : "WHERE b.status = 'approved'"}
            `,
            req.user.role === "shop" ? [shop_id] : []
        );

        return res.status(200).json({
            success: true,
            message: "Booking List Success",
            total_count: counts[0].total_count,
            pending_count: counts[0].pending_count,
            approved_count: counts[0].approved_count,
            cancelled_count: counts[0].cancelled_count,
            total_approved_count: totalApproved[0].approved_total_price,
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

        const [data] = await db.query(
            `
            SELECT
                b.id AS booking_id,
                b.user_id,
                b.shop_id,
                b.thonebane_id,
                b.price_id,
                b.customer_name,
                b.customer_phone,

                DATE_FORMAT(
                    b.booking_date,
                    '%d-%m-%Y'
                ) AS booking_date,

                b.passenger_count,
                tp.price_type,
                tp.start_time,
                tp.end_time,
                b.status,
                b.note,
                tp.price,

                t.name AS thonebane_name,
                t.location,
                t.image,
                s.shop_name

            FROM thonebane_bookings b

            JOIN thonebanes t
                ON b.thonebane_id = t.id

            JOIN shops s
                ON b.shop_id = s.id

            LEFT JOIN thonebane_prices tp
                ON b.price_id = tp.id
                AND tp.thonebane_id = b.thonebane_id
                AND tp.shop_id = b.shop_id

            WHERE b.user_id = ?

            ORDER BY b.id DESC
            `,
            [req.user.id]
        );

        return res.status(200).json({
            success: true,
            message: "Booking Success",
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