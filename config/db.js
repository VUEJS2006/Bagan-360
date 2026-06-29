import mysql from "mysql2";
import "dotenv/config";

console.log("DB Information", {
    HOST: process.env.HOST,
    USER: process.env.USER,
    PASS: process.env.PASSWORD,
    DB: process.env.DATABASE,
})

const db = mysql.createPool({
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
})

export default db;