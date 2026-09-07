
import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";



export const packageBookingCreate = asyncHandel(async (req, res) => {
    try {

        const { package_id, customer_name, customer_phone, customer_email, customer_address, start_date, end_date, passenger, special_request } = req.body;
        if (req.user.role !== "user") {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }
        if (
            !package_id ||
            !customer_name ||
            !customer_phone ||
            !start_date ||
            !end_date ||
            !passenger
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required!"
            });
        }
        const [packages] = await db.query("SELECT * FROM packages WHERE id = ?", [package_id]);
        if (packages.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Package not found!"
            });
        }

        const item = packages[0]

        const [booking] = await db.query(`
            INSERT INTO package_bookings  
            (
            user_id,
            package_id,
            customer_name,
            customer_phone,
            customer_email,
            customer_address,
            start_date,
            end_date,
            passenger,
            special_request
            )
            VALUES (?,?,?,?,?,?,?,?,?,?)
            `, [
            req.user.id,
            item.id,
            customer_name,
            customer_phone,
            customer_email,
            customer_address,
            start_date,
            end_date,
            passenger,
            special_request
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

export const packageBookingList = asyncHandel(async (req, res) => {
    try {

        const [data] = await db.query(`
            SELECT 
                b.id,
                b.user_id,
                b.package_id,
                b.customer_name,
                b.customer_phone,
                b.customer_email,
                b.customer_address,

                DATE_FORMAT(
                    b.start_date,
                    '%d-%m-%Y'
                ) AS start_date,

                DATE_FORMAT(
                    b.end_date,
                    '%d-%m-%Y'
                ) AS end_date,

                b.passenger,
                b.special_request,
                b.status,

                p.title,
                p.hotel_title,
                p.restaurant_title,
                p.transport_title,

                COALESCE(
                    JSON_ARRAYAGG(pi.image),
                    JSON_ARRAY()
                ) AS images

            FROM package_bookings b

            JOIN packages p
                ON b.package_id = p.id

            LEFT JOIN package_images pi
                ON p.id = pi.package_id

           GROUP BY b.id
           ORDER BY b.id DESC
        `);

        return res.status(200).json({
            message: "Booking List Success",
            success: true,
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

export const package_bookingApproved = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;
        const [booking] = await db.query("SELECT * FROM package_bookings WHERE id = ?", [id]);
        if (booking.length === 0) {
            return res.status(404).json({
                message: "Booking Not Found!",
                success: false
            })
        }
        const [data] = await db.query("UPDATE package_bookings SET status ='approved'  WHERE id = ?", [id]);

        return res.status(200).json({
            success: true,
            message: "Package Booking Approved Successfully",
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

export const package_bookingCancelled = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;
        const [booking] = await db.query("SELECT * FROM package_bookings WHERE id = ?", [id]);
        if (booking.length === 0) {
            return res.status(404).json({
                message: "Booking Not Found!",
                success: false
            })
        }
        const [data] = await db.query("UPDATE package_bookings SET status ='cancelled'  WHERE id = ?", [id]);

        return res.status(200).json({
            success: true,
            message: "Package Booking Cancelled Successfully",
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

export const packageMobileBooking = asyncHandel(async (req, res) => {
    try {
        const [data] = await db.query(`
        SELECT
         SELECT 
              b.id,
              b.user_id,
              b.package_id,  
              b.customer_name,
              b.customer_phone, 
              b.customer_email,
              b.customer_address,
              DATE_FORMAT(
              b.start_date,
              '%d-%m-%Y'
              ) AS start_date, 
              DATE_FORMAT(
              b.end_date,
              '%d-%m-%Y'
              ) AS end_date,  
              b.passenger,
              b.special_request,
              b.status,

              p.title,
              p.hotel_title,
              p.restaurant_title,
              p.transport_title,
              COALESCE(
                    JSON_ARRAYAGG(pi.image),
                    JSON_ARRAY()
              ) AS images


            FROM package_bookings b

            JOIN packages p
                ON b.package_id = p.id

            LEFT JOIN package_images pi
            ON p.id = pi.package_id
            WHERE b.user_id = ?

          GROUP BY b.id
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