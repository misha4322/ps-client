import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setUser } from "../../features/userSlice";
import { useLocation, useNavigate, Link } from "react-router-dom";
import s from "./Auth.module.css";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { token, isInitialized } = useSelector((s) => s.user);

  useEffect(() => {
    if (isInitialized && token) {
      navigate("/profile", { replace: true });
    }
  }, [isInitialized, token, navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(null); // Сбрасываем ошибку при изменении поля
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      
      if (res.ok) {
        const data = await res.json();
        dispatch(setUser(data));
        navigate("/profile", { replace: true });
      } else {
        const errorData = await res.json();
        
        if (res.status === 401) {
          if (errorData.message === "Invalid password") {
            setError("Неверный пароль");
          } else if (errorData.message === "User not found") {
            setError("Аккаунта с такой почтой не существует");
          } else {
            setError("Ошибка авторизации");
          }
        } else {
          setError(errorData.message || "Произошла ошибка");
        }
      }
    } catch (err) {
      console.error("Network error:", err);
      setError("Ошибка сети: " + err.message);
    }
  };

  return (
    <div className={s.authContainer}>
      <form onSubmit={handleSubmit} className={s.authForm}>
        <h2>Вход</h2>
        {error && <div className={s.errorMessage}>{error}</div>}
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
          placeholder="Пароль"
          required
          minLength={8}
        />
        <button type="submit">Войти</button>
      </form>
      <p>
        Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
      </p>
      <p>
        <Link to="/">Вернуться на главную</Link>
      </p>
    </div>
  );
}