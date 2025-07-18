import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2, Edit, Folder, FileText, MoreVertical, Image as ImageIcon, File as FileIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/utils/use-auth";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu";
import { useDrop, useDrag, DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function buildTree(notes) {
  const map = {};
  notes.forEach(n => map[n.note_id] = { ...n, children: [] });
  const roots = [];
  notes.forEach(n => {
    if (n.parent_note_id && map[n.parent_note_id]) {
      map[n.parent_note_id].children.push(map[n.note_id]);
    } else {
      roots.push(map[n.note_id]);
    }
  });
  return roots;
}

const ITEM_TYPE = "NOTE";

const WikiPage = () => {
  const navigate = useNavigate();
  const { telegramUsername } = useAuth();
  const [notes, setNotes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState({});
  const editorRef = useRef(null);
  const [attachments, setAttachments] = useState([]);
  const [labels, setLabels] = useState([]);
  const [labelInput, setLabelInput] = useState("");

  async function fetchNotes() {
    setLoading(true);
    const res = await fetch(`/api/notes/${telegramUsername}`);
    const data = await res.json();
    setNotes(data.rows || []);
    setLoading(false);
  }

  useEffect(() => {
    if (telegramUsername) fetchNotes();
  }, [telegramUsername]);

  function handleSelect(note) {
    setSelected(note);
    setEditMode(false);
    setEditTitle(note.title);
    setEditContent(note.content || "");
  }

  async function handleCreate(parentId = null) {
    const title = prompt("Название новой заметки:", "Новая заметка");
    if (!title) return;
    const res = await fetch(`/api/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: telegramUsername,
        parent_note_id: parentId,
        title,
        content: "",
        type: "text",
        mime: "text/html",
        is_protected: false,
        is_expanded: true,
        note_position: 0,
        prefix: "",
        attributes: {}
      })
    });
    if (res.ok) {
      toast.success("Заметка создана");
      fetchNotes();
    } else {
      toast.error("Ошибка создания заметки");
    }
  }

  async function handleDelete(note) {
    if (!window.confirm(`Удалить заметку "${note.title}" и все вложенные?`)) return;
    const res = await fetch(`/api/note/${note.note_id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Заметка удалена");
      setSelected(null);
      fetchNotes();
    } else {
      toast.error("Ошибка удаления заметки");
    }
  }

  async function handleSave() {
    if (!selected) return;
    const res = await fetch(`/api/note/${selected.note_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle, content: editContent })
    });
    if (res.ok) {
      toast.success("Сохранено");
      setEditMode(false);
      fetchNotes();
    } else {
      toast.error("Ошибка сохранения");
    }
  }

  // --- Drag&Drop ---
  function NoteTreeItem({ note, children, onDropNote }: { note: any, children: React.ReactNode, onDropNote: (from: string, to: string) => void }) {
    const [{ isDragging }, drag] = useDrag<{ note_id: string }, typeof ITEM_TYPE, { isDragging: boolean }>({
      type: ITEM_TYPE,
      item: { note_id: note.note_id },
      collect: (monitor) => ({ isDragging: monitor.isDragging() })
    });
    const [, drop] = useDrop<{ note_id: string }, void, unknown>({
      accept: ITEM_TYPE,
      drop: (item) => {
        if (item.note_id !== note.note_id) onDropNote(item.note_id, note.note_id);
      },
      canDrop: (item) => item.note_id !== note.note_id
    });
    return (
      <div ref={node => drag(drop(node))} style={{ opacity: isDragging ? 0.5 : 1 }}>
        {children}
      </div>
    );
  }

  async function handleMoveNote(noteId, newParentId) {
    await fetch(`/api/note/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parent_note_id: newParentId })
    });
    fetchNotes();
  }

  // --- Вложения ---
  async function fetchAttachments(noteId) {
    const res = await fetch(`/api/blobs?note_id=${noteId}`);
    const data = await res.json();
    setAttachments(data.rows || []);
  }
  async function handleUploadAttachment(e) {
    const file = e.target.files[0];
    if (!file || !selected) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("note_id", selected.note_id);
    const res = await fetch(`/api/blobs`, { method: "POST", body: formData });
    if (res.ok) {
      toast.success("Вложение загружено");
      fetchAttachments(selected.note_id);
    } else {
      toast.error("Ошибка загрузки вложения");
    }
  }
  async function handleDeleteAttachment(id) {
    await fetch(`/api/blobs/${id}`, { method: "DELETE" });
    fetchAttachments(selected.note_id);
  }

  // --- Метки ---
  async function fetchLabels(noteId) {
    const res = await fetch(`/api/attributes/${noteId}`);
    const data = await res.json();
    setLabels((data.rows || []).filter(a => a.type === "label"));
  }
  async function handleAddLabel() {
    if (!labelInput.trim() || !selected) return;
    await fetch(`/api/attributes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note_id: selected.note_id, type: "label", name: labelInput.trim(), value: "" })
    });
    setLabelInput("");
    fetchLabels(selected.note_id);
  }
  async function handleDeleteLabel(id) {
    await fetch(`/api/attribute/${id}`, { method: "DELETE" });
    fetchLabels(selected.note_id);
  }

  useEffect(() => {
    if (selected) {
      fetchAttachments(selected.note_id);
      fetchLabels(selected.note_id);
    }
  }, [selected]);

  // --- Контекстное меню ---
  function NoteContextMenu({ note, children }) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => handleSelect(note)}>Открыть</ContextMenuItem>
          <ContextMenuItem onClick={() => setEditMode(true)}>Редактировать</ContextMenuItem>
          <ContextMenuItem onClick={() => handleCreate(note.note_id)}>Создать подзаметку</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => handleDelete(note)}>Удалить</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  // --- Рендер дерева с drag&drop и меню ---
  function renderTree(nodes) {
    return (
      <ul className="pl-4 select-none">
        {nodes.map(note => (
          <li key={note.note_id} className="mb-1">
            <NoteTreeItem note={note} onDropNote={handleMoveNote}>
              <NoteContextMenu note={note}>
                <div className={`flex items-center gap-1 rounded px-1 py-0.5 hover:bg-[#333] ${selected && selected.note_id === note.note_id ? 'bg-[#444]' : ''}`}
                     onClick={() => handleSelect(note)}>
                  {note.children.length > 0 ? (
                    <span onClick={e => { e.stopPropagation(); setExpanded(exp => ({ ...exp, [note.note_id]: !exp[note.note_id] })); }}
                          className="cursor-pointer text-[#aaa] select-none">
                        {expanded[note.note_id] ? '▼' : '▶'}
                      </span>
                  ) : <span className="w-4 inline-block" />}
                  {note.type === 'text' ? <FileText className="w-4 h-4 mr-1 text-[#8cf]" /> : <Folder className="w-4 h-4 mr-1 text-[#fc8]" />}
                  <span className="truncate max-w-[140px]">{note.title}</span>
                  {/* Метки */}
                  {labels.filter(l => l.note_id === note.note_id).map(l => (
                    <Badge key={l.id} variant="secondary" className="ml-1">{l.name}</Badge>
                  ))}
                </div>
              </NoteContextMenu>
            </NoteTreeItem>
            {note.children.length > 0 && expanded[note.note_id] && renderTree(note.children)}
          </li>
        ))}
      </ul>
    );
  }

  // --- Быстрый поиск по содержимому, меткам, вложениям ---
  const filteredNotes = search
    ? notes.filter(n => {
        const textMatch = n.title.toLowerCase().includes(search.toLowerCase()) || (n.content || "").toLowerCase().includes(search.toLowerCase());
        const labelMatch = labels.some(l => l.note_id === n.note_id && l.name.toLowerCase().includes(search.toLowerCase()));
        const attachMatch = attachments.some(a => a.note_id === n.note_id && a.filename && a.filename.toLowerCase().includes(search.toLowerCase()));
        return textMatch || labelMatch || attachMatch;
      })
    : notes;
  const tree = buildTree(filteredNotes);

  // --- Вспомогательные функции для предпросмотра вложений ---
  function isImage(mime, filename) {
    return (mime && mime.startsWith("image/")) || /\.(png|jpe?g|gif|webp|svg)$/i.test(filename);
  }
  function isPDF(mime, filename) {
    return (mime === "application/pdf") || /\.pdf$/i.test(filename);
  }

  // --- Рендер ---
  return (
    <DndProvider backend={HTML5Backend}>
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
          <div className="ml-auto flex gap-2">
            <input
              className="rounded bg-[#191919] border border-[#444] px-2 py-1 text-[#eee] focus:outline-none focus:ring focus:ring-[#444] text-sm"
              placeholder="Поиск..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ minWidth: 120 }}
            />
            <Button variant="secondary" size="sm" onClick={() => handleCreate(null)}><Plus className="w-4 h-4 mr-1" />Новая заметка</Button>
          </div>
        </div>
        <div className="flex-1 flex overflow-hidden">
          {/* Дерево заметок */}
          <div className="w-[320px] min-w-[220px] max-w-[400px] border-r border-[#333] bg-[#232323] overflow-y-auto py-2">
            {loading ? <div className="p-4 text-center text-[#888]">Загрузка...</div> : tree.length > 0 ? renderTree(tree) : <div className="p-4 text-center text-[#888]">Нет заметок</div>}
          </div>
          {/* Редактор/просмотр */}
          <div className="flex-1 bg-[#262626] p-6 overflow-y-auto">
            {selected ? (
              editMode ? (
                <div className="max-w-2xl mx-auto">
                  <Input
                    className="w-full rounded bg-[#191919] border border-[#444] px-3 py-2 text-[#eee] focus:outline-none focus:ring focus:ring-[#444] text-xl font-bold mb-2"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    placeholder="Заголовок"
                    autoFocus
                  />
                  <Textarea
                    ref={editorRef}
                    className="w-full min-h-[240px] rounded bg-[#191919] border border-[#444] px-3 py-2 text-[#eee] focus:outline-none focus:ring focus:ring-[#444] mb-2"
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    placeholder="Текст заметки (поддержка Markdown/HTML)"
                  />
                  {/* Метки */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {labels.map(l => (
                      <Badge key={l.id} variant="secondary" className="flex items-center gap-1">
                        {l.name}
                        <button className="ml-1 text-xs text-red-400" onClick={() => handleDeleteLabel(l.id)} title="Удалить метку">×</button>
                      </Badge>
                    ))}
                    <form onSubmit={e => { e.preventDefault(); handleAddLabel(); }} className="flex gap-1">
                      <Input className="h-7 w-24 text-xs" value={labelInput} onChange={e => setLabelInput(e.target.value)} placeholder="+ метка" />
                      <Button type="submit" size="sm" variant="secondary">+</Button>
                    </form>
                  </div>
                  {/* Вложения */}
                  <div className="mb-2">
                    <div className="font-semibold mb-1">Вложения:</div>
                    <input type="file" onChange={handleUploadAttachment} />
                    <ul className="mt-1">
                      {attachments.map(att => (
                        <li key={att.id} className="flex items-center gap-2 text-xs mt-1">
                          <a href={`/api/blobs/${att.id}`} target="_blank" rel="noopener noreferrer" className="underline text-blue-400">{att.filename}</a>
                          <span className="text-[#888]">({Math.round(att.size/1024)} КБ)</span>
                          {editMode && <button className="text-red-400" onClick={() => handleDeleteAttachment(att.id)}>Удалить</button>}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="secondary" onClick={() => setEditMode(false)}>Отмена</Button>
                    <Button variant="default" onClick={handleSave}>Сохранить</Button>
                  </div>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto">
                  <h2 className="text-2xl font-bold mb-2">{selected.title}</h2>
                  {/* Метки */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {labels.map(l => (
                      <Badge key={l.id} variant="secondary">{l.name}</Badge>
                    ))}
                  </div>
                  {/* Вложения */}
                  <div className="mb-2">
                    <div className="font-semibold mb-1">Вложения:</div>
                    <ul className="mt-1 flex flex-wrap gap-4">
                      {attachments.map(att => (
                        <li key={att.id} className="flex flex-col items-center text-xs mt-1 max-w-[120px]">
                          {isImage(att.mime, att.filename) ? (
                            <a href={`/api/blobs/${att.id}`} target="_blank" rel="noopener noreferrer">
                              <img src={`/api/blobs/${att.id}`} alt={att.filename} className="rounded shadow max-w-[100px] max-h-[80px] mb-1" />
                            </a>
                          ) : isPDF(att.mime, att.filename) ? (
                            <iframe src={`/api/blobs/${att.id}`} title={att.filename} className="w-[100px] h-[80px] rounded shadow mb-1" />
                          ) : (
                            <a href={`/api/blobs/${att.id}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center">
                              <FileIcon className="w-8 h-8 text-[#888] mb-1" />
                            </a>
                          )}
                          <span className="truncate max-w-[100px] text-center">{att.filename}</span>
                          <span className="text-[#888]">({Math.round(att.size/1024)} КБ)</span>
                          {editMode && <button className="text-red-400 mt-1" onClick={() => handleDeleteAttachment(att.id)}>Удалить</button>}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* Предпросмотр Markdown/HTML */}
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.content || "_Нет содержимого_"}</ReactMarkdown>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="secondary" size="sm" onClick={() => setEditMode(true)}><Edit className="w-4 h-4 mr-1" />Редактировать</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(selected)}><Trash2 className="w-4 h-4 mr-1" />Удалить</Button>
                  </div>
                </div>
              )
            ) : (
              <div className="text-[#888] text-center mt-20">Выберите заметку или создайте новую</div>
            )}
          </div>
        </div>
      </div>
    </DndProvider>
  );
};

export default WikiPage; 