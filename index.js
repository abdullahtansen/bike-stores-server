const express = require('express');
const app = express();
const cors = require('cors');
const admin = require("firebase-admin");
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});



app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.u3yaa.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri);

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true});


async function verifyToken(req,res,next){
  if(req.headers?.authorization.startsWith('Bearer')){
    const token = req.headers.authorization.split(' ')[1];

    try{
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    }
    catch{

    }
  }

  next();
}


async function run (){

    try{
        await client.connect();
        // console.log('database connected successfully');
        const database = client.db('bike_stores');
        const bikesCollection = database.collection('bikes');
        const ordersCollection = database.collection('orders');
        const reviewsCollection = database.collection('reviews');
        const usersCollection = database.collection('users');

        app.get('/bikes',async (req,res)=>{
            const cursor = bikesCollection.find({});
            const bikes = await cursor.toArray();
            res.send(bikes);
        });

        app.get('/bikes/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const bike = await bikesCollection.findOne(query);
            res.send(bike);
          });

          app.get('/order', verifyToken,  async (req,res)=>{
            const email = req.query.email;
            const query = { email: email };
            const result = await ordersCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/bikes', async (req,res)=>{
            const bike_stores = req.body;
            const result = await bikesCollection.insertOne(bike_stores);
            // console.log(bike_stores);
            res.send(result);
        })

        app.post('/order', async (req,res)=>{
            const bike_Orders = req.body;
            // console.log(bike_Orders);
            const result = await ordersCollection.insertOne(bike_Orders);
            res.send(result);
        })

        app.post("/reviews", async (req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review);
            res.send(result);
          });
          app.get("/reviews", async (req, res) => {
            const result = await reviewsCollection.find().toArray();
            res.send(result);
          });

          // Admin Or normal user checked
          app.get('/users/:email', async(req,res)=>{
            const email = req.params.email;
            const query = {email: email};
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if(user?.role == 'admin'){
              isAdmin = true;
            }
            res.send({admin: isAdmin });
          })


          // User Creation Process
          app.post('/users', async (req,res)=>{
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
          })

          app.put('/users',async (req,res)=>{
            const user = req.body;
            const filter = {email: user.email};
            const options = {upsert: true};
            const updateDoc = {$set: user};
            const result = await usersCollection.updateOne(filter,updateDoc,options);
            res.json(result);
          }) 

          app.put('/users/admin', verifyToken ,async(req,res)=>{
            const user = req.body;
            const requester = req.decodedEmail;
            if(requester){
              const requesterAccount = usersCollection.findOne({email: requester});
              if(requesterAccount.role === 'admin'){
                const filter = {email: user.email};
                const updateDoc = {$set:{role: 'admin'}}
                const result = await usersCollection.updateOne(filter,updateDoc);
                res.send(result)
              }
            }
            else{
              res.status(403).json({message: 'you do not have access to make admin'});
            }
          })
    }
    finally{
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello Bike Stores portal!')
})

app.listen(port, () => {
  console.log(`listening at port ${port}`)
})