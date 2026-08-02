import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";


export const thoneBaneCategoryCreate = asyncHandel(async (req, res) => {
    try {

        const { name } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "All filed are required!"
            });
        }

       

        const [data] = await db.query(
            `
            INSERT INTO thonebane_categories (name) VALUES(?)
            `,
            [name]
        );
        return res.status(201).json({
            success: true,
            message: "ThoneBane Category Create Success",
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

export const thoneBaneCategoryList = asyncHandel(async (req, res) => {
    try {

        const [data] = await db.query(
            `
            SELECT * FROM  thonebane_categories
            ORDER BY id DESC
            `
        );
        return res.status(200).json({
            success: true,
            message: "ThoneBane Category List Success",
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

export const thoneBaneCategoryUpdate = asyncHandel(async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body || {};
        const [existThoneBane] = await db.query(` SELECT * FROM thonebane_categories WHERE id = ?`, [id]);


        if (existThoneBane.length === 0) {
            return res.status(404).json({
                success: false,
                message: "ThoneBane Category not found!"
            });
        }


        const [data] = await db.query(
            `
            UPDATE thonebane_categories SET name = ? WHERE id = ?
            `,
            [name, id]
        );

        return res.status(200).json({
            success: true,
            message: "ThoneBane Category Update Success",
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

export const thoneBaneCategoryDelete = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;

        const [thonebane] = await db.query(
            `
            SELECT *
            FROM thonebane_categories
            WHERE id = ?
            `,
            [id]
        );

        if (thonebane.length === 0) {
            return res.status(404).json({
                success: false,
                message: "ThoneBane Category not found!"
            });
        }

        const [data] = await db.query(
            `
            DELETE FROM thonebane_categories
            WHERE id = ?
            `,
            [id]
        );

        return res.status(200).json({
            success: true,
            message: "ThoneBane Category Delete Success",
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
