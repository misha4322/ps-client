import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setSelectedComponents } from "../../features/componentsSlice";
import { addToBasket, syncBasketWithServer } from "../../features/basketSlice";
import { addFavoriteAsync, removeFavoriteAsync } from "../../features/userSlice";
import s from "./Home.module.css";
import { Heart as HeartIcon } from "react-feather";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import { Autoplay, Pagination, Navigation } from "swiper/modules";

import { API_ENDPOINTS } from '../../api/config';

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

export const Home = () => {
  const [builds, setBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.user.user);
  const token = useSelector((state) => state.user.token);
  const favorites = useSelector((state) => state.user.favorites || []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const buildsRes = await fetch(API_ENDPOINTS.BUILDS + '?predefined=true');
        
        if (!buildsRes.ok) {
          throw new Error(`HTTP error! status: ${buildsRes.status}`);
        }
        
        const buildsData = await buildsRes.json();
        setBuilds(buildsData);
        setLoading(false);
      } catch (err) {
        console.error("Fetch builds error:", err);
        setError("Не удалось загрузить данные: " + err.message);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleBuy = async (build) => {
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      dispatch(addToBasket({
        build_id: build.id,
        name: build.name,
        img: build.image_url,
        total_price: Math.round(build.total_price),
        quantity: 1
      }));

      await dispatch(syncBasketWithServer()).unwrap();
      navigate("/basket");
    } catch (err) {
      console.error("Ошибка при добавлении в корзину:", err);
      alert("Ошибка: " + err.message);
    }
  };

  const handleEdit = (build) => {
    const config = {};
    build.components.forEach(comp => {
      config[comp.category] = comp;
    });
    dispatch(setSelectedComponents(config));
    navigate("/gather");
  };

  const handleAddFavorite = async (build) => {
    if (!user) return navigate("/login");

    const isFavorite = favorites.some(fav => fav.id === build.id);
    
    try {
      if (isFavorite) {
        await dispatch(removeFavoriteAsync(build.id)).unwrap();
        alert(`Сборка "${build.name}" удалена из избранного!`);
      } else {
        await dispatch(addFavoriteAsync(build)).unwrap();
        alert(`Сборка "${build.name}" добавлена в избранное!`);
      }
    } catch (err) {
      console.error("Ошибка при работе с избранным:", err);
      alert("Ошибка: " + err.message);
    }
  };

  const renderComponents = (build) => (
    <ul className={s.compList}>
      {build.components.map(comp => (
        <li key={comp.id} className={s.componentItem}>
          <span className={s.span}>
            {categoryLabels[comp.category]}: {comp.name}
          </span>
          <div className={s.line} />
        </li>
      ))}
    </ul>
  );

  if (loading) return <p className={s.status}>Загрузка...</p>;
  if (error) return <p className={s.statusError}>{error}</p>;

  return (
    <div className={s.container}>
      <h2 className={s.title}>Готовые сборки</h2>
      <div className={s.sliderContainer}>
        <Swiper
          slidesPerView={1}
          spaceBetween={30}
          loop={true}
          autoplay={{
            delay: 2500,
            disableOnInteraction: false,
          }}
          navigation={true}
          modules={[Autoplay, Pagination, Navigation]}
          className={s.mySwiper}
        >
          {builds.slice(0, 3).map((b, i) => (
            <SwiperSlide key={i} className={s.slide}>
              <div className={s.containerSlide}>
                <div className={s.textSlide}>
                  <span>{b.name}</span>
                  <button 
                    onClick={() => handleBuy(b)} 
                    className={s.btnSlide}
                  >
                    Купить ПК
                  </button>
                </div>
                <img 
                  src={`/build_images/${b.image_url}`} 
                  alt={b.name} 
                  className={s.imgSlide} 
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <h2 className={s.priceCategoryh2}>Ценовые категории</h2>
      <div className={s.priceRange}>
        {builds.map((build, index) => { 
          const isFavorite = favorites.some(fav => fav.id === build.id);
          
          return (      
            <div key={index} className={s.priceCategoryItem}>
              <div className={s.div_opozone}>
                <p className={s.valuable_h4}>{build.name}</p>
                <img 
                  src={`/build_images/${build.image_url}`} 
                  alt={build.name} 
                  className={s.buildImage} 
                />
                {renderComponents(build)}
                <div className={s.div_knopka}>
                  <div className={s.btnBuy}>
                    <button 
                      onClick={() => handleBuy(build)} 
                      className={s.buyButton_categories}
                    >
                      Купить
                    </button>
                    <button 
                      onClick={() => handleEdit(build)} 
                      className={s.editButton}
                    >
                      Изменить
                    </button>
                    <button 
                      onClick={() => handleAddFavorite(build)} 
                      className={`${s.favoriteButton} ${isFavorite ? s.activeFavorite : ''}`}
                    >
                      {isFavorite ? 'В избранном' : 'В избранное'}
                    </button>
                  </div>
                  <div className={s.totalPrice}>{Math.round(build.total_price)}₽</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};