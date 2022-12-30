const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

const app = express();

// middleware
app.use(cors());
app.use(express.json());

/* JWT MiddleWare */
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    req.decoded = decoded;
    next();
  });
}

/* ----------Database Connection---------- */
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.j8jry5z.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const usersCollection = client.db("social-app").collection("users");
    const postsCollection = client.db("social-app").collection("posts");
    const likesCollection = client.db("social-app").collection("likes");
    const commentsCollection = client.db("social-app").collection("comments");

    /* --------- JWT ------ */
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "5h",
      });
      res.send({ result, token });
    });

    /* GET */
    app.get("/users-list", async (req, res) => {
      const query = {};
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/posts", async (req, res) => {
      try {
        const like = req.query.likes;
        const comment = req.query.comments;
        let post;
        if (like && comment) {
          post = await postsCollection
            .find({
              $or: [{ like: { $gt: 5 } }, { comments: { $gt: comment } }],
            })
            .sort({ like: -1 });
        } else {
          post = await postsCollection.find().sort({postedTime:1}).toArray();
        }
        if (post) {
          res.status(200).send(post);
        } else {
          res.status(404).send({
            success: false,
            message: "Posts not Found",
          });
        }
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });
    app.get("/user-posts", async (req, res) => {
      const email = req.query.email;
      const query = { userEmail: email };
      const cursor = postsCollection.find(query);
      const result = await cursor.sort({ postedTime: -1 }).toArray();
      res.send(result);
    });
    app.get("/user", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result =  await usersCollection.findOne(query);
      res.send(result);
    });
    app.get("/post-details/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const post = await postsCollection.findOne(query);
      res.send(post);
    });

    /* POST */
    /*Share Post*/
    app.post("/add-post", async (req, res) => {
      const post = req.body;
      const result = await postsCollection.insertOne(post);
      res.send(result);
    });
    /*User Information*/
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    /* PATCH */

    /* PUT */
    app.put("/likes", async (req, res) => {
      const id = req.query.id;
      /* const userEmail = req.query.email; */
      /* console.log(userEmail) */
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const query = {
        _id: ObjectId(id),
        like: req.query.email,
      };
      /* console.log(query); */
      const alreadyLiked = await postsCollection.find(query).toArray();
      /* console.log(alreadyLiked); */
      if (alreadyLiked.length) {
        const message = `You already have liked`;
        return res.send({ acknowledged: false, message });
      }
      const updatedDoc = {
        $push: {
          like: req.query.email,
        },
      };
      const result = await postsCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      /* console.log(result); */
      res.send(result);
    });

    app.put("/comment", async (req, res) => {
      const id = req.query.id;
      const commentBody = req.body;
      /* console.log(userEmail) */
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      // const query = {
      //   _id: ObjectId(id),
      // };
      // /* console.log(query); */
      // const alreadyLiked = await postsCollection.find(query).toArray();
      // /* console.log(alreadyLiked); */
      // if (alreadyLiked.length) {
      //   const message = `You already have liked`;
      //   return res.send({ acknowledged: false, message });
      // }
      const updatedDoc = {
        $push: {
          comments: commentBody,
        },
      };
      const result = await postsCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      /* console.log(result); */
      res.send(result);
    });
    app.put("/users", async (req, res) => {
      const email = req.query.email;
      const about = req.body;
      /* console.log(userEmail) */
      const filter = { email: email };
      const options = { upsert: true };
      // const query = {
      //   _id: ObjectId(id),
      // };
      // /* console.log(query); */
      // const alreadyLiked = await postsCollection.find(query).toArray();
      // /* console.log(alreadyLiked); */
      // if (alreadyLiked.length) {
      //   const message = `You already have liked`;
      //   return res.send({ acknowledged: false, message });
      // }
      const updatedDoc = {
        $set: about,
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      /* console.log(result); */
      res.send(result);
    });
    /* DELETE */
  } finally {
  }
}
run().catch(console.log);

app.get("/", async (req, res) => {
  res.send("Social App is Running");
});

app.listen(port, () => console.log(`Social App is Running on ${port}`));
