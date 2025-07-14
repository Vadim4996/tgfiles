import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#272727] text-[#ccc] flex flex-col">
      {/* Верхняя панель с кнопкой назад и заголовком */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-[#454545] bg-[#1f1f1f]">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-[#313131]"
          onClick={() => navigate(-1)}
          aria-label="Назад"
        >
          <ArrowLeft size={24} />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Ошибка 404</h1>
      </div>
      {/* Карточка 404 */}
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-[#262626] rounded-xl shadow-lg p-10 border border-[#313131] max-w-lg w-full text-center">
          <div className="text-4xl font-bold mb-4">404</div>
          <div className="text-xl mb-4">Страница не найдена</div>
          <Button
            className="mt-2 bg-[#1f1f1f] border border-[#313131] text-[#ccc] hover:bg-[#313131] shadow-lg"
            onClick={() => navigate("/")}
          >
            На главную
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
