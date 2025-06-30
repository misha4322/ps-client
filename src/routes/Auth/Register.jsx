import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setUser } from "../../features/userSlice";
import { useLocation, useNavigate, Link } from "react-router-dom";
import s from "./Auth.module.css";

export default function Register() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [errorMessage, setErrorMessage] = useState(""); 
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { token, isInitialized } = useSelector((s) => s.user);

  useEffect(() => {
    if (isInitialized && token) {
      navigate("/profile", { replace: true });
    }
  }, [isInitialized, token, navigate]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(""); 
    
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        setErrorMessage(errorData.message || "Ошибка регистрации");
        return;
      }
      
      const data = await res.json();
      dispatch(setUser(data));
      navigate("/profile", { replace: true });
    } catch (err) {
      console.error("Full registration error:", err);
      setErrorMessage("Ошибка сети: " + err.message);
    }
  };

  return (
    <div className={s.authContainer}>
      <form onSubmit={handleSubmit} className={s.authForm}>
        <h2>Регистрация</h2>
        
        {errorMessage && <div className={s.error}>{errorMessage}</div>}
        
        <input
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Email"
          required
          type="email"
        />
        <input
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Пароль (мин. 8 символов)"
          required
          minLength={8}
        />
        <button type="submit">Зарегистрироваться</button>
      </form>
      <p>
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>
      <p>
        <Link to="/">Вернуться на главную</Link>
      </p>
    </div>
  );
}