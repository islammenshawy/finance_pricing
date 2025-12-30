import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface EditableTextCellProps {
  value: string;
  onChange: (newValue: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

/**
 * Reusable editable text cell for inline editing
 */
export function EditableTextCell({
  value,
  onChange,
  disabled = false,
  placeholder = 'Click to edit',
  maxLength,
  className = '',
}: EditableTextCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    if (editValue !== value) {
      onChange(editValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Tab') {
      handleSave();
    }
  };

  if (disabled) {
    return (
      <span className={`text-muted-foreground ${className}`}>
        {value || placeholder}
      </span>
    );
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        maxLength={maxLength}
        className={`w-full px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${className}`}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <span
      className={`cursor-pointer hover:bg-muted/50 px-2 py-1 rounded ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
    >
      {value || <span className="text-muted-foreground">{placeholder}</span>}
    </span>
  );
}
