/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { ListItem } from '../types';
import { ListPlus, Trash2, Save, Loader2, ListOrdered, AlertCircle, Upload, X, Image as ImageIcon, Layers, Sparkles } from 'lucide-react';
import { compressAndEncodeImage } from '../lib/imageUtils';
import { useConfirm } from './ConfirmDialog';

interface ListSectionProps {
  sectionTitle: string;
  description: string;
  configKey: 'services' | 'whyChoose' | 'process';
  defaultItems: ListItem[];
  listData: ListItem[] | null;
  onSave: (key: 'services' | 'whyChoose' | 'process', newItems: ListItem[]) => void;
}

export default function ListSection({
  sectionTitle,
  description,
  configKey,
  defaultItems,
  listData,
  onSave
}: ListSectionProps) {
  const { confirm } = useConfirm();
  const [items, setItems] = useState<ListItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Background and Parallax configuration states
  const [bgType, setBgType] = useState<'image' | 'video'>('image');
  const [bgImage, setBgImage] = useState<string>('');
  const [bgVideoUrl, setBgVideoUrl] = useState<string>('');
  const [uploadingVideo, setUploadingVideo] = useState<boolean>(false);
  const [parallaxEnabled, setParallaxEnabled] = useState<boolean>(false);
  const [parallaxSpeed, setParallaxSpeed] = useState<number>(0.12);
  const [bgOpacity, setBgOpacity] = useState<number>(0.18);

  useEffect(() => {
    const fetchServicesExtra = async () => {
      if (configKey === 'services') {
        try {
          const snap = await getDoc(doc(db, 'siteConfig', 'services'));
          if (snap.exists()) {
            const data = snap.data();
            setBgType(data.bgType || 'image');
            setBgImage(data.bgImage || '');
            setBgVideoUrl(data.bgVideoUrl || '');
            setParallaxEnabled(data.parallaxEnabled || false);
            setParallaxSpeed(data.parallaxSpeed !== undefined ? data.parallaxSpeed : 0.12);
            setBgOpacity(data.bgOpacity !== undefined ? data.bgOpacity : 0.18);
          }
        } catch (err) {
          console.error("Error loading services extra config:", err);
        }
      }
    };
    fetchServicesExtra();
  }, [configKey]);

  const handleSectionBgFileChange = async (file: File) => {
    try {
      const base64 = await compressAndEncodeImage(file, 1200, 0.8);
      setBgImage(base64);
    } catch (err) {
      console.error("Error compressing section background:", err);
      alert('Failed to compress background image: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleSectionBgVideoChange = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      alert("Selected video is larger than 8MB. Please select a smaller video or paste a streaming URL directly.");
      return;
    }
    setUploadingVideo(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setBgVideoUrl(e.target.result as string);
        }
        setUploadingVideo(false);
      };
      reader.onerror = () => {
        alert("Failed to read video file.");
        setUploadingVideo(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Video conversion failed:", err);
      alert("Error parsing video file.");
      setUploadingVideo(false);
    }
  };

  useEffect(() => {
    if (listData && listData.length > 0) {
      setItems(listData);
    } else {
      setItems(defaultItems);
    }
  }, [listData, defaultItems]);

  const handleFieldChange = (idx: number, field: keyof ListItem, value: string) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  };

  const addItem = () => {
    setItems([...items, { title: '', desc: '' }]);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) {
      alert('You must have at least one item.');
      return;
    }
    confirm({
      title: 'Remove List Item',
      message: `Are you sure you want to remove item #${idx + 1} ("${items[idx]?.title || 'Untitled'}") from the list draft?`,
      type: 'delete',
      onConfirm: async () => {
        const updated = items.filter((_, i) => i !== idx);
        setItems(updated);
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    confirm({
      title: `Save ${sectionTitle}`,
      message: `Are you sure you want to save all modified items in the "${sectionTitle}" section to Firestore?`,
      type: 'save',
      onConfirm: async () => {
        setSaving(true);
        setError(null);
        try {
          try {
            const extraData = configKey === 'services' ? { bgType, bgImage, bgVideoUrl, parallaxEnabled, parallaxSpeed, bgOpacity } : {};
            await setDoc(doc(db, 'siteConfig', configKey), { items, ...extraData }, { merge: true });
          } catch (dbErr) {
            handleFirestoreError(dbErr, OperationType.WRITE, `siteConfig/${configKey}`);
          }
          onSave(configKey, items);
        } catch (err) {
          console.error(`Error saving list config for ${configKey}:`, err);
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setSaving(false);
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in max-w-4xl">
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 p-4 rounded-2xl flex items-start gap-3 text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold">Failed to Save {sectionTitle}</h4>
            <p className="text-xs mt-1 leading-relaxed break-words font-mono">
              {error}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-3xl p-6 md:p-8 shadow-sm space-y-8">
        <div className="border-b border-slate-100 dark:border-slate-700 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2.5">
              <ListOrdered className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              {sectionTitle}
            </h2>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={addItem}
            className="self-start md:self-center flex items-center gap-2 px-4 py-2.5 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-950 text-violet-600 dark:text-violet-400 text-xs font-bold rounded-xl border border-violet-100 dark:border-violet-900/50 transition-all cursor-pointer"
          >
            <ListPlus className="w-4 h-4" />
            <span>Add List Block</span>
          </button>
        </div>

        {/* List blocks */}
        <div className="space-y-6">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="relative p-5 bg-slate-50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-750 rounded-2xl space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Block Item #{idx + 1}
                </span>

                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="p-2 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                  title="Delete Block"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Title</label>
                  <input
                    type="text"
                    required
                    value={item.title || ''}
                    onChange={(e) => handleFieldChange(idx, 'title', e.target.value)}
                    placeholder="Enter block header..."
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Description</label>
                  <textarea
                    required
                    rows={3}
                    value={item.desc || ''}
                    onChange={(e) => handleFieldChange(idx, 'desc', e.target.value)}
                    placeholder="Enter detailed description block..."
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm leading-relaxed"
                  />
                </div>

                {(configKey === 'whyChoose' || configKey === 'services') && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Block Image</label>
                    <div className="flex items-center gap-4">
                      {item.imageUrl ? (
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 flex-shrink-0">
                          <img
                            src={item.imageUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleFieldChange(idx, 'imageUrl', '')}
                            className="absolute top-1 right-1 p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer"
                            title="Remove Image"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-950/20 flex-shrink-0">
                          <ImageIcon className="w-8 h-8" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            id={`image-upload-${idx}`}
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const base64 = await compressAndEncodeImage(file, 400, 0.85);
                                  handleFieldChange(idx, 'imageUrl', base64);
                                } catch (err) {
                                  console.error("Error processing image upload:", err);
                                  alert("Failed to process image. Make sure it's a valid image file.");
                                }
                              }
                            }}
                          />
                          <label
                            htmlFor={`image-upload-${idx}`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer active:scale-95"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>{item.imageUrl ? 'Change Image' : 'Upload Image'}</span>
                          </label>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 block">Or Paste Image/Media Link (URL)</span>
                          <input
                            type="url"
                            value={item.imageUrl?.startsWith('data:') ? '' : item.imageUrl || ''}
                            onChange={(e) => handleFieldChange(idx, 'imageUrl', e.target.value)}
                            placeholder="e.g. https://example.com/image.jpg"
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-violet-500"
                          />
                        </div>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500">
                          Supports file uploads (PNG, JPG, SVG as Base64) or direct web/video URLs.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {item.key && (
                  <input type="hidden" value={item.key} />
                )}
              </div>
            </div>
          ))}
        </div>

        {configKey === 'services' && (
          <div className="p-6 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-violet-500" />
                  Section Backdrop & Parallax Customizer
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Upload a beautiful industrial backdrop or video specifically for the "What We Offer" section, and enable dynamic scroll parallax scrolling!
                </p>
              </div>

              {/* Segmented Selector for Type */}
              <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl w-fit border border-slate-200/50 dark:border-slate-800/60 self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setBgType('image')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    bgType === 'image'
                      ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Image
                </button>
                <button
                  type="button"
                  onClick={() => setBgType('video')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    bgType === 'video'
                      ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Video
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800/60">
              {bgType === 'image' ? (
                /* Image Upload Column */
                <div className="space-y-3">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">Section Bg Image</label>
                  <div className="flex items-center gap-4">
                    {bgImage ? (
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-250 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 flex-shrink-0 shadow-sm">
                        <img
                          src={bgImage}
                          alt="Section Background"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setBgImage('')}
                          className="absolute top-1 right-1 p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer shadow"
                          title="Remove Backdrop"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-950/20 flex-shrink-0">
                        <ImageIcon className="w-9 h-9" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          id="section-bg-upload"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleSectionBgFileChange(file);
                          }}
                        />
                        <label
                          htmlFor="section-bg-upload"
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{bgImage ? 'Change Image' : 'Upload Image'}</span>
                        </label>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 block">Or Paste Custom Image Link (URL)</span>
                        <input
                          type="url"
                          value={bgImage.startsWith('data:') ? '' : bgImage}
                          onChange={(e) => setBgImage(e.target.value)}
                          placeholder="e.g. https://example.com/section_bg.jpg"
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-violet-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Video Upload Column */
                <div className="space-y-3">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">Section Bg Video</label>
                  <div className="flex items-center gap-4">
                    {bgVideoUrl ? (
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-250 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 flex-shrink-0 shadow-sm flex items-center justify-center bg-slate-900">
                        <video
                          src={bgVideoUrl}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          autoPlay
                          loop
                        />
                        <button
                          type="button"
                          onClick={() => setBgVideoUrl('')}
                          className="absolute top-1 right-1 p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer shadow z-10"
                          title="Remove Background Video"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-950/20 flex-shrink-0">
                        {uploadingVideo ? (
                          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                        ) : (
                          <ImageIcon className="w-9 h-9" />
                        )}
                      </div>
                    )}

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          id="section-bg-video-upload"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleSectionBgVideoChange(file);
                          }}
                        />
                        <label
                          htmlFor="section-bg-video-upload"
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{bgVideoUrl ? 'Change Video' : 'Upload MP4 Video'}</span>
                        </label>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 block">Or Paste Direct Video Link (MP4, etc.)</span>
                        <input
                          type="url"
                          value={bgVideoUrl.startsWith('data:') ? '' : bgVideoUrl}
                          onChange={(e) => setBgVideoUrl(e.target.value)}
                          placeholder="e.g. https://example.com/industrial_loop.mp4"
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-violet-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Parallax Configuration Column */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">Background Opacity</label>
                    <span className="font-mono text-xs font-bold text-violet-600 dark:text-violet-400">{Math.round(bgOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="1.00"
                    step="0.01"
                    value={bgOpacity}
                    onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-600"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-medium">
                    <span>Faint (1%)</span>
                    <span>Solid (100%)</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">Parallax Scrolling</label>
                  <div className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Sparkles className={`w-4 h-4 transition-colors ${parallaxEnabled ? 'text-amber-500' : 'text-slate-400'}`} />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Enable Parallax</span>
                        <span className="text-[10px] text-slate-400">Section backdrop glides slower on scroll</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={parallaxEnabled}
                        onChange={(e) => setParallaxEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:border-slate-600 peer-checked:bg-violet-600" />
                    </label>
                  </div>
                </div>

                {parallaxEnabled && (
                  <div className="space-y-1.5 animate-fade-in">
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-500">
                      <span>Parallax Speed Multiplier</span>
                      <span className="font-mono text-violet-600 dark:text-violet-400">{parallaxSpeed.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.02"
                      max="0.40"
                      step="0.01"
                      value={parallaxSpeed}
                      onChange={(e) => setParallaxSpeed(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-600"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-medium">
                      <span>Subtle (0.02)</span>
                      <span>Strong (0.40)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-75 text-white font-bold rounded-2xl shadow-lg shadow-violet-600/10 hover:shadow-violet-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Saving List Blocks...</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
