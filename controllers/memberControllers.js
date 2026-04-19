import db from "../config/db.js";
import { asyncHandel } from "../middleware/asyncMiddleware.js";

export const memberCreate = asyncHandel(async (req, res) => {
    try {

        const { shareholder_id, amount, join_date } = req.body;
        if (!shareholder_id || !amount || !join_date) {
            res.status(401).json({
                message: 'All field are required!',
                success: false
            })
        }


        const [data] = await db.query("INSERT INTO members (shareholder_id,amount,join_date) VALUES (?,?,?)", [shareholder_id, amount, join_date]);

        res.status(201).json({
            message: 'Member Create Successfully!',
            success: true,
            data: {
                data
            }
        })

    } catch (err) {
        console.log(err)
        res.status(500).json({
            message: err.message,
            success: false
        })
    }
})

export const memberList = asyncHandel(async (req, res) => {
    try {

        const [data] = await db.query("SELECT member.id,member.amount,member.join_date,shareholder.username FROM members member JOIN shareholders shareholder ON member.shareholder_id = shareholder.id ");

        res.status(200).json({
            message: 'Member Show Successfully!',
            success: true,
            count: data.length,
            data: {
                data
            }
        })

    } catch (err) {
        console.log(err)
        res.status(500).json({
            message: err.message,
            success: false
        })
    }
})

export const memberUpdate = asyncHandel(async (req, res) => {

    try {

        const { id } = req.params;
        const { amount, join_date } = req.body;

        const [data] = await db.query("UPDATE members SET  amount = ? WHERE id = ?", [amount, id, join_date]);
        res.status(200).json({
            success: true,
            message: "Member Updated Successfully!",
            data: {
                data
            }
        });

    } catch (err) {
        console.log(err)
        res.status(500).json({
            message: err.message,
            success: false
        })
    }
})

export const memberDelete = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;

        const [data] = await db.query("DELETE FROM members WHERE id = ?", [id]);
        res.status(200).json({
            success: true,
            message: "Member Delete Successfully!",
        });

    } catch (err) {
        console.log(err)
        res.status(500).json({
            message: err.message,
            success: false
        })
    }
})