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
    };

    // Minimal state stored in memory only for fallback (no cookies)
    var tasks = [];

    function renderTasks() {
      els.list.innerHTML = '';
      els.count.textContent = tasks.length + ' task' + (tasks.length === 1 ? '' : 's');
      tasks.forEach(function(t){
        var li = document.createElement('li');
        li.className = 'task-item';
        var name = document.createElement('input');
        name.type = 'text';
        name.value = t.name;
        name.addEventListener('change', function(){ t.name = name.value.trim() || t.name; renderTasks(); });
        var meta = document.createElement('div');
        meta.className = 'task-meta';
        var parts = [];
        if (t.time != null) parts.push(t.time + 'm');
        parts.push(t.location);
        if (t.deadline) parts.push('due ' + t.deadline);
        meta.textContent = parts.join(' • ');
        var del = document.createElement('button');
        del.className = 'icon-btn';
        del.type = 'button';
        del.textContent = 'Delete';
        del.addEventListener('click', function(){ tasks = tasks.filter(function(x){ return x.id !== t.id; }); renderTasks(); });
        var left = document.createElement('div'); left.append(name, meta);
        var right = document.createElement('div'); right.className='task-actions'; right.append(del);
        li.append(left, right); els.list.append(li);
      });
      els.spinBtn.disabled = tasks.length === 0;
      drawWheel();
    }

    function uid(){ return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2); }

    // Wheel drawing minimal
    var angle = 0;
    var ctx = els.canvas.getContext('2d');
    var radius = Math.min(els.canvas.width, els.canvas.height) / 2 - 8;
    var colors = ['#ff3b3b','#ff7a00','#ffd400','#26e5ff','#00d084','#a64dff','#ff4d94'];
    function drawWheel(highlight){
      var cx = els.canvas.width/2, cy = els.canvas.height/2;
      ctx.clearRect(0,0,els.canvas.width, els.canvas.height);
      var n = Math.max(tasks.length,1);
      var anglePer = Math.PI*2/n;
      var fontSize = n<=6?18:n<=10?14:12;
      for (var i=0;i<n;i++){
        var start = angle + i*anglePer, end = start+anglePer;
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,radius,start,end); ctx.closePath();
        var color = colors[i%colors.length]; ctx.fillStyle=color; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle='#0b1220'; ctx.stroke();
        if (tasks[i]){
          var mid=start+anglePer/2; ctx.save(); ctx.translate(cx,cy); ctx.rotate(mid); ctx.textAlign='right'; ctx.font='bold '+fontSize+'px system-ui';
          ctx.fillStyle='#fff'; ctx.shadowColor='rgba(0,0,0,.55)'; ctx.shadowBlur=2;
          var label = tasks[i].name.length>22?tasks[i].name.slice(0,21)+'…':tasks[i].name;
          ctx.fillText(label, radius-10, 5); ctx.restore();
        }
      }
      ctx.beginPath(); ctx.arc(cx,cy,22,0,Math.PI*2); ctx.fillStyle='#0b1220'; ctx.fill();
    }

    function easeOutCubic(t){ return 1-Math.pow(1-t,3); }

    function spin(){
      if (!tasks.length) return;
      var n = tasks.length; var anglePer = Math.PI*2/n; var startAngle=angle;
      var targetMid=-Math.PI/2; var sel=Math.floor(Math.random()*n); var curMid = angle + sel*anglePer + anglePer/2;
      var delta = targetMid - curMid + (3+Math.random()*2)*Math.PI*2; var duration=1400; var t0=performance.now();
      (function frame(now){
        var t=Math.min(1,(now-t0)/duration); angle=startAngle+delta*easeOutCubic(t); drawWheel();
        if (t<1) requestAnimationFrame(frame); else {
          angle=((angle%(Math.PI*2))+Math.PI*2)%(Math.PI*2); var theta=(( -Math.PI/2 - angle)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
          var idx=Math.floor(theta/anglePer)%n; var task=tasks[idx]; if (task) els.result.textContent='Selected: '+task.name;
          // Confetti bursts around indicator (top)
          var prefersReduced = false;
          try { prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e){}
          if (!prefersReduced && els.confetti) {
            var cx = els.canvas.width/2, cy = els.canvas.height/2; var r = radius + 12; var mid = -Math.PI/2; var off = 20 * Math.PI/180;
            var bursts = [
              { x: cx + Math.cos(mid - off) * r, y: cy + Math.sin(mid - off) * r },
              { x: cx + Math.cos(mid) * r,       y: cy + Math.sin(mid) * r },
              { x: cx + Math.cos(mid + off) * r, y: cy + Math.sin(mid + off) * r },
            ];
            burstConfetti(els.confetti, bursts);
          }
        }
      })(t0);
    }

    function addTask(ev){ ev.preventDefault(); var name=els.name.value.trim(); if(!name) return;
      var time=els.time.value?Math.max(0,Math.round(Number(els.time.value))):undefined;
      var loc=els.location.value||'any'; var dead=els.deadline.value||undefined;
      tasks=tasks.concat([{id:uid(), name:name, time:time, location:loc, deadline:dead}]);
      els.name.value=''; els.time.value=''; els.location.value='any'; els.deadline.value='';
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
        vx: (Math.random()-0.5)*7,
        vy: -Math.random()*6-2,
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
