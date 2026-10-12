import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";

export const percentageCreate = asyncHandel(async (req, res) => {
    try {
        const { shop_id, percentage, billing_month } = req.body;

        if (req.user.role === "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }
        if (!shop_id || !percentage || !billing_month) {
            return res.status(400).json({
                success: false,
                message: "All field are required"
            });
        }
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(billing_month)) {
            return res.status(400).json({
                success: false,
                message: "billing_month must be YYYY-MM format!"
            });
        }
        const [shops] = await db.query("SELECT id,type,tax,status FROM shops WHERE id = ?", [shop_id]);
        if (shops.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Shop not found!"
            });
        }
        const shop = shops[0];
        if (shop.type === "hotel") {
            return res.status(400).json({
                success: false,
                message: "This API is only for hotel shops!"
            });
        }
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
            SELECT id FROM shop_percentage WHERE shop_id = ? AND  billing_month = ?
            `,
            [
                shop_id, billing_month
            ]
        )
        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: "This shop's percentage for this month has already been calculated!"
            });
        }

        const [bookingData] = await db.query(
            `
            SELECT COUNT (hb.id) AS total_bookings,
            COALESCE(SUM (h.price), 0) AS total_booking 
            FROM hotel_bookings hb 
            INNER JOIN hotels h
            ON hb.hotel_id = h.id AND hb.shop_id = h.shop_id WHERE hb.shop_id = ? AND hb.status = 'approved'
            STR_TO_DATE (CONCAT(?, '-01'), '%Y-%m-%d' ) AND hb.created_at < DATE_ADD (STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d' )),
            INTERVAL 1 MONTH )
            `,
            [shop_id, billing_month, billing_month]
        );
        const totalBookings = Number(bookingData[0].total_bookings);
        const totalBooking = Number(bookingData[0].total_booking);

        const amount = Number(((totalBooking * percentage) / 100).toFixed(2));
        const [result] = await db.query(
            `
            INSERT INTO shop_percentage (shop_id,percentage,total_booking,amount,billing_month) VALUES 
            (?,?,?,?,?,?)

            `,
            [
                shop_id, percentage, totalBooking, amount, billing_month
            ]
        );
        return res.status(201).json({
            success: true,
            message: "Percentage Create Success",
            data: {
                id: result.insertId,
                shop_id: shop_id,
                billing_month,
                total_bookings: totalBookings,
                percentage: percentage,
                total_booking: totalBooking,
                amount
            }
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
})
export const percentageList = asyncHandel(async (req, res) => {
    try {
        if (req.user.role === "admin") {
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
            sp.percentage,
            sp.total_booking,
            sp.amount,
            sp.billing_month,
            sp.create_at,
            FROM shop_percentage sp
            INNER JOIN shops s 
            ON sp.shop_id = s.id
            WHERE s.type = 'hotel'
            ORDER BY sp.id DESC
            `
        );
        return res.status(200).json({
            success: true,
            message: "Percentage List Success",
            data,
            total:data.length
        });


    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
})