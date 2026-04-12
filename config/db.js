
import mysql from "mysql2/promise"
import "dotenv/config"

const db = await mysql.createConnection({
    host:process.env.HOST,
    user:process.env.USER,
    password:process.env.PASS,
    database:process.env.DB
})
console.log(process.env.PASS)
export default db;