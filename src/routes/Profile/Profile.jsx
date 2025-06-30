import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout, setFavorites } from "../../features/userSlice";
import { removeFavoriteAsync } from "../../features/userSlice";
import { addToBasket, syncBasketWithServer } from "../../features/basketSlice";
import { setSelectedComponents } from "../../features/componentsSlice";
import { Trash2, Clock, CheckCircle, Archive } from "react-feather";
import s from "./Profile.module.css";

const categoryLabels = {
  processor: "Процессор",
  video_card: "Видеокарта",
  memory: "Оперативная память",
  storage: "Жесткий диск",
  case: "Корпус",
  power_supply: "Блок питания",
  cooling: "Охлаждение",
  motherboard: "Материнская плата",
};

// Статусы заказов с переводами
const orderStatuses = {
  pending: { text: "Ожидает обработки", icon: <Clock size={16} />, className: s.statusPending },
  preparing: { text: "Готовится", icon: <Clock size={16} />, className: s.statusPreparing },
  ready: { text: "Готов к выдаче", icon: <CheckCircle size={16} />, className: s.statusReady },
  completed: { text: "Завершен", icon: <Archive size={16} />, className: s.statusCompleted },
  cancelled: { text: "Отменен", icon: <Archive size={16} />, className: s.statusCancelled },
};

export default function Profile() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.user.user);
  const token = useSelector((s) => s.user.token);
  const favorites = useSelector((s) => s.user.favorites);
  const [activeTab, setActiveTab] = useState("favorites");

  const [orders, setOrders] = useState([]);
  const [timers, setTimers] = useState({});
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [userOrderCount, setUserOrderCount] = useState(0);

  useEffect(() => {
    if (activeTab === "favorites" && token) {
      fetch('/api/favorites', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Ошибка загрузки избранного');
          return res.json();
        })
        .then((data) => dispatch(setFavorites(data)))
        .catch((err) => {
          console.error("Ошибка загрузки избранного:", err);
          alert("Не удалось загрузить избранное");
        });
    }
  }, [activeTab, token, dispatch]);

  useEffect(() => {
    if (token && activeTab === 'orders') {
      loadOrders();
    }
  }, [token, activeTab]);

  const loadOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const res = await fetch('/api/orders', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Orders load error response:", errorText);
        return;
      }

      const data = await res.json();
      setOrders(data);
      setUserOrderCount(data.length);

      // Инициализируем таймеры для заказов в статусе "preparing"
      const preparingOrders = data.filter(order => order.status === 'preparing');
      initializeTimers(preparingOrders);
    } catch (error) {
      console.error("Orders load error:", error);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const initializeTimers = (orders) => {
    const newTimers = {};

    orders.forEach(order => {
      const readyTime = new Date(order.created_at);
      readyTime.setMinutes(readyTime.getMinutes() + 30);

      newTimers[order.id] = {
        readyTime,
        remaining: calculateRemainingTime(readyTime)
      };
    });

    setTimers(newTimers);
  };

  const calculateRemainingTime = (readyTime) => {
    const now = new Date();
    const diff = readyTime - now;

    if (diff <= 0) return "00:00";

    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const timerInterval = setInterval(() => {
      const updatedTimers = { ...timers };
      let hasChanges = false;

      for (const orderId in updatedTimers) {
        if (updatedTimers[orderId].remaining !== "00:00") {
          updatedTimers[orderId].remaining = calculateRemainingTime(updatedTimers[orderId].readyTime);
          hasChanges = true;
        } else {
          // Если время вышло, обновляем статус заказа
          setOrders(prev => prev.map(order =>
            order.id === orderId ? { ...order, status: 'ready' } : order
          ));
          delete updatedTimers[orderId];
          hasChanges = true;
        }
      }

      if (hasChanges) {
        setTimers(updatedTimers);
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [timers]);

  const handleRemoveFavorite = async (id) => {
    try {
      await dispatch(removeFavoriteAsync(id)).unwrap();
    } catch (err) {
      console.error("Ошибка удаления избранного:", err);
      alert("Ошибка при удалении сборки");
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const handleBuyFavorite = async (fav) => {
    if (!token) {
      navigate("/login");
      return;
    }

    dispatch(addToBasket({
      build_id: fav.id,
      name: fav.name,
      img: fav.image_url,
      total_price: fav.total_price,
      quantity: 1
    }));

    try {
      await dispatch(syncBasketWithServer()).unwrap();
      navigate("/basket");
    } catch (err) {
      console.error("Ошибка синхронизации корзины:", err);
      alert("Ошибка при добавлении в корзину: " + err.message);
    }
  };

  const handleEditFavorite = (fav) => {
    const config = {};
    fav.components.forEach(comp => {
      config[comp.category] = comp;
    });
    dispatch(setSelectedComponents(config));
    navigate("/gather");
  };

  const markOrderCollected = async (orderId) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/complete`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (res.ok) {
        // Обновляем статус заказа локально
        setOrders(prev => prev.map(order =>
          order.id === orderId ? { ...order, status: 'completed' } : order
        ));
      }
    } catch (error) {
      console.error("Ошибка отметки заказа:", error);
    }
  };

  const renderOrders = () => {
    if (isLoadingOrders) {
      return <p className={s.loading}>Загрузка заказов...</p>;
    }

    if (orders.length === 0) {
      return <p className={s.noOrders}>У вас пока нет заказов</p>;
    }

    const sortedOrders = [...orders].sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    );

    return sortedOrders.map((order, index) => {
      const statusInfo = orderStatuses[order.status] ||
        { text: order.status, icon: null, className: s.statusDefault };

      const userOrderNumber = userOrderCount - index;

      return (
        <div key={order.id} className={`${s.orderItem} ${statusInfo.className}`}>
          <div className={s.orderHeader}>
            <h3>Заказ #{userOrderNumber}</h3>
            <div className={s.orderStatus}>
              <span>
                {statusInfo.icon}
                {statusInfo.text}
                {order.status === 'preparing' && timers[order.id] && (
                  <span className={s.timer}>
                    ({timers[order.id].remaining})
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className={s.orderDetails}>
            <div className={s.orderMeta}>
              <p><strong>Сумма:</strong> {order.total} ₽</p>
              <p><strong>Дата заказа:</strong> {new Date(order.created_at).toLocaleString()}</p>
              <p><strong>Телефон:</strong> {order.phone}</p>
            </div>

            <div className={s.orderItems}>
              <h4>Состав заказа:</h4>
              <ul>
                {order.items.map((item, index) => (
                  <li key={index}>
                    {item.name} × {item.quantity} - {item.unit_price * item.quantity} ₽
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {order.status === 'ready' && (
            <div className={s.orderActions}>
              <button
                onClick={() => markOrderCollected(order.id)}
                className={s.collectButton}
              >
                Заказ получен
              </button>
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className={s.container}>
      <div className={s.tabs}>
        <button
          className={`${s.tabButton} ${activeTab === "favorites" ? s.active : ""}`}
          onClick={() => setActiveTab("favorites")}
        >
          Избранное
        </button>
        <button
          className={`${s.tabButton} ${activeTab === "orders" ? s.active : ""}`}
          onClick={() => setActiveTab("orders")}
        >
          Заказы
        </button>

      </div>

      {activeTab === "favorites" && (
        <div className={s.favorites}>
          <h2>Избранное</h2>
          {favorites.length === 0 ? (
            <p>В избранном пока ничего нет</p>
          ) : (
            <div className={s.favoriteList}>
              {favorites.map((fav) => (
                <div key={fav.id} className={s.favoriteItem}>
                  <div className={s.favoriteHeader}>
                    <h3>{fav.name}</h3>
                    <div className={s.favoriteActions}>
                      <button
                        onClick={() => handleRemoveFavorite(fav.id)}
                        className={s.actionBtn}
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                  <img
                    src={`/build_images/${fav.image_url}`}
                    alt={fav.name}
                    className={s.favoriteImage}
                  />
                  <ul className={s.componentList}>
                    {fav.components.map(comp => (
                      comp && (
                        <li key={comp.id}>
                          <strong>{categoryLabels[comp.category] || comp.category}:</strong> {comp.name} ({comp.price} ₽)
                        </li>
                      )
                    ))}
                  </ul>
                  <p className={s.totalPrice}><strong>Итого:</strong> {fav.total_price} ₽</p>
                  <div className={s.favoriteButtons}>
                    <button
                      onClick={() => handleBuyFavorite(fav)}
                      className={s.buyBtn}
                    >
                      Купить
                    </button>
                    <button
                      onClick={() => handleEditFavorite(fav)}
                      className={s.editBtn}
                    >
                      Изменить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "orders" && (
        <div className={s.ordersSection}>
          <h2 className={s.sectionTitle}>Мои заказы</h2>
          <div className={s.ordersContainer}>
            {renderOrders()}
          </div>
        </div>
      )}
    </div>
  );
}