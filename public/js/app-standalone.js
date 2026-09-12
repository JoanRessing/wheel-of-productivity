// Classic-script fallback for file:// Chrome usage when ESM module imports fail.
// This avoids "type=module" import resolution issues when opening directly from filesystem.
(function(){
  try {
    // Element lookups
    var els = {
      form: document.getElementById('task-form'),
      name: document.getElementById('task-name'),
      time: document.getElementById('task-time'),
      location: document.getElementById('task-location'),
      deadline: document.getElementById('task-deadline'),
      addBtn: document.getElementById('add-task'),
      resetBtn: document.getElementById('reset-session'),
      drawerToggle: document.getElementById('drawer-toggle'),
      drawer: document.getElementById('drawer'),
      drawerClose: document.getElementById('drawer-close'),
      drawerOverlay: document.getElementById('drawer-overlay'),
      openAddTask: document.getElementById('open-add-task'),
      modal: document.getElementById('task-modal'),
      overlay: document.getElementById('modal-overlay'),
      closeModal: document.getElementById('close-task-modal'),
      list: document.getElementById('task-list'),
      count: document.getElementById('task-count'),
      spinBtn: document.getElementById('spin'),
      result: document.getElementById('result'),
      canvas: document.getElementById('wheel'),
      confetti: document.getElementById('confetti'),
      filterTime: document.getElementById('filter-time'),
      filterIndoor: document.getElementById('filter-indoor'),
      filterOutdoor: document.getElementById('filter-outdoor'),
      clearFilters: document.getElementById('clear-filters'),
      filterSummary: document.getElementById('filter-summary'),
      dependencies: document.getElementById('task-dependencies'),
    };

    var STORAGE_KEY = 'wheel-of-productivity:tasks:v1';
    var tasks = sanitizeTaskDependencies(loadTasks());

    function loadTasks(){
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        var data = JSON.parse(raw);
        if (!data || !Array.isArray(data.tasks)) return [];
        return data.tasks.filter(function(t){ return t && typeof t.id === 'string' && typeof t.name === 'string'; }).map(function(t){
          return {
            id: t.id,
            name: t.name,
            time: typeof t.time === 'number' ? t.time : undefined,
            location: t.location === 'indoor' || t.location === 'outdoor' || t.location === 'any' ? t.location : 'any',
            deadline: typeof t.deadline === 'string' ? t.deadline : undefined,
            prerequisiteIds: Array.isArray(t.prerequisiteIds) ? Array.from(new Set(t.prerequisiteIds.filter(function(id){ return typeof id === 'string'; }))) : undefined,
            weight: typeof t.weight === 'number' ? t.weight : undefined,
          };
        });
      } catch(e) {
        console.warn('Failed to load tasks from localStorage.', e);
        return [];
      }
    }

    function saveTasks(){
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, tasks: tasks })); }
      catch(e) { console.warn('Failed to save tasks to localStorage.', e); }
    }

    function getFilters(){
      var rawTime = Number(els.filterTime && els.filterTime.value);
      return {
        maxTime: els.filterTime && els.filterTime.value && Number.isFinite(rawTime) ? Math.max(0, Math.round(rawTime)) : undefined,
        includeIndoor: !!(els.filterIndoor && els.filterIndoor.checked),
        includeOutdoor: !!(els.filterOutdoor && els.filterOutdoor.checked),
      };
    }

    function taskMatchesFilters(task, filters){
      if (filters.maxTime != null && task.time != null && task.time > filters.maxTime) return false;
      if (!filters.includeIndoor && !filters.includeOutdoor) return false;
      if (task.location === 'any') return filters.includeIndoor || filters.includeOutdoor;
      if (task.location === 'indoor') return filters.includeIndoor;
      return filters.includeOutdoor;
    }

    function getFilteredTasks(){
      var filters = getFilters();
      return tasks.filter(function(task){ return taskMatchesFilters(task, filters) && getBlockingTasks(task).length === 0; });
    }

    function getBlockingTasks(task){
      var prerequisiteIds = task.prerequisiteIds || [];
      if (!prerequisiteIds.length) return [];
      return prerequisiteIds.map(function(id){ return tasks.find(function(item){ return item.id === id; }); }).filter(Boolean);
    }

    function normalizePrerequisites(taskId, prerequisiteIds){
      var activeIds = new Set(tasks.map(function(task){ return task.id; }));
      activeIds.delete(taskId);
      var normalized = Array.from(new Set((prerequisiteIds || []).filter(function(id){ return activeIds.has(id); })));
      return normalized.length ? normalized : undefined;
    }

    function wouldCreateCycle(taskId, prerequisiteIds){
      var dependencyMap = new Map();
      tasks.forEach(function(task){ dependencyMap.set(task.id, task.prerequisiteIds || []); });
      dependencyMap.set(taskId, prerequisiteIds || []);
      var visited = new Set();
      var stack = new Set();
      function visit(id){
        if (stack.has(id)) return true;
        if (visited.has(id)) return false;
        visited.add(id);
        stack.add(id);
        var deps = dependencyMap.get(id) || [];
        for (var i=0; i<deps.length; i++) if (visit(deps[i])) return true;
        stack.delete(id);
        return false;
      }
      return visit(taskId);
    }

    function sanitizeTaskDependencies(nextTasks){
      var ids = new Set(nextTasks.map(function(task){ return task.id; }));
      return nextTasks.map(function(task){
        var prerequisiteIds = Array.from(new Set((task.prerequisiteIds || []).filter(function(id){ return id !== task.id && ids.has(id); })));
        var next = Object.assign({}, task);
        if (prerequisiteIds.length) next.prerequisiteIds = prerequisiteIds;
        else delete next.prerequisiteIds;
        return next;
      });
    }

    function getSelectedDependencyIds(container){
      container = container || els.dependencies;
      if (!container) return [];
      return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(function(input){ return input.value; });
    }

    function clearDependencySelections(container){
      container = container || els.dependencies;
      if (!container) return;
      Array.from(container.querySelectorAll('input[type="checkbox"]')).forEach(function(input){ input.checked = false; });
    }

    function renderDependencyOptions(container, selectedIds, excludedTaskId, onChange){
      if (!container) return;
      container.innerHTML = '';
      var candidates = tasks.filter(function(task){ return task.id !== excludedTaskId; });
      if (!candidates.length) {
        container.textContent = excludedTaskId ? 'No other tasks available.' : 'No existing tasks to depend on yet.';
        container.classList.add('muted');
        return;
      }
      container.classList.remove('muted');
      var selected = new Set(selectedIds || []);
      candidates.forEach(function(task){
        var label = document.createElement('label');
        label.className = 'check-option dependency-option';
        var input = document.createElement('input');
        input.type = 'checkbox'; input.value = task.id; input.checked = selected.has(task.id);
        if (onChange) input.addEventListener('change', onChange);
        var text = document.createElement('span');
        text.textContent = task.name;
        label.append(input, text);
        container.append(label);
      });
    }

    function applyTaskPatch(id, patch){
      if (Object.prototype.hasOwnProperty.call(patch, 'prerequisiteIds')) {
        var prerequisiteIds = normalizePrerequisites(id, patch.prerequisiteIds || []);
        if (wouldCreateCycle(id, prerequisiteIds || [])) {
          if (els.result) els.result.textContent = 'That dependency would create a loop, so it was not saved.';
          renderTasks();
          return;
        }
        patch.prerequisiteIds = prerequisiteIds;
      }
      tasks = sanitizeTaskDependencies(tasks.map(function(task){ return task.id === id ? Object.assign({}, task, patch) : task; }));
      saveTasks();
      renderTasks();
    }

    function renderFilterSummary(filteredTasks){
      if (!els.filterSummary) return;
      if (tasks.length === 0) {
        els.filterSummary.textContent = 'Add tasks to start building your wheel.';
        return;
      }
      els.filterSummary.textContent = filteredTasks.length + ' of ' + tasks.length + ' task' + (filteredTasks.length === 1 ? ' is' : 's are') + ' rollable with the current filters and dependencies.';
    }

    function renderTasks() {
      var filteredTasks = getFilteredTasks();
      els.list.innerHTML = '';
      els.count.textContent = tasks.length + ' task' + (tasks.length === 1 ? '' : 's');
      tasks.forEach(function(t){
        var li = document.createElement('li');
        li.className = 'task-item';
        var name = document.createElement('input');
        name.type = 'text';
        name.value = t.name;
        name.addEventListener('change', function(){ applyTaskPatch(t.id, { name: name.value.trim() || t.name }); });
        var meta = document.createElement('div');
        meta.className = 'task-meta';
        var parts = [];
        if (t.time != null) parts.push(t.time + 'm');
        parts.push(t.location);
        if (t.deadline) parts.push('due ' + t.deadline);
        var blockers = getBlockingTasks(t);
        if (blockers.length) parts.push('blocked by ' + blockers.map(function(task){ return task.name; }).join(', '));
        meta.textContent = parts.join(' • ');
        var del = document.createElement('button');
        del.className = 'icon-btn';
        del.type = 'button';
        del.textContent = 'Delete';
        del.addEventListener('click', function(){ tasks = sanitizeTaskDependencies(tasks.filter(function(x){ return x.id !== t.id; })); saveTasks(); renderTasks(); });
        var left = document.createElement('div');
        var dependencyDetails = document.createElement('details');
        dependencyDetails.className = 'dependency-editor';
        var dependencySummary = document.createElement('summary');
        dependencySummary.textContent = 'Dependencies';
        var dependencyOptions = document.createElement('div');
        dependencyOptions.className = 'dependency-options';
        renderDependencyOptions(dependencyOptions, t.prerequisiteIds || [], t.id, function(){ applyTaskPatch(t.id, { prerequisiteIds: getSelectedDependencyIds(dependencyOptions) }); });
        dependencyDetails.append(dependencySummary, dependencyOptions);
        left.append(name, meta, dependencyDetails);
        var right = document.createElement('div'); right.className='task-actions'; right.append(del);
        li.append(left, right); els.list.append(li);
      });
      renderFilterSummary(filteredTasks);
      els.spinBtn.disabled = tasks.length === 0;
      drawWheel(filteredTasks);
      renderDependencyOptions(els.dependencies);
    }

    function uid(){ return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2); }

    // Wheel drawing minimal
    var angle = 0;
    var ctx = els.canvas.getContext('2d');
    var radius = Math.min(els.canvas.width, els.canvas.height) / 2 - 8;
    var colors = ['#ff3b3b','#ff7a00','#ffd400','#26e5ff','#00d084','#a64dff','#ff4d94'];
    function drawWheel(wheelTasks, highlight){
      wheelTasks = wheelTasks || getFilteredTasks();
      var cx = els.canvas.width/2, cy = els.canvas.height/2;
      ctx.clearRect(0,0,els.canvas.width, els.canvas.height);
      var n = Math.max(wheelTasks.length,1);
      var anglePer = Math.PI*2/n;
      var fontSize = n<=6?18:n<=10?14:12;
      for (var i=0;i<n;i++){
        var start = angle + i*anglePer, end = start+anglePer;
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,radius,start,end); ctx.closePath();
        var color = colors[i%colors.length]; ctx.fillStyle=color; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle='#0b1220'; ctx.stroke();
        if (wheelTasks[i]){
          var mid=start+anglePer/2; ctx.save(); ctx.translate(cx,cy); ctx.rotate(mid); ctx.textAlign='right'; ctx.font='bold '+fontSize+'px system-ui';
          ctx.fillStyle='#fff'; ctx.shadowColor='rgba(0,0,0,.55)'; ctx.shadowBlur=2;
          var label = wheelTasks[i].name.length>22?wheelTasks[i].name.slice(0,21)+'…':wheelTasks[i].name;
          ctx.fillText(label, radius-10, 5); ctx.restore();
        }
      }
      ctx.beginPath(); ctx.arc(cx,cy,22,0,Math.PI*2); ctx.fillStyle='#0b1220'; ctx.fill();
    }

    function easeOutCubic(t){ return 1-Math.pow(1-t,3); }

    function spin(){
      var wheelTasks = getFilteredTasks();
      if (!wheelTasks.length) {
        if (els.result) els.result.textContent = tasks.length === 0 ? 'Add a task before spinning.' : 'No tasks are rollable right now. Try allowing more time or locations, or finish a prerequisite task.';
        return;
      }
      var n = wheelTasks.length; var anglePer = Math.PI*2/n; var startAngle=angle;
      var targetMid=-Math.PI/2; var sel=Math.floor(Math.random()*n); var curMid = angle + sel*anglePer + anglePer/2;
      var delta = targetMid - curMid + (3+Math.random()*2)*Math.PI*2; var duration=1400; var t0=performance.now();
      (function frame(now){
        var t=Math.min(1,(now-t0)/duration); angle=startAngle+delta*easeOutCubic(t); drawWheel(wheelTasks);
        if (t<1) requestAnimationFrame(frame); else {
          angle=((angle%(Math.PI*2))+Math.PI*2)%(Math.PI*2); var theta=(( -Math.PI/2 - angle)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
          var idx=Math.floor(theta/anglePer)%n; var task=wheelTasks[idx]; if (task) els.result.textContent='Selected: '+task.name;
          // Confetti bursts out of the selected partition edges around the indicator (top)
          var prefersReduced = false;
          try { prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e){}
          if (!prefersReduced && els.confetti) {
            var cx = els.canvas.width/2, cy = els.canvas.height/2; var base = -Math.PI/2; var start = base - anglePer/2; var end = base + anglePer/2;
            var r1 = radius + 2, r2 = radius + 14;
            var bursts = [
              { x: cx + Math.cos(start)*r1, y: cy + Math.sin(start)*r1, dir: start },
              { x: cx + Math.cos(base)*r2,  y: cy + Math.sin(base)*r2,  dir: base },
              { x: cx + Math.cos(end)*r1,   y: cy + Math.sin(end)*r1,   dir: end },
            ];
            burstConfetti(els.confetti, bursts);
          }
        }
      })(t0);
    }

    function addTask(ev){ ev.preventDefault(); var name=els.name.value.trim(); if(!name) return;
      var time=els.time.value?Math.max(0,Math.round(Number(els.time.value))):undefined;
      var loc=els.location.value||'any'; var dead=els.deadline.value||undefined;
      var prerequisiteIds = normalizePrerequisites('', getSelectedDependencyIds());
      tasks=tasks.concat([{id:uid(), name:name, time:time, location:loc, deadline:dead, prerequisiteIds:prerequisiteIds}]);
      saveTasks();
      els.name.value=''; els.time.value=''; els.location.value='any'; els.deadline.value='';
      clearDependencySelections();
      closeModal(); renderTasks(); }

    // wire
    if (els.form) els.form.addEventListener('submit', addTask);
    if (els.openAddTask) els.openAddTask.addEventListener('click', openModal);
    if (els.closeModal) els.closeModal.addEventListener('click', closeModal);
    if (els.overlay) els.overlay.addEventListener('click', closeModal);
    if (els.drawerToggle) els.drawerToggle.addEventListener('click', function(){ var open=els.drawer.classList.toggle('open'); if(els.drawerOverlay) els.drawerOverlay.hidden=!open; els.drawerToggle.setAttribute('aria-expanded', open?'true':'false'); });
    if (els.drawerClose) els.drawerClose.addEventListener('click', function(){ els.drawer.classList.remove('open'); if(els.drawerOverlay) els.drawerOverlay.hidden=true; els.drawerToggle.setAttribute('aria-expanded','false'); els.drawerToggle.focus(); });
    if (els.drawerOverlay) els.drawerOverlay.addEventListener('click', function(){ els.drawer.classList.remove('open'); els.drawerOverlay.hidden=true; els.drawerToggle.setAttribute('aria-expanded','false'); els.drawerToggle.focus(); });
    if (els.spinBtn) els.spinBtn.addEventListener('click', spin);
    if (els.resetBtn) els.resetBtn.addEventListener('click', function(){ if(confirm('Clear all saved tasks from this browser?')){ tasks=[]; try{ localStorage.removeItem(STORAGE_KEY); }catch(e){} renderTasks(); } });
    if (els.filterTime) els.filterTime.addEventListener('input', renderTasks);
    if (els.filterIndoor) els.filterIndoor.addEventListener('change', renderTasks);
    if (els.filterOutdoor) els.filterOutdoor.addEventListener('change', renderTasks);
    if (els.clearFilters) els.clearFilters.addEventListener('click', function(){
      if (els.filterTime) els.filterTime.value = '';
      if (els.filterIndoor) els.filterIndoor.checked = true;
      if (els.filterOutdoor) els.filterOutdoor.checked = true;
      renderTasks();
    });

    function openModal(){ if(els.overlay) els.overlay.hidden=false; if(els.modal) els.modal.hidden=false; if(els.name) els.name.focus(); }
    function closeModal(){ if(els.overlay) els.overlay.hidden=true; if(els.modal) els.modal.hidden=true; }

    // init
    renderTasks();
    window.__appLoaded = true;
  } catch (e) {
    console.error('Fallback init failed', e);
  }
})();

function burstConfetti(canvas, bursts){
  var ctx = canvas.getContext('2d'); if(!ctx) return;
  var COLORS=['#22d3ee','#f59e0b','#34d399','#a78bfa','#f472b6','#f43f5e','#60a5fa'];
  var pieces=[];
  for (var b=0; b<bursts.length; b++){
    for (var i=0;i<60;i++){
      pieces.push({
        x: bursts[b].x,
        y: bursts[b].y,
        vx: Math.cos(bursts[b].dir||(-Math.PI/2))*(2+Math.random()*2) + (Math.random()-0.5)*2.5,
        vy: Math.sin(bursts[b].dir||(-Math.PI/2))*(2+Math.random()*2) + (Math.random()-0.5)*2.5,
        w: 6+Math.random()*4,
        h: 10+Math.random()*6,
        r: Math.random()*Math.PI*2,
        vr: (Math.random()-0.5)*0.5,
        color: COLORS[i % COLORS.length],
        life: 1,
      });
    }
  }
  var start=performance.now(); var duration=1800;
  (function frame(now){
    var t=Math.min(1,(now-start)/duration); ctx.clearRect(0,0,canvas.width,canvas.height); var g=0.16;
    for (var j=0;j<pieces.length;j++){
      var p=pieces[j]; p.vy+=g; p.x+=p.vx; p.y+=p.vy; p.r+=p.vr; p.life=1-t;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r);
      ctx.fillStyle=p.color+Math.floor(255*p.life).toString(16).padStart(2,'0');
      ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore();
    }
    if (t<1) requestAnimationFrame(frame); else ctx.clearRect(0,0,canvas.width,canvas.height);
  })(start);
}
