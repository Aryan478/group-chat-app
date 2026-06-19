require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Message = require("./models/Message");
const User = require("./models/User");
const PrivateMessage = require("./models/PrivateMessage");

const app = express();

// =======================
// DATABASE
// =======================

mongoose
  .connect(
    process.env.MONGODB_URI ||
      "mongodb://127.0.0.1:27017/group-chat-app"
  )
  .then(() => {
    console.log("✅ MongoDB Connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB Error:", err);
  });

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server Running");
});

// =======================
// SIGNUP
// =======================

app.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
});

// =======================
// LOGIN
// =======================

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email,
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    await User.findByIdAndUpdate(user._id, {
      status: "online",
    });

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
      },
      process.env.JWT_SECRET || "mysecretkey",
      {
        expiresIn: "1d",
      }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
});

// =======================
// PRIVATE MESSAGE HISTORY
// =======================

app.get(
  "/private-messages/:user1/:user2",
  async (req, res) => {
    try {
      const { user1, user2 } = req.params;

      const messages = await PrivateMessage.find({
        $or: [
          {
            sender: user1,
            receiver: user2,
          },
          {
            sender: user2,
            receiver: user1,
          },
        ],
      }).sort({
        createdAt: 1,
      });

      res.json(messages);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Server Error",
      });
    }
  }
);

// =======================
// MARK MESSAGE AS SEEN
// =======================

app.put(
  "/private-message/:id/seen",
  async (req, res) => {
    try {
      const message = await PrivateMessage.findByIdAndUpdate(
        req.params.id,
        {
          seen: true,
        },
        {
          new: true,
        }
      );

      res.json(message);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Server Error",
      });
    }
  }
);

// =======================
// SOCKET SERVER
// =======================

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// username -> socket.id
const onlineUsers = {};

io.on("connection", (socket) => {
  console.log("🟢 User Connected:", socket.id);

  // =======================
  // REGISTER USER
  // =======================

  socket.on("register_user", (username) => {
    onlineUsers[username] = socket.id;

    io.emit("online_users", Object.keys(onlineUsers));

    console.log("Online Users:", Object.keys(onlineUsers));
  });

  // =======================
  // JOIN ROOM
  // =======================

  socket.on("join_room", async (room) => {
    try {
      socket.join(room);

      const messages = await Message.find({
        room,
      }).sort({
        createdAt: 1,
      });

      socket.emit("chat_history", messages);

      console.log(`${socket.id} joined room ${room}`);
    } catch (err) {
      console.error(err);
    }
  });

  // =======================
  // ROOM MESSAGE
  // =======================

  socket.on("send_message", async (data) => {
    try {
      const savedMessage = await Message.create({
        room: data.room,
        author: data.username,
        message: data.message,
      });

      io.to(data.room).emit("receive_message", savedMessage);
    } catch (err) {
      console.error(err);
    }
  });

  // =======================
  // TYPING
  // =======================

  socket.on("typing", ({ room, username }) => {
    socket.to(room).emit("user_typing", username);
  });

  // =======================
  // PRIVATE MESSAGE
  // =======================

  socket.on("private_message", async (data) => {
    try {
      const receiverSocket = onlineUsers[data.receiver];

      const savedMessage = await PrivateMessage.create({
        sender: data.sender,
        receiver: data.receiver,
        message: data.message,
        delivered: !!receiverSocket,
      });

      if (receiverSocket) {
        io.to(receiverSocket).emit(
          "receive_private_message",
          savedMessage
        );
      }

      socket.emit("receive_private_message", savedMessage);
    } catch (err) {
      console.error(err);
    }
  });

  // =======================
  // DISCONNECT
  // =======================

  socket.on("disconnect", async () => {
    const username = Object.keys(onlineUsers).find(
      (user) => onlineUsers[user] === socket.id
    );

    if (username) {
      await User.findOneAndUpdate(
        {
          username,
        },
        {
          status: "offline",
          lastSeen: new Date(),
        }
      );

      delete onlineUsers[username];

      io.emit("online_users", Object.keys(onlineUsers));
    }

    console.log("🔴 User Disconnected:", socket.id);
  });
});

// =======================
// START SERVER
// =======================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server Started on Port ${PORT}`);
});