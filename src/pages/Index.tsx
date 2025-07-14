import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#272727] text-[#ccc] flex flex-col justify-between">
      <div className="flex flex-col items-center justify-center flex-1">
        <Button
          className="mb-4 w-60 text-lg py-6 bg-[#262626] border border-[#313131] text-[#ccc] hover:bg-[#313131] shadow-lg"
          onClick={() => navigate("/wiki")}
        >
          База знаний
        </Button>
      </div>
      <div className="flex flex-col items-center mb-10">
        <Button
          className="w-60 text-lg py-6 bg-[#1f1f1f] border border-[#313131] text-[#ccc] hover:bg-[#313131] shadow-lg"
          onClick={() => navigate("/files")}
        >
          Мои файлы
        </Button>
      </div>
    </div>
  );
};

export default Index;