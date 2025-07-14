import { useAuth } from "@/utils/use-auth";
import { useFiles } from "@/utils/use-files";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";

const FilesPage = () => {
  const { telegramUsername, photoUrl } = useAuth();
  const { files, toggleStatus, deleteFile, isLoading, error } = useFiles();
  const navigate = useNavigate();
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; fileName: string | null }>({ open: false, fileName: null });

  if (!telegramUsername) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#272727] text-[#ccc]">
        <div className="mb-4 text-lg">Вы должны быть авторизованы через Telegram для доступа к вашим данным.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#272727] text-[#ccc] flex flex-col">
      {/* Верхняя панель с кнопкой назад, аватаром и заголовком */}
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
        <Avatar>
          {photoUrl ? (
            <AvatarImage src={photoUrl} alt="avatar" />
          ) : (
            <AvatarFallback>{telegramUsername[0]?.toUpperCase() || "U"}</AvatarFallback>
          )}
        </Avatar>
        <h1 className="text-2xl font-bold tracking-tight">Моя коллекция</h1>
      </div>
      {/* Карточка коллекции */}
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-[#262626] rounded-xl shadow-lg p-8 border border-[#313131] w-full max-w-4xl">
          {error && (
            <div className="mb-4 text-red-400">{error}</div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">№</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.name}>
                    <TableCell className="font-mono text-sm text-[#bbb]">
                      {file.displayId}
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={!!file.active}
                        onCheckedChange={async (checked) => {
                          await toggleStatus(file.name, !!checked);
                          toast.success("Статус обновлён!");
                        }}
                        aria-label={file.active ? "Деактивировать" : "Активировать"}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{file.name}</TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteModal({ open: true, fileName: file.name })}
                      >
                        Удалить
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {files.length === 0 && (
              <div className="p-6 text-center text-[#bbb]">Нет данных.</div>
            )}
          </div>
        </div>
      </div>
      {/* Модальное окно подтверждения удаления */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#262626] rounded-lg p-6 shadow-lg w-full max-w-xs flex flex-col items-center border border-[#313131]">
            <div className="mb-4 text-lg">Удалить файл <span className="font-bold">{deleteModal.fileName}</span>?</div>
            <div className="flex gap-4">
              <Button
                variant="destructive"
                onClick={async () => {
                  if (deleteModal.fileName) {
                    await deleteFile(deleteModal.fileName);
                    toast.success("Строка удалена!");
                  }
                  setDeleteModal({ open: false, fileName: null });
                }}
              >
                Да, удалить
              </Button>
              <Button
                variant="secondary"
                onClick={() => setDeleteModal({ open: false, fileName: null })}
              >
                Отмена
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilesPage;