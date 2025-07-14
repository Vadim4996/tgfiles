import { useAuth } from "@/utils/use-auth";
import { useFiles } from "@/utils/use-files";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

const FilesPage = () => {
  const { telegramUsername } = useAuth();
  const { files, toggleStatus, deleteFile, isLoading, error } = useFiles();

  if (!telegramUsername) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="mb-4 text-lg">Вы должны быть авторизованы через Telegram для доступа к вашим данным.</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-16 px-4">
      <h1 className="text-2xl font-bold mb-6">Коллекция пользователя <span className="text-blue-700">{telegramUsername}</span></h1>
      {error && (
        <div className="mb-4 text-red-500">{error}</div>
      )}
      <div className="border rounded-lg overflow-x-auto shadow bg-white">
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
                    onClick={async () => {
                      await deleteFile(file.name);
                      toast.success("Строка удалена!");
                    }}
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
    </div>
  );
};

export default FilesPage;