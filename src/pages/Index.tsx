import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col justify-between bg-background">
      <div className="flex flex-col items-center justify-center flex-1">
        <Button
          className="mb-4 w-60 text-lg py-6 bg-primary text-primary-foreground hover:bg-primary/80"
          onClick={() => navigate("/wiki")}
        >
          База знаний
        </Button>
      </div>
      <div className="flex flex-col items-center mb-10">
        <Button
          className="w-60 text-lg py-6 bg-secondary text-secondary-foreground hover:bg-secondary/80"
          onClick={() => navigate("/files")}
        >
          Мои файлы
        </Button>
      </div>
    </div>
  );
};

export default Index;