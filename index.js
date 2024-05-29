const express = require("express");
const dotenv = require("dotenv").config();
const cors = require("cors");
const colors = require("colors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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

// TokenVarify token
const tokenVerify = (req, res, next) => {
  const token = req.headers.authorization.split(" ")[1];

  // if Not token
  if (!token) {
    return res.status(401).send({ message: "Unauthorize-access" });
  }

  // now verify token
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden" });
    } else {
      req.email = decoded;
    }
    next();
  });
};

// MongoDbConnection function.
async function run() {
  try {
    // await client.connect();
    // console.log(`MongoDb connection is successfull`.bgGreen.black);

    // ServerTest api
    app.get("/", async (req, res) => {
      res.send(`Server is running on port: ${port}`);
    });

    const userCollection = client.db("bistroBossDB").collection("users");
    const paymentCollection = client.db("bistroBossDB").collection("payments");

    const foodMenuCollection = client
      .db("bistroBossDB")
      .collection("foodMenuCollection");

    const reviewsCollection = client
      .db("bistroBossDB")
      .collection("reviewsCollection");

    const cartCollection = client
      .db("bistroBossDB")
      .collection("cartCollection");

    // varifyAdmin
    const verifyAdmin = async (req, res, next) => {
      const email = req.email.email;
      const query = { email: email };
      const getUser = await userCollection.findOne(query);
      const isAdmin = getUser.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      next();
    };

    /**
     *  --------------------------
     *    User related api
     *  --------------------------
     */

    // Create jwt token
    app.post("/users/jwt", async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // Get admin
    app.get("/users/admin/:email", tokenVerify, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      if (email !== req.email.email) {
        return res.status(401).send({ message: "Unauthorize-access!" });
      }
      const user = await userCollection.findOne(query);
      res.send(user);
    });

    // Get all users
    app.get("/users", tokenVerify, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // Create an user
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const query = { email: newUser.email };
      // email is exits
      const isExitsEmail = await userCollection.findOne(query);
      if (isExitsEmail) {
        return res.send({ message: "Email already exits!", insertetId: null });
      } else {
        const result = await userCollection.insertOne(newUser);
        res.send(result);
      }
    });

    // make admin an user
    app.patch(
      "/users/admin/:id",
      tokenVerify,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        console.log(id);
        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(query, updateDoc);
        res.send(result);
      }
    );

    // Delete an user
    app.delete("/users/:id", tokenVerify, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // Get ALL MENU ITEMS
    app.get("/food/menu", async (req, res) => {
      const result = await foodMenuCollection.find().toArray();
      res.send(result);
    });

    // Create an menu item
    app.post("/food/menu", tokenVerify, verifyAdmin, async (req, res) => {
      const newItem = req.body;
      const result = await foodMenuCollection.insertOne(newItem);
      res.send(result);
    });

    // Get Single menu items
    app.get("/food/menu/item/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodMenuCollection.findOne(query);
      res.send(result);
    });

    // Update an single item
    app.patch(
      "/food/menu/item/:id",
      tokenVerify,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const data = req.body;
        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            name: data.name,
            price: data.price,
            image: data.image,
            recipe: data.recipe,
            category: data.category,
          },
        };
        const result = await foodMenuCollection.updateOne(query, updateDoc);
        res.send(result);
      }
    );

    // Delete an menu item
    app.delete("/food/menu/:id", tokenVerify, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodMenuCollection.deleteOne(query);
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

    // Stripe payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // Get all payment
    app.get("/payment/history/:email", tokenVerify, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

    // save payment history
    app.post("/payment/history", tokenVerify, async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);

      // now delete cart item add to cart
      const query = {
        _id: {
          $in: payment.cardIds.map((id) => new ObjectId(id)),
        },
      };
      await cartCollection.deleteMany(query);
      res.send(result);
    });

    // Get admin home page total revinew, users, products, and orders
    app.get("/admin-stats", tokenVerify, verifyAdmin, async (req, res) => {
      const totalUsers = await userCollection.estimatedDocumentCount();
      const totalMenu = await foodMenuCollection.estimatedDocumentCount();
      const totalOrders = await paymentCollection.estimatedDocumentCount();

      const result = await paymentCollection
        .aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" },
            },
          },
        ])
        .toArray();

      const totalRevinew = result.length > 0 ? result[0].total : 0;
      res.send({ totalUsers, totalMenu, totalOrders, totalRevinew });
    });

    // Order stats
    app.get("/order/stats", tokenVerify, verifyAdmin, async (req, res) => {
      const result = await paymentCollection
        .aggregate([
          {
            $unwind: "$menuIds",
          },

          {
            $addFields: {
              menuIds: { $toObjectId: "$menuIds" },
            },
          },

          {
            $lookup: {
              from: "foodMenuCollection",
              localField: "menuIds",
              foreignField: "_id",
              as: "newFoodItems",
            },
          },

          {
            $unwind: "$newFoodItems",
          },

          {
            $group: {
              _id: "$newFoodItems.category",
              quantity: { $sum: 1 },
              revinew: { $sum: "$newFoodItems.price" },
            },
          },

          {
            $project: {
              _id: 0,
              category: "$_id",
              quantity: "$quantity",
              revinew: "$revinew",
            },
          },
        ])
        .toArray();

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
