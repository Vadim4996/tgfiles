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
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="mb-4 text-lg">Вы должны быть авторизованы через Telegram для доступа к вашим данным.</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-16 px-4 relative">
      {/* Кнопка назад */}
      <button
        className="absolute top-0 left-0 mt-2 ml-2 p-2 rounded-full bg-muted hover:bg-muted/70 transition"
        onClick={() => navigate(-1)}
        aria-label="Назад"
      >
        <ArrowLeft size={24} />
      </button>
      {/* Заголовок с аватаром */}
      <div className="flex items-center gap-4 mb-6 mt-2">
        <Avatar>
          {photoUrl ? (
            <AvatarImage src={photoUrl} alt="avatar" />
          ) : (
            <AvatarFallback>{telegramUsername[0]?.toUpperCase() || "U"}</AvatarFallback>
          )}
        </Avatar>
        <h1 className="text-2xl font-bold text-white">Моя коллекция</h1>
      </div>
      {error && (
        <div className="mb-4 text-red-500">{error}</div>
      )}
      <div className="border rounded-lg overflow-x-auto shadow bg-card">
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
                <TableCell className="font-mono text-sm text-gray-500">
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
          <div className="p-6 text-center text-gray-500">Нет данных.</div>
        )}
      </div>
      {/* Модальное окно подтверждения удаления */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card rounded-lg p-6 shadow-lg w-full max-w-xs flex flex-col items-center">
            <div className="mb-4 text-lg text-white">Удалить файл <span className="font-bold">{deleteModal.fileName}</span>?</div>
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