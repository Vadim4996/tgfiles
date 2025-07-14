import { useAuth } from "@/utils/use-auth";
import { useEffect, useState } from "react";

const Index = () => {
  const { telegramUsername } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    // Собираем отладочную информацию
    const info = {
      telegramWebApp: !!window.Telegram?.WebApp,
      initDataUnsafe: window.Telegram?.WebApp?.initDataUnsafe,
      initData: window.Telegram?.WebApp?.initData,
      userAgent: navigator.userAgent,
      url: window.location.href,
      localStorage: localStorage.getItem("telegramUsername")
    };
    setDebugInfo(info);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold mb-4">Telegram Mini App</h1>
        <p className="text-xl text-gray-600 mb-10">
          Откройте приложение через Telegram бота для автоматического получения username.
        </p>
        
        {telegramUsername ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-lg text-green-600">
                ✅ Username получен: <span className="font-bold">{telegramUsername}</span>
              </p>
          <a
            href="/files"
                className="inline-block mt-3 rounded bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 transition"
          >
                Перейти к коллекции
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-lg text-orange-600">
                ⚠️ Username не найден
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Откройте приложение через Telegram бота или введите username для тестирования
              </p>
            </div>
          </div>
        )}

        {/* Отладочная информация */}
        {debugInfo && (
          <div className="mt-8 text-left bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Отладочная информация:</h3>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;