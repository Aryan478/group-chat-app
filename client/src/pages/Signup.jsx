import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSignup = async () => {
    try {
      await axios.post("http://localhost:5000/signup", { username, email, password });
      alert("Signup Successful!");
      navigate("/login");
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Signup Failed");
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1>Create Account</h1>
        <p>Get started with your custom chat profile</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
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
          <button style={{ marginTop: "8px" }} onClick={handleSignup}>Sign Up</button>
          
          <div style={{ display: "flex", alignItems: "center", margin: "12px 0" }}>
            <hr style={{ flex: 1, opacity: 0.3 }} /><span style={{ padding: "0 12px", fontSize: "0.8rem", color: "var(--text-muted)" }}>OR</span><hr style={{ flex: 1, opacity: 0.3 }} />
          </div>

          <button className="btn-neutral" onClick={() => navigate("/login")}>Already Have an Account?</button>
        </div>
      </div>
    </div>
  );
}

export default Signup;