import express from "express"
import "dotenv/config"
import db from "./config/db.js"
import hotelRouter from "./routers/hotelRouter.js"

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
app.use("/images", express.static("images"));

// API

app.use('/api/admin/', hotelRouter);

app.listen(PORT, () => {
    console.log(`Server is Connection on ${PORT}`);
})