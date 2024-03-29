const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.oh6dvsr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

async function run() {
	try {
		// Connect the client to the server	(optional starting in v4.7)
		//	await client.connect();

		// database collection
		const userCollection = client
			.db("percelManagement")
			.collection("users");
		const parcelCollection = client
			.db("percelManagement")
			.collection("parcels");
		const deliveryAssignCollection = client
			.db("percelManagement")
			.collection("deliveryAssign");

		//jwt api
		app.post("/jwt", async (req, res) => {
			const user = req.body;
			const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
				expiresIn: "1h",
			});
			res.send({ token });
		});

		//middlewares
		const verifyToken = (req, res, next) => {
			console.log(req.headers.authorization);
			if (!req.headers.authorization) {
				return res.status(401).send({ message: "forbidden access" });
			}
			const token = req.headers.authorization.split(" ")[1];
			jwt.verify(
				token,
				process.env.ACCESS_TOKEN_SECRET,
				(err, decoded) => {
					if (err) {
						return res
							.status(401)
							.send({ message: "forbidden access" });
					}

					req.decoded = decoded;
					next();
				}
			);
		};

		// all users api

		app.get("/users", verifyToken, async (req, res) => {
			console.log(req.headers);
			const result = await userCollection.find().toArray();
			res.send(result);
		});

		//find admin email
		app.get("/users/admin/:email", verifyToken, async (req, res) => {
			const email = req.params.email;

			if (email !== req.decoded.email) {
				return res.status(403).send({ message: "forbidden access" });
			}

			const query = { email: email };
			const user = await userCollection.findOne(query);
			let admin = false;
			if (user) {
				admin = user?.role === "Admin";
			}
			res.send({ admin });
		});

		//find DeliveryMen email
		app.get("/users/deliveryMen/:email", verifyToken, async (req, res) => {
			const email = req.params.email;

			if (email !== req.decoded.email) {
				return res.status(403).send({ message: "forbidden access" });
			}

			const query = { email: email };
			const user = await userCollection.findOne(query);
			let deliveryMen = false;
			if (user) {
				deliveryMen = user?.role === "DeliveryMen";
			}
			res.send({ deliveryMen });
		});

		// new user
		app.post("/users", async (req, res) => {
			const user = req.body;
			// to check existing email
			const query = { email: user.email };
			const existingUser = await userCollection.findOne(query);
			if (existingUser) {
				return res.send({
					message: "User already exists",
					insertedId: null,
				});
			}
			const result = await userCollection.insertOne(user);
			res.send(result);
		});

		//make deliveryman
		app.patch("/users/deliveryman/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const updatedDoc = {
				$set: {
					role: "DeliveryMen",
				},
			};
			const result = await userCollection.updateOne(query, updatedDoc);
			res.send(result);
		});
		//make admin
		app.patch("/users/admin/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const updatedDoc = {
				$set: {
					role: "Admin",
				},
			};
			const result = await userCollection.updateOne(query, updatedDoc);
			res.send(result);
		});

		//add percels
		app.post("/parcels", async (req, res) => {
			const parcel = req.body;
			const result = await parcelCollection.insertOne(parcel);
			res.send(result);
		});

		// percel get
		app.get("/parcels", async (req, res) => {
			const parcels = await parcelCollection.find().toArray();
			res.send(parcels);
		});

		// my parcels
		app.get("/myParcels", async (req, res) => {
			const email = req.query.email;
			const query = { email: email };
			const result = await parcelCollection.find(query).toArray();
			res.send(result);
		});

		//get parcels by id
		app.get("/parcels/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await parcelCollection.findOne(query);
			res.send(result);
		});

		//update parcel
		app.patch("/parcels/:id", async (req, res) => {
			const parcel = req.body;
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const updatedDoc = {
				$set: {
					name: parcel.name,
					email: parcel.email,
					phoneNumber: parcel.phoneNumber,
					parcelType: parcel.parcelType,
					parcelWeight: parcel.parcelWeight,
					receiverName: parcel.receiverName,
					receiverPhoneNumber: parcel.receiverPhoneNumber,
					deliveryAddress: parcel.deliveryAddress,
					requestedDeliveryDate: parcel.requestedDeliveryDate,
					deliveryAddressLatitude: parcel.deliveryAddressLatitude,
					deliveryAddressLongitude: parcel.deliveryAddressLongitude,
					bookingDate: parcel.bookingDate,
					price: parcel.price,
					status: "pending",
				},
			};
			const result = await parcelCollection.updateOne(query, updatedDoc);
			res.send(result);
		});

		//delete parcel
		app.delete("/parcels/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await parcelCollection.deleteOne(query);
			res.send(result);
		});

		//assign deliveryman
		app.post("/deliveryAssign", async (req, res) => {
			const deliveryAssigned = req.body;
			const result = await deliveryAssignCollection.insertOne(
				deliveryAssigned
			);
			res.send(result);
		});

		app.patch("/parcels/:id", async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const updatedDoc = {
				$set: {
					status: "On the Way",
				},
			};
			const result = await parcelCollection.updateOne(query, updatedDoc);
			res.send(result);
		});

		// Send a ping to confirm a successful connection
		// await client.db("admin").command({ ping: 1 });
		// console.log(
		// 	"Pinged your deployment. You successfully connected to MongoDB!"
		// );
	} finally {
		// Ensures that the client will close when you finish/error
		// await client.close();
	}
}
run().catch(console.dir);

app.get("/", (req, res) => {
	res.send("Percel App is running!");
});

app.listen(port, () => {
	console.log(`Percel App listening on port ${port}`);
});
