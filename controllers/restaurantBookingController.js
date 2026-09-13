import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";



export const restaurantBookingCreate = asyncHandel(async (req, res) => {
    try {

        const { customer_name, customer_phone, booking_date, booking_time, passenger_count, note } = req.body;
        if (req.user.role !== "user") {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }
        if (
            !customer_name ||
            !customer_phone ||
            !booking_date ||
            !booking_time ||
            !passenger_count
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required!"
            });
        }
        const [cart] = await db.query(
            `
        SELECT 
        c.id AS cart_id,
        c.menu_id,
        c.size,
        c.price,
        c.quantity,
        m.shop_id,
        s.shop_name
        FROM cart c
        INNER JOIN res_menu m
        ON c.menu_id = m.id

        INNER JOIN shops s
        ON m.shop_id = s.id

        WHERE c.id = ? AND s.type = 'restaurant' AND s.status = 'approved'
        `, [req.user.id]
        )
        if (cart.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Your cart is empty!"
            });
        }

        const shop_id = cart[0].shop_id;
        const diffShop = cart.some(
            item => item.shop_id !== shop_id
        )
        if (diffShop) {
            return res.status(400).json({
                success: false,
                message: "You can only book items from one restaurant at a time!"
            });
        }
        const [booking] = await db.query(`
            INSERT INTO restaurant_bookings
            (
                user_id,
                shop_id,
                customer_name,
                customer_phone,
                passenger_count,
                booking_date,
                booking_time,
                note
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            req.user.id,
            shop_id,
            customer_name,
            customer_phone,
            passenger_count,
            booking_date,
            booking_time,
            note || null
        ]);

        const booking_id = booking.insertId;
        for (const item of cart) {
            const subtotal = Number(item.price) * Number(item.quantity);
            await db.query(
                `
                INSERT INTO restaurant_booking_items (booking_id,menu_id,size,quantity,price,subtotal)
                VALUES (?,?,?,?,?,?)
                `,
                [
                    booking_id,
                    item.menu_id,
                    item.size,
                    item.quantity,
                    item.price,
                    subtotal
                ]
            )
        }
        await db.query(`
            DELETE FROM cart
            WHERE user_id = ?
        `, [req.user.id]);

        return res.status(201).json({
            success: true,
            message: "Restaurant Booking created successfully.",
            booking_id: booking_id,
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
           b.customer_name, 
           b.customer_phone,
           DATE_FORMAT(b.booking_date, '%d-%m-%Y') AS booking_date,
           TIME_FORMAT(b.booking_time, '%h:%i %p') AS booking_time,
           b.passenger_count, 
           b.status, 
           b.note, 
           s.shop_name 
           FROM restaurant_bookings b 
           INNER JOIN shops s ON b.shop_id = s.id `;
        let params = [];
        let shop_id = null;

        if (req.user.role === "shop") {
            const [shops] = await db.query("SELECT id FROM shops WHERE user_id = ?", [req.user.id]);
            if (shops.length === 0) {
                return res.status(404).json({ success: false, message: "Shop not found!" });
            }
            shop_id = shops[0].id;
            query += ` WHERE b.shop_id = ?`;
            params.push(shop_id);
        }

        query += ` ORDER BY b.id DESC`;

        const [booking] = await db.query(query, params);
        for (const item of booking) {
            const [items] = await db.query(
                `SELECT 
                bi.id, 
                bi.booking_id, 
                bi.menu_id, 
                m.name AS menu_name, 
                m.image, 
                bi.size, 
                bi.price, 
                bi.quantity, 
                bi.subtotal 
                FROM restaurant_booking_items bi 
                INNER JOIN res_menu m ON bi.menu_id = m.id 
                WHERE bi.booking_id = ? 
                ORDER BY bi.id ASC
                 `
                ,
                [item.booking_id]);
            item.items = items;
        }
        let countQuery = `
        SELECT COUNT(*) AS total_count, 
        COALESCE( SUM( CASE WHEN status = 'pending' THEN 1 ELSE 0 END ), 0 )
        AS pending_count, COALESCE( SUM( CASE WHEN status = 'approved' THEN 1 ELSE 0 END ), 0 ) 
        AS approved_count, COALESCE( SUM( CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END ), 0 )
        AS cancelled_count FROM restaurant_bookings `;

        let countParams = [];
        if (req.user.role === "shop") {
            countQuery += ` WHERE shop_id = ?`;
            countParams.push(shop_id);
        }
        const [counts] = await db.query(countQuery, countParams);
        return res.status(200).json({
            success: true, message: "Booking List Success",
            booking, total_count: counts[0].total_count,
            pending_count: counts[0].pending_count,
            approved_count: counts[0].approved_count,
            cancelled_count: counts[0].cancelled_count
        });
    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

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