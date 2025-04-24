import { useState, useEffect, useRef } from "react";
import "./Organize.css";

const COLORS = [
    "#f28b82", "#fbbc04", "#fff475", "#ccff90", "#a7ffeb", "#cbf0f8", "#aecbfa", "#d7aefb",
    "#fdcfe8", "#e6c9a8", "#e8eaed", "#dadce0", "#1a73e8", "#34a853", "#f9ab00", "#d93025",
    "#f7c6c7", "#fdcfe8", "#e0c3fc", "#d7aefb", "#aecbfa", "#cbf0f8", "#a7ffeb", "#ccff90"
  ];

interface OrganizeField {
  folderName: string;
  color: string;
  showDropdown: boolean;
}

const Organize = () => {
  const [organizeFields, setOrganizeFields] = useState<OrganizeField[]>([
    { folderName: "", color: COLORS[0], showDropdown: false }
  ]);
  const dropdownRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isOutside = dropdownRefs.current.every(
        ref => !ref || !ref.contains(event.target as Node)
      );
      
      if (isOutside) {
        setOrganizeFields(prevFields => 
          prevFields.map(field => ({ ...field, showDropdown: false }))
        );
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addOrganizeField = () => {
    setOrganizeFields((prevFields) => [
      ...prevFields,
      { folderName: "", color: COLORS[0], showDropdown: false }
    ]);
  };

  const handleOrganizeInputChange = (
    index: number,
    field: keyof OrganizeField,
    value: string | boolean
  ) => {
    const updatedFields = [...organizeFields];
    if (field === 'folderName' && typeof value === 'string') {
      updatedFields[index].folderName = value;
    } else if (field === 'color' && typeof value === 'string') {
      updatedFields[index].color = value;
    } else if (field === 'showDropdown' && typeof value === 'boolean') {
      updatedFields[index].showDropdown = value;
    }
    setOrganizeFields(updatedFields);
  };

  const handleColorSelect = (index: number, color: string) => {
    const updatedFields = [...organizeFields];
    updatedFields[index].color = color;
    updatedFields[index].showDropdown = false;
    setOrganizeFields(updatedFields);
  };

  const toggleDropdown = (index: number) => {
    const updatedFields = organizeFields.map((field, i) => ({
      ...field,
      showDropdown: i === index ? !field.showDropdown : false,
    }));
    setOrganizeFields(updatedFields);
  };

  const colorRows = [
    COLORS.slice(0, 8),
    COLORS.slice(8, 16),
    COLORS.slice(16, 24)
  ];

  return (
    <div className="organize-page">
      <h2 className="organize-title">Organize Files</h2>
      {organizeFields.map((field, index) => (
        <div key={index} className="input-pair">
          <div 
            className="color-picker-wrapper"
            ref={el => {
              dropdownRefs.current[index] = el;
            }}
          >
            <div
              className={`color-circle ${field.showDropdown ? 'selected' : ''}`}
              style={{ backgroundColor: field.color }}
              onClick={() => toggleDropdown(index)}
            />
            {field.showDropdown && (
              <div className="color-dropdown">
                {colorRows.map((row, rowIndex) => (
                  <div key={rowIndex} className="color-row">
                    {row.map((color) => (
                      <div
                        key={color}
                        className="color-circle"
                        style={{ backgroundColor: color }}
                        onClick={() => handleColorSelect(index, color)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          <input
            type="text"
            placeholder="Folder Name"
            className="input-folder-name"
            value={field.folderName}
            onChange={(e) =>
              handleOrganizeInputChange(index, "folderName", e.target.value)
            }
          />
        </div>
      ))}
      <div className="button-container">
        <button className="add-button" onClick={addOrganizeField}>
          +
        </button>
      </div>
      <button className="organize-my-documents-button">Organize my documents!</button>
    </div>
  );
};

export default Organize;