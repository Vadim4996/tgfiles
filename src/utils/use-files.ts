import { useEffect, useState } from "react";
import { useAuth } from "./use-auth";

export type FileRow = {
  name: string;
  active: boolean;
  displayId?: number; // Для визуального отображения в таблице
  folder_id?: number | null;
};

export type FolderRow = {
  id: number;
  username: string;
  name: string;
  parent_id: number | null;
  created_at: string;
};

export function useFiles() {
  const { telegramUsername } = useAuth();
  const [files, setFiles] = useState<FileRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    if (!telegramUsername) {
      console.log("Username не найден, пропускаем загрузку файлов");
      setFiles([]);
      setIsLoading(false);
      return;
    }
    
    console.log("Загружаем файлы для пользователя:", telegramUsername);
    console.log("URL запроса:", `/api/vector-collections/${telegramUsername}`);
    
    // Получаем данные с API
    fetch(`/api/vector-collections/${telegramUsername}`)
      .then(async (res) => {
        console.log("Ответ сервера:", res.status, res.statusText);
        console.log("Заголовки ответа:", Object.fromEntries(res.headers.entries()));
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error("Ошибка сервера:", errorText);
          throw new Error(`Ошибка загрузки данных: ${res.status} ${res.statusText}`);
        }
        
        const contentType = res.headers.get("content-type");
        console.log("Content-Type:", contentType);
        
        if (!contentType || !contentType.includes("application/json")) {
          const responseText = await res.text();
          console.error("Сервер вернул не JSON:", responseText);
          throw new Error("Сервер вернул неверный формат данных");
        }
        
        const data = await res.json();
        console.log("Полученные данные:", data);
        
        // Добавляем displayId для визуального отображения
        let filesWithDisplayId = (data.rows || []).map((file: FileRow, index: number) => ({
          ...file,
          displayId: index + 1
        }));
        // Сортировка: сначала активные, затем неактивные, внутри групп — по алфавиту
        filesWithDisplayId = filesWithDisplayId.sort((a, b) => {
          if (a.active === b.active) {
            return a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' });
          }
          return a.active ? -1 : 1;
        });
        setFiles(filesWithDisplayId);
      })
      .catch((e) => {
        console.error("Ошибка при загрузке файлов:", e);
        setError(e.message);
      })
      .finally(() => setIsLoading(false));
  }, [telegramUsername]);

  async function toggleStatus(name: string, active: boolean) {
    if (!telegramUsername) return;
    try {
      console.log("Обновляем статус файла:", name, active);
      const res = await fetch(`/api/vector-collections/${telegramUsername}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, active }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Ошибка обновления статуса:", errorText);
        throw new Error('Ошибка обновления статуса');
      }
      
      setFiles((f) => f.map((file) => (file.name === name ? { ...file, active } : file)));
    } catch (e: any) {
      console.error("Ошибка при обновлении статуса:", e);
      setError(e.message);
    }
  }

  async function deleteFile(name: string) {
    if (!telegramUsername) return;
    try {
      console.log("Удаляем файл:", name);
      const res = await fetch(`/api/vector-collections/${telegramUsername}/${name}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Ошибка удаления:", errorText);
        throw new Error('Ошибка удаления');
      }
      
      setFiles((f) => f.filter((file) => file.name !== name));
    } catch (e: any) {
      console.error("Ошибка при удалении файла:", e);
      setError(e.message);
    }
  }

  return { files, isLoading, error, toggleStatus, deleteFile };
}

export function useFolders() {
  const { telegramUsername } = useAuth();
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Для refetch без перезагрузки
  const refetchFolders = async () => {
    setIsLoading(true);
    setError(null);
    if (!telegramUsername) {
      setFolders([]);
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/folders/${telegramUsername}`);
      if (!res.ok) throw new Error('Ошибка загрузки папок');
      const data = await res.json();
      setFolders(data.rows || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refetchFolders();
    // eslint-disable-next-line
  }, [telegramUsername]);

  // Создание папки
  async function createFolder(name: string, parent_id: number | null) {
    if (!telegramUsername) throw new Error('Нет username');
    const res = await fetch(`/api/folders/${telegramUsername}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parent_id }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Ошибка создания папки');
    }
    await refetchFolders();
  }

  // Удаление папки
  async function deleteFolder(folderId: number) {
    if (!telegramUsername) throw new Error('Нет username');
    const res = await fetch(`/api/folders/${telegramUsername}/${folderId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Ошибка удаления папки');
    }
    await refetchFolders();
  }

  // Переименование/перемещение папки
  async function renameFolder(folderId: number, newName: string | null, parent_id?: number | null) {
    if (!telegramUsername) throw new Error('Нет username');
    const body: any = {};
    if (newName !== null) body.name = newName;
    if (typeof parent_id !== 'undefined') body.parent_id = parent_id;
    const res = await fetch(`/api/folders/${telegramUsername}/${folderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Ошибка переименования/перемещения папки');
    }
    await refetchFolders();
  }

  return { folders, isLoading, error, refetchFolders, createFolder, deleteFolder, renameFolder };
}