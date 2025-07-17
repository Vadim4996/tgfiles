import { useAuth } from "@/utils/use-auth";
import { useFiles, useFolders, FolderRow, FileRow } from "@/utils/use-files";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import folderIcon from '/folder.png';
import { useRef } from "react";
import gearIcon from '/gear.png';

const FilesPage = () => {
  const { telegramUsername, photoUrl } = useAuth();
  const { files, toggleStatus, deleteFile, isLoading, error } = useFiles();
  const { folders, refetchFolders, createFolder, deleteFolder, renameFolder } = useFolders();
  const [expandedFolders, setExpandedFolders] = useState<{ [id: number]: boolean }>({});
  const navigate = useNavigate();
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; fileName: string | null }>({ open: false, fileName: null });
  const [createFolderModal, setCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParent, setNewFolderParent] = useState<number | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  // Drag-and-drop state
  const [draggedFolderId, setDraggedFolderId] = useState<number | null>(null);
  const [renameModal, setRenameModal] = useState<{ open: boolean; folder: FolderRow | null }>({ open: false, folder: null });
  const [renameValue, setRenameValue] = useState("");
  const [deleteModalFolder, setDeleteModalFolder] = useState<{ open: boolean; folder: FolderRow | null }>({ open: false, folder: null });
  const [dragOverNoFolder, setDragOverNoFolder] = useState(false);
  const [fileMenu, setFileMenu] = useState<{ open: boolean; file: FileRow | null; anchor: HTMLElement | null }>({ open: false, file: null, anchor: null });
  const [folderMenu, setFolderMenu] = useState<{ open: boolean; folder: FolderRow | null; anchor: HTMLElement | null }>({ open: false, folder: null, anchor: null });
  const [moveFile, setMoveFile] = useState<FileRow | null>(null);

  if (!telegramUsername) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#272727] text-[#ccc]">
        <div className="mb-4 text-lg">Вы должны быть авторизованы через Telegram для доступа к вашим данным.</div>
      </div>
    );
  }

  // Рекурсивный компонент для дерева папок
  function FolderTree({ parentId, folders, files, expandedFolders, setExpandedFolders, toggleStatus, setDeleteModal }) {
    // Получаем папки текущего уровня
    const currentFolders = folders
      .filter(f => f.parent_id === parentId)
      .sort((a, b) => a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' }));

    const [dragOverFolder, setDragOverFolder] = useState<number | null>(null);
    return (
      <>
        {currentFolders.map(folder => {
          // Файлы в этой папке
          const filesInFolder = files.filter(file => file.folder_id === folder.id);
          // Статус папки
          const allActive = filesInFolder.length > 0 && filesInFolder.every(f => f.active);
          const anyActive = filesInFolder.some(f => f.active);
          return (
            <div
              key={folder.id}
              className={`bg-[#232323] rounded-lg border border-[#313131] mb-2 ${dragOverFolder === folder.id ? 'ring-2 ring-green-500' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOverFolder(folder.id); }}
              onDragLeave={() => setDragOverFolder(null)}
              onDrop={async (e) => {
                setDragOverFolder(null);
                const fileName = e.dataTransfer.getData('text/plain');
                if (!fileName) return;
                try {
                  const res = await fetch(`/api/vector-collections/${telegramUsername}/move`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: fileName, folder_id: folder.id }),
                  });
                  if (!res.ok) throw new Error('Ошибка перемещения файла');
                  toast.success('Файл перемещён');
                  window.location.reload();
                } catch (e: any) {
                  toast.error(e.message || 'Ошибка перемещения файла');
                }
              }}
            >
              <div
                className="flex items-center gap-2 px-4 py-2 cursor-pointer select-none hover:bg-[#292929] rounded-t-lg"
                onClick={() => setExpandedFolders(prev => ({ ...prev, [folder.id]: !prev[folder.id] }))}
              >
                <img src={folderIcon} alt="Папка" className="w-5 h-5" />
                <span className="font-semibold text-[#e0e0e0]">{folder.name}</span>
                <span className="ml-auto flex items-center gap-2">
                  <span onClick={e => e.stopPropagation()} className="flex items-center">
                    <Checkbox
                      checked={allActive}
                      onCheckedChange={async (checked) => {
                        await Promise.all(filesInFolder.map(f => f.active === checked ? null : toggleStatus(f.name, checked)));
                        toast.success(checked ? "Все файлы в папке активированы" : "Все файлы в папке деактивированы");
                      }}
                      aria-label={allActive ? "Деактивировать все" : "Активировать все"}
                      disabled={filesInFolder.length === 0}
                    />
                  </span>
                </span>
                <button
                  className="p-1 rounded hover:bg-[#333] ml-2"
                  onClick={e => { e.stopPropagation(); setFolderMenu({ open: true, folder, anchor: e.currentTarget }); }}
                  aria-label="Меню папки"
                >
                  <img src={gearIcon} alt="Меню" className="w-5 h-5" />
                </button>
              </div>
              {expandedFolders[folder.id] && (
                <div className="pl-4">
                  {/* Вложенные папки */}
                  <FolderTree
                    parentId={folder.id}
                    folders={folders}
                    files={files}
                    expandedFolders={expandedFolders}
                    setExpandedFolders={setExpandedFolders}
                    toggleStatus={toggleStatus}
                    setDeleteModal={setDeleteModal}
                  />
                  {/* Файлы в этой папке */}
                  <div className="overflow-x-auto">
                    <Table className="min-w-[600px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16 sticky left-0 bg-[#232323] z-10">№</TableHead>
                          <TableHead className="w-24">Active</TableHead>
                          <TableHead className="max-w-[240px] min-w-[120px] break-words whitespace-pre-line">Name</TableHead>
                          <TableHead className="w-24 sticky right-0 bg-[#232323] z-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filesInFolder
                          .sort((a, b) => a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' }))
                          .map((file, idx) => (
                            <TableRow key={file.name} draggable onDragStart={e => e.dataTransfer.setData('text/plain', file.name)}>
                              <TableCell className="font-mono text-sm text-[#bbb] sticky left-0 bg-[#232323] z-10">{idx + 1}</TableCell>
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
                              <TableCell className="font-medium max-w-[240px] min-w-[120px] break-words whitespace-pre-line" style={{wordBreak: 'break-word', whiteSpace: 'pre-line'}}>
                                {file.name.length > 40
                                  ? file.name.replace(/(.{40})/g, '$1\n')
                                  : file.name}
                              </TableCell>
                              <TableCell className="sticky right-0 bg-[#232323] z-10">
                                <button
                                  className="p-1 rounded hover:bg-[#333]"
                                  onClick={e => setFileMenu({ open: true, file, anchor: e.currentTarget })}
                                  aria-label="Меню файла"
                                >
                                  <img src={gearIcon} alt="Меню" className="w-5 h-5" />
                                </button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                    {filesInFolder.length === 0 && (
                      <div className="p-4 text-center text-[#888]">Нет файлов в папке.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </>
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
        <div className="bg-[#262626] rounded-xl shadow-lg p-2 border border-[#313131] w-full max-w-4xl">
          {error && (
            <div className="mb-4 text-red-400">{error}</div>
          )}
          {/* Кнопка создания папки */}
          <div className="flex justify-end mb-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => setCreateFolderModal(true)}
            >
              <img src={folderIcon} alt="Папка" className="w-5 h-5" />
              Создать папку
            </Button>
          </div>
          <div className="overflow-x-auto">
            {/* Древовидное отображение папок и файлов (рекурсивно) */}
            <div className="space-y-2">
              <FolderTree
                parentId={null}
                folders={folders}
                files={files}
                expandedFolders={expandedFolders}
                setExpandedFolders={setExpandedFolders}
                toggleStatus={toggleStatus}
                setDeleteModal={setDeleteModal}
              />
              {/* Файлы без папки */}
              <div
                className={`bg-[#232323] rounded-lg border border-[#313131] ${dragOverNoFolder ? 'ring-2 ring-green-500' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOverNoFolder(true); }}
                onDragLeave={() => setDragOverNoFolder(false)}
                onDrop={async (e) => {
                  setDragOverNoFolder(false);
                  const fileName = e.dataTransfer.getData('text/plain');
                  if (!fileName) return;
                  try {
                    const res = await fetch(`/api/vector-collections/${telegramUsername}/move`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name: fileName, folder_id: null }),
                    });
                    if (!res.ok) throw new Error('Ошибка перемещения файла');
                    toast.success('Файл перемещён');
                    window.location.reload();
                  } catch (e: any) {
                    toast.error(e.message || 'Ошибка перемещения файла');
                  }
                }}
              >
                <div className="w-full flex justify-center items-center px-2 py-2 select-none">
                  <span className="font-semibold text-[#e0e0e0] text-center text-lg">Без папки</span>
                </div>
                <div className="overflow-x-auto">
                  <Table className="min-w-[600px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16 sticky left-0 bg-[#232323] z-10">№</TableHead>
                        <TableHead className="w-24">Active</TableHead>
                        <TableHead className="max-w-[240px] min-w-[120px] break-words whitespace-pre-line">Name</TableHead>
                        <TableHead className="w-16 sticky right-0 bg-[#232323] z-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {files
                        .filter(file => !file.folder_id)
                        .sort((a, b) => a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' }))
                        .map((file, idx) => (
                          <TableRow
                            key={file.name}
                            draggable
                            onDragStart={e => e.dataTransfer.setData('text/plain', file.name)}
                            // Для мобильных long-press
                            onTouchStart={e => {
                              const timeout = window.setTimeout(() => {
                                // Начать drag (эмулировать)
                                // Можно реализовать кастомный drag preview
                              }, 500);
                              (e.currentTarget as any).dataset.dragTimeout = String(timeout);
                            }}
                            onTouchEnd={e => {
                              clearTimeout(Number((e.currentTarget as any).dataset.dragTimeout));
                            }}
                          >
                            <TableCell className="font-mono text-sm text-[#bbb] sticky left-0 bg-[#232323] z-10">{idx + 1}</TableCell>
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
                            <TableCell className="font-medium max-w-[240px] min-w-[120px] break-words whitespace-pre-line" style={{wordBreak: 'break-word', whiteSpace: 'pre-line'}}>
                              {file.name.length > 40
                                ? file.name.replace(/(.{40})/g, '$1\n')
                                : file.name}
                            </TableCell>
                            <TableCell className="sticky right-0 bg-[#232323] z-10">
                              <button
                                className="p-1 rounded hover:bg-[#333]"
                                onClick={e => setFileMenu({ open: true, file, anchor: e.currentTarget })}
                                aria-label="Меню файла"
                              >
                                <img src={gearIcon} alt="Меню" className="w-5 h-5" />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                  {files.filter(file => !file.folder_id).length === 0 && (
                    <div className="p-4 text-center text-[#888]">Нет файлов вне папок.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Модальное окно создания папки */}
      {createFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#262626] rounded-lg p-6 shadow-lg w-full max-w-xs flex flex-col items-center border border-[#313131]">
            <div className="mb-4 text-lg flex items-center gap-2">
              <img src={folderIcon} alt="Папка" className="w-6 h-6" />
              Создать новую папку
            </div>
            <form
              className="w-full flex flex-col gap-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newFolderName.trim()) return;
                setCreatingFolder(true);
                try {
                  await createFolder(newFolderName.trim(), newFolderParent);
                  setCreateFolderModal(false);
                  setNewFolderName("");
                  setNewFolderParent(null);
                  await refetchFolders();
                  toast.success("Папка создана");
                } catch (e: any) {
                  toast.error(e.message || "Ошибка создания папки");
                } finally {
                  setCreatingFolder(false);
                }
              }}
            >
              <input
                className="w-full rounded bg-[#191919] border border-[#444] px-3 py-2 text-[#eee] focus:outline-none focus:ring focus:ring-[#444]"
                placeholder="Название папки"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                maxLength={64}
                required
                autoFocus
              />
              <select
                className="w-full rounded bg-[#191919] border border-[#444] px-3 py-2 text-[#eee] focus:outline-none"
                value={newFolderParent ?? ''}
                onChange={e => setNewFolderParent(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Корень</option>
                {folders
                  .sort((a, b) => a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' }))
                  .map(folder => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
              </select>
              <div className="flex gap-4 mt-2 w-full justify-end">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    setCreateFolderModal(false);
                    setNewFolderName("");
                    setNewFolderParent(null);
                  }}
                  disabled={creatingFolder}
                >
                  Отмена
                </Button>
                <Button
                  variant="default"
                  type="submit"
                  disabled={creatingFolder || !newFolderName.trim()}
                >
                  {creatingFolder ? "Создание..." : "Создать"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Модальное окно переименования папки */}
      {renameModal.open && renameModal.folder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#262626] rounded-lg p-6 shadow-lg w-full max-w-xs flex flex-col items-center border border-[#313131]">
            <div className="mb-4 text-lg flex items-center gap-2">
              <img src={folderIcon} alt="Папка" className="w-6 h-6" />
              Переименовать папку
            </div>
            <form
              className="w-full flex flex-col gap-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!renameValue.trim()) return;
                try {
                  await renameFolder(renameModal.folder.id, renameValue.trim());
                  setRenameModal({ open: false, folder: null });
                  setRenameValue("");
                  await refetchFolders();
                  toast.success("Папка переименована");
                } catch (e: any) {
                  toast.error(e.message || "Ошибка переименования папки");
                }
              }}
            >
              <input
                className="w-full rounded bg-[#191919] border border-[#444] px-3 py-2 text-[#eee] focus:outline-none focus:ring focus:ring-[#444]"
                placeholder="Новое имя папки"
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                maxLength={64}
                required
                autoFocus
              />
              <div className="flex gap-4 mt-2 w-full justify-end">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setRenameModal({ open: false, folder: null })}
                >
                  Отмена
                </Button>
                <Button
                  variant="default"
                  type="submit"
                  disabled={!renameValue.trim()}
                >
                  Переименовать
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Модальное окно удаления папки */}
      {deleteModalFolder.open && deleteModalFolder.folder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#262626] rounded-lg p-6 shadow-lg w-full max-w-xs flex flex-col items-center border border-[#313131]">
            <div className="mb-4 text-lg flex items-center gap-2">
              <img src={folderIcon} alt="Папка" className="w-6 h-6" />
              Удалить папку
            </div>
            <div className="mb-4 text-center">Вы уверены, что хотите удалить папку <span className="font-bold">{deleteModalFolder.folder.name}</span> и все вложенные папки и файлы?</div>
            <div className="flex gap-4 mt-2 w-full justify-end">
              <Button
                variant="secondary"
                onClick={() => setDeleteModalFolder({ open: false, folder: null })}
              >
                Отмена
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  try {
                    await deleteFolder(deleteModalFolder.folder!.id);
                    setDeleteModalFolder({ open: false, folder: null });
                    await refetchFolders();
                    toast.success("Папка удалена");
                  } catch (e: any) {
                    toast.error(e.message || "Ошибка удаления папки");
                  }
                }}
              >
                Удалить
              </Button>
            </div>
          </div>
        </div>
      )}
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
      {fileMenu.open && fileMenu.file && (
        <div
          className="fixed z-50 left-0 top-0 w-full h-full bg-black/10"
          onClick={() => setFileMenu({ open: false, file: null, anchor: null })}
        >
          <div
            className="absolute bg-[#232323] border border-[#444] rounded shadow-lg p-2 min-w-[120px]"
            style={{ left: fileMenu.anchor?.getBoundingClientRect().left ?? 0, top: (fileMenu.anchor?.getBoundingClientRect().bottom ?? 0) + window.scrollY }}
            onClick={e => e.stopPropagation()}
          >
            <button
              className="block w-full text-left px-2 py-1 hover:bg-[#333] text-red-400"
              onClick={async () => {
                setFileMenu({ open: false, file: null, anchor: null });
                setDeleteModal({ open: true, fileName: fileMenu.file!.name });
              }}
            >Удалить</button>
            <button
              className="block w-full text-left px-2 py-1 hover:bg-[#333]"
              onClick={() => {
                setFileMenu({ open: false, file: null, anchor: null });
                setMoveFile(fileMenu.file);
              }}
            >Переместить</button>
          </div>
        </div>
      )}
      {folderMenu.open && folderMenu.folder && (
        <div
          className="fixed z-50 left-0 top-0 w-full h-full bg-black/10"
          onClick={() => setFolderMenu({ open: false, folder: null, anchor: null })}
        >
          <div
            className="absolute bg-[#232323] border border-[#444] rounded shadow-lg p-2 min-w-[120px]"
            style={{
              left: (folderMenu.anchor?.getBoundingClientRect().left ?? 0) - 120 + window.scrollX,
              top: (folderMenu.anchor?.getBoundingClientRect().bottom ?? 0) + window.scrollY
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              className="block w-full text-left px-2 py-1 hover:bg-[#333] text-red-400"
              onClick={() => {
                setFolderMenu({ open: false, folder: null, anchor: null });
                setDeleteModalFolder({ open: true, folder: folderMenu.folder });
              }}
            >Удалить</button>
            <button
              className="block w-full text-left px-2 py-1 hover:bg-[#333]"
              onClick={() => {
                setFolderMenu({ open: false, folder: null, anchor: null });
                setRenameModal({ open: true, folder: folderMenu.folder });
                setRenameValue(folderMenu.folder.name);
              }}
            >Переименовать</button>
          </div>
        </div>
      )}
      {moveFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#262626] rounded-lg p-6 shadow-lg w-full max-w-xs flex flex-col items-center border border-[#313131] max-w-[95vw] min-w-[240px]">
            <div className="mb-4 text-lg break-words text-center w-full" style={{wordBreak: 'break-word', overflowWrap: 'break-word'}}>
              Переместить файл <span className="font-bold">{moveFile.name}</span> в папку:
            </div>
            <select
              className="w-full rounded bg-[#191919] border border-[#444] px-3 py-2 text-[#eee] focus:outline-none"
              value={''}
              onChange={async (e) => {
                const folderId = e.target.value === 'null' ? null : Number(e.target.value);
                if (e.target.value === '') return;
                try {
                  const res = await fetch(`/api/vector-collections/${telegramUsername}/move`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: moveFile.name, folder_id: folderId }),
                  });
                  if (!res.ok) throw new Error('Ошибка перемещения файла');
                  toast.success('Файл перемещён');
                  setMoveFile(null);
                  window.location.reload();
                } catch (e: any) {
                  toast.error(e.message || 'Ошибка перемещения файла');
                }
              }}
            >
              <option value="">В папку...</option>
              <option value="null">В категорию Без папки</option>
              {folders
                .sort((a, b) => a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' }))
                .map(folder => (
                  <option key={folder.id} value={folder.id}>{folder.name}</option>
                ))}
            </select>
            <div className="flex gap-4 mt-4">
              <Button variant="secondary" onClick={() => setMoveFile(null)}>Отмена</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilesPage;