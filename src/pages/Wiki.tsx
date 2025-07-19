import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useAuth } from '../utils/use-auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '../components/ui/context-menu';
import { ChevronRight, ChevronDown, FileText, Folder, Plus, Search, ArrowLeft } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  attributes?: Array<{ name: string; value: string }>;
  children?: Note[];
  type?: string;
}

interface Blob {
  id: string;
  name: string;
  mime_type: string;
  size: number;
  note_id: string;
}

const Wiki: React.FC = () => {
  const { telegramUsername, token } = useAuth();
  const navigate = useNavigate();
  const { noteId } = useParams<{ noteId: string }>();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [attachments, setAttachments] = useState<Blob[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quill editor configuration
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['link', 'image', 'code-block'],
      ['clean']
    ],
  };

  const quillFormats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'color', 'background', 'align',
    'link', 'image', 'code-block'
  ];

  useEffect(() => {
    loadNotes();
  }, [token]);

  useEffect(() => {
    if (noteId) {
      loadNote(noteId);
    } else {
      setSelectedNote(null);
      setNoteTitle('');
      setNoteContent('');
      setAttachments([]);
    }
  }, [noteId]);

  const loadNotes = async () => {
    try {
      const response = await fetch('/api/notes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Маппинг note_id -> id для совместимости с интерфейсом
        const mappedData = (data.rows || []).map((note: any) => ({
          ...note,
          id: note.note_id || note.id
        }));
        const tree = buildNoteTree(mappedData);
        setNotes(tree);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const loadNote = async (id: string) => {
    try {
      const response = await fetch(`/api/notes/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const note = await response.json();
        // Маппинг note_id -> id для совместимости с интерфейсом
        setSelectedNote({ ...note, id: note.note_id || note.id });
        setNoteTitle(note.title);
        setNoteContent(note.content);
        loadAttachments(id);
      }
    } catch (error) {
      console.error('Error loading note:', error);
    }
  };

  const loadAttachments = async (noteId: string) => {
    try {
      const response = await fetch(`/api/blobs?note_id=${noteId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAttachments(data);
      }
    } catch (error) {
      console.error('Error loading attachments:', error);
    }
  };

  const buildNoteTree = (notes: Note[]): Note[] => {
    const noteMap = new Map<string, Note>();
    const roots: Note[] = [];

    notes.forEach(note => {
      noteMap.set(note.id, { ...note, children: [] });
    });

    notes.forEach(note => {
      if (note.parent_id && noteMap.has(note.parent_id)) {
        const parent = noteMap.get(note.parent_id)!;
        parent.children!.push(noteMap.get(note.id)!);
      } else {
        roots.push(noteMap.get(note.id)!);
      }
    });

    return roots;
  };

  const handleSaveNote = async () => {
    if (!selectedNote || !selectedNote.id) {
      alert('Не выбрана заметка для сохранения!');
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch(`/api/notes/${selectedNote.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: noteTitle,
          content: noteContent,
          type: 'note'
        })
      });
      if (response.ok) {
        await loadNotes();
        await loadNote(selectedNote.id);
      } else {
        const err = await response.text();
        alert('Ошибка при сохранении заметки: ' + err);
      }
    } catch (error) {
      alert('Ошибка при сохранении заметки: ' + error);
      console.error('Error saving note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNote = async () => {
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: 'Новая заметка',
          content: '',
          parent_id: selectedNote?.id || null,
          type: 'note'
        })
      });

      if (response.ok) {
        await loadNotes();
        const data = await response.json();
        // Используем note_id из ответа backend
        const noteId = data.note.note_id || data.note.id;
        navigate(`/wiki/${noteId}`);
      }
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await loadNotes();
        if (selectedNote?.id === noteId) {
          navigate('/wiki');
        }
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  // Вспомогательная функция для получения плоского списка всех заметок
  const flattenNotes = (notes: Note[]): Note[] => {
    let result: Note[] = [];
    for (const note of notes) {
      result.push(note);
      if (note.children && note.children.length > 0) {
        result = result.concat(flattenNotes(note.children));
      }
    }
    return result;
  };

  const handleMoveNote = async (noteId: string, newParentId: string | null) => {
    // Находим заметку по id
    const allNotes = flattenNotes(notes);
    const note = allNotes.find(n => n.id === noteId);
    if (!note) {
      alert('Заметка не найдена!');
      return;
    }
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: note.title || 'Без названия',
          content: note.content || '',
          parent_id: newParentId,
          type: note.type || 'note'
        })
      });
      if (response.ok) {
        await loadNotes();
      } else {
        const err = await response.text();
        alert('Ошибка при перемещении заметки: ' + err);
      }
    } catch (error) {
      alert('Ошибка при перемещении заметки: ' + error);
      console.error('Error moving note:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !selectedNote || !selectedNote.id) {
      alert('Не выбрана заметка для вложения!');
      return;
    }
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('note_id', selectedNote.id);
      try {
        const response = await fetch('/api/blobs', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        if (response.ok) {
          await loadAttachments(selectedNote.id);
        } else {
          const err = await response.text();
          alert('Ошибка при загрузке файла: ' + err);
        }
      } catch (error) {
        alert('Ошибка при загрузке файла: ' + error);
        console.error('Error uploading file:', error);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (blobId: string) => {
    try {
      const response = await fetch(`/api/blobs/${blobId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok && selectedNote) {
        await loadAttachments(selectedNote.id);
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
    }
  };

  const handleAttachmentClick = (blob: Blob) => {
    // Создаем временную ссылку для скачивания
    const link = document.createElement('a');
    link.href = `/api/blobs/${blob.id}`;
    link.download = blob.name;
    link.click();
  };

  const renderNoteTree = (notes: Note[], level = 0) => {
    return notes.map(note => (
      <div key={note.id} className={
        `rounded px-2 py-1 ${selectedNote && selectedNote.id === note.id ? 'bg-[#313131] text-[#fff]' : 'hover:bg-[#262626]'} cursor-pointer`
      }>
        <div className="flex items-center">
          <button
            onClick={() => navigate(`/wiki/${note.id}`)}
            className="flex items-center flex-1 text-left py-1 px-2 rounded w-full"
            style={{ background: 'none', color: 'inherit' }}
          >
            <span className="text-[#ccc] mr-1">
              {note.children && note.children.length > 0 ? <ChevronRight size={16} /> : <FileText size={16} />}
            </span>
            <span className="truncate">{note.title}</span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <img src="/gear.png" alt="Настройки" className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleMoveNote(note.id, null)}>
                Переместить в корень
              </DropdownMenuItem>
              {selectedNote && selectedNote.id !== note.id && (
                <DropdownMenuItem onClick={() => handleMoveNote(note.id, selectedNote.id)}>
                  Переместить в текущую заметку
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => handleDeleteNote(note.id)}
                className="text-red-500"
              >
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {note.children && note.children.length > 0 && (
          <div className="ml-4">
            {renderNoteTree(note.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  // Рендер списка для поиска
  const renderFlatNoteList = (notes: Note[]) => (
    <div>
      {notes.map(note => (
        <div key={note.id} className={
          `rounded px-2 py-1 ${selectedNote && selectedNote.id === note.id ? 'bg-[#313131] text-[#fff]' : 'hover:bg-[#262626]'} cursor-pointer`
        }>
          <button
            onClick={() => navigate(`/wiki/${note.id}`)}
            className="flex items-center flex-1 text-left py-1 px-2 rounded w-full"
            style={{ background: 'none', color: 'inherit' }}
          >
            <span className="text-[#ccc] mr-1">
              <FileText size={16} />
            </span>
            <span className="truncate">{note.title}</span>
          </button>
        </div>
      ))}
    </div>
  );

  const allNotesFlat = flattenNotes(notes);
  const filteredNotesFlat = allNotesFlat.filter(note => note.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex h-screen min-h-screen bg-[#272727] text-[#ccc]">
      {/* Sidebar */}
      <div className="w-80 bg-[#1f1f1f] border-r border-[#313131] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#454545]">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">База знаний</h1>
            <Button onClick={handleCreateNote} size="sm" className="bg-[#262626] border border-[#313131] text-[#ccc] hover:bg-[#313131] shadow-lg">
              <Plus size={16} />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ccc]" size={16} />
            <Input
              placeholder="Поиск заметок..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#262626] border-[#313131] text-[#ccc]"
            />
          </div>
        </div>
        {/* Notes Tree или Flat List */}
        <ScrollArea className="flex-1 p-4">
          {searchTerm.trim() ? renderFlatNoteList(filteredNotesFlat) : renderNoteTree(notes)}
        </ScrollArea>
      </div>
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-[#1f1f1f] border-b border-[#454545] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/')} 
                className="p-2 rounded-full hover:bg-[#313131]"
              >
                <ArrowLeft size={20} />
              </Button>
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-bold">База знаний</h1>
                {selectedNote && (
                  <>
                    <Separator orientation="vertical" className="h-6" />
                    <div className="max-w-md overflow-hidden">
                      <h2 className="text-lg font-semibold truncate" title={selectedNote.title}>
                        {selectedNote.title}
                      </h2>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          {/* Tags */}
          {selectedNote?.attributes && selectedNote.attributes.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedNote.attributes.map((attr, index) => (
                <Badge key={index} variant="secondary" className="bg-blue-600 text-white">
                  {attr.name}: {attr.value}
                </Badge>
              ))}
            </div>
          )}
        </div>
        {/* Note Content */}
        {selectedNote ? (
          <div className="flex-1 flex flex-col">
            {/* Toolbar */}
            <div className="bg-[#1f1f1f] border-b border-[#454545] p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleSaveNote}
                    disabled={isSaving}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <img src="/save.png" alt="Сохранить" className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    size="sm"
                    variant="outline"
                    className="bg-[#262626] border border-[#313131] text-[#ccc] hover:bg-[#313131]"
                  >
                    <img src="/clip.png" alt="Прикрепить файл" className="w-4 h-4" />
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
            {/* Editor */}
            <div className="flex-1 p-4 bg-[#262626] text-[#ccc]">
              <div className="h-full flex flex-col">
                <ReactQuill
                  theme="snow"
                  value={noteContent}
                  onChange={setNoteContent}
                  modules={quillModules}
                  formats={quillFormats}
                  className="flex-1 bg-[#262626] text-[#ccc]"
                  style={{ height: '300px' }}
                />
                {/* Attachments Section */}
                {attachments.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">Вложения</h3>
                    <div className="attachment-grid">
                      {attachments.map((blob) => (
                        <div
                          key={blob.id}
                          className="attachment-item group"
                          onClick={() => handleAttachmentClick(blob)}
                        >
                          <div className="text-center">
                            <div className="text-2xl mb-2">
                              {blob.mime_type.startsWith('image/') ? '🖼️' : 
                               blob.mime_type.startsWith('video/') ? '🎥' :
                               blob.mime_type.startsWith('audio/') ? '🎵' :
                               blob.mime_type.includes('pdf') ? '📄' :
                               blob.mime_type.includes('text') ? '📝' : '📎'}
                            </div>
                            <div className="text-sm font-medium truncate" title={blob.name}>
                              {blob.name}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#262626] text-[#ccc]">
            <span>Выберите заметку для просмотра или создайте новую.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wiki; 