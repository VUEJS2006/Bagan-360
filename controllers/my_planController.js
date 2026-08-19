import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";


export const planCreate = asyncHandel(async (req, res) => {
    try {

        const { item_type, item_id, is_visited } = req.body;

        if (req.user.role !== "user") {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }
        if (!item_type || !item_id) {
            return res.status(400).json({
                success: false,
                message: "All fields are required!"
            });
        }

        const visited = typeof is_visited === "boolean" ? is_visited : false

        const [existPlan] = await db.query("SELECT id FROM my_plans WHERE user_id = ? AND item_type = ? AND item_id = ?", [req.user.id, item_type, item_id]);

        if (existPlan.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Already added to My Plan!"
            });
        }
        const [data] = await db.query("INSERT INTO my_plans (user_id,item_type,item_id,is_visited) VALUES (?,?,?,?)", [req.user.id, item_type, item_id, visited])

        return res.status(201).json({
            success: true,
            message: "My Plan created successfully!",
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

export const planList = asyncHandel(async (req, res) => {
    try {

        if (req.user.role !== "user") {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        const [plans] = await db.query(
            `
            SELECT
                id,
                item_type,
                item_id,
                is_visited
            FROM my_plans
            WHERE user_id = ?
            ORDER BY id DESC
            `,
            [req.user.id]
        );

        const result = [];

        for (const plan of plans) {

            let item = null;

            // PAGODA
            if (plan.item_type === "pagoda") {

                const [data] = await db.query(
                    `
                    SELECT
                        p.id,
                        p.name,
                        p.location,
                        p.description,

                        COALESCE(
                            JSON_ARRAYAGG(
                                CASE
                                    WHEN pi.id IS NOT NULL
                                    THEN pi.image
                                END
                            ),
                            JSON_ARRAY()
                        ) AS images

                    FROM pagodas p

                    LEFT JOIN pagoda_images pi
                        ON p.id = pi.pagoda_id

                    WHERE p.id = ?

                    GROUP BY
                        p.id,
                        p.name,
                        p.location,
                        p.description
                    `,
                    [plan.item_id]
                );

                if (data.length > 0) {
                    item = data[0];
                }
            }

            // HOTEL
            else if (plan.item_type === "hotel") {

                const [data] = await db.query(
                    `
                    SELECT
                        id,
                        name,
                        image,
                        location,
                        description
                    FROM hotels
                    WHERE id = ?
                    `,
                    [plan.item_id]
                );

                if (data.length > 0) {
                    item = data[0];
                }
            }

            // RESTAURANT
            else if (plan.item_type === "restaurant") {

                const [data] = await db.query(
                    `
                    SELECT
                        id,
                        name,
                        image,
                        location,
                        address,
                        description
                    FROM restaurants
                    WHERE id = ?
                    `,
                    [plan.item_id]
                );

                if (data.length > 0) {
                    item = data[0];
                }
            }

            if (item) {
                result.push({
                    ...plan,
                    item
                });
            }
        }

        return res.status(200).json({
            success: true,
            count: result.length,
            data: result
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
