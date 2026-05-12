import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/global.css";
import App from "./App";
import { DBProvider }     from "./context/DBContext";
import { AuthProvider }   from "./context/AuthContext";
import { SchoolProvider } from "./context/SchoolContext";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <DBProvider>
      <AuthProvider>
        <SchoolProvider>
          <App />
        </SchoolProvider>
      </AuthProvider>
    </DBProvider>
  </React.StrictMode>
);
