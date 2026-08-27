(function installMachineToolCircuitsView(global) {
  "use strict";
  const platform = global.ECTPPlatform = global.ECTPPlatform || {};
  platform.moduleViews = platform.moduleViews || {};
  const MODULE_ID = "ch02_machine_tool_circuits";
  const wid = (id) => `${MODULE_ID}__wire__${id}`;
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const tx = (x,y,t,a="middle",c="sim-piece-label") => `<text x="${x}" y="${y}" text-anchor="${a}" class="${c}">${esc(t)}</text>`;

  function term(x,y,r=4.4) {
    return `<g class="sim-terminal"><circle cx="${x}" cy="${y}" r="${r}" class="sim-terminal-outer"/><circle cx="${x}" cy="${y}" r="${Math.max(1.8,r-2.1)}" class="sim-terminal-inner"/><line x1="${x-2.2}" y1="${y}" x2="${x+2.2}" y2="${y}" class="sim-terminal-slot"/></g>`;
  }
  function wires(parts,active=false,phase="",id="") {
    return parts.map((p,i)=>`<polyline class="machine-wire${phase?` ${phase}`:""}${active?" is-active":""}"${id?` data-wire-id="${id}"`:""} data-segment-index="${i}" points="${p.map(q=>q.join(",")).join(" ")}"/>`).join("");
  }
  function tracked(local,result,parts,phase="") {
    const id=wid(local), active=result.activeMainWireIds.includes(id)||result.activeControlWireIds.includes(id), partial=!active&&result.partialWireIds.includes(id);
    const html=wires(parts,active,phase,id);
    return partial?html.replaceAll("machine-wire","machine-wire is-partial"):html;
  }
  function qfPole(x,top,bottom,closed) {
    const a=top+18,b=bottom-18,m=(a+b)/2;
    return `<g data-sim-piece="machine_qf_pole">${term(x,top,4.7)}${term(x,bottom,4.7)}<line x1="${x}" y1="${top}" x2="${x}" y2="${a}" class="sim-detail"/><line x1="${x}" y1="${bottom}" x2="${x}" y2="${b}" class="sim-detail"/><circle cx="${x}" cy="${a+2}" r="4.2" class="sim-contact-fixed"/><circle cx="${x}" cy="${b-2}" r="4.2" class="sim-contact-fixed"/><line x1="${x}" y1="${b-6}" x2="${closed?x:x+12}" y2="${closed?a+6:m-10}" class="${closed?"sim-contact-bridge-live sim-contact-bridge-active":"sim-contact-bridge-open"}"/></g>`;
  }
  function fuse(x,top,bottom,text="") {
    const y=top+8,h=bottom-top-16,cy=(top+bottom)/2;
    return `<g data-sim-piece="machine_fuse"><rect x="${x-20}" y="${y}" width="40" height="${h}" rx="10" class="sim-fuse-shell"/>${term(x,top,4.2)}${term(x,bottom,4.2)}<line x1="${x}" y1="${top}" x2="${x}" y2="${y+11}" class="sim-fuse-strap"/><line x1="${x}" y1="${y+h-10}" x2="${x}" y2="${bottom}" class="sim-fuse-strap"/><rect x="${x-7}" y="${cy-23}" width="14" height="46" rx="7" class="sim-fuse-window"/><line x1="${x}" y1="${cy-15}" x2="${x}" y2="${cy+15}" class="sim-fuse-core"/><path d="M${x-4} ${cy-8} L${x+2} ${cy-1} L${x-2} ${cy+7} L${x+4} ${cy+14}" class="sim-fuse-core"/>${text?tx(x,y-9,text):""}</g>`;
  }
  function vContact(x,top,bottom,closed,text="",active=false) {
    const y=top+8,h=bottom-top-16,a=y+14,b=y+h-14,m=(a+b)/2;
    return `<g class="machine-device${active?" is-active":""}" data-sim-piece="machine_main_contact"><rect x="${x-18}" y="${y}" width="36" height="${h}" rx="12" class="sim-contact-frame ki1"/><rect x="${x-6}" y="${y+10}" width="12" height="${h-20}" rx="7" class="sim-ghost"/>${term(x,top,4.6)}${term(x,bottom,4.6)}<line x1="${x}" y1="${top}" x2="${x}" y2="${a}" class="sim-detail ki1"/><line x1="${x}" y1="${bottom}" x2="${x}" y2="${b}" class="sim-detail ki1"/><circle cx="${x}" cy="${a+2}" r="4.2" class="sim-contact-fixed"/><circle cx="${x}" cy="${b-2}" r="4.2" class="sim-contact-fixed"/><path d="M${x-8} ${m+12} q3 -4 6 0 q3 4 6 0" class="sim-contact-spring"/><line x1="${x}" y1="${b-6}" x2="${closed?x:x+10}" y2="${closed?a+6:m-10}" class="${closed?"sim-contact-bridge-live sim-contact-bridge-active":"sim-contact-bridge-open"}"/>${text?tx(x,y-10,text):""}</g>`;
  }
  function contact(x1,x2,y,closed,text,kind="no",active=false) {
    const l=x1+14,r=x2-14;
    const bladeStart=l+4,bladeEnd=r-4,bladeEndY=closed?y:y-10;
    return `<g class="machine-device${active?" is-active":""}" data-sim-piece="machine_inline_contact" data-contact-kind="${kind}" data-contact-state="${closed?"closed":"open"}"><rect x="${x1}" y="${y-20}" width="${x2-x1}" height="40" rx="12" class="sim-contact-frame ki1"/>${term(x1,y)}${term(x2,y)}<line x1="${x1}" y1="${y}" x2="${l}" y2="${y}" class="sim-detail ki1"/><line x1="${r}" y1="${y}" x2="${x2}" y2="${y}" class="sim-detail ki1"/><circle cx="${l}" cy="${y}" r="4" class="sim-contact-fixed"/><circle cx="${r}" cy="${y}" r="4" class="sim-contact-fixed"/><line x1="${bladeStart}" y1="${y}" x2="${bladeEnd}" y2="${bladeEndY}" class="sim-contact-blade ${closed?`sim-contact-bridge-live${active?" sim-contact-bridge-active":""}`:"sim-contact-bridge-open"}"/><path d="M${(l+r)/2-7} ${y+9} q3 -4 6 0 q3 4 6 0" class="sim-contact-spring"/>${tx((x1+x2)/2,y-30,text)}</g>`;
  }
  function button(x1,x2,y,text,accent,pressed,closed) {
    const c=(x1+x2)/2,o=pressed?4:0,cap=accent==="stop"?"sim-button-cap-stop":accent==="reverse"?"sim-button-cap-reverse":"sim-button-cap-forward";
    return `<g data-sim-piece="machine_button"><rect x="${x1-4}" y="${y-11}" width="${x2-x1+8}" height="22" rx="8" class="sim-button-contactblock"/>${term(x1,y)}${term(x2,y)}<line x1="${x1}" y1="${y}" x2="${x1+15}" y2="${y}" class="sim-detail"/><line x1="${x2-15}" y1="${y}" x2="${x2}" y2="${y}" class="sim-detail"/><line x1="${x1+15}" y1="${y}" x2="${closed?x2-15:x2-18}" y2="${closed?y:y-8}" class="${closed?"sim-contact-bridge-live sim-contact-bridge-active":"sim-contact-bridge-open"}"/><line x1="${c}" y1="${y-8+o}" x2="${c}" y2="${y-24}" class="sim-button-stem"/><rect x="${c-22}" y="${y-52}" width="44" height="18" rx="9" class="sim-button-backplate"/><circle cx="${c}" cy="${y-36+o}" r="16" class="${cap}"/><circle cx="${c}" cy="${y-36+o}" r="21" class="sim-button-ring"/>${tx(c,y-64,text)}</g>`;
  }
  function coil(x,y,w,h,text,on,timer="") {
    const x1=x-12,x2=x+w+12,cy=y+h/2,ih=Math.max(14,h-28),s=Math.min(16,(w-36)/5),c=s/2,path=[0,1,2,3,4].map(i=>`q${c} ${i%2?ih/2:-ih/2} ${s} 0`).join(" ");
    return `<g class="machine-device${on?" is-active":""}" data-sim-piece="machine_coil"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" class="sim-coil-body"/>${on?`<rect x="${x+8}" y="${y+8}" width="${w-16}" height="${h-16}" rx="10" class="sim-coil-highlight"/>`:""}${term(x1,cy)}${term(x2,cy)}<line x1="${x1}" y1="${cy}" x2="${x+10}" y2="${cy}" class="sim-detail ki1"/><line x1="${x+w-10}" y1="${cy}" x2="${x2}" y2="${cy}" class="sim-detail ki1"/><rect x="${x+26}" y="${y+16}" width="${Math.max(12,w-52)}" height="${Math.max(10,h-32)}" rx="8" class="sim-coil-core"/><path d="M${x+18} ${cy} ${path}" class="sim-coil-winding"/>${tx(x+w/2,y-12,text)}${timer?tx(x+w/2,y+h+18,timer,"middle","machine-timer-text"):""}</g>`;
  }
  function fr(xs,top,bottom,bad,text="FR") {
    const y=top+8,h=bottom-top-16;
    return `<g data-sim-piece="machine_fr_main">${xs.map(x=>`${term(x,top)}${term(x,bottom)}<rect x="${x-12}" y="${y}" width="24" height="${h}" rx="7" class="sim-fr-channel${bad?" emphasized":""}"/><path d="M${x-6} ${y+6} l12 6 l-12 6 l12 6 l-12 6" class="sim-fr-heater${bad?" emphasized":""}"/>`).join("")}${tx(xs.reduce((a,b)=>a+b,0)/xs.length,y-11,text)}</g>`;
  }
  function motor(cx,cy,text,running,direction="forward",scale=1) {
    const rotor=running?(direction==="reverse"?" reverse":" forward"):"",fins=[-22,-11,0,11,22].map(dx=>`<line x1="${cx+dx*scale}" y1="${cy-30*scale}" x2="${cx+dx*scale}" y2="${cy+36*scale}" class="sim-motor-fin"/>`).join("");
    return `<g class="machine-motor${running?" is-running":""}" data-sim-piece="machine_motor"><rect x="${cx-26*scale}" y="${cy-62*scale}" width="${52*scale}" height="${18*scale}" rx="6" class="sim-motor-box"/><circle cx="${cx}" cy="${cy}" r="${42*scale}" class="sim-motor-shell"/><circle cx="${cx-30*scale}" cy="${cy}" r="${12*scale}" class="sim-motor-endcap"/><circle cx="${cx+30*scale}" cy="${cy}" r="${12*scale}" class="sim-motor-endcap"/><rect x="${cx+37*scale}" y="${cy-5*scale}" width="${18*scale}" height="${10*scale}" rx="4" class="sim-motor-shaft"/><rect x="${cx-44*scale}" y="${cy+34*scale}" width="${88*scale}" height="${14*scale}" rx="6" class="sim-metal"/><g transform="translate(${cx} ${cy})"><g class="sim-motor-rotor${rotor}"><circle cx="0" cy="0" r="${12*scale}" class="sim-motor-endcap"/><line x1="${-18*scale}" y1="0" x2="${18*scale}" y2="0" class="sim-contact-arm"/><line x1="0" y1="${-18*scale}" x2="0" y2="${18*scale}" class="sim-contact-arm"/></g></g>${fins}${tx(cx,cy+74*scale,text)}</g>`;
  }
  function motorPorts(xs,y,cy) {
    const cx=xs[1],targets=[[cx-18,cy-48],[cx,cy-50],[cx+18,cy-48]];
    return xs.map((x,i)=>`${term(x,y)}<line x1="${x}" y1="${y}" x2="${targets[i][0]}" y2="${targets[i][1]}" class="sim-detail"/><circle cx="${targets[i][0]}" cy="${targets[i][1]}" r="2.4" class="sim-contact-fixed"/>`).join("");
  }

  function ca6140(model) {
    const op=model.state.operationState,r=model.result,qf=op.power==="closed",km1=!!r.stableDeviceStates.KM1,km2=!!r.stableDeviceStates.KM2,running=!!r.motorStates.M?.running,direction=r.motorStates.M?.direction||"forward",bad=op.primaryProtection==="overload";
    const phase=["phase-l1","phase-l2","phase-l3"],supply=[160,285,410],fwd=[100,205,310],rev=[360,465,570],out=[185,305,425],common=qf&&running&&!bad;
    const base=supply.map((x,i)=>wires([[[x,92],[x,122]],[[x,218],[x,255]],[[x,335],[x,370]]],common,phase[i],wid(`ca_main_l${i+1}`))).join("");
    const fin=supply.map((x,i)=>wires([[[x,370],[fwd[i],370],[fwd[i],420]]],km1&&qf,phase[i])).join("");
    const rin=supply.map((x,i)=>wires([[[x,370],[rev[i],370],[rev[i],420]]],km2&&qf,phase[i])).join("");
    const fout=fwd.map((x,i)=>wires([[[x,510],[x,620],[out[i],620],[out[i],720]]],km1&&qf,phase[i])).join("");
    const map=[2,1,0],rout=rev.map((x,i)=>wires([[[x,510],[x,650],[out[map[i]],650],[out[map[i]],720]]],km2&&qf,phase[i])).join("");
    const fw=tracked("ca_forward_rung",r,[[[650,250],[680,250]],[[740,250],[770,250]],[[830,250],[860,250]],[[920,250],[950,250]],[[1010,250],[1040,250]],[[1100,250],[1130,250]],[[1242,250],[1270,250]],[[1330,250],[1430,250]]]);
    const rw=tracked("ca_reverse_rung",r,[[[650,610],[680,610]],[[740,610],[770,610]],[[830,610],[860,610]],[[920,610],[950,610]],[[1010,610],[1040,610]],[[1100,610],[1130,610]],[[1242,610],[1270,610]],[[1330,610],[1430,610]]]);
    return `${tx(315,48,"主电路","middle","machine-section-title")}${tx(1035,48,"控制电路","middle","machine-section-title")}${base}${fin}${rin}${fout}${rout}${out.map((x,i)=>wires([[[x,800],[x,872]]],common,phase[i])).join("")}${supply.map((x,i)=>`${term(x,92)}${tx(x,73,["L1","L2","L3"][i])}${qfPole(x,122,218,qf)}${fuse(x,255,335,i===1?"FU1":"")}`).join("")}${tx(205,398,"KM1 正向主触点")}${fwd.map(x=>vContact(x,420,510,km1,"",km1)).join("")}${tx(465,398,"KM2 反向主触点")}${rev.map(x=>vContact(x,420,510,km2,"",km2)).join("")}${fr(out,720,800,bad,"FR")}${motorPorts(out,872,945)}${motor(305,945,"M",running,direction)}${tx(105,183,"QF","end")}<line x1="650" y1="170" x2="650" y2="790" class="machine-bus"/><line x1="1430" y1="170" x2="1430" y2="790" class="machine-bus"/>${tx(650,153,"L")}${tx(1430,153,"N")}${fw}${button(680,740,250,"SB1 停止","stop",false,true)}${button(770,830,250,"SB2 正转","forward",km1,km1)}${contact(860,920,250,op.caSq2!=="triggered","KSR","nc")}${contact(950,1010,250,op.caSq2!=="triggered","SQ2","nc",op.caSq2==="triggered")}${contact(1040,1100,250,!km2,"KM2","nc",km2)}${coil(1142,220,88,60,"KM1",km1)}${contact(1270,1330,250,!bad,"FR","nc",bad)}${wires([[[750,250],[750,340],[790,340]],[[880,340],[940,340],[940,250]]],km1)}${contact(790,880,340,km1,"KM1 自锁","no",km1)}${tracked("ca_timer_rung",r,[[[650,450],[830,450]],[[890,450],[1130,450]],[[1242,450],[1430,450]]])}${contact(830,890,450,op.caTimer==="completed","KT 延时","no",op.caTimer!=="idle")}${coil(1142,420,88,60,"KT",!!r.stableDeviceStates.KT,op.caTimer==="timing"?"延时中":op.caTimer==="completed"?"完成":"")}${rw}${button(680,740,610,"SB1 停止","stop",false,true)}${button(770,830,610,"SB3 反转","reverse",km2,km2)}${contact(860,920,610,op.caSq1!=="triggered","KSF","nc")}${contact(950,1010,610,op.caSq1!=="triggered","SQ1","nc",op.caSq1==="triggered")}${contact(1040,1100,610,!km1,"KM1","nc",km1)}${coil(1142,580,88,60,"KM2",km2)}${contact(1270,1330,610,!bad,"FR","nc",bad)}${wires([[[750,610],[750,700],[790,700]],[[880,700],[940,700],[940,610]]],km2)}${contact(790,880,700,km2,"KM2 自锁","no",km2)}<rect class="machine-status-chip${running?" is-on":""}" x="810" y="825" width="470" height="54" rx="12"/><text class="machine-status-text" x="1045" y="858" text-anchor="middle">${running?(direction==="reverse"?"KM2吸合 · 电动机反向运行":"KM1吸合 · 电动机正向运行"):"KM1/KM2失电 · 电动机停止"}</text>`;
  }

  function ladder(local,r,y,parts) {
    const seg=[],end=1390; let cur=110;
    parts.forEach(([a,b])=>{seg.push([[cur,y],[a,y]]);cur=b;});seg.push([[cur,y],[end,y]]);return tracked(local,r,seg);
  }
  function z3040(model) {
    const op=model.state.operationState,r=model.result,s=r.stableDeviceStates,qf=op.power==="closed",p1=op.primaryProtection==="overload",p2=op.secondaryProtection==="overload";
    const motors=[{x:270,id:"M1",run:!!r.motorStates.M1?.running,name:"主轴电动机"},{x:745,id:"M2",run:!!r.motorStates.M2?.running,name:"摇臂升降电动机"},{x:1210,id:"M3",run:!!r.motorStates.M3?.running,name:"液压泵电动机"}];
    const top=motors.map((m,i)=>{const xs=[m.x-45,m.x,m.x+45],on=qf&&m.run&&!(i?p2:p1);return `${wires(xs.map(x=>[[x,92],[x,128]]),on,"phase-l1")}${xs.map((x,j)=>`${term(x,92)}${fuse(x,128,198,j===1?(i?"FU2":"FU1"):"")}`).join("")}${wires(xs.map(x=>[[x,198],[x,232]]),on)}${fr(xs,232,292,i?p2:p1,i?"FR2":"FR1")}${wires(xs.map(x=>[[x,292],[x,332]]),on)}${motorPorts(xs,332,405)}${motor(m.x,405,`${m.id} ${m.name}`,m.run,r.motorStates[m.id]?.direction||"forward",.78)}`;}).join("");
    const y1=570,y2=680,y3=790,y4=900,y5=1010;
    return `${tx(749,48,"Z3040 摇臂钻床 · 动力执行元件","middle","machine-section-title")}${top}<line x1="110" y1="530" x2="110" y2="1100" class="machine-bus"/><line x1="1390" y1="530" x2="1390" y2="1100" class="machine-bus"/>${tx(110,512,"L")}${tx(1390,512,"N")}${ladder("z_spindle_rung",r,y1,[[160,220],[270,330],[960,1032],[1080,1190],[1210,1270]])}${button(160,220,y1,"SB1 停止","stop",false,true)}${button(270,330,y1,"SB2 主轴","forward",!!s.KM1,!!s.KM1)}${contact(960,1032,y1,!!s.KM1,"KM1 自锁","no",!!s.KM1)}${coil(1092,y1-30,86,60,"KM1",!!s.KM1)}${contact(1210,1270,y1,!p1,"FR1","nc",p1)}${wires([[[250,y1],[250,y1+68],[285,y1+68]],[[375,y1+68],[920,y1+68],[920,y1]]],!!s.KM1)}${contact(285,375,y1+68,!!s.KM1,"KM1 自锁","no",!!s.KM1)}${ladder("z_timer_rung",r,y2,[[160,240],[300,380],[1080,1190]])}${button(160,240,y2,"SB3 / SB4","forward",op.zTimer!=="idle",op.zTimer!=="idle")}${contact(300,380,y2,op.zSq2==="triggered","SQ2","no",op.zSq2==="triggered")}${coil(1092,y2-30,86,60,"KT",!!s.KT,op.zTimer==="timing"?"延时中":op.zTimer==="completed"?"完成":"")}${ladder("z_up_rung",r,y3,[[150,235],[290,365],[430,500],[610,680],[1080,1190]])}${button(150,235,y3,"SB3 上升","forward",op.zRocker==="up",op.zRocker==="up")}${contact(290,365,y3,op.zSq1Upper!=="triggered","SQ1-1","nc",op.zSq1Upper==="triggered")}${contact(430,500,y3,op.zTimer==="completed","KT","no",!!s.KT)}${contact(610,680,y3,!s.KM3,"KM3","nc",!!s.KM3)}${coil(1092,y3-30,86,60,"KM2",!!s.KM2)}${ladder("z_down_rung",r,y4,[[150,235],[290,365],[430,500],[610,680],[1080,1190]])}${button(150,235,y4,"SB4 下降","reverse",op.zRocker==="down",op.zRocker==="down")}${contact(290,365,y4,op.zSq1Lower!=="triggered","SQ1-2","nc",op.zSq1Lower==="triggered")}${contact(430,500,y4,op.zTimer==="completed","KT","no",!!s.KT)}${contact(610,680,y4,!s.KM2,"KM2","nc",!!s.KM2)}${coil(1092,y4-30,86,60,"KM3",!!s.KM3)}${ladder("z_loosen_rung",r,y5,[[145,225],[285,360],[480,550],[665,735],[890,960],[1080,1190],[1210,1275]])}${button(145,225,y5,"SB5 松开","forward",op.zClamp==="loosen",op.zClamp==="loosen")}${contact(285,360,y5,op.zSq2!=="triggered","SQ2","nc",op.zSq2==="triggered")}${contact(480,550,y5,op.zTimer==="completed","KT","no",!!s.KT)}${contact(665,735,y5,!s.KM5,"KM5","nc",!!s.KM5)}${contact(890,960,y5,op.zSq3!=="triggered","SQ3","nc",op.zSq3==="triggered")}${coil(1092,y5-30,86,60,"KM4",!!s.KM4)}${contact(1210,1275,y5,!p2,"FR2","nc",p2)}${wires([[[430,y5],[430,y5+80],[505,y5+80]],[[565,y5+80],[820,y5+80]]],!!s.YV)}${contact(505,565,y5+80,op.zSq3==="triggered","SQ3","no",op.zSq3==="triggered")}${coil(832,y5+50,82,60,"YV",!!s.YV)}${wires([[[926,y5+80],[1390,y5+80]]],!!s.YV)}`;
  }

  function createView({mountRoot,dispatchAction}) {
    const cleanups=[]; let latest=null;
    const clear=()=>{while(cleanups.length)cleanups.pop()();};
    function render(model) {
      latest=model;clear();const variant=model.state.operationState.variant;
      const tabs=Object.entries(model.data.variants).map(([key,item])=>`<button type="button" class="machine-tab" data-variant="${key}" aria-pressed="${variant===key}">${esc(item.shortTitle)}</button>`).join("");
      mountRoot.innerHTML=`<section data-module="${MODULE_ID}"><div class="machine-toolbar"><div class="machine-tabs" aria-label="选择机床线路">${tabs}</div><span class="machine-source">${esc(model.data.variants[variant].source)} · 成熟元器件仿真</span></div><div class="machine-canvas-shell"><svg class="machine-canvas" viewBox="0 0 1498 1135" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(model.data.variants[variant].title)}动态原理图">${variant==="ca6140"?ca6140(model):z3040(model)}</svg></div></section>`;
      mountRoot.querySelectorAll("[data-variant]").forEach(node=>{const fn=e=>dispatchAction("RESET_MODULE",{variant:e.currentTarget.dataset.variant});node.addEventListener("click",fn);cleanups.push(()=>node.removeEventListener("click",fn));});
    }
    return Object.freeze({render,unmount(){clear();if(mountRoot)mountRoot.innerHTML="";latest=null;},getLatestModel:()=>latest});
  }
  platform.moduleViews.createCh02MachineToolCircuitsView=createView;
})(globalThis);
