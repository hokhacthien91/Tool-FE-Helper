(()=>{var On=Object.defineProperty,Vn=Object.defineProperties;var Gn=Object.getOwnPropertyDescriptors;var Xo=Object.getOwnPropertySymbols;var _n=Object.prototype.hasOwnProperty,Jn=Object.prototype.propertyIsEnumerable;var Zo=(h,w,f)=>w in h?On(h,w,{enumerable:!0,configurable:!0,writable:!0,value:f}):h[w]=f,Ye=(h,w)=>{for(var f in w||(w={}))_n.call(w,f)&&Zo(h,f,w[f]);if(Xo)for(var f of Xo(w))Jn.call(w,f)&&Zo(h,f,w[f]);return h},Ze=(h,w)=>Vn(h,Gn(w));function Ko(){function h(w){try{let f=w.target&&w.target.closest?w.target.closest("button"):null;if(!f)return;let x=f.closest?f.closest(".issue"):null;if(!x||!(f.closest&&f.closest(".issue-actions")))return;let C=f.getAttribute("data-id")||x.getAttribute("data-issue-id");if(!C)return;parent.postMessage({pluginMessage:{type:"select-node",id:C}},"*")}catch(f){console.error("autoSelectNodeFromIssueClick error:",f)}}document.addEventListener("click",h,!0)}function ye(h,w,f){if(!w)return;let x=document.querySelector(`.issue[data-issue-id="${h}"]`);if(!x){let V=document.querySelector(`button.btn-fix[data-id="${h}"]`);V&&(x=V.closest(".issue"))}if(!x)return;let I=x.querySelector(".fix-message");I&&I.remove();let C=document.createElement("div");C.className="fix-message",C.style.cssText=`
      margin-top: 8px;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      background: ${f?"#d4edda":"#f8d7da"};
      color: ${f?"#155724":"#721c24"};
      border: 1px solid ${f?"#c3e6cb":"#f5c6cb"};
      animation: slideIn 0.3s ease-out;
    `,C.textContent=w;let P=x.querySelector(".issue-header");P?P.parentNode.insertBefore(C,P.nextSibling):x.appendChild(C),setTimeout(()=>{C.style.animation="slideOut 0.3s ease-out",setTimeout(()=>{C.parentNode&&C.remove()},300)},5e3)}function u(h){return h==null?"":String(h).replace(/[&<>"']/g,function(f){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[f]})}function _t(h){console.log("[showErrorModal] Called with message:",h);let w=document.getElementById("error-modal-overlay");w&&(console.log("[showErrorModal] Removing existing modal"),w.remove());let f=document.createElement("div");f.className="modal-overlay",f.id="error-modal-overlay",console.log("[showErrorModal] Created overlay element");let x=document.createElement("div");x.className="modal-dialog",x.style.maxWidth="450px";let I=String(h||"").replace(/^[❌⚠️✅]\s*/,"").trim();x.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title" style="color: #dc3545;">\u26A0\uFE0F Error</h2>
      </div>
      <div class="modal-body">
        <div style="padding: 16px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; margin-bottom: 16px;">
          <div style="font-size: 14px; color: #721c24; line-height: 1.6;">
            ${u(I)}
          </div>
        </div>
        <div style="font-size: 12px; color: #666; line-height: 1.5;">
          Please check the issue and try again. If the problem persists, you may need to switch to Design Mode or edit the main component directly.
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-primary" id="error-modal-ok-btn" style="background: #dc3545; border-color: #dc3545; color: white;">OK</button>
      </div>
    `,f.appendChild(x),document.body.appendChild(f),console.log("[showErrorModal] Appended overlay to body, overlay visible:",f.offsetParent!==null),f.style.display="flex",f.style.visibility="visible",f.style.opacity="1";let C=x.querySelector("#error-modal-ok-btn"),P=x.querySelector(".modal-close");if(console.log("[showErrorModal] Found buttons:",{okBtn:!!C,closeBtn:!!P}),!C){console.error("[showErrorModal] OK button not found!");return}let V=()=>{f.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{f.parentNode&&f.remove()},200)};C.onclick=V,P&&(P.onclick=V),f.onclick=D=>{D.target===f&&V()},setTimeout(()=>{C.focus()},100),console.log("[showErrorModal] Modal setup complete")}function st(h){if(!h)return 0;let w=String(h).replace("#","");if(w.length<6)return 0;let f=parseInt(w.substring(0,2),16),x=parseInt(w.substring(2,4),16),I=parseInt(w.substring(4,6),16);return isNaN(f)||isNaN(x)||isNaN(I)?0:(f*299+x*587+I*114)/1e3}function Ft(h,w){let f=String(h||"").replace("#",""),x=String(w||"").replace("#","");if(f.length<6||x.length<6)return 1/0;let I=parseInt(f.substring(0,2),16),C=parseInt(f.substring(2,4),16),P=parseInt(f.substring(4,6),16),V=parseInt(x.substring(0,2),16),D=parseInt(x.substring(2,4),16),B=parseInt(x.substring(4,6),16);if([I,C,P,V,D,B].some(O=>isNaN(O)))return 1/0;let R=V-I,U=D-C,T=B-P;return Math.sqrt(R*R+U*U+T*T)}function Qo(h){let w=String(h||"").replace("#","");if(w.length<6)return 0;let f=parseInt(w.substring(0,2),16)/255,x=parseInt(w.substring(2,4),16)/255,I=parseInt(w.substring(4,6),16)/255;if(isNaN(f)||isNaN(x)||isNaN(I))return 0;let C=f<=.03928?f/12.92:Math.pow((f+.055)/1.055,2.4),P=x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4),V=I<=.03928?I/12.92:Math.pow((I+.055)/1.055,2.4);return .2126*C+.7152*P+.0722*V}function Tt(h,w){let f=Qo(h),x=Qo(w),I=Math.max(f,x),C=Math.min(f,x);return(I+.05)/(C+.05)}function ft(h){if(!h||!h.message)return null;let f=(h.message||"").match(/Color (#[0-9A-Fa-f]{6})/),x=f?f[1].toUpperCase():null;if(!x)return null;let I=document.getElementById("color-scale");if(!I||!I.value.trim())return null;let C=I.value.split(",").map(D=>D.trim().toUpperCase()).filter(D=>D&&D.startsWith("#"));if(C.length===0)return null;let P=null,V=1/0;return C.forEach(D=>{let B=Ft(x,D);B<V&&(V=B,P=D)}),V>100?null:P}function yt(h){if(!h||!h.message)return null;let f=(h.message||"").match(/\((\d+)px\)/);if(!f)return null;let x=parseInt(f[1],10);if(isNaN(x))return null;let I=document.getElementById("spacing-scale");if(!I||!I.value.trim())return null;let C=I.value.split(",").map(B=>parseInt(B.trim(),10)).filter(B=>!isNaN(B)&&B>=0).sort((B,R)=>B-R);if(C.length===0)return null;let P=null,V=1/0;C.forEach(B=>{let R=Math.abs(B-x);R<V&&(V=R,P=B)});let D=Math.max(x*.2,10);return V>D?null:P}function Yn(h,w){if(!h||h.length===0){alert("No typography styles available. Please add styles in Typography Settings.");return}let f=document.createElement("div");f.className="modal-overlay",f.style.zIndex="10001";let x=document.createElement("div");x.className="modal-dialog",x.style.maxWidth="300px",x.style.padding="0",x.innerHTML=`
      <div class="modal-header" style="padding: 16px;">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title" style="font-size: 14px;">Choose Typography Style</h2>
      </div>
      <div style="max-height: 300px; overflow-y: auto;">
        ${h.map(C=>{let P=u(C.name||""),V=u(C.fontFamily||""),D=u(C.fontSize||""),B=u(C.fontWeight||"");return`
          <div class="style-dropdown-item" data-style-id="${C.id}" style="padding: 12px 16px; cursor: pointer; font-size: 13px; border-bottom: 1px solid #f0f0f0;" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='white'">
            <div style="font-weight: 600; color: #333;">${P}</div>
            <div style="font-size: 11px; color: #666; margin-top: 4px;">
              ${V} ${D}px ${B}
            </div>
          </div>
        `}).join("")}
      </div>
    `,f.appendChild(x),document.body.appendChild(f);let I=()=>{f.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{f.parentNode&&f.remove()},200)};x.querySelector(".modal-close").onclick=I,f.onclick=C=>{C.target===f&&I()},x.querySelectorAll(".style-dropdown-item").forEach(C=>{C.onclick=P=>{P.preventDefault(),P.stopPropagation();let V=parseInt(C.getAttribute("data-style-id"),10),D=h.find(B=>B.id===V);D&&w&&(w(D),I())}})}function en(h,w){if(!h||!h.bestMatch){console.error("showTypographyFixModal: missing issue or bestMatch");return}let f=h.nodeProps||{},x=h.bestMatch,I=f.fontFamily||"",C=f.fontSize!==null&&f.fontSize!==void 0?f.fontSize:"",P=f.fontWeight||"",V=f.lineHeight||"",D=f.letterSpacing!==null&&f.letterSpacing!==void 0?f.letterSpacing:"",B=I,R=C,U=P,T=V,O=D;x.differences&&x.differences.forEach(J=>{J.property==="Font Family"&&J.expected?B=J.expected:J.property==="Font Size"&&J.expected?R=J.expected.replace("px",""):J.property==="Font Weight"&&J.expected?U=J.expected:J.property==="Line Height"&&J.expected?T=J.expected:J.property==="Letter Spacing"&&J.expected&&(O=J.expected)});let ce=document.createElement("div");ce.className="modal-overlay",ce.id="typography-fix-modal-overlay";let K=document.createElement("div");K.className="modal-dialog",K.style.maxWidth="500px",K.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Fix Typography Style</h2>
        <p class="modal-subtitle">Node: ${u(h.nodeName||"Unnamed")} \u2192 Suggested: ${u(x.name)}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">
            Edit values below and click Apply to fix:
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Font Family</label>
            <input type="text" class="modal-input" id="fix-font-family" value="${u(B)}" style="width: 100%;" />
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Font Size (px)</label>
            <input type="number" class="modal-input" id="fix-font-size" value="${u(R)}" style="width: 100%;" />
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Font Weight</label>
            <select class="modal-input" id="fix-font-weight" style="width: 100%;">
              <option value="Regular" ${U==="Regular"?"selected":""}>Regular</option>
              <option value="Medium" ${U==="Medium"?"selected":""}>Medium</option>
              <option value="SemiBold" ${U==="SemiBold"||U==="Semi Bold"?"selected":""}>SemiBold</option>
              <option value="Bold" ${U==="Bold"?"selected":""}>Bold</option>
            </select>
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Line Height (% or px or auto)</label>
            <input type="text" class="modal-input" id="fix-line-height" value="${u(T)}" style="width: 100%;" placeholder="e.g. 120%, 24px, auto" />
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Letter Spacing (px or %)</label>
            <input type="text" class="modal-input" id="fix-letter-spacing" value="${u(O)}" style="width: 100%;" placeholder="e.g. 0, 0.5px, 1%" />
          </div>

          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #eee;">
            <button class="modal-btn modal-btn-cancel" id="choose-typo-style-btn" style="width: 100%; margin-bottom: 8px; background: #0071e3; border-color: #0071e3; color: white;">
              Choose Typography Style
            </button>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="typography-fix-modal-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="typography-fix-modal-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `,ce.appendChild(K),document.body.appendChild(ce);let ie=K.querySelector("#fix-font-family"),oe=K.querySelector("#fix-font-size"),de=K.querySelector("#fix-font-weight"),te=K.querySelector("#fix-line-height"),le=K.querySelector("#fix-letter-spacing"),A=K.querySelector("#choose-typo-style-btn"),pe=K.querySelector("#typography-fix-modal-cancel-btn"),_=K.querySelector("#typography-fix-modal-apply-btn"),ue=K.querySelector(".modal-close");setTimeout(()=>{ie.focus()},100);let S=()=>{ce.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{ce.parentNode&&ce.remove()},200)};pe.onclick=S,ue.onclick=S,ce.onclick=J=>{J.target===ce&&S()},A.onclick=()=>{Yn(w,J=>{J&&(ie.value=J.fontFamily||"",oe.value=J.fontSize||"",de.value=J.fontWeight||"Regular",te.value=J.lineHeight||"",le.value=J.letterSpacing||"0")})},_.onclick=()=>{let J={fontFamily:ie.value.trim(),fontSize:oe.value.trim(),fontWeight:de.value,lineHeight:te.value.trim(),letterSpacing:le.value.trim()};if(!J.fontFamily){ie.focus(),ie.style.borderColor="#ff3b30",setTimeout(()=>{ie.style.borderColor="#0071e3"},2e3);return}if(!J.fontSize||isNaN(parseFloat(J.fontSize))){oe.focus(),oe.style.borderColor="#ff3b30",setTimeout(()=>{oe.style.borderColor="#0071e3"},2e3);return}S(),ye(h.id,"\u23F3 Fixing...",!0),parent.postMessage({pluginMessage:{type:"fix-issue",issue:h,fixData:J}},"*")}}function Xn(h,w){if(h===w)return 100;let f=100,x=Math.abs(h-w);return Math.max(0,Math.round((1-x/f)*100))}function tn(h,w,f,x){let I=document.createElement("div");I.className="modal-overlay",I.id="spacing-picker-modal-overlay";let C=document.createElement("div");C.className="modal-dialog",C.style.maxWidth="400px";let P=x.map(T=>`
        <div class="spacing-picker-item" data-value="${T}" style="
          padding: 12px;
          margin-bottom: 8px;
          border: 2px solid ${f===T?"#0071e3":"#ddd"};
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: white;
          transition: all 0.2s;
        " onmouseover="this.style.borderColor='#0071e3'; this.style.boxShadow='0 2px 8px rgba(0,113,227,0.2)'" onmouseout="this.style.borderColor='${f===T?"#0071e3":"#ddd"}'; this.style.boxShadow='none'">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="
              width: 40px;
              height: 40px;
              border-radius: 4px;
              background: #f0f0f0;
              border: 1px solid #ddd;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              font-weight: 600;
              color: #666;
            ">${T}px</div>
            <div style="font-weight: 600; font-size: 14px; color: #333;">
              ${T}px
            </div>
          </div>
          ${f===T?'<div style="color: #0071e3; font-weight: 600;">Current</div>':""}
        </div>
      `).join(""),V=String(w||"").replace(/([A-Z])/g," $1").replace(/^./,T=>T.toUpperCase()).trim();C.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Choose Spacing Value</h2>
        <p class="modal-subtitle">Node: ${u(h.nodeName||"Unnamed")} - ${u(V)}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current Value:</div>
          <div style="font-size: 16px; font-weight: 600; color: #333;">${f}px</div>
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
          ${P}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="spacing-picker-modal-cancel-btn">Cancel</button>
      </div>
    `,I.appendChild(C),document.body.appendChild(I);let D=C.querySelector("#spacing-picker-modal-cancel-btn"),B=C.querySelector(".modal-close"),R=C.querySelectorAll(".spacing-picker-item"),U=()=>{I.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{I.parentNode&&I.remove()},200)};D.onclick=U,B.onclick=U,I.onclick=T=>{T.target===I&&U()},R.forEach(T=>{T.onclick=O=>{O.preventDefault(),O.stopPropagation();let ce=parseInt(T.getAttribute("data-value"),10);U(),Nt(h,w,f,ce)}})}function Nt(h,w,f,x,I=[],C={}){let{onApply:P,onIgnore:V,onCancel:D,showIgnore:B=!1,progress:R}=C,U=String(w||"").replace(/([A-Z])/g," $1").replace(/^./,Y=>Y.toUpperCase()).trim(),O=(I.length>0?I:[0,4,8,12,16,24,32,40,48,64,72,80,88,96]).map(Y=>({value:Y,similarity:Xn(f,Y),diff:Math.abs(f-Y)})).sort((Y,me)=>x!==void 0&&Y.value===x?-1:x!==void 0&&me.value===x?1:Y.diff-me.diff).slice(0,5);if(O.length===0){alert("No spacing values available");return}let ce=O[0].value,K=(Y,me)=>{let ve=Y.value!==f;return`
      <div class="spacing-option-item" data-value="${Y.value}" style="
        padding: 10px 12px;
        margin-bottom: 6px;
        border: 2px solid ${me?"#0071e3":"#e0e0e0"};
        border-radius: 8px;
        cursor: pointer;
        background: ${me?"#e3f2fd":"white"};
        display: flex;
        align-items: center;
        gap: 12px;
        transition: all 0.15s;
      ">
        <input type="radio" name="spacing-option" ${me?"checked":""} style="margin: 0; cursor: pointer;" />
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 6px;
          background: ${me?"#e3f2fd":"#f0f0f0"};
          border: 2px solid ${me?"#0071e3":"#ddd"};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          color: ${me?"#0071e3":"#666"};
          flex-shrink: 0;
        ">${Y.value}</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 13px; color: #333;">${Y.value}px</div>
          <div style="font-size: 10px; color: ${ve?"#721c24":"#155724"};">
            ${ve?`\u26A0 \u0394${Y.value>f?"+":""}${Y.value-f}px`:"\u2713 Same"}
          </div>
        </div>
        <span style="font-size: 11px; color: #666; background: #f0f0f0; padding: 2px 8px; border-radius: 10px;">${Y.similarity}%</span>
      </div>
    `},ie=document.createElement("div");ie.className="modal-overlay",ie.id="spacing-fix-confirm-modal-overlay";let oe=document.createElement("div");oe.className="modal-dialog",oe.style.maxWidth="420px";let de=R?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${R.current}/${R.total}</div>`:"",te=O.map((Y,me)=>K(Y,me===0)).join("");oe.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Apply Suggested Spacing</h2>
        <p class="modal-subtitle">Node: ${u(h.nodeName||"Unnamed")} - ${u(U)}</p>
      </div>
      ${de}
      <div class="modal-body">
        <div style="margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 6px; display: flex; align-items: center; gap: 10px;">
          <div style="
            width: 40px;
            height: 40px;
            border-radius: 4px;
            background: #f0f0f0;
            border: 1px solid #ddd;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 600;
            color: #666;
          ">${f}</div>
          <div>
            <div style="font-size: 11px; color: #666;">Current ${u(U)}:</div>
            <div style="font-size: 14px; font-weight: 600;">${f}px</div>
          </div>
        </div>
        <div style="font-size: 12px; font-weight: 600; color: #333; margin-bottom: 8px;">
          Select a value to apply (Top 5 closest):
        </div>
        <div id="spacing-options-container" style="max-height: 280px; overflow-y: auto;">
          ${te}
        </div>
      </div>
      <div class="modal-footer">
        ${B?'<button class="modal-btn modal-btn-cancel" id="spacing-fix-ignore-btn" style="background: #6c757d; border-color: #6c757d; color: white;">Ignore</button>':""}
        <button class="modal-btn modal-btn-cancel" id="spacing-fix-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="spacing-fix-confirm-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `,ie.appendChild(oe),document.body.appendChild(ie);let le=oe.querySelector("#spacing-fix-confirm-cancel-btn"),A=oe.querySelector("#spacing-fix-confirm-apply-btn"),pe=oe.querySelector("#spacing-fix-ignore-btn"),_=oe.querySelector(".modal-close"),ue=oe.querySelector("#spacing-options-container"),S=Y=>{ce=Y,ue.querySelectorAll(".spacing-option-item").forEach(ve=>{let Q=parseInt(ve.getAttribute("data-value"),10)===Y;ve.style.border=Q?"2px solid #0071e3":"2px solid #e0e0e0",ve.style.background=Q?"#e3f2fd":"white";let Ke=ve.querySelector('input[type="radio"]');Ke&&(Ke.checked=Q)})};(()=>{ue.querySelectorAll(".spacing-option-item").forEach(me=>{me.onclick=ve=>{ve.preventDefault();let Oe=parseInt(me.getAttribute("data-value"),10);S(Oe)}})})();let se=()=>{ie.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{ie.parentNode&&ie.remove()},200)};le.onclick=()=>{se(),D&&typeof D=="function"&&D()},_.onclick=()=>{se(),D&&typeof D=="function"&&D()},ie.onclick=Y=>{Y.target===ie&&(se(),D&&typeof D=="function"&&D())},A.onclick=()=>{se(),ye(h.id,"\u23F3 Fixing spacing...",!0),parent.postMessage({pluginMessage:{type:"fix-spacing-issue",issue:h,propertyName:w,value:ce}},"*"),P&&typeof P=="function"&&P()},pe&&(pe.onclick=()=>{se(),V&&typeof V=="function"&&V()})}function ht(h){try{let w=parseInt(h.slice(1,3),16),f=parseInt(h.slice(3,5),16),x=parseInt(h.slice(5,7),16);return(w*299+f*587+x*114)/1e3>128?"#000000":"#ffffff"}catch(w){return"#000000"}}function Zn(h,w){let f=h.replace("#",""),x=w.replace("#",""),I=parseInt(f.substr(0,2),16),C=parseInt(f.substr(2,2),16),P=parseInt(f.substr(4,2),16),V=parseInt(x.substr(0,2),16),D=parseInt(x.substr(2,2),16),B=parseInt(x.substr(4,2),16);return Math.sqrt(Math.pow(I-V,2)+Math.pow(C-D,2)+Math.pow(P-B,2))}function Kn(h,w){let x=Zn(h,w);return Math.round((1-x/441.67)*100)}function Jt(h,w,f,x="",I=""){return ht(h),`
      <div class="color-picker-item" data-color="${u(h)}" style="
        padding: 12px;
        margin-bottom: 8px;
        border: 2px solid ${f};
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
        background: white;
        transition: all 0.2s;
      " onmouseover="this.style.borderColor='#0071e3'; this.style.boxShadow='0 2px 8px rgba(0,113,227,0.2)'" onmouseout="this.style.borderColor='${f}'; this.style.boxShadow='none'">
        <div style="
          width: 48px;
          height: 48px;
          border-radius: 6px;
          background: ${u(h)};
          border: 2px solid #ddd;
          flex-shrink: 0;
        "></div>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 14px; color: #333; margin-bottom: 4px;">
            ${w||u(h)}
          </div>
          <div style="font-size: 12px; color: #666; font-family: 'SF Mono', Monaco, monospace;">
            ${u(h)}
          </div>
          ${x?`<div style="font-size: 11px; color: #666; margin-top: 4px;">${x}</div>`:""}
        </div>
        ${I?`<div style="color: #0071e3; font-weight: 600; margin-left: auto;">${I}</div>`:""}
      </div>
    `}function on(h,w,f,x={}){if(!w){let T=(h.message||"").match(/Color (#[0-9A-Fa-f]{6})/);w=T?T[1].toUpperCase():null}if(!w){alert("Cannot determine current color from issue message");return}let I=document.createElement("div");I.className="modal-overlay",I.id="color-picker-modal-overlay";let C=document.createElement("div");C.className="modal-dialog",C.style.maxWidth="400px";let P=f.map(U=>{let T=x[U]||"";return Jt(U,T||U,w===U?"#0071e3":"#ddd","",w===U?"Current":"")}).join("");C.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Choose Color</h2>
        <p class="modal-subtitle">Node: ${u(h.nodeName||"Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current Color:</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 32px; height: 32px; border-radius: 4px; background: ${u(w)}; border: 1px solid #ddd;"></div>
            <div style="font-family: 'SF Mono', Monaco, monospace; font-size: 13px; font-weight: 600;">${u(w)}</div>
          </div>
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
          ${P}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="color-picker-modal-cancel-btn">Cancel</button>
      </div>
    `,I.appendChild(C),document.body.appendChild(I);let V=C.querySelector("#color-picker-modal-cancel-btn"),D=C.querySelector(".modal-close"),B=C.querySelectorAll(".color-picker-item"),R=()=>{I.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{I.parentNode&&I.remove()},200)};V.onclick=R,D.onclick=R,I.onclick=U=>{U.target===I&&R()},B.forEach(U=>{U.onclick=T=>{T.preventDefault(),T.stopPropagation();let O=U.getAttribute("data-color");R(),Bt(h,w,O,x)}})}function Bt(h,w,f,x={},I=[],C={}){let{onApply:P,onIgnore:V,onCancel:D,showIgnore:B=!1,progress:R}=C,U=I.length>0?I:Object.keys(x);U.length===0&&f&&(U=[f]);let T=U.map(se=>({color:se,name:x[se]||se,similarity:Kn(w,se)})).sort((se,Y)=>f&&se.color===f?-1:f&&Y.color===f?1:Y.similarity-se.similarity).slice(0,5);if(T.length===0){alert("No colors available");return}let O=T[0].color,ce=(se,Y)=>`
      <div class="color-option-item" data-color="${u(se.color)}" style="
        padding: 10px 12px;
        margin-bottom: 6px;
        border: 2px solid ${Y?"#0071e3":"#e0e0e0"};
        border-radius: 8px;
        cursor: pointer;
        background: ${Y?"#e3f2fd":"white"};
        display: flex;
        align-items: center;
        gap: 12px;
        transition: all 0.15s;
      ">
        <input type="radio" name="color-option" ${Y?"checked":""} style="margin: 0; cursor: pointer;" />
        <div style="
          width: 36px;
          height: 36px;
          border-radius: 6px;
          background: ${u(se.color)};
          border: 2px solid ${Y?"#0071e3":"#ddd"};
          flex-shrink: 0;
        "></div>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 13px; color: #333;">${u(se.name)}</div>
          <div style="font-size: 11px; color: #666; font-family: 'SF Mono', Monaco, monospace;">${u(se.color)}</div>
        </div>
        <span style="font-size: 11px; color: #666; background: #f0f0f0; padding: 2px 8px; border-radius: 10px;">${se.similarity}%</span>
      </div>
    `,K=document.createElement("div");K.className="modal-overlay",K.id="color-fix-confirm-modal-overlay";let ie=document.createElement("div");ie.className="modal-dialog",ie.style.maxWidth="420px";let oe=R?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${R.current}/${R.total}</div>`:"",de=T.map((se,Y)=>ce(se,Y===0)).join("");ie.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Apply Suggested Color</h2>
        <p class="modal-subtitle">Node: ${u(h.nodeName||"Unnamed")}</p>
      </div>
      ${oe}
      <div class="modal-body">
        <div style="margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 6px; display: flex; align-items: center; gap: 10px;">
          <div style="
            width: 32px;
            height: 32px;
            border-radius: 4px;
            background: ${u(w)};
            border: 1px solid #ddd;
          "></div>
          <div>
            <div style="font-size: 11px; color: #666;">Current:</div>
            <div style="font-size: 12px; font-weight: 600; font-family: 'SF Mono', Monaco, monospace;">${u(w)}</div>
          </div>
        </div>
        <div style="font-size: 12px; font-weight: 600; color: #333; margin-bottom: 8px;">
          Select a color to apply (Top 5 matches):
        </div>
        <div id="color-options-container" style="max-height: 280px; overflow-y: auto;">
          ${de}
        </div>
      </div>
      <div class="modal-footer">
        ${B?'<button class="modal-btn modal-btn-cancel" id="color-fix-ignore-btn" style="background: #6c757d; border-color: #6c757d; color: white;">Ignore</button>':""}
        <button class="modal-btn modal-btn-cancel" id="color-fix-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="color-fix-confirm-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `,K.appendChild(ie),document.body.appendChild(K);let te=ie.querySelector("#color-fix-confirm-cancel-btn"),le=ie.querySelector("#color-fix-confirm-apply-btn"),A=ie.querySelector("#color-fix-ignore-btn"),pe=ie.querySelector(".modal-close"),_=ie.querySelector("#color-options-container"),ue=se=>{O=se,_.querySelectorAll(".color-option-item").forEach(me=>{let Oe=me.getAttribute("data-color")===se;me.style.border=Oe?"2px solid #0071e3":"2px solid #e0e0e0",me.style.background=Oe?"#e3f2fd":"white";let Q=me.querySelector('input[type="radio"]');Q&&(Q.checked=Oe)})};(()=>{_.querySelectorAll(".color-option-item").forEach(Y=>{Y.onclick=me=>{me.preventDefault();let ve=Y.getAttribute("data-color");ue(ve)}})})();let J=()=>{K.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{K.parentNode&&K.remove()},200)};te.onclick=()=>{J(),D&&typeof D=="function"&&D()},pe.onclick=()=>{J(),D&&typeof D=="function"&&D()},K.onclick=se=>{se.target===K&&(J(),D&&typeof D=="function"&&D())},le.onclick=()=>{J(),ye(h.id,"\u23F3 Fixing color...",!0),parent.postMessage({pluginMessage:{type:"fix-color-issue",issue:h,color:O}},"*"),P&&typeof P=="function"&&P()},A&&(A.onclick=()=>{J(),V&&typeof V=="function"&&V()})}function Yt({reportData:h,getTypeDisplayName:w}){let f=h||{},x=f.issues||[],I=f.tokens||null,C=f.timestamp||Date.now(),P=new Date(C).toLocaleString("vi-VN"),V="Design Review",D=R=>{try{return typeof w=="function"?w(R):String(R||"")}catch(U){return String(R||"")}},B=`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Design Review Report - ${P}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
      color: #1d1d1f;
      background: #f5f5f7;
      padding: 40px 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      padding: 40px;
    }
    .header {
      border-bottom: 2px solid #e5e5e7;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 28px;
      color: #1d1d1f;
      margin-bottom: 8px;
    }
    .header .meta {
      color: #86868b;
      font-size: 14px;
    }
    .section {
      margin-bottom: 40px;
    }
    .section-title {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #1d1d1f;
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e5e7;
    }
    .export-filter-group {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }
    .export-filter-btn {
      padding: 4px 10px;
      font-size: 12px;
      border-radius: 999px;
      border: 1px solid #e5e7eb;
      background: #f9fafb;
      cursor: pointer;
    }
    .export-filter-btn.active {
      background: #111827;
      color: #fff;
      border-color: #111827;
    }
    .stats {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .stat-card {
      padding: 16px 20px;
      border-radius: 8px;
      background: #f5f5f7;
      min-width: 120px;
    }
    .stat-card.error { background: #fee; color: #c33; }
    .stat-card.warn { background: #fff4e6; color: #d97706; }
    .stat-card .value {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .stat-card .label {
      font-size: 12px;
      text-transform: uppercase;
      opacity: 0.8;
    }
    .issue-group {
      margin-bottom: 24px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 16px;
      background: #fff;
    }
    .issue-group-header {
      font-size: 16px;
      font-weight: 600;
      color: #1d1d1f;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
    }
    .issue-group-toggle {
      border: none;
      background: #f3f4f6;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .issue-group-content {
      margin-top: 12px;
    }
    .issue-group.collapsed .issue-group-content {
      display: none;
    }
    .issue {
      padding: 12px 16px;
      margin-bottom: 8px;
      border-radius: 6px;
      border-left: 4px solid;
    }
    .issue.error {
      background: #fef2f2;
      border-left-color: #ef4444;
    }
    .issue.warn {
      background: #fffbeb;
      border-left-color: #f59e0b;
    }
    .issue-type {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .issue-message {
      font-size: 14px;
      margin-bottom: 4px;
    }
    .issue-node {
      font-size: 12px;
      color: #86868b;
      font-family: monospace;
      margin-top: 4px;
    }
    .token-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 12px;
    }
    .token-item {
      padding: 12px;
      background: #fafafa;
      border-radius: 6px;
      border: 1px solid #e5e5e7;
    }
    .token-value {
      font-family: monospace;
      font-size: 13px;
      margin-bottom: 4px;
    }
    .token-color-preview {
      display: inline-block;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      border: 1px solid #d1d1d6;
      vertical-align: middle;
      margin-right: 8px;
    }
    .token-color-type {
      display: inline-block;
      font-size: 10px;
      padding: 2px 6px;
      background: #667eea;
      color: white;
      border-radius: 4px;
      margin-left: 6px;
    }
    .token-node-count {
      font-size: 11px;
      color: #86868b;
      margin-top: 4px;
    }
    .token-empty-message {
      padding: 12px;
      font-size: 12px;
      color: #9ca3af;
      font-style: italic;
    }
    @media print {
      body { padding: 20px; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>\u{1F3A8} Design Review Report</h1>
      <div class="meta">Generated: ${P} | Page: ${V}</div>
    </div>`;if(x&&x.length>0){let R={error:x.filter(T=>T.severity==="error").length,warn:x.filter(T=>T.severity==="warn").length,total:x.length},U=x.reduce((T,O)=>(T[O.type]=T[O.type]||[],T[O.type].push(O),T),{});B+=`
    <div class="section">
      <h2 class="section-title">\u{1F4CA} Summary</h2>
      <div class="stats">
        ${R.error>0?`<div class="stat-card error"><div class="value">${R.error}</div><div class="label">Errors</div></div>`:""}
        ${R.warn>0?`<div class="stat-card warn"><div class="value">${R.warn}</div><div class="label">Warnings</div></div>`:""}
        <div class="stat-card"><div class="value">${R.total}</div><div class="label">Total Issues</div></div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">\u{1F50D} Issues</h2>
      <div class="export-filter-group">
        <button class="export-filter-btn active" data-severity="all">All</button>
        <button class="export-filter-btn" data-severity="error">Errors</button>
        <button class="export-filter-btn" data-severity="warn">Warnings</button>
      </div>`;for(let[T,O]of Object.entries(U)){let ce=u(D(T));B+=`
      <div class="issue-group collapsed" data-type="${T}" data-label="${ce}">
        <div class="issue-group-header">
          <button class="issue-group-toggle" type="button">+</button>
          <span>${ce} (${O.length})</span>
        </div>
        <div class="issue-group-content">`,O.forEach(K=>{B+=`
          <div class="issue ${K.severity}">
            <div class="issue-type">${String(K.severity||"").toUpperCase()}</div>
            <div class="issue-message">${u(K.message)}</div>
            ${K.nodeName?`<div class="issue-node">Node: ${u(K.nodeName)}</div>`:""}
          </div>`}),B+=`
        </div>
      </div>`}B+=`
    </div>`}if(I){B+=`
    <div class="section">
      <h2 class="section-title">\u{1F3A8} Design Tokens</h2>`;let R={colors:{label:"Colors",values:I.colors||[]},gradients:{label:"Gradients",values:I.gradients||[]},borderRadius:{label:"Border Radius",values:I.borderRadius||[]},fontWeight:{label:"Font Weight",values:I.fontWeight||[]},lineHeight:{label:"Line Height (%)",values:I.lineHeight||[]},fontSize:{label:"Font Size",values:I.fontSize||[]},fontFamily:{label:"Font Family",values:I.fontFamily||[]}};for(let[U,T]of Object.entries(R)){if(B+=`
      <div class="issue-group collapsed">
        <div class="issue-group-header">
          <button class="issue-group-toggle" type="button">+</button>
          <span>${T.label} (${T.values.length})</span>
        </div>
        <div class="issue-group-content">`,!T.values||T.values.length===0){B+=`
          <div class="token-empty-message">No tokens in this group.</div>`,B+=`
        </div>
      </div>`;continue}B+=`
          <div class="token-list">`,T.values.forEach(O=>{let ce=O.value,K=typeof O.totalNodes=="number"?O.totalNodes:O.nodes?O.nodes.length:0,ie=O.colorType||"";if(U==="colors")B+=`
          <div class="token-item">
            <div class="token-value">
              <span class="token-color-preview" style="background-color: ${u(ce)}"></span>
              ${u(ce)}
              ${ie?`<span class="token-color-type">${u(ie)}</span>`:""}
            </div>
            ${K>1?`<div class="token-node-count">Used in ${K} nodes</div>`:""}
          </div>`;else if(U==="gradients")B+=`
          <div class="token-item">
            <div class="token-value">
              <span class="token-color-preview" style="background: ${u(ce)}"></span>
              ${u(ce)}
              ${ie?`<span class="token-color-type">${u(ie)}</span>`:""}
            </div>
            ${K>1?`<div class="token-node-count">Used in ${K} nodes</div>`:""}
          </div>`;else{let oe="";if(U==="fontWeight"){let de=Array.isArray(O.fontFamilies)?O.fontFamilies:null;if(!de){let te={};(Array.isArray(O.nodes)?O.nodes:[]).forEach(A=>{let pe=A&&A.fontFamily?String(A.fontFamily):"Unknown";te[pe]=(te[pe]||0)+1}),de=Object.entries(te).map(([A,pe])=>({family:A,count:pe})).sort((A,pe)=>pe.count-A.count||A.family.localeCompare(pe.family))}Array.isArray(de)&&de.length>0&&(oe=`<div class="token-node-count" style="margin-top: 6px;">Font-family:<br/>${de.map(le=>`${u(le.family)} (${le.count})`).join("<br/>")}</div>`)}B+=`
          <div class="token-item">
            <div class="token-value">${u(String(ce))}</div>
            ${K>1?`<div class="token-node-count">Used in ${K} nodes</div>`:""}
            ${oe}
          </div>`}}),B+=`
          </div>
        </div>
      </div>`}B+=`
    </div>`}return B+=`
  </div>
  <script>
    (function() {
      function updateGroupState(group, content, toggleBtn) {
        const collapsed = group.classList.contains('collapsed');
        if (collapsed) {
          content.style.display = 'none';
          if (toggleBtn) toggleBtn.textContent = '+';
        } else {
          content.style.display = 'block';
          if (toggleBtn) toggleBtn.textContent = '\u2212';
        }
      }

      function initCollapsibles() {
        document.querySelectorAll('.issue-group').forEach(group => {
          const header = group.querySelector('.issue-group-header');
          const content = group.querySelector('.issue-group-content');
          const toggleBtn = group.querySelector('.issue-group-toggle');
          if (!content || !header) return;

          const toggle = () => {
            group.classList.toggle('collapsed');
            updateGroupState(group, content, toggleBtn);
          };

          if (toggleBtn) {
            toggleBtn.addEventListener('click', e => {
              e.stopPropagation();
              toggle();
            });
          }

          header.addEventListener('click', e => {
            if (toggleBtn && (e.target === toggleBtn || toggleBtn.contains(e.target))) {
              return;
            }
            toggle();
          });

          updateGroupState(group, content, toggleBtn);
        });
      }

      function applySeverityFilter(filter) {
        const buttons = document.querySelectorAll('.export-filter-btn');
        buttons.forEach(btn => {
          const val = btn.getAttribute('data-severity') || 'all';
          btn.classList.toggle('active', val === filter);
        });

        document.querySelectorAll('.issue-group').forEach(group => {
          const issues = group.querySelectorAll('.issue');
          const label = group.getAttribute('data-label') || '';
          let visibleCount = 0;

          issues.forEach(issue => {
            const isError = issue.classList.contains('error');
            const isWarn = issue.classList.contains('warn');
            let show = false;
            if (filter === 'all') show = true;
            else if (filter === 'error') show = isError;
            else if (filter === 'warn') show = isWarn;
            issue.style.display = show ? '' : 'none';
            if (show) visibleCount++;
          });

          const headerCountSpan = group.querySelector('.issue-group-header span:last-child');
          if (headerCountSpan && label) {
            headerCountSpan.textContent = label + ' (' + visibleCount + ')';
          }
        });
      }

      function initExportFilters() {
        const buttons = document.querySelectorAll('.export-filter-btn');
        if (!buttons.length) return;
        let current = 'all';

        buttons.forEach(btn => {
          btn.addEventListener('click', () => {
            const val = btn.getAttribute('data-severity') || 'all';
            current = val;
            applySeverityFilter(current);
          });
        });

        // Initial apply
        applySeverityFilter(current);
      }

      function initExportUI() {
        initCollapsibles();
        initExportFilters();
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initExportUI);
      } else {
        initExportUI();
      }
    })();
  <\/script>
</body>
</html>`,B}function Qn(){let h=new Date,w=h.getFullYear(),f=String(h.getMonth()+1).padStart(2,"0"),x=String(h.getDate()).padStart(2,"0"),I=String(h.getHours()).padStart(2,"0"),C=String(h.getMinutes()).padStart(2,"0"),P=String(h.getSeconds()).padStart(2,"0");return`design-review-report-${w}-${f}-${x}-${I}-${C}-${P}`}function el(h,w){if(!h||!Array.isArray(h.colors))return h;let f=w||{};return Ze(Ye({},h),{colors:h.colors.map(x=>Ze(Ye({},x),{name:f[String(x.value).toUpperCase()]||"No name"}))})}function nn({format:h,reportData:w,getTypeDisplayName:f,filenameBase:x,colorNameMap:I}={}){var V,D;let C=w||{};if(!C.issues&&!C.tokens){alert("No data to export!");return}let P=x||Qn();if(h==="html"){let B=Yt({reportData:C,getTypeDisplayName:f}),R=new Blob([B],{type:"text/html"}),U=URL.createObjectURL(R),T=document.createElement("a");T.href=U,T.download=`${P}.html`,T.click(),URL.revokeObjectURL(U);return}if(h==="pdf"){let B=Yt({reportData:C,getTypeDisplayName:f});try{let R=window.open("","_blank");if(!R){alert("Popup blocked. Downloading HTML - you can open the file and select Print to create PDF.");let U=new Blob([B],{type:"text/html"}),T=URL.createObjectURL(U),O=document.createElement("a");O.href=T,O.download=`${P}.html`,O.click(),URL.revokeObjectURL(T);return}R.document.open(),R.document.write(B),R.document.close(),R.onload=()=>{setTimeout(()=>{R.print()},250)},setTimeout(()=>{R.document&&R.document.readyState==="complete"&&R.print()},500)}catch(R){console.error("Error opening print window:",R),alert("Cannot open print window. Downloading HTML - you can open the file and select Print to create PDF.");let U=new Blob([B],{type:"text/html"}),T=URL.createObjectURL(U),O=document.createElement("a");O.href=T,O.download=`${P}.html`,O.click(),URL.revokeObjectURL(T)}return}if(h==="json"){console.log("Export JSON - colorNameMap:",I),console.log("Export JSON - tokens.colors:",(V=C.tokens)==null?void 0:V.colors);let B=Ze(Ye({},C),{tokens:el(C.tokens,I)});console.log("Export JSON - enriched colors:",(D=B.tokens)==null?void 0:D.colors);let R=JSON.stringify(B,null,2),U=new Blob([R],{type:"application/json"}),T=URL.createObjectURL(U),O=document.createElement("a");O.href=T,O.download=`${P}.json`,O.click(),URL.revokeObjectURL(T);return}}function ln({maxHistory:h=10,postPluginMessage:w,getCurrentReportData:f,setIsViewingTokens:x,renderResults:I,renderTokens:C}={}){let P=[],V=!1,D=te=>{try{typeof w=="function"&&w(te)}catch(le){console.error("scanHistory postPluginMessage error:",le)}};function B(te){P=(Array.isArray(te)?te:[]).slice(0,h)}function R(){P=[],V=!1}function U(){return P||[]}function T(te,le,A,pe){try{if(le==="issues"&&(!A.issues||A.issues.length===0)){console.log("Skipping save - no issues data");return}if(le==="tokens"&&(!A.tokens||Object.keys(A.tokens).length===0)){console.log("Skipping save - no tokens data");return}let _={id:Date.now().toString(),mode:te,type:le,timestamp:new Date().toISOString(),context:pe||null,data:{issues:A.issues||null,tokens:A.tokens||null,issuesCount:A.issues?A.issues.length:0,tokensCount:A.tokens?Object.keys(A.tokens).reduce((S,J)=>{var se;return S+(((se=A.tokens[J])==null?void 0:se.length)||0)},0):0}};P.unshift(_),P=P.slice(0,h);let ue=document.getElementById("history-panel");ue&&ue.style.display!=="none"&&oe(),D({type:"save-history-entry",entry:_})}catch(_){console.error("Error saving scan history:",_)}}function O(){D({type:"get-history"})}function ce(){try{let te=U();if(te.length>0){let le=te[0],A=document.querySelector(`input[name="scope"][value="${le.mode}"]`);A&&(A.checked=!0,console.log("Loaded last scan mode:",le.mode))}}catch(te){console.error("Error loading last scan mode:",te)}}function K(){V||(ce(),V=!0)}function ie(te){try{let le=new Date(te),pe=new Date-le,_=Math.floor(pe/6e4),ue=Math.floor(pe/36e5),S=Math.floor(pe/864e5);return _<1?"Just now":_<60?`${_} minutes ago`:ue<24?`${ue} hours ago`:S<7?`${S} days ago`:le.toLocaleString("en-US",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}catch(le){return te}}function oe(){let te=document.getElementById("history-list");if(!te){console.error("history-list element not found");return}let le=U();if(console.log("Rendering scan history:",le.length,"entries"),le.length===0){te.innerHTML=`
              <div class="history-empty">
                <div class="icon">\u{1F4CB}</div>
                <p>No scan history</p>
                <p style="font-size: 11px; margin-top: 8px;">Scans will be saved automatically</p>
              </div>
            `;return}te.innerHTML=le.map(A=>{var Y,me;let pe=ie(A.timestamp),_=A.mode==="page"?"Page":"Selection",ue=A.type==="issues"?"Issues":"Tokens",S=A.type==="issues"?"issues":"tokens",J=A.context&&A.context.label?A.context.label:`${_} scan`,se="";if(A.type==="issues"){let ve=((Y=A.data.issues)==null?void 0:Y.filter(Q=>Q.severity==="error").length)||0,Oe=((me=A.data.issues)==null?void 0:me.filter(Q=>Q.severity==="warn").length)||0;se=`
                <span>\u274C ${ve} errors</span>
                <span>\u26A0\uFE0F ${Oe} warnings</span>
                <span>\u{1F4CA} ${A.data.issuesCount} total</span>
              `}else se=`
                <span>\u{1F3A8} ${A.data.tokensCount} tokens</span>
              `;return`
              <div class="history-item" data-id="${A.id}">
                <div class="history-item-header">
                  <span class="history-item-type ${S}">${ue}</span>
                  <span class="history-item-time">${pe}</span>
                </div>
                <div class="history-item-info">${u(J)}</div>
                <div class="history-item-stats">${se}</div>
              </div>
            `}).join(""),te.querySelectorAll(".history-item").forEach(A=>{A.onclick=()=>{let pe=A.getAttribute("data-id");de(pe)}})}function de(te){try{let A=U().find(S=>S.id===te);if(!A){alert("Scan history entry not found!");return}let pe=document.querySelector(`input[name="scope"][value="${A.mode}"]`);pe&&(pe.checked=!0);let _=typeof f=="function"?f():null;if(!_){console.warn("restoreReportFromHistory: currentReportData is not available");return}_.scanMode=A.mode,_.context=A.context||null,A.type==="issues"&&A.data.issues?(_.issues=A.data.issues,_.tokens=null,typeof x=="function"&&x(!1),typeof I=="function"&&I(A.data.issues,!0,{restoreTimestamp:A.timestamp})):A.type==="tokens"&&A.data.tokens&&(_.issues=null,_.tokens=A.data.tokens,typeof x=="function"&&x(!0),typeof C=="function"&&C(A.data.tokens,!0,{restoreTimestamp:A.timestamp}));let ue=document.getElementById("history-panel");ue&&(ue.style.display="none"),console.log("Report restored from history:",te)}catch(le){console.error("Error restoring report from history:",le),alert("Error restoring report: "+le.message)}}return{setHistory:B,clearLocalHistory:R,getScanHistory:U,saveScanHistory:T,requestScanHistory:O,loadLastScanMode:ce,loadLastScanModeOnce:K,renderScanHistory:oe,restoreReportFromHistory:de}}var sn=4;console.log("Header.js22121211thien2");console.log("ui.js loaded");(function(){console.log("Initializing ui.js...");let h=document.getElementById("btn-scan"),w=document.getElementById("btn-cancel-scan"),f=document.getElementById("scan-progress"),x=document.getElementById("scan-progress-bar"),I=document.getElementById("scan-progress-text"),C=document.getElementById("btn-extract-tokens"),P=document.getElementById("btn-fill-spacing-scale"),V=document.getElementById("btn-fill-color-scale"),D=document.getElementById("btn-extract-color-styles"),B=document.getElementById("btn-fill-font-size-scale"),R=document.getElementById("btn-fill-line-height-scale"),U=document.getElementById("btn-fill-font-size-from-typo"),T=document.getElementById("btn-fill-line-height-from-typo"),O=document.getElementById("btn-export"),ce=document.getElementById("btn-history"),K=document.getElementById("btn-close-history"),ie=document.getElementById("btn-reset-all"),oe=document.getElementById("results-issues"),de=document.getElementById("results-tokens"),te=document.getElementById("btn-close"),le=document.querySelectorAll(".report-tab"),A=document.querySelectorAll(".report-content"),pe="issues";if(!h||!C||!oe||!de||!te||!O||!ce||!P||!V||!B||!R){console.error("Required elements not found",{btnScan:h,btnExtractTokens:C,btnFillSpacingScale:P,btnFillColorScale:V,btnFillFontSizeScale:B,btnFillLineHeightScale:R,resultsIssues:oe,resultsTokens:de,btnClose:te,btnExport:O,btnHistory:ce});return}Ko();let _={},ue={},S={issues:null,tokens:null,scanMode:null,timestamp:null,tokensTimestamp:null,context:null},J=new Map,se=1e3;function Y(){J.clear()}function me(e,t){if(J.has(e))return J.get(e);let o=t();return J.size>=se&&Array.from(J.keys()).slice(0,100).forEach(n=>J.delete(n)),J.set(e,o),o}let ve=null,Oe=5e3,Q=[{id:1,name:"H1",fontFamily:"Inter",fontSize:48,fontWeight:"Bold",lineHeight:"120%",letterSpacing:"0",wordSpacing:"0"},{id:2,name:"H2",fontFamily:"Inter",fontSize:36,fontWeight:"Bold",lineHeight:"130%",letterSpacing:"0",wordSpacing:"0"},{id:3,name:"H3",fontFamily:"Inter",fontSize:28,fontWeight:"SemiBold",lineHeight:"130%",letterSpacing:"0",wordSpacing:"0"},{id:4,name:"H4",fontFamily:"Inter",fontSize:24,fontWeight:"SemiBold",lineHeight:"140%",letterSpacing:"0",wordSpacing:"0"},{id:5,name:"H5",fontFamily:"Inter",fontSize:20,fontWeight:"Medium",lineHeight:"140%",letterSpacing:"0",wordSpacing:"0"},{id:6,name:"H6",fontFamily:"Inter",fontSize:18,fontWeight:"Medium",lineHeight:"140%",letterSpacing:"0",wordSpacing:"0"},{id:7,name:"Body",fontFamily:"Inter",fontSize:16,fontWeight:"Regular",lineHeight:"150%",letterSpacing:"0",wordSpacing:"0"}],Ke=8;function St(e){var n;if(!e||!e.bestMatch||!e.bestMatch.name)return!1;let t=(n=e.nodeProps)==null?void 0:n.fontSize;if(t==null)return!0;let o=Q==null?void 0:Q.find(s=>s.name===e.bestMatch.name);if(!o||!o.fontSize)return!0;let l=Math.abs(t-o.fontSize);return l>sn?(console.log(`[isValidTypographySuggestion] Font-size difference (${l}px) exceeds threshold (${sn}px) for issue:`,e.id,`Current: ${t}px, Suggested: ${o.fontSize}px`),!1):!0}function At(e){e&&parent.postMessage({pluginMessage:{type:"save-last-report",report:e}},"*")}function Xt(){parent.postMessage({pluginMessage:{type:"get-last-report"}},"*")}function be(){var t,o,l,n,s,r,i,a,p,d,y,g,m,v,b;let e={spacingScale:((t=document.getElementById("spacing-scale"))==null?void 0:t.value)||"",spacingThreshold:((o=document.getElementById("spacing-threshold"))==null?void 0:o.value)||"100",colorScale:((l=document.getElementById("color-scale"))==null?void 0:l.value)||"",colorNameMap:_,ignoredIssues:ue,fontSizeScale:((n=document.getElementById("font-size-scale"))==null?void 0:n.value)||"",fontSizeThreshold:((s=document.getElementById("font-size-threshold"))==null?void 0:s.value)||"100",lineHeightScale:((r=document.getElementById("line-height-scale"))==null?void 0:r.value)||"",lineHeightThreshold:((i=document.getElementById("line-height-threshold"))==null?void 0:i.value)||"300",lineHeightBaselineThreshold:((a=document.getElementById("line-height-baseline-threshold"))==null?void 0:a.value)||"120",typographyStyles:Q,typographyRules:{checkStyle:((p=document.getElementById("rule-typo-style"))==null?void 0:p.checked)||!0,checkFontFamily:((d=document.getElementById("rule-font-family"))==null?void 0:d.checked)||!0,checkFontSize:((y=document.getElementById("rule-font-size"))==null?void 0:y.checked)||!0,checkFontWeight:((g=document.getElementById("rule-font-weight"))==null?void 0:g.checked)||!0,checkLineHeight:((m=document.getElementById("rule-line-height"))==null?void 0:m.checked)||!0,checkLetterSpacing:((v=document.getElementById("rule-letter-spacing"))==null?void 0:v.checked)||!1,checkWordSpacing:((b=document.getElementById("rule-word-spacing"))==null?void 0:b.checked)||!1}};parent.postMessage({pluginMessage:{type:"save-input-values",values:e}},"*")}function Zt(){parent.postMessage({pluginMessage:{type:"get-input-values"}},"*")}function Lt(e){if(!e)return;let t=document.getElementById("spacing-scale"),o=document.getElementById("spacing-threshold"),l=document.getElementById("color-scale"),n=document.getElementById("font-size-scale"),s=document.getElementById("font-size-threshold"),r=document.getElementById("line-height-scale"),i=document.getElementById("line-height-threshold"),a=document.getElementById("line-height-baseline-threshold");if(t&&e.spacingScale!==void 0&&(t.value=e.spacingScale),o&&e.spacingThreshold!==void 0&&(o.value=e.spacingThreshold),e.colorNameMap&&typeof e.colorNameMap=="object"?_=e.colorNameMap:_={},e.ignoredIssues&&typeof e.ignoredIssues=="object"?ue=e.ignoredIssues:ue={},l&&e.colorScale!==void 0&&(l.value=e.colorScale,typeof He=="function"&&He()),n&&e.fontSizeScale!==void 0&&(n.value=e.fontSizeScale),s&&e.fontSizeThreshold!==void 0&&(s.value=e.fontSizeThreshold),r&&e.lineHeightScale!==void 0&&(r.value=e.lineHeightScale),i&&e.lineHeightThreshold!==void 0&&(i.value=e.lineHeightThreshold),a&&e.lineHeightBaselineThreshold!==void 0&&(a.value=e.lineHeightBaselineThreshold),e.typographyStyles&&Array.isArray(e.typographyStyles)&&(Q=e.typographyStyles,Ke=Math.max(...Q.map(p=>p.id||0),0)+1,Ge()),e.typographyRules){let p=e.typographyRules;document.getElementById("rule-typo-style")&&(document.getElementById("rule-typo-style").checked=p.checkStyle!==!1),document.getElementById("rule-font-family")&&(document.getElementById("rule-font-family").checked=p.checkFontFamily!==!1),document.getElementById("rule-font-size")&&(document.getElementById("rule-font-size").checked=p.checkFontSize!==!1),document.getElementById("rule-font-weight")&&(document.getElementById("rule-font-weight").checked=p.checkFontWeight!==!1),document.getElementById("rule-line-height")&&(document.getElementById("rule-line-height").checked=p.checkLineHeight!==!1),document.getElementById("rule-letter-spacing")&&(document.getElementById("rule-letter-spacing").checked=p.checkLetterSpacing===!0),document.getElementById("rule-word-spacing")&&(document.getElementById("rule-word-spacing").checked=p.checkWordSpacing===!0),Ge()}}function an(e){if(!e){console.log("No last report to apply");return}if(e.scanMode){let t=document.querySelector(`input[name="scope"][value="${e.scanMode}"]`);t&&(t.checked=!0)}S.scanMode=e.scanMode||S.scanMode,S.context=e.context||S.context,e.issues&&Array.isArray(e.issues)&&(console.log("Applying saved issues report"),Qe(e.issues,!0,{skipSave:!0,restoreTimestamp:e.issuesTimestamp})),e.tokens&&(console.log("Applying saved tokens report"),$t(e.tokens,!0,{skipSave:!0,restoreTimestamp:e.tokensTimestamp})),e.lastActiveTab?De(e.lastActiveTab):e.issues?De("issues"):e.tokens&&De("tokens")}let Le="all",Ce="",Ve="all",bt=!1;console.log("All elements found, setting up event listeners"),le.forEach(e=>{e.addEventListener("click",()=>{let t=e.dataset.tab;le.forEach(n=>n.classList.remove("active")),e.classList.add("active"),A.forEach(n=>n.classList.remove("active"));let o=document.getElementById(`results-${t}`);o&&o.classList.add("active");let l=document.getElementById("filter-controls");l&&(t==="settings"?l.style.display="none":(t==="issues"&&oe&&oe.querySelector(".issue-group")||t==="tokens"&&de&&de.querySelector(".token-group")||S.issues||S.tokens)&&(l.style.display="")),pe=t,t!=="settings"&&(S.issues||S.tokens)&&At({issues:S.issues,issuesTimestamp:S.timestamp,tokens:S.tokens,tokensTimestamp:S.tokensTimestamp,lastActiveTab:t,scanMode:S.scanMode||null,context:S.context||null})})});function kt(e=null){let t=e?document.getElementById(`results-${e}`):oe;t&&(t.innerHTML="")}function De(e){le.forEach(o=>{o.dataset.tab===e?o.classList.add("active"):o.classList.remove("active")}),A.forEach(o=>{o.id===`results-${e}`?o.classList.add("active"):o.classList.remove("active")});let t=document.getElementById("filter-controls");t&&(e==="settings"?t.style.display="none":(e==="issues"&&oe&&oe.querySelector(".issue-group")||e==="tokens"&&de&&de.querySelector(".token-group")||S.issues||S.tokens)&&(t.style.display="")),pe=e}function rn(e){return e==="error"?"\u274C":e==="warn"?"\u26A0\uFE0F":"\u2139\uFE0F"}function Kt(e){return{naming:"\u{1F3F7}\uFE0F",autolayout:"\u{1F4D0}",spacing:"\u{1F4CF}",color:"\u{1F3A8}",typography:"\u270D\uFE0F","typography-style":"\u{1F3A8}","typography-check":"\u{1F4DD}","typography-pass":"\u2705","typography-info":"\u2705","line-height":"\u{1F4DD}",position:"\u{1F4CD}",duplicate:"\u{1F504}",group:"\u{1F4E6}",component:"\u{1F9E9}","empty-frame":"\u{1F4ED}","nested-group":"\u{1F4DA}",contrast:"\u{1F308}","text-size-mobile":"\u{1F4F1}"}[e]||"\u{1F50D}"}function wt(e){return{naming:"Naming Layer",autolayout:"Auto Layout",spacing:"Spacing",color:"Color",typography:"Font Size","typography-style":"Text Style (variable)","typography-check":"Typography Style Match","typography-pass":"Typography \u2713 Matched","line-height":"Line Height",position:"Position Layer",duplicate:"Duplicate Layer",group:"Group Layer",component:"Component Reusable","empty-frame":"Empty Frame Layer","nested-group":"Nested Group Layer",contrast:"Contrast (ADA AA)","text-size-mobile":"Text Size (ADA)"}[e]||e.replace(/-/g," ")}function cn(e){let t=document.createElement("div");t.className=`issue ${e.severity}`;let o="";e.type==="typography-check"&&e.nodeProps&&(o='<div class="typography-details" style="margin-top: 8px; padding: 8px; background: rgba(0,0,0,0.05); border-radius: 4px; font-size: 11px;">',o+='<div class="current-properties"><div style="margin-bottom: 6px;"><strong>Current Properties:</strong></div>',o+='<div style="padding-left: 0; line-height: 1.6;">',e.nodeProps.fontFamily&&(o+=`\u2022 Font Family: <code>${u(e.nodeProps.fontFamily)}</code><br>`),e.nodeProps.fontSize!==null&&e.nodeProps.fontSize!==void 0&&(o+=`\u2022 Font Size: <code>${e.nodeProps.fontSize}px</code><br>`),e.nodeProps.fontWeight&&(o+=`\u2022 Font Weight: <code>${u(e.nodeProps.fontWeight)}</code><br>`),e.nodeProps.lineHeight&&(o+=`\u2022 Line Height: <code>${u(e.nodeProps.lineHeight)}</code><br>`),e.nodeProps.letterSpacing!==null&&e.nodeProps.letterSpacing!==void 0&&(o+=`\u2022 Letter Spacing: <code>${u(e.nodeProps.letterSpacing)}</code><br>`),o+="</div></div>",e.bestMatch&&e.bestMatch.name&&e.severity==="error"?(o+=`<div class="closest-match"><div style="margin-bottom: 6px;"><strong>Closest Match: "${u(e.bestMatch.name)}" (${e.bestMatch.percentage||0}%)</strong></div>`,o+='<div style="padding-left: 0; line-height: 1.6;">',(e.bestMatch.differences||[]).forEach(i=>{let a=i.matches?"\u2713":"\u2717",p=i.matches?"green":"red";o+=`<span style="color: ${p}">${a} ${i.property}: <code>${u(i.current)}</code> \u2192 <code>${u(i.expected)}</code></span><br>`}),o+="</div></div>"):e.severity==="info"&&e.styleName&&(o+=`<div style="margin-top: 8px; color: green;"><strong>\u2713 All properties match style "${u(e.styleName)}"</strong></div>`),o+="</div>"),t.setAttribute("data-issue-id",e.id),t.innerHTML=`
      <div class="issue-header">
              <div>
                <span class="issue-type">${Kt(e.type)} ${wt(e.type)}</span>
      <div class="issue-body">${u(e.message)}</div>
                ${e.nodeName?`<div class="issue-node">Node: ${u(e.nodeName)}</div>`:""}
                ${o}
              </div>
              <div class="issue-actions">
                <button class="btn-select" data-id="${e.id}">Select</button>
                ${e.bestMatch&&e.bestMatch.name&&e.type==="typography-check"&&St(e)?`
                  <button class="btn-suggest-fix" data-id="${e.id}" data-style-name="${u(e.bestMatch.name)}">Suggest Fix now</button>
                `:""}
                ${e.type==="typography-check"?`
                  <button class="btn-style-dropdown" data-id="${e.id}" data-issue-id="${e.id}">Select Style</button>
                `:""}
                ${(e.severity==="error"||e.severity==="warn")&&e.type==="typography-check"?`
                  <button class="btn-remove-layer" data-id="${e.id}">Remove Layer</button>
                `:""}
              </div>
      </div>
    `;let l=t.querySelector("button.btn-select");l&&(l.onclick=()=>{document.querySelectorAll(".btn-select.active").forEach(i=>i.classList.remove("active")),document.querySelectorAll(".issue.selected").forEach(i=>i.classList.remove("selected")),l.classList.add("active"),t.classList.add("selected"),parent.postMessage({pluginMessage:{type:"select-node",id:e.id}},"*")});let n=t.querySelector("button.btn-suggest-fix");n&&e.type==="typography-check"&&e.bestMatch&&e.bestMatch.name&&(function(i){n.onclick=a=>{a.preventDefault(),a.stopPropagation(),i.bestMatch&&i.bestMatch.name?Pt(i,i.bestMatch.name):(console.error("Cannot apply: bestMatch.name is missing",i),alert("Error: Best match style name is missing"))}})(e);let s=t.querySelector("button.btn-style-dropdown");s&&e.type==="typography-check"&&(function(i){s.onclick=a=>{a.preventDefault(),a.stopPropagation(),parent.postMessage({pluginMessage:{type:"get-figma-text-styles",issueId:i.id}},"*"),window.pendingTypographyCheckIssue=i}})(e);let r=t.querySelector("button.btn-remove-layer");return r&&e.type==="typography-check"&&(function(i){r.onclick=a=>{a.preventDefault(),a.stopPropagation(),console.log("Remove Layer button clicked for typography-check",i),typeof Ct=="function"?Ct(i):(console.error("handleRemoveLayer is not a function"),alert("Error: handleRemoveLayer function not found"))}})(e),t}function dn(e){let t=ft(e);if(!t){alert("No suitable color match found");return}let l=(e.message||"").match(/Color (#[0-9A-Fa-f]{6})/),n=l?l[1].toUpperCase():null;Bt(e,n,t,_)}function pn(e){let t=yt(e);if(!t){alert("No suitable spacing match found");return}let o=e.message||"",l=o.match(/Padding\s+(\w+)\s+\((\d+)px\)/);if(!l){console.error("Cannot parse spacing issue message:",o),alert("Cannot determine spacing property from issue message. Message: "+o);return}let n=l[1],s=parseInt(l[2]);Nt(e,n,s,t)}function it(e){return!e||e.type!=="autolayout"?null:{action:"enable-autolayout"}}function Qt(e){if(!it(e)){alert("Cannot suggest fix for this autolayout issue");return}un(e)}function un(e){let t=document.createElement("div");t.className="modal-overlay",t.id="autolayout-fix-confirm-modal-overlay";let o=document.createElement("div");o.className="modal-dialog",o.style.maxWidth="450px",o.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Confirm Auto Layout Enable</h2>
        <p class="modal-subtitle">Node: ${u(e.nodeName||"Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">Action:</div>
          <div style="padding: 12px; background: #e3f2fd; border-left: 3px solid #0071e3; border-radius: 6px;">
            <div style="font-size: 14px; color: #333; margin-bottom: 8px;">
              <strong>Enable Auto Layout</strong>
            </div>
            <div style="font-size: 12px; color: #666;">
              Auto Layout will be enabled on this frame. The layout direction (horizontal/vertical) will be automatically determined based on the children arrangement.
            </div>
          </div>
        </div>
        <div style="padding: 12px; background: #e8f5e9; border-radius: 6px; border-left: 3px solid #28a745;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">\u{1F4DD} Note:</div>
          <div style="font-size: 12px; color: #333;">
            \u2022 Layout direction will be auto-detected (horizontal or vertical)<br>
            \u2022 Spacing and padding will be preserved if possible<br>
            \u2022 Frame structure will be maintained
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="autolayout-fix-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="autolayout-fix-confirm-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `,t.appendChild(o),document.body.appendChild(t);let l=o.querySelector("#autolayout-fix-confirm-cancel-btn"),n=o.querySelector("#autolayout-fix-confirm-apply-btn"),s=o.querySelector(".modal-close"),r=()=>{t.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{t.parentNode&&t.remove()},200)};l.onclick=r,s.onclick=r,t.onclick=i=>{i.target===t&&r()},n.onclick=()=>{r(),ye(e.id,"\u23F3 Enabling auto layout...",!0),parent.postMessage({pluginMessage:{type:"fix-autolayout-issue",issue:e}},"*")}}function gn(e,t={}){let{onApply:o,onIgnore:l,onCancel:n,progress:s}=t,r=s?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${s.current}/${s.total}</div>`:"",i=document.createElement("div");i.className="modal-overlay",i.id="autolayout-fix-confirm-modal-overlay";let a=document.createElement("div");a.className="modal-dialog",a.style.maxWidth="450px",a.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Confirm Auto Layout Enable</h2>
        <p class="modal-subtitle">Node: ${u(e.nodeName||"Unnamed")}</p>
      </div>
      ${r}
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">Action:</div>
          <div style="padding: 12px; background: #e3f2fd; border-left: 3px solid #0071e3; border-radius: 6px;">
            <div style="font-size: 14px; color: #333; margin-bottom: 8px;">
              <strong>Enable Auto Layout</strong>
            </div>
            <div style="font-size: 12px; color: #666;">
              Auto Layout will be enabled on this frame. The layout direction (horizontal/vertical) will be automatically determined based on the children arrangement.
            </div>
          </div>
        </div>
        <div style="padding: 12px; background: #e8f5e9; border-radius: 6px; border-left: 3px solid #28a745;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">\u{1F4DD} Note:</div>
          <div style="font-size: 12px; color: #333;">
            \u2022 Layout direction will be auto-detected (horizontal or vertical)<br>
            \u2022 Spacing and padding will be preserved if possible<br>
            \u2022 Frame structure will be maintained
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="autolayout-fix-ignore-btn" style="background: #6c757d; border-color: #6c757d; color: white;">Ignore</button>
        <button class="modal-btn modal-btn-cancel" id="autolayout-fix-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="autolayout-fix-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `,i.appendChild(a),document.body.appendChild(i);let p=a.querySelector("#autolayout-fix-cancel-btn"),d=a.querySelector("#autolayout-fix-apply-btn"),y=a.querySelector("#autolayout-fix-ignore-btn"),g=a.querySelector(".modal-close"),m=()=>{i.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{i.parentNode&&i.remove()},200)};p.onclick=()=>{m(),n&&n()},g.onclick=()=>{m(),n&&n()},i.onclick=v=>{v.target===i&&(m(),n&&n())},y.onclick=()=>{m(),l&&l()},d.onclick=()=>{m(),ye(e.id,"\u23F3 Enabling auto layout...",!0),parent.postMessage({pluginMessage:{type:"fix-autolayout-issue",issue:e}},"*"),o&&o()}}function mn(e){return{action:"convert-group"}}function eo(e){if(!mn(e)){alert("Cannot suggest fix for this group issue");return}fn(e)}function fn(e){let t=document.createElement("div");t.className="modal-overlay",t.id="group-fix-modal-overlay";let o=document.createElement("div");o.className="modal-dialog",o.style.maxWidth="450px",o.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Convert Group to Frame</h2>
        <p class="modal-subtitle">Node: ${u(e.nodeName||"Unnamed")}</p>
      </div>
      <div class="modal-body">
        <p style="margin: 0 0 16px 0; color: #333; line-height: 1.5;">
          This will convert the Group to a Frame and enable Auto-layout automatically.
        </p>
        <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current:</div>
          <div style="font-size: 13px; color: #333; font-weight: 500;">Group</div>
        </div>
        <div style="background: #e8f5e9; padding: 12px; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">After fix:</div>
          <div style="font-size: 13px; color: #333; font-weight: 500;">Frame with Auto-layout</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="group-fix-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="group-fix-apply-btn">Apply</button>
      </div>
    `,t.appendChild(o),document.body.appendChild(t);let l=o.querySelector("#group-fix-cancel-btn"),n=o.querySelector(".modal-close"),s=o.querySelector("#group-fix-apply-btn"),r=()=>{t.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{t.parentNode&&t.remove()},200)};l.onclick=r,n.onclick=r,t.onclick=i=>{i.target===t&&r()},s.onclick=()=>{s.disabled=!0,s.textContent="Applying...",parent.postMessage({pluginMessage:{type:"fix-group-issue",issue:e}},"*"),r()}}function yn(e,t={}){let{onApply:o,onIgnore:l,onCancel:n,progress:s}=t,r=s?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${s.current}/${s.total}</div>`:"",i=document.createElement("div");i.className="modal-overlay",i.id="group-fix-modal-overlay";let a=document.createElement("div");a.className="modal-dialog",a.style.maxWidth="450px",a.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Convert Group to Frame</h2>
        <p class="modal-subtitle">Node: ${u(e.nodeName||"Unnamed")}</p>
      </div>
      ${r}
      <div class="modal-body">
        <p style="margin: 0 0 16px 0; color: #333; line-height: 1.5;">
          This will convert the Group to a Frame and enable Auto-layout automatically.
        </p>
        <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current:</div>
          <div style="font-size: 13px; color: #333; font-weight: 500;">Group</div>
        </div>
        <div style="background: #e8f5e9; padding: 12px; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">After fix:</div>
          <div style="font-size: 13px; color: #333; font-weight: 500;">Frame with Auto-layout</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="group-fix-ignore-btn" style="background: #6c757d; border-color: #6c757d; color: white;">Ignore</button>
        <button class="modal-btn modal-btn-cancel" id="group-fix-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="group-fix-apply-btn">Apply</button>
      </div>
    `,i.appendChild(a),document.body.appendChild(i);let p=a.querySelector("#group-fix-cancel-btn"),d=a.querySelector("#group-fix-apply-btn"),y=a.querySelector("#group-fix-ignore-btn"),g=a.querySelector(".modal-close"),m=()=>{i.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{i.parentNode&&i.remove()},200)};p.onclick=()=>{m(),n&&n()},g.onclick=()=>{m(),n&&n()},i.onclick=v=>{v.target===i&&(m(),n&&n())},y.onclick=()=>{m(),l&&l()},d.onclick=()=>{d.disabled=!0,d.textContent="Applying...",parent.postMessage({pluginMessage:{type:"fix-group-issue",issue:e}},"*"),m(),o&&o()}}function tt(e){return!e||e.type!=="position"?null:{action:"fix-position"}}function at(e){return!e||e.type!=="duplicate"&&e.type!=="component"?null:{action:"suggest-component"}}function rt(e){return!e||e.type!=="empty-frame"?null:{action:"fix-empty-frame"}}function to(e){if(!tt(e)){alert("Cannot suggest fix for this position issue");return}hn(e)}function oo(e){if(!rt(e)){alert("Cannot suggest fix for this empty frame issue");return}vn(e)}function hn(e){let t=e.message||"",o=t.match(/x:(-?\d+)/),l=t.match(/y:(-?\d+)/),n=o?parseInt(o[1],10):0,s=l?parseInt(l[1],10):0,r=document.createElement("div");r.className="modal-overlay",r.id="position-fix-confirm-modal-overlay";let i=document.createElement("div");i.className="modal-dialog",i.style.maxWidth="400px",i.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Fix Position Issue</h2>
        <p class="modal-subtitle">Node: ${u(e.nodeName||"Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <p style="margin-bottom: 12px; color: #666; font-size: 13px;">
            This layer has a negative position which may cause layout issues.
          </p>
          <div style="padding: 12px; background: #f5f5f5; border-radius: 6px; margin-bottom: 12px;">
            <div style="font-size: 12px; color: #666; margin-bottom: 8px;"><strong>Current Position:</strong></div>
            <div style="font-size: 11px; color: #666; padding-left: 8px; line-height: 1.6;">
              \u2022 X: <code>${n}px</code><br>
              \u2022 Y: <code>${s}px</code>
            </div>
          </div>
          <div style="padding: 12px; background: #e3f2fd; border-radius: 6px;">
            <div style="font-size: 12px; color: #1976d2; margin-bottom: 8px;"><strong>After Fix:</strong></div>
            <div style="font-size: 11px; color: #1976d2; padding-left: 8px; line-height: 1.6;">
              \u2022 X: <code>0px</code><br>
              \u2022 Y: <code>0px</code>
            </div>
          </div>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 12px;">
          This will set the position to (0, 0) to fix the negative offset.
        </p>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="position-fix-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="position-fix-confirm-apply-btn">Apply</button>
      </div>
    `,r.appendChild(i),document.body.appendChild(r);let a=i.querySelector("#position-fix-confirm-cancel-btn"),p=i.querySelector("#position-fix-confirm-apply-btn"),d=i.querySelector(".modal-close"),y=()=>{r.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{r.parentNode&&r.remove()},200)};a.onclick=y,d.onclick=y,r.onclick=g=>{g.target===r&&y()},p.onclick=()=>{y(),ye(e.id,"\u23F3 Fixing position...",!0),parent.postMessage({pluginMessage:{type:"fix-position-issue",issue:e}},"*")}}function bn(e,t={}){let{onApply:o,onIgnore:l,onCancel:n,progress:s}=t,r=s?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${s.current}/${s.total}</div>`:"",i=e.message||"",a=i.match(/x:(-?\d+)/),p=i.match(/y:(-?\d+)/),d=a?parseInt(a[1],10):0,y=p?parseInt(p[1],10):0,g=document.createElement("div");g.className="modal-overlay",g.id="position-fix-confirm-modal-overlay";let m=document.createElement("div");m.className="modal-dialog",m.style.maxWidth="400px",m.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Fix Position Issue</h2>
        <p class="modal-subtitle">Node: ${u(e.nodeName||"Unnamed")}</p>
      </div>
      ${r}
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <p style="margin-bottom: 12px; color: #666; font-size: 13px;">
            This layer has a negative position which may cause layout issues.
          </p>
          <div style="padding: 12px; background: #f5f5f5; border-radius: 6px; margin-bottom: 12px;">
            <div style="font-size: 12px; color: #666; margin-bottom: 8px;"><strong>Current Position:</strong></div>
            <div style="font-size: 11px; color: #666; padding-left: 8px; line-height: 1.6;">
              \u2022 X: <code>${d}px</code><br>
              \u2022 Y: <code>${y}px</code>
            </div>
          </div>
          <div style="padding: 12px; background: #e3f2fd; border-radius: 6px;">
            <div style="font-size: 12px; color: #1976d2; margin-bottom: 8px;"><strong>After Fix:</strong></div>
            <div style="font-size: 11px; color: #1976d2; padding-left: 8px; line-height: 1.6;">
              \u2022 X: <code>0px</code><br>
              \u2022 Y: <code>0px</code>
            </div>
          </div>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 12px;">
          This will set the position to (0, 0) to fix the negative offset.
        </p>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="position-fix-ignore-btn" style="background: #6c757d; border-color: #6c757d; color: white;">Ignore</button>
        <button class="modal-btn modal-btn-cancel" id="position-fix-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="position-fix-apply-btn">Apply</button>
      </div>
    `,g.appendChild(m),document.body.appendChild(g);let v=m.querySelector("#position-fix-cancel-btn"),b=m.querySelector("#position-fix-apply-btn"),F=m.querySelector("#position-fix-ignore-btn"),q=m.querySelector(".modal-close"),k=()=>{g.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{g.parentNode&&g.remove()},200)};v.onclick=()=>{k(),n&&n()},q.onclick=()=>{k(),n&&n()},g.onclick=$=>{$.target===g&&(k(),n&&n())},F.onclick=()=>{k(),l&&l()},b.onclick=()=>{k(),ye(e.id,"\u23F3 Fixing position...",!0),parent.postMessage({pluginMessage:{type:"fix-position-issue",issue:e}},"*"),o&&o()}}function tl(e){no(e)}function Ct(e){no(e)}function no(e){let t=document.createElement("div");t.className="modal-overlay",t.id="remove-layer-confirm-modal-overlay";let o=document.createElement("div");o.className="modal-dialog",o.style.maxWidth="400px",o.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Remove Layer</h2>
        <p class="modal-subtitle">Node: ${u(e.nodeName||"Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <p style="margin-bottom: 12px; color: #666; font-size: 13px;">
            Are you sure you want to remove this layer?
          </p>
          <div style="padding: 12px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px;">
            <div style="font-size: 12px; color: #856404; margin-bottom: 4px;"><strong>\u26A0\uFE0F Warning:</strong></div>
            <div style="font-size: 11px; color: #856404; line-height: 1.6;">
              This action cannot be undone. The layer and all its children will be permanently deleted.
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="remove-layer-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-danger" id="remove-layer-confirm-apply-btn" style="background: #dc3545; border-color: #dc3545;color: white;">Remove</button>
      </div>
    `,t.appendChild(o),document.body.appendChild(t);let l=o.querySelector("#remove-layer-confirm-cancel-btn"),n=o.querySelector("#remove-layer-confirm-apply-btn"),s=o.querySelector(".modal-close"),r=()=>{t.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{t.parentNode&&t.remove()},200)};l.onclick=r,s.onclick=r,t.onclick=i=>{i.target===t&&r()},n.onclick=()=>{r(),ye(e.id,"\u23F3 Removing layer...",!0),parent.postMessage({pluginMessage:{type:"remove-layer",issue:e}},"*")}}function vn(e){let t=e.message||"",o=t.includes("Empty frame"),l=t.includes("redundant"),n=l?"Remove Redundant Frame":"Remove Empty Frame",s=l?"This will remove the redundant frame and keep its single child. The child will inherit the frame's name if it was unnamed.":"This will remove the empty frame. If it has a child, the child will be kept.",r=document.createElement("div");r.className="modal-overlay",r.id="empty-frame-fix-modal-overlay";let i=document.createElement("div");i.className="modal-dialog",i.style.maxWidth="450px",i.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">${n}</h2>
        <p class="modal-subtitle">Node: ${u(e.nodeName||"Unnamed")}</p>
      </div>
      <div class="modal-body">
        <p style="margin: 0 0 16px 0; color: #333; line-height: 1.5;">
          ${s}
        </p>
        <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current:</div>
          <div style="font-size: 13px; color: #333; font-weight: 500;">${u(e.message)}</div>
        </div>
        <div style="background: #e8f5e9; padding: 12px; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">After fix:</div>
          <div style="font-size: 13px; color: #333; font-weight: 500;">Frame removed, child kept (if applicable)</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="empty-frame-fix-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="empty-frame-fix-apply-btn">Apply</button>
      </div>
    `,document.body.appendChild(r),r.appendChild(i);let a=i.querySelector("#empty-frame-fix-cancel-btn"),p=i.querySelector(".modal-close"),d=i.querySelector("#empty-frame-fix-apply-btn"),y=()=>{r.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{r.parentNode&&r.remove()},200)};a.onclick=y,p.onclick=y,r.onclick=g=>{g.target===r&&y()},d.onclick=()=>{d.disabled=!0,d.textContent="Applying...",parent.postMessage({pluginMessage:{type:"fix-empty-frame-issue",issue:e}},"*"),y()}}function xn(e,t={}){let{onApply:o,onIgnore:l,onCancel:n,progress:s}=t,r=s?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${s.current}/${s.total}</div>`:"",i=e.message||"",a=i.includes("Empty frame"),p=i.includes("redundant"),d=p?"Remove Redundant Frame":"Remove Empty Frame",y=p?"This will remove the redundant frame and keep its single child. The child will inherit the frame's name if it was unnamed.":"This will remove the empty frame. If it has a child, the child will be kept.",g=document.createElement("div");g.className="modal-overlay",g.id="empty-frame-fix-modal-overlay";let m=document.createElement("div");m.className="modal-dialog",m.style.maxWidth="450px",m.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">${d}</h2>
        <p class="modal-subtitle">Node: ${u(e.nodeName||"Unnamed")}</p>
      </div>
      ${r}
      <div class="modal-body">
        <p style="margin: 0 0 16px 0; color: #333; line-height: 1.5;">
          ${y}
        </p>
        <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current:</div>
          <div style="font-size: 13px; color: #333; font-weight: 500;">${u(e.message)}</div>
        </div>
        <div style="background: #e8f5e9; padding: 12px; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">After fix:</div>
          <div style="font-size: 13px; color: #333; font-weight: 500;">Frame removed, child kept (if applicable)</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="empty-frame-fix-ignore-btn" style="background: #6c757d; border-color: #6c757d; color: white;">Ignore</button>
        <button class="modal-btn modal-btn-cancel" id="empty-frame-fix-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="empty-frame-fix-apply-btn">Apply</button>
      </div>
    `,document.body.appendChild(g),g.appendChild(m);let v=m.querySelector("#empty-frame-fix-cancel-btn"),b=m.querySelector("#empty-frame-fix-apply-btn"),F=m.querySelector("#empty-frame-fix-ignore-btn"),q=m.querySelector(".modal-close"),k=()=>{g.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{g.parentNode&&g.remove()},200)};v.onclick=()=>{k(),n&&n()},q.onclick=()=>{k(),n&&n()},g.onclick=$=>{$.target===g&&(k(),n&&n())},F.onclick=()=>{k(),l&&l()},b.onclick=()=>{b.disabled=!0,b.textContent="Applying...",parent.postMessage({pluginMessage:{type:"fix-empty-frame-issue",issue:e}},"*"),k(),o&&o()}}function lo(e){if(console.log("handleSuggestFixComponent called",e),!e||!e.id){console.error("Invalid issue in handleSuggestFixComponent",e),alert("Error: Invalid issue data");return}window.pendingComponentIssue=e,console.log("Stored pendingComponentIssue:",window.pendingComponentIssue);let t=document.querySelector(`.issue[data-issue-id="${e.id}"]`);if(t){let o=t.querySelector("button.btn-suggest-fix");if(o){let l=o.textContent;o.disabled=!0,o.textContent="Loading...",o.style.opacity="0.6",o.style.cursor="wait",o.dataset.originalText=l}}console.log("Sending get-components-for-issue message",{issueId:e.id,issue:e}),parent.postMessage({pluginMessage:{type:"get-components-for-issue",issue:e}},"*")}function so(e){if(console.log("handleSelectComponent called",e),!e||!e.id){console.error("Invalid issue in handleSelectComponent",e),alert("Error: Invalid issue data");return}window.pendingSelectComponentIssue=e,console.log("Stored pendingSelectComponentIssue:",window.pendingSelectComponentIssue);let t=document.querySelector(`.issue[data-issue-id="${e.id}"]`);if(t){let o=t.querySelector("button.btn-select-component");if(o){let l=o.textContent;o.disabled=!0,o.textContent="Loading...",o.style.opacity="0.6",o.dataset.originalText=l}}console.log("Sending get-all-components message",{issueId:e.id,issue:e}),parent.postMessage({pluginMessage:{type:"get-all-components",issue:e}},"*")}function io(e){kn(e)}function ao(e){Sn(e)}function Sn(e){let t=document.createElement("div");t.className="modal-overlay",t.id="rename-modal-overlay";let o=document.createElement("div");o.className="modal-dialog",o.style.maxWidth="400px";let l=e.nodeName||"",n=l.replace(/^(Frame|Group)\s*/i,"").trim()||"";o.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Rename Node</h2>
        <p class="modal-subtitle">Current: ${u(l)}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 8px; font-size: 13px; font-weight: 600; color: #333;">New Name:</label>
          <input type="text" id="rename-input" placeholder="Enter meaningful name" style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px;" value="${u(n)}" autocomplete="off">
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 12px;">
          Enter a meaningful name that describes the purpose of this layer (e.g., "Header", "Button", "Card").
        </p>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="rename-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="rename-apply-btn">Rename</button>
      </div>
    `,t.appendChild(o),document.body.appendChild(t);let s=o.querySelector("#rename-cancel-btn"),r=o.querySelector("#rename-apply-btn"),i=o.querySelector(".modal-close"),a=o.querySelector("#rename-input");setTimeout(()=>{a.focus(),a.select()},100);let p=()=>{t.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{t.parentNode&&t.remove()},200)};s.onclick=p,i.onclick=p,t.onclick=d=>{d.target===t&&p()},a.addEventListener("keydown",d=>{d.key==="Enter"&&(d.preventDefault(),r.click())}),r.onclick=()=>{let d=a.value.trim();if(!d){alert("Please enter a name"),a.focus();return}if(/^(Frame|Group)\s*$/i.test(d)&&!confirm("The name still contains default naming (Frame/Group). Do you want to continue?")){a.focus();return}p(),ye(e.id,"\u23F3 Renaming...",!0),parent.postMessage({pluginMessage:{type:"rename-node",issue:e,newName:d}},"*")}}function kn(e){let t=document.createElement("div");t.className="modal-overlay",t.id="create-component-modal-overlay";let o=document.createElement("div");o.className="modal-dialog",o.style.maxWidth="400px",o.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Create New Component</h2>
        <p class="modal-subtitle">Node: ${u(e.nodeName||"Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 8px; font-size: 13px; font-weight: 600; color: #333;">Component Name:</label>
          <input type="text" id="create-component-name-input" placeholder="Enter component name" style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px;" value="${u(e.nodeName||"")}">
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 12px;">
          This will convert the frame to a component and replace all duplicate frames with instances of this component.
        </p>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="create-component-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="create-component-apply-btn">Create</button>
      </div>
    `,t.appendChild(o),document.body.appendChild(t);let l=o.querySelector("#create-component-cancel-btn"),n=o.querySelector("#create-component-apply-btn"),s=o.querySelector(".modal-close"),r=o.querySelector("#create-component-name-input");setTimeout(()=>r.focus(),100);let i=()=>{t.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{t.parentNode&&t.remove()},200)};l.onclick=i,s.onclick=i,t.onclick=a=>{a.target===t&&i()},n.onclick=()=>{let a=r.value.trim();if(!a){alert("Please enter a component name");return}i(),ye(e.id,"\u23F3 Creating component...",!0),parent.postMessage({pluginMessage:{type:"create-component-from-issue",issue:e,componentName:a}},"*")}}function wn(e,t){if(console.log("[showComponentSuggestModal] Called with",{issue:e,similarComponents:t}),!t||t.length===0){console.warn("[showComponentSuggestModal] No similar components provided"),alert("No similar components found.");return}let o=t[0];console.log("[showComponentSuggestModal] Using best match:",o),ro(e,o,"This is the most similar component found.")}function Cn(e,t){if(console.log("[showComponentSelectModal] Called with",{issue:e,components:t}),!t||t.length===0){console.warn("[showComponentSelectModal] No components provided"),alert("No components available.");return}let o=document.createElement("div");o.className="modal-overlay",o.id="component-select-modal-overlay";let l=document.createElement("div");l.className="modal-dialog",l.style.maxWidth="500px";let n=t.map(v=>`
        <div class="component-picker-item" data-component-id="${v.id}" data-component-name="${u(v.name.toLowerCase())}" style="
          padding: 12px;
          margin-bottom: 8px;
          border: 2px solid #ddd;
          border-radius: 8px;
          cursor: pointer;
          background: white;
          transition: all 0.2s;
        " onmouseover="this.style.borderColor='#0071e3'; this.style.boxShadow='0 2px 8px rgba(0,113,227,0.2)'" onmouseout="this.style.borderColor='#ddd'; this.style.boxShadow='none'">
          <div style="font-weight: 600; font-size: 14px; color: #333;">${u(v.name)}</div>
          <div style="font-size: 11px; color: #666; margin-top: 4px;">
            ${v.description||"Component"}
          </div>
        </div>
      `).join(""),s=t.length>5,r=s?`
      <div style="margin-bottom: 16px;">
        <input type="text" id="component-search-input" placeholder="Search components by name..." style="
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 13px;
          box-sizing: border-box;
        " autocomplete="off">
        <div id="component-search-results-count" style="font-size: 11px; color: #666; margin-top: 4px; display: none;"></div>
      </div>
    `:"";l.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Select Component</h2>
        <p class="modal-subtitle">Node: ${u(e.nodeName||"Unnamed")}</p>
      </div>
      <div class="modal-body">
        ${r}
        <div id="component-list-container" style="max-height: 400px; overflow-y: auto;">
          ${n}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="component-select-cancel-btn">Cancel</button>
      </div>
    `,o.appendChild(l),document.body.appendChild(o),console.log("[showComponentSelectModal] Modal added to DOM"),console.log("[showComponentSelectModal] Overlay element:",o),console.log("[showComponentSelectModal] Dialog element:",l),o.style.display="flex",o.style.opacity="1",o.style.zIndex="10000";let i=l.querySelector("#component-select-cancel-btn"),a=l.querySelector(".modal-close"),p=l.querySelectorAll(".component-picker-item"),d=l.querySelector("#component-search-input"),y=l.querySelector("#component-list-container"),g=l.querySelector("#component-search-results-count");console.log("[showComponentSelectModal] Found",p.length,"component items"),console.log("[showComponentSelectModal] Cancel button:",i,"Close button:",a),d&&s&&(d.addEventListener("input",v=>{let b=v.target.value.toLowerCase().trim(),F=0;p.forEach(q=>{let k=q.getAttribute("data-component-name")||"";b===""||k.includes(b)?(q.style.display="block",F++):q.style.display="none"}),g&&(b!==""?(g.textContent=`Showing ${F} of ${t.length} components`,g.style.display="block"):g.style.display="none")}),setTimeout(()=>d.focus(),100));let m=()=>{console.log("[showComponentSelectModal] Closing modal"),o.style.animation="fadeIn 0.2s ease-out reverse",o.style.opacity="0",setTimeout(()=>{o.parentNode&&(o.remove(),console.log("[showComponentSelectModal] Modal removed from DOM"))},200)};i?i.onclick=v=>{v.preventDefault(),v.stopPropagation(),m()}:console.error("[showComponentSelectModal] Cancel button not found!"),a?a.onclick=v=>{v.preventDefault(),v.stopPropagation(),m()}:console.error("[showComponentSelectModal] Close button not found!"),o.onclick=v=>{v.target===o&&m()},p.forEach((v,b)=>{v.onclick=F=>{F.preventDefault(),F.stopPropagation(),console.log("[showComponentSelectModal] Component item clicked",b);let q=v.getAttribute("data-component-id");console.log("[showComponentSelectModal] Component ID:",q);let k=t.find($=>$.id===q);console.log("[showComponentSelectModal] Found component:",k),k?(m(),ro(e,k,null)):console.error("[showComponentSelectModal] Component not found for ID:",q)}}),setTimeout(()=>{o.style.animation="fadeIn 0.2s ease-out",o.style.opacity="1",console.log("[showComponentSelectModal] Animation triggered, overlay visible:",o.offsetParent!==null)},10),console.log("[showComponentSelectModal] Modal setup complete")}function ro(e,t,o){let l=document.createElement("div");l.className="modal-overlay",l.id="component-apply-confirm-modal-overlay";let n=document.createElement("div");n.className="modal-dialog",n.style.maxWidth="400px",n.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Apply Component</h2>
        <p class="modal-subtitle">Node: ${u(e.nodeName||"Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <p style="margin-bottom: 12px; color: #666; font-size: 13px;">
            This will replace the frame with an instance of the selected component.
          </p>
          <div style="padding: 12px; background: #e3f2fd; border-radius: 6px;">
            <div style="font-size: 12px; color: #1976d2; margin-bottom: 8px;"><strong>Selected Component:</strong></div>
            <div style="font-size: 14px; color: #333; font-weight: 600;">${u(t.name)}</div>
            ${t.description?`<div style="font-size: 11px; color: #666; margin-top: 4px;">${u(t.description)}</div>`:""}
          </div>
          ${o?`<p style="color: #666; font-size: 12px; margin-top: 12px;">${u(o)}</p>`:""}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="component-apply-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="component-apply-apply-btn">Apply</button>
      </div>
    `,l.appendChild(n),document.body.appendChild(l);let s=n.querySelector("#component-apply-cancel-btn"),r=n.querySelector("#component-apply-apply-btn"),i=n.querySelector(".modal-close"),a=()=>{l.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{l.parentNode&&l.remove()},200)};s.onclick=a,i.onclick=a,l.onclick=p=>{p.target===l&&a()},r.onclick=()=>{a(),ye(e.id,"\u23F3 Applying component...",!0),parent.postMessage({pluginMessage:{type:"apply-component-to-issue",issue:e,componentId:t.id}},"*")}}function ot(e){if(!e||!e.fontSize)return null;let t=e.fontSize,o=14,l=document.getElementById("font-size-scale");if(l&&l.value.trim()){let n=l.value.split(",").map(s=>parseInt(s.trim(),10)).filter(s=>!isNaN(s)&&s>=o).sort((s,r)=>s-r);if(n.length>0){let s=null,r=1/0;n.forEach(a=>{if(a>=o){let p=Math.abs(a-t);p<r&&(r=p,s=a)}});let i=Math.max(t*.5,10);if(s&&r<=i)return s}}return t<o?o:null}function ct(e){if(!e||!e.textColor||!e.backgroundColor)return null;let t=e.textColor.toUpperCase(),o=e.backgroundColor.toUpperCase(),l=e.minContrast||4.5,n=document.getElementById("color-scale");if(!n||!n.value.trim())return null;let s=n.value.split(",").map(p=>p.trim().toUpperCase()).filter(p=>p&&p.startsWith("#"));if(s.length===0)return null;let r=null,i=0,a=1/0;return s.forEach(p=>{let d=Tt(p,o);if(d>=l){let y=Ft(t,p);(d>i||d===i&&y<a)&&(i=d,r=p,a=y)}}),r}function co(e,t){if(!t||t.length===0){alert("No text styles found in Figma. Please create text styles first.");return}let o=document.createElement("div");o.className="modal-overlay",o.id="text-style-picker-typography-modal-overlay";let l=document.createElement("div");l.className="modal-dialog",l.style.maxWidth="500px";let n=e.nodeProps||{},s=n.fontFamily||"Unknown",r=n.fontSize!==null&&n.fontSize!==void 0?n.fontSize:null,i=r!==null?`${r}px`:"Unknown",a=n.fontWeight||"Unknown",p=n.lineHeight||"Unknown",d=n.letterSpacing!==null&&n.letterSpacing!==void 0?n.letterSpacing:"Unknown",y=null;e.bestMatch&&e.bestMatch.name&&(y=e.bestMatch.name);let g=N=>N==null||N==="Unknown"?"":String(N).toLowerCase().trim(),m=N=>{let ee=`picker_${g(s)}_${r}_${g(a)}_${g(p)}_${g(d)}_${N.id}`;return me(ee,()=>{let E=0;if(g(s)===g(N.fontFamily)&&(E+=25),r!==null&&N.fontSize){let M=Math.abs(r-N.fontSize);M===0?E+=30:M<=2?E+=25:M<=4?E+=20:M<=8&&(E+=10)}return g(a)===g(N.fontWeight)&&(E+=20),g(p)===g(N.lineHeight)&&(E+=15),g(d)===g(N.letterSpacing||"0")&&(E+=10),E})},v=[...t].sort((N,ee)=>y===N.name?-1:y===ee.name?1:m(ee)-m(N)),b=(N,ee)=>g(N)!==g(ee),F=N=>{let ee=y===N.name,E=m(N),M=b(s,N.fontFamily),X=b(i,`${N.fontSize}px`),ne=b(a,N.fontWeight),c=b(p,N.lineHeight),ae=b(d,N.letterSpacing||"0"),Z="color: #155724;",z="color: #721c24; background: #f8d7da; padding: 1px 4px; border-radius: 3px; font-weight: 600;";return`
        <div class="style-picker-item" data-style-id="${N.id}" data-style-name="${u(N.name)}" data-font-size="${N.fontSize}" data-similarity="${E}" style="
          padding: 12px;
          margin-bottom: 8px;
          border: 2px solid ${ee?"#0071e3":"#ddd"};
          border-radius: 8px;
          cursor: pointer;
          background: white;
          transition: all 0.2s;
        " onmouseover="this.style.borderColor='#0071e3'; this.style.boxShadow='0 2px 8px rgba(0,113,227,0.2)'" onmouseout="this.style.borderColor='${ee?"#0071e3":"#ddd"}'; this.style.boxShadow='none'">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
            <div>
              <div style="font-weight: 600; font-size: 14px; color: #333;">${u(N.name)} ${ee?"\u2B50":""}</div>
              <div style="font-size: 11px; color: #666; margin-top: 4px;">
                ${u(N.fontFamily)} ${N.fontSize}px ${u(N.fontWeight)}
              </div>
            </div>
            <div style="text-align: right;">
              ${ee?'<div style="color: #0071e3; font-weight: 600; font-size: 11px;">Best Match</div>':""}
              <div style="color: #666; font-size: 10px; margin-top: 2px;">${E}% match</div>
            </div>
          </div>
          <div style="font-size: 11px; color: #666; padding-top: 8px; border-top: 1px solid #eee;">
            <div style="margin-bottom: 4px;"><strong>Details:</strong></div>
            <div style="padding-left: 8px; line-height: 1.8;">
              \u2022 Font Family: <code style="${M?z:Z}">${M?"\u26A0 ":"\u2713 "}${u(N.fontFamily)}</code><br>
              \u2022 Font Size: <code style="${X?z:Z}">${X?"\u26A0 ":"\u2713 "}${N.fontSize}px</code><br>
              \u2022 Font Weight: <code style="${ne?z:Z}">${ne?"\u26A0 ":"\u2713 "}${u(N.fontWeight)}</code><br>
              \u2022 Line Height: <code style="${c?z:Z}">${c?"\u26A0 ":"\u2713 "}${u(N.lineHeight)}</code><br>
              \u2022 Letter Spacing: <code style="${ae?z:Z}">${ae?"\u26A0 ":"\u2713 "}${u(N.letterSpacing||"0")}</code>
            </div>
          </div>
        </div>
      `},q=v.map(N=>F(N)).join("");l.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Choose Text Style</h2>
        <p class="modal-subtitle">Node: ${u(e.nodeName||"Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;"><strong>Current Properties:</strong></div>
          <div style="font-size: 11px; color: #666; padding-left: 8px; line-height: 1.6;">
            \u2022 Font Family: <code>${u(s)}</code><br>
            \u2022 Font Size: <code>${u(i)}</code><br>
            \u2022 Font Weight: <code>${u(a)}</code><br>
            \u2022 Line Height: <code>${u(p)}</code><br>
            \u2022 Letter Spacing: <code>${u(d)}</code>
          </div>
        </div>
        <!-- Search Input -->
        <div style="margin-bottom: 12px;">
          <input type="text" id="style-search-input" placeholder="\u{1F50D} Search styles by name..." style="
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 13px;
            box-sizing: border-box;
            outline: none;
          " onfocus="this.style.borderColor='#0071e3'" onblur="this.style.borderColor='#ddd'" />
        </div>
        <div id="style-list-container" style="max-height: 280px; overflow-y: auto;">
          ${q}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="text-style-picker-typography-modal-cancel-btn">Cancel</button>
      </div>
    `,o.appendChild(l),document.body.appendChild(o);let k=l.querySelector("#text-style-picker-typography-modal-cancel-btn"),$=l.querySelector(".modal-close"),j=l.querySelector("#style-search-input"),L=l.querySelector("#style-list-container"),W=()=>{o.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{o.parentNode&&o.remove()},200)};k.onclick=W,$.onclick=W,o.onclick=N=>{N.target===o&&W()},j.oninput=N=>{let ee=N.target.value.toLowerCase().trim(),E=v.filter(M=>M.name.toLowerCase().includes(ee));L.innerHTML=E.map(M=>F(M)).join(""),ge()};let ge=()=>{l.querySelectorAll(".style-picker-item").forEach(ee=>{ee.onclick=E=>{E.preventDefault(),E.stopPropagation();let M=ee.getAttribute("data-style-id"),X=t.find(ne=>ne.id===M);X&&(o.style.display="none",In(e,X,o))}})};ge(),setTimeout(()=>{j.focus()},100)}function In(e,t,o){let l=document.createElement("div");l.className="modal-overlay",l.id="typography-style-confirm-modal-overlay";let n=document.createElement("div");n.className="modal-dialog",n.style.maxWidth="500px";let s=e.nodeProps||{},r=s.fontFamily||"Unknown",i=s.fontSize!==null&&s.fontSize!==void 0?`${s.fontSize}px`:"Unknown",a=s.fontWeight||"Unknown",p=s.lineHeight||"Unknown",d=s.letterSpacing!==null&&s.letterSpacing!==void 0?s.letterSpacing:"Unknown";n.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Confirm Text Style Application</h2>
        <p class="modal-subtitle">Node: ${u(e.nodeName||"Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">Apply Text Style:</div>
          <div style="padding: 12px; background: #e3f2fd; border-left: 3px solid #0071e3; border-radius: 6px;">
            <div style="font-weight: 600; font-size: 16px; color: #333; margin-bottom: 8px;">${u(t.name)}</div>
            <div style="font-size: 12px; color: #666; line-height: 1.6;">
              \u2022 Font Family: <code>${u(t.fontFamily)}</code><br>
              \u2022 Font Size: <code>${t.fontSize}px</code><br>
              \u2022 Font Weight: <code>${u(t.fontWeight)}</code><br>
              \u2022 Line Height: <code>${u(t.lineHeight)}</code><br>
              \u2022 Letter Spacing: <code>${u(t.letterSpacing||"0")}</code>
            </div>
          </div>
        </div>
        <div style="padding: 12px; background: #f5f5f5; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;"><strong>Current Properties:</strong></div>
          <div style="font-size: 11px; color: #666; padding-left: 8px; line-height: 1.6;">
            \u2022 Font Family: <code>${u(r)}</code><br>
            \u2022 Font Size: <code>${u(i)}</code><br>
            \u2022 Font Weight: <code>${u(a)}</code><br>
            \u2022 Line Height: <code>${u(p)}</code><br>
            \u2022 Letter Spacing: <code>${u(d)}</code>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="typography-style-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="typography-style-confirm-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `,l.appendChild(n),document.body.appendChild(l);let y=n.querySelector("#typography-style-confirm-cancel-btn"),g=n.querySelector("#typography-style-confirm-apply-btn"),m=n.querySelector(".modal-close"),v=()=>{l.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{l.parentNode&&l.remove(),o&&o.parentNode&&(o.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{o.parentNode&&o.remove()},200))},200)},b=()=>{l.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{l.parentNode&&l.remove(),o&&(o.style.display="flex")},200)};y.onclick=b,m.onclick=b,l.onclick=F=>{F.target===l&&b()},g.onclick=()=>{v(),ye(e.id,"\u23F3 Applying style...",!0),bo(e,t)}}function $n(e,t){let o=t.filter(d=>d.fontSize>=14);if(o.length===0){let d=ot(e);d?It(e,e.fontSize||12,d,null,null):alert("No text styles found with fontSize >= 14px. Please add font sizes to Font Size input or create text styles in Figma.");return}let l=document.createElement("div");l.className="modal-overlay",l.id="text-style-picker-modal-overlay";let n=document.createElement("div");n.className="modal-dialog",n.style.maxWidth="400px";let s=o.map(d=>`
        <div class="style-picker-item" data-style-id="${d.id}" data-font-size="${d.fontSize}" style="
          padding: 12px;
          margin-bottom: 8px;
          border: 2px solid #ddd;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: white;
          transition: all 0.2s;
        " onmouseover="this.style.borderColor='#0071e3'; this.style.boxShadow='0 2px 8px rgba(0,113,227,0.2)'" onmouseout="this.style.borderColor='#ddd'; this.style.boxShadow='none'">
          <div>
            <div style="font-weight: 600; font-size: 14px; color: #333;">${u(d.name)}</div>
            <div style="font-size: 12px; color: #666; margin-top: 4px;">
              ${u(d.fontFamily)} ${u(d.fontSize)}px ${u(d.fontWeight)}
            </div>
          </div>
          <div style="color: #28a745; font-weight: 600; font-size: 12px;">\u2713 ADA</div>
        </div>
      `).join("");n.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Choose Text Style</h2>
        <p class="modal-subtitle">Node: ${u(e.nodeName||"Unnamed")} - Select style with fontSize >= 14px</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current Font Size:</div>
          <div style="font-size: 16px; font-weight: 600; color: #333;">${e.fontSize||12}px</div>
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
          ${s}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="text-style-picker-modal-cancel-btn">Cancel</button>
      </div>
    `,l.appendChild(n),document.body.appendChild(l);let r=n.querySelector("#text-style-picker-modal-cancel-btn"),i=n.querySelector(".modal-close"),a=n.querySelectorAll(".style-picker-item"),p=()=>{l.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{l.parentNode&&l.remove()},200)};r.onclick=p,i.onclick=p,l.onclick=d=>{d.target===l&&p()},a.forEach(d=>{d.onclick=y=>{y.preventDefault(),y.stopPropagation();let g=d.getAttribute("data-style-id"),m=parseInt(d.getAttribute("data-font-size")),v=o.find(b=>b.id===g);v&&(l.style.display="none",It(e,e.fontSize||12,m,l,v))}})}function En(e,t){let o=document.getElementById("color-scale"),l=o&&o.value.trim()?o.value.split(",").map(b=>b.trim().toUpperCase()).filter(b=>b&&b.startsWith("#")):[],n=[];if(t.filter(b=>b.source==="variable").forEach(b=>{n.push({source:"Variable",name:b.name,hex:b.hex,id:b.id,variable:b.variable})}),t.filter(b=>b.source==="style").forEach(b=>{n.push({source:"Style",name:b.name,hex:b.hex,id:b.id,style:b.style})}),l.forEach(b=>{let F=_[b]||b;n.push({source:"Input",name:F,hex:b,id:null})}),n.length===0){alert("No colors available. Please add colors to Color input or create color styles/variables in Figma.");return}let s=e.backgroundColor||"#FFFFFF",r=e.minContrast||4.5,i=e.textColor||"#000000",a=document.createElement("div");a.className="modal-overlay",a.id="contrast-color-picker-modal-overlay";let p=document.createElement("div");p.className="modal-dialog",p.style.maxWidth="400px";let d=n.map(b=>{let F=Tt(b.hex,s),q=F>=r,k=q?"#28a745":"#ddd",$=`${u(b.name)} <span style="font-size: 11px; color: #666;">(${u(b.source)})</span>`,j=`<span style="color: ${q?"#28a745":"#dc3545"};">Contrast: ${F.toFixed(2)}:1 ${q?"\u2713":"\u2717"} (need >= ${r}:1)</span>`;return Jt(b.hex,$,k,j)}).join("");p.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Choose Color</h2>
        <p class="modal-subtitle">Node: ${u(e.nodeName||"Unnamed")} - Select color that passes contrast</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current Text Color:</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 32px; height: 32px; border-radius: 4px; background: ${u(i)}; border: 1px solid #ddd;"></div>
            <div style="font-family: 'SF Mono', Monaco, monospace; font-size: 13px; font-weight: 600;">${u(i)}</div>
            <div style="font-size: 11px; color: #dc3545;">Contrast: ${e.contrast?e.contrast.toFixed(2):"N/A"}:1 (fails)</div>
          </div>
          <div style="font-size: 11px; color: #666; margin-top: 4px;">Background: ${u(s)}</div>
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
          ${d}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="contrast-color-picker-modal-cancel-btn">Cancel</button>
      </div>
    `,a.appendChild(p),document.body.appendChild(a);let y=p.querySelector("#contrast-color-picker-modal-cancel-btn"),g=p.querySelector(".modal-close"),m=p.querySelectorAll(".color-picker-item"),v=()=>{a.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{a.parentNode&&a.remove()},200)};y.onclick=v,g.onclick=v,a.onclick=b=>{b.target===a&&v()},m.forEach(b=>{b.onclick=F=>{F.preventDefault(),F.stopPropagation();let q=b.getAttribute("data-color");a.style.display="none",go(e,i,q,a)}})}function po(e){parent.postMessage({pluginMessage:{type:"get-figma-text-styles",issueId:e.id}},"*"),window.pendingTextSizeIssue=e}function Ht(e){parent.postMessage({pluginMessage:{type:"get-figma-text-styles",issueId:e.id}},"*"),window.pendingSuggestTextSizeIssue=e}function It(e,t,o,l,n){let s=(E,M)=>{if(E===M)return 100;let X=20,ne=Math.abs(E-M);return Math.max(0,Math.round((1-ne/X)*100))},i=[14,16,18,20,24,28,32,36,40,48].map(E=>({size:E,similarity:s(t,E),diff:Math.abs(t-E)})).sort((E,M)=>o!==void 0&&E.size===o?-1:o!==void 0&&M.size===o?1:E.diff-M.diff).slice(0,5),a=i.length>0?i[0].size:o,p=(E,M)=>{let X=E.size>=14;return`
        <div class="text-size-option-item" data-size="${E.size}" style="
          padding: 10px 12px;
          margin-bottom: 6px;
          border: 2px solid ${M?"#0071e3":"#e0e0e0"};
          border-radius: 8px;
          cursor: pointer;
          background: ${M?"#e3f2fd":"white"};
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.15s;
        ">
          <input type="radio" name="text-size-option" ${M?"checked":""} style="margin: 0; cursor: pointer;" />
          <div style="
            width: 40px;
            height: 40px;
            border-radius: 6px;
            background: ${M?"#e3f2fd":"#f0f0f0"};
            border: 2px solid ${M?"#0071e3":"#ddd"};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 600;
            color: ${M?"#0071e3":"#666"};
            flex-shrink: 0;
          ">${E.size}</div>
          <div style="flex: 1;">
            <div style="font-weight: 600; font-size: 13px; color: #333;">${E.size}px</div>
            <div style="font-size: 10px; color: ${X?"#155724":"#721c24"};">
              ${X?"\u2713 ADA compliant":"\u26A0 Below minimum"}
            </div>
          </div>
          <span style="font-size: 11px; color: #666; background: #f0f0f0; padding: 2px 8px; border-radius: 10px;">${E.similarity}%</span>
        </div>
      `},d=document.createElement("div");d.className="modal-overlay",d.id="text-size-fix-confirm-modal-overlay";let y=document.createElement("div");y.className="modal-dialog",y.style.maxWidth="420px";let g=window.pendingTextSizeFixAllCallbacks||null,m=g&&g.progress?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${g.progress.current}/${g.progress.total}</div>`:"",v=n?`
      <div style="margin-top: 12px; padding: 10px; background: #e8f5e9; border-radius: 6px; border-left: 3px solid #28a745;">
        <div style="font-size: 11px; color: #666; margin-bottom: 4px;">\u{1F4DD} Text Style s\u1EBD \u0111\u01B0\u1EE3c \xE1p d\u1EE5ng:</div>
        <div style="font-weight: 600; font-size: 13px; color: #333;">${u(n.name)}</div>
        <div style="font-size: 10px; color: #666; margin-top: 4px;">
          ${u(n.fontFamily)} ${n.fontSize}px ${u(n.fontWeight)}
        </div>
      </div>
    `:"",b=i.map((E,M)=>p(E,M===0)).join("");y.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Apply Suggested Text Size</h2>
        <p class="modal-subtitle">Node: ${u(e.nodeName||"Unnamed")}</p>
      </div>
      ${m}
      <div class="modal-body">
        <div style="margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 6px; display: flex; align-items: center; gap: 10px;">
          <div style="
            width: 40px;
            height: 40px;
            border-radius: 4px;
            background: #f0f0f0;
            border: 1px solid #ddd;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 600;
            color: #666;
          ">${t}</div>
          <div>
            <div style="font-size: 11px; color: #666;">Current Size:</div>
            <div style="font-size: 14px; font-weight: 600;">${t}px <span style="font-size: 11px; color: #dc3545;">(Too small)</span></div>
          </div>
        </div>
        <div style="font-size: 12px; font-weight: 600; color: #333; margin-bottom: 8px;">
          Select a size to apply (Top 5 closest):
        </div>
        <div id="text-size-options-container" style="max-height: 280px; overflow-y: auto;">
          ${b}
        </div>
        ${v}
      </div>
      <div class="modal-footer">
        ${window.pendingTextSizeFixAllCallbacks?'<button class="modal-btn modal-btn-cancel" id="text-size-fix-ignore-btn" style="background: #6c757d; border-color: #6c757d; color: white;">Ignore</button>':""}
        <button class="modal-btn modal-btn-cancel" id="text-size-fix-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="text-size-fix-confirm-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `,d.appendChild(y),document.body.appendChild(d);let F=y.querySelector("#text-size-fix-confirm-cancel-btn"),q=y.querySelector("#text-size-fix-confirm-apply-btn"),k=y.querySelector("#text-size-fix-ignore-btn"),$=y.querySelector(".modal-close"),j=y.querySelector("#text-size-options-container"),L=g,W=E=>{a=E,j.querySelectorAll(".text-size-option-item").forEach(X=>{let c=parseInt(X.getAttribute("data-size"),10)===E;X.style.border=c?"2px solid #0071e3":"2px solid #e0e0e0",X.style.background=c?"#e3f2fd":"white";let ae=X.querySelector('input[type="radio"]');ae&&(ae.checked=c)})};(()=>{j.querySelectorAll(".text-size-option-item").forEach(M=>{M.onclick=X=>{X.preventDefault();let ne=parseInt(M.getAttribute("data-size"),10);W(ne)}})})();let N=()=>{d.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{d.parentNode&&d.remove(),l&&(l.style.display="block")},200)},ee=()=>{d.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{d.parentNode&&d.remove(),l&&l.parentNode&&(l.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{l.parentNode&&l.remove()},200))},200)};F.onclick=()=>{L&&L.onCancel?(ee(),window.pendingTextSizeFixAllCallbacks=null,L.onCancel()):N()},$.onclick=()=>{L&&L.onCancel?(ee(),window.pendingTextSizeFixAllCallbacks=null,L.onCancel()):N()},d.onclick=E=>{E.target===d&&(L&&L.onCancel?(ee(),window.pendingTextSizeFixAllCallbacks=null,L.onCancel()):N())},k&&(k.onclick=()=>{ee(),L&&L.onIgnore&&(window.pendingTextSizeFixAllCallbacks=null,L.onIgnore())}),q.onclick=()=>{ee(),ye(e.id,"\u23F3 Fixing text size...",!0),n&&n.id?parent.postMessage({pluginMessage:{type:"apply-figma-text-style",issue:e,styleId:n.id,styleName:n.name}},"*"):parent.postMessage({pluginMessage:{type:"fix-text-size-issue",issue:e,fontSize:a}},"*"),L&&L.onApply&&(window.pendingTextSizeFixAllCallbacks=null,L.onApply())}}function uo(e){parent.postMessage({pluginMessage:{type:"get-contrast-colors",issue:e}},"*"),window.pendingContrastIssue=e}function qt(e){let t=ct(e);if(!t){alert("No suitable color found that passes contrast requirements");return}go(e,e.textColor,t,null)}function go(e,t,o,l){let n=e.backgroundColor||"#FFFFFF",s=e.minContrast||4.5,r=(E,M)=>{let X=E.replace("#",""),ne=M.replace("#",""),c=parseInt(X.substr(0,2),16),ae=parseInt(X.substr(2,2),16),Z=parseInt(X.substr(4,2),16),z=parseInt(ne.substr(0,2),16),G=parseInt(ne.substr(2,2),16),fe=parseInt(ne.substr(4,2),16);return Math.sqrt(Math.pow(c-z,2)+Math.pow(ae-G,2)+Math.pow(Z-fe,2))},i=(E,M)=>{let ne=r(E,M);return Math.round((1-ne/441.67)*100)},p=Object.keys(_).map(E=>{let M=Tt(E,n);return{color:E,name:_[E]||E,contrast:M,passes:M>=s,similarity:i(t,E),distance:r(t,E)}}).filter(E=>E.passes).sort((E,M)=>o&&E.color===o?-1:o&&M.color===o?1:E.distance-M.distance).slice(0,5),d=p.length>0?p[0].color:o,y=(E,M)=>`
        <div class="contrast-color-option-item" data-color="${u(E.color)}" style="
          padding: 10px 12px;
          margin-bottom: 6px;
          border: 2px solid ${M?"#0071e3":"#e0e0e0"};
          border-radius: 8px;
          cursor: pointer;
          background: ${M?"#e3f2fd":"white"};
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.15s;
        ">
          <input type="radio" name="contrast-color-option" ${M?"checked":""} style="margin: 0; cursor: pointer;" />
          <div style="
            width: 36px;
            height: 36px;
            border-radius: 6px;
            background: ${u(E.color)};
            border: 2px solid ${M?"#0071e3":"#ddd"};
            flex-shrink: 0;
          "></div>
          <div style="flex: 1;">
            <div style="font-weight: 600; font-size: 13px; color: #333;">${u(E.name)}</div>
            <div style="font-size: 10px; color: #666; font-family: 'SF Mono', Monaco, monospace;">${u(E.color)}</div>
            <div style="font-size: 10px; color: #28a745; margin-top: 2px;">\u2713 ${E.contrast.toFixed(2)}:1</div>
          </div>
          <span style="font-size: 11px; color: #666; background: #f0f0f0; padding: 2px 8px; border-radius: 10px;">${E.similarity}%</span>
        </div>
      `,g=window.pendingContrastFixAllCallbacks||null,m=g&&g.progress?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${g.progress.current}/${g.progress.total}</div>`:"",v=document.createElement("div");v.className="modal-overlay",v.id="contrast-fix-confirm-modal-overlay";let b=document.createElement("div");b.className="modal-dialog",b.style.maxWidth="420px";let F=p.length>0?p.map((E,M)=>y(E,M===0)).join(""):`<div style="padding: 20px; text-align: center; color: #666;">No colors available that pass contrast requirements (>= ${s}:1)</div>`;b.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Apply Suggested Contrast Color</h2>
        <p class="modal-subtitle">Node: ${u(e.nodeName||"Unnamed")}</p>
      </div>
      ${m}
      <div class="modal-body">
        <div style="margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 6px;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <div style="
              width: 32px;
              height: 32px;
              border-radius: 4px;
              background: ${u(t)};
              border: 1px solid #ddd;
            "></div>
            <div>
              <div style="font-size: 11px; color: #666;">Current:</div>
              <div style="font-size: 12px; font-weight: 600; font-family: 'SF Mono', Monaco, monospace;">${u(t)}</div>
              <div style="font-size: 10px; color: #dc3545;">Contrast: ${e.contrast?e.contrast.toFixed(2):"N/A"}:1 \u2717</div>
            </div>
          </div>
          <div style="font-size: 10px; color: #666; padding: 4px 8px; background: #e0e0e0; border-radius: 4px; display: inline-block;">
            Background: ${u(n)} | Minimum: ${s}:1
          </div>
        </div>
        <div style="font-size: 12px; font-weight: 600; color: #333; margin-bottom: 8px;">
          Select a color to apply (Top 5 passing contrast):
        </div>
        <div id="contrast-color-options-container" style="max-height: 280px; overflow-y: auto;">
          ${F}
        </div>
      </div>
      <div class="modal-footer">
        ${window.pendingContrastFixAllCallbacks?'<button class="modal-btn modal-btn-cancel" id="contrast-fix-ignore-btn" style="background: #6c757d; border-color: #6c757d; color: white;">Ignore</button>':""}
        <button class="modal-btn modal-btn-cancel" id="contrast-fix-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="contrast-fix-confirm-apply-btn" style="background: #28a745; border-color: #28a745;" ${p.length===0?"disabled":""}>Apply</button>
      </div>
    `,v.appendChild(b),document.body.appendChild(v);let q=b.querySelector("#contrast-fix-confirm-cancel-btn"),k=b.querySelector("#contrast-fix-confirm-apply-btn"),$=b.querySelector("#contrast-fix-ignore-btn"),j=b.querySelector(".modal-close"),L=b.querySelector("#contrast-color-options-container"),W=g,ge=E=>{d=E,L.querySelectorAll(".contrast-color-option-item").forEach(X=>{let c=X.getAttribute("data-color")===E;X.style.border=c?"2px solid #0071e3":"2px solid #e0e0e0",X.style.background=c?"#e3f2fd":"white";let ae=X.querySelector('input[type="radio"]');ae&&(ae.checked=c)})};(()=>{L.querySelectorAll(".contrast-color-option-item").forEach(M=>{M.onclick=X=>{X.preventDefault();let ne=M.getAttribute("data-color");ge(ne)}})})();let ee=()=>{v.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{v.parentNode&&v.remove(),l&&(l.style.display="block")},200)};q.onclick=()=>{W&&W.onCancel?(ee(),window.pendingContrastFixAllCallbacks=null,W.onCancel()):ee()},j.onclick=()=>{W&&W.onCancel?(ee(),window.pendingContrastFixAllCallbacks=null,W.onCancel()):ee()},v.onclick=E=>{E.target===v&&(W&&W.onCancel?(ee(),window.pendingContrastFixAllCallbacks=null,W.onCancel()):ee())},$&&($.onclick=()=>{ee(),W&&W.onIgnore&&(window.pendingContrastFixAllCallbacks=null,W.onIgnore())}),k.onclick=()=>{p.length!==0&&(ee(),ye(e.id,"\u23F3 Fixing contrast...",!0),parent.postMessage({pluginMessage:{type:"fix-contrast-issue",issue:e,color:d}},"*"),W&&W.onApply&&(window.pendingContrastFixAllCallbacks=null,W.onApply()))}}function mo(e){try{if(ue[e.id]===!0){if(delete ue[e.id],S&&S.issues){let o=S.issues.find(l=>l.id===e.id);if(o){o.ignored=!1;let l=o.originalSeverity||(o.severity==="info"?"error":o.severity);o.severity=l,o.originalSeverity=void 0,e.severity=l,e.ignored=!1}}be(),fo(e,!1),dt(),parent.postMessage({pluginMessage:{type:"notify",message:"\u2705 Issue un-ignored"}},"*")}else{if(!confirm(`Ignore this contrast issue?

Node: ${e.nodeName||"Unnamed"}

This issue will be marked as "Pass with ignore custom" and won't be counted as an error.`))return;if(S&&S.issues){let o=S.issues.find(l=>l.id===e.id);o&&(o.originalSeverity||(o.originalSeverity=o.severity),o.ignored=!0,o.severity="info",e.ignored=!0,e.originalSeverity=o.originalSeverity,e.severity="info")}ue[e.id]=!0,be(),fo(e,!0),dt(),parent.postMessage({pluginMessage:{type:"notify",message:"\u2705 Issue ignored"}},"*")}}catch(t){console.error("Error in handleIgnoreIssue:",t),parent.postMessage({pluginMessage:{type:"notify",message:`\u274C Error: ${t.message}`}},"*")}}function fo(e,t){let o=document.querySelector(`.issue[data-issue-id="${e.id}"]`);if(o)if(t){let l=e.originalSeverity||"error";o.className=o.className.replace(/\b(error|warn)\b/g,"info");let n=o.querySelector(".issue-type");if(n){let r=n.querySelector(".issue-number");if(r){let i=r.textContent;n.innerHTML=`<span class="issue-number">${i}</span> \u2139\uFE0F INFO`}else n.innerHTML=n.innerHTML.replace(/❌|⚠️/g,"\u2139\uFE0F").replace(/ERROR|WARNING/g,"INFO")}if(!o.querySelector(".issue-ignored-tag")){let r=o.querySelector(".issue-body"),i=o.querySelector(".issue-node"),a=document.createElement("div");if(a.className="issue-ignored-tag",a.style.cssText="margin-top: 4px; padding: 4px 8px; background: #e3f2fd; color: #28a745; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-block;",a.textContent="\u2713 Pass with ignore custom",i)i.parentNode.insertBefore(a,i.nextSibling);else if(r)r.parentNode.insertBefore(a,r.nextSibling);else{let p=o.querySelector(".issue-header");p?p.parentNode.insertBefore(a,p.nextSibling):o.appendChild(a)}}let s=document.querySelector(`button.btn-ignore[data-id="${e.id}"]`);s&&(s.removeAttribute("disabled"),s.innerHTML="Ignored",s.style.cssText="padding: 6px 12px; border: 1px solid #28a745; background: #28a745; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s; color: white;")}else{let l=e.originalSeverity||(e.severity==="info"?"error":e.severity);o.className=o.className.replace(/\binfo\b/g,l);let n=o.querySelector(".issue-type");if(n){let i=l==="error"?"\u274C":l==="warn"?"\u26A0\uFE0F":"\u2139\uFE0F",a=l.toUpperCase(),p=n.querySelector(".issue-number");if(p){let d=p.textContent;n.innerHTML=`<span class="issue-number">${d}</span> ${i} ${a}`}else n.innerHTML=n.innerHTML.replace(/ℹ️/g,i).replace(/INFO/g,a)}let s=o.querySelector(".issue-ignored-tag");s&&s.remove();let r=document.querySelector(`button.btn-ignore[data-id="${e.id}"]`);r&&(r.removeAttribute("disabled"),r.innerHTML="Ignore",r.style.cssText="padding: 6px 12px; border: 1px solid #6c757d; background: #6c757d; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s; color: white;")}}function dt(){if(!S||!S.issues)return;let e=S.issues,t={error:e.filter(l=>l.severity==="error"&&!l.ignored).length,warn:e.filter(l=>l.severity==="warn"&&!l.ignored).length,total:e.length},o=document.querySelector(".results-header");if(o){let l=o.querySelector(".results-stats");l&&(l.innerHTML=`
          ${t.error>0?`<span class="stat error">${t.error} Error</span>`:""}
          ${t.warn>0?`<span class="stat warn">${t.warn} Warning</span>`:""}
          <span class="stat">${t.total} Total</span>
        `)}document.querySelectorAll(".issue-group").forEach(l=>{let n=l.querySelector(".badge");if(n){let s=l.getAttribute("data-issue-type");if(s){let i=e.filter(a=>a.type===s).filter(a=>a.ignored?!1:a.severity==="error"||a.severity==="warn").length;n.textContent=i}}})}function Mn(e){let t=e.message||"",o=t.match(/Padding\s+(\w+)\s+\((\d+)px\)/),l=null,n=null;if(o?(l=o[1],n=parseInt(o[2])):(o=t.match(/Gap\s+\(itemSpacing:\s+(\d+)px\)/),o&&(l="itemSpacing",n=parseInt(o[1]))),!o||!l||n===null){console.error("Cannot parse spacing issue message:",t),alert("Cannot determine spacing property from issue message. Message: "+t);return}let s=document.getElementById("spacing-scale");if(!s||!s.value.trim()){alert("No spacing scale defined. Please add spacing values to the Spacing input.");return}let r=s.value.split(",").map(i=>parseInt(i.trim(),10)).filter(i=>!isNaN(i)&&i>=0).sort((i,a)=>i-a);if(r.length===0){alert("No valid spacing values found in Spacing input.");return}tn(e,l,n,r)}function zn(e){let o=(e.message||"").match(/Color (#[0-9A-Fa-f]{6})/),l=o?o[1].toUpperCase():null;if(!l){alert("Cannot determine current color from issue message");return}let n=document.getElementById("color-scale");if(!n||!n.value.trim()){alert("No color scale defined. Please add colors to the Color input.");return}let s=n.value.split(",").map(r=>r.trim().toUpperCase()).filter(r=>r&&r.startsWith("#"));if(s.length===0){alert("No valid colors found in Color input.");return}on(e,l,s,_)}function Fn(e){var t;if(e.type==="typography-check"&&e.bestMatch){en(e,Q);return}if(ye(e.id,"\u23F3 Fixing...",!0),!e.bestMatch&&e.type!=="typography-check"){let o=prompt(`Cannot auto-fix this issue.

Issue: ${e.message}

Please provide fix instructions or press Cancel.`);if(o)parent.postMessage({pluginMessage:{type:"fix-issue",issue:e,manualFix:o}},"*");else{let l=document.querySelector(`.issue[data-issue-id="${e.id}"]`)||((t=document.querySelector(`button.btn-fix[data-id="${e.id}"]`))==null?void 0:t.closest(".issue"));if(l){let n=l.querySelector(".fix-message");n&&n.remove()}}return}parent.postMessage({pluginMessage:{type:"fix-issue",issue:e}},"*")}function yo(e,t){let o=document.createElement("div");o.className="modal-overlay",o.id="create-style-modal-overlay";let l=document.createElement("div");l.className="modal-dialog";let n=e.nodeName||"Unnamed";if(e.message&&e.message.includes("(")&&e.message.includes("nodes")){let d=e.message.match(/\((\d+) nodes\)/);d&&(n=`${n} (${d[1]} nodes)`)}l.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Create Style</h2>
        <p class="modal-subtitle">${u(n)}</p>
      </div>
      <div class="modal-body">
        <input 
          type="text" 
          class="modal-input" 
          id="style-name-input" 
          placeholder="Style Name" 
          value="${u(e.nodeName||"New Style")}"
          autofocus
        />
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="modal-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="modal-create-btn">Create</button>
      </div>
    `,o.appendChild(l),document.body.appendChild(o);let s=l.querySelector("#style-name-input"),r=l.querySelector("#modal-cancel-btn"),i=l.querySelector("#modal-create-btn"),a=l.querySelector(".modal-close");setTimeout(()=>{s.focus(),s.select()},100),s.onkeydown=d=>{d.key==="Enter"?(d.preventDefault(),i.click()):d.key==="Escape"&&(d.preventDefault(),r.click())};let p=()=>{o.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{o.parentNode&&o.remove()},200)};r.onclick=p,a.onclick=p,o.onclick=d=>{d.target===o&&p()},i.onclick=()=>{let d=s.value.trim();if(!d){s.focus(),s.style.borderColor="#ff3b30",setTimeout(()=>{s.style.borderColor="#0071e3"},2e3);return}p(),t&&t(d)}}function ho(e,t,o={}){if(console.log("[showSuggestApplyModal] Called with issue:",e,"styleName:",t,"options:",o),!e){console.error("[showSuggestApplyModal] Missing issue:",{issue:e,styleName:t});return}let{onApply:l,onIgnore:n,onCancel:s,showIgnore:r=!1,progress:i}=o,a=e.nodeProps||{},p=a.fontFamily||"Unknown",d=a.fontSize!==null&&a.fontSize!==void 0?a.fontSize:null,y=d!==null?`${d}px`:"Unknown",g=a.fontWeight||"Unknown",m=a.lineHeight||"Unknown",v=a.letterSpacing!==null&&a.letterSpacing!==void 0?a.letterSpacing:"Unknown",b=z=>z==null||z==="Unknown"?"":String(z).toLowerCase().trim(),F=z=>{let G=`typo_${b(p)}_${d}_${b(g)}_${b(m)}_${b(v)}_${z.id}`;return me(G,()=>{let fe=0;if(b(p)===b(z.fontFamily)&&(fe+=25),d!==null&&z.fontSize){let ke=Math.abs(d-z.fontSize);ke===0?fe+=30:ke<=2?fe+=25:ke<=4?fe+=20:ke<=8&&(fe+=10)}return b(g)===b(z.fontWeight)&&(fe+=20),b(m)===b(z.lineHeight)&&(fe+=15),b(v)===b(z.letterSpacing||"0")&&(fe+=10),fe})},q=[...Q].map(z=>Ze(Ye({},z),{similarity:F(z)})).sort((z,G)=>t&&z.name===t?-1:t&&G.name===t?1:G.similarity-z.similarity).slice(0,5);if(q.length===0){console.error("[showSuggestApplyModal] No typography styles available"),alert("No typography styles available");return}let k=q[0].id,$=(z,G)=>b(z)!==b(G),j=(z,G,fe)=>{let ke=$(p,z.fontFamily),Ee=$(y,`${z.fontSize}px`),Te=$(g,z.fontWeight),Me=$(m,z.lineHeight),nt=$(v,z.letterSpacing||"0%"),We="color: #155724;",je="color: #721c24; background: #f8d7da; padding: 2px 6px; border-radius: 4px; font-weight: 600;",Xe=fe===0;return`
        <div class="style-option-item" data-style-id="${z.id}" style="
          padding: 14px 16px;
          margin-bottom: 10px;
          border: 2px solid ${G?"#0071e3":"#e0e0e0"};
          border-radius: 10px;
          cursor: pointer;
          background: ${G?"#f8fbff":"white"};
          transition: all 0.15s;
          border-left: 4px solid ${G?"#0071e3":"#e0e0e0"};
        ">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
              <input type="radio" name="style-option" ${G?"checked":""} style="margin: 0; cursor: pointer; width: 18px; height: 18px;" />
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-weight: 700; font-size: 14px; color: #333;">${u(z.name)}</span>
                  ${Xe?'<span style="color: #f5a623;">\u2B50</span>':""}
                </div>
                <div style="font-size: 12px; color: #666; margin-top: 2px;">
                  ${u(z.fontFamily)} ${z.fontSize}px ${u(z.fontWeight)}
                </div>
              </div>
            </div>
            <div style="text-align: right;">
              ${Xe?'<div style="color: #0071e3; font-size: 11px; font-weight: 600;">Best Match</div>':""}
              <div style="font-size: 12px; color: #666; background: #f0f0f0; padding: 3px 10px; border-radius: 12px; margin-top: 2px;">${z.similarity}% match</div>
            </div>
          </div>
          <div style="margin-left: 28px; padding: 0 12px; background: #f8f9fa; border-radius: 6px;">
            <div style="font-size: 11px; font-weight: 600; color: #333; margin-bottom: 8px;">Details:</div>
            <div style="font-size: 11px; color: #555; line-height: 1.2;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="color: #888; min-width: 90px;">\u2022 Font Family:</span>
                <span style="${ke?je:We}">${ke?"\u26A0":"\u2713"} ${u(z.fontFamily)}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="color: #888; min-width: 90px;">\u2022 Font Size:</span>
                <span style="${Ee?je:We}">${Ee?"\u26A0":"\u2713"} ${z.fontSize}px</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="color: #888; min-width: 90px;">\u2022 Font Weight:</span>
                <span style="${Te?je:We}">${Te?"\u26A0":"\u2713"} ${u(z.fontWeight)}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="color: #888; min-width: 90px;">\u2022 Line Height:</span>
                <span style="${Me?je:We}">${Me?"\u26A0":"\u2713"} ${u(z.lineHeight)}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="color: #888; min-width: 90px;">\u2022 Letter Spacing:</span>
                <span style="${nt?je:We}">${nt?"\u26A0":"\u2713"} ${u(z.letterSpacing||"0%")}</span>
              </div>
            </div>
          </div>
        </div>
      `},L=document.createElement("div");L.className="modal-overlay",L.id="suggest-apply-modal-overlay";let W=document.createElement("div");W.className="modal-dialog",W.style.maxWidth="480px";let ge=i?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${i.current}/${i.total}</div>`:"",N=q.map((z,G)=>j(z,G===0,G)).join("");W.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Apply Suggested Style</h2>
        <p class="modal-subtitle">Node: ${u(e.nodeName||"Unnamed")}</p>
      </div>
      ${ge}
      <div class="modal-body">
        <div style="margin-bottom: 12px; padding: 12px; background: #fff8e6; border-radius: 8px; border-left: 4px solid #f5a623;">
          <div style="font-size: 11px; font-weight: 600; color: #666; margin-bottom: 6px;">Current Node Properties:</div>
          <div style="font-size: 12px; color: #333; line-height: 1.6;">
            <div><strong>Font:</strong> ${u(p)} \u2022 ${u(y)} \u2022 ${u(g)}</div>
            <div><strong>Line Height:</strong> ${u(m)} \u2022 <strong>Letter Spacing:</strong> ${u(v)}</div>
          </div>
        </div>
        <div style="font-size: 12px; font-weight: 600; color: #333; margin-bottom: 10px;">
          Select a style to apply (Top 5 matches):
        </div>
        <div id="style-options-container" style="max-height: 400px; overflow-y: auto;">
          ${N}
        </div>
      </div>
      <div class="modal-footer">
        ${r?'<button class="modal-btn modal-btn-cancel" id="suggest-modal-ignore-btn" style="background: #6c757d; border-color: #6c757d; color: white;">Ignore</button>':""}
        <button class="modal-btn modal-btn-cancel" id="suggest-modal-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="suggest-modal-apply-btn" style="background: #28a745; border-color: #28a745;">Apply Style</button>
      </div>
    `,L.appendChild(W),document.body.appendChild(L);let ee=W.querySelector("#suggest-modal-cancel-btn"),E=W.querySelector("#suggest-modal-apply-btn"),M=W.querySelector("#suggest-modal-ignore-btn"),X=W.querySelector(".modal-close"),ne=W.querySelector("#style-options-container"),c=z=>{k=z,ne.querySelectorAll(".style-option-item").forEach(fe=>{let Ee=fe.getAttribute("data-style-id")===String(z);fe.style.border=Ee?"2px solid #0071e3":"2px solid #e0e0e0",fe.style.borderLeft=Ee?"4px solid #0071e3":"4px solid #e0e0e0",fe.style.background=Ee?"#f8fbff":"white";let Te=fe.querySelector('input[type="radio"]');Te&&(Te.checked=Ee)})};(()=>{ne.querySelectorAll(".style-option-item").forEach(G=>{G.onclick=fe=>{fe.preventDefault();let ke=G.getAttribute("data-style-id");c(ke)}})})();let Z=()=>{L.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{L.parentNode&&L.remove()},200)};ee.onclick=()=>{Z(),r&&o.onCancel&&typeof o.onCancel=="function"&&o.onCancel()},X.onclick=()=>{Z(),r&&o.onCancel&&typeof o.onCancel=="function"&&o.onCancel()},L.onclick=z=>{z.target===L&&(Z(),r&&o.onCancel&&typeof o.onCancel=="function"&&o.onCancel())},E.onclick=()=>{let z=q.find(G=>String(G.id)===String(k));if(!z){console.error("[showSuggestApplyModal] Selected style not found:",k);return}Z(),ye(e.id,"\u23F3 Applying style...",!0),z.styleId?parent.postMessage({pluginMessage:{type:"apply-figma-text-style",issue:e,styleId:z.styleId,styleName:z.name}},"*"):parent.postMessage({pluginMessage:{type:"apply-typography-style",issue:e,style:z}},"*"),l&&typeof l=="function"&&l()},M&&(M.onclick=()=>{Z(),n&&typeof n=="function"&&n()})}function Tn(e,t){if(console.log("[handleFixAllWithSuggestFix] Called with type:",e,"issues:",t),!t||t.length===0){console.log("[handleFixAllWithSuggestFix] No issues to process"),alert("No issues to process");return}console.log("[handleFixAllWithSuggestFix] Processing",t.length,"issues");let o=0,l=0,n=0,s=!1;function r(){let p=`\u2705 \u0110\xE3 xong!

\u0110\xE3 x\u1EED l\xFD ${o} item(s):
\u2022 Applied: ${l}
\u2022 Ignored: ${n}`;alert(p)}function i(){if(s||o>=t.length){r();return}let a=t[o];console.log("[Fix All] Processing issue:",o+1,"of",t.length,"Issue:",a),console.log("[Fix All] Issue type:",a.type,"bestMatch:",a.bestMatch),o++,parent.postMessage({pluginMessage:{type:"select-node",id:a.id}},"*");let p={current:o,total:t.length};if(a.type==="typography-check"||a.type==="typography-style"){if(console.log("[Fix All] Typography issue - checking bestMatch:",a.bestMatch),!a.bestMatch||!a.bestMatch.name||typeof a.bestMatch.name!="string"||a.bestMatch.name.trim().length===0){console.warn("[Fix All] Issue missing bestMatch or bestMatch.name, skipping:",a),console.warn("[Fix All] Issue bestMatch value:",a.bestMatch),n++,i();return}let d=a.bestMatch&&a.bestMatch.name?a.bestMatch.name:null;if(console.log("[Fix All] Extracted styleName:",d),!d||typeof d!="string"||d.trim().length===0){console.warn("[Fix All] Issue bestMatch.name is invalid, skipping:",a),console.warn("[Fix All] styleName value:",d),n++,i();return}console.log("[Fix All] Calling showSuggestApplyModal with issue:",a.id,"styleName:",d),ho(a,d,{showIgnore:!0,progress:p,onApply:()=>{l++,setTimeout(()=>{i()},500)},onIgnore:()=>{n++,i()},onCancel:()=>{s=!0,r()}})}else if(a.type==="color"){let d=ft(a),g=(a.message||"").match(/Color (#[0-9A-Fa-f]{6})/),m=g?g[1].toUpperCase():null;Nn(a,m,d,{progress:p,onApply:()=>{l++,setTimeout(()=>{i()},500)},onIgnore:()=>{n++,i()},onCancel:()=>{s=!0,r()}})}else if(a.type==="spacing"){let d=yt(a),g=(a.message||"").match(/Padding\s+(\w+)\s+\((\d+)px\)/);if(g){let m=g[1],v=parseInt(g[2]);Bn(a,m,v,d,{progress:p,onApply:()=>{l++,setTimeout(()=>{i()},500)},onIgnore:()=>{n++,i()},onCancel:()=>{s=!0,r()}})}else n++,i()}else a.type==="autolayout"?gn(a,{progress:p,onApply:()=>{l++,setTimeout(()=>{i()},500)},onIgnore:()=>{n++,i()},onCancel:()=>{s=!0,r()}}):a.type==="position"?bn(a,{progress:p,onApply:()=>{l++,setTimeout(()=>{i()},500)},onIgnore:()=>{n++,i()},onCancel:()=>{s=!0,r()}}):a.type==="group"?yn(a,{progress:p,onApply:()=>{l++,setTimeout(()=>{i()},500)},onIgnore:()=>{n++,i()},onCancel:()=>{s=!0,r()}}):a.type==="empty-frame"?xn(a,{progress:p,onApply:()=>{l++,setTimeout(()=>{i()},500)},onIgnore:()=>{n++,i()},onCancel:()=>{s=!0,r()}}):a.type==="text-size-mobile"?(window.pendingTextSizeFixAllCallbacks={progress:p,onApply:()=>{l++,setTimeout(()=>{i()},500)},onIgnore:()=>{n++,i()},onCancel:()=>{s=!0,r()}},Ht(a)):a.type==="contrast"?(window.pendingContrastFixAllCallbacks={progress:p,onApply:()=>{l++,setTimeout(()=>{i()},500)},onIgnore:()=>{n++,i()},onCancel:()=>{s=!0,r()}},qt(a)):(n++,i())}i()}function Nn(e,t,o,l={}){let n=Object.keys(_);Bt(e,t,o,_,n,Ze(Ye({},l),{showIgnore:!0}))}function Bn(e,t,o,l,n={}){let s=document.getElementById("spacing-scale"),r=[0,4,8,12,16,24,32,40,48,64,72,80,88,96];if(s&&s.value.trim()){let i=s.value.split(",").map(a=>parseInt(a.trim(),10)).filter(a=>!isNaN(a));i.length>0&&(r=i)}Nt(e,t,o,l,r,Ze(Ye({},n),{showIgnore:!0}))}function bo(e,t){if(!e||!t){console.error("handleApplyFigmaTextStyle: missing issue or style");return}ye(e.id,"\u23F3 Applying style...",!0),parent.postMessage({pluginMessage:{type:"apply-figma-text-style",issue:e,styleId:t.id,styleName:t.name}},"*")}function Pt(e,t){if(!e||!t){console.error("handleApplyTypographyStyle: missing issue or styleName");return}ho(e,t)}function vo(e){if(console.log("handleCreateTextStyle called",e),!e){console.error("handleCreateTextStyle: issue is null/undefined");return}yo(e,t=>{console.log("handleCreateTextStyle: sending message",{type:"create-text-style",issueId:e.id,styleName:t}),ye(e.id,"\u23F3 Creating style...",!0),parent.postMessage({pluginMessage:{type:"create-text-style",issue:e,styleName:t}},"*")})}function ol(e,t){if(e==="typography-style"){let n={nodeName:`${t.length} text node(s)`,message:`Found ${t.length} text node(s) without text style`};yo(n,s=>{t.forEach(r=>{ye(r.id,"\u23F3 Creating style...",!0)}),parent.postMessage({pluginMessage:{type:"create-text-style-all",issues:t,styleName:s}},"*")});return}let o=t.filter(n=>n.bestMatch&&n.type==="typography-check"),l=t.filter(n=>!n.bestMatch||n.type!=="typography-check");if(o.length===0){alert(`No auto-fixable issues found in ${wt(e)}.

All ${t.length} issues require manual intervention.`);return}l.length>0&&!confirm(`Found ${o.length} auto-fixable issues and ${l.length} issues that require manual fix.

Do you want to auto-fix the ${o.length} issues now?

The ${l.length} issues will need to be fixed manually.`)||parent.postMessage({pluginMessage:{type:"fix-all-issues",issues:o,issueType:e}},"*")}function An(e){console.log("filterAndSearchIssues called",{totalIssues:e.length,currentFilter:Le,currentSearch:Ce});let t=e;if(Le!=="all"&&(t=t.filter(o=>o.severity===Le),console.log("After severity filter:",t.length)),Ce.trim()){let o=Ce.toLowerCase();t=t.filter(l=>{let n=(l.message||"").toLowerCase(),s=(l.nodeName||"").toLowerCase(),r=(l.type||"").toLowerCase();return n.includes(o)||s.includes(o)||r.includes(o)}),console.log("After search filter:",t.length)}return console.log("Final filtered issues:",t.length),t}function Qe(e=[],t=!1,o={}){let{skipSave:l=!1,restoreTimestamp:n=null}=o;De("issues"),document.getElementById("issues-count").textContent=e.length,e&&Array.isArray(e)&&e.forEach(k=>{ue[k.id]===!0&&(k.ignored=!0,k.originalSeverity||(k.originalSeverity=k.severity),k.severity="info")});let s=S.issues!==e;S.issues=e;let r=n||new Date().toISOString();S.timestamp=r,bt=!1,(t||s)&&(console.log("Resetting filters for new data"),Le="all",Ve="all",Ue&&(Ue.value=""),Ce="",Be&&(Be.style.display="none"),we&&we.length>0&&we.forEach(k=>{k.classList.remove("active"),k.getAttribute("data-filter")==="all"&&k.classList.add("active")}));let i=document.getElementById("filter-controls"),a=document.getElementById("color-type-filter"),p=document.getElementById("filter-buttons");i.style.display=e.length>0?"flex":"none",a.style.display="none",p.style.display="flex";let d=document.getElementById("export-group");d.style.display=e.length>0?"flex":"none",console.log("About to filter with:",{currentFilter:Le,currentSearch:Ce});let y=An(e),g=new Set;if(s||(document.querySelectorAll(".issue-group").forEach($=>{let j=$.getAttribute("data-issue-type");j&&!$.classList.contains("collapsed")&&g.add(j)}),console.log("Saved expanded groups:",Array.from(g))),kt("issues"),y.length===0&&e.length===0){oe.innerHTML=`
              <div class="empty-state success">
                <div class="icon">\u2705</div>
                <p><strong>No issues found!</strong></p>
                <p style="margin-top: 8px; font-size: 12px;">Your design passed all configured checks.</p>
              </div>
            `;return}if(y.length===0&&e.length>0&&Le!=="all"){oe.innerHTML=`
              <div class="empty-state">
                <div class="icon">\u{1F50D}</div>
                <p><strong>No results found</strong></p>
                <p style="margin-top: 8px; font-size: 12px;">Try changing the filter or search keyword.</p>
              </div>
            `;return}let m={error:y.filter(k=>k.severity==="error"&&!k.ignored).length,warn:y.filter(k=>k.severity==="warn"&&!k.ignored).length,total:y.length,originalTotal:e.length},v=document.createElement("div");v.className="results-header",v.innerHTML=`
            <h3>Check Result</h3>
            <div class="results-stats">
              ${m.error>0?`<span class="stat error">${m.error} Error</span>`:""}
              ${m.warn>0?`<span class="stat warn">${m.warn} Warning</span>`:""}
              <span class="stat">${m.total} Total</span>
              ${m.originalTotal!==m.total?`<span class="stat" style="opacity: 0.6;">(${m.originalTotal} total)</span>`:""}
            </div>
          `,oe.appendChild(v);let b=y.reduce((k,$)=>(k[$.type]=k[$.type]||[],k[$.type].push($),k),{}),F=e.reduce((k,$)=>(k[$.type]=k[$.type]||[],k[$.type].push($),k),{}),q=["naming","autolayout","spacing","color","typography","typography-style","typography-check","line-height","position","duplicate","group","component","empty-frame","nested-group","contrast","text-size-mobile"];for(let k of q){let $=b[k]||[],j=$.length,L=$.filter(c=>c.ignored?!1:c.severity==="error"||c.severity==="warn").length;if(j===0&&e.length===0||j===0&&Le!=="all")continue;let W=document.createElement("div"),ge=g.has(k);W.className=ge?"issue-group":"issue-group collapsed",W.setAttribute("data-issue-type",k);let N=document.createElement("div");N.className="issue-group-header";let ee=(F[k]||[]).some(c=>{try{if(!c)return!1;switch(c.type){case"color":return ft(c)!==null;case"spacing":return yt(c)!==null;case"autolayout":return typeof it=="function"&&it(c)!==null;case"text-size-mobile":return typeof ot=="function"&&ot(c)!==null;case"contrast":return typeof ct=="function"&&ct(c)!==null;case"typography-style":case"typography-check":let ae=c.bestMatch&&c.bestMatch!==null&&c.bestMatch!==void 0&&c.bestMatch.name&&typeof c.bestMatch.name=="string"&&c.bestMatch.name.trim().length>0&&St(c);return k==="typography-style"&&console.log("[hasSuggestFixButton] Typography-style issue",c.id,"hasBestMatch:",ae,"bestMatch:",c.bestMatch),ae;case"position":return typeof tt=="function"&&tt(c)!==null;case"duplicate":case"component":return typeof at=="function"&&at(c)!==null;case"group":return!0;case"empty-frame":return typeof rt=="function"&&rt(c)!==null;default:return!1}}catch(ae){return console.error("[hasSuggestFixButton] Error checking issue:",c,ae),!1}});k==="typography-style"&&console.log("[hasSuggestFixButton] Type:",k,"hasSuggestFixButton:",ee,"allGrouped[type]:",F[k]),N.innerHTML=`
              <div class="issue-group-header-left">
                <button class="issue-group-toggle" type="button">
                  <span class="issue-group-toggle-icon">\u25B6</span>
                </button>
                <h4>${Kt(k)} ${wt(k)}</h4>
                <span class="badge">${L}</span>
              </div>
              ${j>0&&k!=="typography"&&k!=="line-height"&&k!=="naming"&&k!=="component"&&k!=="duplicate"&&ee?`<button class="btn-fix-all" data-type="${k}">Fix all now</button>`:""}
            `;let E=N.querySelector(".issue-group-toggle"),M=()=>{W.classList.contains("collapsed")?(W.classList.remove("collapsed"),ne.style.display="block",setTimeout(()=>{ne.style.opacity="1"},10)):(ne.style.opacity="0",setTimeout(()=>{W.classList.add("collapsed"),ne.style.display="none"},200))};E.onclick=c=>{c.stopPropagation(),M()},N.onclick=c=>{c.target!==E&&!E.contains(c.target)&&M()};let X=N.querySelector(".btn-fix-all");console.log("[Fix All] Setting up button for type:",k,"btnFixAll found:",!!X),X?X.onclick=c=>{try{console.log("[Fix All] ========== BUTTON CLICKED =========="),console.log("[Fix All] Button clicked for type:",k),console.log("[Fix All] Event:",c),c.preventDefault(),c.stopPropagation(),console.log("[Fix All] All issues in group:",F[k]),console.log("[Fix All] allGrouped[type] length:",(F[k]||[]).length);let ae=(F[k]||[]).filter(Z=>{if(!Z)return console.log("[Fix All] Filter: issue is null/undefined"),!1;switch(console.log("[Fix All] Filter: checking issue",Z.id,"type:",Z.type,"bestMatch:",Z.bestMatch),Z.type){case"color":return ft(Z)!==null;case"spacing":return yt(Z)!==null;case"autolayout":return typeof it=="function"&&it(Z)!==null;case"text-size-mobile":return typeof ot=="function"&&ot(Z)!==null;case"contrast":return typeof ct=="function"&&ct(Z)!==null;case"typography-style":case"typography-check":let z=Z.bestMatch&&Z.bestMatch!==null&&Z.bestMatch!==void 0&&Z.bestMatch.name&&typeof Z.bestMatch.name=="string"&&Z.bestMatch.name.trim().length>0&&St(Z);return console.log("[Fix All] Filter: typography issue",Z.id,"hasValidBestMatch:",z,"bestMatch:",Z.bestMatch),z;case"position":return typeof tt=="function"&&tt(Z)!==null;case"duplicate":case"component":return typeof at=="function"&&at(Z)!==null;case"group":return!0;case"empty-frame":return typeof rt=="function"&&rt(Z)!==null;default:return!1}});if(console.log("[Fix All] Filtered issues with suggest fix:",ae),console.log("[Fix All] Issues count:",ae.length),console.log("[Fix All] Filtered issues count:",ae.length),ae.length===0){console.log("[Fix All] No issues with suggest fix available"),alert("No issues with suggest fix available");return}console.log("[Fix All] Starting handleFixAllWithSuggestFix with",ae.length,"issues"),Tn(k,ae)}catch(ae){console.error("[Fix All] ERROR in button onclick:",ae),console.error("[Fix All] Error stack:",ae.stack),alert("Error: "+ae.message)}}:console.log("[Fix All] Button not found for type:",k),W.appendChild(N);let ne=document.createElement("div");if(ne.className="issue-group-content",ge?(ne.style.display="block",ne.style.opacity="1"):ne.style.display="none",j===0){let c=document.createElement("div");c.className="issue info",c.style.opacity="0.7",c.innerHTML=`
                <div class="issue-header">
                  <div>
                    <span class="issue-type">\u2705 PASSED</span>
                    <div class="issue-body">No issues in this type.</div>
                  </div>
                </div>
              `,ne.appendChild(c)}else b[k].forEach((c,ae)=>{let Z=ae+1,z=ue[c.id]===!0;if(z&&(c.originalSeverity||(c.originalSeverity=c.severity),c.severity="info",c.ignored=!0),c.type==="typography-check"){let H=document.createElement("div");ne.appendChild(H);let re=cn(c);if(re){let he=document.createElement("span");he.className="issue-number",he.textContent=`#${Z}`,he.style.cssText="position: absolute; left: 8px; top: 8px; font-weight: bold; opacity: 0.5; font-size: 11px;",re.style.position="relative",re.style.paddingLeft="40px",re.insertBefore(he,re.firstChild),ne.replaceChild(re,H)}return}let G=document.createElement("div"),fe=z?"info":c.severity;G.className=`issue ${fe}`,G.setAttribute("data-issue-id",c.id);let ke=u(c.message);if(c.type==="contrast"){let H=[];if(c.textColor&&H.push(`Text color: <code style="background: ${u(c.textColor)}; padding: 2px 6px; border-radius: 3px; color: ${ht(c.textColor)};">${u(c.textColor)}</code> (${c.textColorNode||c.nodeName||"Unnamed"})`),c.backgroundColor){let re="Background:",he="",Ne="";c.isGradient&&c.gradientString?(re="Background (gradient):",he=`<code style="background: ${u(c.backgroundColor)}; padding: 2px 6px; border-radius: 3px; color: ${ht(c.backgroundColor)}; font-family: 'SF Mono', Monaco, monospace; font-size: 11px;">${u(c.gradientString)}</code>`,Ne=" <span style='font-size: 11px; color: #999;'>(average: "+u(c.backgroundColor)+")</span>"):he=`<code style="background: ${u(c.backgroundColor)}; padding: 2px 6px; border-radius: 3px; color: ${ht(c.backgroundColor)};">${u(c.backgroundColor)}</code>`,c.fromSibling&&(Ne+=" <span style='font-size: 11px; color: #3b82f6;'>(from sibling layer)</span>"),H.push(`${re} ${he}${Ne} (${c.backgroundColorNode||"Unknown"})`)}H.length>0&&(ke+=`<div style="margin-top: 8px; font-size: 12px; color: #666;">${H.join(" | ")}</div>`)}G.innerHTML=`
                <div class="issue-header">
                  <div>
                    <span class="issue-type">
                      <span class="issue-number">#${Z}</span>
                      ${rn(z?"info":c.severity)} ${z?"INFO":c.severity.toUpperCase()}
                    </span>
                    <div class="issue-body">${ke}</div>
                    ${c.nodeName?`<div class="issue-node">Node: ${u(c.nodeName)}</div>`:""}
                    ${c.type==="typography"||c.type==="line-height"?`<div style="margin-top: 8px; padding: 8px 12px; background: #fff3cd; border-left: 3px solid #ffc107; border-radius: 4px; font-size: 12px; color: #856404; line-height: 1.5;"><strong>Note:</strong> Check 'Typography Style Match' to resolve this issue.</div>`:""}
                    ${c.ignored?'<div class="issue-ignored-tag" style="margin-top: 4px; padding: 4px 8px; background: #e3f2fd; color: #1976d2; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-block;">\u2713 Pass with ignore custom</div>':""}
                  </div>
                  <div class="issue-actions">
                    <button class="btn-select" data-id="${c.id}">Select</button>
                    ${c.type==="color"?`
                      ${ft(c)?`<button class="btn-suggest-fix" data-id="${c.id}">Suggest Fix now</button>`:""}
                      <button class="btn-fix" data-id="${c.id}">Select Color</button>
                    `:""}
                    ${c.type==="spacing"?`
                      ${yt(c)?`<button class="btn-suggest-fix" data-id="${c.id}">Suggest Fix now</button>`:""}
                      <button class="btn-fix" data-id="${c.id}">Select Spacing</button>
                    `:""}
                    ${c.type==="autolayout"?`
                      ${it(c)?`<button class="btn-suggest-fix" data-id="${c.id}">Suggest Fix now</button>`:""}
                      <button class="btn-fix" data-id="${c.id}">Select</button>
                    `:""}
                    ${c.type==="text-size-mobile"?`
                      ${ot(c)?`<button class="btn-suggest-fix" data-id="${c.id}">Suggest Fix now</button>`:""}
                      <button class="btn-fix" data-id="${c.id}">Select Style</button>
                    `:""}
                    ${c.type==="contrast"?`
                      ${ct(c)?`<button class="btn-suggest-fix" data-id="${c.id}">Suggest Fix now</button>`:""}
                      <button class="btn-fix" data-id="${c.id}">Select Color</button>
                      <button class="btn-ignore" data-id="${c.id}" ${c.ignored?'style="background: #28a745; border-color: #28a745;"':""}>${c.ignored?"Ignored":"Ignore"}</button>
                    `:""}
                    ${c.type==="typography-style"?`
                      ${c.bestMatch&&c.bestMatch.name&&St(c)?`
                        <button class="btn-suggest-fix" data-id="${c.id}" data-style-name="${u(c.bestMatch.name)}">Suggest Fix now</button>
                      `:""}
                      <button class="btn-fix" data-id="${c.id}">Select Style</button>
                      <button class="btn-create-style" data-id="${c.id}" data-issue-type="${c.type}">Create Style</button>
                    `:""}
                    ${c.type==="position"?`
                      ${tt(c)?`<button class="btn-suggest-fix" data-id="${c.id}">Suggest Fix now</button>`:""}
                      <button class="btn-remove-layer" data-id="${c.id}">Remove Layer</button>
                    `:""}
                    ${(c.severity==="error"||c.severity==="warn")&&c.type!=="position"?`
                      <button class="btn-remove-layer" data-id="${c.id}">Remove Layer</button>
                    `:""}
                    ${c.type==="duplicate"?`
                      ${at(c)?`<button class="btn-suggest-fix" data-id="${c.id}">Suggest Fix now</button>`:""}
                      <button class="btn-select-component" data-id="${c.id}">Select Component</button>
                      <button class="btn-create-component" data-id="${c.id}">Create New Component</button>
                    `:""}
                    ${c.type==="component"?`
                      ${at(c)?`<button class="btn-suggest-fix" data-id="${c.id}">Suggest Fix now</button>`:""}
                      <button class="btn-select-component" data-id="${c.id}">Select Component</button>
                      <button class="btn-create-component" data-id="${c.id}">Create New Component</button>
                    `:""}
                    ${c.type==="group"?`
                      <button class="btn-suggest-fix" data-id="${c.id}">Suggest Fix now</button>
                    `:""}
                    ${c.type==="naming"?`
                      <button class="btn-rename" data-id="${c.id}">Rename</button>
                    `:""}
                    ${c.type==="empty-frame"?`
                      ${rt(c)?`<button class="btn-suggest-fix" data-id="${c.id}">Suggest Fix now</button>`:""}
                    `:""}
                  </div>
                </div>
              `,ne.appendChild(G),G.setAttribute("data-issue-id",c.id),G.setAttribute("data-issue-type",c.type);let Ee=G.querySelector("button.btn-select");Ee&&(Ee.onclick=()=>{document.querySelectorAll(".btn-select.active").forEach(H=>H.classList.remove("active")),document.querySelectorAll(".issue.selected").forEach(H=>H.classList.remove("selected")),Ee.classList.add("active"),G.classList.add("selected"),parent.postMessage({pluginMessage:{type:"select-node",id:c.id}},"*")});let Te=G.querySelector("button.btn-fix");Te&&(c.type==="color"?Te.onclick=()=>{zn(c)}:c.type==="spacing"?Te.onclick=()=>{Mn(c)}:c.type==="text-size-mobile"?Te.onclick=H=>{H.preventDefault(),H.stopPropagation(),console.log("Text Size Fix button clicked",c),typeof po=="function"?po(c):(console.error("handleFixTextSizeIssue is not a function"),alert("Error: handleFixTextSizeIssue function not found"))}:c.type==="contrast"?Te.onclick=H=>{H.preventDefault(),H.stopPropagation(),console.log("Contrast Fix button clicked",c),typeof uo=="function"?uo(c):(console.error("handleFixContrastIssue is not a function"),alert("Error: handleFixContrastIssue function not found"))}:Te.onclick=()=>{Fn(c)});let Me=G.querySelector("button.btn-suggest-fix");Me&&(c.type==="color"?Me.onclick=()=>{dn(c)}:c.type==="spacing"?Me.onclick=()=>{pn(c)}:c.type==="autolayout"?Me.onclick=H=>{H.preventDefault(),H.stopPropagation(),console.log("Autolayout Suggest Fix button clicked",c),typeof Qt=="function"?Qt(c):(console.error("handleSuggestFixAutolayout is not a function"),alert("Error: handleSuggestFixAutolayout function not found"))}:c.type==="text-size-mobile"?Me.onclick=H=>{H.preventDefault(),H.stopPropagation(),console.log("Text Size Suggest Fix button clicked",c),typeof Ht=="function"?Ht(c):(console.error("handleSuggestFixTextSize is not a function"),alert("Error: handleSuggestFixTextSize function not found"))}:c.type==="position"?Me.onclick=H=>{H.preventDefault(),H.stopPropagation(),console.log("Position Suggest Fix button clicked",c),typeof to=="function"?to(c):(console.error("handleSuggestFixPosition is not a function"),alert("Error: handleSuggestFixPosition function not found"))}:c.type==="duplicate"||c.type==="component"?Me.onclick=H=>{H.preventDefault(),H.stopPropagation(),console.log("Component Suggest Fix button clicked",c),typeof lo=="function"?lo(c):(console.error("handleSuggestFixComponent is not a function"),alert("Error: handleSuggestFixComponent function not found"))}:c.type==="contrast"?Me.onclick=H=>{H.preventDefault(),H.stopPropagation(),console.log("Contrast Suggest Fix button clicked",c),typeof qt=="function"?qt(c):(console.error("handleSuggestFixContrast is not a function"),alert("Error: handleSuggestFixContrast function not found"))}:c.type==="group"?Me.onclick=H=>{H.preventDefault(),H.stopPropagation(),console.log("Group Suggest Fix button clicked",c),typeof eo=="function"?eo(c):(console.error("handleSuggestFixGroup is not a function"),alert("Error: handleSuggestFixGroup function not found"))}:c.type==="empty-frame"&&(Me.onclick=H=>{H.preventDefault(),H.stopPropagation(),console.log("Empty Frame Suggest Fix button clicked",c),typeof oo=="function"?oo(c):(console.error("handleSuggestFixEmptyFrame is not a function"),alert("Error: handleSuggestFixEmptyFrame function not found"))}));let nt=G.querySelector("button.btn-select-component");nt&&(c.type==="duplicate"||c.type==="component")&&(function(H){nt.onclick=re=>{re.preventDefault(),re.stopPropagation(),console.log("Select Component button clicked",H),typeof so=="function"?so(H):(console.error("handleSelectComponent is not a function"),alert("Error: handleSelectComponent function not found"))}})(c);let We=G.querySelector("button.btn-create-component");We&&(c.type==="duplicate"||c.type==="component")&&(function(H){We.onclick=re=>{re.preventDefault(),re.stopPropagation(),console.log("Create Component button clicked",H),typeof io=="function"?io(H):(console.error("handleCreateComponent is not a function"),alert("Error: handleCreateComponent function not found"))}})(c);let je=G.querySelector("button.btn-rename");je&&c.type==="naming"&&(function(H){je.onclick=re=>{re.preventDefault(),re.stopPropagation(),console.log("Rename button clicked",H),typeof ao=="function"?ao(H):(console.error("handleRenameNode is not a function"),alert("Error: handleRenameNode function not found"))}})(c);let Xe=G.querySelector("button.btn-remove-layer");Xe&&(function(H){Xe.onclick=re=>{re.preventDefault(),re.stopPropagation(),console.log("Remove Layer button clicked",H),typeof Ct=="function"?Ct(H):(console.error("handleRemoveLayer is not a function"),alert("Error: handleRemoveLayer function not found"))}})(c);let Ae=G.querySelector("button.btn-ignore");if(Ae&&c.type==="contrast"&&(Ae.removeAttribute("disabled"),Ae.onclick=H=>{H.preventDefault(),H.stopPropagation(),console.log("Ignore button clicked",c);try{typeof mo=="function"?mo(c):(console.error("handleIgnoreIssue is not a function"),alert("Error: handleIgnoreIssue function not found"))}catch(re){console.error("Error handling ignore:",re),alert(`Error: ${re.message}`)}}),c.type==="typography-style"){let H=G.querySelector("button.btn-create-style");H?(console.log("Attaching create style handler to button",{issueId:c.id,issueType:c.type,nodeName:c.nodeName}),(function(ze){H.onclick=Fe=>{Fe.preventDefault(),Fe.stopPropagation(),console.log("Create Style button clicked",ze),typeof vo=="function"?vo(ze):(console.error("handleCreateTextStyle is not a function"),alert("Error: handleCreateTextStyle function not found"))}})(c)):console.error("Create Style button not found in DOM",{issueId:c.id,issueType:c.type,hasIssueEl:!!G,innerHTML:G.innerHTML.substring(0,200)});let re=G.querySelector("button.btn-suggest-fix");re&&c.bestMatch&&c.bestMatch.name&&c.type==="typography-style"&&(function(ze){re.onclick=Fe=>{Fe.preventDefault(),Fe.stopPropagation();let mt=re.getAttribute("data-style-name");mt?Pt(ze,mt):(console.error("Cannot apply: styleName is missing from button",ze),alert("Error: Style name is missing"))}})(c),re&&c.bestMatch&&c.bestMatch.name&&c.type==="typography-check"&&(function(ze){re.onclick=Fe=>{Fe.preventDefault(),Fe.stopPropagation(),ze.bestMatch&&ze.bestMatch.name?Pt(ze,ze.bestMatch.name):(console.error("Cannot apply: bestMatch.name is missing",ze),alert("Error: Best match style name is missing"))}})(c);let he=G.querySelector("button.btn-fix");he&&c.type==="typography-style"&&(function(ze){he.onclick=Fe=>{Fe.preventDefault(),Fe.stopPropagation(),parent.postMessage({pluginMessage:{type:"get-figma-text-styles",issueId:ze.id}},"*"),window.pendingTypographyStyleIssue=ze}})(c);let Ne=G.querySelector("button.btn-style-dropdown"),lt=G.querySelector(".style-dropdown-menu");if(Ne&&lt){let ze=!1;Ne.onclick=Fe=>{Fe.preventDefault(),Fe.stopPropagation();let mt=lt.style.display!=="none";document.querySelectorAll(".style-dropdown-menu").forEach(Yo=>{Yo!==lt&&(Yo.style.display="none")}),mt?lt.style.display="none":(lt.style.display="block",ze||(lt.innerHTML='<div style="padding: 8px 12px; color: #999; font-size: 12px; text-align: center;">Loading...</div>',parent.postMessage({pluginMessage:{type:"get-figma-text-styles",issueId:c.id}},"*")))},document.addEventListener("click",function(mt){G.contains(mt.target)||(lt.style.display="none")})}}});W.appendChild(ne),oe.appendChild(W)}l||At({issues:e,issuesTimestamp:r,tokens:S.tokens,tokensTimestamp:S.tokensTimestamp,lastActiveTab:"issues",scanMode:S.scanMode||null,context:S.context||null})}function Ln(e){if(console.log("filterAndSearchTokens called",{hasTokens:!!e,currentColorTypeFilter:Ve,currentSearch:Ce}),!e)return null;let t={},o=!1;for(let[l,n]of Object.entries(e)){let s=n||[];if(console.log(`Processing ${l}, initial count:`,s.length),(l==="colors"||l==="gradients")&&Ve!=="all"&&(s=s.filter(r=>(r.colorType||"").toLowerCase().includes(Ve.toLowerCase())),console.log(`After color type filter (${Ve}):`,s.length)),Ce.trim()){let r=Ce.toLowerCase();s=s.map(i=>{let a=String(i.value||"").toLowerCase(),p=(i.nodes||[]).map(v=>v.name||"").join(" ").toLowerCase(),d=(i.colorType||"").toLowerCase(),y=a.includes(r),g=p.includes(r),m=d.includes(r);if(y||g||m){let v=[];return y&&v.push("value"),g&&v.push("nodeName"),m&&v.push("colorType"),Ze(Ye({},i),{_matchedBy:v,_matchedNodeNames:g?(i.nodes||[]).filter(b=>(b.name||"").toLowerCase().includes(r)).map(b=>b.name):[]})}return null}).filter(i=>i!==null),console.log(`After search filter (${l}):`,s.length)}s.length>0&&(o=!0),t[l]=s}return console.log("Final filtered tokens keys:",Object.keys(t)),{tokens:t,hasMatches:o}}function Hn(e){let t=document.getElementById("spacing-scale");if(!t)return;let o=document.getElementById("spacing-threshold"),l=o?parseInt(o.value,10):100,n=isNaN(l)?100:l,r=(e&&Array.isArray(e.spacing)?e.spacing:[]).map(a=>{let p=parseInt(String(a&&a.value!==void 0?a.value:"").trim(),10);return isNaN(p)?null:Math.abs(p)}).filter(a=>a!==null&&a<=n);if(!r.length)return;let i=Array.from(new Set(r)).sort((a,p)=>a-p);t.value=i.join(", ");try{t.focus(),t.setSelectionRange(t.value.length,t.value.length)}catch(a){}}function $t(e,t=!1,o={}){let{skipSave:l=!1,restoreTimestamp:n=null}=o;De("tokens");let s=Object.values(e||{}).reduce(($,j)=>$+(Array.isArray(j)?j.length:0),0);document.getElementById("tokens-count").textContent=s;let r=S.tokens!==e;S.tokens=e;let i=n||new Date().toISOString();S.tokensTimestamp=i,bt=!0,(t||r)&&(console.log("Resetting filters for new token data"),Le="all",Ve="all",Ue&&(Ue.value=""),Ce="",Be&&(Be.style.display="none"),we&&we.length>0&&we.forEach($=>{$.classList.remove("active"),$.getAttribute("data-filter")==="all"&&$.classList.add("active")}),pt&&(pt.value="all"));let a=document.getElementById("filter-controls"),p=document.getElementById("color-type-filter"),d=document.getElementById("filter-buttons");a.style.display=e&&Object.keys(e).length>0?"flex":"none",p.style.display=e&&(e.colors||e.gradients)?"block":"none",d.style.display="none";let y=document.getElementById("export-group");y.style.display=e&&Object.keys(e).length>0?"flex":"none",console.log("About to filter tokens with:",{currentColorTypeFilter:Ve,currentSearch:Ce});let g=Ln(e);if(kt("tokens"),!e||Object.keys(e).length===0){de.innerHTML=`
              <div class="empty-state">
                <div class="icon">\u{1F4CB}</div>
                <p>No design tokens found</p>
              </div>
            `;return}if(!g){de.innerHTML=`
              <div class="empty-state">
                <div class="icon">\u{1F50D}</div>
                <p><strong>No results found</strong></p>
                <p style="margin-top: 8px; font-size: 12px;">Try changing the filter or search keyword.</p>
              </div>
            `;return}let m=g.tokens||{},v=g.hasMatches;if((Ce.trim()||Ve!=="all")&&!v){de.innerHTML=`
              <div class="empty-state">
                <div class="icon">\u{1F50D}</div>
                <p><strong>No results found</strong></p>
                <p style="margin-top: 8px; font-size: 12px;">Try changing the filter or search keyword.</p>
              </div>
            `;return}let F={colors:{icon:"\u{1F3A8}",label:"Colors",values:m.colors||[]},gradients:{icon:"\u{1F308}",label:"Gradients",values:m.gradients||[]},spacing:{icon:"\u2194\uFE0F",label:"Spacing (px)",values:m.spacing||[]},borderRadius:{icon:"\u2B55",label:"Border Radius",values:m.borderRadius||[]},fontWeight:{icon:"\u{1F4AA}",label:"Font Weight",values:m.fontWeight||[]},lineHeight:{icon:"\u{1F4CF}",label:"Line Height (%)",values:m.lineHeight||[]},fontSize:{icon:"\u{1F4DD}",label:"Font Size",values:m.fontSize||[]},fontFamily:{icon:"\u{1F524}",label:"Font Family",values:m.fontFamily||[]}},q=document.createElement("div");q.className="results-header";let k=Object.values(F).reduce(($,j)=>$+j.values.length,0);q.innerHTML=`
            <h3>Design Tokens</h3>
            <div class="results-stats">
              <span class="stat">${k} Tokens</span>
            </div>
          `,de.appendChild(q);for(let[$,j]of Object.entries(F)){let L=document.createElement("div");L.className="issue-group collapsed";let W=document.createElement("div");W.className="issue-group-header",W.innerHTML=`
              <div class="issue-group-header-left">
                <button class="issue-group-toggle" type="button">
                  <span class="issue-group-toggle-icon">\u25B6</span>
                </button>
                <h4>${j.icon} ${j.label}</h4>
                <span class="badge">${j.values.length}</span>
              </div>
            `;let ge=document.createElement("div");ge.className="issue-group-content",ge.style.display="none";let N=W.querySelector(".issue-group-toggle"),ee=()=>{L.classList.contains("collapsed")?(L.classList.remove("collapsed"),ge.style.display="block",setTimeout(()=>{ge.style.opacity="1"},10)):(ge.style.opacity="0",setTimeout(()=>{L.classList.add("collapsed"),ge.style.display="none"},200))};if(N.onclick=M=>{M.stopPropagation(),ee()},W.onclick=M=>{M.target!==N&&!N.contains(M.target)&&ee()},L.appendChild(W),Array.isArray(j.values)&&j.values.length>0){let M=document.createElement("div");M.className="token-list",j.values.forEach((X,ne)=>{let c=ne+1,ae=document.createElement("div");ae.className="token-item";let Z=X.value,z=X.nodes||[],G=z.length>0?z[0]:null,fe=typeof X.totalNodes=="number"?X.totalNodes:z.length,ke=X.colorType||null,Ee="";if($==="colors"){let Ae=ke?`<span class="token-color-type">${u(ke)}</span>`:"";Ee=`
                  <span class="token-number">#${c}</span>
                  <span class="token-color-preview" style="background-color: ${u(Z)}"></span>
                  <code>${u(Z)}</code>
                  ${Ae}
                `}else if($==="gradients"){let Ae=ke?`<span class="token-color-type">${u(ke)}</span>`:"";Ee=`
                  <span class="token-number">#${c}</span>
                  <span class="token-gradient-preview" style="background: ${u(Z)}"></span>
                  <code>${u(Z)}</code>
                  ${Ae}
                `}else Ee=`<span class="token-number">#${c}</span><code>${u(String(Z))}</code>`;let Te=X._matchedBy||[],Me=X._matchedNodeNames||[],nt=Te.includes("nodeName"),We="";G&&G.name&&(nt&&Me.length>0?We=`<div class="token-node-name token-matched-by-name">
                    <span class="match-indicator">\u{1F50D} Matched in:</span> ${Me.map(H=>`<span class="token-matched-node">${u(H)}</span>`).join(", ")}
                  </div>`:We=`<div class="token-node-name">Node: ${u(G.name)}</div>`);let je="";if($==="fontWeight"){let H=Array.isArray(X.fontFamilies)?X.fontFamilies:null;if(!H){let re={};z.forEach(he=>{let Ne=he&&he.fontFamily?String(he.fontFamily):"Unknown";re[Ne]=(re[Ne]||0)+1}),H=Object.entries(re).map(([he,Ne])=>({family:he,count:Ne})).sort((he,Ne)=>Ne.count-he.count||he.family.localeCompare(Ne.family))}Array.isArray(H)&&H.length>0&&(je=`
                    <div class="token-note">
                      <div class="token-note-label">Font-family:</div>
                      <ul class="token-note-list">${H.map(he=>`<li><code>${u(he.family)}</code> (${he.count})</li>`).join("")}</ul>
                    </div>
                  `)}ae.innerHTML=`
                <div class="token-item-row">
                  <div class="token-value">
                    ${Ee}
                  </div>
                  ${G?`
                    <div class="token-actions">
                      <button class="btn-select" data-id="${G.id}">Select</button>
                      ${fe>1?`<span class="token-node-count">(${fe})</span>`:""}
                    </div>
                  `:""}
                </div>
                ${We}
                ${je}
              `;let Xe=ae.querySelector("button.btn-select");Xe&&(Xe.onclick=()=>{document.querySelectorAll(".btn-select.active").forEach(Ae=>Ae.classList.remove("active")),document.querySelectorAll(".issue.selected, .token-item.selected").forEach(Ae=>Ae.classList.remove("selected")),Xe.classList.add("active"),ae.classList.add("selected"),parent.postMessage({pluginMessage:{type:"select-node",id:G.id}},"*")}),M.appendChild(ae)}),ge.appendChild(M)}else{let M=document.createElement("div");M.className="token-empty-message",M.textContent="No tokens in this group.",ge.appendChild(M)}L.appendChild(ge),de.appendChild(L)}l||At({issues:S.issues,issuesTimestamp:S.timestamp,tokens:e,tokensTimestamp:i,lastActiveTab:"tokens",scanMode:S.scanMode||null,context:S.context||null})}function et(e){let t=document.getElementById("validation-error"),o=document.getElementById("validation-error-message"),l=document.getElementById("btn-close-validation-error");t&&o&&(o.textContent=e,t.style.display="block",h.style.display="block",w.style.display="none",f.style.display="none",h.disabled=!1,C.disabled=!1,setTimeout(()=>{t.style.display==="block"&&(t.style.display="none")},1e4),l&&(l.onclick=()=>{t.style.display="none"}))}function xo(e){var k,$,j,L,W,ge,N;h.style.display="none",w.style.display="block",f.style.display="block",x.style.transition="none",x.style.width="0%",I.textContent="0%",setTimeout(()=>{x.style.transition="width 0.3s"},10),Y();let t=document.getElementById("spacing-scale"),o=document.getElementById("spacing-threshold"),l=document.getElementById("color-scale"),n=document.getElementById("font-size-scale"),s=document.getElementById("font-size-threshold"),r=document.getElementById("line-height-scale"),i=document.getElementById("line-height-threshold"),a=document.getElementById("line-height-baseline-threshold"),p=t?t.value.trim():"",d=o?parseInt(o.value,10):100,y=l?l.value.trim():"",g=n?n.value.trim():"",m=s?parseInt(s.value,10):100,v=r?r.value.trim():"",b=i?parseInt(i.value,10):300,F=a?parseInt(a.value,10):120,q={checkStyle:((k=document.getElementById("rule-typo-style"))==null?void 0:k.checked)||!1,checkFontFamily:(($=document.getElementById("rule-font-family"))==null?void 0:$.checked)||!1,checkFontSize:((j=document.getElementById("rule-font-size"))==null?void 0:j.checked)||!1,checkFontWeight:((L=document.getElementById("rule-font-weight"))==null?void 0:L.checked)||!1,checkLineHeight:((W=document.getElementById("rule-line-height"))==null?void 0:W.checked)||!1,checkLetterSpacing:((ge=document.getElementById("rule-letter-spacing"))==null?void 0:ge.checked)||!1,checkWordSpacing:((N=document.getElementById("rule-word-spacing"))==null?void 0:N.checked)||!1};parent.postMessage({pluginMessage:{type:"scan",mode:e,spacingScale:p,spacingThreshold:d,colorScale:y,fontSizeScale:g,fontSizeThreshold:m,lineHeightScale:v,lineHeightThreshold:b,lineHeightBaselineThreshold:F,typographyStyles:Q,typographyRules:q,ignoredIssues:ue}},"*"),console.log("Message sent:",{type:"scan",mode:e})}h.onclick=()=>{var e;console.log("btnScan clicked");try{let t=document.getElementById("validation-error");t&&(t.style.display="none");let o=((e=document.querySelector('input[name="scope"]:checked'))==null?void 0:e.value)||"page",l=document.getElementById("spacing-scale"),n=document.getElementById("spacing-threshold"),s=document.getElementById("color-scale"),r=document.getElementById("font-size-scale"),i=document.getElementById("font-size-threshold"),a=document.getElementById("line-height-scale"),p=document.getElementById("line-height-threshold"),d=document.getElementById("line-height-baseline-threshold"),y=l?l.value.trim():"",g=n?parseInt(n.value,10):100,m=s?s.value.trim():"",v=r?r.value.trim():"",b=i?parseInt(i.value,10):100,F=a?a.value.trim():"",q=p?parseInt(p.value,10):300,k=d?parseInt(d.value,10):120;if(y&&!/^\d+(\s*,\s*\d+)*$/.test(y)){et("Spacing guidelines format is incorrect. Please enter the numbers separated by commas (e.g. 4, 8, 12, 16)");return}if(m){let $=m.split(",").map(W=>W.trim()).filter(W=>W),j=/^#[0-9a-fA-F]{3,8}$/,L=$.filter(W=>!j.test(W));if(L.length>0){et(`Color format is incorrect. Invalid colors: ${L.join(", ")}. Please use hex format only.`);return}}if(v&&!/^\d+(\s*,\s*\d+)*$/.test(v)){et("Font-size scale format is incorrect. Please enter the numbers separated by commas (e.g. 32, 24, 20, 18)");return}if(F){let $=F.split(",").map(L=>L.trim()).filter(L=>L);if(!$.every(L=>L.toLowerCase()==="auto"||/^\d+$/.test(L))||$.length===0){et('Line-height scale format is incorrect. Please enter "auto" and/or numbers separated by commas.');return}}if(isNaN(g)||g<0){et("Spacing threshold must be a number >= 0");return}if(isNaN(b)||b<0){et("Font-size threshold must be a number >= 0");return}if(isNaN(q)||q<0){et("Line-height threshold must be a number >= 0");return}if(isNaN(k)||k<0){et("Line-height baseline threshold must be a number >= 0");return}oe.innerHTML=`
        <div class="scanning">
          <div class="spinner"></div>
          <p>Checking design size...</p>
        </div>
      `,De("issues"),h.disabled=!0,C.disabled=!0,S.scanMode=o,be(),ve={scope:o},parent.postMessage({pluginMessage:{type:"get-node-count",mode:o}},"*")}catch(t){console.error("Error in btnScan.onclick:",t),oe.innerHTML=`<div class="error-message">Error: ${u(t.message)}</div>`,De("issues"),h.disabled=!1,C.disabled=!1}},C.onclick=()=>{var e;console.log("btnExtractTokens clicked");try{C.style.display="none",w.style.display="block",f.style.display="block",x.style.transition="none",x.style.width="0%",I.textContent="0%",setTimeout(()=>{x.style.transition="width 0.3s"},10);let t=((e=document.querySelector('input[name="scope"]:checked'))==null?void 0:e.value)||"page";de.innerHTML=`
        <div class="scanning">
          <div class="spinner"></div>
          <p>Extracting design tokens... Please wait</p>
        </div>
      `,De("tokens"),h.disabled=!0,C.disabled=!0,S.scanMode=t,parent.postMessage({pluginMessage:{type:"extract-tokens",mode:t}},"*"),console.log("Message sent:",{type:"extract-tokens",mode:t})}catch(t){console.error("Error in btnExtractTokens.onclick:",t),de.innerHTML=`<div class="error-message">Error: ${u(t.message)}</div>`,De("tokens"),h.disabled=!1,C.disabled=!1}},P.onclick=()=>{try{Hn(S.tokens)}catch(e){console.error("Failed to fill spacing guidelines from tokens",e)}},V.onclick=()=>{try{let e=S.tokens;if(!e||!Array.isArray(e.colors)||!e.colors.length){alert("No color tokens found. Please run 'Extract Design Tokens' first.");return}let t=document.getElementById("color-scale");if(!t)return;let l=(e.colors||[]).map(s=>String(s&&s.value!==void 0?s.value:"").trim().toUpperCase()).filter(s=>s&&s.startsWith("#"));if(!l.length)return;let n=Array.from(new Set(l)).sort((s,r)=>st(s)-st(r));t.value=n.join(", "),typeof He=="function"&&He();try{t.focus(),t.setSelectionRange(t.value.length,t.value.length)}catch(s){}}catch(e){console.error("Failed to fill color from tokens",e)}},D.onclick=()=>{parent.postMessage({pluginMessage:{type:"extract-color-styles"}},"*")};let So=document.getElementById("btn-extract-color-variables");So&&(So.onclick=()=>{parent.postMessage({pluginMessage:{type:"extract-color-variables"}},"*")}),B.onclick=()=>{try{let e=S.tokens;if(!e||!Array.isArray(e.fontSize)||!e.fontSize.length){alert("No font size tokens found. Please run 'Extract Design Tokens' first.");return}let t=document.getElementById("font-size-scale");if(!t)return;let o=document.getElementById("font-size-threshold"),l=o?parseInt(o.value,10):100,n=isNaN(l)?100:l,s=e.fontSize.map(i=>parseInt(String(i&&i.value!==void 0?i.value:"").trim(),10)).filter(i=>!isNaN(i)&&i<=n);if(!s.length)return;let r=Array.from(new Set(s)).sort((i,a)=>a-i);t.value=r.join(", "),t.focus(),t.setSelectionRange(t.value.length,t.value.length)}catch(e){console.error("Failed to fill font size from tokens",e)}},R.onclick=()=>{try{let e=S.tokens;if(!e||!Array.isArray(e.lineHeight)||!e.lineHeight.length){alert("No line height tokens found. Please run 'Extract Design Tokens' first.");return}let t=document.getElementById("line-height-scale");if(!t)return;let o=document.getElementById("line-height-threshold"),l=o?parseInt(o.value,10):300,n=isNaN(l)?300:l,s=[];if(e.lineHeight.forEach(d=>{let y=String(d&&d.value!==void 0?d.value:"").trim();if(y==="auto")s.push("auto");else{let g=parseFloat(y);!isNaN(g)&&g<=n&&s.push(g)}}),!s.length)return;let r=s.includes("auto"),i=s.filter(d=>d!=="auto"),a=Array.from(new Set(i)).sort((d,y)=>d-y),p=r?["auto",...a]:a;t.value=p.join(", "),t.focus(),t.setSelectionRange(t.value.length,t.value.length)}catch(e){console.error("Failed to fill line height from tokens",e)}},U.onclick=()=>{try{if(!Q||!Array.isArray(Q)||Q.length===0){alert("No typography styles defined. Please add typography styles or extract from Figma first.");return}let e=document.getElementById("font-size-scale");if(!e)return;let t=Q.map(l=>{let n=parseInt(String(l.fontSize||"").trim(),10);return isNaN(n)?null:n}).filter(l=>l!==null);if(!t.length){alert("No valid font sizes found in typography styles.");return}let o=Array.from(new Set(t)).sort((l,n)=>n-l);e.value=o.join(", "),be(),e.focus(),e.setSelectionRange(e.value.length,e.value.length),console.log("Filled font size from typography:",o)}catch(e){console.error("Failed to fill font size from typography",e)}},T.onclick=()=>{try{if(!Q||!Array.isArray(Q)||Q.length===0){alert("No typography styles defined. Please add typography styles or extract from Figma first.");return}let e=document.getElementById("line-height-scale");if(!e)return;let t=[];if(Q.forEach(r=>{let i=String(r.lineHeight||"").trim();if(i==="auto")t.push("auto");else{let a=parseFloat(i.replace("%",""));isNaN(a)||t.push(a)}}),!t.length){alert("No valid line heights found in typography styles.");return}let o=t.includes("auto"),l=t.filter(r=>r!=="auto"),n=Array.from(new Set(l)).sort((r,i)=>r-i),s=o?["auto",...n]:n;e.value=s.join(", "),be(),e.focus(),e.setSelectionRange(e.value.length,e.value.length),console.log("Filled line height from typography:",s)}catch(e){console.error("Failed to fill line height from typography",e)}};let Rt=document.getElementById("typography-panel"),ko=document.getElementById("typography-panel-header"),wo=document.getElementById("typography-panel-toggle");ko&&Rt&&wo&&(ko.onclick=()=>{let e=Rt.classList.contains("collapsed");Rt.classList.toggle("collapsed");let t=wo.querySelector(".issue-group-toggle-icon");t&&(t.textContent="\u25B6")});let Wt=document.getElementById("settings-panel"),Co=document.getElementById("settings-panel-header"),vt=document.getElementById("settings-panel-toggle");if(Co&&Wt&&vt){let e=()=>{let t=Wt.classList.contains("collapsed");Wt.classList.toggle("collapsed");let o=vt.querySelector(".issue-group-toggle-icon");o&&(o.textContent="\u25B6")};Co.onclick=t=>{t.target===vt||vt.contains(t.target)||e()},vt.onclick=t=>{t.stopPropagation(),e()}}function Dt(){let e=document.getElementById("color-preview-panel"),t=document.getElementById("color-preview-panel-header"),o=document.getElementById("color-preview-panel-toggle");if(!e||!t||!o){console.log("Color preview panel elements not found, retrying..."),setTimeout(Dt,100);return}console.log("Setting up color preview panel toggle");let l=()=>{let n=e.classList.contains("collapsed");e.classList.toggle("collapsed");let s=o.querySelector(".issue-group-toggle-icon");s&&(s.textContent="\u25B6"),console.log("Color preview panel toggled, isCollapsed:",!n)};t.onclick=n=>{n.preventDefault(),n.stopPropagation(),console.log("Color preview panel header clicked"),l()},o.onclick=n=>{n.preventDefault(),n.stopPropagation(),console.log("Color preview panel toggle button clicked"),l()}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Dt):Dt();function He(){let e=document.getElementById("color-scale"),t=document.getElementById("color-preview");if(!e||!t)return;let o=e.value.trim();if(t.innerHTML="",!o)return;let l=o.split(",").map(r=>r.trim()).filter(r=>r),n=1;l.forEach(r=>{let i=r.toUpperCase(),a=_[i];if(a&&/^No name \d+$/.test(a)){let p=parseInt(a.replace("No name ",""),10);p>=n&&(n=p+1)}});let s=1;l.forEach((r,i)=>{let a=/^#[0-9A-Fa-f]{3,8}$/.test(r),p=/^rgba?\(/.test(r);if(!a&&!p)return;let d=document.createElement("div");d.className="color-swatch-container";let y=document.createElement("div");y.className="color-swatch",y.style.background=r;let g=document.createElement("button");g.innerHTML="\xD7",g.className="color-swatch-close",g.onclick=function(k){var W;k.stopPropagation();let $=e.value.split(",").map(ge=>ge.trim()).filter(ge=>ge),j=(W=$[i])==null?void 0:W.toUpperCase(),L=$.filter((ge,N)=>N!==i);e.value=L.join(", "),j&&_[j]&&delete _[j],He(),typeof be=="function"&&be()};let m=r.toUpperCase(),v=_[m];if(!v){for(;Object.values(_).includes(`No name ${s}`);)s++;v=`No name ${s}`,_[m]=v,s++,typeof be=="function"&&be()}let b=document.createElement("div");b.className="color-swatch-label";let F=document.createElement("div");F.className="color-swatch-label-name",F.textContent=v,F.title="Click to edit name",F.style.cursor="pointer",F.onclick=function(k){k.stopPropagation();let $=document.createElement("input");$.type="text",$.value=v,$.className="color-swatch-name-input",$.style.cssText="width: 100%; font-size: 11px; padding: 2px 4px; border: 1px solid #667eea; border-radius: 4px; text-align: center; box-sizing: border-box;",F.style.display="none",F.parentNode.insertBefore($,F),$.focus(),$.select();let j=()=>{let L=$.value.trim()||`No name ${s}`;_[m]=L,F.textContent=L,F.style.display="",$.remove(),typeof be=="function"&&be()};$.onblur=j,$.onkeydown=function(L){L.key==="Enter"?(L.preventDefault(),j()):L.key==="Escape"&&(F.style.display="",$.remove())}};let q=document.createElement("div");q.className="color-swatch-label-hex",q.textContent=m,b.appendChild(F),b.appendChild(q),y.appendChild(g),d.appendChild(y),d.appendChild(b),t.appendChild(d)})}function qn(){var e,t,o,l,n,s;return{fontFamily:((e=document.getElementById("rule-font-family"))==null?void 0:e.checked)||!1,fontSize:((t=document.getElementById("rule-font-size"))==null?void 0:t.checked)||!1,fontWeight:((o=document.getElementById("rule-font-weight"))==null?void 0:o.checked)||!1,lineHeight:((l=document.getElementById("rule-line-height"))==null?void 0:l.checked)||!1,letterSpacing:((n=document.getElementById("rule-letter-spacing"))==null?void 0:n.checked)||!1,wordSpacing:((s=document.getElementById("rule-word-spacing"))==null?void 0:s.checked)||!1}}function Ge(){let e=document.getElementById("typography-table-body"),t=document.querySelector("#typography-table thead tr");if(!e||!t)return;let o=qn(),l='<th class="typography-table-actions">Actions</th>';if(l+='<th class="typography-table-style-name" style="width: 120px;">Style Name</th>',o.fontFamily&&(l+='<th class="typography-table-font-family" style="width: 140px;">Font Family</th>'),o.fontSize&&(l+='<th class="typography-table-font-size" style="width: 80px;">Size (px)</th>'),o.fontWeight&&(l+='<th class="typography-table-font-weight" style="width: 100px;">Weight</th>'),o.lineHeight&&(l+='<th class="typography-table-line-height" style="width: 100px;">Line Height</th>'),o.letterSpacing&&(l+='<th class="typography-table-letter-spacing" style="width: 100px;">Letter Spacing</th>'),o.wordSpacing&&(l+='<th class="typography-table-word-spacing" style="width: 100px;">Word Spacing</th>'),t.innerHTML=l,Q.length===0){let n=Object.values(o).filter(s=>s).length+2;e.innerHTML=`
        <tr>
          <td colspan="${n}" class="typography-empty-message">
            No typography styles defined. Click "Add Typography Style" to create one.
          </td>
        </tr>
      `;return}e.innerHTML=Q.map(n=>{let s=`<tr data-id="${n.id}">`;return s+='<td class="typography-table-actions">',n.styleId&&(s+=`<button class="btn-table-action" onclick="selectTypographyStyle('${n.styleId}')" title="Select layer in Figma" style="background: #0071e3; color: white;">\u{1F441}</button>`),s+=`<button class="btn-table-action delete" onclick="deleteTypographyStyle(${n.id})" title="Delete">\u{1F5D1}</button>
        </td>`,s+=`<td><input type="text" value="${u(n.name)}" data-field="name"></td>`,o.fontFamily&&(s+=`<td><input type="text" value="${u(n.fontFamily)}" data-field="fontFamily"></td>`),o.fontSize&&(s+=`<td><input type="number" value="${n.fontSize}" data-field="fontSize" min="1"></td>`),o.fontWeight&&(s+=`<td>
          <select data-field="fontWeight">
            <option value="Thin" ${n.fontWeight==="Thin"?"selected":""}>Thin (100)</option>
            <option value="ExtraLight" ${n.fontWeight==="ExtraLight"?"selected":""}>ExtraLight (200)</option>
            <option value="Light" ${n.fontWeight==="Light"?"selected":""}>Light (300)</option>
            <option value="Regular" ${n.fontWeight==="Regular"?"selected":""}>Regular (400)</option>
            <option value="Medium" ${n.fontWeight==="Medium"?"selected":""}>Medium (500)</option>
            <option value="SemiBold" ${n.fontWeight==="SemiBold"?"selected":""}>SemiBold (600)</option>
            <option value="Bold" ${n.fontWeight==="Bold"?"selected":""}>Bold (700)</option>
            <option value="ExtraBold" ${n.fontWeight==="ExtraBold"?"selected":""}>ExtraBold (800)</option>
            <option value="Black" ${n.fontWeight==="Black"?"selected":""}>Black (900)</option>
          </select>
        </td>`),o.lineHeight&&(s+=`<td><input type="text" value="${u(n.lineHeight)}" data-field="lineHeight" placeholder="120% or auto"></td>`),o.letterSpacing&&(s+=`<td><input type="text" value="${u(n.letterSpacing||"0")}" data-field="letterSpacing" placeholder="0 or 0.5px"></td>`),o.wordSpacing&&(s+=`<td><input type="text" value="${u(n.wordSpacing||"0")}" data-field="wordSpacing" placeholder="0"></td>`),s+="</tr>",s}).join(""),e.querySelectorAll("input, select").forEach(n=>{n.addEventListener("change",s=>{let r=s.target.closest("tr"),i=parseInt(r.dataset.id),a=s.target.dataset.field,p=s.target.value;Pn(i,a,p)})})}window.addTypographyStyle=function(){let e={id:Ke++,name:"New Style",fontFamily:"Inter",fontSize:16,fontWeight:"Regular",lineHeight:"150%",letterSpacing:"0",wordSpacing:"0"};Q.push(e),Ge(),be()};function Pn(e,t,o){let l=Q.find(n=>n.id===e);l&&(t==="fontSize"?l[t]=parseInt(o)||16:l[t]=o,be())}window.deleteTypographyStyle=function(e){confirm("Delete this typography style?")&&(Q=Q.filter(t=>t.id!==e),Y(),Ge(),be())},window.selectTypographyStyle=function(e){parent.postMessage({pluginMessage:{type:"select-text-style",styleId:e}},"*")};let Io=document.getElementById("btn-add-typo-style");Io&&(Io.onclick=()=>addTypographyStyle());let $o=document.getElementById("btn-extract-typo-desktop");$o&&($o.onclick=()=>{parent.postMessage({pluginMessage:{type:"extract-typography-styles",mode:"desktop"}},"*")});let Eo=document.getElementById("btn-extract-typo-tablet");Eo&&(Eo.onclick=()=>{parent.postMessage({pluginMessage:{type:"extract-typography-styles",mode:"tablet"}},"*")});let Mo=document.getElementById("btn-extract-typo-mobile");Mo&&(Mo.onclick=()=>{parent.postMessage({pluginMessage:{type:"extract-typography-styles",mode:"mobile"}},"*")});let zo=document.getElementById("btn-extract-typo-all");zo&&(zo.onclick=()=>{parent.postMessage({pluginMessage:{type:"extract-typography-styles",mode:"all"}},"*")});let Fo=document.getElementById("btn-reset-typo-table");Fo&&(Fo.onclick=()=>{confirm(`\u26A0\uFE0F Reset typography table to default styles?

This will:
\u2022 Clear all current styles
\u2022 Restore default H1-H6 and Body styles

This action cannot be undone.`)&&(Q=[{id:1,name:"H1",fontFamily:"Inter",fontSize:48,fontWeight:"Bold",lineHeight:"120%",letterSpacing:"0",wordSpacing:"0"},{id:2,name:"H2",fontFamily:"Inter",fontSize:36,fontWeight:"Bold",lineHeight:"130%",letterSpacing:"0",wordSpacing:"0"},{id:3,name:"H3",fontFamily:"Inter",fontSize:30,fontWeight:"Semi Bold",lineHeight:"130%",letterSpacing:"0",wordSpacing:"0"},{id:4,name:"H4",fontFamily:"Inter",fontSize:24,fontWeight:"Semi Bold",lineHeight:"140%",letterSpacing:"0",wordSpacing:"0"},{id:5,name:"H5",fontFamily:"Inter",fontSize:20,fontWeight:"Semi Bold",lineHeight:"140%",letterSpacing:"0",wordSpacing:"0"},{id:6,name:"H6",fontFamily:"Inter",fontSize:16,fontWeight:"Semi Bold",lineHeight:"150%",letterSpacing:"0",wordSpacing:"0"},{id:7,name:"Body",fontFamily:"Inter",fontSize:14,fontWeight:"Regular",lineHeight:"150%",letterSpacing:"0",wordSpacing:"0"}],Ke=8,Ge(),be(),alert("\u2705 Typography table has been reset to default styles!"))}),Ge(),["rule-font-family","rule-font-size","rule-font-weight","rule-line-height","rule-letter-spacing","rule-word-spacing"].forEach(e=>{let t=document.getElementById(e);t&&t.addEventListener("change",()=>{Ge(),be()})});let To=document.getElementById("color-scale");To&&(To.addEventListener("input",()=>{He()}),He());let Rn=ln({maxHistory:10,postPluginMessage:e=>parent.postMessage({pluginMessage:e},"*"),getCurrentReportData:()=>S,setIsViewingTokens:e=>{bt=!!e},renderResults:Qe,renderTokens:$t}),{saveScanHistory:No,requestScanHistory:Bo,renderScanHistory:Ut,restoreReportFromHistory:ll,loadLastScanModeOnce:Wn,setHistory:Dn,clearLocalHistory:Un}=Rn,jn=document.getElementById("export-group"),Et=document.getElementById("export-dropdown");O.onclick=e=>{e.stopPropagation(),Et.style.display=Et.style.display==="block"?"none":"block"},document.querySelectorAll(".export-option").forEach(e=>{e.onclick=t=>{t.stopPropagation();let o=e.getAttribute("data-format");nn({format:o,reportData:S,getTypeDisplayName:wt,colorNameMap:_}),Et.style.display="none"}}),document.addEventListener("click",e=>{jn.contains(e.target)||(Et.style.display="none")});let Ue,Be,we,pt;function Mt(){console.log("applyFilters called",{isViewingTokens:bt,hasTokens:!!S.tokens,hasIssues:!!S.issues,currentFilter:Le,currentSearch:Ce,currentColorTypeFilter:Ve}),bt&&S.tokens?(console.log("Applying filters to tokens"),$t(S.tokens,!1)):S.issues&&(console.log("Applying filters to issues"),Qe(S.issues,!1))}function jt(){if(console.log("setupFilterHandlers called"),Ue=document.getElementById("search-input"),Be=document.getElementById("btn-clear-search"),we=document.querySelectorAll(".filter-btn"),pt=document.getElementById("color-type-select"),console.log("Elements found:",{searchInput:!!Ue,btnClearSearch:!!Be,filterButtons:we?we.length:0,colorTypeSelect:!!pt}),!Ue||!Be||!we||we.length===0){console.warn("Filter elements not found, retrying...",{searchInput:!!Ue,btnClearSearch:!!Be,filterButtons:we?we.length:0}),setTimeout(jt,100);return}console.log("Setting up search input handler"),Ue.addEventListener("input",e=>{let t=e.target.value;console.log("Search input changed:",t),Ce=t,console.log("currentSearch set to:",Ce),Be&&(Be.style.display=Ce.trim()?"block":"none"),Mt()}),Be&&(console.log("Setting up clear search button handler"),Be.onclick=e=>{console.log("Clear search clicked"),e.preventDefault(),e.stopPropagation(),Ue&&(Ue.value=""),Ce="",Be.style.display="none",Mt()}),console.log("Setting up filter buttons handlers, count:",we.length),we.forEach((e,t)=>{console.log(`Setting up filter button ${t}:`,e.getAttribute("data-filter")),e.onclick=o=>{o.preventDefault(),o.stopPropagation();let l=e.getAttribute("data-filter"),n=e.classList.contains("active");console.log("Filter button clicked:",l,"isActive:",n),n&&l!=="all"?(e.classList.remove("active"),Le="all",we.forEach(s=>{s.getAttribute("data-filter")==="all"&&s.classList.add("active")})):(we.forEach(s=>s.classList.remove("active")),e.classList.add("active"),Le=l),console.log("currentFilter set to:",Le),Mt()}}),pt&&(console.log("Setting up color type select handler"),pt.addEventListener("change",e=>{console.log("Color type changed:",e.target.value),Ve=e.target.value,Mt()})),console.log("Filter handlers setup complete")}console.log("Setting up filter handlers, DOM readyState:",document.readyState),document.readyState==="loading"?(console.log("DOM still loading, waiting for DOMContentLoaded"),document.addEventListener("DOMContentLoaded",()=>{console.log("DOMContentLoaded fired, setting up handlers"),jt(),Xt(),Zt(),Bo()})):(console.log("DOM already ready, setting up handlers immediately"),jt(),Xt(),Zt(),Bo()),ce&&(w.onclick=()=>{console.log("Cancel operation clicked"),parent.postMessage({pluginMessage:{type:"cancel-scan"}},"*"),h.style.display="block",h.disabled=!1,C.style.display="block",C.disabled=!1,w.style.display="none",f.style.display="none"},ie.onclick=()=>{if(confirm(`\u26A0\uFE0F Are you sure you want to reset all settings to default and clear history?

This will:
\u2022 Reset all input values to default
\u2022 Clear scan history
\u2022 Clear current reports

This action cannot be undone.`)){document.getElementById("spacing-scale").value="0, 4, 8, 12, 16, 24, 32, 40, 48, 64, 72, 80, 88, 96",document.getElementById("spacing-threshold").value="100",document.getElementById("color-scale").value="",document.getElementById("font-size-scale").value="32, 24, 20, 18, 16, 14, 12",document.getElementById("font-size-threshold").value="100",document.getElementById("line-height-scale").value="auto, 100, 110, 120, 130, 140, 150, 160, 170",document.getElementById("line-height-threshold").value="300",document.getElementById("line-height-baseline-threshold").value="120",Q=[{id:1,name:"H1",fontFamily:"Inter",fontSize:48,fontWeight:"Bold",lineHeight:"120%",letterSpacing:"0",wordSpacing:"0"},{id:2,name:"H2",fontFamily:"Inter",fontSize:36,fontWeight:"Bold",lineHeight:"130%",letterSpacing:"0",wordSpacing:"0"},{id:3,name:"H3",fontFamily:"Inter",fontSize:30,fontWeight:"Semi Bold",lineHeight:"130%",letterSpacing:"0",wordSpacing:"0"},{id:4,name:"H4",fontFamily:"Inter",fontSize:24,fontWeight:"Semi Bold",lineHeight:"140%",letterSpacing:"0",wordSpacing:"0"},{id:5,name:"H5",fontFamily:"Inter",fontSize:20,fontWeight:"Semi Bold",lineHeight:"140%",letterSpacing:"0",wordSpacing:"0"},{id:6,name:"H6",fontFamily:"Inter",fontSize:16,fontWeight:"Semi Bold",lineHeight:"150%",letterSpacing:"0",wordSpacing:"0"},{id:7,name:"Body",fontFamily:"Inter",fontSize:14,fontWeight:"Regular",lineHeight:"150%",letterSpacing:"0",wordSpacing:"0"}],Ke=8,Ge(),document.getElementById("rule-typo-style").checked=!0,document.getElementById("rule-font-family").checked=!0,document.getElementById("rule-font-size").checked=!0,document.getElementById("rule-font-weight").checked=!0,document.getElementById("rule-line-height").checked=!0,document.getElementById("rule-letter-spacing").checked=!1,document.getElementById("rule-word-spacing").checked=!1,Ge(),He(),S={issues:null,tokens:null,scanMode:null,timestamp:null,context:null,lastActiveTab:"issues"},kt("issues"),kt("tokens"),De("issues"),Un(),parent.postMessage({pluginMessage:{type:"clear-history"}},"*");let e=document.getElementById("history-panel");e&&e.style.display!=="none"&&Ut(),be(),alert("\u2705 All settings have been reset to default and history has been cleared!")}},ce.onclick=()=>{let e=document.getElementById("history-panel");if(e){let t=e.style.display!=="none";e.style.display=t?"none":"flex",t||Ut()}}),K&&(K.onclick=()=>{let e=document.getElementById("history-panel");e&&(e.style.display="none")});let Ao=document.getElementById("btn-save-settings"),qe=document.getElementById("save-settings-modal"),xe=document.getElementById("setting-name-input"),zt=document.getElementById("btn-confirm-save-settings"),Lo=document.getElementById("btn-cancel-save-settings"),Ho=document.getElementById("btn-close-save-settings");Ao&&(Ao.onclick=()=>{parent.postMessage({pluginMessage:{type:"get-project-name"}},"*"),qe&&(qe.style.display="flex",xe&&(xe.value="",xe.focus(),xe.onkeydown=e=>{e.key==="Enter"&&(e.preventDefault(),zt&&zt.click())}))}),Ho&&(Ho.onclick=()=>{qe&&(qe.style.display="none")}),Lo&&(Lo.onclick=()=>{qe&&(qe.style.display="none")});let Ie=document.getElementById("replace-confirm-modal"),qo=document.getElementById("replace-setting-name"),Po=document.getElementById("btn-confirm-replace"),Ro=document.getElementById("btn-cancel-replace"),Wo=document.getElementById("btn-close-replace-confirm"),$e=null;function Do(e,t){parent.postMessage({pluginMessage:{type:"save-settings",name:e,values:t,forceReplace:!0}},"*")}zt&&(zt.onclick=()=>{var o,l,n,s,r,i,a,p,d,y,g,m,v,b,F,q;let e=(o=xe==null?void 0:xe.value)==null?void 0:o.trim();if(!e){alert("\u26A0\uFE0F Please enter a setting name");return}let t={spacingScale:((l=document.getElementById("spacing-scale"))==null?void 0:l.value)||"",spacingThreshold:((n=document.getElementById("spacing-threshold"))==null?void 0:n.value)||"100",colorScale:((s=document.getElementById("color-scale"))==null?void 0:s.value)||"",colorNameMap:_,ignoredIssues:ue,fontSizeScale:((r=document.getElementById("font-size-scale"))==null?void 0:r.value)||"",fontSizeThreshold:((i=document.getElementById("font-size-threshold"))==null?void 0:i.value)||"100",lineHeightScale:((a=document.getElementById("line-height-scale"))==null?void 0:a.value)||"",lineHeightThreshold:((p=document.getElementById("line-height-threshold"))==null?void 0:p.value)||"300",lineHeightBaselineThreshold:((d=document.getElementById("line-height-baseline-threshold"))==null?void 0:d.value)||"120",typographyStyles:Q,typographyRules:{checkStyle:((y=document.getElementById("rule-typo-style"))==null?void 0:y.checked)||!0,checkFontFamily:((g=document.getElementById("rule-font-family"))==null?void 0:g.checked)||!0,checkFontSize:((m=document.getElementById("rule-font-size"))==null?void 0:m.checked)||!0,checkFontWeight:((v=document.getElementById("rule-font-weight"))==null?void 0:v.checked)||!0,checkLineHeight:((b=document.getElementById("rule-line-height"))==null?void 0:b.checked)||!0,checkLetterSpacing:((F=document.getElementById("rule-letter-spacing"))==null?void 0:F.checked)||!1,checkWordSpacing:((q=document.getElementById("rule-word-spacing"))==null?void 0:q.checked)||!1}};$e={name:e,values:t},parent.postMessage({pluginMessage:{type:"check-setting-name",name:e}},"*")}),Po&&(Po.onclick=()=>{$e&&(Do($e.name,$e.values),$e=null),Ie&&(Ie.style.display="none")}),Ro&&(Ro.onclick=()=>{$e=null,Ie&&(Ie.style.display="none"),xe&&(xe.focus(),xe.select())}),Wo&&(Wo.onclick=()=>{$e=null,Ie&&(Ie.style.display="none"),xe&&(xe.focus(),xe.select())}),Ie&&(Ie.onclick=e=>{e.target===Ie&&($e=null,Ie.style.display="none",xe&&(xe.focus(),xe.select()))});let Uo=document.getElementById("btn-load-settings"),Pe=document.getElementById("load-settings-modal"),xt=document.getElementById("settings-list"),Ot=document.getElementById("settings-empty-state"),jo=document.getElementById("btn-close-load-settings");function Oo(e){if(!(!xt||!Ot)){if(!e||e.length===0){xt.innerHTML="",Ot.style.display="block";return}Ot.style.display="none",xt.innerHTML=e.map(t=>{let o=new Date(t.updatedAt||t.createdAt),l=o.toLocaleDateString()+" "+o.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});return`
        <div class="settings-item" data-setting-name="${u(t.name)}">
          <div class="settings-item-info">
            <div class="settings-item-name">${u(t.name)}</div>
            <div class="settings-item-date">Updated: ${l}</div>
          </div>
          <div class="settings-item-actions">
            <button class="btn-remove-setting" data-setting-name="${u(t.name)}" title="Remove">\u{1F5D1}\uFE0F</button>
          </div>
        </div>
      `}).join(""),xt.querySelectorAll(".settings-item").forEach(t=>{let o=t.getAttribute("data-setting-name");t.onclick=l=>{l.target.closest(".btn-remove-setting")||(parent.postMessage({pluginMessage:{type:"load-settings",name:o}},"*"),Pe&&(Pe.style.display="none"))}}),xt.querySelectorAll(".btn-remove-setting").forEach(t=>{t.onclick=o=>{o.stopPropagation();let l=t.getAttribute("data-setting-name");confirm(`\u26A0\uFE0F Are you sure you want to remove "${l}"?`)&&parent.postMessage({pluginMessage:{type:"remove-settings",name:l}},"*")}})}}Uo&&(Uo.onclick=()=>{parent.postMessage({pluginMessage:{type:"get-saved-settings"}},"*"),Pe&&(Pe.style.display="flex")}),jo&&(jo.onclick=()=>{Pe&&(Pe.style.display="none")});let Vo=document.getElementById("btn-export-settings");Vo&&(Vo.onclick=()=>{var s,r,i,a,p,d,y,g,m,v,b,F,q,k,$;let e=((s=document.getElementById("color-scale"))==null?void 0:s.value)||"",t=e.split(",").map(j=>j.trim().toUpperCase()).filter(j=>j&&j.startsWith("#")),o=Ye({},_),l=1;Object.values(o).forEach(j=>{if(j&&/^No name \d+$/.test(j)){let L=parseInt(j.replace("No name ",""),10);L>=l&&(l=L+1)}}),t.forEach(j=>{o[j]||(o[j]=`No name ${l}`,l++)});let n={spacingScale:((r=document.getElementById("spacing-scale"))==null?void 0:r.value)||"",spacingThreshold:((i=document.getElementById("spacing-threshold"))==null?void 0:i.value)||"100",colorScale:e,colorNameMap:o,ignoredIssues:ue,fontSizeScale:((a=document.getElementById("font-size-scale"))==null?void 0:a.value)||"",fontSizeThreshold:((p=document.getElementById("font-size-threshold"))==null?void 0:p.value)||"100",lineHeightScale:((d=document.getElementById("line-height-scale"))==null?void 0:d.value)||"",lineHeightThreshold:((y=document.getElementById("line-height-threshold"))==null?void 0:y.value)||"300",lineHeightBaselineThreshold:((g=document.getElementById("line-height-baseline-threshold"))==null?void 0:g.value)||"120",typographyStyles:Q,typographyRules:{checkStyle:((m=document.getElementById("rule-typo-style"))==null?void 0:m.checked)||!0,checkFontFamily:((v=document.getElementById("rule-font-family"))==null?void 0:v.checked)||!0,checkFontSize:((b=document.getElementById("rule-font-size"))==null?void 0:b.checked)||!0,checkFontWeight:((F=document.getElementById("rule-font-weight"))==null?void 0:F.checked)||!0,checkLineHeight:((q=document.getElementById("rule-line-height"))==null?void 0:q.checked)||!0,checkLetterSpacing:((k=document.getElementById("rule-letter-spacing"))==null?void 0:k.checked)||!1,checkWordSpacing:(($=document.getElementById("rule-word-spacing"))==null?void 0:$.checked)||!1}};parent.postMessage({pluginMessage:{type:"get-project-name"}},"*"),window.pendingExportValues=n});let Go=document.getElementById("btn-import-settings"),ut=document.getElementById("import-settings-modal"),_e=document.getElementById("import-settings-file-input"),_o=document.getElementById("btn-select-import-file"),Je=document.getElementById("import-file-info"),Jo=document.getElementById("import-file-name"),Re=document.getElementById("btn-confirm-import"),Vt=document.getElementById("btn-cancel-import"),Gt=document.getElementById("btn-close-import-settings"),gt=null,Se=null;if(Go&&(Go.onclick=()=>{gt=null,Se=null,_e&&(_e.value=""),Je&&(Je.style.display="none"),Re&&(Re.disabled=!0),ut&&(ut.style.display="flex")}),_o&&_e&&(_o.onclick=()=>{_e.click()}),_e&&(_e.onchange=e=>{let t=e.target.files[0];if(!t)return;if(!t.name.endsWith(".json")){alert("\u26A0\uFE0F Please select a JSON file");return}gt=t,Jo&&(Jo.textContent=t.name),Je&&(Je.style.display="block"),Re&&(Re.disabled=!1);let o=new FileReader;o.onload=l=>{try{Se=JSON.parse(l.target.result),console.log("Imported settings data:",Se)}catch(n){alert("\u274C Error parsing JSON file: "+n.message),gt=null,Se=null,Je&&(Je.style.display="none"),Re&&(Re.disabled=!0)}},o.onerror=()=>{alert("\u274C Error reading file"),gt=null,Se=null},o.readAsText(t)}),Re&&(Re.onclick=()=>{if(!Se){alert("\u274C No file data to import");return}console.log("Import file data:",Se);let e=null;if(Array.isArray(Se)){if(Se.length===0){alert("\u274C No settings found in file");return}if(e=Se[0].values,!e){alert("\u274C Invalid settings format. No values found in setting object.");return}}else if(Se.values)e=Se.values;else if(Se.spacingScale!==void 0||Se.colorScale!==void 0)e=Se;else{alert("\u274C Invalid settings file format. Expected an array of settings, a single setting object, or a values object."),console.error("Invalid import data structure:",Se);return}if(!e||typeof e!="object"){alert("\u274C Invalid settings format. No values found.");return}console.log("Applying values:",e),Lt(e),be(),ut&&(ut.style.display="none"),gt=null,Se=null,_e&&(_e.value=""),Je&&(Je.style.display="none"),Re&&(Re.disabled=!0),alert("\u2705 Settings imported and applied to input fields successfully")}),Vt||Gt){let e=()=>{ut&&(ut.style.display="none"),gt=null,Se=null,_e&&(_e.value=""),Je&&(Je.style.display="none"),Re&&(Re.disabled=!0)};Vt&&(Vt.onclick=e),Gt&&(Gt.onclick=e)}qe&&(qe.onclick=e=>{e.target===qe&&(qe.style.display="none")}),Pe&&(Pe.onclick=e=>{e.target===Pe&&(Pe.style.display="none")}),te.onclick=()=>{parent.postMessage({pluginMessage:{type:"close"}},"*")},window.onmessage=e=>{var o,l;console.log("Received message:",e.data);let t=e.data.pluginMessage;if(t&&t.type==="fix-issue-result"){if(console.log("[fix-issue-result] Received:",{issueId:t.issueId,success:t.success,message:t.message}),ye(t.issueId,t.message,t.success),!t.success){console.log("[fix-issue-result] Error detected, showing error modal...");let n=t.message||"An error occurred while fixing the issue.";console.log("[fix-issue-result] Error message:",n);try{_t(n),console.log("[fix-issue-result] Error modal should be displayed")}catch(s){console.error("[fix-issue-result] Error showing error modal:",s),alert("Error: "+n)}}if(t.success){if(console.log("[fix-issue-result] Starting remove process for issueId:",t.issueId),console.log("[fix-issue-result] issueId type:",typeof t.issueId,"value:",t.issueId),S&&S.issues){let d=S.issues.length;S.issues=S.issues.filter(g=>String(g.id)!==String(t.issueId));let y=d-S.issues.length;console.log("[fix-issue-result] Removed",y,"issue(s) from data. Remaining issues:",S.issues.length)}let n=`.issue[data-issue-id="${t.issueId}"]`;console.log("[fix-issue-result] Trying selector1:",n);let s=document.querySelectorAll(n);console.log("[fix-issue-result] Found",s.length,"issue element(s) with this ID");let r=`button.btn-fix[data-id="${t.issueId}"]`,i=`button.btn-suggest-fix[data-id="${t.issueId}"]`;[...document.querySelectorAll(r),...document.querySelectorAll(i)].forEach(d=>{let y=d.closest(".issue");y&&!Array.from(s).includes(y)&&s.push(y)});let p=Array.from(new Set(Array.from(s)));if(console.log("[fix-issue-result] Total unique issue elements to remove:",p.length),p.length>0){let d=new Map;p.forEach((y,g)=>{console.log(`[fix-issue-result] Issue element ${g}:`,y),console.log(`[fix-issue-result] Issue element ${g} data-issue-id:`,y.getAttribute("data-issue-id")),console.log(`[fix-issue-result] Issue element ${g} data-issue-type:`,y.getAttribute("data-issue-type"));let m=y.closest(".issue-group");if(m){let v=m.getAttribute("data-issue-type");if(!d.has(v)){let F=m.querySelector(".badge");if(F){let q=parseInt(F.textContent)||0;d.set(v,{groupEl:m,badge:F,currentCount:q,removeCount:0})}}let b=d.get(v);b&&b.removeCount++}}),p.forEach((y,g)=>{y.style.transition="opacity 0.3s ease-out",y.style.opacity="0",setTimeout(()=>{y.parentNode&&(console.log(`[fix-issue-result] Removing element ${g} from DOM...`),y.remove())},300)}),setTimeout(()=>{let y=document.querySelectorAll(n);console.log("[fix-issue-result] After remove, remaining elements:",y.length),d.forEach((g,m)=>{let v=Math.max(0,g.currentCount-g.removeCount);g.badge.textContent=v,console.log(`[fix-issue-result] Updated badge for group "${m}" from ${g.currentCount} to ${v}`),v===0&&(g.groupEl.style.display="none",console.log(`[fix-issue-result] Hiding group "${m}" (no issues left)`))}),console.log("[fix-issue-result] Calling updateIssueCounts()..."),dt(),console.log("[fix-issue-result] updateIssueCounts() completed"),console.log("[fix-issue-result] Re-rendering issues to sync UI..."),S&&S.issues&&Qe(S.issues,!1)},350)}else console.log("[fix-issue-result] No issue elements found! Trying to update counts anyway..."),dt(),S&&S.issues&&Qe(S.issues,!1)}return}if(t&&t.type==="create-text-style-result"){ye(t.issueId,t.message,t.success),t.success&&setTimeout(()=>{var s;let n=document.querySelector(`.issue[data-issue-id="${t.issueId}"]`)||((s=document.querySelector(`button.btn-create-style[data-id="${t.issueId}"]`))==null?void 0:s.closest(".issue"));n&&(n.style.transition="opacity 0.5s ease-out",n.style.opacity="0",setTimeout(()=>{if(n.parentNode){n.remove();let r=n.closest(".issue-group");if(r){let i=r.querySelector(".badge");if(i){let a=parseInt(i.textContent)||0,p=Math.max(0,a-1);i.textContent=p,p===0&&(r.style.display="none")}}}},500))},5e3);return}if(t&&t.type==="components-for-issue-loaded"){console.log("=== [components-for-issue-loaded] HANDLER CALLED ==="),console.log("[components-for-issue-loaded] Received message",t);let n=window.pendingComponentIssue;if(console.log("[components-for-issue-loaded] Pending issue:",n,"Message issueId:",t.issueId),console.log("[components-for-issue-loaded] Similar components:",t.similarComponents),n){let s=document.querySelector(`.issue[data-issue-id="${n.id}"]`);if(s){let r=s.querySelector("button.btn-suggest-fix");r&&(r.disabled=!1,r.style.opacity="1",r.style.cursor="pointer",r.dataset.originalText&&(r.textContent=r.dataset.originalText,delete r.dataset.originalText))}}if(t.similarComponents&&t.similarComponents.length>0){console.log("[components-for-issue-loaded] Showing suggest modal with",t.similarComponents.length,"similar components");let s=n||{id:t.issueId,nodeName:"Unnamed"};try{wn(s,t.similarComponents),console.log("[components-for-issue-loaded] Modal function called successfully")}catch(r){console.error("[components-for-issue-loaded] Error showing modal:",r),alert("Error showing component suggestion modal: "+r.message)}window.pendingComponentIssue=null;return}else{console.warn("[components-for-issue-loaded] No similar components found"),alert("No similar components found. Please use 'Select Component' to choose from all components or 'Create New Component' to create a new one."),window.pendingComponentIssue=null;return}}if(t&&t.type==="all-components-loaded"){console.log("=== [all-components-loaded] HANDLER CALLED ==="),console.log("[all-components-loaded] Received message",t);let n=window.pendingSelectComponentIssue;if(console.log("[all-components-loaded] Pending issue:",n),console.log("[all-components-loaded] Message issueId:",t.issueId,typeof t.issueId),console.log("[all-components-loaded] Pending issueId:",n==null?void 0:n.id,typeof(n==null?void 0:n.id)),console.log("[all-components-loaded] Components:",t.components),console.log("[all-components-loaded] Components length:",t.components?t.components.length:0),n){let s=document.querySelector(`.issue[data-issue-id="${n.id}"]`);if(s){let r=s.querySelector("button.btn-select-component");r&&(r.disabled=!1,r.style.opacity="1",r.style.cursor="pointer",r.dataset.originalText&&(r.textContent=r.dataset.originalText,delete r.dataset.originalText))}}if(t.components&&t.components.length>0){console.log("[all-components-loaded] \u2713 Showing select modal with",t.components.length,"components");let s=n||{id:t.issueId,nodeName:"Unnamed"};console.log("[all-components-loaded] Issue to use:",s),console.log("[all-components-loaded] Calling showComponentSelectModal...");try{Cn(s,t.components),console.log("[all-components-loaded] \u2713 Modal function called successfully")}catch(r){console.error("[all-components-loaded] \u2717 Error showing modal:",r),console.error("[all-components-loaded] Error stack:",r.stack),alert("Error showing component selection modal: "+r.message)}window.pendingSelectComponentIssue=null;return}else{console.warn("[all-components-loaded] \u2717 No components available"),alert("No components found. Please use 'Create New Component' to create a new one."),window.pendingSelectComponentIssue=null;return}}if(t&&t.type==="figma-text-styles-loaded"){let n=window.pendingSuggestTextSizeIssue;if(n&&n.id===t.issueId){let p=n.fontSize||12,d=(t.styles||[]).filter(m=>m.fontSize>=14);if(d.length===0){let m=ot(n);m?It(n,p,m,null,null):alert("No suitable text size match found (need >= 14px for ADA compliance). Please add font sizes to Font Size input or create text styles in Figma."),window.pendingSuggestTextSizeIssue=null;return}let y=null,g=1/0;d.forEach(m=>{let v=Math.abs(m.fontSize-p);v<g&&(g=v,y=m)}),y?It(n,p,y.fontSize,null,y):alert("No suitable text style found (need >= 14px for ADA compliance)"),window.pendingSuggestTextSizeIssue=null;return}let s=window.pendingTextSizeIssue;if(s&&s.id===t.issueId){$n(s,t.styles||[]),window.pendingTextSizeIssue=null;return}let r=window.pendingTypographyStyleIssue;if(r&&r.id===t.issueId){if(t.error||!t.styles||t.styles.length===0){let p=document.querySelector(`.issue[data-issue-id="${t.issueId}"]`);if(p){let d=p.querySelector("button.btn-fix"),y=p.querySelector("button.btn-suggest-fix");d&&(d.style.display="none"),y&&(y.style.display="none")}window.pendingTypographyStyleIssue=null;return}co(r,t.styles||[]),window.pendingTypographyStyleIssue=null;return}let i=window.pendingTypographyCheckIssue;if(i&&i.id===t.issueId){if(t.error||!t.styles||t.styles.length===0){let p=document.querySelector(`.issue[data-issue-id="${t.issueId}"]`);if(p){let d=p.querySelector("button.btn-style-dropdown"),y=p.querySelector("button.btn-suggest-fix");d&&(d.style.display="none"),y&&(y.style.display="none")}window.pendingTypographyCheckIssue=null;return}co(i,t.styles||[]),window.pendingTypographyCheckIssue=null;return}let a=document.querySelector(`.style-dropdown-menu[data-issue-id="${t.issueId}"]`);if(a){let p=a.closest(".issue"),d=p?p.getAttribute("data-issue-id"):null,y=p?p.getAttribute("data-issue-type"):null;if(t.error){a.innerHTML=`<div style="padding: 8px 12px; color: #dc3545; font-size: 12px;">Error: ${u(t.error)}</div>`;let g=p?p.querySelector("button.btn-style-dropdown"):null;g&&(g.style.display="none");let m=p?p.querySelector("button.btn-suggest-fix"):null;m&&(y==="typography-style"||y==="typography-check")&&(m.style.display="none")}else if(t.styles&&t.styles.length>0){let g=null;if(d&&S&&S.issues){let m=S.issues.find(v=>v.id===d);m&&m.bestMatch&&(g=m.bestMatch.name)}a.innerHTML=t.styles.map(m=>`
            <div class="style-dropdown-item" data-issue-id="${t.issueId}" data-style-id="${m.id}" data-style-name="${u(m.name)}" style="padding: 8px 12px; cursor: pointer; font-size: 12px; ${g===m.name?"background: #e3f2fd; font-weight: 600;":""}" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='${g===m.name?"#e3f2fd":"white"}'">
              ${u(m.name)} ${g===m.name?"\u2B50":""}
            </div>
          `).join(""),a.querySelectorAll(".style-dropdown-item").forEach(m=>{m.onclick=v=>{v.preventDefault(),v.stopPropagation();try{let q=m.getAttribute("data-issue-id");q&&parent.postMessage({pluginMessage:{type:"select-node",id:q}},"*")}catch(q){console.error("Failed to auto-select node for style dropdown item:",q)}let b=m.getAttribute("data-style-id"),F=m.getAttribute("data-style-name");if(p&&S&&S.issues){let q=S.issues.find(k=>k.id===d);if(q){let k=t.styles.find($=>$.id===b);k&&(a.style.display="none",bo(q,k))}}}})}else{a.innerHTML='<div style="padding: 8px 12px; color: #999; font-size: 12px;">No text styles found in Figma</div>';let g=p?p.querySelector("button.btn-style-dropdown"):null;g&&(g.style.display="none");let m=p?p.querySelector("button.btn-suggest-fix"):null;m&&(y==="typography-style"||y==="typography-check")&&(m.style.display="none")}}return}if(t&&t.type==="contrast-colors-loaded"){let n=window.pendingContrastIssue;n&&n.id===t.issueId&&(En(n,t.colors||[]),window.pendingContrastIssue=null);return}if(t&&t.type==="apply-typography-style-result"){if(ye(t.issueId,t.message,t.success),t.success||_t(t.message||"An error occurred while applying the style."),t.success){if(console.log("[apply-typography-style-result] Starting remove process for issueId:",t.issueId),console.log("[apply-typography-style-result] issueId type:",typeof t.issueId,"value:",t.issueId),S&&S.issues){let y=S.issues.length;S.issues=S.issues.filter(m=>String(m.id)!==String(t.issueId));let g=y-S.issues.length;console.log("[apply-typography-style-result] Removed",g,"issue(s) from data. Remaining issues:",S.issues.length)}let n=`.issue[data-issue-id="${t.issueId}"]`;console.log("[apply-typography-style-result] Trying selector1:",n);let s=document.querySelectorAll(n);console.log("[apply-typography-style-result] Found",s.length,"issue element(s) with this ID");let r=`button.btn-suggest-apply[data-id="${t.issueId}"]`,i=`button.btn-fix[data-id="${t.issueId}"]`,a=`button.btn-suggest-fix[data-id="${t.issueId}"]`;[...document.querySelectorAll(r),...document.querySelectorAll(i),...document.querySelectorAll(a)].forEach(y=>{let g=y.closest(".issue");g&&!Array.from(s).includes(g)&&s.push(g)});let d=Array.from(new Set(Array.from(s)));if(console.log("[apply-typography-style-result] Total unique issue elements to remove:",d.length),d.length>0){let y=new Map;d.forEach((g,m)=>{console.log(`[apply-typography-style-result] Issue element ${m}:`,g),console.log(`[apply-typography-style-result] Issue element ${m} data-issue-id:`,g.getAttribute("data-issue-id")),console.log(`[apply-typography-style-result] Issue element ${m} data-issue-type:`,g.getAttribute("data-issue-type"));let v=g.closest(".issue-group");if(v){let b=v.getAttribute("data-issue-type");if(!y.has(b)){let q=v.querySelector(".badge");if(q){let k=parseInt(q.textContent)||0;y.set(b,{groupEl:v,badge:q,currentCount:k,removeCount:0})}}let F=y.get(b);F&&F.removeCount++}}),d.forEach((g,m)=>{g.style.transition="opacity 0.3s ease-out",g.style.opacity="0",setTimeout(()=>{g.parentNode&&(console.log(`[apply-typography-style-result] Removing element ${m} from DOM...`),g.remove())},300)}),setTimeout(()=>{let g=document.querySelectorAll(n);console.log("[apply-typography-style-result] After remove, remaining elements:",g.length),y.forEach((m,v)=>{let b=Math.max(0,m.currentCount-m.removeCount);m.badge.textContent=b,console.log(`[apply-typography-style-result] Updated badge for group "${v}" from ${m.currentCount} to ${b}`),b===0&&(m.groupEl.style.display="none",console.log(`[apply-typography-style-result] Hiding group "${v}" (no issues left)`))}),console.log("[apply-typography-style-result] Calling updateIssueCounts()..."),dt(),console.log("[apply-typography-style-result] updateIssueCounts() completed"),console.log("[apply-typography-style-result] Re-rendering issues to sync UI..."),S&&S.issues&&Qe(S.issues,!1)},350)}else console.log("[apply-typography-style-result] No issue elements found! Trying to update counts anyway..."),dt(),S&&S.issues&&Qe(S.issues,!1)}return}if(t&&t.type==="scan-progress"){x&&I&&(x.style.width=t.progress+"%",I.textContent=t.progress+"% ("+t.current+"/"+t.total+")");return}if(t&&t.type==="node-count-result"){let n=t.count||0,s=t.mode||"page";n>Oe?confirm(`\u26A0\uFE0F Large Design Warning

This ${s==="page"?"page":"selection"} contains ${n.toLocaleString()} nodes.

Scanning large designs may take a while and could slow down Figma.

Do you want to continue?`)&&ve?xo(ve.scope):(h&&(h.disabled=!1,h.textContent="Scan Issues"),f&&(f.style.display="none")):ve&&xo(ve.scope),ve=null;return}if(t&&t.type==="last-report"){t.report?an(t.report):console.log("No last report stored");return}if(t&&t.type==="history-data"){Dn(t.history),Wn();let n=document.getElementById("history-panel");n&&n.style.display!=="none"&&Ut();return}if(t&&t.type==="input-values-data"){t.values?(Lt(t.values),console.log("Restored input values:",t.values)):console.log("No saved input values to restore");return}if(t&&t.type==="project-name"){let n=t.name||"settings";if(window.pendingExportValues){let s=window.pendingExportValues;window.pendingExportValues=null;let r={name:n,values:s,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},i=JSON.stringify([r],null,2),a=new Blob([i],{type:"application/json"}),p=URL.createObjectURL(a),d=document.createElement("a");d.href=p;let y=n.replace(/[^a-z0-9]/gi,"_").toLowerCase();d.download=`${y}-settings.json`,document.body.appendChild(d),d.click(),document.body.removeChild(d),URL.revokeObjectURL(p),console.log("\u2705 Settings exported successfully");return}xe&&(xe.value=n);return}if(t&&t.type==="check-setting-name-result"){t.exists?(qo&&$e&&(qo.textContent=t.name||$e.name),Ie&&(Ie.style.display="flex")):$e&&(Do($e.name,$e.values),$e=null);return}if(t&&t.type==="save-settings-result"){t.success?(Ie&&(Ie.style.display="none"),qe&&(qe.style.display="none"),xe&&(xe.value=""),$e=null,Pe&&Pe.style.display!=="none"&&parent.postMessage({pluginMessage:{type:"get-saved-settings"}},"*")):(alert("\u274C Failed to save settings: "+(t.error||"Unknown error")),Ie&&(Ie.style.display="none"),$e=null);return}if(t&&t.type==="saved-settings-list"){Oo(t.settings||[]);return}if(t&&t.type==="project-name"){let n=t.name||"settings";if(window.pendingExportValues){let s=window.pendingExportValues;window.pendingExportValues=null;let r={name:n,values:s,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},i=JSON.stringify([r],null,2),a=new Blob([i],{type:"application/json"}),p=URL.createObjectURL(a),d=document.createElement("a");d.href=p;let y=n.replace(/[^a-z0-9]/gi,"_").toLowerCase();d.download=`${y}-settings.json`,document.body.appendChild(d),d.click(),document.body.removeChild(d),URL.revokeObjectURL(p),console.log("\u2705 Settings exported successfully")}return}if(t&&t.type==="load-settings-result"){t.success&&t.values?(Lt(t.values),be()):alert("\u274C Failed to load settings: "+(t.error||"Unknown error"));return}if(t&&t.type==="remove-settings-result"){t.success?Oo(t.settings||[]):alert("\u274C Failed to remove settings: "+(t.error||"Unknown error"));return}if(t&&t.type==="report"){h.style.display="block",h.disabled=!1,w.style.display="none",f.style.display="none",C.disabled=!1;let n=t.issues||[];S.context=t.context||null,Qe(n);let s=((o=document.querySelector('input[name="scope"]:checked'))==null?void 0:o.value)||"page";No(s,"issues",{issues:n},t.context||null)}if(t&&t.type==="tokens-report")if(C.style.display="block",C.disabled=!1,w.style.display="none",f.style.display="none",h.disabled=!1,t.error)de.innerHTML=`<div class="error-message">Error: ${u(t.error)}</div>`,De("tokens");else{S.context=t.context||null,$t(t.tokens),P.disabled=!(t.tokens&&Array.isArray(t.tokens.spacing)&&t.tokens.spacing.length>0),V.disabled=!(t.tokens&&Array.isArray(t.tokens.colors)&&t.tokens.colors.length>0),B.disabled=!(t.tokens&&Array.isArray(t.tokens.fontSize)&&t.tokens.fontSize.length>0),R.disabled=!(t.tokens&&Array.isArray(t.tokens.lineHeight)&&t.tokens.lineHeight.length>0);let n=((l=document.querySelector('input[name="scope"]:checked'))==null?void 0:l.value)||"page";No(n,"tokens",{tokens:t.tokens},t.context||null)}if(t&&t.type==="typography-styles-extracted")if(t.styles&&Array.isArray(t.styles)&&t.styles.length>0){let n=t.mode==="desktop"?"Desktop":t.mode==="tablet"?"Tablet":t.mode==="mobile"?"Mobile":"All";Q=t.styles.map((s,r)=>({id:r+1,name:s.name,styleId:s.styleId,fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing||"0",wordSpacing:s.wordSpacing||"0"})),Ke=Q.length+1,Y(),Ge(),be(),alert(`\u2705 Successfully imported ${t.styles.length} ${n} typography styles from Figma!

Styles: ${t.styles.map(s=>s.name).join(", ")}`)}else{let n=t.mode==="desktop"?"Desktop":t.mode==="tablet"?"Tablet":t.mode==="mobile"?"Mobile":"";alert(`\u26A0\uFE0F No ${n.toLowerCase()} text styles found in this Figma file.

Make sure you have defined text styles in your design system.`)}if(t&&t.type==="color-styles-extracted")if(t.colors&&Array.isArray(t.colors)&&t.colors.length>0){let n=document.getElementById("color-scale");if(!n)return;let r=Array.from(new Set(t.colors.map(i=>i.hex))).sort((i,a)=>st(i)-st(a));_={},t.colors.forEach(i=>{i.hex&&i.name&&(_[i.hex.toUpperCase()]=i.name)}),n.value=r.join(", "),typeof He=="function"&&He(),be();try{n.focus(),n.setSelectionRange(n.value.length,n.value.length)}catch(i){}alert(`\u2705 Successfully imported ${t.colors.length} color styles from Figma!

Colors: ${t.colors.map(i=>i.name+" ("+i.hex+")").join(", ")}`)}else alert(`\u26A0\uFE0F No color styles found in this Figma file.

Make sure you have defined color styles (paint styles) in your design system.`);if(t&&t.type==="color-variables-extracted")if(t.colors&&Array.isArray(t.colors)&&t.colors.length>0){let n=document.getElementById("color-scale");if(!n)return;let r=Array.from(new Set(t.colors.map(i=>i.hex))).sort((i,a)=>st(i)-st(a));_={},t.colors.forEach(i=>{i.hex&&i.name&&(_[i.hex.toUpperCase()]=i.name)}),n.value=r.join(", "),typeof He=="function"&&He(),be();try{n.focus(),n.setSelectionRange(n.value.length,n.value.length)}catch(i){}alert(`\u2705 Successfully imported ${t.colors.length} color variables from Figma!

Colors: ${t.colors.map(i=>i.name+" ("+i.hex+")").join(", ")}`)}else alert(`\u26A0\uFE0F No color variables found in this Figma file.

Make sure you have defined color variables in your design system.`)}})();})();
