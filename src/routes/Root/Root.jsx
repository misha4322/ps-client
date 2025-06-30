import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { logout, initializeUser } from "../../features/userSlice";
import { loadUserBasket } from "../../features/basketSlice";
import { useNavigate, Outlet, NavLink } from "react-router-dom";
import s from "./Root.module.css";
import { Heart, Menu, X } from "react-feather";
import trash from '../../assets/trash.svg';
import logo from '../../assets/logo.svg';

export const Root = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { user, token, isInitialized } = useSelector((state) => state.user);
const basketCount = useSelector(state => {
  
  if (!state.user.token) return 0;
  
  return state.basket.items.reduce(
    (sum, item) => sum + item.quantity, 
    0
  );
});

  useEffect(() => {
    dispatch(loadUserBasket());

    if (token) {
      dispatch(initializeUser());
    } else {
      dispatch({
        type: 'user/initialize/fulfilled', payload: {
          user: null,
          token: null,
          favorites: [],
          isInitialized: true
        }
      });
    }
  }, [dispatch, token]);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
    setIsMenuOpen(false);
  };

  const handleFavorites = () => {
    if (token) {
      navigate("/profile#favorites");
    } else {
      navigate("/login", { state: { from: "/profile#favorites" } });
    }
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  if (!isInitialized) {
    return (
      <div className={s.fullscreenLoader}>
        <div className={s.loader}>Загрузка...</div>
      </div>
    );
  }

  return (
    <>
      <header className={s.container}>
        <div className={s.headerContent}>
          <div className={s.logoContainer}>
            <NavLink to="/" onClick={() => setIsMenuOpen(false)}>
              <img src={logo} alt="logo" className={s.logo} />
            </NavLink>
          </div>

          <button className={s.menuToggle} onClick={toggleMenu}>
            {isMenuOpen ? <X size={32} /> : <Menu size={32} />}
          </button>
          <div className={s.navMain}>
            <NavLink
              to={'/'}
              className={s.navLink}
              onClick={() => setIsMenuOpen(false)}
            >
              Главная
            </NavLink>

            <NavLink
              to={'gather'}
              className={s.navLink}
              onClick={() => setIsMenuOpen(false)}
            >
              Конфигуратор
            </NavLink>
          </div>


          <nav className={`${s.nav} ${isMenuOpen ? s.navOpen : ''}`}>
            {/* Добавленные ссылки для мобильной версии */}
            <div className={s.mobileNav}>
              <NavLink 
                to="/" 
                className={s.mobileNavLink}
                onClick={() => setIsMenuOpen(false)}
              >
                Главная
              </NavLink>
              <NavLink 
                to="/gather" 
                className={s.mobileNavLink}
                onClick={() => setIsMenuOpen(false)}
              >
                Конфигуратор
              </NavLink>
            </div>

            <div className={s.navIcons}>
              <NavLink
                to={'basket'}
                className={s.iconLink}
                onClick={() => setIsMenuOpen(false)}
              >
                <div className={s.iconWrapper}>
                  <img src={trash} alt="Корзина" className={s.icon} />
                  {basketCount > 0 && (
                    <span className={s.basketCount}>{basketCount}</span>
                  )}
                </div>
              </NavLink>

            </div>

            <div className={s.authContainer}>
              {token ? (
                <>
                  <NavLink 
                    to="/profile" 
                    className={s.userEmailLink}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className={s.userEmail}>
                      {user?.email}
                    </span>
                  </NavLink>
                  <button onClick={handleLogout} className={s.logoutBtn}>Выйти</button>
                </>
              ) : (
                <>
                  <NavLink
                    to="/login"
                    className={s.authLink}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Вход
                  </NavLink>
                  <NavLink
                    to="/register"
                    className={s.authLink}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Регистрация
                  </NavLink>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      <Outlet />
    </>
  );
};