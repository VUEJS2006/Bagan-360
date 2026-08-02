import express from "express"
import "dotenv/config"
import db from "./config/db.js"
import cookieParser from "cookie-parser";
import hotelRouter from "./routers/hotelRouter.js"
import authRouter from "./routers/authRouter.js"
import pagodaRouter from "./routers/pagodaRouter.js"
import destinationRouter from "./routers/destinationRouter.js"
import restaurantRouter from "./routers/restaurantRouter.js"
import e_bikeTypeRouter from "./routers/e_bike_typeRouter.js"
import e_bikeRouter from "./routers/e_bikeRouter.js"
import e_bikePriceRouter from "./routers/e_bike_priceRouter.js"
import thonbaneCategoryRouter from "./routers/thonebane_categoryRouter.js"


import cors from "cors"
import path from "path";


try {
    const conn = await db.getConnection();
    console.log("DB is connected");
    conn.release();

} catch (err) {
    console.log("Fail", err);
}

const app = express()
const PORT = process.env.PORT || 8000;
app.get('/', (req, res) => {
    res.send("Hello Bagan APP");
});

// Express Packages
app.use(express.json())
app.use(cookieParser());
app.use(cors())
app.use("/images", express.static(path.join(process.cwd(), "images")));
// API
app.use('/api', pagodaRouter)
app.use('/api', hotelRouter);
app.use('/api', destinationRouter);
app.use('/api', restaurantRouter);
app.use('/api', e_bikeTypeRouter);
app.use('/auth', authRouter);
app.use('/api', e_bikeRouter);
app.use('/api', e_bikePriceRouter);
app.use('/api', thonbaneCategoryRouter);


app.listen(PORT, () => {
    console.log(`Server is Connection on ${PORT}`);
})