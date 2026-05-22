const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "193.203.184.201",
  port: 3306,
  user: "u818923248_app",
  password: "K3I?XVCE#Io",
  database: "u818923248_app",

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
