//import
import express from "express";
import mongoose from "mongoose";
import Messages from "./dbMessages.js";
import Pusher from "pusher";
import cors from 'cors';

//app config (created app and instance of express)
const app = express();
const port = process.env.PORT || 9000;

const pusher = new Pusher({
  appId: "<your id>",
  key: "<your key>",
  secret: "<your secret>",
  cluster: "ap2",
  useTLS: true,
});

//middleware
app.use(express.json());
app.use(cors());

// ////headers
// app.use((req, res, next) => {
//   res.setHeader("Acess-Control-Allow-Origin", "*");
//   res.setHeader("Acess-Control-Allow-Headers", "*");
//   next();
// })


//db config
const connection_url =
  "mongodb+srv://admin:admin@cluster0.8anl9.mongodb.net/whatsappdb?retryWrites=true&w=majority";

mongoose.connect(connection_url, {
  // useCreateIndex: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

//create change stream
const db = mongoose.connection;

db.once("open", () => {
  console.log("db connected");

  const msgCollection = db.collection("messagecontents");
  const changeStream = msgCollection.watch();

  changeStream.on("change", (change) => {
    console.log('A change occured', change);

    if(change.operationType === 'insert') {
        const messageDetails = change.fullDocument;
        pusher.trigger("messages", "inserted", {
            name: messageDetails.name,
            message: messageDetails.message,
            timestamp: messageDetails.timestamp,
            received: messageDetails.received,
        });
    } else{
        console.log('error triggering pusher');
    }
  });
});

//api routes
app.get("/", (req, res) => res.status(200).send("hello worldddd!"));

//// get back all the messages
app.get("/messages/sync", (req, res) => {
  Messages.find((err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(200).send(data);
    }
  });
});

app.post("/messages/new", (req, res) => {
  const dbMessage = req.body;

  Messages.create(dbMessage, (err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(201).send(data);
    }
  });
});

//listen
app.listen(port, () => console.log(`listening on localhost:${port}`));
