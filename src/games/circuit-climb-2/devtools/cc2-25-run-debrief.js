/**
 * CC2-25 — Living Circuit Debrief, a read-only projection of authoritative
 * runSummary and event ledgers.
 *
 * This layer never calculates scores, changes achievements, fabricates a
 * solved equation, or accepts a gameplay command. Existing real Close,
 * Restart and equation-review controls remain owned by CC2 core.
 *
 * The hero is animated from source-*verified* RUN_ENDED reason; the small
 * route chart uses exactly the number of physically completed rows.
 */
(() => {
  'use strict';
  const panel=document.getElementById('summaryPanel');
  if(!panel)return;
  const card=panel.querySelector('.summary-card');
  const title=document.getElementById('summaryTitle');
  const outcome=document.getElementById('summaryOutcome');
  const stats=document.getElementById('summaryStats');
  const equationList=document.getElementById('summaryEquations');
  const restart=document.getElementById('summaryRestart');
  if(!card||!title||!outcome||!stats||!equationList||!restart)return;
  let renderedFor='',renderCount=0,errors=[];
  const el=(tag,cls,text)=>{
    const e=document.createElement(tag);
    if(cls)e.className=cls;
    if(text!==undefined)e.textContent=text;
    return e;
  };
  const pct=(n)=>Math.max(0,Math.min(100,n));
  const api=()=>window.__CC2_02A__;
  const source=()=>api()?.summary?.()??null;
  function makePortrait(){
    const p=el('div','cc225-portrait');
    p.setAttribute('aria-hidden','true');
    p.innerHTML='<div class="cc225-particle-halo"></div>'+
      '<div class="cc225-red-body"><div class="cc225-blue-eye"></div></div>'+
      '<div class="cc225-orbit cc225-orbit-one"></div>'+
      '<div class="cc225-orbit cc225-orbit-two"></div>';
    return p;
  }
  const hero=el('section','cc225-hero');
  hero.setAttribute('aria-label','Run outcome');
  hero.append(makePortrait());
  const heroText=el('div','cc225-hero-copy');
  const eyebrow=el('div','cc225-eyebrow','CIRCUIT RECORD');
  const head=el('h2','cc225-hero-head','Run complete');
  const deck=el('p','cc225-hero-deck');
  heroText.append(eyebrow,head,deck);
  hero.append(heroText);
  card.insertBefore(hero,outcome);
  const strip=el('section','cc225-record-strip');
  strip.setAttribute('aria-label','Verified run highlights');
  const route=el('div','cc225-route');
  const routeTitle=el('div','cc225-section-title','THE CIRCUIT YOU BUILT');
  const routeGraphic=el('div','cc225-route-graphic');
  const routeCaption=el('div','cc225-route-caption');
  route.append(routeTitle,routeGraphic,routeCaption);
  /*
   * CC2-25-Q2: the actionable summary MUST precede the old verbose metric
   * grid. Keep source-owned #summaryStats mounted exactly once, so the
   * authoritative CC2-02A summary function continues writing to it.
   * It is nested under an optional disclosure, not deleted or rewritten.
   */
  const breakdown=el('details','cc225-breakdown');
  const breakdownTitle=el('summary','','Full run statistics and special events');
  breakdown.append(breakdownTitle);
  stats.after(breakdown);
  breakdown.append(stats);
  outcome.after(strip,route);
  const reviewTitle=card.querySelector('h3:nth-of-type(2)');
  if(reviewTitle){
    reviewTitle.textContent='Your completed equations';
    reviewTitle.classList.add('cc225-review-title');
  }
  const reviewWrap=el('div','cc225-review-actions');
  const review=el('button','cc225-review-button','Review solved equations');
  review.type='button';
  review.setAttribute('aria-controls','summaryEquations');
  review.addEventListener('click',()=>{
    const first=equationList.querySelector('li');
    if(first){
      first.setAttribute('tabindex','-1');
      first.focus({preventScroll:true});
      first.scrollIntoView({block:'nearest',behavior:
        matchMedia('(prefers-reduced-motion:reduce)').matches?
          'instant':'smooth'});
    }
  });
  reviewWrap.append(review);
  route.after(reviewWrap,restart,breakdown);
  restart.textContent='Climb again';
  restart.classList.add('cc225-restart');

  function makeMetric(label,value,kind){
    const box=el('div','cc225-verified-metric');
    box.dataset.kind=kind;
    box.append(el('span','cc225-metric-label',label),
      el('strong','cc225-metric-value',value));
    return box;
  }
  function updateRoute(rows){
    routeGraphic.replaceChildren();
    const cells=Math.min(rows,24);
    for(let i=1;i<=cells;i++){
      const step=el('div','cc225-route-step');
      const atCell=i%4===0;
      step.dataset.cell=atCell?'yes':'no';
      step.setAttribute('aria-hidden','true');
      routeGraphic.append(step);
    }
    if(rows>24){
      routeGraphic.append(el('span','cc225-route-more','+'+(rows-24)));
    }
    if(!rows)routeGraphic.append(el('span','cc225-route-empty',
      'The circuit is ready for the next attempt.'));
    routeCaption.textContent=rows+' verified physical landing'+
      (rows===1?'':'s')+' · '+Math.floor(rows/4)+' completed power cell'+
      (Math.floor(rows/4)===1?'':'s')+
      ' · each illuminated mark represents a solved row';
  }
  function update(){
    if(panel.hidden)return;
    const s=api()?.snapshot?.(),r=source();
    if(!s||!r?.ended||r.runId!==s.runId||
      s.phase!=='ended'||!Array.isArray(r.equations))return;
    const k=r.runId+':'+s.tick+':'+r.endReason;
    if(k===renderedFor)return;
    renderedFor=k;renderCount++;
    const captured=r.endReason==='CAPTURED';
    const goal=r.endReason==='CHALLENGE_GOAL'||r.endReason==='PRACTICE_GOAL';
    panel.dataset.cc225Outcome=captured?'captured':goal?'goal':'ended';
    eyebrow.textContent=captured?'SPARK CONTAINED':goal?
      'CIRCUIT COMPLETED':'CIRCUIT RECORD';
    head.textContent=captured?'The Pursuer caught Spark':goal?
      'You completed the climb':'Your climb, recorded';
    deck.textContent=captured
      ?'You completed '+r.rowsSolved+' mathematically correct row'+
          (r.rowsSolved===1?'':'s')+
          ' before the Pursuer reached Spark. Those circuits remain yours.'
      :goal?'The destination is yours. Every highlighted segment below represents a real completed mathematical landing.'
      :'Your verified progress is preserved. A new run starts a fresh circuit.';
    title.textContent='Circuit Climb · Run Debrief';
    strip.replaceChildren();
    const accuracy=r.accuracyPercent===null?'—':pct(r.accuracyPercent)+'%';
    strip.append(
      makeMetric('ROWS CLIMBED',String(r.rowsSolved),'rows'),
      makeMetric('CHOSEN ACCURACY',accuracy,'accuracy'),
      makeMetric('POINTS EARNED',String(r.score),'score'),
      makeMetric('POWER CELLS',String(r.powerCells),'cells')
    );
    updateRoute(r.equations.length);
    // Strict ledger confidence: never turn a tapped but unlanded selection
    // into a highlighted row or an earned badge.
    if(r.equations.length!==r.rowsSolved){
      errors.push('CC225_SUMMARY_SOLVED_ROW_MISMATCH');
      routeGraphic.replaceChildren();
      routeCaption.textContent='Equation ledger unavailable.';
    }
    outcome.textContent=r.outcome;
  }
  const observer=new MutationObserver(()=>{try{update();}catch(e){
    errors.push(String(e));}});
  observer.observe(panel,{attributes:true,attributeFilter:['hidden']});
  window.__CC2_25__=Object.freeze({
    report:()=>({schema:'cc2-living-debrief/v1',
      renderedFor,renderCount,errors:errors.slice(),
      visible:!panel.hidden,sourceRunId:source()?.runId??null,
      displayedRows:routeCaption.textContent})
  });
})();
