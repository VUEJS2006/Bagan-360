import express from "express"
import "dotenv/config";
import cookieParser from "cookie-parser"
import db from "./config/db.js";
import authRouter from "./routes/authRouters.js"
import memberRouter from "./routes/memberRouters.js"
const app = express()



try {
    await db.connect();
    console.log("DB is connected");
} catch (err) {
    console.log("Fail", err);
}

const PORT = process.env.PORT || 5000;
app.get("/", (req, res) => {
    res.send('Hello')
})
app.use(express.json())
app.use(cookieParser())

app.use('/auth',authRouter);

app.use('/api',memberRouter);
// app.use('/uploads', express.static('image/uploads'));

app.listen(PORT,'0.0.0.0', () => {
    console.log(`server is running on port${PORT}`)
})