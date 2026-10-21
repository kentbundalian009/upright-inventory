import React, { useState, useEffect, useRef } from 'react';
import { 
    Crop, RotateCw, RotateCcw, FlipHorizontal, Check, 
    X, RefreshCw, ZoomIn, ZoomOut, Move, Maximize2 
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/**
 * ImageCropperModal
 * High-performance, zero-dependency, pure HTML5 Canvas & React 19 image cropper.
 * Features:
 * - Draggable crop window with 8 resize handles
 * - Aspect ratio presets: Free, 1:1, 4:3, 16:9, 3:2
 * - 90-degree clockwise / counter-clockwise rotation
 * - Horizontal flip
 * - High-resolution Canvas export with exact PNG dataURL
 */
export default function ImageCropperModal({ isOpen, imageSrc, onClose, onApplyCrop }) {
    const { isDark } = useTheme();

    const [crop, setCrop] = useState({ x: 10, y: 10, width: 80, height: 80 });
    const [aspectRatio, setAspectRatio] = useState('free');
    const [rotation, setRotation] = useState(0);
    const [isFlippedH, setIsFlippedH] = useState(false);
    const [naturalDims, setNaturalDims] = useState({ width: 0, height: 0 });

    const [isDragging, setIsDragging] = useState(false);
    const [resizeHandle, setResizeHandle] = useState(null);

    const containerRef = useRef(null);
    const imgRef = useRef(null);
    const dragStart = useRef({ mouseX: 0, mouseY: 0, crop: { x: 10, y: 10, width: 80, height: 80 } });

    // Reset crop state on open
    useEffect(() => {
        if (isOpen && imageSrc) {
            setCrop({ x: 10, y: 10, width: 80, height: 80 });
            setAspectRatio('free');
            setRotation(0);
            setIsFlippedH(false);

            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                setNaturalDims({ width: img.naturalWidth, height: img.naturalHeight });
            };
            img.src = imageSrc;
        }
    }, [isOpen, imageSrc]);

    // Apply aspect ratio preset
    const handleSetAspectRatio = (ratioStr) => {
        setAspectRatio(ratioStr);
        if (ratioStr === 'free') return;
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        let targetRatio = 1;
        if (ratioStr === '1:1') targetRatio = 1;
        else if (ratioStr === '4:3') targetRatio = 4 / 3;
        else if (ratioStr === '16:9') targetRatio = 16 / 9;
        else if (ratioStr === '3:2') targetRatio = 3 / 2;

        const containerRatio = rect.width / rect.height;
        let w = 70;
        let h = (w * containerRatio) / targetRatio;
        if (h > 90) {
            h = 80;
            w = (h * targetRatio) / containerRatio;
        }

        const newX = Math.max(0, (100 - w) / 2);
        const newY = Math.max(0, (100 - h) / 2);

        setCrop({
            x: Math.round(newX),
            y: Math.round(newY),
            width: Math.min(100, Math.round(w)),
            height: Math.min(100, Math.round(h))
        });
    };

    // Reset Crop
    const handleReset = () => {
        setCrop({ x: 5, y: 5, width: 90, height: 90 });
        setAspectRatio('free');
        setRotation(0);
        setIsFlippedH(false);
    };

    // Mouse handlers for dragging & resizing
    const handleMouseDownCropBox = (e) => {
        e.stopPropagation();
        e.preventDefault();
        setIsDragging(true);
        dragStart.current = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            crop: { ...crop }
        };
    };

    const handleMouseDownHandle = (handle, e) => {
        e.stopPropagation();
        e.preventDefault();
        setResizeHandle(handle);
        dragStart.current = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            crop: { ...crop }
        };
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging && !resizeHandle) return;
            if (!containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;

            const deltaX_pct = ((e.clientX - dragStart.current.mouseX) / rect.width) * 100;
            const deltaY_pct = ((e.clientY - dragStart.current.mouseY) / rect.height) * 100;

            if (isDragging) {
                const newX = Math.max(0, Math.min(100 - dragStart.current.crop.width, dragStart.current.crop.x + deltaX_pct));
                const newY = Math.max(0, Math.min(100 - dragStart.current.crop.height, dragStart.current.crop.y + deltaY_pct));
                setCrop(prev => ({ ...prev, x: newX, y: newY }));
            } else if (resizeHandle) {
                let { x, y, width, height } = dragStart.current.crop;

                if (resizeHandle.includes('e')) {
                    width = Math.max(8, Math.min(100 - x, width + deltaX_pct));
                }
                if (resizeHandle.includes('s')) {
                    height = Math.max(8, Math.min(100 - y, height + deltaY_pct));
                }
                if (resizeHandle.includes('w')) {
                    const nextW = width - deltaX_pct;
                    if (nextW >= 8 && x + deltaX_pct >= 0) {
                        x += deltaX_pct;
                        width = nextW;
                    }
                }
                if (resizeHandle.includes('n')) {
                    const nextH = height - deltaY_pct;
                    if (nextH >= 8 && y + deltaY_pct >= 0) {
                        y += deltaY_pct;
                        height = nextH;
                    }
                }

                // If ratio constraint is active
                if (aspectRatio !== 'free' && rect.width && rect.height) {
                    let targetRatio = 1;
                    if (aspectRatio === '1:1') targetRatio = 1;
                    else if (aspectRatio === '4:3') targetRatio = 4 / 3;
                    else if (aspectRatio === '16:9') targetRatio = 16 / 9;
                    else if (aspectRatio === '3:2') targetRatio = 3 / 2;

                    const containerRatio = rect.width / rect.height;
                    const calculatedH = (width * containerRatio) / targetRatio;
                    if (y + calculatedH <= 100) {
                        height = calculatedH;
                    } else {
                        width = ((100 - y) * targetRatio) / containerRatio;
                        height = 100 - y;
                    }
                }

                setCrop({ x, y, width, height });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setResizeHandle(null);
        };

        if (isDragging || resizeHandle) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, resizeHandle, aspectRatio]);

    // Execute Crop via Canvas
    const handleApply = () => {
        if (!imageSrc) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const nw = img.naturalWidth;
            const nh = img.naturalHeight;

            // Coordinates on source image in natural pixels
            const sx = Math.max(0, Math.round((crop.x / 100) * nw));
            const sy = Math.max(0, Math.round((crop.y / 100) * nh));
            const sw = Math.min(nw - sx, Math.max(1, Math.round((crop.width / 100) * nw)));
            const sh = Math.min(nh - sy, Math.max(1, Math.round((crop.height / 100) * nh)));

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            const isSwapped = rotation === 90 || rotation === 270;
            canvas.width = isSwapped ? sh : sw;
            canvas.height = isSwapped ? sw : sh;

            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);

            if (rotation !== 0) {
                ctx.rotate((rotation * Math.PI) / 180);
            }
            if (isFlippedH) {
                ctx.scale(-1, 1);
            }

            ctx.drawImage(
                img,
                sx, sy, sw, sh,
                -sw / 2, -sh / 2,
                sw, sh
            );

            ctx.restore();

            const croppedBase64 = canvas.toDataURL('image/png', 0.95);
            onApplyCrop(croppedBase64);
        };
        img.src = imageSrc;
    };

    if (!isOpen) return null;

    // Approximate pixel dimensions of crop
    const estPixelW = Math.round((crop.width / 100) * (naturalDims.width || 800));
    const estPixelH = Math.round((crop.height / 100) * (naturalDims.height || 600));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs select-none animate-fadeIn">
            <div className={`w-full max-w-3xl max-h-[92vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
                isDark ? 'bg-[#0f111a] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}>
                {/* Modal Header */}
                <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
                    isDark ? 'border-slate-800 bg-[#131622]' : 'border-slate-100 bg-slate-50'
                }`}>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#ff6600]/15 flex items-center justify-center text-[#ff6600]">
                            <Crop className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <span>Crop & Adjust Image</span>
                                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {estPixelW} × {estPixelH} px
                                </span>
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Drag box to reposition, pull handles to crop, or choose aspect ratio
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                        title="Close cropper"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Cropping Canvas Viewport */}
                <div className="relative flex-1 min-h-[320px] max-h-[55vh] flex items-center justify-center p-4 bg-[#090b10] overflow-hidden">
                    <div 
                        ref={containerRef}
                        className="relative max-w-full max-h-[50vh] flex items-center justify-center select-none"
                        style={{ display: 'inline-block' }}
                    >
                        {/* Display Image */}
                        <img
                            ref={imgRef}
                            src={imageSrc}
                            alt="Crop target"
                            draggable={false}
                            className="max-w-full max-h-[50vh] object-contain block pointer-events-none"
                            style={{
                                transform: `rotate(${rotation}deg) scaleX(${isFlippedH ? -1 : 1})`,
                                transition: 'transform 0.15s ease'
                            }}
                        />

                        {/* Interactive Crop Box Overlay */}
                        <div
                            onMouseDown={handleMouseDownCropBox}
                            className="absolute cursor-move z-20 group"
                            style={{
                                left: `${crop.x}%`,
                                top: `${crop.y}%`,
                                width: `${crop.width}%`,
                                height: `${crop.height}%`,
                                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
                                border: '2px solid #ff6600'
                            }}
                        >
                            {/* Rule of Thirds Grid lines */}
                            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-40">
                                <div className="border-r border-b border-white/60"></div>
                                <div className="border-r border-b border-white/60"></div>
                                <div className="border-b border-white/60"></div>
                                <div className="border-r border-b border-white/60"></div>
                                <div className="border-r border-b border-white/60"></div>
                                <div className="border-b border-white/60"></div>
                                <div className="border-r border-white/60"></div>
                                <div className="border-r border-white/60"></div>
                                <div></div>
                            </div>

                            {/* 4 Corner Resize Handles */}
                            <div 
                                onMouseDown={(e) => handleMouseDownHandle('nw', e)}
                                className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[#ff6600] rounded-xs cursor-nwse-resize shadow-md" 
                            />
                            <div 
                                onMouseDown={(e) => handleMouseDownHandle('ne', e)}
                                className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[#ff6600] rounded-xs cursor-nesw-resize shadow-md" 
                            />
                            <div 
                                onMouseDown={(e) => handleMouseDownHandle('sw', e)}
                                className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[#ff6600] rounded-xs cursor-nesw-resize shadow-md" 
                            />
                            <div 
                                onMouseDown={(e) => handleMouseDownHandle('se', e)}
                                className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[#ff6600] rounded-xs cursor-nwse-resize shadow-md" 
                            />

                            {/* 4 Edge Resize Handles */}
                            <div 
                                onMouseDown={(e) => handleMouseDownHandle('n', e)}
                                className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border-2 border-[#ff6600] rounded-xs cursor-ns-resize shadow-md" 
                            />
                            <div 
                                onMouseDown={(e) => handleMouseDownHandle('s', e)}
                                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border-2 border-[#ff6600] rounded-xs cursor-ns-resize shadow-md" 
                            />
                            <div 
                                onMouseDown={(e) => handleMouseDownHandle('w', e)}
                                className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-2 h-4 bg-white border-2 border-[#ff6600] rounded-xs cursor-ew-resize shadow-md" 
                            />
                            <div 
                                onMouseDown={(e) => handleMouseDownHandle('e', e)}
                                className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2 h-4 bg-white border-2 border-[#ff6600] rounded-xs cursor-ew-resize shadow-md" 
                            />
                        </div>
                    </div>
                </div>

                {/* Toolbar Controls */}
                <div className={`p-3.5 border-t flex flex-wrap items-center justify-between gap-3 text-xs ${
                    isDark ? 'border-slate-800 bg-[#111420]' : 'border-slate-100 bg-slate-50'
                }`}>
                    {/* Left: Aspect Ratio presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-400 mr-1 uppercase tracking-wider">Ratio:</span>
                        {[
                            { id: 'free', label: 'Free' },
                            { id: '1:1', label: '1:1 Square' },
                            { id: '4:3', label: '4:3' },
                            { id: '16:9', label: '16:9' },
                            { id: '3:2', label: '3:2' }
                        ].map(ratio => (
                            <button
                                key={ratio.id}
                                type="button"
                                onClick={() => handleSetAspectRatio(ratio.id)}
                                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer border ${
                                    aspectRatio === ratio.id
                                        ? 'bg-[#ff6600] text-white border-[#ff6600] shadow-xs'
                                        : isDark
                                            ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                                {ratio.label}
                            </button>
                        ))}
                    </div>

                    {/* Right: Transformation tools */}
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setRotation(r => (r - 90 + 360) % 360)}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                isDark ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                            title="Rotate 90° Counter-Clockwise"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setRotation(r => (r + 90) % 360)}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                isDark ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                            title="Rotate 90° Clockwise"
                        >
                            <RotateCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsFlippedH(f => !f)}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                isFlippedH 
                                    ? 'bg-[#ff6600] text-white border-[#ff6600]' 
                                    : isDark ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                            title="Flip Horizontally"
                        >
                            <FlipHorizontal className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={handleReset}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer text-slate-400 hover:text-rose-500 ${
                                isDark ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
                            }`}
                            title="Reset Crop to Full Image"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Footer Modal Actions */}
                <div className={`px-5 py-3 border-t flex items-center justify-end gap-2.5 ${
                    isDark ? 'border-slate-800 bg-[#0f111a]' : 'border-slate-100 bg-white'
                }`}>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer border transition-all ${
                            isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleApply}
                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#ff6600] hover:bg-[#e55c00] active:scale-95 transition-all shadow-md shadow-[#ff6600]/25 cursor-pointer"
                    >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Apply Crop</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
