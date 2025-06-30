import { useRouteError } from "react-router-dom";
import s from "./ErrorPage.module.css";

export const ErrorPage = () => {
    const error = useRouteError();
    console.error(error);

    return (
        <div className={s.container}>
            <div className={s.stars}></div>
            <div className={s.content}>
                <div className={s.glitch_container}>
                    <h1 className={s.glitch} data-text="404">404</h1>
                    <h2 className={s.subtitle}>Не мы такие - жизнь такая</h2>
                </div>
                
                <div className={s.error_info}>
                    <p className={s.error_message}>
                        {error.statusText || "Неизвестная ошибка"}
                    </p>
                    <p className={s.error_message}>
                        {error.data || "Страница не найдена или недоступна"}
                    </p>
                </div>
                
                <a href="/" className={s.home_button}>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    На главную
                </a>
            </div>
        </div>
    )
};