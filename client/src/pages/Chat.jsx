import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../App.css";

const socket = io("http://localhost:5000");

function Chat() {
  const [username] = useState(localStorage.getItem("username") || "");
  const [room, setRoom] = useState("");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUser, setTypingUser] = useState("");

  // Private Chat
  const [selectedUser, setSelectedUser] = useState("");
  const [privateMessage, setPrivateMessage] = useState("");
  const [privateChats, setPrivateChats] = useState([]);

  useEffect(() => {
    if (username) {
      socket.emit("register_user", username);
    }

    socket.on("online_users", (users) => {
      setOnlineUsers(users);
    });

    socket.on("chat_history", (messages) => {
      setChat(messages);
    });

    socket.on("receive_message", (data) => {
      setChat((prev) => [...prev, data]);
    });

    socket.on("user_typing", (user) => {
      setTypingUser(user);
      setTimeout(() => {
        setTypingUser("");
      }, 2000);
    });

    socket.on("receive_private_message", (data) => {
      toast.success(`${data.sender} sent a message`);
      setPrivateChats((prev) => [...prev, data]);
    });

    return () => {
      socket.off("online_users");
      socket.off("chat_history");
      socket.off("receive_message");
      socket.off("user_typing");
      socket.off("receive_private_message");
    };
  }, [username]);

  useEffect(() => {
    if (!selectedUser) return;

    const loadMessages = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/private-messages/${username}/${selectedUser}`
        );
        setPrivateChats(response.data);

        response.data.forEach(async (msg) => {
          if (msg.receiver === username && !msg.seen) {
            await axios.put(`http://localhost:5000/private-message/${msg._id}/seen`);
          }
        });
      } catch (error) {
        console.error(error);
      }
    };

    loadMessages();
  }, [selectedUser, username]);

  const joinRoom = () => {
    if (!room) return;
    socket.emit("join_room", room);
  };

  const sendMessage = () => {
    if (!room || !message) return;
    socket.emit("send_message", { room, username, message });
    setMessage("");
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    socket.emit("typing", { room, username });
  };

  const sendPrivateMessage = () => {
    if (!selectedUser || !privateMessage) return;
    socket.emit("private_message", {
      sender: username,
      receiver: selectedUser,
      message: privateMessage,
    });
    setPrivateMessage("");
  };

  const logout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div class="chat-page-wrapper">
      
      {/* SIDEBAR PANEL LEFT CONTROL COLUMN */}
      <aside class="sidebar-panel">
        <div>
          <h2>Online Users</h2>
          <div class="online-users-box">
            {onlineUsers
              .filter((user) => user !== username)
              .map((user, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedUser(user)}
                  className={`user-status-item ${selectedUser === user ? "active-target" : ""}`}
                >
                  <span style={{ marginRight: "8px" }}>🟢</span> {user}
                </div>
              ))}
          </div>
        </div>

        <hr />

        <div style={{ display: "flex", flex: "1", flexDirection: "column", minHeight: "0" }}>
          <h3>Private Chat</h3>
          <div class="private-deck-card">
            <p>Selected: <strong>{selectedUser || "None"}</strong></p>
            <div class="ui-element-row">
              <input
                type="text"
                placeholder="Private message..."
                value={privateMessage}
                onChange={(e) => setPrivateMessage(e.target.value)}
              />
              <button onClick={sendPrivateMessage}>Send</button>
            </div>
          </div>

          {/* Independent Scrolling Pane for Selected DM Logs */}
          <div class="private-history-scroller">
            {privateChats
              .filter((msg) => msg.sender === selectedUser || msg.receiver === selectedUser)
              .map((msg, index) => (
                <div key={index} className={`chat-bubble-row ${msg.sender === username ? "is-me" : "is-external"}`}>
                  <div class="chat-bubble-card">
                    <p style={{ margin: 0, fontSize: "0.88rem" }}>{msg.message}</p>
                  </div>
                  <div class="chat-bubble-meta">
                    <span class="chat-bubble-author">{msg.sender}</span>
                    <span>•</span>
                    <span>{msg.seen ? "✓✓ Seen" : msg.delivered ? "✓✓ Delivered" : "✓ Sent"}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </aside>

      {/* MAIN CONVERSATION ENGINE VIEWPORT CONTAINER (RIGHT SIDE) */}
      <main class="main-workspace-container">
        
        {/* Fixed Horizontal Control Top Bar */}
        <header class="workspace-top-bar">
          <div>
            <h1>Group Chat Application</h1>
            <p style={{ marginTop: "4px" }}>Logged in as: <strong>{username}</strong></p>
          </div>
          <button class="btn-danger" onClick={logout}>Logout</button>
        </header>

        {/* Room Navigation Subrouter Row */}
        <section class="workspace-routing-strip">
          <div class="ui-element-row" style={{ maxWidth: "400px" }}>
            <input
              type="text"
              placeholder="Room Number ID"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
            />
            <button class="btn-neutral" onClick={joinRoom}>Join Room</button>
          </div>
        </section>

        {/* Primary Scrollable Message Flow Feed Stream Area */}
        <section class="workspace-messages-flow">
          {chat.map((msg, index) => (
            <div key={index} className={`chat-bubble-row ${msg.author === username ? "is-me" : "is-external"}`}>
              <div class="chat-bubble-card">
                <p style={{ margin: 0 }}>{msg.message}</p>
              </div>
              <div class="chat-bubble-meta">
                <span class="chat-bubble-author">{msg.author}</span>
                {msg.createdAt && (
                  <>
                    <span>•</span>
                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </section>

        {/* Live Status Typing Sub-info Field Row */}
        <div class="feedback-status-text">
          {typingUser ? `${typingUser} is typing...` : ""}
        </div>

        {/* Bottom Form Anchored Input Dock Strip */}
        <footer class="workspace-bottom-dock">
          <div class="ui-element-row">
            <input
              type="text"
              placeholder="Type an open message to this group room channel..."
              value={message}
              onChange={handleTyping}
            />
            <button onClick={sendMessage}>Broadcast</button>
          </div>
        </footer>

      </main>

      <ToastContainer theme="dark" />
    </div>
  );
}

export default Chat;