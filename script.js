// ---------- Option lists (match the backend's Literal / dataset values) ----------
const COUNTRIES = ['Afghanistan','Albania','Andorra','Argentina','Armenia','Australia','Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Belarus','Belgium','Bhutan','Bolivia','Bosnia','Brazil','Bulgaria','Canada','Chile','China','Colombia','Costa Rica','Croatia','Cyprus','Czech Republic','Denmark','Ecuador','Egypt','Estonia','Finland','France','Georgia','Germany','Ghana','Greece','Hong Kong','Hungary','Iceland','India','Indonesia','Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kosovo','Kuwait','Kyrgyzstan','Latvia','Lebanon','Liechtenstein','Lithuania','Luxembourg','Malaysia','Maldives','Malta','Mexico','Moldova','Monaco','Montenegro','Morocco','Nepal','Netherlands','New Zealand','Nigeria','North Macedonia','Norway','Oman','Pakistan','Panama','Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','San Marino','Serbia','Singapore','Slovakia','Slovenia','South Africa','South Korea','Spain','Sri Lanka','Sweden','Switzerland','Syria','Taiwan','Tajikistan','Thailand','Trinidad','Turkey','UAE','UK','USA','Ukraine','Uruguay','Uzbekistan','Vatican City','Venezuela','Vietnam','Yemen','Other'];
const PLATFORMS = ['Instagram','Facebook','TikTok','YouTube','WhatsApp','Snapchat','Twitter','LinkedIn','WeChat','LINE','KakaoTalk','VKontakte'];

const $ = id => document.getElementById(id);
const fill = (sel, items, def) => {
  sel.innerHTML = items.map(v => `<option${v === def ? ' selected' : ''}>${v}</option>`).join('');
};
fill($('country'), COUNTRIES, 'India');
fill($('most_used_platform'), PLATFORMS, 'Instagram');

// ---------- Live slider labels + filled track ----------
const sliders = [
  ['avg_daily_usage_hours', 'o_usage'],
  ['daily_unlocks', 'o_unlocks'],
  ['study_hours', 'o_study'],
  ['physical_activity_hours', 'o_activity'],
  ['sleep_hours_per_night', 'o_sleep'],
];
sliders.forEach(([id, out]) => {
  const el = $(id);
  const update = () => {
    const pct = ((el.value - el.min) / (el.max - el.min)) * 100;
    el.style.setProperty('--p', pct + '%');
    $(out).textContent = el.step === '1' ? el.value : Number(el.value).toFixed(1);
  };
  el.addEventListener('input', update);
  update();
});

// ---------- Submit ----------
const form = $('form'), btn = $('submit'), errBox = $('error');

form.addEventListener('submit', async e => {
  e.preventDefault();
  errBox.hidden = true;

  const payload = {
    age: parseInt($('age').value, 10),
    gender: document.querySelector('input[name=gender]:checked').value,
    country: $('country').value,
    academic_level: $('academic_level').value,
    most_used_platform: $('most_used_platform').value,
    purpose_of_use: $('purpose_of_use').value,
    avg_daily_usage_hours: parseFloat($('avg_daily_usage_hours').value),
    daily_unlocks: parseInt($('daily_unlocks').value, 10),
    study_hours: parseFloat($('study_hours').value),
    physical_activity_hours: parseFloat($('physical_activity_hours').value),
    sleep_hours_per_night: parseFloat($('sleep_hours_per_night').value),
    stress_level: document.querySelector('input[name=stress]:checked').value,
  };

  if (!(payload.age >= 10 && payload.age <= 100)) return showError('Please enter an age between 10 and 100.');

  btn.disabled = true; btn.classList.add('loading');
  try {
    const base = $('apiUrl').value.trim().replace(/\/+$/, '');
    const res = await fetch(`${base}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const detail = Array.isArray(body?.detail)
        ? body.detail.map(d => `${d.loc.slice(1).join('.')}: ${d.msg}`).join(' · ')
        : `Server returned ${res.status}`;
      throw new Error(detail);
    }
    const data = await res.json();
    showResult(data.predicted_mental_health_score, payload);
  } catch (err) {
    showError(err instanceof TypeError
      ? 'Could not reach the backend. Make sure it is running (uvicorn main:app --reload) and the URL below is correct.'
      : err.message);
  } finally {
    btn.disabled = false; btn.classList.remove('loading');
  }
});

function showError(msg) { errBox.textContent = msg; errBox.hidden = false; }

// ---------- Result rendering ----------
const CIRC = 2 * Math.PI * 84;

function showResult(score, p) {
  $('placeholder').hidden = true;
  $('output').hidden = false;

  // restart the entrance animation
  const out = $('output'); out.style.animation = 'none'; out.offsetHeight; out.style.animation = '';

  // animate ring + number (dataset scores run ~3.6–9.4, ring is scaled out of 10)
  const bar = $('bar');
  bar.style.strokeDashoffset = CIRC;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    bar.style.strokeDashoffset = CIRC * (1 - Math.min(Math.max(score, 0), 10) / 10);
  }));
  countUp($('score'), score, 1200);

  const badge = $('badge');
  let tier, label, msg;
  if (score >= 7.5)      { tier = 'good'; label = 'Thriving';       msg = 'Your habits point to strong mental well-being. Keep up the balance you have built.'; }
  else if (score >= 6)   { tier = 'good'; label = 'Doing well';     msg = 'Overall healthy, with a little room to fine-tune a few daily habits.'; }
  else if (score >= 5)   { tier = 'mid';  label = 'Needs attention'; msg = 'Some signs of strain. Small changes to sleep, screen time or movement could help.'; }
  else                   { tier = 'low';  label = 'At risk';        msg = 'Your profile suggests notable strain. Consider reaching out for support and resetting a few habits.'; }
  badge.className = 'badge ' + tier; badge.textContent = label;
  $('msg').textContent = msg;

  // personalised, rule-based tips from the user's own inputs
  const tips = [];
  if (p.sleep_hours_per_night < 7)           tips.push(['😴', `You sleep ${p.sleep_hours_per_night} h a night — aim for 7–9 h.`]);
  if (p.avg_daily_usage_hours > 5)           tips.push(['📱', `${p.avg_daily_usage_hours} h of daily social media is high. Try app timers or a no-phone hour before bed.`]);
  if (p.physical_activity_hours < 1)         tips.push(['🏃', 'Add a short walk or workout — even 30 minutes helps mood.']);
  if (p.daily_unlocks > 150)                 tips.push(['🔓', `${p.daily_unlocks} unlocks a day suggests constant checking. Silence non-essential notifications.`]);
  if (['High', 'Very High'].includes(p.stress_level)) tips.push(['🧘', 'Stress is elevated — breathing exercises, journaling or talking to someone can help.']);
  if (!tips.length)                          tips.push(['✨', 'Your daily habits look well balanced. Keep it up!']);
  $('tips').innerHTML = tips.slice(0, 4).map(([i, t]) => `<li data-i="${i}">${t}</li>`).join('');

  if (window.innerWidth <= 900) $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function countUp(el, to, ms) {
  const start = performance.now();
  const tick = now => {
    const t = Math.min((now - start) / ms, 1);
    el.textContent = (to * (1 - Math.pow(1 - t, 3))).toFixed(1);
    if (t < 1) requestAnimationFrame(tick); else el.textContent = to.toFixed(1);
  };
  requestAnimationFrame(tick);
}
