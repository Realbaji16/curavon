import { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface HealthListEditorProps {
  label: string;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  placeholder?: string;
  hideSensitiveValues?: boolean;
}

export function HealthListEditor({
  label,
  items,
  onAdd,
  onRemove,
  placeholder,
  hideSensitiveValues = false,
}: HealthListEditorProps) {
  const [input, setInput] = useState('');
  const [revealed, setRevealed] = useState(false);

  const handleAdd = () => {
    if (!input.trim()) return;
    onAdd(input);
    setInput('');
  };

  return (
    <div className="health-list-editor">
      <p className="health-list-label">{label}</p>
      {hideSensitiveValues ? (
        <button
          type="button"
          className="health-list-reveal"
          onClick={() => setRevealed((v) => !v)}
        >
          {revealed ? 'Hide details' : 'Sensitive detail hidden'}
        </button>
      ) : null}
      <div className="health-list-chips">
        {items.map((item, i) => (
          <span key={`${item}-${i}`} className="health-list-chip">
            {hideSensitiveValues && !revealed ? 'Sensitive detail hidden' : item}
            <button
              type="button"
              className="health-list-chip-remove"
              onClick={() => onRemove(i)}
              aria-label={hideSensitiveValues && !revealed ? `Remove ${label} item ${i + 1}` : `Remove ${item}`}
            >
              <X size={14} />
            </button>
          </span>
        ))}
        {items.length === 0 && <span className="health-list-empty">None added yet</span>}
      </div>
      <div className="health-list-add">
        <input
          type="text"
          className="health-list-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder ?? `Add ${label.toLowerCase()}`}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button type="button" className="health-list-add-btn" onClick={handleAdd} aria-label={`Add ${label}`}>
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}
