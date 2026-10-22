// Ticket-office facade reconstructed from the user's October 2026 reference.
(function(root){
'use strict';
const REGIONS={sign:[0,0,1024,224],map:[0,224,224,512],notice:[256,224,512,512],noticeAlt:[512,224,768,512],ad:[800,224,1024,512]};
function frame(e){
 const p=e.pts,a=p[0],b=p[3],back=p[1],width=Math.hypot(b[0]-a[0],b[1]-a[1]),depth=Math.hypot(back[0]-a[0],back[1]-a[1]);
 const right=[(b[0]-a[0])/width,(b[1]-a[1])/width],inward=[(back[0]-a[0])/depth,(back[1]-a[1])/depth];
 return {width,depth,right,inward,front:[(a[0]+b[0])/2,(a[1]+b[1])/2],
  at:(u,d,y)=>[a[0]+right[0]*u*width+inward[0]*d,y,a[1]+right[1]*u*width+inward[1]*d]};
}
function panel(g,a,b,c,d,region){
 const start=g.data.length,[x0,y0,x1,y1]=region;
 g.quad(a,b,c,d,[0,0,0],6);
 const uv=[[x0,y1],[x1,y1],[x1,y0],[x0,y1],[x1,y0],[x0,y0]];
 for(let i=0;i<6;i++){
  g.data[start+i*10+6]=uv[i][0]/1024;g.data[start+i*10+7]=uv[i][1]/512;
 }
}
function build(g,e){
 const f=frame(e),at=f.at,white=[.91,.91,.88],trim=[.95,.95,.92],base=[.17,.09,.09],metal=[.80,.83,.85];
 function slab(u0,u1,d0,d1,y,h,color,material=7){
  const a=at(u0,d0,y),b=at(u1,d0,y),c=at(u1,d1,y),d=at(u0,d1,y),up=p=>[p[0],p[1]+h,p[2]];
  for(const [p,q] of [[a,b],[b,c],[c,d],[d,a]])g.quad(p,q,up(q),up(p),color,material);
  g.quad(up(a),up(d),up(c),up(b),color,material);
 }
 function face(u0,u1,y0,y1,depth,region){panel(g,at(u0,depth,y0),at(u1,depth,y0),at(u1,depth,y1),at(u0,depth,y1),region);}
 slab(0,1,0,f.depth,0,3.00,white);
 slab(-.008,1.008,-.035,f.depth+.035,2.96,.20,trim);
 slab(-.004,1.004,-.025,f.depth+.025,0,.14,base);
 // A continuous sill and pale frames replace the generic dark window pattern.
 slab(.105,.94,-.17,.025,.94,.09,trim);
 face(.115,.26,1.055,2.04,-.03,REGIONS.map);
 for(const u of [.108,.266])g.beam(at(u,-.06,.99),at(u,-.06,2.08),.025,trim,7,4);
 const left=.278,right=.929,count=7,step=(right-left)/count;
 for(let i=0;i<count;i++){
  const a=left+i*step+.006,b=left+(i+1)*step-.006;
  g.quad(at(a,-.022,1.04),at(b,-.022,1.04),at(b,-.022,2.07),at(a,-.022,2.07),[.38,.43,.43],3);
  face(a+.003,b-.003,1.065,2.035,-.035,i%2?REGIONS.noticeAlt:REGIONS.notice);
  for(const u of [a-.002,b+.002])g.beam(at(u,-.067,1.02),at(u,-.067,2.08),.022,trim,7,4);
  g.beam(at(a,-.065,1.44),at(b,-.065,1.44),.018,trim,7,4);
  g.beam(at(a,-.068,1.02),at(b,-.068,1.02),.025,trim,7,4);
  g.beam(at(a,-.068,2.08),at(b,-.068,2.08),.022,trim,7,4);
 }
 face(.018,.098,.23,2.035,-.055,REGIONS.ad);
 face(.94,.996,.23,2.035,-.055,REGIONS.ad);
 // A shallow quarter-cylinder forms the photographed continuous metal canopy.
 const steps=28,roof=(u,t,offset=0)=>at(u,-.03-(1.10+offset)*Math.sin(t),1.96+(.90+offset)*Math.cos(t));
 for(let i=0;i<steps;i++){
  const a=i*Math.PI/2/steps,b=(i+1)*Math.PI/2/steps;
  g.quad(roof(-.014,a),roof(1.014,a),roof(1.014,b),roof(-.014,b),metal,8);
  for(const u of [-.014,1.014])g.tri(at(u,-.03,1.96),roof(u,a),roof(u,b),[.71,.74,.75],8);
 }
 for(let u=.03;u<1;u+=.105)for(let i=0;i<steps;i++){
  const a=i*Math.PI/2/steps,b=(i+1)*Math.PI/2/steps;
  g.beam(roof(u,a,.008),roof(u,b,.008),.009,[.48,.53,.54],8,4);
 }
 g.beam(roof(-.014,Math.PI/2),roof(1.014,Math.PI/2),.025,[.81,.84,.83],8,6);
 // The roof sign has its own atlas region, with actual Cyrillic lettering.
 slab(.377,.653,.13,.25,3.20,.85,[.055,.065,.075],0);
 face(.38,.65,3.245,4.01,.115,REGIONS.sign);
 for(const u of [.40,.63]){
  g.beam(at(u,.18,3.12),at(u,.18,3.28),.024,[.12,.13,.13],2,4);
  g.beam(at(u,.19,3.58),at(u,.78,3.17),.018,[.12,.13,.13],2,4);
 }
}
function atlas(){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
 const c=canvas.getContext('2d');c.fillStyle='#eeeeea';c.fillRect(0,0,1024,512);
 c.fillStyle='#192028';c.fillRect(0,0,1024,224);
 c.font='bold 172px "Comic Sans MS", "Trebuchet MS", sans-serif';c.textBaseline='middle';
 const text='КАССА',measure=c.measureText(text).width;
 c.save();c.translate(55,117);c.scale(914/measure,1);c.fillStyle='#f7f5eb';c.fillText(text,0,0);c.restore();
 // The schematic and notice graphics are drawn here, not cropped from the panorama.
 c.fillStyle='#e4d86f';c.fillRect(0,224,224,288);
 c.fillStyle='#293e28';c.font='bold 12px sans-serif';c.textAlign='center';c.fillText('СХЕМА ПАРКА',112,244);
 c.beginPath();
 for(let i=0;i<=60;i++){
  const a=i*Math.PI/30,r=1+.08*Math.sin(a*5)+.06*Math.cos(a*7);
  const x=112+Math.cos(a)*82*r,y=373+Math.sin(a)*105*r;
  if(i)c.lineTo(x,y);else c.moveTo(x,y);
 }
 c.closePath();c.fillStyle='#558351';c.fill();c.save();c.clip();
 c.strokeStyle='#c5cba0';c.lineWidth=3;
 for(let i=0;i<7;i++){
  c.beginPath();c.moveTo(22+i*28,260);c.bezierCurveTo(65+i*10,330,145-i*8,402,30+i*27,490);c.stroke();
 }
 c.fillStyle='#376637';
 for(let i=0;i<85;i++){c.beginPath();c.arc(30+(i*47%167),270+(i*73%205),3+(i%3),0,Math.PI*2);c.fill();}
 c.restore();
 for(const [x0,y0,x1,y1] of [REGIONS.notice,REGIONS.noticeAlt]){
  c.fillStyle='#e9e9df';c.fillRect(x0,y0,x1-x0,y1-y0);
  c.fillStyle='#faf9f0';c.fillRect(x0+10,y0+10,x1-x0-20,165);
  c.fillStyle='#a93a32';c.fillRect(x0+12,y0+12,24,142);
  c.fillStyle='#666760';c.font='bold 17px sans-serif';c.fillText('БИЛЕТЫ',(x0+x1)/2+10,y0+31);
  for(let i=0;i<12;i++){
   c.fillStyle=i%4===0?'#85887f':'#b3b5a9';c.fillRect(x0+46,y0+47+i*9,155-(i*19%52),2);
  }
  c.strokeStyle='#b8bcb2';c.lineWidth=2;c.strokeRect(x0+8,y0+184,240,94);
  for(const dx of [28,203])for(let i=0;i<9;i++){
   c.fillStyle='#a4a99d';c.fillRect(x0+dx,y0+191+i*8,19+(i*7%13),2);
  }
  c.beginPath();c.arc(x0+127,y0+231,27,0,Math.PI*2);c.fillStyle='#b33d2e';c.fill();
  c.strokeStyle='#d8b07e';c.lineWidth=3;c.stroke();c.fillStyle='#f4ead6';c.font='bold 11px sans-serif';
  c.fillText('БИЛЕТ',x0+127,y0+232);
 }
 const [ax,ay,aw,ah]=[800,224,224,288];c.fillStyle='#f1e8d5';c.fillRect(ax,ay,aw,ah);
 for(let i=0;i<6;i++){
  const y=ay+i*48;c.fillStyle='#a34435';c.fillRect(ax+5,y+3,214,9);
  c.fillStyle=i%2?'#a9c6c7':'#d0b38e';c.fillRect(ax+10,y+16,204,26);
  for(let k=0;k<3;k++){
   c.beginPath();c.ellipse(ax+42+k*68,y+29,25,9,0,0,Math.PI*2);
   c.fillStyle=['#6c7580','#ad774f','#856e68'][(i+k)%3];c.fill();
  }
 }
 return canvas;
}
const api={frame,build,atlas};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ParkTicketOffice=api;
})(typeof window!=='undefined'?window:globalThis);
