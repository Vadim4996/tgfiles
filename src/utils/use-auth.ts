import { createContext, useContext } from "react";

// Типы для Telegram WebApp API
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: {
          user?: {
            id: number;
            username?: string;
            first_name?: string;
            last_name?: string;
            photo_url?: string; // Added photo_url
          };
        };
        initData?: string;
        ready?: () => void;
        expand?: () => void;
        close?: () => void;
      };
    };
  }
}

// Функция для очистки username от символа "@"
function cleanUsername(username: string): string {
  return username.startsWith('@') ? username.slice(1) : username;
    }

export function useAuth() {
  let telegramUsername: string | null = null;
  let photoUrl: string | null = null;
  
  // Проверяем Telegram WebApp API
  if (typeof window !== "undefined" && window.Telegram?.WebApp) {
    const webApp = window.Telegram.WebApp;
    
    // Логируем для отладки
    console.log("Telegram WebApp доступен:", {
      initDataUnsafe: webApp.initDataUnsafe,
      initData: webApp.initData,
      user: webApp.initDataUnsafe?.user
    });
    
    // Пытаемся получить username и photo_url из разных источников
    if (webApp.initDataUnsafe?.user?.username) {
      telegramUsername = cleanUsername(webApp.initDataUnsafe.user.username);
      photoUrl = webApp.initDataUnsafe.user.photo_url || null;
      console.log("Username и photo_url получены из Telegram WebApp:", telegramUsername, photoUrl);
    } else if (webApp.initData) {
      // Пытаемся парсить initData для получения username и photo_url
      try {
        const urlParams = new URLSearchParams(webApp.initData);
        const userStr = urlParams.get('user');
        if (userStr) {
          const user = JSON.parse(decodeURIComponent(userStr));
          if (user.username) {
            telegramUsername = cleanUsername(user.username);
          }
          if (user.photo_url) {
            photoUrl = user.photo_url;
          }
          console.log("Username и photo_url получены из initData:", telegramUsername, photoUrl);
        }
      } catch (e) {
        console.log("Ошибка парсинга initData:", e);
      }
    }
    
    // Вызываем ready() если доступно
    if (webApp.ready) {
      webApp.ready();
    }
  }
  
  // Если не удалось получить из Telegram, используем localStorage или prompt
  if (!telegramUsername) {
    const storedUsername = localStorage.getItem("telegramUsername");
    telegramUsername = storedUsername ? cleanUsername(storedUsername) : null;
    if (!telegramUsername) {
      const testUsername = window.prompt("Введите username для тестирования:", "");
      if (testUsername && testUsername.trim()) {
        const cleanTestUsername = cleanUsername(testUsername.trim());
        localStorage.setItem("telegramUsername", cleanTestUsername);
        telegramUsername = cleanTestUsername;
      }
    }
  }
  
  return { telegramUsername, photoUrl };
}