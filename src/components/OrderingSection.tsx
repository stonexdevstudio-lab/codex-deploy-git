/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GripVertical, ArrowUp, ArrowDown, Save, Sparkles, HelpCircle } from 'lucide-react';

interface OrderingSectionProps {
  initialSectionsOrder: string[];
  onSaveOrder: (newOrder: string[]) => void;
  saving: boolean;
}

const SECTION_METADATA: { [key: string]: { name: string; desc: string; color: string } } = {
  about: {
    name: 'About Stonex',
    desc: 'The corporate history, quarry origins, core values, and statistics.',
    color: 'border-l-amber-500 bg-amber-50/20 dark:bg-amber-950/10'
  },
  services: {
    name: 'What We Offer (Services)',
    desc: 'Core services block grid (Trading, Rentals, Materials, PPE).',
    color: 'border-l-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/10'
  },
  products: {
    name: 'Product Range',
    desc: 'The interactive showcase list of products, materials, and categories.',
    color: 'border-l-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10'
  },
  'why-us': {
    name: 'Why Choose Us',
    desc: 'Company track records, corporate compliance traits, and certifications.',
    color: 'border-l-violet-500 bg-violet-50/20 dark:bg-violet-950/10'
  },
  process: {
    name: 'How It Works',
    desc: 'Step-by-step pipeline from planning/consultation to site drop-off.',
    color: 'border-l-sky-500 bg-sky-50/20 dark:bg-sky-950/10'
  },
  announcements: {
    name: 'Announcements',
    desc: 'Horizontal ticker banner displaying corporate news, alerts, and alerts.',
    color: 'border-l-rose-500 bg-rose-50/20 dark:bg-rose-950/10'
  },
  contact: {
    name: 'Contact & Request a Quote',
    desc: 'Active phone lines, email, address, working hours, and request form.',
    color: 'border-l-teal-500 bg-teal-50/20 dark:bg-teal-950/10'
  }
};

const DEFAULT_ORDER = ['about', 'services', 'products', 'why-us', 'process', 'announcements', 'contact'];

export default function OrderingSection({
  initialSectionsOrder,
  onSaveOrder,
  saving
}: OrderingSectionProps) {
  const [sections, setSections] = useState<string[]>(DEFAULT_ORDER);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (initialSectionsOrder && initialSectionsOrder.length > 0) {
      // Filter out any invalid items just in case, and fill in missing ones
      const cleaned = initialSectionsOrder.filter(id => id in SECTION_METADATA);
      const missing = DEFAULT_ORDER.filter(id => !cleaned.includes(id));
      setSections([...cleaned, ...missing]);
    } else {
      setSections(DEFAULT_ORDER);
    }
  }, [initialSectionsOrder]);

  // Native Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Critical for drag-and-drop inside sandboxed iframes and various browser engines
    e.dataTransfer.setData('text/plain', index.toString());
    
    const target = e.currentTarget as HTMLElement;
    setTimeout(() => {
      target.style.opacity = '0.3';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    // Optional: could clear dragOverIndex, but keeping it on dragover keeps drop targets visual
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    
    // Retrieve index from state, fallback to dataTransfer if state gets desynchronized
    let sourceIndex = draggedIndex;
    if (sourceIndex === null) {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (dataStr) {
        sourceIndex = parseInt(dataStr, 10);
      }
    }

    if (sourceIndex === null || sourceIndex === index) {
      setDragOverIndex(null);
      return;
    }

    const reordered = [...sections];
    const [removed] = reordered.splice(sourceIndex, 1);
    reordered.splice(index, 0, removed);

    setSections(reordered);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Accessibility/Fallback Move Handlers
  const moveUp = (index: number) => {
    if (index === 0) return;
    const reordered = [...sections];
    const temp = reordered[index];
    reordered[index] = reordered[index - 1];
    reordered[index - 1] = temp;
    setSections(reordered);
  };

  const moveDown = (index: number) => {
    if (index === sections.length - 1) return;
    const reordered = [...sections];
    const temp = reordered[index];
    reordered[index] = reordered[index + 1];
    reordered[index + 1] = temp;
    setSections(reordered);
  };

  const handleReset = () => {
    setSections(DEFAULT_ORDER);
  };

  const handleSave = () => {
    onSaveOrder(sections);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-3xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-850 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Dynamic Homepage Organizer
            </h2>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
              Drag and drop section blocks to rearrange the customer portal homepage. The main site menu and header nav links will automatically update to reflect the same sequence!
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-slate-200 px-3 py-1.5 rounded-full cursor-pointer transition-all self-start"
          >
            Reset Default Order
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {sections.map((sectionId, index) => {
          const meta = SECTION_METADATA[sectionId] || { name: sectionId, desc: '', color: 'border-l-slate-400' };
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;

          return (
            <div
              key={sectionId}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onDrop={(e) => handleDrop(e, index)}
              className={`p-4 rounded-2xl border-l-4 border transition-all duration-200 flex items-center justify-between ${meta.color} ${
                isDragging ? 'opacity-30 border-dashed border-slate-300 dark:border-slate-600 scale-[0.98]' : ''
              } ${
                isDragOver ? 'border-violet-400 border-2 scale-[1.01] bg-violet-50/10 dark:bg-violet-950/5' : 'border-slate-100 dark:border-slate-700/60'
              } bg-white dark:bg-slate-800 hover:shadow-sm`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Drag Grip Handle */}
                <div className="text-slate-350 hover:text-slate-500 cursor-grab active:cursor-grabbing p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/40 shrink-0">
                  <GripVertical className="w-5 h-5" />
                </div>
                
                {/* Position Badge */}
                <div className="w-6 h-6 rounded-full bg-slate-950 dark:bg-slate-900 text-white dark:text-slate-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                  {index + 1}
                </div>

                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{meta.name}</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{meta.desc}</p>
                </div>
              </div>

              {/* Action buttons (Move Up / Down fallback) */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveUp(index)}
                  className={`p-2 rounded-xl border transition-all ${
                    index === 0
                      ? 'border-slate-100/30 text-slate-200 dark:text-slate-700 cursor-not-allowed'
                      : 'border-slate-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer'
                  }`}
                  title="Move Section Up"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={index === sections.length - 1}
                  onClick={() => moveDown(index)}
                  className={`p-2 rounded-xl border transition-all ${
                    index === sections.length - 1
                      ? 'border-slate-100/30 text-slate-200 dark:text-slate-700 cursor-not-allowed'
                      : 'border-slate-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer'
                  }`}
                  title="Move Section Down"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Save Action Footer */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs px-5 py-3 rounded-2xl cursor-pointer transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Apply Layout Sequence'}
          <Save className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
