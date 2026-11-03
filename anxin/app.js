(() => {
  'use strict';
  const packages = Object.freeze({
    tea: {"name": "Ly trà đá", "amount": 5000, "gift": "một ly trà đá", "rank": "Ân nhân giải khát"},
    coffee: {"name": "Ly cà phê", "amount": 20000, "gift": "một ly cà phê", "rank": "Ân nhân tiếp năng lượng"},
    banhmi: {"name": "Ổ bánh mì", "amount": 30000, "gift": "một ổ bánh mì", "rank": "Ân nhân bánh mì nóng"},
    rice: {"name": "Dĩa cơm sườn", "amount": 50000, "gift": "một dĩa cơm sườn", "rank": "Ân nhân cứu chiếc bụng"},
    noodle: {"name": "Tô hủ tíu no bụnh", "amount": 100000, "gift": "một tô hủ tíu no bụnh", "rank": "Ân nhân no bụnh"},
    pizza: {"name": "Một chiếc pizza", "amount": 150000, "gift": "một chiếc pizza", "rank": "Ân nhân phô mai kéo sợi"},
    chicken: {"name": "Con gà nướng", "amount": 200000, "gift": "một con gà nướng", "rank": "Ân nhân gà nướng nguyên con"},
    hotpot: {"name": "Nồi lẩu ấm lòng", "amount": 350000, "gift": "một nồi lẩu ấm lòng", "rank": "Ân nhân nồi lẩu ấm lòng"},
    buffet: {"name": "Một bữa buffet", "amount": 700000, "gift": "một bữa buffet", "rank": "Ân nhân đại tiệc buffet"},
    crab: {"name": "Cua hoàng đế", "amount": 1500000, "gift": "một bữa cua hoàng đế", "rank": "Ân nhân cua hoàng đế"},
    lobster: {"name": "Tôm hùm đãi đời", "amount": 3000000, "gift": "một bữa tôm hùm", "rank": "Ân nhân tôm hùm đãi đời"},
    omakase: {"name": "Omakase", "amount": 7000000, "gift": "một bữa Omakase", "rank": "Đại ân nhân Omakase"}
  });
  // Reveal once as sections enter the viewport; keep content visible without JS.
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll('.food-card, .menu-group-heading, .merit-section, .faq').forEach((el, index) => {
      el.classList.add('reveal-item');
      el.style.setProperty('--reveal-delay', `${(index % 4) * 65}ms`);
      observer.observe(el);
    });
    // Accessibility preference changes must not leave queued content hidden.
    reducedMotion.addEventListener?.('change', () => {
      if (reducedMotion.matches) {
        observer.disconnect();
        document.querySelectorAll('.reveal-item').forEach(el => el.classList.add('is-visible'));
      }
    });
  }
  const $ = id => document.getElementById(id);
  const money = n => new Intl.NumberFormat('vi-VN').format(n) + 'đ';
  const dialog = $('donate-dialog');
  let chosen = 'rice';
  let card = null;
  let toastTimer;
  let trigger;
  function toast(message) {
    $('toast').textContent = message;
    $('toast').classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3500);
  }
  function openPackage(key, source) {
    if (!packages[key]) return;
    chosen = key;
    card = null;
    trigger = source;
    const p = packages[key];
    $('payment-view').hidden = false;
    $('success-view').hidden = true;
    $('dialog-title').textContent = 'Mời Drake ' + p.gift;
    $('payment-food').textContent = p.name;
    $('payment-amount').textContent = money(p.amount);
    $('instruction-amount').textContent = money(p.amount);
    $('payment-icon').setAttribute('href', '#' + key);
    $('transfer-confirmed').checked = false;
    document.body.classList.add('modal-open');
    dialog.showModal();
    dialog.scrollTop = 0;
  }
  function closeDialog() { dialog.close(); }
  document.querySelectorAll('[data-package]').forEach(button => {
    button.addEventListener('click', () => openPackage(button.dataset.package, button));
  });
  document.querySelector('.close-dialog').addEventListener('click', closeDialog);
  $('change-package').addEventListener('click', () => {
    closeDialog();
    $('thuc-don').scrollIntoView({ behavior: 'smooth' });
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeDialog();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    trigger?.focus({ preventScroll: true });
  });
  function fitText(ctx, text, maxWidth, size, min, font) {
    while (size > min) {
      ctx.font = font(size);
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= 1;
    }
    return text;
  }
  function drawCard(data) {
    const p = packages[data.package];
    const canvas = $('merit-canvas');
    const c = canvas.getContext('2d');
    if (!c) throw new Error('Canvas unavailable');
    const w = canvas.width;
    c.fillStyle = '#0e2221'; c.fillRect(0, 0, w, canvas.height);
    c.strokeStyle = '#c9ac72'; c.lineWidth = 3; c.strokeRect(44, 44, 1112, 1412);
    c.lineWidth = 1; c.strokeRect(59, 59, 1082, 1382);
    c.fillStyle = '#dcc492'; c.textAlign = 'center';
    c.font = '600 25px "Be Vietnam Pro", Arial, sans-serif'; c.fillText('ĂN XIN ONLINE  /  DRAKE NGUYỄN', w / 2, 140);
    c.strokeStyle = '#73684c'; c.beginPath(); c.moveTo(130, 184); c.lineTo(1070, 184); c.stroke();
    c.fillStyle = '#b1ac96'; c.font = '500 19px "Be Vietnam Pro", Arial, sans-serif'; c.fillText('CHỨNG NHẬN MỘT CHÚT TỬ TẾ', w / 2, 255);
    c.fillStyle = '#f2ead7'; c.font = '700 70px "Playfair Display", Georgia, serif'; c.fillText('THẺ CÔNG ĐỨC', w / 2, 362);
    c.fillStyle = '#d3b16f'; c.font = '150px Georgia, serif'; c.fillText('✺', w / 2, 555);
    c.fillStyle = '#c0bda9'; c.font = '26px "Be Vietnam Pro", Arial, sans-serif'; c.fillText('Trân trọng tấm lòng của', w / 2, 643);
    c.fillStyle = '#dcc492'; fitText(c, data.name, 920, 66, 20, n => `italic 600 ${n}px "Playfair Display", Georgia, serif`); c.fillText(data.name, w / 2, 746);
    c.fillStyle = '#c0bda9'; c.font = '24px "Be Vietnam Pro", Arial, sans-serif'; c.fillText('Đã mời Drake ' + p.gift, w / 2, 827);
    c.fillStyle = '#f2ead7'; c.font = '700 82px "Be Vietnam Pro", Arial, sans-serif'; c.fillText(money(p.amount), w / 2, 944);
    c.fillStyle = '#d3b16f'; c.font = '500 24px "Be Vietnam Pro", Arial, sans-serif'; c.fillText(p.rank.toUpperCase(), w / 2, 1013);
    c.setLineDash([8, 8]); c.beginPath(); c.moveTo(120, 1075); c.lineTo(1080, 1075); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#c0bda9'; c.font = '21px "Be Vietnam Pro", Arial, sans-serif';
    c.fillText('Một bữa được mời. Một lời cảm ơn được giữ.', w / 2, 1143);
    const date = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'medium' }).format(new Date(data.date));
    c.font = '18px "Be Vietnam Pro", Arial, sans-serif'; c.fillText(`${date}  ·  ${data.id}`, w / 2, 1202);
    c.fillStyle = '#d3b16f'; c.font = 'italic 44px "Playfair Display", Georgia, serif'; c.fillText('Cảm ơn bạn, Drake', w / 2, 1290);
    c.fillStyle = '#b1ac96'; c.font = '16px "Be Vietnam Pro", Arial, sans-serif'; c.fillText('NGƯỜI GỬI TỰ XÁC NHẬN · CHƯA ĐỐI SOÁT MOMO', w / 2, 1360);
    c.font = '15px "Be Vietnam Pro", Arial, sans-serif'; c.fillText('Thẻ lưu niệm, không phải biên lai  ·  about.drakenguyen.me/anxin', w / 2, 1394);
    canvas.setAttribute('aria-label', `Thẻ công đức của ${data.name}, gói ${p.name}, ${money(p.amount)}. Người gửi tự xác nhận, chưa đối soát MoMo.`);
  }
  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const container = $('confetti');
    container.replaceChildren();
    for (let i = 0; i < 28; i++) {
      const el = document.createElement('i');
      el.style.setProperty('--x', (Math.random() * 700 - 350) + 'px');
      el.style.setProperty('--y', (Math.random() * 600 + 200) + 'px');
      el.style.setProperty('--r', (Math.random() * 1000 - 500) + 'deg');
      container.append(el);
    }
    setTimeout(() => container.replaceChildren(), 1800);
  }
  $('merit-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!$('merit-form').reportValidity()) return;
    const button = event.submitter;
    button.disabled = true;
    try {
      await document.fonts.ready;
      card = {
        name: $('donor-name').value.trim().replace(/[\u0000-\u001f\u007f-\u009f]/g, '').slice(0, 45) || 'Một người tốt bụng',
        package: chosen,
        date: new Date().toISOString(),
        id: 'AX-' + Array.from(crypto.getRandomValues(new Uint8Array(4)), b => b.toString(16).padStart(2, '0')).join('').toUpperCase(),
        status: 'self-reported-unverified'
      };
      drawCard(card);
      try { localStorage.setItem('anxin-last-card', JSON.stringify(card)); } catch { /* Downloads still work with storage disabled. */ }
      $('payment-view').hidden = true;
      $('success-view').hidden = false;
      dialog.setAttribute('aria-labelledby', 'success-title');
      $('success-view').querySelector('h2').id = 'success-title';
      dialog.scrollTop = 0;
      $('download-card').focus({ preventScroll: true });
      confetti();
    } catch {
      toast('Chưa tạo được thẻ. Bạn thử lại hoặc dùng trình duyệt mới hơn nhé.');
    } finally { button.disabled = false; }
  });
  function pngBlob() {
    return new Promise((resolve, reject) => $('merit-canvas').toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG unavailable')), 'image/png'));
  }
  async function download() {
    if (!card) return;
    try {
      const url = URL.createObjectURL(await pngBlob());
      const a = document.createElement('a');
      a.href = url; a.download = `the-cong-duc-${card.id}.png`;
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      toast('Đã chuẩn bị thẻ PNG. Kiểm tra thư mục tải xuống nhé.');
    } catch { toast('Không tải được thẻ. Bạn có thể chụp màn hình để lưu.'); }
  }
  $('download-card').addEventListener('click', download);
  $('share-card').addEventListener('click', async () => {
    if (!card) return;
    try {
      const file = new File([await pngBlob()], `the-cong-duc-${card.id}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Một chút tử tế', text: 'Một bữa được mời. Một lời cảm ơn được giữ. https://about.drakenguyen.me/anxin' });
      } else {
        await download();
        toast('Thẻ đã sẵn sàng tải về để bạn chia sẻ.');
      }
    } catch (error) { if (error.name !== 'AbortError') toast('Bạn có thể dùng nút tải thẻ rồi chia sẻ ảnh nhé.'); }
  });
  // Only restore a local souvenir on explicit request; never infer a verified payment.
  try {
    const saved = JSON.parse(localStorage.getItem('anxin-last-card') || 'null');
    if (saved && packages[saved.package] && typeof saved.name === 'string' && saved.name.length <= 45 && /^AX-[A-F0-9]{8}$/.test(saved.id) && !Number.isNaN(Date.parse(saved.date)) && saved.status === 'self-reported-unverified') {
      const restore = document.createElement('button'); restore.type = 'button'; restore.className = 'text-link'; restore.textContent = 'Xem lại thẻ gần nhất trên máy này ↗';
      document.querySelector('.merit-copy').append(restore);
      restore.addEventListener('click', async () => {
        await document.fonts.ready;
        card = saved; trigger = restore; drawCard(saved);
        $('payment-view').hidden = true; $('success-view').hidden = false;
        $('success-view').querySelector('h2').id = 'success-title'; dialog.setAttribute('aria-labelledby', 'success-title');
        document.body.classList.add('modal-open'); dialog.showModal(); dialog.scrollTop = 0;
      });
    }
  } catch { /* No saved card. */ }
  dialog.addEventListener('close', () => dialog.setAttribute('aria-labelledby', 'dialog-title'));
})();
