import React from 'react';

/**
 * Parses a raw Rackings dimension string into discrete Height, Width, Length, and Depth tokens,
 * preserving any auxiliary specifications (e.g. beam profiles, steel thickness).
 */
export function parseRackDimension(dimStr) {
  if (!dimStr || typeof dimStr !== 'string') return { badges: [], extra: '', raw: '—' };
  const raw = dimStr.trim();
  if (!raw || raw === '—' || raw === 'N/A' || raw === '-') return { badges: [], extra: '', raw: '—' };

  let height = null;
  let width = null;
  let length = null;
  let depth = null;

  // 1. Suffix pattern: e.g. 900mmW*2500mmH*2922mmL or 900W*2500H
  const suffixMatches = [...raw.matchAll(/([0-9.]+)\s*(?:mm|m)?\s*([HWLD])\b/gi)];
  if (suffixMatches.length > 0) {
    suffixMatches.forEach(m => {
      const val = m[1];
      const key = m[2].toUpperCase();
      const unit = raw.includes(val + 'm') && !raw.includes(val + 'mm') ? 'm' : 'mm';
      if (key === 'H') height = val + unit;
      else if (key === 'W') width = val + unit;
      else if (key === 'L') length = val + unit;
      else if (key === 'D') depth = val + unit;
    });
  } else {
    // 2. Prefix pattern: H5550mm, L2700mm, D1050mm, W9150mm, H02000mm, L-1790
    const hMatch = raw.match(/(?:^|[^a-zA-Z0-9])H[-:\s]*([0-9]+(?:\.[0-9]+)?)(?:mm|m)?/i);
    if (hMatch) {
      const unit = raw.includes(hMatch[1] + 'm') && !raw.includes(hMatch[1] + 'mm') ? 'm' : 'mm';
      height = hMatch[1] + unit;
    }

    const dMatch = raw.match(/(?:^|[^a-zA-Z0-9])D[-:\s]*([0-9]+(?:\.[0-9]+)?)(?:mm|m)?/i);
    if (dMatch) {
      const unit = raw.includes(dMatch[1] + 'm') && !raw.includes(dMatch[1] + 'mm') ? 'm' : 'mm';
      depth = dMatch[1] + unit;
    }

    const wMatch = raw.match(/(?:^|[^a-zA-Z0-9])W[-:\s]*([0-9]+(?:\.[0-9]+)?)(?:mm|m)?/i);
    if (wMatch) {
      const unit = raw.includes(wMatch[1] + 'm') && !raw.includes(wMatch[1] + 'mm') ? 'm' : 'mm';
      width = wMatch[1] + unit;
    }

    const lMatch = raw.match(/(?:^|[^a-zA-Z0-9])L[-:\s]*([0-9]+(?:\.[0-9]+)?)(?:mm|m)?/i);
    if (lMatch) {
      const unit = raw.includes(lMatch[1] + 'm') && !raw.includes(lMatch[1] + 'mm') ? 'm' : 'mm';
      length = lMatch[1] + unit;
    }
  }

  const badges = [];
  if (height) badges.push({ type: 'H', label: 'H', value: height });
  if (width) badges.push({ type: 'W', label: 'W', value: width });
  if (length) badges.push({ type: 'L', label: 'L', value: length });
  if (depth) badges.push({ type: 'D', label: 'D', value: depth });

  // Calculate auxiliary notes/profile info
  let extra = '';
  if (badges.length > 0) {
    let rem = raw;
    badges.forEach(b => {
      const numOnly = b.value.replace(/mm|m/i, '');
      const pattern = new RegExp('(?:^|[^a-zA-Z0-9])?' + b.type + '[-:\\s]*' + numOnly + '(?:mm|m)?|' + numOnly + '(?:mm|m)?\\s*' + b.type, 'gi');
      rem = rem.replace(pattern, '');
    });
    rem = rem.replace(/^[*\/\s,]+|[*\/\s,]+$/g, '').trim();
    rem = rem.replace(/\s*\*\s*/g, ' * ').trim();
    if (rem && rem !== '—' && rem !== '-') {
      extra = rem;
    }
  }

  return { raw, badges, extra };
}

/**
 * Parses an existing dimension string into form field values for the Add/Edit Rackings modal.
 */
export function parseToFormFields(dimStr) {
  if (!dimStr || dimStr === '—' || dimStr === 'N/A' || dimStr === '-') {
    return { height: '', width: '', widthType: 'W', depth: '', profile: '', isCustom: false, raw: '' };
  }

  const raw = dimStr.trim();
  let height = '';
  let width = '';
  let widthType = 'W';
  let depth = '';
  let profile = '';

  const suffixMatches = [...raw.matchAll(/([0-9.]+)\s*(?:mm|m)?\s*([HWLD])\b/gi)];
  if (suffixMatches.length > 0) {
    suffixMatches.forEach(m => {
      const val = m[1];
      const key = m[2].toUpperCase();
      if (key === 'H') height = val;
      else if (key === 'W') { width = val; widthType = 'W'; }
      else if (key === 'L') { width = val; widthType = 'L'; }
      else if (key === 'D') depth = val;
    });
  } else {
    const hMatch = raw.match(/(?:^|[^a-zA-Z0-9])H[-:\s]*([0-9]+(?:\.[0-9]+)?)/i);
    if (hMatch) height = hMatch[1];

    const dMatch = raw.match(/(?:^|[^a-zA-Z0-9])D[-:\s]*([0-9]+(?:\.[0-9]+)?)/i);
    if (dMatch) depth = dMatch[1];

    const wMatch = raw.match(/(?:^|[^a-zA-Z0-9])W[-:\s]*([0-9]+(?:\.[0-9]+)?)/i);
    if (wMatch) { width = wMatch[1]; widthType = 'W'; }

    const lMatch = raw.match(/(?:^|[^a-zA-Z0-9])L[-:\s]*([0-9]+(?:\.[0-9]+)?)/i);
    if (lMatch) { width = lMatch[1]; widthType = 'L'; }
  }

  // Profile / extra details
  let rem = raw;
  if (height) rem = rem.replace(new RegExp('(?:^|[^a-zA-Z0-9])?H[-:\\s]*' + height + '(?:mm|m)?|' + height + '(?:mm|m)?\\s*H', 'gi'), '');
  if (width) rem = rem.replace(new RegExp('(?:^|[^a-zA-Z0-9])?' + widthType + '[-:\\s]*' + width + '(?:mm|m)?|' + width + '(?:mm|m)?\\s*' + widthType, 'gi'), '');
  if (depth) rem = rem.replace(new RegExp('(?:^|[^a-zA-Z0-9])?D[-:\\s]*' + depth + '(?:mm|m)?|' + depth + '(?:mm|m)?\\s*D', 'gi'), '');
  rem = rem.replace(/^[*\/\s,]+|[*\/\s,]+$/g, '').trim();
  rem = rem.replace(/\s*\*\s*/g, ' * ').trim();
  if (rem && rem !== '—' && rem !== '-') {
    profile = rem;
  }

  const isCustom = !height && !width && !depth;
  return { height, width, widthType, depth, profile, isCustom, raw };
}

/**
 * Builds a single standard Rackings dimension string from individual form values.
 */
export function buildDimensionString({ height, width, widthType = 'W', depth, profile }) {
  const parts = [];
  if (height && height.trim()) {
    const h = height.trim();
    parts.push(/^[HWLD]/i.test(h) ? h : 'H' + h + (/[a-zA-Z]/.test(h) ? '' : 'mm'));
  }
  if (width && width.trim()) {
    const w = width.trim();
    parts.push(/^[HWLD]/i.test(w) ? w : (widthType || 'W') + w + (/[a-zA-Z]/.test(w) ? '' : 'mm'));
  }
  if (depth && depth.trim()) {
    const d = depth.trim();
    parts.push(/^[HWLD]/i.test(d) ? d : 'D' + d + (/[a-zA-Z]/.test(d) ? '' : 'mm'));
  }
  let res = parts.join('*');
  if (profile && profile.trim()) {
    res = res ? res + ' ' + profile.trim() : profile.trim();
  }
  return res || '—';
}

/**
 * Renders separated Height (H), Width (W), Depth (D), and Length (L) badges
 * stacked inside a single Dimension column.
 */
export default function RackDimensionCell({ dimension, isDark = false, className = '' }) {
  const { raw, badges, extra } = parseRackDimension(dimension);

  if (!raw || raw === '—' || raw === '-' || raw === 'N/A') {
    return <span className="text-slate-400 dark:text-slate-500 font-mono text-xs">—</span>;
  }

  // If no H/W/L/D tokens could be determined (e.g. bolts M10*65, 80*60mm)
  if (badges.length === 0) {
    return (
      <span 
        className={`inline-block text-[11px] font-mono px-2 py-0.5 rounded border ${
          isDark 
            ? 'bg-slate-800/70 text-slate-300 border-slate-700/80' 
            : 'bg-slate-50 text-slate-700 border-slate-200'
        } ${className}`}
        title={raw}
      >
        {raw}
      </span>
    );
  }

  // Badges styling map
  const badgeClasses = {
    H: isDark 
      ? 'bg-blue-950/50 text-blue-300 border-blue-800/70' 
      : 'bg-blue-50/90 text-blue-700 border-blue-200',
    W: isDark 
      ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/70' 
      : 'bg-emerald-50/90 text-emerald-700 border-emerald-200',
    L: isDark 
      ? 'bg-teal-950/50 text-teal-300 border-teal-800/70' 
      : 'bg-teal-50/90 text-teal-700 border-teal-200',
    D: isDark 
      ? 'bg-amber-950/50 text-amber-300 border-amber-800/70' 
      : 'bg-amber-50/90 text-amber-800 border-amber-200'
  };

  const labelClasses = {
    H: isDark ? 'text-blue-400' : 'text-blue-600',
    W: isDark ? 'text-emerald-400' : 'text-emerald-600',
    L: isDark ? 'text-teal-400' : 'text-teal-600',
    D: isDark ? 'text-amber-400' : 'text-amber-600'
  };

  return (
    <div className={`flex flex-col items-start gap-1 py-0.5 min-w-[95px] ${className}`} title={raw}>
      {badges.map((b, idx) => (
        <span
          key={idx}
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-medium border shadow-xs leading-none ${badgeClasses[b.type]}`}
        >
          <span className={`font-bold text-[9.5px] mr-1 tracking-wider uppercase ${labelClasses[b.type]}`}>
            {b.label}:
          </span>
          <span>{b.value}</span>
        </span>
      ))}
      {extra && (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded font-mono text-slate-500 dark:text-slate-400 bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 max-w-[190px] truncate leading-tight mt-0.5"
          title={extra}
        >
          {extra}
        </span>
      )}
    </div>
  );
}
