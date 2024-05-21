const express = require("express");
const dotenv = require("dotenv").config();
const cors = require("cors");
const colors = require("colors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// Init express
const app = express();

// Environment variables
const port = process.env.PORT || 9090;

// Middlewares
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "https://bistro-boss-65c20.web.app"],
    credentials: true,
  })
);

// MongoURI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.flkt4kr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// MongoDbConnection function.
async function run() {
  try {
    await client.connect();
    console.log(`MongoDb connection is successfull`.bgGreen.black);

    const foodMenuCollection = client
      .db("bistroBossDB")
      .collection("foodMenuCollection");

    const reviewsCollection = client
      .db("bistroBossDB")
      .collection("reviewsCollection");

    const cartCollection = client
      .db("bistroBossDB")
      .collection("cartCollection");

    // Get ALL MENU ITEMS
    app.get("/food/menu", async (req, res) => {
      const result = await foodMenuCollection.find().toArray();
      res.send(result);
    });

    // Get all reviews
    app.get("/food/menu/reviews", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });

    // Get all food cards
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.status(200).send(result);
    });

    // Add to cart food
    app.post("/carts", async (req, res) => {
      const newCart = req.body;
      const result = await cartCollection.insertOne(newCart);
      res.status(201).send(result);
    });

    // Delete a cart
    app.delete("/carts", async (req, res) => {
      const id = req.query.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

// Listen server
app.listen(port, () => {
  console.log(`Server is running on port: ${port}`.bgMagenta.black);
});
