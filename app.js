import{SERVICE,STATES,FAULTS,parseData,Lines,validateCommand,matchesReply,csv}from'./protocol.js';
const $=id=>document.getElementById(id);let device,writer,notifier,pending=null,busy=false,latest=null,lastAt=0,demoTimer=null,connecting=false;
let logs=[],rows=[];const decoder=new TextDecoder();
function log(text){const line=`${new Date().toISOString()} ${text}`;logs.push(line);if(logs.length>1500)logs.shift();$('terminal').textContent=logs.join('\n');$('terminal').scrollTop=$('terminal').scrollHeight;}
function notice(text){$('notice').textContent=text;}
function demo(){return demoTimer!==null;}
function connected(){return Boolean(device?.gatt?.connected&&writer&&notifier);}
function fresh(){return Boolean(latest&&performance.now()-lastAt<2000);}
function controls(){const on=connected()&&!demo();$('connect').disabled=connecting||connected()||demo();$('disconnect').disabled=!connected();$('send').disabled=!on||busy;$('get').disabled=!on||busy;for(const id of ['service','writeuuid','notifyuuid'])$(id).disabled=connecting||connected();}
function rejectPending(message){if(pending){const p=pending;pending=null;clearTimeout(p.timer);p.reject(new Error(message));}}
function reset(){rejectPending('Connection closed; command outcome unknown. Read settings after reconnecting.');writer=null;notifier=null;latest=null;lastAt=0;lines.reset();render();controls();}
function render(){const valid=fresh()&&(connected()||demo());const calibrated=valid&&latest.cal===1;
 for(const [key,id,dial,max]of[['kpa','map','mapDial',110],['psi','fuel','fuelDial',100],['duty','duty','dutyDial',100]]){const show=valid&&(key==='duty'||calibrated);$(id).textContent=show?latest[key].toFixed(1):'—';$(dial).style.setProperty('--fill',`${show?Math.min(270,Math.max(0,latest[key]/max*270)):0}deg`);}
 $('state').textContent=valid?STATES[latest.s]:'—';$('enable').textContent=valid?(latest.en?'AUTHORIZED':'OFF'):'—';$('fault').textContent=valid?FAULTS[latest.f]:'—';$('age').textContent=latest?`${((performance.now()-lastAt)/1000).toFixed(1)} s`:'—';
 const label=demo()?'DEMO · SIMULATED':!connected()?'DISCONNECTED':!valid?'WAITING / STALE':latest.f?'LIVE · FAULT':latest.cal?'LIVE':'LIVE · UNCALIBRATED';$('connection').textContent=label;$('connection').className='badge '+(valid&&!demo()&&latest.cal&&!latest.f?'live':connected()||demo()?'warn':'');
}
function receive(line){log('< '+line);const d=parseData(line);if(d){latest=d;lastAt=performance.now();rows.push({...d,time:new Date().toISOString()});if(rows.length>10000)rows.shift();if(!d.cal)notice('Live raw telemetry received. Sender calibration is unverified; pressure gauges remain blank.');else if(d.f)notice('Controller fault: '+FAULTS[d.f]+'. Inspect the system before clearing.');else notice('Live Bluetooth telemetry. Pump duty is the commanded output, not measured electrical power.');render();}
 if(pending&&matchesReply(pending.command,line)){const p=pending;pending=null;clearTimeout(p.timer);line.startsWith('ERR ')?p.reject(new Error(line)):p.resolve(line);}}
const lines=new Lines(receive);
async function connect(){if(demo())return;connecting=true;controls();try{
 if(!navigator.bluetooth)throw new Error('Web Bluetooth is unavailable. On iPhone, open this HTTPS page in Bluefy.');
 const service=$('service').value.trim().toLowerCase()||SERVICE;
 device=await navigator.bluetooth.requestDevice({acceptAllDevices:true,optionalServices:[service]});
 device.addEventListener('gattserverdisconnected',()=>{reset();notice('Disconnected. Gauges cleared; the controller continues independently.');log('! Bluetooth disconnected');},{once:true});
 const server=await device.gatt.connect();const svc=await server.getPrimaryService(service);const chars=await svc.getCharacteristics();
 const w=$('writeuuid').value.trim().toLowerCase(),n=$('notifyuuid').value.trim().toLowerCase();
 const writes=chars.filter(c=>w?c.uuid===w:c.properties.write||c.properties.writeWithoutResponse);
 const notes=chars.filter(c=>n?c.uuid===n:c.properties.notify||c.properties.indicate);
 if(writes.length!==1||notes.length!==1)throw new Error('Select explicit characteristic UUIDs in the guide: '+chars.map(c=>c.uuid).join(', '));
 writer=writes[0];notifier=notes[0];if(!(writer.properties.write||writer.properties.writeWithoutResponse)||!(notifier.properties.notify||notifier.properties.indicate))throw new Error('Selected characteristics lack required properties.');
 lines.reset();notifier.addEventListener('characteristicvaluechanged',e=>{lines.feed(decoder.decode(e.target.value));});await notifier.startNotifications();
 $('device').textContent=device.name||'REYAX controller';notice('Connected. Waiting for controller telemetry…');log('! Connected '+(device.name||device.id));
 }catch(e){device?.gatt?.disconnect();reset();notice(e.message);log('! '+e.message);}finally{connecting=false;controls();render();}}
async function send(command){command=command.trim();if(busy)throw new Error('Wait for the previous command.');if(!connected()||demo())throw new Error('Connect to a real controller first.');if(!validateCommand(command))throw new Error('Unsupported command or invalid format.');
 if(!['STATUS','GET'].includes(command)){if(!fresh()||latest.en!==0)throw new Error('Fresh telemetry with ECU enable OFF is required for this console command.');if(!confirm(`Send ${command}? Configuration changes require system-specific validation. STOP latches the pump OFF.`))return;}
 busy=true;controls();log('> '+command);try{const response=new Promise((resolve,reject)=>{pending={command,resolve,reject,timer:setTimeout(()=>{pending=null;reject(new Error('Reply timeout. Outcome unknown; do not automatically repeat writes.'));},command==='GET'||command==='SAVE'?8000:4000)};});
 // Attach a handler before asynchronous writes so disconnect/timeout cannot create an unhandled rejection.
 response.catch(()=>{});const bytes=new TextEncoder().encode(command+'\n');try{for(let offset=0;offset<bytes.length;offset+=20){if(!connected())throw new Error('Disconnected while sending.');const part=bytes.slice(offset,offset+20);if(writer.properties.write)await writer.writeValueWithResponse(part);else await writer.writeValueWithoutResponse(part);}}catch(e){rejectPending(e.message);throw e;}
 await response;
 }finally{busy=false;controls();}}
$('connect').onclick=connect;$('disconnect').onclick=()=>{device?.gatt?.disconnect();reset();notice('Disconnected.');};
$('commandform').onsubmit=async e=>{e.preventDefault();try{await send($('command').value);$('command').value='';}catch(err){notice(err.message);log('! '+err.message);}};
$('get').onclick=()=>send('GET').catch(e=>{notice(e.message);log('! '+e.message);});
function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export').onclick=()=>download('smartpump-'+(demo()?'demo-':'')+Date.now()+'.csv',csv(rows),'text/csv');$('logexport').onclick=()=>download('smartpump-terminal-'+Date.now()+'.txt',logs.join('\n'),'text/plain');
$('demo').onclick=()=>{if(demo()){clearInterval(demoTimer);demoTimer=null;latest=null;lastAt=0;rows=[];logs=[];$('terminal').textContent='';$('demo').textContent='Explore demo data';notice('Demo ended. Connect to your real controller.');render();controls();return;}
 if(connected()||connecting)return;rows=[];logs=[];let t=0;demoTimer=setInterval(()=>{t++;receive(`DATA ms=${t*250} en=1 s=4 f=0 pADC=560 mADC=300 psi_x100=${5800+Math.round(Math.sin(t/5)*20)} kpa_x100=${3600+Math.round(Math.sin(t/9)*300)} duty_pm=720 cal=1 reduced=1`);notice('DEMO ONLY · Simulated values, not connected to a pump.');},250);$('demo').textContent='Exit demo';controls();render();};
setInterval(render,250);document.addEventListener('visibilitychange',()=>{if(document.hidden)log('! Page backgrounded; updates may pause.');else render();});
log('! Ready. Uno v0.3 telemetry • REYAX BLE • no cloud data upload.');controls();render();
