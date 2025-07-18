import React from "react";
import { createHashRouter, redirect, RouterProvider } from "react-router-dom";
import { Provider, useDispatch, useSelector } from "react-redux";
import store from "./app/store";
import { initializeUser } from "./features/userSlice";

import { Root } from "./routes/Root/Root";
import { ErrorPage } from "./routes/ErorPage/ErrorPage";
import { Home } from "./routes/Home/Home";
import { ConfComputer } from "./routes/ConfComputer/CofComputer";
import { ProductBasket } from "./routes/ProductBasket/ProductBasket";
import Login from "./routes/Auth/Login";
import Register from "./routes/Auth/Register";
import Profile from "./routes/Profile/Profile";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Navigate } from "react-router-dom";

const router = createHashRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Home /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      {
        path: "gather",
        element: (
          <ProtectedRoute>
            <ConfComputer />
          </ProtectedRoute>
        ),
      },
      {
        path: "basket",
        element: (
          <ProtectedRoute>
            <ProductBasket />
          </ProtectedRoute>
        ),
      },
      {
        path: "profile",
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

const AppInitializer = () => {
  const dispatch = useDispatch();
  const { token, isInitialized } = useSelector(s => s.user);
  // const navigate = useNavigate();
  
  React.useEffect(() => {
    dispatch(initializeUser());
  }, [dispatch]);

  React.useEffect(() => {
    if (isInitialized && !token) {
      redirect("/login");
    }
  }, [isInitialized, token, redirect]);

  return <RouterProvider router={router} />;
};

function AppWrapper() {
  return (
    <Provider store={store}>
      <AppInitializer />
    </Provider>
  );
}

export default AppWrapper;