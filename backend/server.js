const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const colors = require("colors");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const path = require("path");

dotenv.config();
connectDB();
const app = express();
app.use(express.json());
const port = process.env.PORT || 5000;

// app.get("/", (req, res) => {
//   res.send("API is running.."); // Example route response
// });
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

// ****Deploy config***
const __dirname1 = path.resolve();
if (process.env.NODE_ENV === "production") {
  console.log(__dirname1);
  app.use(express.static(path.join(__dirname1, "/frontend/build")));
  console.log(path.join(__dirname1, "../frontend/build"));
  app.get("*", (req, res) =>
    res.sendFile(path.join(__dirname1, "/frontend/build/index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running..");
  });
}

app.use(notFound);
app.use(errorHandler);

const server = app.listen(port, () => {
  console.log(`Example app listening on port ${port}`.yellow.bold);
});

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "http://localhost:3000",
  },
});

io.on("connection", (socket) => {
  console.log("Connected to socket.io");
  socket.on("setup", (userData) => {
    socket.join(userData._id);
    socket.emit("connected");
  });
  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User Joined Room: " + room);
  });
  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));
  socket.on("new message", (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;

    if (!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) return;

      socket.in(user._id).emit("message recieved", newMessageRecieved);
    });
  });
  socket.off("setup", () => {
    console.log("USER DISCONNECTED");
    socket.leave(userData._id);
  });
});