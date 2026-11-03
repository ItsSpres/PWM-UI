export const SERVICE='f000c0c0-0451-4000-b000-000000000000';
export const STATES=['OFF','LOCKED','PRIME','FULL OUTPUT','NORMAL','FAULT'];
export const FAULTS=['None','Reserved','Pressure sender','Low pressure','High pressure','User STOP'];
export function parseData(line){
 if(!line.startsWith('DATA '))return null;
 const d={};for(const token of line.slice(5).trim().split(/\s+/)){const m=/^(\w+)=(-?\d+)$/.exec(token);if(!m||m[1] in d)return null;d[m[1]]=Number(m[2]);}
 const fields=['ms','en','s','f','pADC','mADC','psi_x100','kpa_x100','duty_pm','cal','reduced'];
 if(fields.some(k=>!Number.isSafeInteger(d[k])))return null;
 if(![0,1].includes(d.en)||![0,1].includes(d.cal)||![0,1].includes(d.reduced)||d.s<0||d.s>5||d.f<0||d.f>5||d.duty_pm<0||d.duty_pm>1000||d.ms<0||d.pADC<0||d.pADC>1023||d.mADC<0||d.mADC>1023)return null;
 return {...d,psi:d.psi_x100/100,kpa:d.kpa_x100/100,duty:d.duty_pm/10};
}
export class Lines{
 constructor(onLine){this.onLine=onLine;this.reset();}
 reset(){this.text='';this.drop=false;}
 feed(text){for(const ch of text){if(ch==='\r'||ch==='\n'){if(this.text&&!this.drop)this.onLine(this.text);this.reset();}else if(!this.drop){if(ch<' '||ch>'~'||this.text.length>=512){this.text='';this.drop=true;}else this.text+=ch;}}}
}
export function validateCommand(s){return /^(STATUS|GET|HELLO|UNLOCK [0-9]{1,5}|SET [a-z0-9_]+ -?\d+(\.\d+)?|APPLY|SAVE|REVERT|CLEAR|STOP)$/.test(s)&&s.length<=79;}
export function matchesReply(command,line){
 if(line.startsWith('ERR '))return true;
 if(command==='GET')return line==='END GET';
 if(command==='SAVE')return line==='SAVED';
 if(command==='HELLO')return /^TOKEN \d+$/.test(line);
 return line.startsWith('OK ');
}
export function csv(rows){return 'received_utc,controller_ms,ecu_enable,state,fault,pressure_psi,map_kpa,duty_percent,calibrated,reduced_validated\n'+rows.map(r=>[r.time,r.ms,r.en,r.s,r.f,r.psi,r.kpa,r.duty,r.cal,r.reduced].join(',')).join('\n');}
