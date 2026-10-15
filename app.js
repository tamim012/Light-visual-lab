(() => {
  const $ = (id) => document.getElementById(id);
  const state = { language: "bn", tab: "mirror" };
  const canvas = $("rayCanvas");
  const ctx = canvas.getContext("2d");
  const refrCanvas = $("refractionCanvas");
  const rctx = refrCanvas.getContext("2d");

  let draggingObject = false;
  let lastMirrorGeometry = null;

  function pointerToCanvasX(event, c) {
    const rect = c.getBoundingClientRect();
    return event.clientX - rect.left;
  }

  function updateObjectDistanceFromPointer(event) {
    if (!lastMirrorGeometry) return;
    const px = pointerToCanvasX(event, canvas);
    const { mirrorX, scale } = lastMirrorGeometry;
    // Object must remain on the object side (left of the mirror). Keep a safe margin.
    const maxDistance = 400;
    const minDistance = 20;
    const distance = Math.max(minDistance, Math.min(maxDistance, (mirrorX - px) / scale));
    const snapped = Math.round(distance / 5) * 5;
    objectDistance.value = String(Math.max(minDistance, Math.min(maxDistance, snapped)));
    updateMirror();
    drawMirror();
  }

  const mirrorType = $("mirrorType");
  const focal = $("focalLength");
  const objectDistance = $("objectDistance");
  const objectHeight = $("objectHeight");
  const showAxis = $("showAxis");
  const showPoints = $("showPoints");
  const showRays = $("showRays");

  function isEn() { return state.language === "en"; }
  function t(bn, en) { return isEn() ? en : bn; }
  function setLanguage() {
    document.documentElement.lang = state.language;
    $("languageBtn").textContent = isEn() ? "English / বাংলা" : "বাংলা / EN";
    document.querySelectorAll("[data-bn][data-en]").forEach(el => {
      el.textContent = t(el.dataset.bn, el.dataset.en);
    });
    updateMirror();
    updateRefraction();
    drawMirror();
    drawRefraction();
  }

  function setTab(tab) {
    state.tab = tab;
    document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    $("mirrorPanel").classList.toggle("hidden", tab !== "mirror");
    $("mirrorResults").classList.toggle("hidden", tab !== "mirror");
    $("mirrorExplanation").classList.toggle("hidden", tab !== "mirror");
    $("refractionPanel").classList.toggle("hidden", tab !== "refraction");
    $("refractionResults").classList.toggle("hidden", tab !== "refraction");
    $("lessonPanel").classList.toggle("hidden", tab !== "lesson");
    if (tab === "mirror") {
      $("pageTitle").textContent = t("দর্পণে আলোর প্রতিফলন", "Reflection in Mirrors");
      $("pageSubtitle").textContent = t("বস্তু সরিয়ে দেখো প্রতিবিম্ব কোথায় তৈরি হয় এবং কেমন হয়।", "Move the object to explore image position, size and nature.");
    } else if (tab === "refraction") {
      $("pageTitle").textContent = t("মাধ্যমে আলোর প্রতিসরণ", "Refraction between media");
      $("pageSubtitle").textContent = t("মাধ্যম ও আপতন কোণ বদলে প্রতিসরণের নিয়ম যাচাই করো।", "Change the media and incidence angle to test refraction.");
    } else {
      $("pageTitle").textContent = t("সূত্র ও শেখা", "Learn the formulas");
      $("pageSubtitle").textContent = t("গুরুত্বপূর্ণ সূত্র, ধারণা এবং একটি ছোট কুইজ।", "Review key formulas, concepts and a short quiz.");
    }
    if (tab === "refraction") requestAnimationFrame(drawRefraction);
    if (tab === "mirror") requestAnimationFrame(drawMirror);
  }

  // Mirror equation with positive magnitude distances for a real object.
  // Concave: f > 0; convex: f < 0; plane: f = infinity.
  function calculateMirror() {
    const type = mirrorType.value;
    const u = Number(objectDistance.value);
    const fAbs = Number(focal.value);
    const f = type === "concave" ? fAbs : type === "convex" ? -fAbs : Infinity;
    let v, m;
    if (type === "plane") { v = -u; m = 1; }
    else {
      const denom = 1 / f - 1 / u;
      v = Math.abs(denom) < 1e-9 ? Infinity : 1 / denom;
      m = Number.isFinite(v) ? -v / u : (f > 0 ? -Infinity : Infinity);
    }
    const h = Number(objectHeight.value);
    const hi = m * h;
    const finite = Number.isFinite(v);
    const real = finite && v > 0;
    const virtual = !finite || v < 0;
    const upright = m > 0;
    let position;
    if (!finite) position = t("অসীমে (রশ্মি সমান্তরাল)", "At infinity (rays parallel)");
    else if (type === "plane") position = t(`${u} cm, দর্পণের পেছনে`, `${u} cm behind the mirror`);
    else position = `${Math.abs(v).toFixed(1)} cm ${real ? t("দর্পণের সামনে", "in front of mirror") : t("দর্পণের পেছনে", "behind mirror")}`;
    const size = Number.isFinite(hi) ? Math.abs(hi) : Infinity;
    let nature = [];
    if (real) nature.push(t("বাস্তব", "Real"));
    else nature.push(t("কাল্পনিক", "Virtual"));
    nature.push(upright ? t("সোজা", "Upright") : t("উল্টো", "Inverted"));
    if (Number.isFinite(size)) {
      if (Math.abs(size - h) < 0.5) nature.push(t("সমান আকার", "Same size"));
      else if (size > h) nature.push(t("বড়", "Enlarged"));
      else nature.push(t("ছোট", "Diminished"));
    }
    let description;
    if (type === "plane") {
      description = t("সমতল দর্পণে প্রতিবিম্ব দর্পণের পেছনে বস্তুর সমান দূরত্বে তৈরি হয়। এটি কাল্পনিক, সোজা এবং বস্তুর সমান আকারের।", "A plane mirror forms a virtual, upright image the same distance behind the mirror as the object is in front, with the same size.");
    } else if (type === "convex") {
      description = t("উত্তল দর্পণে বাস্তব বস্তুর প্রতিবিম্ব সবসময় দর্পণের পেছনে, কাল্পনিক, সোজা এবং ছোট হয়।", "A convex mirror forms a virtual, upright and diminished image behind the mirror for a real object.");
    } else if (!finite) {
      description = t("বস্তু প্রধান ফোকাসে থাকায় প্রতিফলিত রশ্মিগুলো সমান্তরাল হয়; আদর্শ মডেলে প্রতিবিম্ব অসীমে।", "At the focus, reflected rays are parallel; in the ideal model the image is at infinity.");
    } else if (u > 2*fAbs) {
      description = t("বস্তু C বা 2F-এর বাইরে। প্রতিবিম্ব F ও C-এর মধ্যে, বাস্তব, উল্টো এবং ছোট।", "Object is beyond C (2F). The image forms between F and C, real, inverted and diminished.");
    } else if (Math.abs(u - 2*fAbs) < 0.01) {
      description = t("বস্তু C বা 2F-এ। প্রতিবিম্বও C বা 2F-এ, বাস্তব, উল্টো এবং সমান আকারের।", "Object is at C (2F). The image is also at C, real, inverted and the same size.");
    } else if (u > fAbs && u < 2*fAbs) {
      description = t("বস্তু F ও C-এর মধ্যে। প্রতিবিম্ব C-এর বাইরে, বাস্তব, উল্টো এবং বড়।", "Object is between F and C. The image is beyond C, real, inverted and enlarged.");
    } else if (u < fAbs) {
      description = t("বস্তু F ও দর্পণের মধ্যে। প্রতিবিম্ব দর্পণের পেছনে, কাল্পনিক, সোজা এবং বড়।", "Object is between F and the mirror. The image is virtual, upright and enlarged behind the mirror.");
    } else {
      description = t("দর্পণ সূত্র দিয়ে প্রতিবিম্বের অবস্থান, বিবর্ধন দিয়ে আকার ও প্রকৃতি নির্ণয় করা হয়েছে।", "Image position is calculated from the mirror equation; size and orientation from magnification.");
    }
    return { type, u, f, fAbs, v, m, h, hi, size, real, virtual, upright, finite, position, nature, description };
  }

  function updateMirror() {
    const c = calculateMirror();
    $("focalOut").textContent = `${c.fAbs} cm`;
    $("objectOut").textContent = `${c.u} cm`;
    $("heightOut").textContent = `${c.h} cm`;
    $("imagePosition").textContent = c.finite ? `${Math.abs(c.v).toFixed(1)} cm` : t("অসীমে", "Infinity");
    $("imagePositionSub").textContent = c.position;
    $("imageSize").textContent = Number.isFinite(c.size) ? `${c.size.toFixed(1)} cm` : t("অসীম", "Infinite");
    $("magnification").textContent = Number.isFinite(c.m) ? `m = ${c.m.toFixed(2)}` : t("m → অসীম", "m → infinity");
    $("natureTags").innerHTML = c.nature.map((n, i) => `<span class="tag ${i===0 && c.virtual ? "virtual-tag" : ""} ${i===1 && c.upright ? "upright-tag" : ""}">${escapeHtml(n)}</span>`).join("");
    $("natureSub").textContent = c.real ? t("পর্দায় ধরা সম্ভব (আদর্শ মডেল)", "Can be caught on a screen (ideal model)") : t("পর্দায় ধরা যায় না", "Cannot be caught on a screen");
    $("explanationText").textContent = c.description;
  }

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }

  function resizeCanvas(c) {
    const rect = c.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const cx = c.getContext("2d");
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: rect.width, h: rect.height, ctx: cx };
  }

  function drawArrow(c, x1, y1, x2, y2, color, dashed=false) {
    c.save(); c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 2.3;
    c.setLineDash(dashed ? [6,5] : []);
    c.beginPath(); c.moveTo(x1,y1); c.lineTo(x2,y2); c.stroke(); c.setLineDash([]);
    const a = Math.atan2(y2-y1,x2-x1), len=8;
    c.beginPath(); c.moveTo(x2,y2); c.lineTo(x2-len*Math.cos(a-.45),y2-len*Math.sin(a-.45)); c.lineTo(x2-len*Math.cos(a+.45),y2-len*Math.sin(a+.45)); c.closePath(); c.fill();
    c.restore();
  }
  function drawLine(c,x1,y1,x2,y2,color,width=1,dash=[]) {
    c.save();c.strokeStyle=color;c.lineWidth=width;c.setLineDash(dash);c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();c.restore();
  }
  function label(c,text,x,y,color="#536177",font="12px system-ui") {
    c.save();c.fillStyle=color;c.font=font;c.fillText(text,x,y);c.restore();
  }

  function drawMirror() {
    if (state.tab !== "mirror") return;
    const {w,h,ctx:c} = resizeCanvas(canvas);
    c.clearRect(0,0,w,h);
    c.fillStyle="#ffffff";c.fillRect(0,0,w,h);
    // Faint grid
    c.strokeStyle="#f0f3f8";c.lineWidth=1;
    for(let x=0;x<w;x+=28){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}
    for(let y=0;y<h;y+=28){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}
    const data=calculateMirror(), midY=h*0.56, mirrorX=w*0.72;
    // Keep the virtual side visible for convex-mirror F/C markers and plane/convex images.
    const rightExtent = data.type === "plane" ? data.u : data.type === "convex" ? data.fAbs*2 : 0;
    const rightSideScale = rightExtent > 0 ? Math.max(0.01,(w-mirrorX-24)/rightExtent) : Infinity;
    const scale=Math.min((w*0.55)/Math.max(data.u,data.fAbs*2,120), (h*.30)/Math.max(data.h,35), rightSideScale);
    lastMirrorGeometry = { mirrorX, midY, scale, objectX: mirrorX - data.u * scale, objectY: midY - data.h * scale };
    const sx=cm=>cm*scale;
    if(showAxis.checked) drawLine(c,24,midY,w-22,midY,"#aab5c5",1.4,[5,5]);
    // Mirror surface
    if(data.type==="plane"){
      drawLine(c,mirrorX,midY-h*.36,mirrorX,midY+h*.36,"#1f2937",5);
      for(let yy=midY-h*.34;yy<midY+h*.34;yy+=14) drawLine(c,mirrorX+3,yy,mirrorX+12,yy+8,"#94a3b8",1.4);
    } else {
      // Spherical mirror profile: concave opens toward the object (left),
      // convex bulges toward the object. The vertex remains at mirrorX.
      c.save(); c.strokeStyle="#26384f";c.lineWidth=5;c.beginPath();
      const radius=Math.max(70,Math.min(h*.58, data.fAbs*scale*2));
      if(data.type==="concave") c.ellipse(mirrorX-radius*.72,midY,radius*.72,radius,0,-Math.PI*.30,Math.PI*.30);
      else c.ellipse(mirrorX+radius*.72,midY,radius*.72,radius,0,Math.PI*.70,Math.PI*1.30);
      c.stroke();c.restore();
      // small hatch marks
      for(let yy=midY-h*.31;yy<midY+h*.31;yy+=14) drawLine(c,mirrorX+5,yy,mirrorX+13,yy+7,"#94a3b8",1);
    }
    label(c,t("প্রধান অক্ষ","Principal axis"),28,midY-9,"#7c8797","11px system-ui");
    const objX=mirrorX-sx(data.u), objY=midY-sx(data.h);
    // Object arrow; wide transparent hit zone makes dragging easier on touch screens.
    c.save(); c.strokeStyle="rgba(217,119,6,0.001)"; c.lineWidth=28; c.beginPath(); c.moveTo(objX,midY); c.lineTo(objX,objY); c.stroke(); c.restore();
    drawLine(c,objX,midY,objX,objY,"#d97706",3);
    drawArrow(c,objX,midY+1,objX,objY,"#d97706");
    label(c,t("বস্তু","Object"),objX-20,objY-12,"#b45309","12px system-ui");
    if(showPoints.checked && data.type!=="plane"){
      // Concave mirror: F and C are in front of the mirror (object side).
      // Convex mirror: F and C are virtual points behind the mirror only.
      const direction = data.type === "concave" ? -1 : 1;
      const fX = mirrorX + direction * sx(data.fAbs);
      const cX = mirrorX + direction * sx(data.fAbs*2);
      c.fillStyle="#2563eb";c.beginPath();c.arc(fX,midY,4,0,Math.PI*2);c.fill();
      label(c,"F",fX-3,midY+18,"#2563eb","bold 12px system-ui");
      c.fillStyle="#7c3aed";c.beginPath();c.arc(cX,midY,4,0,Math.PI*2);c.fill();
      label(c,data.type === "concave" ? "C (2F)" : "C",cX-17,midY+18,"#7c3aed","bold 11px system-ui");
    }
    if(showRays.checked) drawMirrorRays(c,data,{w,h,midY,mirrorX,scale});
    // Image arrow, positioned based on calculated image distance. Clamp to canvas while retaining actual result in card.
    if(data.finite && Number.isFinite(data.hi)){
      let imgX;
      if(data.type==="plane") imgX=mirrorX+sx(data.u);
      else imgX=mirrorX-data.v*scale;
      imgX=Math.max(16,Math.min(w-18,imgX));
      const imgHeight=Math.max(5,Math.min(h*.40,Math.abs(data.hi)*scale));
      const imgY=midY-(data.hi>=0?imgHeight:-imgHeight);
      const real=data.type!=="plane" && data.v>0;
      const color=real?"#2563eb":"#7c3aed";
      drawArrow(c,imgX,midY+1,imgX,imgY,color,!real);
      label(c,t("প্রতিবিম্ব","Image"),Math.max(5,Math.min(w-90,imgX-28)),imgY+(data.hi>=0?-10:20),color,"12px system-ui");
    }
    // Small orientation key
    c.fillStyle="#f7f9fc";c.strokeStyle="#e7ecf4";c.lineWidth=1;
    c.beginPath();c.roundRect(14,12,Math.min(210,w-28),40,8);c.fill();c.stroke();
    label(c,t("দর্পণ সূত্রভিত্তিক চিত্র","Mirror-equation diagram"),25,29,"#526177","11px system-ui");
    label(c,data.type==="concave"?"Concave":data.type==="convex"?"Convex":"Plane mirror",25,43,"#1d4ed8","bold 10px system-ui");
  }

  function drawMirrorRays(c,d,box) {
    const {w,h,midY,mirrorX,scale}=box;
    const objX=mirrorX-d.u*scale, objY=midY-d.h*scale;
    const leftEdge=18, rightEdge=w-12;
    const colIn="#d97706", colOut="#2563eb", colVirtual="#8b5cf6", colThird="#0f766e";
    const fPx=d.fAbs*scale;
    const yAt=(x1,y1,x2,y2,x)=>Math.abs(x2-x1)<1e-8?y2:y1+(y2-y1)*(x-x1)/(x2-x1);
    const safeLabel=(txt,x,y,color,font)=>label(c,txt,Math.max(20,Math.min(w-155,x)),Math.max(12,Math.min(h-8,y)),color,font);
    const plane=d.type==="plane";
    if(plane){
      // One illustrative ray: reflection obeys equal angles; the image is on
      // the backward extension of the reflected ray.
      const hitY=midY-(objY-midY)*0.45;
      const imageX=mirrorX+d.u*scale;
      const slope=(hitY-objY)/(mirrorX-objX);
      const reflectedEndY=hitY+slope*(leftEdge-mirrorX);
      drawArrow(c,objX,objY,mirrorX,hitY,colIn);
      drawArrow(c,mirrorX,hitY,leftEdge,reflectedEndY,colOut);
      const imageY=hitY+slope*(imageX-mirrorX);
      drawLine(c,mirrorX,hitY,imageX,imageY,colVirtual,1.7,[5,5]);
      safeLabel(t("সমান আপতন ও প্রতিফলন কোণ","Angle of incidence = angle of reflection"),objX+4,objY-10,colIn,"10px system-ui");
      return;
    }

    // Principal ray 1: parallel to the principal axis. For a concave mirror,
    // the reflected ray passes through F. For a convex mirror, it diverges and
    // its backward extension passes through the virtual focus behind the mirror.
    const hit1Y=objY;
    drawArrow(c,objX,objY,mirrorX,hit1Y,colIn);
    if(d.type==="concave"){
      const fX=mirrorX-fPx;
      const yLeft=yAt(mirrorX,hit1Y,fX,midY,leftEdge);
      drawArrow(c,mirrorX,hit1Y,leftEdge,yLeft,colOut);
      safeLabel(t("সমান্তরাল রশ্মি F দিয়ে যায়","Parallel ray reflects through F"),leftEdge+4,Math.min(hit1Y,yLeft)-8,colOut,"10px system-ui");
    } else {
      const fX=mirrorX+fPx;
      const yLeft=yAt(mirrorX,hit1Y,fX,midY,leftEdge);
      drawArrow(c,mirrorX,hit1Y,leftEdge,yLeft,colOut);
      const yRight=yAt(mirrorX,hit1Y,fX,midY,rightEdge);
      drawLine(c,mirrorX,hit1Y,rightEdge,yRight,colVirtual,1.7,[5,5]);
      safeLabel(t("বর্ধিতাংশ পেছনের F দিয়ে যায়","Backward extension passes through F"),mirrorX+3,midY-15,colVirtual,"10px system-ui");
    }
    safeLabel(t("প্রধান অক্ষের সমান্তরাল আপতিত রশ্মি","Incident ray parallel to axis"),Math.max(22,objX+4),objY-10,colIn,"10px system-ui");

    // Principal ray 2: aim the incident ray through F (concave) or toward the
    // virtual F behind a convex mirror. It reflects parallel to the axis.
    let hit2Y;
    if(d.type==="concave"){
      // Line from object tip through real focus, extrapolated to mirror vertex.
      hit2Y=midY + (objY-midY)*d.fAbs/(d.fAbs-d.u);
    } else {
      // Line from object tip aimed at the virtual focus behind the mirror.
      hit2Y=midY + (objY-midY)*d.fAbs/(d.fAbs+d.u);
    }
    // Keep the drawing inside the canvas without changing the rule's direction.
    hit2Y=Math.max(midY-h*.34,Math.min(midY+h*.34,hit2Y));
    drawArrow(c,objX,objY,mirrorX,hit2Y,colIn);
    drawArrow(c,mirrorX,hit2Y,leftEdge,hit2Y,colThird);
    safeLabel(d.type==="concave"?t("F দিয়ে আপতিত","Incident through F"):t("পেছনের F-এর দিকে আপতিত","Directed toward virtual F"),Math.max(22,objX+4),hit2Y+17,colIn,"10px system-ui");
    safeLabel(t("প্রতিফলনের পর অক্ষের সমান্তরাল","Reflected parallel to axis"),leftEdge+4,hit2Y-8,colThird,"10px system-ui");

    // When u=f, ray 2 is parallel to ray 1 after reflection and the image is
    // at infinity. For u<f, the real reflected rays diverge; their backward
    // extensions behind the mirror intersect at the virtual image.
    if(d.type==="concave" && d.u<d.fAbs){
      const imageX=mirrorX+Math.abs(d.v)*scale;
      const imageY=midY-d.hi*scale;
      const ray1EndY=yAt(mirrorX,hit1Y,mirrorX-fPx,midY,leftEdge);
      const ray2EndY=hit2Y;
      // Dashed reverse extensions of the reflected rays, only on the virtual side.
      if(Number.isFinite(imageX) && imageX<rightEdge){
        drawLine(c,mirrorX,hit1Y,imageX,imageY,colVirtual,1.5,[5,5]);
        drawLine(c,mirrorX,hit2Y,imageX,imageY,colVirtual,1.5,[5,5]);
      }
      safeLabel(t("ড্যাশড বর্ধিতাংশ পেছনে মিলবে","Dashed extensions meet behind mirror"),mirrorX+4,midY+30,colVirtual,"10px system-ui");
    }
  }

  function updateRefraction() {
    const n1=Number($("medium1").value),n2=Number($("medium2").value),i=Number($("incidenceAngle").value);
    $("incidenceOut").textContent=`${i}°`;
    const sinr=(n1/n2)*Math.sin(i*Math.PI/180);
    const tir=sinr>1+1e-12;
    const r=tir?null:Math.asin(Math.min(1,Math.max(-1,sinr)))*180/Math.PI;
    $("refractedAngle").textContent=tir?t("প্রতিসৃত রশ্মি নেই","No transmitted ray"):`${r.toFixed(2)}°`;
    $("bendDirection").textContent=tir?t("পূর্ণ অভ্যন্তরীণ প্রতিফলন","Total internal reflection"):Math.abs(r-i)<.05?t("দিক পরিবর্তন প্রায় নেই","No significant bending"):r<i?t("অভিলম্বের দিকে বাঁকে","Bends toward the normal"):t("অভিলম্ব থেকে দূরে বাঁকে","Bends away from the normal");
    $("snellCheck").textContent=tir?t("n₁ sin i > n₂; TIR","n₁ sin i > n₂; TIR"):`n₁sin i = ${(n1*Math.sin(i*Math.PI/180)).toFixed(3)}; n₂sin r = ${(n2*Math.sin((r||0)*Math.PI/180)).toFixed(3)}`;
    const critical=n1>n2?Math.asin(n2/n1)*180/Math.PI:null;
    $("criticalAngle").textContent=critical===null?"—":`${critical.toFixed(2)}°`;
    $("tirStatus").textContent=critical===null?t("এই দিকের যাত্রায় critical angle নেই","No critical angle for this direction"):tir?t("পূর্ণ অভ্যন্তরীণ প্রতিফলন হয়েছে","Total internal reflection occurs"):t("পূর্ণ অভ্যন্তরীণ প্রতিফলন হয়নি","No total internal reflection");
  }

  function drawRefraction() {
    if(state.tab!=="refraction") return;
    const {w,h,ctx:c}=resizeCanvas(refrCanvas); c.clearRect(0,0,w,h);
    c.fillStyle="#eaf4ff";c.fillRect(0,0,w,h/2);
    c.fillStyle="#eaf8f2";c.fillRect(0,h/2,w,h/2);
    const n1=Number($("medium1").value),n2=Number($("medium2").value),i=Number($("incidenceAngle").value);
    const cy=h/2,cx=w*.5, rad=i*Math.PI/180;
    drawLine(c,0,cy,w,cy,"#64748b",2);
    drawLine(c,cx,18,cx,h-18,"#94a3b8",1.4,[6,5]);
    label(c,`Medium 1 · n = ${n1.toFixed(2)}`,16,24,"#436181","12px system-ui");
    label(c,`Medium 2 · n = ${n2.toFixed(2)}`,16,h-15,"#267657","12px system-ui");
    label(c,"Normal",cx+7,cy-13,"#64748b","11px system-ui");
    const len=Math.min(w*.34,h*.37);
    const ix=cx-len*Math.sin(rad), iy=cy-len*Math.cos(rad);
    drawArrow(c,ix,iy,cx,cy,"#d97706");
    const sinr=n1/n2*Math.sin(rad);
    if(sinr<=1){
      const rr=Math.asin(Math.max(-1,Math.min(1,sinr)));
      drawArrow(c,cx,cy,cx+len*Math.sin(rr),cy+len*Math.cos(rr),"#2563eb");
      label(c,`i = ${i}°`,Math.max(10,ix+8),Math.max(18,iy+20),"#b45309","bold 12px system-ui");
      label(c,`r = ${(rr*180/Math.PI).toFixed(1)}°`,cx+len*Math.sin(rr)+8,cy+len*Math.cos(rr)-4,"#1d4ed8","bold 12px system-ui");
    }else{
      drawArrow(c,cx,cy,cx-len*Math.sin(rad),cy-len*Math.cos(rad),"#2563eb");
      label(c,"Total internal reflection",cx+10,cy+28,"#1d4ed8","bold 12px system-ui");
    }
    // Angle arcs
    c.save();c.strokeStyle="#d97706";c.lineWidth=1.5;c.beginPath();c.arc(cx,cy,28,-Math.PI/2-rad,-Math.PI/2);c.stroke();c.restore();
  }

  [mirrorType,focal,objectDistance,objectHeight,showAxis,showPoints,showRays].forEach(el => el.addEventListener("input", () => { updateMirror(); drawMirror(); }));
  ["medium1","medium2","incidenceAngle"].forEach(id => $(id).addEventListener("input", () => { updateRefraction(); drawRefraction(); }));
  document.querySelectorAll(".nav-item").forEach(b => b.addEventListener("click", () => setTab(b.dataset.tab)));
  $("languageBtn").addEventListener("click", () => {state.language=state.language==="bn"?"en":"bn";setLanguage();});
  $("resetBtn").addEventListener("click", () => {
    mirrorType.value="concave";focal.value=100;objectDistance.value=200;objectHeight.value=40;
    showAxis.checked=true;showPoints.checked=true;showRays.checked=true;
    $("medium1").value="1";$("medium2").value="1.5";$("incidenceAngle").value=30;
    updateMirror();updateRefraction();drawMirror();drawRefraction();
  });
  document.querySelectorAll(".quiz-option").forEach(b=>b.addEventListener("click",()=>{
    const good=b.dataset.correct==="true", feedback=$("quizFeedback");
    feedback.textContent=good?t("সঠিক! C-তে বস্তু রাখলে প্রতিবিম্বও C-তে হয়—বাস্তব, উল্টো ও সমান আকারের।","Correct! At C, the image is also at C—real, inverted and the same size."):t("আবার চেষ্টা করো। অবতল দর্পণে C-তে বস্তু রাখলে প্রতিবিম্ব C-তেই হয়।","Try again. For a concave mirror, an object at C forms an image at C.");
    feedback.className=`quiz-feedback ${good?"correct":"wrong"}`;
  }));

  canvas.addEventListener("pointerdown", (event) => {
    if (state.tab !== "mirror" || !lastMirrorGeometry) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const g = lastMirrorGeometry;
    // Let users grab the object arrow or its nearby area, not only a one-pixel line.
    if (Math.abs(x - g.objectX) < 24 && y > g.objectY - 18 && y < g.midY + 18) {
      draggingObject = true;
      canvas.classList.add("dragging");
      canvas.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    }
  });
  canvas.addEventListener("pointermove", (event) => {
    if (draggingObject) updateObjectDistanceFromPointer(event);
  });
  function stopDragging() {
    draggingObject = false;
    canvas.classList.remove("dragging");
  }
  canvas.addEventListener("pointerup", stopDragging);
  canvas.addEventListener("pointercancel", stopDragging);
  canvas.addEventListener("lostpointercapture", stopDragging);

  if("ResizeObserver" in window) {
    const ro=new ResizeObserver(()=>{drawMirror();drawRefraction();});
    ro.observe(canvas);ro.observe(refrCanvas);
  } else window.addEventListener("resize",()=>{drawMirror();drawRefraction();});
  setLanguage();
  setTab("mirror");
  updateMirror();updateRefraction();drawMirror();
})();
