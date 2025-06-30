import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { 
  updateQuantity, 
  removeFromBasket, 
  clearBasket,
  syncBasketWithServer 
} from "../../features/basketSlice";
import { IMaskInput } from "react-imask";
import s from "./ProductBasket.module.css";

const categoryLabels = {
  processor: "Процессор",
  video_card: "Видеокарта",
  memory: "Оперативная память",
  storage: "SSD/Жесткий диск",
  case: "Корпус",
  power_supply: "Блок питания",
  cooling: "Охлаждение",
  motherboard: "Материнская плата",
};

export const ProductBasket = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const basketItems = useSelector(state => state.basket.items);
  const user = useSelector(state => state.user.user);
  const token = useSelector(state => state.user.token);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderInfo, setOrderInfo] = useState({ 
    id: null, 
    phone: "", 
    total: 0, 
    status: "" 
  });
  const [error, setError] = useState(null);
  const [buildComponents, setBuildComponents] = useState({});
  const [loadingComponents, setLoadingComponents] = useState({});

  useEffect(() => {
    if (token) {
      dispatch(syncBasketWithServer())
        .unwrap()
        .catch(err => {
          console.error("Ошибка синхронизации корзины:", err);
          setError("Не удалось синхронизировать корзину. Попробуйте позже.");
        });
    }
  }, [dispatch, token]);

  useEffect(() => {
    const loadComponents = async () => {
      const componentsMap = {};
      const loadingMap = {};
      
      for (const item of basketItems) {
        if (!buildComponents[item.build_id]) {
          loadingMap[item.build_id] = true;
          try {
            const res = await fetch(`/api/builds/${item.build_id}/components`);
            if (!res.ok) throw new Error('Ошибка загрузки компонентов');
            const data = await res.json();
            componentsMap[item.build_id] = data;
          } catch (error) {
            console.error(`Ошибка загрузки компонентов для сборки ${item.build_id}:`, error);
            componentsMap[item.build_id] = [];
          }
          loadingMap[item.build_id] = false;
        }
      }
      
      setBuildComponents(prev => ({ ...prev, ...componentsMap }));
      setLoadingComponents(prev => ({ ...prev, ...loadingMap }));
    };
    
    if (basketItems.length > 0) {
      loadComponents();
    }
  }, [basketItems]);

  const totalPrice = basketItems.reduce(
    (sum, item) => sum + item.total_price * item.quantity, 
    0
  );

  const handleOrder = async () => {
    if (phoneNumber.replace(/\D/g, "").length !== 11) {
      alert("Введите корректный номер телефона (11 цифр)");
      return;
    }

    try {
      const requestBody = {
        phone: phoneNumber,
        items: basketItems.map(item => ({
          build_id: item.build_id,
          quantity: item.quantity,
          unit_price: item.total_price
        })),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (res.ok) {
        const order = await res.json();
        setOrderInfo({
          id: order.id,
          phone: phoneNumber,
          total: totalPrice,
          status: 'pending'
        });
        
        setOrderSuccess(true);
        dispatch(clearBasket());
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || "Ошибка оформления заказа");
      }
    } catch (err) {
      setError("Ошибка при оформлении заказа: " + err.message);
    }
  };

  const handleQuantityChange = (build_id, change) => {
    dispatch(updateQuantity({ build_id, change }));
  };

  return (
    <div className={s.basketContainer}>
      {!orderSuccess ? (
        <div className={s.div_basket}>
          <h2 className={s.basketTitle}>
            Корзина {user && `(${user.email})`}
          </h2>
          
          {basketItems.length === 0 ? (
            <p className={s.emptyBasket}>Корзина пуста</p>
          ) : (
            <div className={s.basketItems}>
              {basketItems.map((item) => (
                <div key={item.build_id} className={s.basketItem}>
                  <div className={s.itemInfo}>
                    <h4 className={s.itemName}>{item.name}</h4>
                    <div className={s.itemContent}>
                      <div className={s.imageWrapper}>
                        <img 
                          src={`/build_images/${item.img}`} 
                          alt={item.name} 
                          className={s.buildImage} 
                        />
                      </div>
                      
                      <div className={s.itemDetails}>
                        <p className={s.priceInfo}>Цена: {item.total_price} ₽ × {item.quantity}</p>
                        
                        <div className={s.componentsContainer}>
                          <h5>Комплектующие:</h5>
                          
                          {loadingComponents[item.build_id] ? (
                            <p className={s.loading}>Загрузка компонентов...</p>
                          ) : buildComponents[item.build_id]?.length > 0 ? (
                            <ul className={s.componentsList}>
                              {buildComponents[item.build_id].map(component => (
                                <li key={component.id} className={s.componentItem}>
                                  <span className={s.componentName}>
                                    {categoryLabels[component.category] || component.category}:
                                  </span>
                                  <span className={s.componentDetails}>
                                    {component.name} ({Math.round(component.price)} ₽)
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className={s.noComponents}>Информация о комплектующих недоступна</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className={s.itemActions}>
                    <div className={s.quantityControls}>
                      <button 
                        onClick={() => handleQuantityChange(item.build_id, -1)}
                        className={`${s.quantityButton} ${s.animateButton}`}
                        disabled={item.quantity <= 1}
                      >
                        -
                      </button>
                      <span className={s.quantity}>{item.quantity}</span>
                      <button 
                        onClick={() => handleQuantityChange(item.build_id, 1)}
                        className={`${s.quantityButton} ${s.animateButton}`}
                      >
                        +
                      </button>
                    </div>
                    <button 
                      onClick={() => dispatch(removeFromBasket(item.build_id))}
                      className={`${s.removeButton} ${s.animateButton}`}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={s.summary}>
            <h3 className={s.total}>Итого: {totalPrice} ₽</h3>
            
            <div className={s.orderSection}>
              <IMaskInput
                className={s.phoneInput}
                mask={"+7 (000) 000-00-00"}
                placeholder="+7 (___) ___-__-__"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              
              <div className={s.actionButtons}>
                <button
                  onClick={handleOrder}
                  className={`${s.orderButton} ${s.animateButton}`}
                  disabled={basketItems.length === 0}
                >
                  Оформить заказ
                </button>
                <button
                  onClick={() => dispatch(clearBasket())}
                  className={`${s.clearButton} ${s.animateButton}`}
                >
                  Очистить корзину
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={s.orderSuccess}>
          <h2>Заказ оформлен!</h2>
          <p>Номер заказа: #{orderInfo.id}</p>
          <p>Телефон: {orderInfo.phone}</p>
          <p>Сумма: {orderInfo.total} ₽</p>
          <p>Статус: {orderInfo.status === 'pending' ? 'Ожидает подтверждения' : 'В обработке'}</p>
          
          <div className={s.successButtons}>
            <button 
              onClick={() => navigate("/profile#orders")} 
              className={`${s.continueButton} ${s.animateButton}`}
            >
              Перейти к заказам
            </button>
            
            <button 
              onClick={() => navigate("/")} 
              className={`${s.continueButton} ${s.animateButton}`}
            >
              Вернуться на главную
            </button>
          </div>
        </div>
      )}
    </div>
  );
};