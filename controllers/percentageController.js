import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";


export const hotelPercentage = async ({ shopId, percent, billingMonth }) => {

    const [bookingData] = await db.query(
        `
        SELECT
            COUNT(hb.id) AS total_bookings,
            COALESCE(SUM(h.price), 0) AS total_booking

        FROM hotel_bookings hb

        INNER JOIN hotels h
            ON hb.hotel_id = h.id
            AND hb.shop_id = h.shop_id

        WHERE hb.shop_id = ?
        AND hb.status = 'approved'

        AND hb.created_at >= CONCAT(?, '-01')

        AND hb.created_at < DATE_ADD(
            CONCAT(?, '-01'),
            INTERVAL 1 MONTH
        )
        `,
        [shopId, billingMonth, billingMonth]
    );

    const totalBookings =
        Number(bookingData[0].total_bookings);

    const totalBooking =
        Number(bookingData[0].total_booking);

    const amount = Number(
        ((totalBooking * percent) / 100).toFixed(2)
    );

    return {
        total_bookings: totalBookings,
        total_booking: totalBooking,
        amount
    };
};

export const restaurantPercentage = async ({ shopId, percent, billingMonth }) => {
    const [bookingData] = await db.query(
        `
        SELECT COUNT (DISTINCT rb.id ) AS total_bookings,
            COALESCE(SUM(rbi.subtotal), 0) AS total_booking

        FROM res_bookings rb
        INNER JOIN res_booking_items rbi
        ON rb.id = rbi.booking_id

        WHERE rb.shop_id = ? AND rb.status = 'approved' AND rb.created_at >= CONCAT(?, '-01')
        AND rb.created_at < DATE_ADD(
            CONCAT(?, '-01'),
            INTERVAL 1 MONTH
        )
        `,
        [
            shopId, billingMonth, billingMonth
        ]
    )
    const totalBookings = Number(bookingData[0].total_bookings);
    const totalBooking = Number(bookingData[0].total_booking);
    const amount = Number(((totalBooking * percent) / 100).toFixed(2));
    return {
        total_bookings: totalBookings,
        total_booking: totalBooking,
        amount
    };
}

export const percentageCreate = asyncHandel(async (req, res) => {
    try {

        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        const {
            shop_id,
            percentage,
            billing_month
        } = req.body;

        if (
            !shop_id ||
            percentage === undefined ||
            percentage === null ||
            percentage === "" ||
            !billing_month
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "shop_id, percentage and billing_month are required!"
            });
        }

        const shopId = Number(shop_id);
        const percent = Number(percentage);

        if (
            !Number.isInteger(shopId) ||
            shopId <= 0 ||
            !Number.isFinite(percent) ||
            percent <= 0 ||
            percent > 100
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid shop_id or percentage!"
            });
        }

        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(billing_month)) {
            return res.status(400).json({
                success: false,
                message: "billing_month format must be YYYY-MM!"
            });
        }

        const [shops] = await db.query(
            `
            SELECT
                id,
                type,
                tax,
                status
            FROM shops
            WHERE id = ?
            `,
            [shopId]
        );

        if (shops.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Shop not found!"
            });
        }

        const shop = shops[0];

        if (shop.tax !== "percentage") {
            return res.status(400).json({
                success: false,
                message: "This shop does not use percentage tax!"
            });
        }

        if (shop.status !== "approved") {
            return res.status(400).json({
                success: false,
                message: "Shop is not approved!"
            });
        }

        const [existing] = await db.query(
            `
            SELECT id
            FROM shop_percentage
            WHERE shop_id = ?
            AND billing_month = ?
            `,
            [shopId, billing_month]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message:
                    "Percentage for this shop and month already exists!"
            });
        }


        let calculation;

        switch (shop.type) {

            case "hotel":

                calculation = await hotelPercentage({
                    shopId,
                    percent,
                    billingMonth: billing_month
                });

                break;


            case "restaurant":

                calculation = await restaurantPercentage({
                    shopId,
                    percent,
                    billingMonth: billing_month
                });

                break;


            // case "e_bike":

            //     return res.status(400).json({
            //         success: false,
            //         message:
            //             "E-bike percentage calculation is not implemented yet!"
            //     });


            // case "thonebane":

            //     return res.status(400).json({
            //         success: false,
            //         message:
            //             "Thonebane percentage calculation is not implemented yet!"
            //     });


            default:

                return res.status(400).json({
                    success: false,
                    message:
                        "Percentage calculation is not supported for this shop type!"
                });
        }

        const [result] = await db.query(
            `
            INSERT INTO shop_percentage
            (
                shop_id,
                percentage,
                total_booking,
                amount,
                billing_month
            )
            VALUES (?, ?, ?, ?, ?)
            `,
            [
                shopId,
                percent,
                calculation.total_booking,
                calculation.amount,
                billing_month
            ]
        );

        return res.status(201).json({
            success: true,
            message: `${shop.type} percentage created successfully!`,
            data: {
                id: result.insertId,
                shop_id: shopId,
                shop_type: shop.type,
                percentage: percent,
                total_bookings: calculation.total_bookings,
                total_booking: calculation.total_booking,
                amount: calculation.amount,
                billing_month
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

export const percentageList = asyncHandel(async (req, res) => {
    try {

        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        const [data] = await db.query(
            `
            SELECT 
                sp.id,
                sp.shop_id,
                s.shop_name,
                s.type AS shop_type,
                s.tax,
                sp.percentage,
                sp.total_booking,
                sp.amount,
                sp.billing_month,
                DATE_FORMAT(
                    sp.created_at,
                    '%Y-%m-%d %H:%i:%s'
                ) AS created_at

            FROM shop_percentage sp

            INNER JOIN shops s
                ON sp.shop_id = s.id

            ORDER BY sp.id DESC
            `
        );

        const formattedData = data.map(item => ({
            ...item,
            percentage: Number(item.percentage),
            total_booking: Number(item.total_booking),
            amount: Number(item.amount)
        }));

        return res.status(200).json({
            success: true,
            message: "Percentage List Success",
            data: formattedData,
            total: formattedData.length
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});