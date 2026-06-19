import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const response = await axios.post("http://localhost:5000/login", { email, password });
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("username", response.data.user.username);
      navigate("/chat");
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Login Failed");
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1>Welcome Back</h1>
        <p>Log in to access your messaging channels</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button style={{ marginTop: "8px" }} onClick={handleLogin}>Log In</button>
          
          <div style={{ display: "flex", alignItems: "center", margin: "12px 0" }}>
            <hr style={{ flex: 1, opacity: 0.3 }} /><span style={{ padding: "0 12px", fontSize: "0.8rem", color: "var(--text-muted)" }}>OR</span><hr style={{ flex: 1, opacity: 0.3 }} />
          </div>

          <button className="btn-neutral" onClick={() => navigate("/signup")}>Create an Account</button>
        </div>
      </div>
    </div>
  );
}

export default Login;