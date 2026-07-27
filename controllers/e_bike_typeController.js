import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";

export const eBikeTypeCreate = asyncHandel(async (req, res) => {
    try {

        const { name, distance } = req.body;

        if (!name || !distance) {
            return res.status(400).json({
                success: false,
                message: "All filed are required!"
            });
        }

        const [existingType] = await db.query(
            `SELECT * FROM e_bike_types WHERE name = ?`,
            [name]
        );

        if (existingType.length > 0) {
            return res.status(400).json({
                success: false,
                message: "E-bike type already exists!"
            });
        }

        const [data] = await db.query(
            `
            INSERT INTO e_bike_types (name,distance) VALUES(?,?)
            `,
            [name, distance]
        );
        return res.status(201).json({
            success: true,
            message: "E-bike Type Create Success",
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

export const eBikeTypeList = asyncHandel(async (req, res) => {
    try {

        const [data] = await db.query(
            `
            SELECT * FROM  e_bike_types
            ORDER BY id DESC
            `
        );
        return res.status(200).json({
            success: true,
            message: "E-bike Type List Success",
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

export const eBikeTypeUpdate = asyncHandel(async (req, res) => {
    try {
        const { id } = req.params;
        const { name, distance } = req.body || {};
        const [existingEBikeType] = await db.query(` SELECT * FROM e_bike_types WHERE id = ?`, [id]);


        if (existingEBikeType.length === 0) {
            return res.status(404).json({
                success: false,
                message: "E-bike Type not found!"
            });
        }


        const [data] = await db.query(
            `
            UPDATE e_bike_types SET name = ?,distance = ? WHERE id = ?
            `,
            [name, distance, id]
        );

        return res.status(200).json({
            success: true,
            message: "E-bike Type Update Success",
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

export const eBikeTypeDelete = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;

        const [type] = await db.query(
            `
            SELECT *
            FROM e_bike_types
            WHERE id = ?
            `,
            [id]
        );

        if (type.length === 0) {
            return res.status(404).json({
                success: false,
                message: "E-bike Type not found!"
            });
        }

        const [data] = await db.query(
            `
            DELETE FROM e_bike_types
            WHERE id = ?
            `,
            [id]
        );

        return res.status(200).json({
            success: true,
            message: "E-bike Type Delete Success",
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

