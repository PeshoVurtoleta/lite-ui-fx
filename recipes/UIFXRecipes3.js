/**
 * @zakkster/lite-ui-fx — Recipe Collection Vol. 3
 *
 * 20 recipes across novel UI element categories:
 *   Knobs (2):   VolumeKnob, CompassKnob
 *   Progress (3): RingProgress, BatteryGauge, SignalMeter
 *   Controls (3): PillTabs, Stepper, RadioOrbit
 *   Indicators (3): PasswordStrength, WaterLevel, HeatMap
 *   Mood (3):     DayNightToggle, ReactionPicker, NotificationBell
 *   Feedback (3):  TypewriterField, SoundWaveBtn, UploadProgress
 *   Fun (3):      ScratchReveal, TimerCountdown, PullRefresh
 *
 * Uses: @zakkster/lite-lerp, @zakkster/lite-random
 */

import { lerp, clamp, easeOut, easeIn } from '@zakkster/lite-lerp';
import { Random } from '@zakkster/lite-random';

// ── Shared ──
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.arcTo(x+w,y,x+w,y+r,r);c.lineTo(x+w,y+h-r);c.arcTo(x+w,y+h,x+w-r,y+h,r);c.lineTo(x+r,y+h);c.arcTo(x,y+h,x,y+h-r,r);c.lineTo(x,y+r);c.arcTo(x,y,x+r,y,r);c.closePath()}
function lbl(c,t,x,y,col='#9999b8'){c.fillStyle=col;c.font="500 9px 'JetBrains Mono',monospace";c.textAlign='center';c.fillText(t,x,y)}
function fr(c,w,h,r){c.strokeStyle='rgba(110,231,182,.5)';c.lineWidth=2;c.setLineDash([4,3]);rr(c,-2,-2,w+4,h+4,r+2);c.stroke();c.setLineDash([])}
const PI2=Math.PI*2;


// ═══════════════════════════════════════════════════════════
//  KNOBS
// ═══════════════════════════════════════════════════════════

/** 1. Volume Knob — Rotary dial with tick marks and arc indicator. */
export function VolumeKnob() {
    let displayVal = 0;
    return {
        tick(c,dt,now,st) {
            displayVal = lerp(displayVal, st.val, dt * 12);
            const cx=st.w/2, cy=st.h/2, R=Math.min(cx,cy)-4;
            const startA=-Math.PI*0.75, endA=Math.PI*0.75, range=endA-startA;

            // Background ring
            c.strokeStyle='rgba(255,255,255,.06)'; c.lineWidth=4;
            c.beginPath(); c.arc(cx,cy,R,startA,endA); c.stroke();

            // Value arc
            const valA = startA + displayVal * range;
            const grad = c.createLinearGradient(0,st.h,st.w,0);
            grad.addColorStop(0,'#6ee7b6'); grad.addColorStop(1,'#38bdf8');
            c.strokeStyle=grad; c.lineWidth=4;
            c.beginPath(); c.arc(cx,cy,R,startA,valA); c.stroke();

            // Tick marks
            for(let i=0;i<=10;i++){
                const a=startA+i/10*range;
                const inner=R-6, outer=R+2;
                c.strokeStyle=i/10<=displayVal?'rgba(110,231,182,.5)':'rgba(255,255,255,.08)';
                c.lineWidth=1; c.beginPath();
                c.moveTo(cx+Math.cos(a)*inner,cy+Math.sin(a)*inner);
                c.lineTo(cx+Math.cos(a)*outer,cy+Math.sin(a)*outer);
                c.stroke();
            }

            // Needle dot
            c.fillStyle='#fff';
            c.beginPath(); c.arc(cx+Math.cos(valA)*(R-12),cy+Math.sin(valA)*(R-12),3,0,PI2); c.fill();

            // Center
            c.fillStyle='rgba(255,255,255,.04)';
            c.beginPath(); c.arc(cx,cy,R*0.4,0,PI2); c.fill();

            // Value text
            c.fillStyle='#e2e2f0'; c.font="700 14px 'JetBrains Mono',monospace"; c.textAlign='center'; c.textBaseline='middle';
            c.fillText(Math.round(displayVal*100),cx,cy);
            lbl(c,'VOLUME',cx,st.h+10);
            if(st.focused)fr(c,st.w,st.h,st.h/2);
        },
    };
}

/** 2. Compass Knob — Needle points based on slider value (0=N, 0.5=S, 1=N). */
export function CompassKnob() {
    let needleA=0;
    return {
        tick(c,dt,now,st) {
            const targetA = st.val * PI2;
            needleA = lerp(needleA, targetA, dt*8);
            const cx=st.w/2, cy=st.h/2, R=Math.min(cx,cy)-4;

            // Ring
            c.strokeStyle='rgba(255,255,255,.06)'; c.lineWidth=2;
            c.beginPath(); c.arc(cx,cy,R,0,PI2); c.stroke();

            // Cardinal marks
            const dirs=['N','E','S','W'], cols=['#ff6b6b','#9999b8','#9999b8','#9999b8'];
            for(let i=0;i<4;i++){
                const a=-Math.PI/2+i*Math.PI/2;
                c.fillStyle=cols[i]; c.font="600 9px 'JetBrains Mono',monospace"; c.textAlign='center'; c.textBaseline='middle';
                c.fillText(dirs[i],cx+Math.cos(a)*(R-10),cy+Math.sin(a)*(R-10));
            }

            // Needle
            c.save(); c.translate(cx,cy); c.rotate(needleA-Math.PI/2);
            c.fillStyle='#ff6b6b';
            c.beginPath(); c.moveTo(0,-R+18); c.lineTo(-4,4); c.lineTo(4,4); c.closePath(); c.fill();
            c.fillStyle='rgba(255,255,255,.15)';
            c.beginPath(); c.moveTo(0,R-18); c.lineTo(-4,-4); c.lineTo(4,-4); c.closePath(); c.fill();
            c.restore();

            // Center pin
            c.fillStyle='#333'; c.beginPath(); c.arc(cx,cy,4,0,PI2); c.fill();
            c.strokeStyle='rgba(255,255,255,.1)'; c.lineWidth=1; c.beginPath(); c.arc(cx,cy,4,0,PI2); c.stroke();

            lbl(c,Math.round(st.val*360)+'°',cx,st.h+10);
            if(st.focused)fr(c,st.w,st.h,st.h/2);
        },
    };
}


// ═══════════════════════════════════════════════════════════
//  PROGRESS
// ═══════════════════════════════════════════════════════════

/** 3. Ring Progress — Circular progress with animated fill and particles at the tip. */
export function RingProgress({seed=42}={}) {
    const rng=new Random(seed);
    let displayVal=0, sparks=[];
    return {
        tick(c,dt,now,st) {
            displayVal=lerp(displayVal,st.val,dt*6);
            const cx=st.w/2,cy=st.h/2,R=Math.min(cx,cy)-6,lw=6;

            // Background
            c.strokeStyle='rgba(255,255,255,.06)';c.lineWidth=lw;
            c.beginPath();c.arc(cx,cy,R,0,PI2);c.stroke();

            // Fill arc
            const a=-Math.PI/2,ea=a+displayVal*PI2;
            const g=c.createConicGradient(a,cx,cy);
            g.addColorStop(0,'#a78bfa');g.addColorStop(displayVal*0.95,'#6ee7b6');g.addColorStop(1,'rgba(110,231,182,.2)');
            c.strokeStyle=g;c.lineWidth=lw;
            c.beginPath();c.arc(cx,cy,R,a,ea);c.stroke();

            // Tip sparks
            if(displayVal>0.02){
                const tx=cx+Math.cos(ea)*R,ty=cy+Math.sin(ea)*R;
                if(sparks.length<20)sparks.push({x:tx,y:ty,vx:rng.range(-20,20),vy:rng.range(-20,20),life:1});
            }
            for(let i=sparks.length-1;i>=0;i--){
                const s=sparks[i];s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=2*dt;
                if(s.life<=0){sparks.splice(i,1);continue}
                c.fillStyle=`rgba(110,231,182,${s.life})`;c.beginPath();c.arc(s.x,s.y,1.5,0,PI2);c.fill();
            }

            // Percentage
            c.fillStyle='#e2e2f0';c.font="700 16px 'JetBrains Mono',monospace";c.textAlign='center';c.textBaseline='middle';
            c.fillText(Math.round(displayVal*100)+'%',cx,cy);
            if(st.focused)fr(c,st.w,st.h,st.h/2);
        },
    };
}

/** 4. Battery Gauge — Battery icon that fills and changes color. */
export function BatteryGauge() {
    let displayVal=0;
    return {
        tick(c,dt,now,st) {
            displayVal=lerp(displayVal,st.val,dt*8);
            const bw=st.w-16,bh=st.h-12,bx=8,by=6,r=4;

            // Shell
            c.strokeStyle='rgba(255,255,255,.15)';c.lineWidth=2;
            rr(c,bx,by,bw,bh,r);c.stroke();
            // Cap
            c.fillStyle='rgba(255,255,255,.15)';
            c.fillRect(bx+bw+1,by+bh/2-4,4,8);

            // Fill
            const fillW=Math.max(0,(bw-6)*displayVal);
            const col=displayVal<.2?'#ff6b6b':displayVal<.5?'#fbbf24':'#6ee7b6';
            c.fillStyle=col;
            rr(c,bx+3,by+3,fillW,bh-6,2);c.fill();

            // Pulse glow when charging (high values)
            if(displayVal>.8){
                const pulse=Math.sin(now/200)*.3+.7;
                c.shadowBlur=8*pulse;c.shadowColor=col;
                rr(c,bx+3,by+3,fillW,bh-6,2);c.fill();
                c.shadowBlur=0;
            }

            // Low battery flash
            if(displayVal<.15&&((now/500|0)%2===0)){
                c.fillStyle='rgba(255,80,80,.15)';rr(c,bx,by,bw,bh,r);c.fill();
            }

            c.fillStyle='#e2e2f0';c.font="600 10px 'JetBrains Mono',monospace";c.textAlign='center';c.textBaseline='middle';
            c.fillText(Math.round(displayVal*100)+'%',bx+bw/2,by+bh/2);
            if(st.focused)fr(c,st.w+4,st.h,r);
        },
    };
}

/** 5. Signal Meter — WiFi-style signal bars. */
export function SignalMeter() {
    let bars=[0,0,0,0,0];
    return {
        tick(c,dt,now,st) {
            const level=Math.ceil(st.val*5);
            for(let i=0;i<5;i++){
                const target=i<level?1:0;
                bars[i]=lerp(bars[i],target,dt*10);
            }
            const bw=8,gap=4,total=5*(bw+gap)-gap;
            const ox=(st.w-total)/2;

            for(let i=0;i<5;i++){
                const maxH=8+i*6, h=maxH*bars[i]+2;
                const x=ox+i*(bw+gap), y=st.h-6-h;
                const active=bars[i]>.5;
                c.fillStyle=active?(st.val>.6?'#6ee7b6':st.val>.3?'#fbbf24':'#ff6b6b'):'rgba(255,255,255,.06)';
                rr(c,x,y,bw,h,2);c.fill();
            }
            lbl(c,level+'/5',st.w/2,st.h+10,st.val>.6?'#6ee7b6':'#9999b8');
            if(st.focused)fr(c,st.w,st.h,4);
        },
    };
}


// ═══════════════════════════════════════════════════════════
//  CONTROLS
// ═══════════════════════════════════════════════════════════

/** 6. Pill Tabs — 3 segmented tabs with sliding indicator. */
export function PillTabs() {
    let indicatorX=0, indicatorW=0, selected=0;
    const labels=['Alpha','Beta','Gamma'];
    return {
        onClick(x,y,st) {
            const idx=Math.floor(x/(st.w/3));
            selected=clamp(idx,0,2);
        },
        tick(c,dt,now,st) {
            const tw=st.w/3;
            const tx=selected*tw, targetW=tw;
            indicatorX=lerp(indicatorX,tx,dt*12);
            indicatorW=lerp(indicatorW,targetW,dt*12);

            // Background
            c.fillStyle='rgba(255,255,255,.03)';rr(c,0,0,st.w,st.h,st.h/2);c.fill();

            // Indicator
            c.fillStyle='rgba(167,139,250,.12)';c.strokeStyle='rgba(167,139,250,.25)';c.lineWidth=1;
            rr(c,indicatorX+2,2,indicatorW-4,st.h-4,st.h/2-2);c.fill();c.stroke();

            // Labels
            c.font="600 11px 'Space Grotesk',sans-serif";c.textAlign='center';c.textBaseline='middle';
            for(let i=0;i<3;i++){
                c.fillStyle=i===selected?'#c4b5fd':'#9999b8';
                c.fillText(labels[i],tw*i+tw/2,st.h/2);
            }
            if(st.focused)fr(c,st.w,st.h,st.h/2);
        },
    };
}

/** 7. Stepper — +/- buttons with spring counter. */
export function Stepper() {
    let count=0,displayCount=0,flashDir=0,flashTimer=0;
    return {
        onClick(x,y,st) {
            if(x<st.w*0.33){count=Math.max(0,count-1);flashDir=-1;}
            else if(x>st.w*0.66){count++;flashDir=1;}
            flashTimer=0.3;
        },
        tick(c,dt,now,st) {
            displayCount=lerp(displayCount,count,dt*10);
            flashTimer=Math.max(0,flashTimer-dt);

            // Background
            c.fillStyle='rgba(255,255,255,.04)';rr(c,0,0,st.w,st.h,10);c.fill();

            // Minus zone
            const third=st.w/3;
            c.fillStyle=flashDir===-1&&flashTimer>0?'rgba(255,100,100,.15)':'rgba(255,255,255,.03)';
            rr(c,2,2,third-4,st.h-4,8);c.fill();
            c.fillStyle='#ff6b6b';c.font="700 18px 'JetBrains Mono',monospace";c.textAlign='center';c.textBaseline='middle';
            c.fillText('−',third/2,st.h/2);

            // Plus zone
            c.fillStyle=flashDir===1&&flashTimer>0?'rgba(110,231,182,.15)':'rgba(255,255,255,.03)';
            rr(c,third*2+2,2,third-4,st.h-4,8);c.fill();
            c.fillStyle='#6ee7b6';c.fillText('+',third*2+third/2,st.h/2);

            // Counter
            c.fillStyle='#e2e2f0';c.font="700 20px 'JetBrains Mono',monospace";
            c.fillText(Math.round(displayCount),st.w/2,st.h/2);

            if(st.focused)fr(c,st.w,st.h,10);
        },
    };
}

/** 8. Radio Orbit — 4 options arranged in a circle. Slider picks one. */
export function RadioOrbit() {
    let selectedGlow=new Float32Array(4);
    const names=['A','B','C','D'],colors=['#ff6b6b','#fbbf24','#6ee7b6','#38bdf8'];
    return {
        tick(c,dt,now,st) {
            const sel=Math.round(st.val*3);
            const cx=st.w/2,cy=st.h/2,R=Math.min(cx,cy)-12;

            // Center
            c.fillStyle='rgba(255,255,255,.03)';c.beginPath();c.arc(cx,cy,8,0,PI2);c.fill();

            for(let i=0;i<4;i++){
                const a=-Math.PI/2+i*Math.PI/2;
                const ox=cx+Math.cos(a)*R, oy=cy+Math.sin(a)*R;
                const active=i===sel;
                selectedGlow[i]=lerp(selectedGlow[i],active?1:0,dt*10);

                // Orbit line
                c.strokeStyle=`rgba(255,255,255,${.03+selectedGlow[i]*.05})`;c.lineWidth=1;
                c.beginPath();c.moveTo(cx,cy);c.lineTo(ox,oy);c.stroke();

                // Node
                const sz=6+selectedGlow[i]*4;
                c.fillStyle=active?colors[i]:'rgba(255,255,255,.06)';
                c.beginPath();c.arc(ox,oy,sz,0,PI2);c.fill();
                if(active){c.strokeStyle=colors[i];c.lineWidth=1;c.beginPath();c.arc(ox,oy,sz+3,0,PI2);c.stroke()}

                c.fillStyle=active?'#fff':'#9999b8';c.font="600 9px 'JetBrains Mono',monospace";c.textAlign='center';c.textBaseline='middle';
                c.fillText(names[i],ox,oy);
            }
            lbl(c,'OPTION '+names[sel],cx,st.h+10,colors[sel]);
            if(st.focused)fr(c,st.w,st.h,4);
        },
    };
}


// ═══════════════════════════════════════════════════════════
//  INDICATORS
// ═══════════════════════════════════════════════════════════

/** 9. Password Strength — Segmented bar with color progression and label. */
export function PasswordStrength() {
    let segs=[0,0,0,0];
    const labels=['WEAK','FAIR','GOOD','STRONG'],colors=['#ff6b6b','#fbbf24','#38bdf8','#6ee7b6'];
    return {
        tick(c,dt,now,st) {
            const level=Math.ceil(st.val*4);
            for(let i=0;i<4;i++) segs[i]=lerp(segs[i],i<level?1:0,dt*10);

            const segW=(st.w-12)/4,segH=8;
            for(let i=0;i<4;i++){
                const x=2+i*(segW+2);
                c.fillStyle=segs[i]>.5?colors[Math.min(level-1,3)]:'rgba(255,255,255,.06)';
                const w=segW*segs[i];
                rr(c,x,st.h/2-segH/2,Math.max(2,w),segH,3);c.fill();

                // Empty track
                c.strokeStyle='rgba(255,255,255,.04)';c.lineWidth=1;
                rr(c,x,st.h/2-segH/2,segW,segH,3);c.stroke();
            }

            const idx=clamp(level-1,0,3);
            lbl(c,level>0?labels[idx]:'NONE',st.w/2,st.h/2+16,level>0?colors[idx]:'#666');
            if(st.focused)fr(c,st.w,st.h,4);
        },
    };
}

/** 10. Water Level — Animated wave surface inside a container. */
export function WaterLevel() {
    let displayVal=0, wavePhase=0;
    return {
        tick(c,dt,now,st) {
            displayVal=lerp(displayVal,st.val,dt*4);
            wavePhase+=dt*3;
            const bx=4,by=4,bw=st.w-8,bh=st.h-8;

            // Container
            c.strokeStyle='rgba(255,255,255,.1)';c.lineWidth=1.5;rr(c,bx,by,bw,bh,6);c.stroke();

            // Water
            const waterY=by+bh-(bh*displayVal);
            c.save();c.beginPath();rr(c,bx+1,by+1,bw-2,bh-2,5);c.clip();

            // Wave surface
            c.fillStyle=displayVal>.7?'rgba(56,189,248,.3)':displayVal>.3?'rgba(110,231,182,.25)':'rgba(251,191,36,.2)';
            c.beginPath();c.moveTo(bx,by+bh);
            for(let x=0;x<=bw;x++){
                const wave=Math.sin(wavePhase+x*0.08)*3+Math.sin(wavePhase*1.5+x*0.12)*2;
                c.lineTo(bx+x,waterY+wave);
            }
            c.lineTo(bx+bw,by+bh);c.closePath();c.fill();

            // Deeper water
            c.fillStyle=displayVal>.7?'rgba(56,189,248,.15)':displayVal>.3?'rgba(110,231,182,.1)':'rgba(251,191,36,.08)';
            c.fillRect(bx,waterY+5,bw,bh);

            c.restore();

            c.fillStyle='#e2e2f0';c.font="700 12px 'JetBrains Mono',monospace";c.textAlign='center';c.textBaseline='middle';
            c.fillText(Math.round(displayVal*100)+'%',st.w/2,st.h/2);
            if(st.focused)fr(c,st.w,st.h,6);
        },
    };
}

/** 11. Heat Map — 5×3 grid of cells that heat up based on slider. */
export function HeatMap({seed=42}={}) {
    const rng=new Random(seed);
    const N=15,thresholds=new Float32Array(N);
    let vals=new Float32Array(N);
    return {
        init(){for(let i=0;i<N;i++)thresholds[i]=rng.range(0,1)},
        tick(c,dt,now,st) {
            const cols=5,rows=3,gap=3;
            const cw=(st.w-gap*(cols-1))/cols, ch=(st.h-gap*(rows-1))/rows;

            for(let i=0;i<N;i++){
                const active=st.val>=thresholds[i];
                vals[i]=lerp(vals[i],active?1:0,dt*6);
                const col=i%cols,row=(i/cols)|0;
                const x=col*(cw+gap),y=row*(ch+gap);
                const heat=vals[i];
                const r=Math.round(100+heat*155),g=Math.round(60+heat*20),b=Math.round(60-heat*40);
                c.fillStyle=heat>.1?`rgba(${r},${g},${b},${.15+heat*.4})`:'rgba(255,255,255,.04)';
                rr(c,x,y,cw,ch,3);c.fill();
            }
            lbl(c,Math.round(st.val*100)+'%',st.w/2,st.h+10);
            if(st.focused)fr(c,st.w,st.h,3);
        },
    };
}


// ═══════════════════════════════════════════════════════════
//  MOOD
// ═══════════════════════════════════════════════════════════

/** 12. Day/Night Toggle — Sun/moon transition with star particles. */
export function DayNightToggle({seed=42}={}) {
    const rng=new Random(seed);
    let t=0, stars=[];
    return {
        init(ctx,w,h){for(let i=0;i<30;i++)stars.push({x:rng.range(4,w-4),y:rng.range(4,h-4),twinkle:rng.range(0,PI2)})},
        tick(c,dt,now,st) {
            t=lerp(t,st.toggled?1:0,dt*6);
            const skyR=Math.round(lerp(135,10,t)),skyG=Math.round(lerp(206,10,t)),skyB=Math.round(lerp(250,30,t));

            // Sky background
            c.fillStyle=`rgb(${skyR},${skyG},${skyB})`;rr(c,0,0,st.w,st.h,st.h/2);c.fill();

            // Stars (night only)
            if(t>.3){
                for(const s of stars){
                    const tw=Math.sin(now/400+s.twinkle)*.5+.5;
                    c.fillStyle=`rgba(255,255,255,${(t-.3)/.7*tw*.6})`;
                    c.fillRect(s.x,s.y,1,1);
                }
            }

            // Sun/Moon
            const orbX=lerp(18,st.w-18,t);
            if(t<.5){
                // Sun
                c.fillStyle='#fbbf24';c.beginPath();c.arc(orbX,st.h/2,10,0,PI2);c.fill();
                // Rays
                c.strokeStyle=`rgba(251,191,36,${.3*(1-t*2)})`;c.lineWidth=1;
                for(let i=0;i<8;i++){const a=now/800+i*Math.PI/4;c.beginPath();c.moveTo(orbX+Math.cos(a)*12,st.h/2+Math.sin(a)*12);c.lineTo(orbX+Math.cos(a)*16,st.h/2+Math.sin(a)*16);c.stroke()}
            } else {
                // Moon
                c.fillStyle='#d4d4e8';c.beginPath();c.arc(orbX,st.h/2,10,0,PI2);c.fill();
                // Crater shadows
                c.fillStyle=`rgba(0,0,0,${(t-.5)*2*.15})`;
                c.beginPath();c.arc(orbX-3,st.h/2-2,3,0,PI2);c.fill();
                c.beginPath();c.arc(orbX+4,st.h/2+3,2,0,PI2);c.fill();
            }

            lbl(c,st.toggled?'NIGHT':'DAY',st.w/2,st.h+14,st.toggled?'#9999b8':'#fbbf24');
            if(st.focused)fr(c,st.w,st.h,st.h/2);
        },
    };
}

/** 13. Reaction Picker — 5 emoji-style circles that inflate on hover region. */
export function ReactionPicker() {
    let sizes=new Float32Array(5), selected=-1;
    const emojis=['😐','🙂','😊','😄','🤩'],colors=['#9999b8','#fbbf24','#fb923c','#f472b6','#ff6b6b'];
    return {
        tick(c,dt,now,st,ptr) {
            const gap=st.w/5;
            const hoverIdx=st.hover?clamp(Math.floor(ptr.x/gap),0,4):-1;

            for(let i=0;i<5;i++){
                const active=i===hoverIdx;
                sizes[i]=lerp(sizes[i],active?16:10,dt*12);
                const cx=gap*i+gap/2,cy=st.h/2;

                // Circle
                c.fillStyle=active?`${colors[i]}30`:'rgba(255,255,255,.04)';
                c.beginPath();c.arc(cx,cy-sizes[i]+10,sizes[i],0,PI2);c.fill();

                // Emoji face (simplified)
                c.font=`${Math.round(sizes[i]*1.2)}px sans-serif`;c.textAlign='center';c.textBaseline='middle';
                c.fillText(emojis[i],cx,cy-sizes[i]+10);
            }

            // Selection line
            if(hoverIdx>=0){
                const sx=gap*hoverIdx+gap/2;
                c.fillStyle=colors[hoverIdx];
                c.fillRect(sx-10,st.h-4,20,2);
            }

            lbl(c,hoverIdx>=0?['MEH','OK','NICE','GREAT','LOVE'][hoverIdx]:'REACT',st.w/2,st.h+10,hoverIdx>=0?colors[hoverIdx]:'#9999b8');
            if(st.focused)fr(c,st.w,st.h,4);
        },
    };
}

/** 14. Notification Bell — Bell icon with bounce and count badge. */
export function NotificationBell() {
    let count=0, bellAngle=0, bellVel=0, badgeScale=0;
    return {
        onClick() {
            count++;bellVel=6;badgeScale=1.5;
        },
        tick(c,dt,now,st) {
            bellVel+=(0-bellAngle)*20*dt;bellVel*=0.9;bellAngle+=bellVel*dt;
            badgeScale=lerp(badgeScale,1,dt*8);
            const cx=st.w/2,cy=st.h/2;

            // Bell body
            c.save();c.translate(cx,cy-4);c.rotate(bellAngle*0.3);
            c.fillStyle='#fbbf24';
            c.beginPath();c.moveTo(-10,0);c.quadraticCurveTo(-12,-14,0,-18);c.quadraticCurveTo(12,-14,10,0);c.lineTo(-10,0);c.fill();
            // Clapper
            c.fillStyle='#fbbf24';c.beginPath();c.arc(0,3,3,0,PI2);c.fill();
            c.restore();

            // Badge
            if(count>0){
                const bx=cx+10,by=cy-16;
                c.save();c.translate(bx,by);c.scale(badgeScale,badgeScale);
                c.fillStyle='#ff6b6b';c.beginPath();c.arc(0,0,8,0,PI2);c.fill();
                c.fillStyle='#fff';c.font="700 8px 'JetBrains Mono',monospace";c.textAlign='center';c.textBaseline='middle';
                c.fillText(count>99?'99+':String(count),0,0);
                c.restore();
            }

            lbl(c,'NOTIFY',cx,st.h+10);
            if(st.focused)fr(c,st.w,st.h,4);
        },
    };
}


// ═══════════════════════════════════════════════════════════
//  FEEDBACK
// ═══════════════════════════════════════════════════════════

/** 15. Typewriter Field — Characters appear one by one with cursor blink. */
export function TypewriterField() {
    const text='Hello World';
    let charIdx=0, timer=0, cursorBlink=0, typing=false;
    return {
        onToggle(checked){typing=checked;if(checked){charIdx=0;timer=0}},
        tick(c,dt,now,st) {
            cursorBlink=(cursorBlink+dt*3)%2;
            if(typing&&charIdx<text.length){timer+=dt;if(timer>.08){timer=0;charIdx++}}

            c.fillStyle='rgba(255,255,255,.04)';rr(c,0,0,st.w,st.h,6);c.fill();
            c.strokeStyle='rgba(255,255,255,.06)';c.lineWidth=1;rr(c,0,0,st.w,st.h,6);c.stroke();

            const display=text.substring(0,charIdx);
            c.fillStyle='#6ee7b6';c.font="500 13px 'JetBrains Mono',monospace";c.textAlign='left';c.textBaseline='middle';
            c.fillText(display,8,st.h/2);

            // Cursor
            if(cursorBlink<1){
                const tw=c.measureText(display).width;
                c.fillStyle='#6ee7b6';c.fillRect(9+tw,st.h/2-8,1.5,16);
            }

            lbl(c,typing?'TYPING...':'TOGGLE TO TYPE',st.w/2,st.h+10,typing?'#6ee7b6':'#8888aa');
            if(st.focused)fr(c,st.w,st.h,6);
        },
    };
}

/** 16. Sound Wave Button — Oscillating waveform on press, static on idle. */
export function SoundWaveBtn() {
    let intensity=0, phase=0;
    return {
        onClick(){intensity=1},
        tick(c,dt,now,st) {
            intensity=lerp(intensity,0,dt*2);
            phase+=dt*12;

            c.fillStyle='rgba(255,255,255,.04)';rr(c,0,0,st.w,st.h,10);c.fill();

            // Waveform
            const cy=st.h/2, amp=10*intensity;
            c.strokeStyle=intensity>.1?'#f472b6':'rgba(255,255,255,.08)';c.lineWidth=2;
            c.beginPath();
            for(let x=0;x<=st.w;x++){
                const freq=x*0.1;
                const y=cy+Math.sin(phase+freq)*amp*Math.sin(x/st.w*Math.PI);
                x===0?c.moveTo(x,y):c.lineTo(x,y);
            }
            c.stroke();

            // Flatline when idle
            if(intensity<.05){
                c.strokeStyle='rgba(255,255,255,.06)';c.lineWidth=1;
                c.beginPath();c.moveTo(10,cy);c.lineTo(st.w-10,cy);c.stroke();
            }

            c.fillStyle=intensity>.1?'#f472b6':'#9999b8';c.font="600 11px 'Space Grotesk',sans-serif";c.textAlign='center';c.textBaseline='middle';
            c.fillText(intensity>.1?'●  REC':'RECORD',st.w/2,st.h/2);
            if(st.focused)fr(c,st.w,st.h,10);
        },
    };
}

/** 17. Upload Progress — File icon fills from bottom as slider increases. */
export function UploadProgress() {
    let displayVal=0;
    return {
        tick(c,dt,now,st) {
            displayVal=lerp(displayVal,st.val,dt*6);
            const cx=st.w/2,fw=30,fh=38,fx=cx-fw/2,fy=(st.h-fh)/2;

            // File icon shape
            const fold=8;
            c.strokeStyle='rgba(255,255,255,.15)';c.lineWidth=1.5;
            c.beginPath();c.moveTo(fx,fy);c.lineTo(fx+fw-fold,fy);c.lineTo(fx+fw,fy+fold);c.lineTo(fx+fw,fy+fh);c.lineTo(fx,fy+fh);c.closePath();c.stroke();
            // Fold line
            c.beginPath();c.moveTo(fx+fw-fold,fy);c.lineTo(fx+fw-fold,fy+fold);c.lineTo(fx+fw,fy+fold);c.stroke();

            // Fill
            const fillH=fh*displayVal;
            const col=displayVal>=1?'#6ee7b6':'#38bdf8';
            c.fillStyle=`${col}30`;
            c.save();c.beginPath();c.rect(fx+1,fy+fh-fillH,fw-1,fillH);c.clip();
            c.beginPath();c.moveTo(fx,fy);c.lineTo(fx+fw-fold,fy);c.lineTo(fx+fw,fy+fold);c.lineTo(fx+fw,fy+fh);c.lineTo(fx,fy+fh);c.closePath();c.fill();
            c.restore();

            // Arrow or checkmark
            c.strokeStyle=col;c.lineWidth=2;c.lineCap='round';
            if(displayVal>=.99){
                c.beginPath();c.moveTo(cx-5,fy+fh/2);c.lineTo(cx-1,fy+fh/2+5);c.lineTo(cx+6,fy+fh/2-4);c.stroke();
            } else {
                c.beginPath();c.moveTo(cx,fy+fh/2+5);c.lineTo(cx,fy+fh/2-5);c.stroke();
                c.beginPath();c.moveTo(cx-4,fy+fh/2-1);c.lineTo(cx,fy+fh/2-5);c.lineTo(cx+4,fy+fh/2-1);c.stroke();
            }
            c.lineCap='butt';

            lbl(c,displayVal>=.99?'DONE':Math.round(displayVal*100)+'%',cx,st.h+10,displayVal>=.99?'#6ee7b6':'#9999b8');
            if(st.focused)fr(c,st.w,st.h,4);
        },
    };
}


// ═══════════════════════════════════════════════════════════
//  FUN
// ═══════════════════════════════════════════════════════════

/** 18. Scratch Reveal — Drag to erase a mask and reveal the prize beneath. */
export function ScratchReveal({seed=42}={}) {
    const rng=new Random(seed);
    let revealed=0, scratches=[];
    return {
        onDrag(val,vx) {
            if(Math.abs(vx)>0.5){
                for(let i=0;i<3;i++)scratches.push({x:val*200,y:rng.range(2,26),r:rng.range(6,14)});
                revealed=Math.min(1,revealed+0.015);
            }
        },
        tick(c,dt,now,st) {
            // Prize background
            c.fillStyle='rgba(110,231,182,.08)';rr(c,0,0,st.w,st.h,8);c.fill();

            // Prize text (always there, hidden by mask)
            c.fillStyle=`rgba(110,231,182,${.1+revealed*.6})`;c.font="700 14px 'JetBrains Mono',monospace";c.textAlign='center';c.textBaseline='middle';
            c.fillText(revealed>.6?'🎉 WINNER!':'? ? ?',st.w/2,st.h/2);

            // Scratch mask (gets holes)
            if(revealed<.95){
                c.fillStyle='rgba(40,40,60,.85)';rr(c,0,0,st.w,st.h,8);c.fill();

                // Cut holes
                c.globalCompositeOperation='destination-out';
                for(const s of scratches){
                    c.beginPath();c.arc(s.x,s.y,s.r,0,PI2);c.fill();
                }
                c.globalCompositeOperation='source-over';

                // Shimmer line
                c.fillStyle='rgba(255,255,255,.04)';
                const shimX=(now/20)%st.w;
                c.fillRect(shimX-2,0,4,st.h);
            }

            lbl(c,revealed>.6?'REVEALED!':'DRAG TO SCRATCH',st.w/2,st.h+10,revealed>.6?'#6ee7b6':'#9999b8');
            if(st.focused)fr(c,st.w,st.h,8);
        },
    };
}

/** 19. Timer Countdown — Circular countdown timer. Toggle starts/stops. */
export function TimerCountdown() {
    let timeLeft=10, running=false, flashAlpha=0;
    return {
        onToggle(checked) { running=checked; if(checked)timeLeft=10; },
        tick(c,dt,now,st) {
            if(running&&timeLeft>0) timeLeft=Math.max(0,timeLeft-dt);
            if(timeLeft<=0&&running) flashAlpha=Math.sin(now/150)*.5+.5;
            else flashAlpha=0;

            const cx=st.w/2,cy=st.h/2,R=Math.min(cx,cy)-4;

            // Flash bg when done
            if(flashAlpha>0){c.fillStyle=`rgba(255,100,100,${flashAlpha*.1})`;c.beginPath();c.arc(cx,cy,R+4,0,PI2);c.fill();}

            // Background ring
            c.strokeStyle='rgba(255,255,255,.06)';c.lineWidth=4;c.beginPath();c.arc(cx,cy,R,0,PI2);c.stroke();

            // Progress arc
            const progress=timeLeft/10;
            const col=timeLeft>3?'#6ee7b6':timeLeft>1?'#fbbf24':'#ff6b6b';
            c.strokeStyle=col;c.lineWidth=4;
            c.beginPath();c.arc(cx,cy,R,-Math.PI/2,-Math.PI/2+progress*PI2,false);c.stroke();

            // Time text
            c.fillStyle='#e2e2f0';c.font="700 16px 'JetBrains Mono',monospace";c.textAlign='center';c.textBaseline='middle';
            c.fillText(timeLeft.toFixed(1)+'s',cx,cy);

            lbl(c,running?(timeLeft>0?'RUNNING':'TIME UP!'):'TOGGLE TO START',cx,st.h+10,running?col:'#8888aa');
            if(st.focused)fr(c,st.w,st.h,R);
        },
    };
}

/** 20. Pull Refresh — Drag down to charge, release to spin. */
export function PullRefresh() {
    let pullAmt=0, spinning=false, spinAngle=0, spinTimer=0;
    return {
        onDrag(val) { if(!spinning) pullAmt=val; },
        onToggle(checked) {
            if(checked&&pullAmt>.6){ spinning=true;spinTimer=2; }
            pullAmt=0;
        },
        tick(c,dt,now,st) {
            if(spinning){spinAngle+=dt*12;spinTimer-=dt;if(spinTimer<=0){spinning=false;spinAngle=0}}
            const cx=st.w/2,cy=st.h/2;

            // Container
            c.fillStyle='rgba(255,255,255,.03)';c.beginPath();c.arc(cx,cy,24,0,PI2);c.fill();

            // Pull indicator or spinner
            if(spinning){
                // Spinner arcs
                for(let i=0;i<3;i++){
                    const a=spinAngle+i*PI2/3;
                    c.strokeStyle=`rgba(56,189,248,${.3+i*.2})`;c.lineWidth=3;
                    c.beginPath();c.arc(cx,cy,16,a,a+.8);c.stroke();
                }
                lbl(c,'LOADING...',cx,st.h+10,'#38bdf8');
            } else {
                // Arrow that stretches with pull
                const stretch=pullAmt*14;
                c.strokeStyle=pullAmt>.6?'#6ee7b6':'rgba(255,255,255,.15)';c.lineWidth=2;c.lineCap='round';
                c.beginPath();c.moveTo(cx,cy-8-stretch);c.lineTo(cx,cy+4);c.stroke();
                c.beginPath();c.moveTo(cx-5,cy+0);c.lineTo(cx,cy+4);c.lineTo(cx+5,cy+0);c.stroke();
                c.lineCap='butt';

                // Fill ring
                if(pullAmt>0){
                    c.strokeStyle=pullAmt>.6?'#6ee7b6':'rgba(255,255,255,.1)';c.lineWidth=2;
                    c.beginPath();c.arc(cx,cy,20,-Math.PI/2,-Math.PI/2+pullAmt*PI2);c.stroke();
                }
                lbl(c,pullAmt>.6?'RELEASE!':'DRAG SLIDER',cx,st.h+10,pullAmt>.6?'#6ee7b6':'#9999b8');
            }
            if(st.focused)fr(c,st.w,st.h,24);
        },
    };
}


// ═══════════════════════════════════════════════════════════
//  EXPORT MAP
// ═══════════════════════════════════════════════════════════

export const UIFXRecipes3 = {
    VolumeKnob, CompassKnob,
    RingProgress, BatteryGauge, SignalMeter,
    PillTabs, Stepper, RadioOrbit,
    PasswordStrength, WaterLevel, HeatMap,
    DayNightToggle, ReactionPicker, NotificationBell,
    TypewriterField, SoundWaveBtn, UploadProgress,
    ScratchReveal, TimerCountdown, PullRefresh,
};

export default UIFXRecipes3;
