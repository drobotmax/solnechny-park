const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),vm=require('vm');
const source=fs.readFileSync(require.resolve('../park.js'),'utf8');
const physics=source.slice(source.indexOf('  function physics(dt)'),source.indexOf('  // --------------------------------------------------------------- bottles'));
function setup(blockedAt=()=>false){
 const ctx={Math,game:{mode:'free'},car:{x:0,z:0,v:0,heading:0,steer:0,stamina:4,odo:0},keys:{up:true},state:{speedMul:1},SURF:{2:[1,.5]},catAt:()=>2,blockedAt,cam:{},sfx:()=>{},STAMINA:4,REGEN:.5,RUN:4,TURBO:7,REVERSE:1.8,PUSH:3.5,BRAKE:8,TURN_PIVOT:1.9,TURN_MAX:2.4};
 vm.createContext(ctx);vm.runInContext(physics,ctx);return ctx;
}
test('full obstruction stops stroller without reversing it',()=>{
 const c=setup(()=>true);c.car.v=5;c.physics(1/120);
 assert.equal(c.car.v,0);assert.equal(c.car.x,0);assert.equal(c.car.z,0);
});
test('opposing controls brake faster than normal coasting',()=>{
 const c=setup();c.car.v=4;c.keys={up:true,down:true};c.physics(.1);
 assert(Math.abs(c.car.v-3.2)<1e-9);
});
test('fixed-step simulation gives the same distance at 30, 60 and 120 fps',()=>{
 function travel(fps){const c=setup();for(let f=0;f<fps*3;f++)for(let i=0;i<120/fps;i++)c.physics(1/120);return c.car;}
 assert.deepEqual(JSON.parse(JSON.stringify(travel(30))),JSON.parse(JSON.stringify(travel(120))));
 assert.equal(travel(60).z,travel(120).z);
});
test('wall sliding advances odometer and stays outside obstruction',()=>{
 const c=setup((x,z)=>x>.01);c.car.v=4;c.car.heading=Math.PI/4;c.physics(1/120);
 assert.equal(c.car.x,0);assert(c.car.z<0);assert(c.car.odo>0);assert(c.car.v>=0);
});
