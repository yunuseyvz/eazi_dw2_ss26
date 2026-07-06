/*
 * ui.h — Embedded web UI for the LED controller.
 * Served at / and /ui by the ESP32. Single-page vanilla HTML/CSS/JS,
 * no external dependencies. Talks to the same /state endpoint as
 * the Next.js app (led_control_ui/).
 */
#pragma once

const char UI_HTML[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<meta name="theme-color" content="#1a1a1a">
<title>LED-Steuerung</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;color:#1a1a1a;max-width:640px;margin:0 auto;padding:0 20px 20px;min-height:100vh;display:flex;flex-direction:column;gap:16px}
header{background:#1a1a1a;color:#fff;padding:16px 20px;margin:0 -20px;display:flex;align-items:center;gap:12px}
header .logo{background:#fff;color:#1a1a1a;font-weight:800;font-size:14px;padding:4px 10px;border-radius:4px;letter-spacing:1px;line-height:1}
header span{font-size:15px;font-weight:600}
.cycle{width:100%;padding:40px 20px;border:none;border-radius:16px;font-size:28px;font-weight:800;cursor:pointer;transition:background .35s,color .35s,border-color .35s;border:2px solid;box-shadow:0 2px 8px rgba(0,0,0,.1)}
.cycle:disabled{opacity:.5;cursor:not-allowed}
.cycle .sub{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;opacity:.8;margin-top:8px}
details{background:#fff;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.04)}
summary{cursor:pointer;padding:16px 20px;font-weight:700;font-size:15px;list-style:none;display:flex;align-items:center;gap:12px;user-select:none}
summary::-webkit-details-marker{display:none}
summary::before{content:'\203A';font-size:20px;font-weight:700;transition:transform .2s;color:#5a5a5a}
details[open] summary::before{transform:rotate(90deg)}
details .body{padding:0 16px 16px;display:flex;flex-direction:column;gap:12px}
.card{background:#fff;border:1px solid #e5e5e5;border-radius:10px;padding:16px;box-shadow:0 1px 2px rgba(0,0,0,.03)}
.card-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.card-h .name{font-weight:700;font-size:15px}
.toggle{position:relative;display:inline-block;width:48px;height:28px;cursor:pointer}
.toggle input{opacity:0;width:0;height:0}
.toggle .slider{position:absolute;inset:0;background:#d9d9d9;border-radius:14px;transition:background .2s}
.toggle .slider::before{content:'';position:absolute;height:20px;width:20px;left:4px;top:4px;background:#fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,.2);transition:left .2s}
.toggle input:checked+.slider{background:var(--accent,#0068b4)}
.toggle input:checked+.slider::before{left:24px}
.controls{display:flex;align-items:center;gap:12px}
.color-pick{width:40px;height:40px;border:1px solid #d9d9d9;border-radius:6px;cursor:pointer;padding:0;background:none;flex-shrink:0}
.color-pick:disabled{opacity:.5}
.effects{display:flex;flex-wrap:wrap;gap:6px;flex:1}
.effects button{flex:1;min-width:60px;padding:6px 8px;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;background:#f0f0f0;color:#5a5a5a;transition:background .15s,color .15s}
.effects button:disabled{opacity:.5;cursor:not-allowed}
.range-row{display:flex;align-items:center;gap:12px}
.range-row label{font-weight:700;font-size:15px;white-space:nowrap}
.range-row .val{font-size:12px;font-weight:600;color:#5a5a5a;font-variant-numeric:tabular-nums}
input[type=range]{flex:1;accent-color:#0068b4}
input[type=number]{width:96px;padding:8px 12px;border:1px solid #d9d9d9;border-radius:6px;font-size:15px;font-weight:600;font-variant-numeric:tabular-nums}
.conn{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px}
.conn .dot{width:8px;height:8px;border-radius:50%;background:#8a8a8a}
.conn.ok .dot{background:#008754}.conn.ok{color:#008754}
.conn.err .dot{background:#c1121c}.conn.err{color:#c1121c}
footer{margin-top:auto;padding-top:12px;text-align:center;font-size:12px;color:#8a8a8a;font-weight:500}
footer .raw{display:block;margin-bottom:6px;font-size:11px;font-family:monospace;color:#8a8a8a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
</style>
</head>
<body>
<header>
<div class="logo">LED</div>
<span>Board-Prototyp</span>
</header>

<button id="cycle" class="cycle" onclick="cycleState()">
<div class="lbl">AUS</div>
<div class="sub">Lade...</div>
</button>

<details>
<summary>Individuell</summary>
<div class="body">
<div class="card" id="s1-card" style="--accent:#f5c842">
<div class="card-h"><span class="name">Strip 1 &mdash; Querstreifen</span>
<label class="toggle"><input type="checkbox" id="s1_on" onchange="toggleStrip(1)"><span class="slider"></span></label>
</div>
<div class="controls">
<input type="color" class="color-pick" id="s1_color" onchange="setStripColor(1,this.value)">
<div class="effects" id="s1_effects">
<button data-effect="solid" onclick="setStripEffect(1,'solid')">Statisch</button>
<button data-effect="blink" onclick="setStripEffect(1,'blink')">Blinken</button>
<button data-effect="fade" onclick="setStripEffect(1,'fade')">Atmen</button>
<button data-effect="chase" onclick="setStripEffect(1,'chase')">Lauflicht</button>
<button data-effect="rainbow" onclick="setStripEffect(1,'rainbow')">Bunt</button>
<button data-effect="sparkle" onclick="setStripEffect(1,'sparkle')">Funkeln</button>
</div>
</div>
</div>
<div class="card" id="s2-card" style="--accent:#0068b4">
<div class="card-h"><span class="name">Strip 2 &mdash; Umrandung</span>
<label class="toggle"><input type="checkbox" id="s2_on" onchange="toggleStrip(2)"><span class="slider"></span></label>
</div>
<div class="controls">
<input type="color" class="color-pick" id="s2_color" onchange="setStripColor(2,this.value)">
<div class="effects" id="s2_effects">
<button data-effect="solid" onclick="setStripEffect(2,'solid')">Statisch</button>
<button data-effect="blink" onclick="setStripEffect(2,'blink')">Blinken</button>
<button data-effect="fade" onclick="setStripEffect(2,'fade')">Atmen</button>
<button data-effect="chase" onclick="setStripEffect(2,'chase')">Lauflicht</button>
<button data-effect="rainbow" onclick="setStripEffect(2,'rainbow')">Bunt</button>
<button data-effect="sparkle" onclick="setStripEffect(2,'sparkle')">Funkeln</button>
</div>
</div>
</div>
<div class="card" id="s3-card" style="--accent:#1a1a1a">
<div class="card-h"><span class="name">Strip 3 &mdash; Rollstuhl-Symbol</span>
<label class="toggle"><input type="checkbox" id="s3_on" onchange="toggleStrip(3)"><span class="slider"></span></label>
</div>
<div class="controls">
<div class="effects" id="s3_effects">
<button data-effect="solid" onclick="setStripEffect(3,'solid')">Statisch</button>
<button data-effect="blink" onclick="setStripEffect(3,'blink')">Blinken</button>
</div>
</div>
</div>
</div>
</details>

<details>
<summary>Einstellungen</summary>
<div class="body">
<div class="card">
<div class="range-row"><label>Helligkeit</label><input type="range" id="brightness" min="0" max="255" onchange="setBrightness(this.value)"><span class="val" id="brightness-val">40/255</span></div>
</div>
<div class="card">
<div class="range-row"><label>LED-Anzahl</label><input type="number" id="numPixels" min="1" max="2000" onchange="setNumPixels(this.value)"></div>
</div>
</div>
</details>

<div class="conn" id="conn"><span class="dot"></span><span id="conn-text">Verbinde...</span></div>

<footer>
<span class="raw" id="raw">Ziel: selbes Geraet</span>
Prototyp &mdash; Design Workshop 2
</footer>

<script>
window.onerror=function(msg,url,line){var d=document.getElementById('conn-text');if(d)d.textContent='JS Fehler: '+msg;return false};
window.addEventListener('unhandledrejection',function(e){var d=document.getElementById('conn-text');if(d)d.textContent='JS: '+(e.reason&&e.reason.message||e.reason||'Promise error')});
var LBL={1:'Kein Bedarf',2:'Rollstuhlfahrer'};
var SUB={1:'Tippen fuer Rollstuhlfahrer',2:'Tippen fuer Kein Bedarf'};
var BG={1:'#f5c842',2:'#0068b4'};
var FG={1:'#5a3e0a',2:'#fff'};
var ACC=['#f5c842','#0068b4','#1a1a1a'];
var st={state:1,brightness:40,numPixels:1000,s1:{on:true,color:[0,255,0],effect:'solid'},s2:{on:true,color:[0,0,255],effect:'solid'},s3:{on:true,color:[0,0,0],effect:'solid'}};
var busy=false;

function rgb2hex(a){return'#'+a.map(function(n){return('0'+Math.max(0,Math.min(255,n|0)).toString(16)).slice(-2)}).join('')}
function hex2rgb(h){var m=/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h);return m?[parseInt(m[1],16),parseInt(m[2],16),parseInt(m[3],16)]:[0,0,0]}
function norm(d){
  if(!d)d={};
  var s=(d.state===1||d.state===2)?d.state:1;
  var b=typeof d.brightness==='number'?d.brightness:40;
  var n=typeof d.numPixels==='number'&&d.numPixels>0?d.numPixels:1000;
  function mk(k,fb){
    var src=d[k]||{};
    return{on:typeof src.on==='boolean'?src.on:fb.on,color:Array.isArray(src.color)&&src.color.length===3?src.color.map(function(x){return x|0}):fb.color,effect:src.effect||fb.effect};
  }
  return{state:s,brightness:b,numPixels:n,s1:mk('s1',{on:true,color:[0,255,0],effect:'solid'}),s2:mk('s2',{on:true,color:[0,0,255],effect:'solid'}),s3:mk('s3',{on:true,color:[0,0,0],effect:'solid'})};
}

function setConn(type,text){
  var c=document.getElementById('conn'),t=document.getElementById('conn-text');
  if(c)c.className='conn '+(type==='ok'?'ok':type==='err'?'err':'');
  if(t)t.textContent=text;
}

function fetchState(){
  try{
    var r;
    fetch('/state').then(function(response){
      if(!response.ok){setConn('err','HTTP '+response.status);return}
      return response.json();
    }).then(function(d){
      if(!d)return;
      st=norm(d);render();setConn('ok','ESP verbunden');
      var raw=document.getElementById('raw');if(raw)raw.textContent=JSON.stringify(d);
    }).catch(function(e){setConn('err','Getrennt')});
  }catch(e){setConn('err','Getrennt')}
}

function send(body){
  if(busy)return;
  busy=true;document.getElementById('cycle').disabled=true;
  try{
    fetch('/state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(response){
      if(!response.ok){setConn('err','HTTP '+response.status);return null}
      return response.json();
    }).then(function(d){
      if(!d)return;
      st=norm(d);render();setConn('ok','ESP verbunden');
      var raw=document.getElementById('raw');if(raw)raw.textContent=JSON.stringify(d);
    }).catch(function(e){setConn('err',e.message||'Fehler')});
  }catch(e){setConn('err',e.message||'Fehler')}
  finally{busy=false;document.getElementById('cycle').disabled=false}
}

function cycleState(){var next=(st.state==1?2:1);send({state:next})}
function toggleStrip(n){var k='s'+n+'_on';send({[k]:!st['s'+n].on})}
function setStripColor(n,hex){var k='s'+n+'_color';send({[k]:hex2rgb(hex)})}
function setStripEffect(n,effect){var k='s'+n+'_effect';send({[k]:effect})}
function setBrightness(v){send({brightness:parseInt(v,10)})}
function setNumPixels(v){var n=parseInt(v,10);if(!isNaN(n)&&n>0)send({numPixels:n})}

function render(){
  var cy=document.getElementById('cycle');
  cy.style.background=BG[st.state];cy.style.color=FG[st.state];cy.style.borderColor=BG[st.state];
  cy.querySelector('.lbl').textContent=LBL[st.state];
  cy.querySelector('.sub').textContent=SUB[st.state];

  for(var n=1;n<=3;n++){
    var cfg=st['s'+n];
    var onEl=document.getElementById('s'+n+'_on');
    if(onEl)onEl.checked=cfg.on;
    var colEl=document.getElementById('s'+n+'_color');
    if(colEl)colEl.value=rgb2hex(cfg.color);
    var effContainer=document.getElementById('s'+n+'_effects');
    if(effContainer){
      var btns=effContainer.querySelectorAll('button');
      var accent=ACC[n-1];
      for(var i=0;i<btns.length;i++){
        if(btns[i].dataset.effect===cfg.effect){btns[i].style.background=accent;btns[i].style.color='#fff'}
        else{btns[i].style.background='#f0f0f0';btns[i].style.color='#5a5a5a'}
      }
    }
  }

  var br=document.getElementById('brightness');
  if(br){br.value=st.brightness;document.getElementById('brightness-val').textContent=st.brightness+'/255'}
  var np=document.getElementById('numPixels');
  if(np)np.value=st.numPixels;
}

setConn('','JS geladen — lade Daten...');
fetchState();
</script>
</body>
</html>
)rawliteral";