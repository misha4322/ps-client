import React, { useEffect, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { addToBasket, syncBasketWithServer } from '../../features/basketSlice';
import { setSelectedComponents } from "../../features/componentsSlice";
import { addFavoriteAsync, removeFavoriteAsync } from "../../features/userSlice";
import proc from "../../assets/proc.svg";
import vidokarta from "../../assets/Videokarta.svg";
import OZY from "../../assets/OZY.svg";
import matplata from "../../assets/Matplata.svg";
import tower from "../../assets/tower.svg";
import BP from "../../assets/BP.svg";
import hard from "../../assets/harddisk 1.svg";
import cooler from "../../assets/cooler 1.svg";
import s from "./ConfCompute.module.css";
import { Heart } from "react-feather";

const sectionIcons = {
  processor: proc,
  motherboard: matplata,
  memory: OZY,
  cooling: cooler,
  video_card: vidokarta,
  power_supply: BP,
  storage: hard,
  case: tower,
};

const categoryLabels = {
  processor: "Процессор",
  motherboard: "Материнская плата",
  memory: "Оперативная память",
  cooling: "Охлаждение",
  video_card: "Видеокарта",
  power_supply: "Блок питания",
  storage: "SSD/Жесткий диск",
  case: "Корпус",
};

const categoryOrder = [
  'processor',
  'motherboard',
  'memory',
  'cooling',
  'video_card',
  'power_supply',
  'storage',
  'case'
];

const formatPrice = (price) => {
  if (typeof price !== 'number') return '0 ₽';
  return `${Math.round(price)} ₽`;
};

export const ConfComputer = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const selectedComponents = useSelector(state => state.components.selectedComponents);
  const user = useSelector(state => state.user.user);
  const token = useSelector(state => state.user.token);
  const favorites = useSelector(state => state.user.favorites || []);
  const [productsByCategory, setProductsByCategory] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState(categoryOrder[0]);
  const categoryRefs = useRef({});

  useEffect(() => {
    fetch("/api/components")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((grouped) => {
        const roundedGroups = {};
        Object.keys(grouped).forEach(category => {
          roundedGroups[category] = grouped[category].map(item => ({
            ...item,
            price: Math.round(item.price)
          }));
        });
        setProductsByCategory(roundedGroups);
        setLoading(false);
      })
      .catch(() => {
        setError("Не удалось загрузить комплектующие");
        setLoading(false);
      });
  }, []);

  const configKey = (components) => {
    if (!components) return '';
    const ids = Object.values(components).map(c => c.id).sort().join(',');
    return ids;
  };

  const selectedKey = configKey(selectedComponents);
  const favoriteItem = Array.isArray(favorites) ? favorites.find(fav => {
    const favKey = fav.components ? fav.components.map(c => c.id).sort().join(',') : '';
    return favKey === selectedKey;
  }) : null;

  const handleToggleFavorite = async () => {
    if (!token) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }

    if (!isComplete()) {
      alert("Выберите все комплектующие!");
      return;
    }

    try {
      if (favoriteItem) {
        await dispatch(removeFavoriteAsync(favoriteItem.id)).unwrap();
        alert("Сборка удалена из избранного!");
      } else {
        const totalPrice = calculateTotalPrice();
        const buildName = `Моя сборка от ${new Date().toLocaleDateString()}`;
        const componentIds = Object.values(selectedComponents).map(c => c.id);

        const buildRes = await fetch('/api/builds', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: buildName,
            total_price: Math.round(totalPrice),
            components: componentIds,
            is_predefined: false
          }),
        });

        if (!buildRes.ok) {
          const errorData = await buildRes.json();
          throw new Error(errorData.message || 'Ошибка создания сборки');
        }

        const build = await buildRes.json();
        await dispatch(addFavoriteAsync(build)).unwrap();
        alert("Сборка добавлена в избранное!");
      }
    } catch (err) {
      console.error("Ошибка при работе с избранным:", err);
      alert("Ошибка: " + err.message);
    }
  };

  const scrollToCategory = (category) => {
    setActiveCategory(category);
    categoryRefs.current[category]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };

  useEffect(() => {
    if (activeCategory && categoryRefs.current[activeCategory]) {
      categoryRefs.current[activeCategory].scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, [activeCategory]);

  const filterMotherboards = (items) => {
    const cpu = selectedComponents.processor;
    if (!cpu?.socket) return items;
    return items.filter((mb) => mb.socket === cpu.socket);
  };

  const isComplete = () =>
    categoryOrder.every(
      (cat) => selectedComponents[cat]?.id
    );

  const handleSelect = (category, item) => {
    dispatch(
      setSelectedComponents({
        ...selectedComponents,
        [category]: {
          ...item,
          price: Math.round(item.price)
        },
      })
    );

    const currentIndex = categoryOrder.indexOf(category);
    if (currentIndex < categoryOrder.length - 1) {
      setTimeout(() => {
        scrollToCategory(categoryOrder[currentIndex + 1]);
      }, 300);
    }
  };

  const handleAddToBasket = async () => {
    if (!isComplete()) {
      alert("Пожалуйста, выберите все комплектующие!");
      return;
    }

    const totalPrice = calculateTotalPrice();
    const buildName = `Сборка от ${new Date().toLocaleDateString()}`;

    try {
      const res = await fetch('/api/builds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: buildName,
          total_price: Math.round(totalPrice),
          components: Object.values(selectedComponents).map(c => c.id),
          is_predefined: false
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Ошибка создания сборки');
      }

      const build = await res.json();
      
      dispatch(addToBasket({
        build_id: build.id,
        name: build.name,
        img: build.image_url || 'default_build.jpg',
        total_price: Math.round(build.total_price),
        quantity: 1
      }));

      if (token) {
        await dispatch(syncBasketWithServer()).unwrap();
      }

      navigate("/basket");
      alert("Сборка добавлена в корзину!");
    } catch (err) {
      console.error("Ошибка при добавлении в корзину:", err);
      alert("Ошибка: " + err.message);
    }
  };

  const calculateTotalPrice = () =>
    Object.values(selectedComponents).reduce(
      (sum, it) => sum + (it?.price || 0),
      0
    );

  if (loading) return <p className={s.errorMessage}>Загрузка комплектующих…</p>;
  if (error) return <p className={s.errorMessage}>{error}</p>;

  return (
    <div className={s.conf_div}>
      <div className={s.categoryNav}>
        {categoryOrder.map(category => (
          <button
            key={category}
            className={`${s.navButton} ${activeCategory === category ? s.active : ''}`}
            onClick={() => scrollToCategory(category)}
          >
            <img src={sectionIcons[category]} alt={categoryLabels[category]} />
            <span>{categoryLabels[category]}</span>
          </button>
        ))}
      </div>

      {categoryOrder.map((category) => {
        if (!productsByCategory[category]) return null;

        const items =
          category === "motherboard"
            ? filterMotherboards(productsByCategory[category])
            : productsByCategory[category];

        return (
          <div
            key={category}
            className={s.proc}
            ref={el => categoryRefs.current[category] = el}
          >
            <div className={s.div_konfi}>
              <img src={sectionIcons[category]} alt="" />
              <h2>{categoryLabels[category]}</h2>
            </div>

            {items.map((item) => (
              <label key={item.id} className={s.itemLabel}>
                <div className={s.div_konfigurati}>
                  <input
                    type="radio"
                    name={category}
                    checked={selectedComponents[category]?.id === item.id}
                    onChange={() => handleSelect(category, item)}
                  />
                  <span className={s.itemText}>{item.name}</span>
                </div>
                <span className={s.price_konf}>{formatPrice(item.price)}</span>
              </label>
            ))}
          </div>
        );
      })}

      {!isComplete() && (
        <p className={s.selectionWarning}>
          У вас не все комплектующие выбраны для сборки.
        </p>
      )}

      <div className={s.selectedComponents}>
        <h3 className={s.h3_set}>Выбранные комплектующие:</h3>
        {categoryOrder.map((key) => (
          selectedComponents[key] && (
            <div key={key} className={s.pricediv}>
              <span className={s.price2_2}>
                {categoryLabels[key]}: {selectedComponents[key].name} – {formatPrice(selectedComponents[key].price)}
              </span>
            </div>
          )
        ))}
      </div>

      <div className={s.totalPrice}>
        <p className={s.price_itog}>
          Итоговая цена: {formatPrice(calculateTotalPrice())}
        </p>
        <div className={s.buttonsContainer}>
          <button
            onClick={handleToggleFavorite}
            className={favoriteItem ? s.activeHeart : s.inactiveHeart}
          >
            <Heart size={24} />
            {favoriteItem ? "В избранном" : "В избранное"}
          </button>
          <button
            onClick={handleAddToBasket}
            className={s.basket}
            disabled={!isComplete()}
          >
            В корзину
          </button>
        </div>
      </div>
    </div>
  );
};