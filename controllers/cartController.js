import db from "../config/db.js";
import { asyncHandel } from "../middlewares/asyncMiddleware.js";


export const cartCreate = asyncHandel(async (req, res) => {
    try {

        let { menu_id, size, quantity } = req.body;

        if (!menu_id || !size || !quantity) {
            return res.status(400).json({
                success: false,
                message: "All fields are required!"
            });
        }

        if (quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be greater than 0!"
            });
        }

        const user_id = req.user.id;

        const [menu] = await db.query(`
            SELECT 
                m.id,
                m.shop_id,
                m.name,
                s.type,
                s.status

            FROM res_menu m 

            INNER JOIN shops s
                ON m.shop_id = s.id

            WHERE m.id = ?
            AND s.type = 'restaurant'
            AND s.status = 'approved'
        `, [menu_id]);

        if (menu.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Restaurant menu not found!"
            });
        }


        const [menuPrice] = await db.query(`
            SELECT 
                menu_id,
                size,
                price

            FROM menu_price

            WHERE menu_id = ?
            AND size = ?
        `, [menu_id, size]);

        if (menuPrice.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Selected menu size not found!"
            });
        }

        const price = menuPrice[0].price;

        const [existCart] = await db.query(`
            SELECT
                id,
                quantity

            FROM cart

            WHERE user_id = ?
            AND menu_id = ?
            AND size = ?
        `, [user_id, menu_id, size]);

        if (existCart.length > 0) {

            const newQuantity =
                existCart[0].quantity + Number(quantity);

            await db.query(`
                UPDATE cart 
                SET
                    quantity = ?,
                    price = ?

                WHERE id = ?
            `, [
                newQuantity,
                price,
                existCart[0].id
            ]);

            return res.status(200).json({
                success: true,
                message: "Cart quantity updated successfully!"
            });
        }

     
        const [data] = await db.query(`
            INSERT INTO cart
            (
                user_id,
                menu_id,
                price,
                quantity,
                size
            )
            VALUES (?, ?, ?, ?, ?)
        `, [
            user_id,
            menu_id,
            price,
            quantity,
            size
        ]);

        return res.status(201).json({
            success: true,
            message: "Add To Cart Success!"
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export const updateCart = asyncHandel(async (req, res) => {
    try {

        const { id } = req.params;
        const { quantity } = req.body;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Cart ID is required!"
            });
        }

        if (quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be greater than 0!"
            });
        }
        const [cart] = await db.query("SELECT * FROM cart  WHERE id = ? AND user_id = ?", [id, req.user.id]);
        if (cart.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Cart item not found!"
            });
        }
        const [data] = await db.query(
            `
            UPDATE cart SET 
            quantity = ?
            WHERE id = ?
            AND user_id = ?
            `,
            [
                quantity, id, req.user.id
            ]
        );
        return res.status(200).json({
            success: true,
            message: "Cart Quantity Update Success!",
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

export const deleteCart = asyncHandel(async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Cart ID is required!"
            });
        }
        const [cart] = await db.query("SELECT * FROM cart WHERE id = ? AND user_id = ?", [id, req.user.id]);
        if (cart.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Cart item not found!"
            });
        }
        const [data] = await db.query("DELETE FROM cart WHERE id = ? AND user_id = ?", [id, req.user.id]);
        return res.status(200).json({
            success: true,
            message: "Cart Delete Success",
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

export const cartList = asyncHandel(async (req, res) => {
    try {

        const [data] = await db.query(
            `
            SELECT 
            c.id,
            c.user_id,
            c.menu_id,
            c.quantity,
            c.price,
            c.size,
            m.name AS menu_name,
            m.image,
            m.shop_id,
            s.shop_name,

            (c.price  * c.quantity) AS sub_total,
            DATE_FORMAT(c.created_at, '%d-%m-%Y') AS created_at

            FROM cart c
            INNER JOIN res_menu m
            ON c.menu_id = m.id
            INNER JOIN shops s
            ON m.shop_id = s.id

            WHERE c.user_id = ?
            ORDER BY c.id DESC 

            `, [req.user.id]
        );
        const total = data.reduce((sum, item) => {
            return sum + Number(item.subtotal);
        }, 0);
        return res.status(200).json({
            success: true,
            message: "Cart List Success",
            data,
            total
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
})