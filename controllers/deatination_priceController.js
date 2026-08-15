import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";

export const destinationPriceCreate = asyncHandel(async (req, res) => {
    try {

        const { destination_id, passenger, price } = req.body || {};  
        if (!destination_id  || !price) {
            return res.status(400).json({
                success: false,
                message: "All fields are required!"
            });
        }

        const [destinations] = await db.query("SELECT id FROM destinations WHERE id = ?", [destination_id]);
        if (destinations.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Destination not found!"
            });
        }

        const [data] = await db.query("INSERT INTO destination_prices (destination_id,passenger,price) VALUES (?, ?, ?)", [destination_id, passenger, price]);
        return res.status(201).json({
            success: true,
            message: "Destination price created successfully!",
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

export const destinationPriceList = asyncHandel(async (req, res) => {
    try {

        const [data] = await db.query(`
            SELECT
                destination_prices.id,
                destination_prices.destination_id,
                destination_prices.passenger,
                destination_prices.price,

                destinations.name,
            FROM destination_prices

            LEFT JOIN destinations
                ON destinations.destination_id = destinations.id
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

export const destinationPriceUpdate = asyncHandel(async (req, res) => {
    try {
        const { id } = req.params;
        const {  destination_id, passenger, price } = req.body;

        const [prices] = await db.query("SELECT * FROM destination_prices  WHERE id = ?", [id]);
        if (prices.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Destination Price not found!"
            });
        }

        const [destination] = await db.query("SELECT id FROM destinations  WHERE id = ?", [destination_id]);
        if (destination.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Destination not found!"
            });
        }

        const [data] = await db.query(
            `
             UPDATE destination_prices SET destination_id = ?, passenger = ?, price = ?  WHERE id = ?

            `,
            [destination_id, passenger,price, id]
        )
        return res.status(200).json({
            success: true,
            message: "Destination price Update successfully!",
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

export const destinationPriceDelete = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;

        const [prices] = await db.query(
            `
            SELECT *
            FROM destination_prices
            WHERE id = ?
            `,
            [id]
        );

        if (prices.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Destination Price not found!"
            });
        }

        const [data] = await db.query(
            `
            DELETE FROM destination_prices
            WHERE id = ?
            `,
            [id]
        );

        return res.status(200).json({
            success: true,
            message: "Destination Price Delete Success",
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
