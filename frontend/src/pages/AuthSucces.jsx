import { useEffect, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function AuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      login(token);
      navigate("/homepage");
    } else {
      navigate("/login?error=oauth_failed");
    }
  }, []);

  return <p>Signing you in...</p>;
}
