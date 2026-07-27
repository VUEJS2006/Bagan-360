import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";

export const eBikePriceCreate = asyncHandel(async (req, res) => {
    try {

        const { e_bike_id, price_type, start_time, end_time, price } = req.body;
        if (!e_bike_id || !price_type || !price) {
            return res.status(400).json({
                success: false,
                message: "All fields are required!"
            });
        }

        const [bike] = await db.query("SELECT id FROM e_bikes WHERE id = ?", [e_bike_id]);
        if (bike.length === 0) {
            return res.status(404).json({
                success: false,
                message: "E-bike not found!"
            });
        }

        const [data] = await db.query("INSERT INTO e_bike_prices (e_bike_id,price_type,start_time,end_time,price) VALUES (?, ?, ?, ?, ?)", [e_bike_id, price_type, start_time, end_time, price]);
        return res.status(201).json({
            success: true,
            message: "E-bike price created successfully!",
            data
        });


    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
})

export const eBikePriceList = asyncHandel(async (req, res) => {
    try {

        const [data] = await db.query(`
            SELECT
                e_bike_prices.id,
                e_bike_prices.e_bike_id,
                e_bike_prices.price_type,
                e_bike_prices.start_time,
                e_bike_prices.end_time,
                e_bike_prices.price,

                e_bikes.name AS e_bike_name,
                e_bikes.code AS e_bike_code


            FROM e_bike_prices

            LEFT JOIN e_bikes
                ON e_bike_prices.e_bike_id = e_bikes.id

            ORDER BY e_bike_prices.created_at DESC
        `);

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export const eBikePriceUpdate = asyncHandel(async (req, res) => {
    try {
        const { id } = req.params;
        const { e_bike_id, price_type, start_time, end_time, price } = req.body;

        const [prices] = await db.query("SELECT * FROM e_bike_prices  WHERE id = ?", [id]);
        if (prices.length === 0) {
            return res.status(404).json({
                success: false,
                message: "E-bike Price not found!"
            });
        }

        const [bike] = await db.query("SELECT id FROM e_bikes  WHERE id = ?", [e_bike_id]);
        if (bike.length === 0) {
            return res.status(404).json({
                success: false,
                message: "E-bike not found!"
            });
        }

        const [data] = await db.query(
            `
             UPDATE e_bike_prices SET e_bike_id = ?, price_type = ?, start_time = ?,end_time = ?, price = ?  WHERE id = ?

            `,
            [e_bike_id, price_type, start_time, end_time, price, id]
        )
        return res.status(20).json({
            success: true,
            message: "E-bike price Update successfully!",
            data
        });


    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
})

export const eBikePriceDelete = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;

        const [prices] = await db.query(
            `
            SELECT *
            FROM e_bike_prices
            WHERE id = ?
            `,
            [id]
        );

        if (prices.length === 0) {
            return res.status(404).json({
                success: false,
                message: "E-bike Price not found!"
            });
        }

        const [data] = await db.query(
            `
            DELETE FROM e_bike_prices
            WHERE id = ?
            `,
            [id]
        );

        return res.status(200).json({
            success: true,
            message: "E-bike Price Delete Success",
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
