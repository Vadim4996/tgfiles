import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const WikiPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#272727] text-[#ccc] flex flex-col">
      {/* Верхняя панель с кнопкой назад и заголовком */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-[#454545] bg-[#1f1f1f]">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-[#313131]"
          onClick={() => navigate("/")}
          aria-label="Назад"
        >
          <ArrowLeft size={24} />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">База знаний</h1>
      </div>
      {/* Контент-заглушка */}
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-[#262626] rounded-xl shadow-lg p-10 border border-[#313131] max-w-lg w-full text-center">
          <div className="text-xl mb-2 font-semibold">Здесь будет ваша база знаний</div>
          <div className="text-[#bbb]">В будущем здесь появится wiki-сервис в стиле Trilium Notes: дерево заметок, быстрый поиск, редактор и многое другое.</div>
        </div>
      </div>
    </div>
  );
};

export default WikiPage; 