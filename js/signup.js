const STORAGE_KEY = 'grandpadad_subscribers';
    const ADMIN_PW = 'grandpadad2026';
    let sortKey = 'joinedAt';
    let sortDir = -1;
    let currentPage = 1;
    const PER_PAGE = 10;

    function getSubs() {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
      catch(e) { return []; }
    }
    function saveSubs(subs) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
    }

    function updateCountDisplay() {
      const subs = getSubs();
      const el = document.getElementById('stat-count');
      if (el) el.textContent = subs.length > 0 ? subs.length : '0';
    }

    async function handleSignup() {
      const first = document.getElementById('sig-first').value.trim();
      const last = document.getElementById('sig-last').value.trim();
      const email = document.getElementById('sig-email').value.trim();
      const interest = document.getElementById('sig-interest').value;
      const note = document.getElementById('sig-note').value.trim();
      const msg = document.getElementById('sig-msg');
      const btn = document.getElementById('sig-btn');

      msg.className = 'form-msg';
      msg.style.display = 'none';

      if (!first) {
        msg.className = 'form-msg error'; msg.style.display = 'block';
        msg.textContent = 'Please enter your first name.'; return;
      }
      if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
        msg.className = 'form-msg error'; msg.style.display = 'block';
        msg.textContent = 'Please enter a valid email address.'; return;
      }

      const subs = getSubs();
      if (subs.find(s => s.email.toLowerCase() === email.toLowerCase())) {
        msg.className = 'form-msg success'; msg.style.display = 'block';
        msg.textContent = 'You're already part of the community, ' + first + '! Watch for Shaun's next update.';
        return;
      }

      btn.textContent = 'Joining…'; btn.disabled = true;

      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 120,
            system: 'You write warm, brief, faith-based welcome messages for GrandpaDad — Shaun Hern's newsletter community. Keep it to 1-2 sentences. Personal, encouraging, never cheesy. Mention their name.',
            messages: [{ role: 'user', content: 'Write a welcome message for ' + first + (last ? ' ' + last : '') + ' who joined interested in: ' + (interest || 'general content') + (note ? '. Their note: ' + note : '') + '.' }]
          })
        });
        const data = await res.json();
        const welcome = data.content && data.content[0] ? data.content[0].text : 'Welcome to the GrandpaDad community, ' + first + '!';

        const newSub = {
          id: Date.now(),
          firstName: first, lastName: last, email,
          interest: interest || 'not specified',
          note: note || '',
          welcomeMsg: welcome,
          joinedAt: new Date().toISOString(),
          source: 'website'
        };
        subs.push(newSub);
        saveSubs(subs);
        updateCountDisplay();

        msg.className = 'form-msg success'; msg.style.display = 'block';
        msg.textContent = welcome;
        btn.textContent = '✓ You're In!';
        btn.style.background = 'var(--sage)';

        document.getElementById('sig-first').value = '';
        document.getElementById('sig-last').value = '';
        document.getElementById('sig-email').value = '';
        document.getElementById('sig-interest').value = '';
        document.getElementById('sig-note').value = '';

        if (document.getElementById('admin-panel').style.display !== 'none') {
          refreshAdmin();
        }
      } catch(e) {
        const newSub = {
          id: Date.now(),
          firstName: first, lastName: last, email,
          interest: interest || 'not specified',
          note: note || '',
          welcomeMsg: '',
          joinedAt: new Date().toISOString(),
          source: 'website'
        };
        subs.push(newSub);
        saveSubs(subs);
        updateCountDisplay();

        msg.className = 'form-msg success'; msg.style.display = 'block';
        msg.textContent = 'Welcome to the community, ' + first + '! You'll hear from Shaun soon.';
        btn.textContent = '✓ You're In!';
        btn.style.background = 'var(--sage)';

        document.getElementById('sig-first').value = '';
        document.getElementById('sig-last').value = '';
        document.getElementById('sig-email').value = '';
        document.getElementById('sig-interest').value = '';
        document.getElementById('sig-note').value = '';
      }
    }

    function toggleAdminPrompt() {
      const p = document.getElementById('admin-prompt');
      p.style.display = p.style.display === 'block' ? 'none' : 'block';
    }

    function checkAdminPw() {
      const pw = document.getElementById('admin-pw').value;
      const err = document.getElementById('admin-pw-err');
      if (pw === ADMIN_PW) {
        document.getElementById('admin-prompt').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
        refreshAdmin();
      } else {
        err.style.display = 'block';
        document.getElementById('admin-pw').value = '';
      }
    }

    function refreshAdmin() {
      const subs = getSubs();
      document.getElementById('admin-total').textContent = subs.length;
      document.getElementById('admin-books').textContent = subs.filter(s => s.interest === 'books').length;
      document.getElementById('admin-devot').textContent = subs.filter(s => s.interest === 'devotional').length;
      document.getElementById('admin-speak').textContent = subs.filter(s => s.interest === 'speaking').length;
      renderTable();
    }

    function renderTable() {
      const search = (document.getElementById('admin-search').value || '').toLowerCase();
      const filter = document.getElementById('admin-filter').value;
      let subs = getSubs();

      if (search) subs = subs.filter(s =>
        (s.firstName + ' ' + s.lastName).toLowerCase().includes(search) ||
        s.email.toLowerCase().includes(search)
      );
      if (filter) subs = subs.filter(s => s.interest === filter);

      subs.sort((a, b) => {
        let av = a[sortKey] || '', bv = b[sortKey] || '';
        return av < bv ? -sortDir : av > bv ? sortDir : 0;
      });

      const total = subs.length;
      const pages = Math.max(1, Math.ceil(total / PER_PAGE));
      if (currentPage > pages) currentPage = pages;
      const slice = subs.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

      const tbody = document.getElementById('sub-tbody');
      if (slice.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No subscribers yet — be the first to spread the word.</td></tr>';
      } else {
        tbody.innerHTML = slice.map(s => {
          const date = new Date(s.joinedAt).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
          const badgeClass = s.interest === 'books' ? 'books' : s.interest === 'devotional' ? 'devotional' : s.interest === 'speaking' ? 'speaking' : s.interest === 'all' ? 'all' : 'books';
          const interestLabel = s.interest === 'not specified' ? '—' : s.interest === 'all' ? 'All of it' : s.interest.charAt(0).toUpperCase() + s.interest.slice(1);
          return \`<tr>
            <td style="font-weight:600">\${s.firstName} \${s.lastName || ''}</td>
            <td style="color:rgba(250,246,238,0.65)">\${s.email}</td>
            <td><span class="interest-badge \${badgeClass}">\${interestLabel}</span></td>
            <td style="color:rgba(250,246,238,0.55);font-size:0.82rem">\${date}</td>
            <td style="color:rgba(250,246,238,0.5);font-size:0.82rem;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="\${s.note || ''}">\${s.note || '—'}</td>
            <td><button class="delete-btn" onclick="deleteSub(\${s.id})" title="Remove">✕</button></td>
          </tr>\`;
        }).join('');
      }

      // Pagination
      const pg = document.getElementById('pagination');
      pg.innerHTML = '';
      for (let i = 1; i <= pages; i++) {
        const btn = document.createElement('button');
        btn.className = 'page-btn' + (i === currentPage ? ' active' : '');
        btn.textContent = i;
        btn.onclick = () => { currentPage = i; renderTable(); };
        pg.appendChild(btn);
      }
    }

    function sortBy(key) {
      if (sortKey === key) sortDir *= -1; else { sortKey = key; sortDir = -1; }
      renderTable();
    }

    function deleteSub(id) {
      if (!confirm('Remove this subscriber?')) return;
      const subs = getSubs().filter(s => s.id !== id);
      saveSubs(subs);
      updateCountDisplay();
      refreshAdmin();
    }

    function clearAll() {
      if (!confirm('Delete ALL subscribers? This cannot be undone.')) return;
      localStorage.removeItem(STORAGE_KEY);
      updateCountDisplay();
      refreshAdmin();
    }

    function exportCSV() {
      const subs = getSubs();
      if (!subs.length) { alert('No subscribers to export.'); return; }
      const header = 'First Name,Last Name,Email,Interest,Note,Joined,Source';
      const rows = subs.map(s =>
        [s.firstName, s.lastName, s.email, s.interest, (s.note||'').replace(/,/g,';'), s.joinedAt, s.source]
        .map(v => '"' + String(v||'').replace(/"/g,'""') + '"').join(',')
      );
      const csv = [header, ...rows].join('\n');
      const blob = new Blob([csv], {type:'text/csv'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'grandpadad_subscribers_' + new Date().toISOString().slice(0,10) + '.csv';
      a.click(); URL.revokeObjectURL(url);
    }

    updateCountDisplay();
