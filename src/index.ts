import express from "express";
import pg from "pg";
import { HDNodeWallet } from "ethers"; // assuming you use ethers v6
import { randomBytes } from "crypto";
const { Client } = pg;
const app = express();
app.use(express.json()); // ✅ required

const client = new Client({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "mysecretpassword",
  database: "postgres",
});

client.connect();

app.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body; // ✅ works now

    const result = await client.query(
      `INSERT INTO users(username, password, depositAddress, privateKey, balance)
       VALUES($1, $2, $3, $4, $5) RETURNING id`,
      [username, password, "", "", 0]
    );

    const userId = result.rows[0].id;
    const seed = randomBytes(32);
    // const seed = Buffer.from("randomseedvalue", "utf8");
    const hdNode = HDNodeWallet.fromSeed(seed);
    const child = hdNode.derivePath(`m/44'/60'/${userId}'/0`);

    await client.query(
      "UPDATE users SET depositAddress=$1, privateKey=$2 WHERE id=$3",
      [child.address, child.privateKey, userId]
    );

    console.log("✅ New user created:", username, child.address);
    console.log(userId);
    res.status(201).json({ username, depositAddress: child.address });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(3000, () => console.log("🚀 Server running on port 3000"));
