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
import { ChevronRight, ChevronDown, FileText, Folder, Plus, Search, ArrowLeft, Menu } from 'lucide-react';

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
  name?: string;
  mime_type?: string;
  size?: number;
  note_id?: string;
  mime?: string;
  filename?: string;
}

const Wiki: React.FC = () => {
  const { telegramUsername, token } = useAuth();
  if (!telegramUsername || !token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#272727] text-[#ccc]">
        <div className="mb-4 text-lg">Ошибка авторизации: не удалось получить username или токен из Telegram. Проверьте запуск через Telegram WebApp.</div>
      </div>
    );
  }
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  useEffect(() => {
    const toolbar = document.querySelector('.ql-toolbar.ql-snow') as HTMLElement;
    if (toolbar) {
      // Устанавливаем серо-коричневый фон для тулбара
      toolbar.style.background = '#827574';
      toolbar.style.color = '#ffffff';
      toolbar.style.border = '1px solid #18181b';
      toolbar.style.borderRadius = '0.375rem 0.375rem 0 0';
      
      // Все кнопки и элементы - тёмные на белом
      toolbar.querySelectorAll('button, .ql-picker, .ql-picker-label, .ql-picker-item').forEach(el => {
        if (el instanceof HTMLElement) {
          const htmlEl = el;
          htmlEl.style.background = 'transparent';
          htmlEl.style.color = '#ffffff';
          htmlEl.style.fill = '#ffffff';
          htmlEl.style.stroke = '#ffffff';
          htmlEl.style.border = '1px solid #a8a8a8';
          htmlEl.style.borderRadius = '3px';
          htmlEl.style.margin = '1px';
          htmlEl.style.padding = '3px 5px';
          
          // Специальные размеры для picker элементов
          if (htmlEl.classList.contains('ql-picker')) {
            htmlEl.style.minWidth = '40px';
            htmlEl.style.height = '24px';
            htmlEl.style.display = 'inline-flex';
            htmlEl.style.alignItems = 'center';
            htmlEl.style.justifyContent = 'center';
            
            // Немного большие размеры для стиля и цвета
            if (htmlEl.classList.contains('ql-header') || 
                htmlEl.classList.contains('ql-color') || 
                htmlEl.classList.contains('ql-background')) {
              htmlEl.style.minWidth = '45px';
              htmlEl.style.padding = '3px 6px';
              htmlEl.style.fontSize = '11px';
              htmlEl.style.fontWeight = '400';
            }
          }
        }
      });
      
      // Все SVG иконки - тёмные
      toolbar.querySelectorAll('svg').forEach(svg => {
        if (svg instanceof SVGElement) {
          const svgEl = svg;
          svgEl.style.color = '#ffffff';
          svgEl.style.fill = '#ffffff';
          svgEl.style.stroke = '#ffffff';
          svgEl.setAttribute('fill', '#ffffff');
          svgEl.setAttribute('stroke', '#ffffff');
        }
      });
      
      // Hover эффекты
      toolbar.querySelectorAll('button, .ql-picker-item, .ql-picker-label').forEach(el => {
        if (el instanceof HTMLElement) {
          const htmlEl = el;
          htmlEl.addEventListener('mouseover', () => {
            htmlEl.style.background = '#ffffff';
            htmlEl.style.color = '#827574';
            htmlEl.style.fill = '#827574';
            htmlEl.style.stroke = '#827574';
            htmlEl.style.borderColor = '#ffffff';
            htmlEl.querySelectorAll('svg').forEach(svg => {
              if (svg instanceof SVGElement) {
                const svgEl = svg;
                svgEl.style.color = '#827574';
                svgEl.style.fill = '#827574';
                svgEl.style.stroke = '#827574';
                svgEl.setAttribute('fill', '#827574');
                svgEl.setAttribute('stroke', '#827574');
              }
            });
          });
          htmlEl.addEventListener('mouseout', () => {
            htmlEl.style.background = 'transparent';
            htmlEl.style.color = '#ffffff';
            htmlEl.style.fill = '#ffffff';
            htmlEl.style.stroke = '#ffffff';
            htmlEl.style.borderColor = '#ffffff';
            htmlEl.querySelectorAll('svg').forEach(svg => {
              if (svg instanceof SVGElement) {
                const svgEl = svg;
                svgEl.style.color = '#ffffff';
                svgEl.style.fill = '#ffffff';
                svgEl.style.stroke = '#ffffff';
                svgEl.setAttribute('fill', '#ffffff');
                svgEl.setAttribute('stroke', '#ffffff');
              }
            });
          });
        }
      });
      
      // Активные элементы
      toolbar.querySelectorAll('button.ql-active, .ql-picker-item.ql-selected').forEach(el => {
        if (el instanceof HTMLElement) {
          const htmlEl = el;
          htmlEl.style.background = '#ffffff';
          htmlEl.style.color = '#827574';
          htmlEl.style.fill = '#827574';
          htmlEl.style.stroke = '#827574';
          htmlEl.style.borderColor = '#ffffff';
          htmlEl.querySelectorAll('svg').forEach(svg => {
            if (svg instanceof SVGElement) {
              const svgEl = svg;
              svgEl.style.color = '#827574';
              svgEl.style.fill = '#827574';
              svgEl.style.stroke = '#827574';
              svgEl.setAttribute('fill', '#827574');
              svgEl.setAttribute('stroke', '#827574');
            }
          });
        }
      });
      
      // Выпадающие меню
      toolbar.querySelectorAll('.ql-picker-options').forEach(el => {
        if (el instanceof HTMLElement) {
          const htmlEl = el;
          htmlEl.style.background = '#ffffff';
          htmlEl.style.border = '1px solid #cccccc';
          htmlEl.style.borderRadius = '3px';
          htmlEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        }
      });
      
      // Цветовые палитры
      toolbar.querySelectorAll('.ql-color .ql-picker-options, .ql-background .ql-picker-options').forEach(el => {
        if (el instanceof HTMLElement) {
          const htmlEl = el;
          htmlEl.style.background = '#ffffff';
          htmlEl.style.border = '1px solid #cccccc';
          htmlEl.style.borderRadius = '3px';
          htmlEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
          htmlEl.style.padding = '4px';
          htmlEl.style.left = '0';
          htmlEl.style.transform = 'none';
          htmlEl.style.position = 'absolute';
          
          // Восстанавливаем цвета для цветовых квадратиков
          htmlEl.querySelectorAll('.ql-picker-item').forEach(item => {
            if (item instanceof HTMLElement) {
              const itemEl = item;
              const dataValue = itemEl.getAttribute('data-value');
              
              // Устанавливаем размеры
              itemEl.style.width = '16px';
              itemEl.style.height = '16px';
              itemEl.style.display = 'inline-block';
              itemEl.style.border = '1px solid #cccccc';
              itemEl.style.borderRadius = '2px';
              itemEl.style.margin = '1px';
              
              // Восстанавливаем оригинальные цвета
              if (dataValue) {
                itemEl.style.backgroundColor = dataValue;
                itemEl.style.background = dataValue;
              }
            }
          });
        }
      });
    }
  }, []);

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
        const data = await response.json();
        const note = data.note;
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
        setAttachments(Array.isArray(data.rows) ? data.rows : []);
      }
    } catch (error) {
      console.error('Error loading attachments:', error);
      setAttachments([]);
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

  // Новый endpoint для обновления/перемещения заметки
  const NOTE_UPDATE_ENDPOINT = '/api/notes/update';

  const handleSaveNote = async () => {
    if (!selectedNote || !selectedNote.id) {
      alert('Не выбрана заметка для сохранения!');
      return;
    }
    setIsSaving(true);
    const formData = new FormData();
    formData.append('note_id', selectedNote.id);
    formData.append('title', noteTitle);
    formData.append('content', noteContent);
    formData.append('type', 'note');
    try {
      const response = await fetch(NOTE_UPDATE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
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
    const formData = new FormData();
    formData.append('title', 'Новая заметка');
    formData.append('content', '');
    formData.append('parent_id', selectedNote?.id || '');
    formData.append('type', 'note');
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      if (response.ok) {
        await loadNotes();
        const data = await response.json();
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
    const allNotes = flattenNotes(notes);
    const note = allNotes.find(n => n.id === noteId);
    if (!note) {
      alert('Заметка не найдена!');
      return;
    }
    const formData = new FormData();
    formData.append('note_id', noteId);
    formData.append('title', note.title || 'Без названия');
    formData.append('content', note.content || '');
    formData.append('parent_id', newParentId || '');
    formData.append('type', note.type || 'note');
    try {
      const response = await fetch(NOTE_UPDATE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
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

  const handleAttachmentClick = async (blob: Blob) => {
    try {
      const response = await fetch(`/api/blobs/${blob.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        alert('Ошибка загрузки файла: ' + response.statusText);
        return;
      }
      const fileBlob = await response.blob();
      const url = URL.createObjectURL(fileBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = blob.filename || blob.name || 'Без имени';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        link.remove();
      }, 1000);
    } catch (e) {
      alert('Ошибка скачивания файла: ' + e);
    }
  };

  const renderNoteTree = (notes: Note[], level = 0) => {
    const safeNotes = Array.isArray(notes) ? notes : [];
    return safeNotes.map(note => (
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
  const safeNotes = Array.isArray(notes) ? notes : [];

  return (
    <div className="flex flex-col md:flex-row h-screen min-h-screen bg-[#272727] text-[#ccc]">
      {/* Sidebar (offcanvas on mobile) */}
      <div className={`fixed inset-0 z-30 bg-black bg-opacity-40 transition-opacity md:hidden ${sidebarOpen ? 'block' : 'hidden'}`} onClick={() => setSidebarOpen(false)} />
      <div className={`fixed top-0 left-0 h-full w-4/5 max-w-xs bg-[#1f1f1f] border-r border-[#313131] z-40 transform transition-transform duration-300 md:static md:translate-x-0 md:w-80 md:block ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:h-auto`}>
        <div className="p-4 border-b border-[#454545] flex items-center justify-between">
          <h1 className="text-xl font-bold">База знаний</h1>
          <div className="flex items-center space-x-2">
            <Button onClick={handleCreateNote} size="sm" className="bg-[#262626] border border-[#313131] text-[#ccc] hover:bg-[#313131] shadow-lg">
              <Plus size={16} />
            </Button>
            <Button onClick={() => setSidebarOpen(false)} size="icon" className="md:hidden bg-[#262626] border border-[#313131] text-[#ccc] hover:bg-[#313131] shadow-lg">
              <Menu size={24} />
            </Button>
          </div>
        </div>
        {/* Header */}
        <div className="p-4 border-b border-[#454545]">
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
          {searchTerm.trim() ? renderFlatNoteList(filteredNotesFlat) : renderNoteTree(safeNotes)}
        </ScrollArea>
      </div>
      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full md:w-auto">
        {/* Header */}
        <div className="bg-[#1f1f1f] border-b border-[#454545] p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-[#313131]">
              <ArrowLeft size={20} />
            </Button>
            {/* Кнопка вызова сайдбара (Menu) только на мобильных */}
            <Button onClick={() => setSidebarOpen(true)} size="icon" className="md:hidden bg-[#262626] border border-[#313131] text-[#ccc] hover:bg-[#313131] shadow-lg">
              <Menu size={24} />
            </Button>
          </div>
          {/* Кнопки Сохранить и Прикрепить справа */}
          <div className="flex items-center space-x-2">
            <Button onClick={handleSaveNote} disabled={isSaving} style={{padding: '5px', border: '2px solid #22c55e', background: 'transparent'}}>
              <img src="/save.png" alt="Сохранить" style={{width: '20px', height: '20px'}} />
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} style={{padding: '5px', border: '2px solid #22c55e', background: 'transparent'}}>
              <img src="/clip.png" alt="Прикрепить файл" style={{width: '20px', height: '20px'}} />
            </Button>
            <input ref={fileInputRef} type="file" multiple onChange={handleFileUpload} className="hidden" />
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
        {/* Toolbar */}
        <div className="bg-[#1f1f1f] border-b border-[#454545] p-2 quill-toolbar-custom">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {/* Удалить отображение названия заметки из шапки main-content (selectedNote.title) */}
            </div>
          </div>
        </div>
        {/* Editor */}
        <div className="flex-1 p-2 md:p-4 bg-[#262626] text-[#ccc] quill-editor-custom">
          <div className="h-full flex flex-col">
            <Input value={noteTitle} onChange={e => setNoteTitle(e.target.value)} placeholder="Название заметки" className="mb-2 md:mb-4 bg-[#1f1f1f] border-[#313131] text-[#fff] font-bold text-base md:text-lg" />
            <ReactQuill theme="snow" value={noteContent} onChange={setNoteContent} modules={quillModules} formats={quillFormats} className="flex-1 quill-main quill-container-custom" style={{ minHeight: '200px', height: 'auto', width: '100%' }} />
          </div>
        </div>
        {/* Вложения */}
        {Array.isArray(attachments) && attachments.length > 0 && (
          <div className="attachment-bar w-full bg-[#23272e] rounded-b-lg border-t-0 mt-0 p-0">
            <h3 className="text-base md:text-lg font-semibold mb-1 md:mb-2 ml-1">Вложения</h3>
            <div className="flex flex-row flex-nowrap overflow-x-auto gap-2 md:gap-4 px-2">
              {attachments.map((blob) => {
                const mime = typeof blob.mime_type === 'string' ? blob.mime_type : '';
                const name = typeof blob.filename === 'string' ? blob.filename : (typeof blob.name === 'string' ? blob.name : 'Без имени');
                // Иконка по формату
                let icon = null;
                if (mime.includes('pdf') || /\.pdf$/i.test(name)) {
                  icon = (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#e53935"/><text x="50%" y="60%" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold" fontFamily="Arial">PDF</text></svg>
                  );
                } else if (mime.includes('word') || /\.(docx?|rtf)$/i.test(name)) {
                  icon = (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#1976d2"/><text x="50%" y="60%" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold" fontFamily="Arial">DOC</text></svg>
                  );
                } else if (mime.includes('excel') || /\.(xlsx?|csv)$/i.test(name)) {
                  icon = (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#388e3c"/><text x="50%" y="60%" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold" fontFamily="Arial">XLS</text></svg>
                  );
                } else if (mime.includes('powerpoint') || /\.(pptx?)$/i.test(name)) {
                  icon = (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#f57c00"/><text x="50%" y="60%" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold" fontFamily="Arial">PPT</text></svg>
                  );
                } else if (mime.startsWith('image/') || /\.(jpe?g|png|gif|bmp|svg|webp)$/i.test(name)) {
                  icon = (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#90caf9"/><text x="50%" y="60%" textAnchor="middle" fill="#1565c0" fontSize="13" fontWeight="bold" fontFamily="Arial">IMG</text></svg>
                  );
                } else if (mime.startsWith('video/') || /\.(mp4|avi|mov|wmv|mkv|webm)$/i.test(name)) {
                  icon = (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#7e57c2"/><text x="50%" y="60%" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold" fontFamily="Arial">VID</text></svg>
                  );
                } else if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|flac|aac)$/i.test(name)) {
                  icon = (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#26a69a"/><text x="50%" y="60%" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold" fontFamily="Arial">AUD</text></svg>
                  );
                } else if (mime.includes('zip') || /\.(zip|rar|7z|tar|gz)$/i.test(name)) {
                  icon = (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#8d6e63"/><text x="50%" y="60%" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold" fontFamily="Arial">ZIP</text></svg>
                  );
                } else if (mime.startsWith('text/') || /\.(txt|md|csv|log)$/i.test(name)) {
                  icon = (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#bdbdbd"/><text x="50%" y="60%" textAnchor="middle" fill="#333" fontSize="13" fontWeight="bold" fontFamily="Arial">TXT</text></svg>
                  );
                } else {
                  icon = (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#607d8b"/><text x="50%" y="60%" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold" fontFamily="Arial">FILE</text></svg>
                  );
                }
                // Предпросмотр
                let preview = null;
                if (mime.startsWith('image/')) {
                  preview = (
                    <AttachmentPreview blobId={blob.id} mime={mime} token={token} filename={name} />
                  );
                } else if (mime.includes('pdf')) {
                  preview = (
                    <AttachmentPreview blobId={blob.id} mime={mime} token={token} filename={name} isPdf />
                  );
                } else if (mime.startsWith('text/')) {
                  preview = (
                    <AttachmentPreview blobId={blob.id} mime={mime} token={token} filename={name} isText />
                  );
                }
                return (
                  <div
                    key={blob.id}
                    className="attachment-item group"
                  >
                    <div className="icon">{icon}</div>
                    <div
                      className="filename cursor-pointer hover:text-blue-400"
                      title={name}
                      onClick={() => handleAttachmentClick(blob)}
                      style={{textDecoration: 'underline'}}
                    >
                      {name}
                    </div>
                    {preview}
                    <div
                      className="text-xs mt-1 cursor-pointer text-red-500 hover:underline"
                      style={{fontSize: '11px'}}
                      onClick={() => {
                        if (window.confirm('Удалить вложение безвозвратно?')) handleDeleteAttachment(blob.id);
                      }}
                    >Удалить</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wiki; 

// Компонент предпросмотра вложения
function AttachmentPreview({ blobId, mime, token, filename, isPdf, isText }: { blobId: string, mime: string, token: string, filename: string, isPdf?: boolean, isText?: boolean }) {
  const [url, setUrl] = React.useState<string | null>(null);
  const [text, setText] = React.useState<string | null>(null);
  React.useEffect(() => {
    let active = true;
    if (isText) {
      fetch(`/api/blobs/${blobId}`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.text())
        .then(data => {
          if (!active) return;
          setText(typeof data === 'string' ? data.slice(0, 1000) : '');
        });
    } else {
      fetch(`/api/blobs/${blobId}`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.blob())
        .then(data => {
          if (!active) return;
          setUrl(URL.createObjectURL(data));
        });
    }
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [blobId, token]);
  if (isPdf && url) {
    return <iframe src={url} title={filename} style={{ width: '100%', height: 120, border: 'none', background: '#fff' }} />;
  }
  if (mime.startsWith('image/') && url) {
    return <img src={url} alt={filename} style={{ maxWidth: '100%', maxHeight: 120, borderRadius: 8, margin: '0 auto' }} />;
  }
  if (isText && text) {
    return <pre style={{ maxHeight: 120, overflow: 'auto', background: '#18181b', color: '#fff', borderRadius: 8, padding: 8 }}>{text}</pre>;
  }
  return null;
} 