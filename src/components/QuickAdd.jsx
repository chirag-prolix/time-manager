import { useState } from 'react';
import { parseTags } from '../utils';

const PRIORITIES = ['low', 'medium', 'high'];

export default function QuickAdd({ onAdd }) {
  const [title, setTitle] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [description, setDescription] = useState('');
  const [project, setProject] = useState('');
  const [priority, setPriority] = useState('medium');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [tags, setTags] = useState('');
  const [location, setLocation] = useState('');

  function submit() {
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      description,
      project,
      priority,
      estimatedDuration: estimatedDuration ? parseInt(estimatedDuration, 10) : null,
      tags: parseTags(tags),
      location,
    });
    setTitle('');
    setDescription('');
    setProject('');
    setPriority('medium');
    setEstimatedDuration('');
    setTags('');
    setLocation('');
    if (!advanced) setAdvanced(false);
  }

  return (
    <div className="quick-add">
      <div className="quick-add-row">
        <input
          className="quick-add-input"
          placeholder="Add a task… (press Enter)"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
        />
        <button className="btn-primary" onClick={submit}>Add</button>
        <button
          className="btn-secondary"
          onClick={() => setAdvanced(v => !v)}
          title="Toggle advanced fields"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="14" y2="12" />
            <line x1="4" y1="18" x2="18" y2="18" />
          </svg>
          {advanced ? 'Less' : 'More'}
        </button>
      </div>

      {advanced && (
        <div className="advanced-fields">
          <div className="full-width">
            <label className="field-label">Description</label>
            <textarea
              className="field-input"
              placeholder="Notes or description…"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <label className="field-label">Project / Category</label>
            <input
              className="field-input"
              placeholder="e.g. Design"
              value={project}
              onChange={e => setProject(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Priority</label>
            <select
              className="field-input"
              value={priority}
              onChange={e => setPriority(e.target.value)}
            >
              {PRIORITIES.map(p => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Est. Duration (min)</label>
            <input
              className="field-input"
              type="number"
              min="1"
              placeholder="e.g. 30"
              value={estimatedDuration}
              onChange={e => setEstimatedDuration(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Tags (comma-separated)</label>
            <input
              className="field-input"
              placeholder="tag1, tag2"
              value={tags}
              onChange={e => setTags(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Location / Context</label>
            <input
              className="field-input"
              placeholder="e.g. Office, Remote"
              value={location}
              onChange={e => setLocation(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
