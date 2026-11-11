import { useEffect, useContext, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "../styles/navbar.css";
export default function AuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const handled = useRef(false);

  useEffect(() => {
    // Guard against running twice (StrictMode / login identity changes).
    if (handled.current) return;
    handled.current = true;
    const token = searchParams.get("token");
    if (token) {
      login(token);
      navigate("/homepage");
    } else {
      navigate("/login?error=oauth_failed");
    }
  }, [searchParams, login, navigate]);

  return <p>Signing you in...</p>;
}
