const express = require("express");
const dotenv = require("dotenv");
var cors = require('cors')
const {chats} =require("./data/data");
const connectDB = require("./config/db");
const colors = require("colors");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const path= require("path");

const {notFound,errorHandler}= require('./middleware/errorMiddleware');
const { Socket } = require("socket.io");
dotenv.config();
connectDB();
const app = express();
app.use(cors())

app.use(express.json()); // to accept json data
app.get("/", (req, res) => {
  res.send("API Running!");
});


app.use("/api/user", userRoutes);
app.use('/api/chat',chatRoutes);
app.use("/api/message", messageRoutes);

app.use(notFound);
app.use(errorHandler);

// ----------------------deployment ===-----------------

const __dirname1 = path.resolve();

if(process.env.NODE_ENV === 'production'){
  app.use(express.static(path.join(__dirname1,"/frontend/build")));
 app.get("/", (req, res) => {
   res.sendFile(path.resolve(__dirname1,"frontend","build","index.html"));
 });


}else{
  app.get("/",(req,res)=> {
    res.send("API is running successfully");
  });
}

// ----------------------deployment ===-----------------



//---------used before ------
// app.get('/api/chat',(req,res)=>{
// res.send(chats);
// });


// app.get("/api/chat/:id",(req,res)=>{
//     // console.log(req.params.id);
//     const singleChat =chats.find((c)=> c._id == req.params.id);
//     res.send(singleChat);
// });



const PORT = process.env.PORT || 5000

const server = app.listen(5000, console.log("server started on PORT ",PORT));
const io= require('socket.io')(server,{
  pingTimeout:60000,
  cors:{
    origin: "http://localhost:3000",
  },
  });

  io.on("connection",(socket)=>{
    console.log("connected to socket.io");

    socket.on('setup',(userData)=>{
      socket.join(userData._id);
    
      socket.emit("connected");
    });
    socket.on('join chat',(room)=>{
      socket.join(room);
      console.log('User Joined Room: ' +room);
    });

    socket.on('typing',(room)=> socket.in(room).emit("typing"));
    socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));
    socket.on("new message",(newMessageReceived)=>{
      var chat= newMessageReceived.chat;

      if(!chat.users) return console.log("chat.users not defined");

      chat.users.forEach(user => {
        if(user._id == newMessageReceived.sender._id) return;

        socket.in(user._id).emit("message received",newMessageReceived);
      });
    });

    socket.off("setup",()=>{
      console.log("User Disconnected");
      socket.leave(userData._id);

    });
  });