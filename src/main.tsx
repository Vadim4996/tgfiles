import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";

// Включаем глобальную тёмную тему
if (typeof document !== "undefined") {
  document.documentElement.classList.add("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
