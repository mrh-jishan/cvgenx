document.querySelectorAll('[data-copy-text]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const encoded = btn.getAttribute('data-copy-text') || '';
    const text = decodeURIComponent(encoded);
    try {
      await navigator.clipboard.writeText(text);
      const prev = btn.textContent;
      btn.textContent = 'Copied';
      setTimeout(() => (btn.textContent = prev || 'Copy'), 1200);
    } catch {
      // ignore copy failures
    }
  });
});

// Settings page: populate form when selecting profiles
(() => {
  if (document.body.dataset.page !== 'settings') return;
  const profiles = window.__PROFILES || [];
  const select = document.getElementById('profileSelect');
  if (!select) return;
  const fields = [
    'name',
    'email',
    'phone',
    'address',
    'linkedin',
    'github',
    'portfolio',
    'baseSummary',
    'education',
    'projects',
    'professionalExperience',
  ];
  const fill = (profile) => {
    const data = (profile && profile.data) || {};
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (Array.isArray(val)) el.value = val.join('\n');
      else if (id === 'projects' && Array.isArray(data.projects)) {
        el.value = (data.projects || [])
          .map((p) => (p ? `${p.name || ''} | ${p.url || ''} | ${p.description || ''}` : ''))
          .join('\n');
      } else el.value = val || '';
    };
    setVal('name', data.name);
    setVal('email', data.email);
    setVal('phone', data.phone);
    setVal('address', data.address);
    setVal('linkedin', data.linkedin);
    setVal('github', data.github);
    setVal('portfolio', data.portfolio);
    setVal('baseSummary', data.baseSummary);
    setVal('education', data.education || []);
    setVal('projects', data.projects || []);
    setVal('professionalExperience', data.professionalExperience || []);
    const nameField = document.getElementById('profileName');
    if (nameField) nameField.value = profile?.name || '';
  };
  const initId = window.__CURRENT_PROFILE_ID;
  if (initId) {
    const p = profiles.find((x) => Number(x.id) === Number(initId));
    if (p) fill(p);
  } else if (profiles[0]) {
    fill(profiles[0]);
  }
  select.addEventListener('change', () => {
    const id = Number(select.value);
    const p = profiles.find((x) => Number(x.id) === id);
    if (p) fill(p);
  });
})();

// Download buttons: allow saving content as md/pdf/docx (text-based)
document.querySelectorAll('[data-download-type]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const type = btn.getAttribute('data-download-type');
    const encoded = btn.getAttribute('data-download-text') || '';
    const text = decodeURIComponent(encoded);
    const name = btn.getAttribute('data-filename') || 'cvgenx';
    let ext = 'md';
    let mime = 'text/markdown';
    if (type === 'pdf') {
      ext = 'pdf';
      mime = 'application/pdf';
    } else if (type === 'docx') {
      ext = 'docx';
      mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
});
