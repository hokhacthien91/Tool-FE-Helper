(()=>{var Gn=Object.defineProperty,_n=Object.defineProperties;var Jn=Object.getOwnPropertyDescriptors;var Ko=Object.getOwnPropertySymbols;var Yn=Object.prototype.hasOwnProperty,Xn=Object.prototype.propertyIsEnumerable;var Qo=(b,w,m)=>w in b?Gn(b,w,{enumerable:!0,configurable:!0,writable:!0,value:m}):b[w]=m,Xe=(b,w)=>{for(var m in w||(w={}))Yn.call(w,m)&&Qo(b,m,w[m]);if(Ko)for(var m of Ko(w))Xn.call(w,m)&&Qo(b,m,w[m]);return b},Ke=(b,w)=>_n(b,Jn(w));function en(){function b(w){try{let m=w.target&&w.target.closest?w.target.closest("button"):null;if(!m)return;let k=m.closest?m.closest(".issue"):null;if(!k||!(m.closest&&m.closest(".issue-actions")))return;let C=m.getAttribute("data-id")||k.getAttribute("data-issue-id");if(!C)return;parent.postMessage({pluginMessage:{type:"select-node",id:C}},"*")}catch(m){console.error("autoSelectNodeFromIssueClick error:",m)}}document.addEventListener("click",b,!0)}function ye(b,w,m){if(!w)return;let k=document.querySelector(`.issue[data-issue-id="${b}"]`);if(!k){let O=document.querySelector(`button.btn-fix[data-id="${b}"]`);O&&(k=O.closest(".issue"))}if(!k)return;let $=k.querySelector(".fix-message");$&&$.remove();let C=document.createElement("div");C.className="fix-message",C.style.cssText=`
      margin-top: 8px;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      background: ${m?"#d4edda":"#f8d7da"};
      color: ${m?"#155724":"#721c24"};
      border: 1px solid ${m?"#c3e6cb":"#f5c6cb"};
      animation: slideIn 0.3s ease-out;
    `,C.textContent=w;let q=k.querySelector(".issue-header");q?q.parentNode.insertBefore(C,q.nextSibling):k.appendChild(C),setTimeout(()=>{C.style.animation="slideOut 0.3s ease-out",setTimeout(()=>{C.parentNode&&C.remove()},300)},5e3)}function u(b){return b==null?"":String(b).replace(/[&<>"']/g,function(m){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]})}function Yt(b){console.log("[showErrorModal] Called with message:",b);let w=document.getElementById("error-modal-overlay");w&&(console.log("[showErrorModal] Removing existing modal"),w.remove());let m=document.createElement("div");m.className="modal-overlay",m.id="error-modal-overlay",console.log("[showErrorModal] Created overlay element");let k=document.createElement("div");k.className="modal-dialog",k.style.maxWidth="450px";let $=String(b||"").replace(/^[❌⚠️✅]\s*/,"").trim();k.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title" style="color: #dc3545;">\u26A0\uFE0F Error</h2>
      </div>
      <div class="modal-body">
        <div style="padding: 16px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; margin-bottom: 16px;">
          <div style="font-size: 14px; color: #721c24; line-height: 1.6;">
            ${u($)}
          </div>
        </div>
        <div style="font-size: 12px; color: #666; line-height: 1.5;">
          Please check the issue and try again. If the problem persists, you may need to switch to Design Mode or edit the main component directly.
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-primary" id="error-modal-ok-btn" style="background: #dc3545; border-color: #dc3545; color: white;">OK</button>
      </div>
    `,m.appendChild(k),document.body.appendChild(m),console.log("[showErrorModal] Appended overlay to body, overlay visible:",m.offsetParent!==null),m.style.display="flex",m.style.visibility="visible",m.style.opacity="1";let C=k.querySelector("#error-modal-ok-btn"),q=k.querySelector(".modal-close");if(console.log("[showErrorModal] Found buttons:",{okBtn:!!C,closeBtn:!!q}),!C){console.error("[showErrorModal] OK button not found!");return}let O=()=>{m.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{m.parentNode&&m.remove()},200)};C.onclick=O,q&&(q.onclick=O),m.onclick=D=>{D.target===m&&O()},setTimeout(()=>{C.focus()},100),console.log("[showErrorModal] Modal setup complete")}function st(b){if(!b)return 0;let w=String(b).replace("#","");if(w.length<6)return 0;let m=parseInt(w.substring(0,2),16),k=parseInt(w.substring(2,4),16),$=parseInt(w.substring(4,6),16);return isNaN(m)||isNaN(k)||isNaN($)?0:(m*299+k*587+$*114)/1e3}function Nt(b,w){let m=String(b||"").replace("#",""),k=String(w||"").replace("#","");if(m.length<6||k.length<6)return 1/0;let $=parseInt(m.substring(0,2),16),C=parseInt(m.substring(2,4),16),q=parseInt(m.substring(4,6),16),O=parseInt(k.substring(0,2),16),D=parseInt(k.substring(2,4),16),T=parseInt(k.substring(4,6),16);if([$,C,q,O,D,T].some(j=>isNaN(j)))return 1/0;let R=O-$,W=D-C,F=T-q;return Math.sqrt(R*R+W*W+F*F)}function tn(b){let w=String(b||"").replace("#","");if(w.length<6)return 0;let m=parseInt(w.substring(0,2),16)/255,k=parseInt(w.substring(2,4),16)/255,$=parseInt(w.substring(4,6),16)/255;if(isNaN(m)||isNaN(k)||isNaN($))return 0;let C=m<=.03928?m/12.92:Math.pow((m+.055)/1.055,2.4),q=k<=.03928?k/12.92:Math.pow((k+.055)/1.055,2.4),O=$<=.03928?$/12.92:Math.pow(($+.055)/1.055,2.4);return .2126*C+.7152*q+.0722*O}function Bt(b,w){let m=tn(b),k=tn(w),$=Math.max(m,k),C=Math.min(m,k);return($+.05)/(C+.05)}function yt(b){if(!b||!b.message)return null;let m=(b.message||"").match(/Color (#[0-9A-Fa-f]{6})/),k=m?m[1].toUpperCase():null;if(!k)return null;let $=document.getElementById("color-scale");if(!$||!$.value.trim())return null;let C=$.value.split(",").map(D=>D.trim().toUpperCase()).filter(D=>D&&D.startsWith("#"));if(C.length===0)return null;let q=null,O=1/0;return C.forEach(D=>{let T=Nt(k,D);T<O&&(O=T,q=D)}),O>100?null:q}function ht(b){if(!b||!b.message)return null;let m=(b.message||"").match(/\((\d+)px\)/);if(!m)return null;let k=parseInt(m[1],10);if(isNaN(k))return null;let $=document.getElementById("spacing-scale");if(!$||!$.value.trim())return null;let C=$.value.split(",").map(T=>parseInt(T.trim(),10)).filter(T=>!isNaN(T)&&T>=0).sort((T,R)=>T-R);if(C.length===0)return null;let q=null,O=1/0;C.forEach(T=>{let R=Math.abs(T-k);R<O&&(O=R,q=T)});let D=Math.max(k*.2,10);return O>D?null:q}function Zn(b,w){if(!b||b.length===0){alert("No typography styles available. Please add styles in Typography Settings.");return}let m=document.createElement("div");m.className="modal-overlay",m.style.zIndex="10001";let k=document.createElement("div");k.className="modal-dialog",k.style.maxWidth="300px",k.style.padding="0",k.innerHTML=`
      <div class="modal-header" style="padding: 16px;">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title" style="font-size: 14px;">Choose Typography Style</h2>
      </div>
      <div style="max-height: 300px; overflow-y: auto;">
        ${b.map(C=>{let q=u(C.name||""),O=u(C.fontFamily||""),D=u(C.fontSize||""),T=u(C.fontWeight||"");return`
          <div class="style-dropdown-item" data-style-id="${C.id}" style="padding: 12px 16px; cursor: pointer; font-size: 13px; border-bottom: 1px solid #f0f0f0;" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='white'">
            <div style="font-weight: 600; color: #333;">${q}</div>
            <div style="font-size: 11px; color: #666; margin-top: 4px;">
              ${O} ${D}px ${T}
            </div>
          </div>
        `}).join("")}
      </div>
    `,m.appendChild(k),document.body.appendChild(m);let $=()=>{m.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{m.parentNode&&m.remove()},200)};k.querySelector(".modal-close").onclick=$,m.onclick=C=>{C.target===m&&$()},k.querySelectorAll(".style-dropdown-item").forEach(C=>{C.onclick=q=>{q.preventDefault(),q.stopPropagation();let O=parseInt(C.getAttribute("data-style-id"),10),D=b.find(T=>T.id===O);D&&w&&(w(D),$())}})}function on(b,w){if(!b||!b.bestMatch){console.error("showTypographyFixModal: missing issue or bestMatch");return}let m=b.nodeProps||{},k=b.bestMatch,$=m.fontFamily||"",C=m.fontSize!==null&&m.fontSize!==void 0?m.fontSize:"",q=m.fontWeight||"",O=m.lineHeight||"",D=m.letterSpacing!==null&&m.letterSpacing!==void 0?m.letterSpacing:"",T=$,R=C,W=q,F=O,j=D;k.differences&&k.differences.forEach(J=>{J.property==="Font Family"&&J.expected?T=J.expected:J.property==="Font Size"&&J.expected?R=J.expected.replace("px",""):J.property==="Font Weight"&&J.expected?W=J.expected:J.property==="Line Height"&&J.expected?F=J.expected:J.property==="Letter Spacing"&&J.expected&&(j=J.expected)});let ce=document.createElement("div");ce.className="modal-overlay",ce.id="typography-fix-modal-overlay";let K=document.createElement("div");K.className="modal-dialog",K.style.maxWidth="500px",K.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Fix Typography Style</h2>
        <p class="modal-subtitle">Node: ${u(b.nodeName||"Unnamed")} \u2192 Suggested: ${u(k.name)}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">
            Edit values below and click Apply to fix:
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Font Family</label>
            <input type="text" class="modal-input" id="fix-font-family" value="${u(T)}" style="width: 100%;" />
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Font Size (px)</label>
            <input type="number" class="modal-input" id="fix-font-size" value="${u(R)}" style="width: 100%;" />
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Font Weight</label>
            <select class="modal-input" id="fix-font-weight" style="width: 100%;">
              <option value="Regular" ${W==="Regular"?"selected":""}>Regular</option>
              <option value="Medium" ${W==="Medium"?"selected":""}>Medium</option>
              <option value="SemiBold" ${W==="SemiBold"||W==="Semi Bold"?"selected":""}>SemiBold</option>
              <option value="Bold" ${W==="Bold"?"selected":""}>Bold</option>
            </select>
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Line Height (% or px or auto)</label>
            <input type="text" class="modal-input" id="fix-line-height" value="${u(F)}" style="width: 100%;" placeholder="e.g. 120%, 24px, auto" />
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Letter Spacing (px or %)</label>
            <input type="text" class="modal-input" id="fix-letter-spacing" value="${u(j)}" style="width: 100%;" placeholder="e.g. 0, 0.5px, 1%" />
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
    `,ce.appendChild(K),document.body.appendChild(ce);let ne=K.querySelector("#fix-font-family"),le=K.querySelector("#fix-font-size"),me=K.querySelector("#fix-font-weight"),ee=K.querySelector("#fix-line-height"),se=K.querySelector("#fix-letter-spacing"),B=K.querySelector("#choose-typo-style-btn"),ue=K.querySelector("#typography-fix-modal-cancel-btn"),_=K.querySelector("#typography-fix-modal-apply-btn"),ge=K.querySelector(".modal-close");setTimeout(()=>{ne.focus()},100);let x=()=>{ce.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{ce.parentNode&&ce.remove()},200)};ue.onclick=x,ge.onclick=x,ce.onclick=J=>{J.target===ce&&x()},B.onclick=()=>{Zn(w,J=>{J&&(ne.value=J.fontFamily||"",le.value=J.fontSize||"",me.value=J.fontWeight||"Regular",ee.value=J.lineHeight||"",se.value=J.letterSpacing||"0")})},_.onclick=()=>{let J={fontFamily:ne.value.trim(),fontSize:le.value.trim(),fontWeight:me.value,lineHeight:ee.value.trim(),letterSpacing:se.value.trim()};if(!J.fontFamily){ne.focus(),ne.style.borderColor="#ff3b30",setTimeout(()=>{ne.style.borderColor="#0071e3"},2e3);return}if(!J.fontSize||isNaN(parseFloat(J.fontSize))){le.focus(),le.style.borderColor="#ff3b30",setTimeout(()=>{le.style.borderColor="#0071e3"},2e3);return}x(),ye(b.id,"\u23F3 Fixing...",!0),parent.postMessage({pluginMessage:{type:"fix-issue",issue:b,fixData:J}},"*")}}function Kn(b,w){if(b===w)return 100;let m=100,k=Math.abs(b-w);return Math.max(0,Math.round((1-k/m)*100))}function nn(b,w,m,k){let $=document.createElement("div");$.className="modal-overlay",$.id="spacing-picker-modal-overlay";let C=document.createElement("div");C.className="modal-dialog",C.style.maxWidth="400px";let q=k.map(F=>`
        <div class="spacing-picker-item" data-value="${F}" style="
          padding: 12px;
          margin-bottom: 8px;
          border: 2px solid ${m===F?"#0071e3":"#ddd"};
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: white;
          transition: all 0.2s;
        " onmouseover="this.style.borderColor='#0071e3'; this.style.boxShadow='0 2px 8px rgba(0,113,227,0.2)'" onmouseout="this.style.borderColor='${m===F?"#0071e3":"#ddd"}'; this.style.boxShadow='none'">
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
            ">${F}px</div>
            <div style="font-weight: 600; font-size: 14px; color: #333;">
              ${F}px
            </div>
          </div>
          ${m===F?'<div style="color: #0071e3; font-weight: 600;">Current</div>':""}
        </div>
      `).join(""),O=String(w||"").replace(/([A-Z])/g," $1").replace(/^./,F=>F.toUpperCase()).trim();C.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Choose Spacing Value</h2>
        <p class="modal-subtitle">Node: ${u(b.nodeName||"Unnamed")} - ${u(O)}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current Value:</div>
          <div style="font-size: 16px; font-weight: 600; color: #333;">${m}px</div>
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
          ${q}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="spacing-picker-modal-cancel-btn">Cancel</button>
      </div>
    `,$.appendChild(C),document.body.appendChild($);let D=C.querySelector("#spacing-picker-modal-cancel-btn"),T=C.querySelector(".modal-close"),R=C.querySelectorAll(".spacing-picker-item"),W=()=>{$.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{$.parentNode&&$.remove()},200)};D.onclick=W,T.onclick=W,$.onclick=F=>{F.target===$&&W()},R.forEach(F=>{F.onclick=j=>{j.preventDefault(),j.stopPropagation();let ce=parseInt(F.getAttribute("data-value"),10);W(),At(b,w,m,ce)}})}function At(b,w,m,k,$=[],C={}){let{onApply:q,onIgnore:O,onCancel:D,showIgnore:T=!1,progress:R}=C,W=String(w||"").replace(/([A-Z])/g," $1").replace(/^./,X=>X.toUpperCase()).trim(),j=($.length>0?$:[0,4,8,12,16,24,32,40,48,64,72,80,88,96]).map(X=>({value:X,similarity:Kn(m,X),diff:Math.abs(m-X)})).sort((X,fe)=>k!==void 0&&X.value===k?-1:k!==void 0&&fe.value===k?1:X.diff-fe.diff).slice(0,5);if(j.length===0){alert("No spacing values available");return}let ce=j[0].value,K=(X,fe)=>{let ve=X.value!==m;return`
      <div class="spacing-option-item" data-value="${X.value}" style="
        padding: 10px 12px;
        margin-bottom: 6px;
        border: 2px solid ${fe?"#0071e3":"#e0e0e0"};
        border-radius: 8px;
        cursor: pointer;
        background: ${fe?"#e3f2fd":"white"};
        display: flex;
        align-items: center;
        gap: 12px;
        transition: all 0.15s;
      ">
        <input type="radio" name="spacing-option" ${fe?"checked":""} style="margin: 0; cursor: pointer;" />
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 6px;
          background: ${fe?"#e3f2fd":"#f0f0f0"};
          border: 2px solid ${fe?"#0071e3":"#ddd"};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          color: ${fe?"#0071e3":"#666"};
          flex-shrink: 0;
        ">${X.value}</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 13px; color: #333;">${X.value}px</div>
          <div style="font-size: 10px; color: ${ve?"#721c24":"#155724"};">
            ${ve?`\u26A0 \u0394${X.value>m?"+":""}${X.value-m}px`:"\u2713 Same"}
          </div>
        </div>
        <span style="font-size: 11px; color: #666; background: #f0f0f0; padding: 2px 8px; border-radius: 10px;">${X.similarity}%</span>
      </div>
    `},ne=document.createElement("div");ne.className="modal-overlay",ne.id="spacing-fix-confirm-modal-overlay";let le=document.createElement("div");le.className="modal-dialog",le.style.maxWidth="420px";let me=R?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${R.current}/${R.total}</div>`:"",ee=j.map((X,fe)=>K(X,fe===0)).join("");le.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Apply Suggested Spacing</h2>
        <p class="modal-subtitle">Node: ${u(b.nodeName||"Unnamed")} - ${u(W)}</p>
      </div>
      ${me}
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
          ">${m}</div>
          <div>
            <div style="font-size: 11px; color: #666;">Current ${u(W)}:</div>
            <div style="font-size: 14px; font-weight: 600;">${m}px</div>
          </div>
        </div>
        <div style="font-size: 12px; font-weight: 600; color: #333; margin-bottom: 8px;">
          Select a value to apply (Top 5 closest):
        </div>
        <div id="spacing-options-container" style="max-height: 280px; overflow-y: auto;">
          ${ee}
        </div>
      </div>
      <div class="modal-footer">
        ${T?'<button class="modal-btn modal-btn-cancel" id="spacing-fix-ignore-btn" style="background: #6c757d; border-color: #6c757d; color: white;">Ignore</button>':""}
        <button class="modal-btn modal-btn-cancel" id="spacing-fix-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="spacing-fix-confirm-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `,ne.appendChild(le),document.body.appendChild(ne);let se=le.querySelector("#spacing-fix-confirm-cancel-btn"),B=le.querySelector("#spacing-fix-confirm-apply-btn"),ue=le.querySelector("#spacing-fix-ignore-btn"),_=le.querySelector(".modal-close"),ge=le.querySelector("#spacing-options-container"),x=X=>{ce=X,ge.querySelectorAll(".spacing-option-item").forEach(ve=>{let Q=parseInt(ve.getAttribute("data-value"),10)===X;ve.style.border=Q?"2px solid #0071e3":"2px solid #e0e0e0",ve.style.background=Q?"#e3f2fd":"white";let Qe=ve.querySelector('input[type="radio"]');Qe&&(Qe.checked=Q)})};(()=>{ge.querySelectorAll(".spacing-option-item").forEach(fe=>{fe.onclick=ve=>{ve.preventDefault();let Oe=parseInt(fe.getAttribute("data-value"),10);x(Oe)}})})();let oe=()=>{ne.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{ne.parentNode&&ne.remove()},200)};se.onclick=()=>{oe(),D&&typeof D=="function"&&D()},_.onclick=()=>{oe(),D&&typeof D=="function"&&D()},ne.onclick=X=>{X.target===ne&&(oe(),D&&typeof D=="function"&&D())},B.onclick=()=>{oe(),ye(b.id,"\u23F3 Fixing spacing...",!0),parent.postMessage({pluginMessage:{type:"fix-spacing-issue",issue:b,propertyName:w,value:ce}},"*"),q&&typeof q=="function"&&q()},ue&&(ue.onclick=()=>{oe(),O&&typeof O=="function"&&O()})}function bt(b){try{let w=parseInt(b.slice(1,3),16),m=parseInt(b.slice(3,5),16),k=parseInt(b.slice(5,7),16);return(w*299+m*587+k*114)/1e3>128?"#000000":"#ffffff"}catch(w){return"#000000"}}function Qn(b,w){let m=b.replace("#",""),k=w.replace("#",""),$=parseInt(m.substr(0,2),16),C=parseInt(m.substr(2,2),16),q=parseInt(m.substr(4,2),16),O=parseInt(k.substr(0,2),16),D=parseInt(k.substr(2,2),16),T=parseInt(k.substr(4,2),16);return Math.sqrt(Math.pow($-O,2)+Math.pow(C-D,2)+Math.pow(q-T,2))}function el(b,w){let k=Qn(b,w);return Math.round((1-k/441.67)*100)}function Xt(b,w,m,k="",$=""){return bt(b),`
      <div class="color-picker-item" data-color="${u(b)}" style="
        padding: 12px;
        margin-bottom: 8px;
        border: 2px solid ${m};
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
        background: white;
        transition: all 0.2s;
      " onmouseover="this.style.borderColor='#0071e3'; this.style.boxShadow='0 2px 8px rgba(0,113,227,0.2)'" onmouseout="this.style.borderColor='${m}'; this.style.boxShadow='none'">
        <div style="
          width: 48px;
          height: 48px;
          border-radius: 6px;
          background: ${u(b)};
          border: 2px solid #ddd;
          flex-shrink: 0;
        "></div>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 14px; color: #333; margin-bottom: 4px;">
            ${w||u(b)}
          </div>
          <div style="font-size: 12px; color: #666; font-family: 'SF Mono', Monaco, monospace;">
            ${u(b)}
          </div>
          ${k?`<div style="font-size: 11px; color: #666; margin-top: 4px;">${k}</div>`:""}
        </div>
        ${$?`<div style="color: #0071e3; font-weight: 600; margin-left: auto;">${$}</div>`:""}
      </div>
    `}function ln(b,w,m,k={}){if(!w){let F=(b.message||"").match(/Color (#[0-9A-Fa-f]{6})/);w=F?F[1].toUpperCase():null}if(!w){alert("Cannot determine current color from issue message");return}let $=document.createElement("div");$.className="modal-overlay",$.id="color-picker-modal-overlay";let C=document.createElement("div");C.className="modal-dialog",C.style.maxWidth="400px";let q=m.map(W=>{let F=k[W]||"";return Xt(W,F||W,w===W?"#0071e3":"#ddd","",w===W?"Current":"")}).join("");C.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Choose Color</h2>
        <p class="modal-subtitle">Node: ${u(b.nodeName||"Unnamed")}</p>
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
          ${q}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="color-picker-modal-cancel-btn">Cancel</button>
      </div>
    `,$.appendChild(C),document.body.appendChild($);let O=C.querySelector("#color-picker-modal-cancel-btn"),D=C.querySelector(".modal-close"),T=C.querySelectorAll(".color-picker-item"),R=()=>{$.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{$.parentNode&&$.remove()},200)};O.onclick=R,D.onclick=R,$.onclick=W=>{W.target===$&&R()},T.forEach(W=>{W.onclick=F=>{F.preventDefault(),F.stopPropagation();let j=W.getAttribute("data-color");R(),Lt(b,w,j,k)}})}function Lt(b,w,m,k={},$=[],C={}){let{onApply:q,onIgnore:O,onCancel:D,showIgnore:T=!1,progress:R}=C,W=$.length>0?$:Object.keys(k);W.length===0&&m&&(W=[m]);let F=W.map(oe=>({color:oe,name:k[oe]||oe,similarity:el(w,oe)})).sort((oe,X)=>m&&oe.color===m?-1:m&&X.color===m?1:X.similarity-oe.similarity).slice(0,5);if(F.length===0){alert("No colors available");return}let j=F[0].color,ce=(oe,X)=>`
      <div class="color-option-item" data-color="${u(oe.color)}" style="
        padding: 10px 12px;
        margin-bottom: 6px;
        border: 2px solid ${X?"#0071e3":"#e0e0e0"};
        border-radius: 8px;
        cursor: pointer;
        background: ${X?"#e3f2fd":"white"};
        display: flex;
        align-items: center;
        gap: 12px;
        transition: all 0.15s;
      ">
        <input type="radio" name="color-option" ${X?"checked":""} style="margin: 0; cursor: pointer;" />
        <div style="
          width: 36px;
          height: 36px;
          border-radius: 6px;
          background: ${u(oe.color)};
          border: 2px solid ${X?"#0071e3":"#ddd"};
          flex-shrink: 0;
        "></div>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 13px; color: #333;">${u(oe.name)}</div>
          <div style="font-size: 11px; color: #666; font-family: 'SF Mono', Monaco, monospace;">${u(oe.color)}</div>
        </div>
        <span style="font-size: 11px; color: #666; background: #f0f0f0; padding: 2px 8px; border-radius: 10px;">${oe.similarity}%</span>
      </div>
    `,K=document.createElement("div");K.className="modal-overlay",K.id="color-fix-confirm-modal-overlay";let ne=document.createElement("div");ne.className="modal-dialog",ne.style.maxWidth="420px";let le=R?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${R.current}/${R.total}</div>`:"",me=F.map((oe,X)=>ce(oe,X===0)).join("");ne.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Apply Suggested Color</h2>
        <p class="modal-subtitle">Node: ${u(b.nodeName||"Unnamed")}</p>
      </div>
      ${le}
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
          ${me}
        </div>
      </div>
      <div class="modal-footer">
        ${T?'<button class="modal-btn modal-btn-cancel" id="color-fix-ignore-btn" style="background: #6c757d; border-color: #6c757d; color: white;">Ignore</button>':""}
        <button class="modal-btn modal-btn-cancel" id="color-fix-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="color-fix-confirm-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `,K.appendChild(ne),document.body.appendChild(K);let ee=ne.querySelector("#color-fix-confirm-cancel-btn"),se=ne.querySelector("#color-fix-confirm-apply-btn"),B=ne.querySelector("#color-fix-ignore-btn"),ue=ne.querySelector(".modal-close"),_=ne.querySelector("#color-options-container"),ge=oe=>{j=oe,_.querySelectorAll(".color-option-item").forEach(fe=>{let Oe=fe.getAttribute("data-color")===oe;fe.style.border=Oe?"2px solid #0071e3":"2px solid #e0e0e0",fe.style.background=Oe?"#e3f2fd":"white";let Q=fe.querySelector('input[type="radio"]');Q&&(Q.checked=Oe)})};(()=>{_.querySelectorAll(".color-option-item").forEach(X=>{X.onclick=fe=>{fe.preventDefault();let ve=X.getAttribute("data-color");ge(ve)}})})();let J=()=>{K.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{K.parentNode&&K.remove()},200)};ee.onclick=()=>{J(),D&&typeof D=="function"&&D()},ue.onclick=()=>{J(),D&&typeof D=="function"&&D()},K.onclick=oe=>{oe.target===K&&(J(),D&&typeof D=="function"&&D())},se.onclick=()=>{J(),ye(b.id,"\u23F3 Fixing color...",!0),parent.postMessage({pluginMessage:{type:"fix-color-issue",issue:b,color:j}},"*"),q&&typeof q=="function"&&q()},B&&(B.onclick=()=>{J(),O&&typeof O=="function"&&O()})}function Zt({reportData:b,getTypeDisplayName:w}){let m=b||{},k=m.issues||[],$=m.tokens||null,C=m.timestamp||Date.now(),q=new Date(C).toLocaleString("vi-VN"),O="Design Review",D=R=>{try{return typeof w=="function"?w(R):String(R||"")}catch(W){return String(R||"")}},T=`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Design Review Report - ${q}</title>
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
      background: #3b82f6;
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
      <div class="meta">Generated: ${q} | Page: ${O}</div>
    </div>`;if(k&&k.length>0){let R={error:k.filter(F=>F.severity==="error").length,warn:k.filter(F=>F.severity==="warn").length,total:k.length},W=k.reduce((F,j)=>(F[j.type]=F[j.type]||[],F[j.type].push(j),F),{});T+=`
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
      </div>`;for(let[F,j]of Object.entries(W)){let ce=u(D(F));T+=`
      <div class="issue-group collapsed" data-type="${F}" data-label="${ce}">
        <div class="issue-group-header">
          <button class="issue-group-toggle" type="button">+</button>
          <span>${ce} (${j.length})</span>
        </div>
        <div class="issue-group-content">`,j.forEach(K=>{T+=`
          <div class="issue ${K.severity}">
            <div class="issue-type">${String(K.severity||"").toUpperCase()}</div>
            <div class="issue-message">${u(K.message)}</div>
            ${K.nodeName?`<div class="issue-node">Node: ${u(K.nodeName)}</div>`:""}
          </div>`}),T+=`
        </div>
      </div>`}T+=`
    </div>`}if($){T+=`
    <div class="section">
      <h2 class="section-title">\u{1F3A8} Design Tokens</h2>`;let R={colors:{label:"Colors",values:$.colors||[]},gradients:{label:"Gradients",values:$.gradients||[]},borderRadius:{label:"Border Radius",values:$.borderRadius||[]},fontWeight:{label:"Font Weight",values:$.fontWeight||[]},lineHeight:{label:"Line Height (%)",values:$.lineHeight||[]},fontSize:{label:"Font Size",values:$.fontSize||[]},fontFamily:{label:"Font Family",values:$.fontFamily||[]}};for(let[W,F]of Object.entries(R)){if(T+=`
      <div class="issue-group collapsed">
        <div class="issue-group-header">
          <button class="issue-group-toggle" type="button">+</button>
          <span>${F.label} (${F.values.length})</span>
        </div>
        <div class="issue-group-content">`,!F.values||F.values.length===0){T+=`
          <div class="token-empty-message">No tokens in this group.</div>`,T+=`
        </div>
      </div>`;continue}T+=`
          <div class="token-list">`,F.values.forEach(j=>{let ce=j.value,K=typeof j.totalNodes=="number"?j.totalNodes:j.nodes?j.nodes.length:0,ne=j.colorType||"";if(W==="colors")T+=`
          <div class="token-item">
            <div class="token-value">
              <span class="token-color-preview" style="background-color: ${u(ce)}"></span>
              ${u(ce)}
              ${ne?`<span class="token-color-type">${u(ne)}</span>`:""}
            </div>
            ${K>1?`<div class="token-node-count">Used in ${K} nodes</div>`:""}
          </div>`;else if(W==="gradients")T+=`
          <div class="token-item">
            <div class="token-value">
              <span class="token-color-preview" style="background: ${u(ce)}"></span>
              ${u(ce)}
              ${ne?`<span class="token-color-type">${u(ne)}</span>`:""}
            </div>
            ${K>1?`<div class="token-node-count">Used in ${K} nodes</div>`:""}
          </div>`;else{let le="";if(W==="fontWeight"){let me=Array.isArray(j.fontFamilies)?j.fontFamilies:null;if(!me){let ee={};(Array.isArray(j.nodes)?j.nodes:[]).forEach(B=>{let ue=B&&B.fontFamily?String(B.fontFamily):"Unknown";ee[ue]=(ee[ue]||0)+1}),me=Object.entries(ee).map(([B,ue])=>({family:B,count:ue})).sort((B,ue)=>ue.count-B.count||B.family.localeCompare(ue.family))}Array.isArray(me)&&me.length>0&&(le=`<div class="token-node-count" style="margin-top: 6px;">Font-family:<br/>${me.map(se=>`${u(se.family)} (${se.count})`).join("<br/>")}</div>`)}T+=`
          <div class="token-item">
            <div class="token-value">${u(String(ce))}</div>
            ${K>1?`<div class="token-node-count">Used in ${K} nodes</div>`:""}
            ${le}
          </div>`}}),T+=`
          </div>
        </div>
      </div>`}T+=`
    </div>`}return T+=`
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
</html>`,T}function tl(){let b=new Date,w=b.getFullYear(),m=String(b.getMonth()+1).padStart(2,"0"),k=String(b.getDate()).padStart(2,"0"),$=String(b.getHours()).padStart(2,"0"),C=String(b.getMinutes()).padStart(2,"0"),q=String(b.getSeconds()).padStart(2,"0");return`design-review-report-${w}-${m}-${k}-${$}-${C}-${q}`}function ol(b,w){if(!b||!Array.isArray(b.colors))return b;let m=w||{};return Ke(Xe({},b),{colors:b.colors.map(k=>Ke(Xe({},k),{name:m[String(k.value).toUpperCase()]||"No name"}))})}function sn({format:b,reportData:w,getTypeDisplayName:m,filenameBase:k,colorNameMap:$}={}){var O,D;let C=w||{};if(!C.issues&&!C.tokens){alert("No data to export!");return}let q=k||tl();if(b==="html"){let T=Zt({reportData:C,getTypeDisplayName:m}),R=new Blob([T],{type:"text/html"}),W=URL.createObjectURL(R),F=document.createElement("a");F.href=W,F.download=`${q}.html`,F.click(),URL.revokeObjectURL(W);return}if(b==="pdf"){let T=Zt({reportData:C,getTypeDisplayName:m});try{let R=window.open("","_blank");if(!R){alert("Popup blocked. Downloading HTML - you can open the file and select Print to create PDF.");let W=new Blob([T],{type:"text/html"}),F=URL.createObjectURL(W),j=document.createElement("a");j.href=F,j.download=`${q}.html`,j.click(),URL.revokeObjectURL(F);return}R.document.open(),R.document.write(T),R.document.close(),R.onload=()=>{setTimeout(()=>{R.print()},250)},setTimeout(()=>{R.document&&R.document.readyState==="complete"&&R.print()},500)}catch(R){console.error("Error opening print window:",R),alert("Cannot open print window. Downloading HTML - you can open the file and select Print to create PDF.");let W=new Blob([T],{type:"text/html"}),F=URL.createObjectURL(W),j=document.createElement("a");j.href=F,j.download=`${q}.html`,j.click(),URL.revokeObjectURL(F)}return}if(b==="json"){console.log("Export JSON - colorNameMap:",$),console.log("Export JSON - tokens.colors:",(O=C.tokens)==null?void 0:O.colors);let T=Ke(Xe({},C),{tokens:ol(C.tokens,$)});console.log("Export JSON - enriched colors:",(D=T.tokens)==null?void 0:D.colors);let R=JSON.stringify(T,null,2),W=new Blob([R],{type:"application/json"}),F=URL.createObjectURL(W),j=document.createElement("a");j.href=F,j.download=`${q}.json`,j.click(),URL.revokeObjectURL(F);return}}function an({maxHistory:b=10,postPluginMessage:w,getCurrentReportData:m,setIsViewingTokens:k,renderResults:$,renderTokens:C}={}){let q=[],O=!1,D=ee=>{try{typeof w=="function"&&w(ee)}catch(se){console.error("scanHistory postPluginMessage error:",se)}};function T(ee){q=(Array.isArray(ee)?ee:[]).slice(0,b)}function R(){q=[],O=!1}function W(){return q||[]}function F(ee,se,B,ue){try{if(se==="issues"&&(!B.issues||B.issues.length===0)){console.log("Skipping save - no issues data");return}if(se==="tokens"&&(!B.tokens||Object.keys(B.tokens).length===0)){console.log("Skipping save - no tokens data");return}let _={id:Date.now().toString(),mode:ee,type:se,timestamp:new Date().toISOString(),context:ue||null,data:{issues:B.issues||null,tokens:B.tokens||null,issuesCount:B.issues?B.issues.length:0,tokensCount:B.tokens?Object.keys(B.tokens).reduce((x,J)=>{var oe;return x+(((oe=B.tokens[J])==null?void 0:oe.length)||0)},0):0}};q.unshift(_),q=q.slice(0,b);let ge=document.getElementById("history-panel");ge&&ge.style.display!=="none"&&le(),D({type:"save-history-entry",entry:_})}catch(_){console.error("Error saving scan history:",_)}}function j(){D({type:"get-history"})}function ce(){try{let ee=W();if(ee.length>0){let se=ee[0],B=document.querySelector(`input[name="scope"][value="${se.mode}"]`);B&&(B.checked=!0,console.log("Loaded last scan mode:",se.mode))}}catch(ee){console.error("Error loading last scan mode:",ee)}}function K(){O||(ce(),O=!0)}function ne(ee){try{let se=new Date(ee),ue=new Date-se,_=Math.floor(ue/6e4),ge=Math.floor(ue/36e5),x=Math.floor(ue/864e5);return _<1?"Just now":_<60?`${_} minutes ago`:ge<24?`${ge} hours ago`:x<7?`${x} days ago`:se.toLocaleString("en-US",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}catch(se){return ee}}function le(){let ee=document.getElementById("history-list");if(!ee){console.error("history-list element not found");return}let se=W();if(console.log("Rendering scan history:",se.length,"entries"),se.length===0){ee.innerHTML=`
              <div class="history-empty">
                <div class="icon">\u{1F4CB}</div>
                <p>No scan history</p>
                <p style="font-size: 11px; margin-top: 8px;">Scans will be saved automatically</p>
              </div>
            `;return}ee.innerHTML=se.map(B=>{var X,fe;let ue=ne(B.timestamp),_=B.mode==="page"?"Page":"Selection",ge=B.type==="issues"?"Issues":"Tokens",x=B.type==="issues"?"issues":"tokens",J=B.context&&B.context.label?B.context.label:`${_} scan`,oe="";if(B.type==="issues"){let ve=((X=B.data.issues)==null?void 0:X.filter(Q=>Q.severity==="error").length)||0,Oe=((fe=B.data.issues)==null?void 0:fe.filter(Q=>Q.severity==="warn").length)||0;oe=`
                <span>\u274C ${ve} errors</span>
                <span>\u26A0\uFE0F ${Oe} warnings</span>
                <span>\u{1F4CA} ${B.data.issuesCount} total</span>
              `}else oe=`
                <span>\u{1F3A8} ${B.data.tokensCount} tokens</span>
              `;return`
              <div class="history-item" data-id="${B.id}">
                <div class="history-item-header">
                  <span class="history-item-type ${x}">${ge}</span>
                  <span class="history-item-time">${ue}</span>
                </div>
                <div class="history-item-info">${u(J)}</div>
                <div class="history-item-stats">${oe}</div>
              </div>
            `}).join(""),ee.querySelectorAll(".history-item").forEach(B=>{B.onclick=()=>{let ue=B.getAttribute("data-id");me(ue)}})}function me(ee){try{let B=W().find(x=>x.id===ee);if(!B){alert("Scan history entry not found!");return}let ue=document.querySelector(`input[name="scope"][value="${B.mode}"]`);ue&&(ue.checked=!0);let _=typeof m=="function"?m():null;if(!_){console.warn("restoreReportFromHistory: currentReportData is not available");return}_.scanMode=B.mode,_.context=B.context||null,B.type==="issues"&&B.data.issues?(_.issues=B.data.issues,_.tokens=null,typeof k=="function"&&k(!1),typeof $=="function"&&$(B.data.issues,!0,{restoreTimestamp:B.timestamp})):B.type==="tokens"&&B.data.tokens&&(_.issues=null,_.tokens=B.data.tokens,typeof k=="function"&&k(!0),typeof C=="function"&&C(B.data.tokens,!0,{restoreTimestamp:B.timestamp}));let ge=document.getElementById("history-panel");ge&&(ge.style.display="none"),console.log("Report restored from history:",ee)}catch(se){console.error("Error restoring report from history:",se),alert("Error restoring report: "+se.message)}}return{setHistory:T,clearLocalHistory:R,getScanHistory:W,saveScanHistory:F,requestScanHistory:j,loadLastScanMode:ce,loadLastScanModeOnce:K,renderScanHistory:le,restoreReportFromHistory:me}}var rn=4;console.log("Header.js22121211thien2");console.log("ui.js loaded");(function(){console.log("Initializing ui.js...");let b=document.getElementById("btn-scan"),w=document.getElementById("btn-cancel-scan"),m=document.getElementById("scan-progress"),k=document.getElementById("scan-progress-bar"),$=document.getElementById("scan-progress-text"),C=document.getElementById("btn-extract-tokens"),q=document.getElementById("btn-fill-spacing-scale"),O=document.getElementById("btn-fill-color-scale"),D=document.getElementById("btn-extract-color-styles"),T=document.getElementById("btn-fill-font-size-scale"),R=document.getElementById("btn-fill-line-height-scale"),W=document.getElementById("btn-fill-font-size-from-typo"),F=document.getElementById("btn-fill-line-height-from-typo"),j=document.getElementById("btn-export"),ce=document.getElementById("btn-history"),K=document.getElementById("btn-close-history"),ne=document.getElementById("btn-reset-all"),le=document.getElementById("results-issues"),me=document.getElementById("results-tokens"),ee=document.getElementById("btn-close"),se=document.querySelectorAll(".report-tab"),B=document.querySelectorAll(".report-content"),ue="issues";if(!b||!C||!le||!me||!ee||!j||!ce||!q||!O||!T||!R){console.error("Required elements not found",{btnScan:b,btnExtractTokens:C,btnFillSpacingScale:q,btnFillColorScale:O,btnFillFontSizeScale:T,btnFillLineHeightScale:R,resultsIssues:le,resultsTokens:me,btnClose:ee,btnExport:j,btnHistory:ce});return}en();let _={},ge={},x={issues:null,tokens:null,scanMode:null,timestamp:null,tokensTimestamp:null,context:null},J=new Map,oe=1e3;function X(){J.clear()}function fe(e,t){if(J.has(e))return J.get(e);let o=t();return J.size>=oe&&Array.from(J.keys()).slice(0,100).forEach(n=>J.delete(n)),J.set(e,o),o}let ve=null,Oe=5e3,Q=[{id:1,name:"H1",fontFamily:"Inter",fontSize:48,fontWeight:"Bold",lineHeight:"120%",letterSpacing:"0",wordSpacing:"0"},{id:2,name:"H2",fontFamily:"Inter",fontSize:36,fontWeight:"Bold",lineHeight:"130%",letterSpacing:"0",wordSpacing:"0"},{id:3,name:"H3",fontFamily:"Inter",fontSize:28,fontWeight:"SemiBold",lineHeight:"130%",letterSpacing:"0",wordSpacing:"0"},{id:4,name:"H4",fontFamily:"Inter",fontSize:24,fontWeight:"SemiBold",lineHeight:"140%",letterSpacing:"0",wordSpacing:"0"},{id:5,name:"H5",fontFamily:"Inter",fontSize:20,fontWeight:"Medium",lineHeight:"140%",letterSpacing:"0",wordSpacing:"0"},{id:6,name:"H6",fontFamily:"Inter",fontSize:18,fontWeight:"Medium",lineHeight:"140%",letterSpacing:"0",wordSpacing:"0"},{id:7,name:"Body",fontFamily:"Inter",fontSize:16,fontWeight:"Regular",lineHeight:"150%",letterSpacing:"0",wordSpacing:"0"}],Qe=8;function wt(e){var n;if(!e||!e.bestMatch||!e.bestMatch.name)return!1;let t=(n=e.nodeProps)==null?void 0:n.fontSize;if(t==null)return!0;let o=Q==null?void 0:Q.find(s=>s.name===e.bestMatch.name);if(!o||!o.fontSize)return!0;let l=Math.abs(t-o.fontSize);return l>rn?(console.log(`[isValidTypographySuggestion] Font-size difference (${l}px) exceeds threshold (${rn}px) for issue:`,e.id,`Current: ${t}px, Suggested: ${o.fontSize}px`),!1):!0}function Ht(e){e&&parent.postMessage({pluginMessage:{type:"save-last-report",report:e}},"*")}function Kt(){parent.postMessage({pluginMessage:{type:"get-last-report"}},"*")}function be(){var t,o,l,n,s,a,i,r,p,d,y,g,f,v,h;let e={spacingScale:((t=document.getElementById("spacing-scale"))==null?void 0:t.value)||"",spacingThreshold:((o=document.getElementById("spacing-threshold"))==null?void 0:o.value)||"100",colorScale:((l=document.getElementById("color-scale"))==null?void 0:l.value)||"",colorNameMap:_,ignoredIssues:ge,fontSizeScale:((n=document.getElementById("font-size-scale"))==null?void 0:n.value)||"",fontSizeThreshold:((s=document.getElementById("font-size-threshold"))==null?void 0:s.value)||"100",lineHeightScale:((a=document.getElementById("line-height-scale"))==null?void 0:a.value)||"",lineHeightThreshold:((i=document.getElementById("line-height-threshold"))==null?void 0:i.value)||"300",lineHeightBaselineThreshold:((r=document.getElementById("line-height-baseline-threshold"))==null?void 0:r.value)||"120",typographyStyles:Q,typographyRules:{checkStyle:((p=document.getElementById("rule-typo-style"))==null?void 0:p.checked)||!0,checkFontFamily:((d=document.getElementById("rule-font-family"))==null?void 0:d.checked)||!0,checkFontSize:((y=document.getElementById("rule-font-size"))==null?void 0:y.checked)||!0,checkFontWeight:((g=document.getElementById("rule-font-weight"))==null?void 0:g.checked)||!0,checkLineHeight:((f=document.getElementById("rule-line-height"))==null?void 0:f.checked)||!0,checkLetterSpacing:((v=document.getElementById("rule-letter-spacing"))==null?void 0:v.checked)||!1,checkWordSpacing:((h=document.getElementById("rule-word-spacing"))==null?void 0:h.checked)||!1}};parent.postMessage({pluginMessage:{type:"save-input-values",values:e}},"*")}function Qt(){parent.postMessage({pluginMessage:{type:"get-input-values"}},"*")}function qt(e){if(!e)return;let t=document.getElementById("spacing-scale"),o=document.getElementById("spacing-threshold"),l=document.getElementById("color-scale"),n=document.getElementById("font-size-scale"),s=document.getElementById("font-size-threshold"),a=document.getElementById("line-height-scale"),i=document.getElementById("line-height-threshold"),r=document.getElementById("line-height-baseline-threshold");if(t&&e.spacingScale!==void 0&&(t.value=e.spacingScale),o&&e.spacingThreshold!==void 0&&(o.value=e.spacingThreshold),e.colorNameMap&&typeof e.colorNameMap=="object"?_=e.colorNameMap:_={},e.ignoredIssues&&typeof e.ignoredIssues=="object"?ge=e.ignoredIssues:ge={},l&&e.colorScale!==void 0&&(l.value=e.colorScale,typeof qe=="function"&&qe()),n&&e.fontSizeScale!==void 0&&(n.value=e.fontSizeScale),s&&e.fontSizeThreshold!==void 0&&(s.value=e.fontSizeThreshold),a&&e.lineHeightScale!==void 0&&(a.value=e.lineHeightScale),i&&e.lineHeightThreshold!==void 0&&(i.value=e.lineHeightThreshold),r&&e.lineHeightBaselineThreshold!==void 0&&(r.value=e.lineHeightBaselineThreshold),e.typographyStyles&&Array.isArray(e.typographyStyles)&&(Q=e.typographyStyles,Qe=Math.max(...Q.map(p=>p.id||0),0)+1,Ge()),e.typographyRules){let p=e.typographyRules;document.getElementById("rule-typo-style")&&(document.getElementById("rule-typo-style").checked=p.checkStyle!==!1),document.getElementById("rule-font-family")&&(document.getElementById("rule-font-family").checked=p.checkFontFamily!==!1),document.getElementById("rule-font-size")&&(document.getElementById("rule-font-size").checked=p.checkFontSize!==!1),document.getElementById("rule-font-weight")&&(document.getElementById("rule-font-weight").checked=p.checkFontWeight!==!1),document.getElementById("rule-line-height")&&(document.getElementById("rule-line-height").checked=p.checkLineHeight!==!1),document.getElementById("rule-letter-spacing")&&(document.getElementById("rule-letter-spacing").checked=p.checkLetterSpacing===!0),document.getElementById("rule-word-spacing")&&(document.getElementById("rule-word-spacing").checked=p.checkWordSpacing===!0),Ge()}}function cn(e){if(!e){console.log("No last report to apply");return}if(e.scanMode){let t=document.querySelector(`input[name="scope"][value="${e.scanMode}"]`);t&&(t.checked=!0)}x.scanMode=e.scanMode||x.scanMode,x.context=e.context||x.context,e.issues&&Array.isArray(e.issues)&&(console.log("Applying saved issues report"),Ze(e.issues,!0,{skipSave:!0,restoreTimestamp:e.issuesTimestamp})),e.tokens&&(console.log("Applying saved tokens report"),xt(e.tokens,!0,{skipSave:!0,restoreTimestamp:e.tokensTimestamp})),e.lastActiveTab?He(e.lastActiveTab):e.issues?He("issues"):e.tokens&&He("tokens")}let Le="all",ke="",Ve="all",vt=!1;console.log("All elements found, setting up event listeners"),se.forEach(e=>{e.addEventListener("click",()=>{let t=e.dataset.tab;He(t),t!=="settings"&&(x.issues||x.tokens)&&Ht({issues:x.issues,issuesTimestamp:x.timestamp,tokens:x.tokens,tokensTimestamp:x.tokensTimestamp,lastActiveTab:t,scanMode:x.scanMode||null,context:x.context||null})})});function Ct(e=null){let t=e?document.getElementById(`results-${e}`):le;t&&(t.innerHTML="")}function He(e){se.forEach(n=>{n.dataset.tab===e?n.classList.add("active"):n.classList.remove("active")}),B.forEach(n=>{n.id===`results-${e}`?n.classList.add("active"):n.classList.remove("active")});let t=document.getElementById("filter-controls"),o=document.getElementById("filter-buttons"),l=document.getElementById("color-type-filter");if(t){if(e==="settings")t.style.display="none";else if(e==="animations"){let n=typeof window.hasAnimationData=="function"&&window.hasAnimationData();t.style.display=n?"flex":"none",o&&(o.style.display="none"),l&&(l.style.display="none")}else if(e==="tokens")(me&&me.querySelector(".token-group")||x.tokens)&&(t.style.display="flex"),o&&(o.style.display="none"),l&&x.tokens&&(x.tokens.colors||x.tokens.gradients)?l.style.display="block":l&&(l.style.display="none");else if(e==="issues"){let n=le&&le.querySelector(".issue-group"),s=x.issues&&x.issues.length>0;(n||s)&&(t.style.display="flex",o&&(o.style.display="flex")),l&&(l.style.display="none"),s&&typeof zt=="function"&&zt(x.issues)}}ue=e}function dn(e){return e==="error"?"\u274C":e==="warn"?"\u26A0\uFE0F":"\u2139\uFE0F"}function eo(e){return{naming:"\u{1F3F7}\uFE0F",autolayout:"\u{1F4D0}",spacing:"\u{1F4CF}",color:"\u{1F3A8}",typography:"\u270D\uFE0F","typography-style":"\u{1F3A8}","typography-check":"\u{1F4DD}","typography-pass":"\u2705","typography-info":"\u2705","line-height":"\u{1F4DD}",position:"\u{1F4CD}",duplicate:"\u{1F504}",group:"\u{1F4E6}",component:"\u{1F9E9}","empty-frame":"\u{1F4ED}","nested-group":"\u{1F4DA}",contrast:"\u{1F308}","text-size-mobile":"\u{1F4F1}"}[e]||"\u{1F50D}"}function It(e){return{naming:"Naming Layer",autolayout:"Auto Layout",spacing:"Spacing",color:"Color",typography:"Font Size","typography-style":"Text Style (variable)","typography-check":"Typography Style Match","typography-pass":"Typography \u2713 Matched","line-height":"Line Height",position:"Position Layer",duplicate:"Duplicate Layer",group:"Group Layer",component:"Component Reusable","empty-frame":"Empty Frame Layer","nested-group":"Nested Group Layer",contrast:"Contrast (ADA AA)","text-size-mobile":"Text Size (ADA)"}[e]||e.replace(/-/g," ")}function pn(e){let t=document.createElement("div");t.className=`issue ${e.severity}`;let o="";e.type==="typography-check"&&e.nodeProps&&(o='<div class="typography-details" style="margin-top: 8px; padding: 8px; background: rgba(0,0,0,0.05); border-radius: 4px; font-size: 11px;">',o+='<div class="current-properties"><div style="margin-bottom: 6px;"><strong>Current Properties:</strong></div>',o+='<div style="padding-left: 0; line-height: 1.6;">',e.nodeProps.fontFamily&&(o+=`\u2022 Font Family: <code>${u(e.nodeProps.fontFamily)}</code><br>`),e.nodeProps.fontSize!==null&&e.nodeProps.fontSize!==void 0&&(o+=`\u2022 Font Size: <code>${e.nodeProps.fontSize}px</code><br>`),e.nodeProps.fontWeight&&(o+=`\u2022 Font Weight: <code>${u(e.nodeProps.fontWeight)}</code><br>`),e.nodeProps.lineHeight&&(o+=`\u2022 Line Height: <code>${u(e.nodeProps.lineHeight)}</code><br>`),e.nodeProps.letterSpacing!==null&&e.nodeProps.letterSpacing!==void 0&&(o+=`\u2022 Letter Spacing: <code>${u(e.nodeProps.letterSpacing)}</code><br>`),o+="</div></div>",e.bestMatch&&e.bestMatch.name&&e.severity==="error"?(o+=`<div class="closest-match"><div style="margin-bottom: 6px;"><strong>Closest Match: "${u(e.bestMatch.name)}" (${e.bestMatch.percentage||0}%)</strong></div>`,o+='<div style="padding-left: 0; line-height: 1.6;">',(e.bestMatch.differences||[]).forEach(i=>{let r=i.matches?"\u2713":"\u2717",p=i.matches?"green":"red";o+=`<span style="color: ${p}">${r} ${i.property}: <code>${u(i.current)}</code> \u2192 <code>${u(i.expected)}</code></span><br>`}),o+="</div></div>"):e.severity==="info"&&e.styleName&&(o+=`<div style="margin-top: 8px; color: green;"><strong>\u2713 All properties match style "${u(e.styleName)}"</strong></div>`),o+="</div>"),t.setAttribute("data-issue-id",e.id),t.innerHTML=`
      <div class="issue-header">
              <div>
                <span class="issue-type">${eo(e.type)} ${It(e.type)}</span>
      <div class="issue-body">${u(e.message)}</div>
                ${e.nodeName?`<div class="issue-node">Node: ${u(e.nodeName)}</div>`:""}
                ${o}
              </div>
              <div class="issue-actions">
                <button class="btn-select" data-id="${e.id}">Select</button>
                ${e.bestMatch&&e.bestMatch.name&&e.type==="typography-check"&&wt(e)?`
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
    `;let l=t.querySelector("button.btn-select");l&&(l.onclick=()=>{document.querySelectorAll(".btn-select.active").forEach(i=>i.classList.remove("active")),document.querySelectorAll(".issue.selected").forEach(i=>i.classList.remove("selected")),l.classList.add("active"),t.classList.add("selected"),parent.postMessage({pluginMessage:{type:"select-node",id:e.id}},"*")});let n=t.querySelector("button.btn-suggest-fix");n&&e.type==="typography-check"&&e.bestMatch&&e.bestMatch.name&&(function(i){n.onclick=r=>{r.preventDefault(),r.stopPropagation(),i.bestMatch&&i.bestMatch.name?Dt(i,i.bestMatch.name):(console.error("Cannot apply: bestMatch.name is missing",i),alert("Error: Best match style name is missing"))}})(e);let s=t.querySelector("button.btn-style-dropdown");s&&e.type==="typography-check"&&(function(i){s.onclick=r=>{r.preventDefault(),r.stopPropagation(),parent.postMessage({pluginMessage:{type:"get-figma-text-styles",issueId:i.id}},"*"),window.pendingTypographyCheckIssue=i}})(e);let a=t.querySelector("button.btn-remove-layer");return a&&e.type==="typography-check"&&(function(i){a.onclick=r=>{r.preventDefault(),r.stopPropagation(),console.log("Remove Layer button clicked for typography-check",i),typeof $t=="function"?$t(i):(console.error("handleRemoveLayer is not a function"),alert("Error: handleRemoveLayer function not found"))}})(e),t}function un(e){let t=yt(e);if(!t){alert("No suitable color match found");return}let l=(e.message||"").match(/Color (#[0-9A-Fa-f]{6})/),n=l?l[1].toUpperCase():null;Lt(e,n,t,_)}function gn(e){let t=ht(e);if(!t){alert("No suitable spacing match found");return}let o=e.message||"",l=o.match(/Padding\s+(\w+)\s+\((\d+)px\)/);if(!l){console.error("Cannot parse spacing issue message:",o),alert("Cannot determine spacing property from issue message. Message: "+o);return}let n=l[1],s=parseInt(l[2]);At(e,n,s,t)}function it(e){return!e||e.type!=="autolayout"?null:{action:"enable-autolayout"}}function to(e){if(!it(e)){alert("Cannot suggest fix for this autolayout issue");return}mn(e)}function mn(e){let t=document.createElement("div");t.className="modal-overlay",t.id="autolayout-fix-confirm-modal-overlay";let o=document.createElement("div");o.className="modal-dialog",o.style.maxWidth="450px",o.innerHTML=`
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
        <div style="padding: 12px; background: #f0fdf4; border-radius: 6px; border-left: 3px solid #22c55e;">
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
        <button class="modal-btn modal-btn-create" id="autolayout-fix-confirm-apply-btn" style="background: #22c55e; border-color: #22c55e;">Apply</button>
      </div>
    `,t.appendChild(o),document.body.appendChild(t);let l=o.querySelector("#autolayout-fix-confirm-cancel-btn"),n=o.querySelector("#autolayout-fix-confirm-apply-btn"),s=o.querySelector(".modal-close"),a=()=>{t.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{t.parentNode&&t.remove()},200)};l.onclick=a,s.onclick=a,t.onclick=i=>{i.target===t&&a()},n.onclick=()=>{a(),ye(e.id,"\u23F3 Enabling auto layout...",!0),parent.postMessage({pluginMessage:{type:"fix-autolayout-issue",issue:e}},"*")}}function fn(e,t={}){let{onApply:o,onIgnore:l,onCancel:n,progress:s}=t,a=s?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${s.current}/${s.total}</div>`:"",i=document.createElement("div");i.className="modal-overlay",i.id="autolayout-fix-confirm-modal-overlay";let r=document.createElement("div");r.className="modal-dialog",r.style.maxWidth="450px",r.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Confirm Auto Layout Enable</h2>
        <p class="modal-subtitle">Node: ${u(e.nodeName||"Unnamed")}</p>
      </div>
      ${a}
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
        <div style="padding: 12px; background: #f0fdf4; border-radius: 6px; border-left: 3px solid #22c55e;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">\u{1F4DD} Note:</div>
          <div style="font-size: 12px; color: #333;">
            \u2022 Layout direction will be auto-detected (horizontal or vertical)<br>
            \u2022 Spacing and padding will be preserved if possible<br>
            \u2022 Frame structure will be maintained
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="autolayout-fix-ignore-btn" style="background: #64748b; border-color: #64748b; color: white;">Ignore</button>
        <button class="modal-btn modal-btn-cancel" id="autolayout-fix-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="autolayout-fix-apply-btn" style="background: #22c55e; border-color: #22c55e;">Apply</button>
      </div>
    `,i.appendChild(r),document.body.appendChild(i);let p=r.querySelector("#autolayout-fix-cancel-btn"),d=r.querySelector("#autolayout-fix-apply-btn"),y=r.querySelector("#autolayout-fix-ignore-btn"),g=r.querySelector(".modal-close"),f=()=>{i.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{i.parentNode&&i.remove()},200)};p.onclick=()=>{f(),n&&n()},g.onclick=()=>{f(),n&&n()},i.onclick=v=>{v.target===i&&(f(),n&&n())},y.onclick=()=>{f(),l&&l()},d.onclick=()=>{f(),ye(e.id,"\u23F3 Enabling auto layout...",!0),parent.postMessage({pluginMessage:{type:"fix-autolayout-issue",issue:e}},"*"),o&&o()}}function yn(e){return{action:"convert-group"}}function oo(e){if(!yn(e)){alert("Cannot suggest fix for this group issue");return}hn(e)}function hn(e){let t=document.createElement("div");t.className="modal-overlay",t.id="group-fix-modal-overlay";let o=document.createElement("div");o.className="modal-dialog",o.style.maxWidth="450px",o.innerHTML=`
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
        <div style="background: #f0fdf4; padding: 12px; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">After fix:</div>
          <div style="font-size: 13px; color: #333; font-weight: 500;">Frame with Auto-layout</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="group-fix-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="group-fix-apply-btn">Apply</button>
      </div>
    `,t.appendChild(o),document.body.appendChild(t);let l=o.querySelector("#group-fix-cancel-btn"),n=o.querySelector(".modal-close"),s=o.querySelector("#group-fix-apply-btn"),a=()=>{t.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{t.parentNode&&t.remove()},200)};l.onclick=a,n.onclick=a,t.onclick=i=>{i.target===t&&a()},s.onclick=()=>{s.disabled=!0,s.textContent="Applying...",parent.postMessage({pluginMessage:{type:"fix-group-issue",issue:e}},"*"),a()}}function bn(e,t={}){let{onApply:o,onIgnore:l,onCancel:n,progress:s}=t,a=s?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${s.current}/${s.total}</div>`:"",i=document.createElement("div");i.className="modal-overlay",i.id="group-fix-modal-overlay";let r=document.createElement("div");r.className="modal-dialog",r.style.maxWidth="450px",r.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Convert Group to Frame</h2>
        <p class="modal-subtitle">Node: ${u(e.nodeName||"Unnamed")}</p>
      </div>
      ${a}
      <div class="modal-body">
        <p style="margin: 0 0 16px 0; color: #333; line-height: 1.5;">
          This will convert the Group to a Frame and enable Auto-layout automatically.
        </p>
        <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current:</div>
          <div style="font-size: 13px; color: #333; font-weight: 500;">Group</div>
        </div>
        <div style="background: #f0fdf4; padding: 12px; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">After fix:</div>
          <div style="font-size: 13px; color: #333; font-weight: 500;">Frame with Auto-layout</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="group-fix-ignore-btn" style="background: #64748b; border-color: #64748b; color: white;">Ignore</button>
        <button class="modal-btn modal-btn-cancel" id="group-fix-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="group-fix-apply-btn">Apply</button>
      </div>
    `,i.appendChild(r),document.body.appendChild(i);let p=r.querySelector("#group-fix-cancel-btn"),d=r.querySelector("#group-fix-apply-btn"),y=r.querySelector("#group-fix-ignore-btn"),g=r.querySelector(".modal-close"),f=()=>{i.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{i.parentNode&&i.remove()},200)};p.onclick=()=>{f(),n&&n()},g.onclick=()=>{f(),n&&n()},i.onclick=v=>{v.target===i&&(f(),n&&n())},y.onclick=()=>{f(),l&&l()},d.onclick=()=>{d.disabled=!0,d.textContent="Applying...",parent.postMessage({pluginMessage:{type:"fix-group-issue",issue:e}},"*"),f(),o&&o()}}function ot(e){return!e||e.type!=="position"?null:{action:"fix-position"}}function at(e){return!e||e.type!=="duplicate"&&e.type!=="component"?null:{action:"suggest-component"}}function rt(e){return!e||e.type!=="empty-frame"?null:{action:"fix-empty-frame"}}function no(e){if(!ot(e)){alert("Cannot suggest fix for this position issue");return}vn(e)}function lo(e){if(!rt(e)){alert("Cannot suggest fix for this empty frame issue");return}Sn(e)}function vn(e){let t=e.message||"",o=t.match(/x:(-?\d+)/),l=t.match(/y:(-?\d+)/),n=o?parseInt(o[1],10):0,s=l?parseInt(l[1],10):0,a=document.createElement("div");a.className="modal-overlay",a.id="position-fix-confirm-modal-overlay";let i=document.createElement("div");i.className="modal-dialog",i.style.maxWidth="400px",i.innerHTML=`
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
    `,a.appendChild(i),document.body.appendChild(a);let r=i.querySelector("#position-fix-confirm-cancel-btn"),p=i.querySelector("#position-fix-confirm-apply-btn"),d=i.querySelector(".modal-close"),y=()=>{a.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{a.parentNode&&a.remove()},200)};r.onclick=y,d.onclick=y,a.onclick=g=>{g.target===a&&y()},p.onclick=()=>{y(),ye(e.id,"\u23F3 Fixing position...",!0),parent.postMessage({pluginMessage:{type:"fix-position-issue",issue:e}},"*")}}function xn(e,t={}){let{onApply:o,onIgnore:l,onCancel:n,progress:s}=t,a=s?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${s.current}/${s.total}</div>`:"",i=e.message||"",r=i.match(/x:(-?\d+)/),p=i.match(/y:(-?\d+)/),d=r?parseInt(r[1],10):0,y=p?parseInt(p[1],10):0,g=document.createElement("div");g.className="modal-overlay",g.id="position-fix-confirm-modal-overlay";let f=document.createElement("div");f.className="modal-dialog",f.style.maxWidth="400px",f.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Fix Position Issue</h2>
        <p class="modal-subtitle">Node: ${u(e.nodeName||"Unnamed")}</p>
      </div>
      ${a}
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
        <button class="modal-btn modal-btn-cancel" id="position-fix-ignore-btn" style="background: #64748b; border-color: #64748b; color: white;">Ignore</button>
        <button class="modal-btn modal-btn-cancel" id="position-fix-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="position-fix-apply-btn">Apply</button>
      </div>
    `,g.appendChild(f),document.body.appendChild(g);let v=f.querySelector("#position-fix-cancel-btn"),h=f.querySelector("#position-fix-apply-btn"),A=f.querySelector("#position-fix-ignore-btn"),N=f.querySelector(".modal-close"),U=()=>{g.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{g.parentNode&&g.remove()},200)};v.onclick=()=>{U(),n&&n()},N.onclick=()=>{U(),n&&n()},g.onclick=S=>{S.target===g&&(U(),n&&n())},A.onclick=()=>{U(),l&&l()},h.onclick=()=>{U(),ye(e.id,"\u23F3 Fixing position...",!0),parent.postMessage({pluginMessage:{type:"fix-position-issue",issue:e}},"*"),o&&o()}}function nl(e){so(e)}function $t(e){so(e)}function so(e){let t=document.createElement("div");t.className="modal-overlay",t.id="remove-layer-confirm-modal-overlay";let o=document.createElement("div");o.className="modal-dialog",o.style.maxWidth="400px",o.innerHTML=`
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
        <button class="modal-btn modal-btn-danger" id="remove-layer-confirm-apply-btn" style="background: #ef4444; border-color: #ef4444;color: white;">Remove</button>
      </div>
    `,t.appendChild(o),document.body.appendChild(t);let l=o.querySelector("#remove-layer-confirm-cancel-btn"),n=o.querySelector("#remove-layer-confirm-apply-btn"),s=o.querySelector(".modal-close"),a=()=>{t.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{t.parentNode&&t.remove()},200)};l.onclick=a,s.onclick=a,t.onclick=i=>{i.target===t&&a()},n.onclick=()=>{a(),ye(e.id,"\u23F3 Removing layer...",!0),parent.postMessage({pluginMessage:{type:"remove-layer",issue:e}},"*")}}function Sn(e){let t=e.message||"",o=t.includes("Empty frame"),l=t.includes("redundant"),n=l?"Remove Redundant Frame":"Remove Empty Frame",s=l?"This will remove the redundant frame and keep its single child. The child will inherit the frame's name if it was unnamed.":"This will remove the empty frame. If it has a child, the child will be kept.",a=document.createElement("div");a.className="modal-overlay",a.id="empty-frame-fix-modal-overlay";let i=document.createElement("div");i.className="modal-dialog",i.style.maxWidth="450px",i.innerHTML=`
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
        <div style="background: #f0fdf4; padding: 12px; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">After fix:</div>
          <div style="font-size: 13px; color: #333; font-weight: 500;">Frame removed, child kept (if applicable)</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="empty-frame-fix-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="empty-frame-fix-apply-btn">Apply</button>
      </div>
    `,document.body.appendChild(a),a.appendChild(i);let r=i.querySelector("#empty-frame-fix-cancel-btn"),p=i.querySelector(".modal-close"),d=i.querySelector("#empty-frame-fix-apply-btn"),y=()=>{a.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{a.parentNode&&a.remove()},200)};r.onclick=y,p.onclick=y,a.onclick=g=>{g.target===a&&y()},d.onclick=()=>{d.disabled=!0,d.textContent="Applying...",parent.postMessage({pluginMessage:{type:"fix-empty-frame-issue",issue:e}},"*"),y()}}function kn(e,t={}){let{onApply:o,onIgnore:l,onCancel:n,progress:s}=t,a=s?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${s.current}/${s.total}</div>`:"",i=e.message||"",r=i.includes("Empty frame"),p=i.includes("redundant"),d=p?"Remove Redundant Frame":"Remove Empty Frame",y=p?"This will remove the redundant frame and keep its single child. The child will inherit the frame's name if it was unnamed.":"This will remove the empty frame. If it has a child, the child will be kept.",g=document.createElement("div");g.className="modal-overlay",g.id="empty-frame-fix-modal-overlay";let f=document.createElement("div");f.className="modal-dialog",f.style.maxWidth="450px",f.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">${d}</h2>
        <p class="modal-subtitle">Node: ${u(e.nodeName||"Unnamed")}</p>
      </div>
      ${a}
      <div class="modal-body">
        <p style="margin: 0 0 16px 0; color: #333; line-height: 1.5;">
          ${y}
        </p>
        <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current:</div>
          <div style="font-size: 13px; color: #333; font-weight: 500;">${u(e.message)}</div>
        </div>
        <div style="background: #f0fdf4; padding: 12px; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">After fix:</div>
          <div style="font-size: 13px; color: #333; font-weight: 500;">Frame removed, child kept (if applicable)</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="empty-frame-fix-ignore-btn" style="background: #64748b; border-color: #64748b; color: white;">Ignore</button>
        <button class="modal-btn modal-btn-cancel" id="empty-frame-fix-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="empty-frame-fix-apply-btn">Apply</button>
      </div>
    `,document.body.appendChild(g),g.appendChild(f);let v=f.querySelector("#empty-frame-fix-cancel-btn"),h=f.querySelector("#empty-frame-fix-apply-btn"),A=f.querySelector("#empty-frame-fix-ignore-btn"),N=f.querySelector(".modal-close"),U=()=>{g.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{g.parentNode&&g.remove()},200)};v.onclick=()=>{U(),n&&n()},N.onclick=()=>{U(),n&&n()},g.onclick=S=>{S.target===g&&(U(),n&&n())},A.onclick=()=>{U(),l&&l()},h.onclick=()=>{h.disabled=!0,h.textContent="Applying...",parent.postMessage({pluginMessage:{type:"fix-empty-frame-issue",issue:e}},"*"),U(),o&&o()}}function io(e){if(console.log("handleSuggestFixComponent called",e),!e||!e.id){console.error("Invalid issue in handleSuggestFixComponent",e),alert("Error: Invalid issue data");return}window.pendingComponentIssue=e,console.log("Stored pendingComponentIssue:",window.pendingComponentIssue);let t=document.querySelector(`.issue[data-issue-id="${e.id}"]`);if(t){let o=t.querySelector("button.btn-suggest-fix");if(o){let l=o.textContent;o.disabled=!0,o.textContent="Loading...",o.style.opacity="0.6",o.style.cursor="wait",o.dataset.originalText=l}}console.log("Sending get-components-for-issue message",{issueId:e.id,issue:e}),parent.postMessage({pluginMessage:{type:"get-components-for-issue",issue:e}},"*")}function ao(e){if(console.log("handleSelectComponent called",e),!e||!e.id){console.error("Invalid issue in handleSelectComponent",e),alert("Error: Invalid issue data");return}window.pendingSelectComponentIssue=e,console.log("Stored pendingSelectComponentIssue:",window.pendingSelectComponentIssue);let t=document.querySelector(`.issue[data-issue-id="${e.id}"]`);if(t){let o=t.querySelector("button.btn-select-component");if(o){let l=o.textContent;o.disabled=!0,o.textContent="Loading...",o.style.opacity="0.6",o.dataset.originalText=l}}console.log("Sending get-all-components message",{issueId:e.id,issue:e}),parent.postMessage({pluginMessage:{type:"get-all-components",issue:e}},"*")}function ro(e){Cn(e)}function co(e){wn(e)}function wn(e){let t=document.createElement("div");t.className="modal-overlay",t.id="rename-modal-overlay";let o=document.createElement("div");o.className="modal-dialog",o.style.maxWidth="400px";let l=e.nodeName||"",n=l.replace(/^(Frame|Group)\s*/i,"").trim()||"";o.innerHTML=`
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
    `,t.appendChild(o),document.body.appendChild(t);let s=o.querySelector("#rename-cancel-btn"),a=o.querySelector("#rename-apply-btn"),i=o.querySelector(".modal-close"),r=o.querySelector("#rename-input");setTimeout(()=>{r.focus(),r.select()},100);let p=()=>{t.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{t.parentNode&&t.remove()},200)};s.onclick=p,i.onclick=p,t.onclick=d=>{d.target===t&&p()},r.addEventListener("keydown",d=>{d.key==="Enter"&&(d.preventDefault(),a.click())}),a.onclick=()=>{let d=r.value.trim();if(!d){alert("Please enter a name"),r.focus();return}if(/^(Frame|Group)\s*$/i.test(d)&&!confirm("The name still contains default naming (Frame/Group). Do you want to continue?")){r.focus();return}p(),ye(e.id,"\u23F3 Renaming...",!0),parent.postMessage({pluginMessage:{type:"rename-node",issue:e,newName:d}},"*")}}function Cn(e){let t=document.createElement("div");t.className="modal-overlay",t.id="create-component-modal-overlay";let o=document.createElement("div");o.className="modal-dialog",o.style.maxWidth="400px",o.innerHTML=`
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
    `,t.appendChild(o),document.body.appendChild(t);let l=o.querySelector("#create-component-cancel-btn"),n=o.querySelector("#create-component-apply-btn"),s=o.querySelector(".modal-close"),a=o.querySelector("#create-component-name-input");setTimeout(()=>a.focus(),100);let i=()=>{t.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{t.parentNode&&t.remove()},200)};l.onclick=i,s.onclick=i,t.onclick=r=>{r.target===t&&i()},n.onclick=()=>{let r=a.value.trim();if(!r){alert("Please enter a component name");return}i(),ye(e.id,"\u23F3 Creating component...",!0),parent.postMessage({pluginMessage:{type:"create-component-from-issue",issue:e,componentName:r}},"*")}}function In(e,t){if(console.log("[showComponentSuggestModal] Called with",{issue:e,similarComponents:t}),!t||t.length===0){console.warn("[showComponentSuggestModal] No similar components provided"),alert("No similar components found.");return}let o=t[0];console.log("[showComponentSuggestModal] Using best match:",o),po(e,o,"This is the most similar component found.")}function $n(e,t){if(console.log("[showComponentSelectModal] Called with",{issue:e,components:t}),!t||t.length===0){console.warn("[showComponentSelectModal] No components provided"),alert("No components available.");return}let o=document.createElement("div");o.className="modal-overlay",o.id="component-select-modal-overlay";let l=document.createElement("div");l.className="modal-dialog",l.style.maxWidth="500px";let n=t.map(v=>`
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
      `).join(""),s=t.length>5,a=s?`
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
        ${a}
        <div id="component-list-container" style="max-height: 400px; overflow-y: auto;">
          ${n}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="component-select-cancel-btn">Cancel</button>
      </div>
    `,o.appendChild(l),document.body.appendChild(o),console.log("[showComponentSelectModal] Modal added to DOM"),console.log("[showComponentSelectModal] Overlay element:",o),console.log("[showComponentSelectModal] Dialog element:",l),o.style.display="flex",o.style.opacity="1",o.style.zIndex="10000";let i=l.querySelector("#component-select-cancel-btn"),r=l.querySelector(".modal-close"),p=l.querySelectorAll(".component-picker-item"),d=l.querySelector("#component-search-input"),y=l.querySelector("#component-list-container"),g=l.querySelector("#component-search-results-count");console.log("[showComponentSelectModal] Found",p.length,"component items"),console.log("[showComponentSelectModal] Cancel button:",i,"Close button:",r),d&&s&&(d.addEventListener("input",v=>{let h=v.target.value.toLowerCase().trim(),A=0;p.forEach(N=>{let U=N.getAttribute("data-component-name")||"";h===""||U.includes(h)?(N.style.display="block",A++):N.style.display="none"}),g&&(h!==""?(g.textContent=`Showing ${A} of ${t.length} components`,g.style.display="block"):g.style.display="none")}),setTimeout(()=>d.focus(),100));let f=()=>{console.log("[showComponentSelectModal] Closing modal"),o.style.animation="fadeIn 0.2s ease-out reverse",o.style.opacity="0",setTimeout(()=>{o.parentNode&&(o.remove(),console.log("[showComponentSelectModal] Modal removed from DOM"))},200)};i?i.onclick=v=>{v.preventDefault(),v.stopPropagation(),f()}:console.error("[showComponentSelectModal] Cancel button not found!"),r?r.onclick=v=>{v.preventDefault(),v.stopPropagation(),f()}:console.error("[showComponentSelectModal] Close button not found!"),o.onclick=v=>{v.target===o&&f()},p.forEach((v,h)=>{v.onclick=A=>{A.preventDefault(),A.stopPropagation(),console.log("[showComponentSelectModal] Component item clicked",h);let N=v.getAttribute("data-component-id");console.log("[showComponentSelectModal] Component ID:",N);let U=t.find(S=>S.id===N);console.log("[showComponentSelectModal] Found component:",U),U?(f(),po(e,U,null)):console.error("[showComponentSelectModal] Component not found for ID:",N)}}),setTimeout(()=>{o.style.animation="fadeIn 0.2s ease-out",o.style.opacity="1",console.log("[showComponentSelectModal] Animation triggered, overlay visible:",o.offsetParent!==null)},10),console.log("[showComponentSelectModal] Modal setup complete")}function po(e,t,o){let l=document.createElement("div");l.className="modal-overlay",l.id="component-apply-confirm-modal-overlay";let n=document.createElement("div");n.className="modal-dialog",n.style.maxWidth="400px",n.innerHTML=`
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
    `,l.appendChild(n),document.body.appendChild(l);let s=n.querySelector("#component-apply-cancel-btn"),a=n.querySelector("#component-apply-apply-btn"),i=n.querySelector(".modal-close"),r=()=>{l.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{l.parentNode&&l.remove()},200)};s.onclick=r,i.onclick=r,l.onclick=p=>{p.target===l&&r()},a.onclick=()=>{r(),ye(e.id,"\u23F3 Applying component...",!0),parent.postMessage({pluginMessage:{type:"apply-component-to-issue",issue:e,componentId:t.id}},"*")}}function nt(e){if(!e||!e.fontSize)return null;let t=e.fontSize,o=14,l=document.getElementById("font-size-scale");if(l&&l.value.trim()){let n=l.value.split(",").map(s=>parseInt(s.trim(),10)).filter(s=>!isNaN(s)&&s>=o).sort((s,a)=>s-a);if(n.length>0){let s=null,a=1/0;n.forEach(r=>{if(r>=o){let p=Math.abs(r-t);p<a&&(a=p,s=r)}});let i=Math.max(t*.5,10);if(s&&a<=i)return s}}return t<o?o:null}function ct(e){if(!e||!e.textColor||!e.backgroundColor)return null;let t=e.textColor.toUpperCase(),o=e.backgroundColor.toUpperCase(),l=e.minContrast||4.5,n=document.getElementById("color-scale");if(!n||!n.value.trim())return null;let s=n.value.split(",").map(p=>p.trim().toUpperCase()).filter(p=>p&&p.startsWith("#"));if(s.length===0)return null;let a=null,i=0,r=1/0;return s.forEach(p=>{let d=Bt(p,o);if(d>=l){let y=Nt(t,p);(d>i||d===i&&y<r)&&(i=d,a=p,r=y)}}),a}function uo(e,t){if(!t||t.length===0){alert("No text styles found in Figma. Please create text styles first.");return}let o=document.createElement("div");o.className="modal-overlay",o.id="text-style-picker-typography-modal-overlay";let l=document.createElement("div");l.className="modal-dialog",l.style.maxWidth="500px";let n=e.nodeProps||{},s=n.fontFamily||"Unknown",a=n.fontSize!==null&&n.fontSize!==void 0?n.fontSize:null,i=a!==null?`${a}px`:"Unknown",r=n.fontWeight||"Unknown",p=n.lineHeight||"Unknown",d=n.letterSpacing!==null&&n.letterSpacing!==void 0?n.letterSpacing:"Unknown",y=null;e.bestMatch&&e.bestMatch.name&&(y=e.bestMatch.name);let g=z=>z==null||z==="Unknown"?"":String(z).toLowerCase().trim(),f=z=>{let Z=`picker_${g(s)}_${a}_${g(r)}_${g(p)}_${g(d)}_${z.id}`;return fe(Z,()=>{let E=0;if(g(s)===g(z.fontFamily)&&(E+=25),a!==null&&z.fontSize){let P=Math.abs(a-z.fontSize);P===0?E+=30:P<=2?E+=25:P<=4?E+=20:P<=8&&(E+=10)}return g(r)===g(z.fontWeight)&&(E+=20),g(p)===g(z.lineHeight)&&(E+=15),g(d)===g(z.letterSpacing||"0")&&(E+=10),E})},v=[...t].sort((z,Z)=>y===z.name?-1:y===Z.name?1:f(Z)-f(z)),h=(z,Z)=>g(z)!==g(Z),A=z=>{let Z=y===z.name,E=f(z),P=h(s,z.fontFamily),Y=h(i,`${z.fontSize}px`),ie=h(r,z.fontWeight),pe=h(p,z.lineHeight),c=h(d,z.letterSpacing||"0"),te="color: #155724;",I="color: #721c24; background: #f8d7da; padding: 1px 4px; border-radius: 3px; font-weight: 600;";return`
        <div class="style-picker-item" data-style-id="${z.id}" data-style-name="${u(z.name)}" data-font-size="${z.fontSize}" data-similarity="${E}" style="
          padding: 12px;
          margin-bottom: 8px;
          border: 2px solid ${Z?"#0071e3":"#ddd"};
          border-radius: 8px;
          cursor: pointer;
          background: white;
          transition: all 0.2s;
        " onmouseover="this.style.borderColor='#0071e3'; this.style.boxShadow='0 2px 8px rgba(0,113,227,0.2)'" onmouseout="this.style.borderColor='${Z?"#0071e3":"#ddd"}'; this.style.boxShadow='none'">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
            <div>
              <div style="font-weight: 600; font-size: 14px; color: #333;">${u(z.name)} ${Z?"\u2B50":""}</div>
              <div style="font-size: 11px; color: #666; margin-top: 4px;">
                ${u(z.fontFamily)} ${z.fontSize}px ${u(z.fontWeight)}
              </div>
            </div>
            <div style="text-align: right;">
              ${Z?'<div style="color: #0071e3; font-weight: 600; font-size: 11px;">Best Match</div>':""}
              <div style="color: #666; font-size: 10px; margin-top: 2px;">${E}% match</div>
            </div>
          </div>
          <div style="font-size: 11px; color: #666; padding-top: 8px; border-top: 1px solid #eee;">
            <div style="margin-bottom: 4px;"><strong>Details:</strong></div>
            <div style="padding-left: 8px; line-height: 1.8;">
              \u2022 Font Family: <code style="${P?I:te}">${P?"\u26A0 ":"\u2713 "}${u(z.fontFamily)}</code><br>
              \u2022 Font Size: <code style="${Y?I:te}">${Y?"\u26A0 ":"\u2713 "}${z.fontSize}px</code><br>
              \u2022 Font Weight: <code style="${ie?I:te}">${ie?"\u26A0 ":"\u2713 "}${u(z.fontWeight)}</code><br>
              \u2022 Line Height: <code style="${pe?I:te}">${pe?"\u26A0 ":"\u2713 "}${u(z.lineHeight)}</code><br>
              \u2022 Letter Spacing: <code style="${c?I:te}">${c?"\u26A0 ":"\u2713 "}${u(z.letterSpacing||"0")}</code>
            </div>
          </div>
        </div>
      `},N=v.map(z=>A(z)).join("");l.innerHTML=`
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
            \u2022 Font Weight: <code>${u(r)}</code><br>
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
          ${N}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="text-style-picker-typography-modal-cancel-btn">Cancel</button>
      </div>
    `,o.appendChild(l),document.body.appendChild(o);let U=l.querySelector("#text-style-picker-typography-modal-cancel-btn"),S=l.querySelector(".modal-close"),L=l.querySelector("#style-search-input"),M=l.querySelector("#style-list-container"),V=()=>{o.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{o.parentNode&&o.remove()},200)};U.onclick=V,S.onclick=V,o.onclick=z=>{z.target===o&&V()},L.oninput=z=>{let Z=z.target.value.toLowerCase().trim(),E=v.filter(P=>P.name.toLowerCase().includes(Z));M.innerHTML=E.map(P=>A(P)).join(""),de()};let de=()=>{l.querySelectorAll(".style-picker-item").forEach(Z=>{Z.onclick=E=>{E.preventDefault(),E.stopPropagation();let P=Z.getAttribute("data-style-id"),Y=t.find(ie=>ie.id===P);Y&&(o.style.display="none",En(e,Y,o))}})};de(),setTimeout(()=>{L.focus()},100)}function En(e,t,o){let l=document.createElement("div");l.className="modal-overlay",l.id="typography-style-confirm-modal-overlay";let n=document.createElement("div");n.className="modal-dialog",n.style.maxWidth="500px";let s=e.nodeProps||{},a=s.fontFamily||"Unknown",i=s.fontSize!==null&&s.fontSize!==void 0?`${s.fontSize}px`:"Unknown",r=s.fontWeight||"Unknown",p=s.lineHeight||"Unknown",d=s.letterSpacing!==null&&s.letterSpacing!==void 0?s.letterSpacing:"Unknown";n.innerHTML=`
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
            \u2022 Font Family: <code>${u(a)}</code><br>
            \u2022 Font Size: <code>${u(i)}</code><br>
            \u2022 Font Weight: <code>${u(r)}</code><br>
            \u2022 Line Height: <code>${u(p)}</code><br>
            \u2022 Letter Spacing: <code>${u(d)}</code>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="typography-style-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="typography-style-confirm-apply-btn" style="background: #22c55e; border-color: #22c55e;">Apply</button>
      </div>
    `,l.appendChild(n),document.body.appendChild(l);let y=n.querySelector("#typography-style-confirm-cancel-btn"),g=n.querySelector("#typography-style-confirm-apply-btn"),f=n.querySelector(".modal-close"),v=()=>{l.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{l.parentNode&&l.remove(),o&&o.parentNode&&(o.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{o.parentNode&&o.remove()},200))},200)},h=()=>{l.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{l.parentNode&&l.remove(),o&&(o.style.display="flex")},200)};y.onclick=h,f.onclick=h,l.onclick=A=>{A.target===l&&h()},g.onclick=()=>{v(),ye(e.id,"\u23F3 Applying style...",!0),xo(e,t)}}function Mn(e,t){let o=t.filter(d=>d.fontSize>=14);if(o.length===0){let d=nt(e);d?Et(e,e.fontSize||12,d,null,null):alert("No text styles found with fontSize >= 14px. Please add font sizes to Font Size input or create text styles in Figma.");return}let l=document.createElement("div");l.className="modal-overlay",l.id="text-style-picker-modal-overlay";let n=document.createElement("div");n.className="modal-dialog",n.style.maxWidth="400px";let s=o.map(d=>`
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
          <div style="color: #22c55e; font-weight: 600; font-size: 12px;">\u2713 ADA</div>
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
    `,l.appendChild(n),document.body.appendChild(l);let a=n.querySelector("#text-style-picker-modal-cancel-btn"),i=n.querySelector(".modal-close"),r=n.querySelectorAll(".style-picker-item"),p=()=>{l.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{l.parentNode&&l.remove()},200)};a.onclick=p,i.onclick=p,l.onclick=d=>{d.target===l&&p()},r.forEach(d=>{d.onclick=y=>{y.preventDefault(),y.stopPropagation();let g=d.getAttribute("data-style-id"),f=parseInt(d.getAttribute("data-font-size")),v=o.find(h=>h.id===g);v&&(l.style.display="none",Et(e,e.fontSize||12,f,l,v))}})}function zn(e,t){let o=document.getElementById("color-scale"),l=o&&o.value.trim()?o.value.split(",").map(h=>h.trim().toUpperCase()).filter(h=>h&&h.startsWith("#")):[],n=[];if(t.filter(h=>h.source==="variable").forEach(h=>{n.push({source:"Variable",name:h.name,hex:h.hex,id:h.id,variable:h.variable})}),t.filter(h=>h.source==="style").forEach(h=>{n.push({source:"Style",name:h.name,hex:h.hex,id:h.id,style:h.style})}),l.forEach(h=>{let A=_[h]||h;n.push({source:"Input",name:A,hex:h,id:null})}),n.length===0){alert("No colors available. Please add colors to Color input or create color styles/variables in Figma.");return}let s=e.backgroundColor||"#FFFFFF",a=e.minContrast||4.5,i=e.textColor||"#000000",r=document.createElement("div");r.className="modal-overlay",r.id="contrast-color-picker-modal-overlay";let p=document.createElement("div");p.className="modal-dialog",p.style.maxWidth="400px";let d=n.map(h=>{let A=Bt(h.hex,s),N=A>=a,U=N?"#22c55e":"#ddd",S=`${u(h.name)} <span style="font-size: 11px; color: #666;">(${u(h.source)})</span>`,L=`<span style="color: ${N?"#22c55e":"#ef4444"};">Contrast: ${A.toFixed(2)}:1 ${N?"\u2713":"\u2717"} (need >= ${a}:1)</span>`;return Xt(h.hex,S,U,L)}).join("");p.innerHTML=`
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
            <div style="font-size: 11px; color: #ef4444;">Contrast: ${e.contrast?e.contrast.toFixed(2):"N/A"}:1 (fails)</div>
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
    `,r.appendChild(p),document.body.appendChild(r);let y=p.querySelector("#contrast-color-picker-modal-cancel-btn"),g=p.querySelector(".modal-close"),f=p.querySelectorAll(".color-picker-item"),v=()=>{r.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{r.parentNode&&r.remove()},200)};y.onclick=v,g.onclick=v,r.onclick=h=>{h.target===r&&v()},f.forEach(h=>{h.onclick=A=>{A.preventDefault(),A.stopPropagation();let N=h.getAttribute("data-color");r.style.display="none",fo(e,i,N,r)}})}function go(e){parent.postMessage({pluginMessage:{type:"get-figma-text-styles",issueId:e.id}},"*"),window.pendingTextSizeIssue=e}function Pt(e){parent.postMessage({pluginMessage:{type:"get-figma-text-styles",issueId:e.id}},"*"),window.pendingSuggestTextSizeIssue=e}function Et(e,t,o,l,n){let s=(E,P)=>{if(E===P)return 100;let Y=20,ie=Math.abs(E-P);return Math.max(0,Math.round((1-ie/Y)*100))},i=[14,16,18,20,24,28,32,36,40,48].map(E=>({size:E,similarity:s(t,E),diff:Math.abs(t-E)})).sort((E,P)=>o!==void 0&&E.size===o?-1:o!==void 0&&P.size===o?1:E.diff-P.diff).slice(0,5),r=i.length>0?i[0].size:o,p=(E,P)=>{let Y=E.size>=14;return`
        <div class="text-size-option-item" data-size="${E.size}" style="
          padding: 10px 12px;
          margin-bottom: 6px;
          border: 2px solid ${P?"#0071e3":"#e0e0e0"};
          border-radius: 8px;
          cursor: pointer;
          background: ${P?"#e3f2fd":"white"};
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.15s;
        ">
          <input type="radio" name="text-size-option" ${P?"checked":""} style="margin: 0; cursor: pointer;" />
          <div style="
            width: 40px;
            height: 40px;
            border-radius: 6px;
            background: ${P?"#e3f2fd":"#f0f0f0"};
            border: 2px solid ${P?"#0071e3":"#ddd"};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 600;
            color: ${P?"#0071e3":"#666"};
            flex-shrink: 0;
          ">${E.size}</div>
          <div style="flex: 1;">
            <div style="font-weight: 600; font-size: 13px; color: #333;">${E.size}px</div>
            <div style="font-size: 10px; color: ${Y?"#155724":"#721c24"};">
              ${Y?"\u2713 ADA compliant":"\u26A0 Below minimum"}
            </div>
          </div>
          <span style="font-size: 11px; color: #666; background: #f0f0f0; padding: 2px 8px; border-radius: 10px;">${E.similarity}%</span>
        </div>
      `},d=document.createElement("div");d.className="modal-overlay",d.id="text-size-fix-confirm-modal-overlay";let y=document.createElement("div");y.className="modal-dialog",y.style.maxWidth="420px";let g=window.pendingTextSizeFixAllCallbacks||null,f=g&&g.progress?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${g.progress.current}/${g.progress.total}</div>`:"",v=n?`
      <div style="margin-top: 12px; padding: 10px; background: #f0fdf4; border-radius: 6px; border-left: 3px solid #22c55e;">
        <div style="font-size: 11px; color: #666; margin-bottom: 4px;">\u{1F4DD} Text Style s\u1EBD \u0111\u01B0\u1EE3c \xE1p d\u1EE5ng:</div>
        <div style="font-weight: 600; font-size: 13px; color: #333;">${u(n.name)}</div>
        <div style="font-size: 10px; color: #666; margin-top: 4px;">
          ${u(n.fontFamily)} ${n.fontSize}px ${u(n.fontWeight)}
        </div>
      </div>
    `:"",h=i.map((E,P)=>p(E,P===0)).join("");y.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Apply Suggested Text Size</h2>
        <p class="modal-subtitle">Node: ${u(e.nodeName||"Unnamed")}</p>
      </div>
      ${f}
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
            <div style="font-size: 14px; font-weight: 600;">${t}px <span style="font-size: 11px; color: #ef4444;">(Too small)</span></div>
          </div>
        </div>
        <div style="font-size: 12px; font-weight: 600; color: #333; margin-bottom: 8px;">
          Select a size to apply (Top 5 closest):
        </div>
        <div id="text-size-options-container" style="max-height: 280px; overflow-y: auto;">
          ${h}
        </div>
        ${v}
      </div>
      <div class="modal-footer">
        ${window.pendingTextSizeFixAllCallbacks?'<button class="modal-btn modal-btn-cancel" id="text-size-fix-ignore-btn" style="background: #64748b; border-color: #64748b; color: white;">Ignore</button>':""}
        <button class="modal-btn modal-btn-cancel" id="text-size-fix-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="text-size-fix-confirm-apply-btn" style="background: #22c55e; border-color: #22c55e;">Apply</button>
      </div>
    `,d.appendChild(y),document.body.appendChild(d);let A=y.querySelector("#text-size-fix-confirm-cancel-btn"),N=y.querySelector("#text-size-fix-confirm-apply-btn"),U=y.querySelector("#text-size-fix-ignore-btn"),S=y.querySelector(".modal-close"),L=y.querySelector("#text-size-options-container"),M=g,V=E=>{r=E,L.querySelectorAll(".text-size-option-item").forEach(Y=>{let pe=parseInt(Y.getAttribute("data-size"),10)===E;Y.style.border=pe?"2px solid #0071e3":"2px solid #e0e0e0",Y.style.background=pe?"#e3f2fd":"white";let c=Y.querySelector('input[type="radio"]');c&&(c.checked=pe)})};(()=>{L.querySelectorAll(".text-size-option-item").forEach(P=>{P.onclick=Y=>{Y.preventDefault();let ie=parseInt(P.getAttribute("data-size"),10);V(ie)}})})();let z=()=>{d.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{d.parentNode&&d.remove(),l&&(l.style.display="block")},200)},Z=()=>{d.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{d.parentNode&&d.remove(),l&&l.parentNode&&(l.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{l.parentNode&&l.remove()},200))},200)};A.onclick=()=>{M&&M.onCancel?(Z(),window.pendingTextSizeFixAllCallbacks=null,M.onCancel()):z()},S.onclick=()=>{M&&M.onCancel?(Z(),window.pendingTextSizeFixAllCallbacks=null,M.onCancel()):z()},d.onclick=E=>{E.target===d&&(M&&M.onCancel?(Z(),window.pendingTextSizeFixAllCallbacks=null,M.onCancel()):z())},U&&(U.onclick=()=>{Z(),M&&M.onIgnore&&(window.pendingTextSizeFixAllCallbacks=null,M.onIgnore())}),N.onclick=()=>{Z(),ye(e.id,"\u23F3 Fixing text size...",!0),n&&n.id?parent.postMessage({pluginMessage:{type:"apply-figma-text-style",issue:e,styleId:n.id,styleName:n.name}},"*"):parent.postMessage({pluginMessage:{type:"fix-text-size-issue",issue:e,fontSize:r}},"*"),M&&M.onApply&&(window.pendingTextSizeFixAllCallbacks=null,M.onApply())}}function mo(e){parent.postMessage({pluginMessage:{type:"get-contrast-colors",issue:e}},"*"),window.pendingContrastIssue=e}function Rt(e){let t=ct(e);if(!t){alert("No suitable color found that passes contrast requirements");return}fo(e,e.textColor,t,null)}function fo(e,t,o,l){let n=e.backgroundColor||"#FFFFFF",s=e.minContrast||4.5,a=(E,P)=>{let Y=E.replace("#",""),ie=P.replace("#",""),pe=parseInt(Y.substr(0,2),16),c=parseInt(Y.substr(2,2),16),te=parseInt(Y.substr(4,2),16),I=parseInt(ie.substr(0,2),16),ae=parseInt(ie.substr(2,2),16),G=parseInt(ie.substr(4,2),16);return Math.sqrt(Math.pow(pe-I,2)+Math.pow(c-ae,2)+Math.pow(te-G,2))},i=(E,P)=>{let ie=a(E,P);return Math.round((1-ie/441.67)*100)},p=Object.keys(_).map(E=>{let P=Bt(E,n);return{color:E,name:_[E]||E,contrast:P,passes:P>=s,similarity:i(t,E),distance:a(t,E)}}).filter(E=>E.passes).sort((E,P)=>o&&E.color===o?-1:o&&P.color===o?1:E.distance-P.distance).slice(0,5),d=p.length>0?p[0].color:o,y=(E,P)=>`
        <div class="contrast-color-option-item" data-color="${u(E.color)}" style="
          padding: 10px 12px;
          margin-bottom: 6px;
          border: 2px solid ${P?"#0071e3":"#e0e0e0"};
          border-radius: 8px;
          cursor: pointer;
          background: ${P?"#e3f2fd":"white"};
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.15s;
        ">
          <input type="radio" name="contrast-color-option" ${P?"checked":""} style="margin: 0; cursor: pointer;" />
          <div style="
            width: 36px;
            height: 36px;
            border-radius: 6px;
            background: ${u(E.color)};
            border: 2px solid ${P?"#0071e3":"#ddd"};
            flex-shrink: 0;
          "></div>
          <div style="flex: 1;">
            <div style="font-weight: 600; font-size: 13px; color: #333;">${u(E.name)}</div>
            <div style="font-size: 10px; color: #666; font-family: 'SF Mono', Monaco, monospace;">${u(E.color)}</div>
            <div style="font-size: 10px; color: #22c55e; margin-top: 2px;">\u2713 ${E.contrast.toFixed(2)}:1</div>
          </div>
          <span style="font-size: 11px; color: #666; background: #f0f0f0; padding: 2px 8px; border-radius: 10px;">${E.similarity}%</span>
        </div>
      `,g=window.pendingContrastFixAllCallbacks||null,f=g&&g.progress?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${g.progress.current}/${g.progress.total}</div>`:"",v=document.createElement("div");v.className="modal-overlay",v.id="contrast-fix-confirm-modal-overlay";let h=document.createElement("div");h.className="modal-dialog",h.style.maxWidth="420px";let A=p.length>0?p.map((E,P)=>y(E,P===0)).join(""):`<div style="padding: 20px; text-align: center; color: #666;">No colors available that pass contrast requirements (>= ${s}:1)</div>`;h.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Apply Suggested Contrast Color</h2>
        <p class="modal-subtitle">Node: ${u(e.nodeName||"Unnamed")}</p>
      </div>
      ${f}
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
              <div style="font-size: 10px; color: #ef4444;">Contrast: ${e.contrast?e.contrast.toFixed(2):"N/A"}:1 \u2717</div>
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
          ${A}
        </div>
      </div>
      <div class="modal-footer">
        ${window.pendingContrastFixAllCallbacks?'<button class="modal-btn modal-btn-cancel" id="contrast-fix-ignore-btn" style="background: #64748b; border-color: #64748b; color: white;">Ignore</button>':""}
        <button class="modal-btn modal-btn-cancel" id="contrast-fix-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="contrast-fix-confirm-apply-btn" style="background: #22c55e; border-color: #22c55e;" ${p.length===0?"disabled":""}>Apply</button>
      </div>
    `,v.appendChild(h),document.body.appendChild(v);let N=h.querySelector("#contrast-fix-confirm-cancel-btn"),U=h.querySelector("#contrast-fix-confirm-apply-btn"),S=h.querySelector("#contrast-fix-ignore-btn"),L=h.querySelector(".modal-close"),M=h.querySelector("#contrast-color-options-container"),V=g,de=E=>{d=E,M.querySelectorAll(".contrast-color-option-item").forEach(Y=>{let pe=Y.getAttribute("data-color")===E;Y.style.border=pe?"2px solid #0071e3":"2px solid #e0e0e0",Y.style.background=pe?"#e3f2fd":"white";let c=Y.querySelector('input[type="radio"]');c&&(c.checked=pe)})};(()=>{M.querySelectorAll(".contrast-color-option-item").forEach(P=>{P.onclick=Y=>{Y.preventDefault();let ie=P.getAttribute("data-color");de(ie)}})})();let Z=()=>{v.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{v.parentNode&&v.remove(),l&&(l.style.display="block")},200)};N.onclick=()=>{V&&V.onCancel?(Z(),window.pendingContrastFixAllCallbacks=null,V.onCancel()):Z()},L.onclick=()=>{V&&V.onCancel?(Z(),window.pendingContrastFixAllCallbacks=null,V.onCancel()):Z()},v.onclick=E=>{E.target===v&&(V&&V.onCancel?(Z(),window.pendingContrastFixAllCallbacks=null,V.onCancel()):Z())},S&&(S.onclick=()=>{Z(),V&&V.onIgnore&&(window.pendingContrastFixAllCallbacks=null,V.onIgnore())}),U.onclick=()=>{p.length!==0&&(Z(),ye(e.id,"\u23F3 Fixing contrast...",!0),parent.postMessage({pluginMessage:{type:"fix-contrast-issue",issue:e,color:d}},"*"),V&&V.onApply&&(window.pendingContrastFixAllCallbacks=null,V.onApply()))}}function yo(e){try{if(ge[e.id]===!0){if(delete ge[e.id],x&&x.issues){let o=x.issues.find(l=>l.id===e.id);if(o){o.ignored=!1;let l=o.originalSeverity||(o.severity==="info"?"error":o.severity);o.severity=l,o.originalSeverity=void 0,e.severity=l,e.ignored=!1}}be(),ho(e,!1),dt(),parent.postMessage({pluginMessage:{type:"notify",message:"\u2705 Issue un-ignored"}},"*")}else{if(!confirm(`Ignore this contrast issue?

Node: ${e.nodeName||"Unnamed"}

This issue will be marked as "Pass with ignore custom" and won't be counted as an error.`))return;if(x&&x.issues){let o=x.issues.find(l=>l.id===e.id);o&&(o.originalSeverity||(o.originalSeverity=o.severity),o.ignored=!0,o.severity="info",e.ignored=!0,e.originalSeverity=o.originalSeverity,e.severity="info")}ge[e.id]=!0,be(),ho(e,!0),dt(),parent.postMessage({pluginMessage:{type:"notify",message:"\u2705 Issue ignored"}},"*")}}catch(t){console.error("Error in handleIgnoreIssue:",t),parent.postMessage({pluginMessage:{type:"notify",message:`\u274C Error: ${t.message}`}},"*")}}function ho(e,t){let o=document.querySelector(`.issue[data-issue-id="${e.id}"]`);if(o)if(t){let l=e.originalSeverity||"error";o.className=o.className.replace(/\b(error|warn)\b/g,"info");let n=o.querySelector(".issue-type");if(n){let a=n.querySelector(".issue-number");if(a){let i=a.textContent;n.innerHTML=`<span class="issue-number">${i}</span> \u2139\uFE0F INFO`}else n.innerHTML=n.innerHTML.replace(/❌|⚠️/g,"\u2139\uFE0F").replace(/ERROR|WARNING/g,"INFO")}if(!o.querySelector(".issue-ignored-tag")){let a=o.querySelector(".issue-body"),i=o.querySelector(".issue-node"),r=document.createElement("div");if(r.className="issue-ignored-tag",r.style.cssText="margin-top: 4px; padding: 4px 8px; background: #e3f2fd; color: #22c55e; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-block;",r.textContent="\u2713 Pass with ignore custom",i)i.parentNode.insertBefore(r,i.nextSibling);else if(a)a.parentNode.insertBefore(r,a.nextSibling);else{let p=o.querySelector(".issue-header");p?p.parentNode.insertBefore(r,p.nextSibling):o.appendChild(r)}}let s=document.querySelector(`button.btn-ignore[data-id="${e.id}"]`);s&&(s.removeAttribute("disabled"),s.innerHTML="Ignored",s.style.cssText="padding: 6px 12px; border: 1px solid #22c55e; background: #22c55e; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s; color: white;")}else{let l=e.originalSeverity||(e.severity==="info"?"error":e.severity);o.className=o.className.replace(/\binfo\b/g,l);let n=o.querySelector(".issue-type");if(n){let i=l==="error"?"\u274C":l==="warn"?"\u26A0\uFE0F":"\u2139\uFE0F",r=l.toUpperCase(),p=n.querySelector(".issue-number");if(p){let d=p.textContent;n.innerHTML=`<span class="issue-number">${d}</span> ${i} ${r}`}else n.innerHTML=n.innerHTML.replace(/ℹ️/g,i).replace(/INFO/g,r)}let s=o.querySelector(".issue-ignored-tag");s&&s.remove();let a=document.querySelector(`button.btn-ignore[data-id="${e.id}"]`);a&&(a.removeAttribute("disabled"),a.innerHTML="Ignore",a.style.cssText="padding: 6px 12px; border: 1px solid #64748b; background: #64748b; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s; color: white;")}}function dt(){if(!x||!x.issues)return;let e=x.issues,t={error:e.filter(o=>o.severity==="error"&&!o.ignored).length,warn:e.filter(o=>o.severity==="warn"&&!o.ignored).length,total:e.length};zt(e),document.querySelectorAll(".issue-group").forEach(o=>{let l=o.querySelector(".badge");if(l){let n=o.getAttribute("data-issue-type");if(n){let a=e.filter(i=>i.type===n).filter(i=>i.ignored?!1:i.severity==="error"||i.severity==="warn").length;l.textContent=a}}})}function Fn(e){let t=e.message||"",o=t.match(/Padding\s+(\w+)\s+\((\d+)px\)/),l=null,n=null;if(o?(l=o[1],n=parseInt(o[2])):(o=t.match(/Gap\s+\(itemSpacing:\s+(\d+)px\)/),o&&(l="itemSpacing",n=parseInt(o[1]))),!o||!l||n===null){console.error("Cannot parse spacing issue message:",t),alert("Cannot determine spacing property from issue message. Message: "+t);return}let s=document.getElementById("spacing-scale");if(!s||!s.value.trim()){alert("No spacing scale defined. Please add spacing values to the Spacing input.");return}let a=s.value.split(",").map(i=>parseInt(i.trim(),10)).filter(i=>!isNaN(i)&&i>=0).sort((i,r)=>i-r);if(a.length===0){alert("No valid spacing values found in Spacing input.");return}nn(e,l,n,a)}function Tn(e){let o=(e.message||"").match(/Color (#[0-9A-Fa-f]{6})/),l=o?o[1].toUpperCase():null;if(!l){alert("Cannot determine current color from issue message");return}let n=document.getElementById("color-scale");if(!n||!n.value.trim()){alert("No color scale defined. Please add colors to the Color input.");return}let s=n.value.split(",").map(a=>a.trim().toUpperCase()).filter(a=>a&&a.startsWith("#"));if(s.length===0){alert("No valid colors found in Color input.");return}ln(e,l,s,_)}function Nn(e){var t;if(e.type==="typography-check"&&e.bestMatch){on(e,Q);return}if(ye(e.id,"\u23F3 Fixing...",!0),!e.bestMatch&&e.type!=="typography-check"){let o=prompt(`Cannot auto-fix this issue.

Issue: ${e.message}

Please provide fix instructions or press Cancel.`);if(o)parent.postMessage({pluginMessage:{type:"fix-issue",issue:e,manualFix:o}},"*");else{let l=document.querySelector(`.issue[data-issue-id="${e.id}"]`)||((t=document.querySelector(`button.btn-fix[data-id="${e.id}"]`))==null?void 0:t.closest(".issue"));if(l){let n=l.querySelector(".fix-message");n&&n.remove()}}return}parent.postMessage({pluginMessage:{type:"fix-issue",issue:e}},"*")}function bo(e,t){let o=document.createElement("div");o.className="modal-overlay",o.id="create-style-modal-overlay";let l=document.createElement("div");l.className="modal-dialog";let n=e.nodeName||"Unnamed";if(e.message&&e.message.includes("(")&&e.message.includes("nodes")){let d=e.message.match(/\((\d+) nodes\)/);d&&(n=`${n} (${d[1]} nodes)`)}l.innerHTML=`
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
    `,o.appendChild(l),document.body.appendChild(o);let s=l.querySelector("#style-name-input"),a=l.querySelector("#modal-cancel-btn"),i=l.querySelector("#modal-create-btn"),r=l.querySelector(".modal-close");setTimeout(()=>{s.focus(),s.select()},100),s.onkeydown=d=>{d.key==="Enter"?(d.preventDefault(),i.click()):d.key==="Escape"&&(d.preventDefault(),a.click())};let p=()=>{o.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{o.parentNode&&o.remove()},200)};a.onclick=p,r.onclick=p,o.onclick=d=>{d.target===o&&p()},i.onclick=()=>{let d=s.value.trim();if(!d){s.focus(),s.style.borderColor="#ff3b30",setTimeout(()=>{s.style.borderColor="#0071e3"},2e3);return}p(),t&&t(d)}}function vo(e,t,o={}){if(console.log("[showSuggestApplyModal] Called with issue:",e,"styleName:",t,"options:",o),!e){console.error("[showSuggestApplyModal] Missing issue:",{issue:e,styleName:t});return}let{onApply:l,onIgnore:n,onCancel:s,showIgnore:a=!1,progress:i}=o,r=e.nodeProps||{},p=r.fontFamily||"Unknown",d=r.fontSize!==null&&r.fontSize!==void 0?r.fontSize:null,y=d!==null?`${d}px`:"Unknown",g=r.fontWeight||"Unknown",f=r.lineHeight||"Unknown",v=r.letterSpacing!==null&&r.letterSpacing!==void 0?r.letterSpacing:"Unknown",h=I=>I==null||I==="Unknown"?"":String(I).toLowerCase().trim(),A=I=>{let ae=`typo_${h(p)}_${d}_${h(g)}_${h(f)}_${h(v)}_${I.id}`;return fe(ae,()=>{let G=0;if(h(p)===h(I.fontFamily)&&(G+=25),d!==null&&I.fontSize){let Me=Math.abs(d-I.fontSize);Me===0?G+=30:Me<=2?G+=25:Me<=4?G+=20:Me<=8&&(G+=10)}return h(g)===h(I.fontWeight)&&(G+=20),h(f)===h(I.lineHeight)&&(G+=15),h(v)===h(I.letterSpacing||"0")&&(G+=10),G})},N=[...Q].map(I=>Ke(Xe({},I),{similarity:A(I)})).sort((I,ae)=>t&&I.name===t?-1:t&&ae.name===t?1:ae.similarity-I.similarity).slice(0,5);if(N.length===0){console.error("[showSuggestApplyModal] No typography styles available"),alert("No typography styles available");return}let U=N[0].id,S=(I,ae)=>h(I)!==h(ae),L=(I,ae,G)=>{let Me=S(p,I.fontFamily),ze=S(y,`${I.fontSize}px`),Te=S(g,I.fontWeight),je=S(f,I.lineHeight),$e=S(v,I.letterSpacing||"0%"),Ye="color: #155724;",We="color: #721c24; background: #f8d7da; padding: 2px 6px; border-radius: 4px; font-weight: 600;",tt=G===0;return`
        <div class="style-option-item" data-style-id="${I.id}" style="
          padding: 14px 16px;
          margin-bottom: 10px;
          border: 2px solid ${ae?"#0071e3":"#e0e0e0"};
          border-radius: 10px;
          cursor: pointer;
          background: ${ae?"#f8fbff":"white"};
          transition: all 0.15s;
          border-left: 4px solid ${ae?"#0071e3":"#e0e0e0"};
        ">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
              <input type="radio" name="style-option" ${ae?"checked":""} style="margin: 0; cursor: pointer; width: 18px; height: 18px;" />
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-weight: 700; font-size: 14px; color: #333;">${u(I.name)}</span>
                  ${tt?'<span style="color: #f5a623;">\u2B50</span>':""}
                </div>
                <div style="font-size: 12px; color: #666; margin-top: 2px;">
                  ${u(I.fontFamily)} ${I.fontSize}px ${u(I.fontWeight)}
                </div>
              </div>
            </div>
            <div style="text-align: right;">
              ${tt?'<div style="color: #0071e3; font-size: 11px; font-weight: 600;">Best Match</div>':""}
              <div style="font-size: 12px; color: #666; background: #f0f0f0; padding: 3px 10px; border-radius: 12px; margin-top: 2px;">${I.similarity}% match</div>
            </div>
          </div>
          <div style="margin-left: 28px; padding: 0 12px; background: #f8f9fa; border-radius: 6px;">
            <div style="font-size: 11px; font-weight: 600; color: #333; margin-bottom: 8px;">Details:</div>
            <div style="font-size: 11px; color: #555; line-height: 1.2;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="color: #888; min-width: 90px;">\u2022 Font Family:</span>
                <span style="${Me?We:Ye}">${Me?"\u26A0":"\u2713"} ${u(I.fontFamily)}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="color: #888; min-width: 90px;">\u2022 Font Size:</span>
                <span style="${ze?We:Ye}">${ze?"\u26A0":"\u2713"} ${I.fontSize}px</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="color: #888; min-width: 90px;">\u2022 Font Weight:</span>
                <span style="${Te?We:Ye}">${Te?"\u26A0":"\u2713"} ${u(I.fontWeight)}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="color: #888; min-width: 90px;">\u2022 Line Height:</span>
                <span style="${je?We:Ye}">${je?"\u26A0":"\u2713"} ${u(I.lineHeight)}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="color: #888; min-width: 90px;">\u2022 Letter Spacing:</span>
                <span style="${$e?We:Ye}">${$e?"\u26A0":"\u2713"} ${u(I.letterSpacing||"0%")}</span>
              </div>
            </div>
          </div>
        </div>
      `},M=document.createElement("div");M.className="modal-overlay",M.id="suggest-apply-modal-overlay";let V=document.createElement("div");V.className="modal-dialog",V.style.maxWidth="480px";let de=i?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${i.current}/${i.total}</div>`:"",z=N.map((I,ae)=>L(I,ae===0,ae)).join("");V.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Apply Suggested Style</h2>
        <p class="modal-subtitle">Node: ${u(e.nodeName||"Unnamed")}</p>
      </div>
      ${de}
      <div class="modal-body">
        <div style="margin-bottom: 12px; padding: 12px; background: #fff8e6; border-radius: 8px; border-left: 4px solid #f5a623;">
          <div style="font-size: 11px; font-weight: 600; color: #666; margin-bottom: 6px;">Current Node Properties:</div>
          <div style="font-size: 12px; color: #333; line-height: 1.6;">
            <div><strong>Font:</strong> ${u(p)} \u2022 ${u(y)} \u2022 ${u(g)}</div>
            <div><strong>Line Height:</strong> ${u(f)} \u2022 <strong>Letter Spacing:</strong> ${u(v)}</div>
          </div>
        </div>
        <div style="font-size: 12px; font-weight: 600; color: #333; margin-bottom: 10px;">
          Select a style to apply (Top 5 matches):
        </div>
        <div id="style-options-container" style="max-height: 400px; overflow-y: auto;">
          ${z}
        </div>
      </div>
      <div class="modal-footer">
        ${a?'<button class="modal-btn modal-btn-cancel" id="suggest-modal-ignore-btn" style="background: #64748b; border-color: #64748b; color: white;">Ignore</button>':""}
        <button class="modal-btn modal-btn-cancel" id="suggest-modal-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="suggest-modal-apply-btn" style="background: #22c55e; border-color: #22c55e;">Apply Style</button>
      </div>
    `,M.appendChild(V),document.body.appendChild(M);let Z=V.querySelector("#suggest-modal-cancel-btn"),E=V.querySelector("#suggest-modal-apply-btn"),P=V.querySelector("#suggest-modal-ignore-btn"),Y=V.querySelector(".modal-close"),ie=V.querySelector("#style-options-container"),pe=I=>{U=I,ie.querySelectorAll(".style-option-item").forEach(G=>{let ze=G.getAttribute("data-style-id")===String(I);G.style.border=ze?"2px solid #0071e3":"2px solid #e0e0e0",G.style.borderLeft=ze?"4px solid #0071e3":"4px solid #e0e0e0",G.style.background=ze?"#f8fbff":"white";let Te=G.querySelector('input[type="radio"]');Te&&(Te.checked=ze)})};(()=>{ie.querySelectorAll(".style-option-item").forEach(ae=>{ae.onclick=G=>{G.preventDefault();let Me=ae.getAttribute("data-style-id");pe(Me)}})})();let te=()=>{M.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{M.parentNode&&M.remove()},200)};Z.onclick=()=>{te(),a&&o.onCancel&&typeof o.onCancel=="function"&&o.onCancel()},Y.onclick=()=>{te(),a&&o.onCancel&&typeof o.onCancel=="function"&&o.onCancel()},M.onclick=I=>{I.target===M&&(te(),a&&o.onCancel&&typeof o.onCancel=="function"&&o.onCancel())},E.onclick=()=>{let I=N.find(ae=>String(ae.id)===String(U));if(!I){console.error("[showSuggestApplyModal] Selected style not found:",U);return}te(),ye(e.id,"\u23F3 Applying style...",!0),I.styleId?parent.postMessage({pluginMessage:{type:"apply-figma-text-style",issue:e,styleId:I.styleId,styleName:I.name}},"*"):parent.postMessage({pluginMessage:{type:"apply-typography-style",issue:e,style:I}},"*"),l&&typeof l=="function"&&l()},P&&(P.onclick=()=>{te(),n&&typeof n=="function"&&n()})}function Bn(e,t){if(console.log("[handleFixAllWithSuggestFix] Called with type:",e,"issues:",t),!t||t.length===0){console.log("[handleFixAllWithSuggestFix] No issues to process"),alert("No issues to process");return}console.log("[handleFixAllWithSuggestFix] Processing",t.length,"issues");let o=0,l=0,n=0,s=!1;function a(){let p=`\u2705 \u0110\xE3 xong!

\u0110\xE3 x\u1EED l\xFD ${o} item(s):
\u2022 Applied: ${l}
\u2022 Ignored: ${n}`;alert(p)}function i(){if(s||o>=t.length){a();return}let r=t[o];console.log("[Fix All] Processing issue:",o+1,"of",t.length,"Issue:",r),console.log("[Fix All] Issue type:",r.type,"bestMatch:",r.bestMatch),o++,parent.postMessage({pluginMessage:{type:"select-node",id:r.id}},"*");let p={current:o,total:t.length};if(r.type==="typography-check"||r.type==="typography-style"){if(console.log("[Fix All] Typography issue - checking bestMatch:",r.bestMatch),!r.bestMatch||!r.bestMatch.name||typeof r.bestMatch.name!="string"||r.bestMatch.name.trim().length===0){console.warn("[Fix All] Issue missing bestMatch or bestMatch.name, skipping:",r),console.warn("[Fix All] Issue bestMatch value:",r.bestMatch),n++,i();return}let d=r.bestMatch&&r.bestMatch.name?r.bestMatch.name:null;if(console.log("[Fix All] Extracted styleName:",d),!d||typeof d!="string"||d.trim().length===0){console.warn("[Fix All] Issue bestMatch.name is invalid, skipping:",r),console.warn("[Fix All] styleName value:",d),n++,i();return}console.log("[Fix All] Calling showSuggestApplyModal with issue:",r.id,"styleName:",d),vo(r,d,{showIgnore:!0,progress:p,onApply:()=>{l++,setTimeout(()=>{i()},500)},onIgnore:()=>{n++,i()},onCancel:()=>{s=!0,a()}})}else if(r.type==="color"){let d=yt(r),g=(r.message||"").match(/Color (#[0-9A-Fa-f]{6})/),f=g?g[1].toUpperCase():null;An(r,f,d,{progress:p,onApply:()=>{l++,setTimeout(()=>{i()},500)},onIgnore:()=>{n++,i()},onCancel:()=>{s=!0,a()}})}else if(r.type==="spacing"){let d=ht(r),g=(r.message||"").match(/Padding\s+(\w+)\s+\((\d+)px\)/);if(g){let f=g[1],v=parseInt(g[2]);Ln(r,f,v,d,{progress:p,onApply:()=>{l++,setTimeout(()=>{i()},500)},onIgnore:()=>{n++,i()},onCancel:()=>{s=!0,a()}})}else n++,i()}else r.type==="autolayout"?fn(r,{progress:p,onApply:()=>{l++,setTimeout(()=>{i()},500)},onIgnore:()=>{n++,i()},onCancel:()=>{s=!0,a()}}):r.type==="position"?xn(r,{progress:p,onApply:()=>{l++,setTimeout(()=>{i()},500)},onIgnore:()=>{n++,i()},onCancel:()=>{s=!0,a()}}):r.type==="group"?bn(r,{progress:p,onApply:()=>{l++,setTimeout(()=>{i()},500)},onIgnore:()=>{n++,i()},onCancel:()=>{s=!0,a()}}):r.type==="empty-frame"?kn(r,{progress:p,onApply:()=>{l++,setTimeout(()=>{i()},500)},onIgnore:()=>{n++,i()},onCancel:()=>{s=!0,a()}}):r.type==="text-size-mobile"?(window.pendingTextSizeFixAllCallbacks={progress:p,onApply:()=>{l++,setTimeout(()=>{i()},500)},onIgnore:()=>{n++,i()},onCancel:()=>{s=!0,a()}},Pt(r)):r.type==="contrast"?(window.pendingContrastFixAllCallbacks={progress:p,onApply:()=>{l++,setTimeout(()=>{i()},500)},onIgnore:()=>{n++,i()},onCancel:()=>{s=!0,a()}},Rt(r)):(n++,i())}i()}function An(e,t,o,l={}){let n=Object.keys(_);Lt(e,t,o,_,n,Ke(Xe({},l),{showIgnore:!0}))}function Ln(e,t,o,l,n={}){let s=document.getElementById("spacing-scale"),a=[0,4,8,12,16,24,32,40,48,64,72,80,88,96];if(s&&s.value.trim()){let i=s.value.split(",").map(r=>parseInt(r.trim(),10)).filter(r=>!isNaN(r));i.length>0&&(a=i)}At(e,t,o,l,a,Ke(Xe({},n),{showIgnore:!0}))}function xo(e,t){if(!e||!t){console.error("handleApplyFigmaTextStyle: missing issue or style");return}ye(e.id,"\u23F3 Applying style...",!0),parent.postMessage({pluginMessage:{type:"apply-figma-text-style",issue:e,styleId:t.id,styleName:t.name}},"*")}function Dt(e,t){if(!e||!t){console.error("handleApplyTypographyStyle: missing issue or styleName");return}vo(e,t)}function So(e){if(console.log("handleCreateTextStyle called",e),!e){console.error("handleCreateTextStyle: issue is null/undefined");return}bo(e,t=>{console.log("handleCreateTextStyle: sending message",{type:"create-text-style",issueId:e.id,styleName:t}),ye(e.id,"\u23F3 Creating style...",!0),parent.postMessage({pluginMessage:{type:"create-text-style",issue:e,styleName:t}},"*")})}function ll(e,t){if(e==="typography-style"){let n={nodeName:`${t.length} text node(s)`,message:`Found ${t.length} text node(s) without text style`};bo(n,s=>{t.forEach(a=>{ye(a.id,"\u23F3 Creating style...",!0)}),parent.postMessage({pluginMessage:{type:"create-text-style-all",issues:t,styleName:s}},"*")});return}let o=t.filter(n=>n.bestMatch&&n.type==="typography-check"),l=t.filter(n=>!n.bestMatch||n.type!=="typography-check");if(o.length===0){alert(`No auto-fixable issues found in ${It(e)}.

All ${t.length} issues require manual intervention.`);return}l.length>0&&!confirm(`Found ${o.length} auto-fixable issues and ${l.length} issues that require manual fix.

Do you want to auto-fix the ${o.length} issues now?

The ${l.length} issues will need to be fixed manually.`)||parent.postMessage({pluginMessage:{type:"fix-all-issues",issues:o,issueType:e}},"*")}function Hn(e){console.log("filterAndSearchIssues called",{totalIssues:e.length,currentFilter:Le,currentSearch:ke});let t=e;if(Le!=="all"&&(t=t.filter(o=>o.severity===Le),console.log("After severity filter:",t.length)),ke.trim()){let o=ke.toLowerCase();t=t.filter(l=>{let n=(l.message||"").toLowerCase(),s=(l.nodeName||"").toLowerCase(),a=(l.type||"").toLowerCase();return n.includes(o)||s.includes(o)||a.includes(o)}),console.log("After search filter:",t.length)}return console.log("Final filtered issues:",t.length),t}function Ze(e=[],t=!1,o={}){let{skipSave:l=!1,restoreTimestamp:n=null,skipTabSwitch:s=!1}=o;s||He("issues"),document.getElementById("issues-count").textContent=e.length,e&&Array.isArray(e)&&e.forEach(S=>{ge[S.id]===!0&&(S.ignored=!0,S.originalSeverity||(S.originalSeverity=S.severity),S.severity="info")});let a=x.issues!==e;x.issues=e;let i=n||new Date().toISOString();x.timestamp=i,vt=!1,(t||a)&&(console.log("Resetting filters for new data"),Le="all",Ve="all",Ue&&(Ue.value=""),ke="",Be&&(Be.style.display="none"),we&&we.length>0&&we.forEach(S=>{S.classList.remove("active"),S.getAttribute("data-filter")==="all"&&S.classList.add("active")}));let r=document.getElementById("filter-controls"),p=document.getElementById("color-type-filter"),d=document.getElementById("filter-buttons");r&&(r.style.display=e.length>0?"flex":"none"),p&&(p.style.display="none"),d&&(d.style.display="flex");let y=document.getElementById("export-group");y.style.display=e.length>0?"flex":"none",console.log("About to filter with:",{currentFilter:Le,currentSearch:ke});let g=Hn(e),f=new Set;if(a||(document.querySelectorAll(".issue-group").forEach(L=>{let M=L.getAttribute("data-issue-type");M&&!L.classList.contains("collapsed")&&f.add(M)}),console.log("Saved expanded groups:",Array.from(f))),Ct("issues"),g.length===0&&e.length===0){le.innerHTML=`
              <div class="empty-state success">
                <div class="icon">\u2705</div>
                <p><strong>No issues found!</strong></p>
                <p style="margin-top: 8px; font-size: 12px;">Your design passed all configured checks.</p>
              </div>
            `;return}if(g.length===0&&e.length>0&&Le!=="all"){le.innerHTML=`
              <div class="empty-state">
                <div class="icon">\u{1F50D}</div>
                <p><strong>No results found</strong></p>
                <p style="margin-top: 8px; font-size: 12px;">Try changing the filter or search keyword.</p>
              </div>
            `;return}let v={error:g.filter(S=>S.severity==="error"&&!S.ignored).length,warn:g.filter(S=>S.severity==="warn"&&!S.ignored).length,total:g.length,originalTotal:e.length},h=document.createElement("div");h.className="results-header",h.innerHTML="<h3>Check Result</h3>",le.appendChild(h),zt(e);let A=g.reduce((S,L)=>(S[L.type]=S[L.type]||[],S[L.type].push(L),S),{}),N=e.reduce((S,L)=>(S[L.type]=S[L.type]||[],S[L.type].push(L),S),{}),U=["naming","autolayout","spacing","color","typography","typography-style","typography-check","line-height","position","duplicate","group","component","empty-frame","nested-group","contrast","text-size-mobile"];for(let S of U){let L=A[S]||[],M=L.length,V=L.filter(c=>c.ignored?!1:c.severity==="error"||c.severity==="warn").length;if(M===0&&e.length===0||M===0&&Le!=="all")continue;let de=document.createElement("div"),z=f.has(S);de.className=z?"issue-group":"issue-group collapsed",de.setAttribute("data-issue-type",S);let Z=document.createElement("div");Z.className="issue-group-header";let E=(N[S]||[]).some(c=>{try{if(!c)return!1;switch(c.type){case"color":return yt(c)!==null;case"spacing":return ht(c)!==null;case"autolayout":return typeof it=="function"&&it(c)!==null;case"text-size-mobile":return typeof nt=="function"&&nt(c)!==null;case"contrast":return typeof ct=="function"&&ct(c)!==null;case"typography-style":case"typography-check":let te=c.bestMatch&&c.bestMatch!==null&&c.bestMatch!==void 0&&c.bestMatch.name&&typeof c.bestMatch.name=="string"&&c.bestMatch.name.trim().length>0&&wt(c);return S==="typography-style"&&console.log("[hasSuggestFixButton] Typography-style issue",c.id,"hasBestMatch:",te,"bestMatch:",c.bestMatch),te;case"position":return typeof ot=="function"&&ot(c)!==null;case"duplicate":case"component":return typeof at=="function"&&at(c)!==null;case"group":return!0;case"empty-frame":return typeof rt=="function"&&rt(c)!==null;default:return!1}}catch(te){return console.error("[hasSuggestFixButton] Error checking issue:",c,te),!1}});S==="typography-style"&&console.log("[hasSuggestFixButton] Type:",S,"hasSuggestFixButton:",E,"allGrouped[type]:",N[S]),Z.innerHTML=`
              <div class="issue-group-header-left">
                <button class="issue-group-toggle" type="button">
                  <span class="issue-group-toggle-icon">\u25B6</span>
                </button>
                <h4>${eo(S)} ${It(S)}</h4>
                <span class="badge">${V}</span>
              </div>
              ${M>0&&S!=="typography"&&S!=="line-height"&&S!=="naming"&&S!=="component"&&S!=="duplicate"&&E?`<button class="btn-fix-all" data-type="${S}">Fix all now</button>`:""}
            `;let P=Z.querySelector(".issue-group-toggle"),Y=()=>{de.classList.contains("collapsed")?(de.classList.remove("collapsed"),pe.style.display="block",setTimeout(()=>{pe.style.opacity="1"},10)):(pe.style.opacity="0",setTimeout(()=>{de.classList.add("collapsed"),pe.style.display="none"},200))};P.onclick=c=>{c.stopPropagation(),Y()},Z.onclick=c=>{c.target!==P&&!P.contains(c.target)&&Y()};let ie=Z.querySelector(".btn-fix-all");console.log("[Fix All] Setting up button for type:",S,"btnFixAll found:",!!ie),ie?ie.onclick=c=>{try{console.log("[Fix All] ========== BUTTON CLICKED =========="),console.log("[Fix All] Button clicked for type:",S),console.log("[Fix All] Event:",c),c.preventDefault(),c.stopPropagation(),console.log("[Fix All] All issues in group:",N[S]),console.log("[Fix All] allGrouped[type] length:",(N[S]||[]).length);let te=(N[S]||[]).filter(I=>{if(!I)return console.log("[Fix All] Filter: issue is null/undefined"),!1;switch(console.log("[Fix All] Filter: checking issue",I.id,"type:",I.type,"bestMatch:",I.bestMatch),I.type){case"color":return yt(I)!==null;case"spacing":return ht(I)!==null;case"autolayout":return typeof it=="function"&&it(I)!==null;case"text-size-mobile":return typeof nt=="function"&&nt(I)!==null;case"contrast":return typeof ct=="function"&&ct(I)!==null;case"typography-style":case"typography-check":let ae=I.bestMatch&&I.bestMatch!==null&&I.bestMatch!==void 0&&I.bestMatch.name&&typeof I.bestMatch.name=="string"&&I.bestMatch.name.trim().length>0&&wt(I);return console.log("[Fix All] Filter: typography issue",I.id,"hasValidBestMatch:",ae,"bestMatch:",I.bestMatch),ae;case"position":return typeof ot=="function"&&ot(I)!==null;case"duplicate":case"component":return typeof at=="function"&&at(I)!==null;case"group":return!0;case"empty-frame":return typeof rt=="function"&&rt(I)!==null;default:return!1}});if(console.log("[Fix All] Filtered issues with suggest fix:",te),console.log("[Fix All] Issues count:",te.length),console.log("[Fix All] Filtered issues count:",te.length),te.length===0){console.log("[Fix All] No issues with suggest fix available"),alert("No issues with suggest fix available");return}console.log("[Fix All] Starting handleFixAllWithSuggestFix with",te.length,"issues"),Bn(S,te)}catch(te){console.error("[Fix All] ERROR in button onclick:",te),console.error("[Fix All] Error stack:",te.stack),alert("Error: "+te.message)}}:console.log("[Fix All] Button not found for type:",S),de.appendChild(Z);let pe=document.createElement("div");if(pe.className="issue-group-content",z?(pe.style.display="block",pe.style.opacity="1"):pe.style.display="none",M===0){let c=document.createElement("div");c.className="issue info",c.style.opacity="0.7",c.innerHTML=`
                <div class="issue-header">
                  <div>
                    <span class="issue-type">\u2705 PASSED</span>
                    <div class="issue-body">No issues in this type.</div>
                  </div>
                </div>
              `,pe.appendChild(c)}else A[S].forEach((c,te)=>{let I=te+1,ae=ge[c.id]===!0;if(ae&&(c.originalSeverity||(c.originalSeverity=c.severity),c.severity="info",c.ignored=!0),c.type==="typography-check"){let H=document.createElement("div");pe.appendChild(H);let re=pn(c);if(re){let he=document.createElement("span");he.className="issue-number",he.textContent=`#${I}`,he.style.cssText="position: absolute; left: 8px; top: 8px; font-weight: bold; opacity: 0.5; font-size: 11px;",re.style.position="relative",re.style.paddingLeft="40px",re.insertBefore(he,re.firstChild),pe.replaceChild(re,H)}return}let G=document.createElement("div"),Me=ae?"info":c.severity;G.className=`issue ${Me}`,G.setAttribute("data-issue-id",c.id);let ze=u(c.message);if(c.type==="contrast"){let H=[];if(c.textColor&&H.push(`Text color: <code style="background: ${u(c.textColor)}; padding: 2px 6px; border-radius: 3px; color: ${bt(c.textColor)};">${u(c.textColor)}</code> (${c.textColorNode||c.nodeName||"Unnamed"})`),c.backgroundColor){let re="Background:",he="",Ne="";c.isGradient&&c.gradientString?(re="Background (gradient):",he=`<code style="background: ${u(c.backgroundColor)}; padding: 2px 6px; border-radius: 3px; color: ${bt(c.backgroundColor)}; font-family: 'SF Mono', Monaco, monospace; font-size: 11px;">${u(c.gradientString)}</code>`,Ne=" <span style='font-size: 11px; color: #999;'>(average: "+u(c.backgroundColor)+")</span>"):he=`<code style="background: ${u(c.backgroundColor)}; padding: 2px 6px; border-radius: 3px; color: ${bt(c.backgroundColor)};">${u(c.backgroundColor)}</code>`,c.fromSibling&&(Ne+=" <span style='font-size: 11px; color: #3b82f6;'>(from sibling layer)</span>"),H.push(`${re} ${he}${Ne} (${c.backgroundColorNode||"Unknown"})`)}H.length>0&&(ze+=`<div style="margin-top: 8px; font-size: 12px; color: #666;">${H.join(" | ")}</div>`)}G.innerHTML=`
                <div class="issue-header">
                  <div>
                    <span class="issue-type">
                      <span class="issue-number">#${I}</span>
                      ${dn(ae?"info":c.severity)} ${ae?"INFO":c.severity.toUpperCase()}
                    </span>
                    <div class="issue-body">${ze}</div>
                    ${c.nodeName?`<div class="issue-node">Node: ${u(c.nodeName)}</div>`:""}
                    ${c.type==="typography"||c.type==="line-height"?`<div style="margin-top: 8px; padding: 8px 12px; background: #fff3cd; border-left: 3px solid #ffc107; border-radius: 4px; font-size: 12px; color: #856404; line-height: 1.5;"><strong>Note:</strong> Check 'Typography Style Match' to resolve this issue.</div>`:""}
                    ${c.ignored?'<div class="issue-ignored-tag" style="margin-top: 4px; padding: 4px 8px; background: #e3f2fd; color: #1976d2; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-block;">\u2713 Pass with ignore custom</div>':""}
                  </div>
                  <div class="issue-actions">
                    <button class="btn-select" data-id="${c.id}">Select</button>
                    ${c.type==="color"?`
                      ${yt(c)?`<button class="btn-suggest-fix" data-id="${c.id}">Suggest Fix now</button>`:""}
                      <button class="btn-fix" data-id="${c.id}">Select Color</button>
                    `:""}
                    ${c.type==="spacing"?`
                      ${ht(c)?`<button class="btn-suggest-fix" data-id="${c.id}">Suggest Fix now</button>`:""}
                      <button class="btn-fix" data-id="${c.id}">Select Spacing</button>
                    `:""}
                    ${c.type==="autolayout"?`
                      ${it(c)?`<button class="btn-suggest-fix" data-id="${c.id}">Suggest Fix now</button>`:""}
                      <button class="btn-fix" data-id="${c.id}">Select</button>
                    `:""}
                    ${c.type==="text-size-mobile"?`
                      ${nt(c)?`<button class="btn-suggest-fix" data-id="${c.id}">Suggest Fix now</button>`:""}
                      <button class="btn-fix" data-id="${c.id}">Select Style</button>
                    `:""}
                    ${c.type==="contrast"?`
                      ${ct(c)?`<button class="btn-suggest-fix" data-id="${c.id}">Suggest Fix now</button>`:""}
                      <button class="btn-fix" data-id="${c.id}">Select Color</button>
                      <button class="btn-ignore" data-id="${c.id}" ${c.ignored?'style="background: #22c55e; border-color: #22c55e;"':""}>${c.ignored?"Ignored":"Ignore"}</button>
                    `:""}
                    ${c.type==="typography-style"?`
                      ${c.bestMatch&&c.bestMatch.name&&wt(c)?`
                        <button class="btn-suggest-fix" data-id="${c.id}" data-style-name="${u(c.bestMatch.name)}">Suggest Fix now</button>
                      `:""}
                      <button class="btn-fix" data-id="${c.id}">Select Style</button>
                      <button class="btn-create-style" data-id="${c.id}" data-issue-type="${c.type}">Create Style</button>
                    `:""}
                    ${c.type==="position"?`
                      ${ot(c)?`<button class="btn-suggest-fix" data-id="${c.id}">Suggest Fix now</button>`:""}
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
              `,pe.appendChild(G),G.setAttribute("data-issue-id",c.id),G.setAttribute("data-issue-type",c.type);let Te=G.querySelector("button.btn-select");Te&&(Te.onclick=()=>{document.querySelectorAll(".btn-select.active").forEach(H=>H.classList.remove("active")),document.querySelectorAll(".issue.selected").forEach(H=>H.classList.remove("selected")),Te.classList.add("active"),G.classList.add("selected"),parent.postMessage({pluginMessage:{type:"select-node",id:c.id}},"*")});let je=G.querySelector("button.btn-fix");je&&(c.type==="color"?je.onclick=()=>{Tn(c)}:c.type==="spacing"?je.onclick=()=>{Fn(c)}:c.type==="text-size-mobile"?je.onclick=H=>{H.preventDefault(),H.stopPropagation(),console.log("Text Size Fix button clicked",c),typeof go=="function"?go(c):(console.error("handleFixTextSizeIssue is not a function"),alert("Error: handleFixTextSizeIssue function not found"))}:c.type==="contrast"?je.onclick=H=>{H.preventDefault(),H.stopPropagation(),console.log("Contrast Fix button clicked",c),typeof mo=="function"?mo(c):(console.error("handleFixContrastIssue is not a function"),alert("Error: handleFixContrastIssue function not found"))}:je.onclick=()=>{Nn(c)});let $e=G.querySelector("button.btn-suggest-fix");$e&&(c.type==="color"?$e.onclick=()=>{un(c)}:c.type==="spacing"?$e.onclick=()=>{gn(c)}:c.type==="autolayout"?$e.onclick=H=>{H.preventDefault(),H.stopPropagation(),console.log("Autolayout Suggest Fix button clicked",c),typeof to=="function"?to(c):(console.error("handleSuggestFixAutolayout is not a function"),alert("Error: handleSuggestFixAutolayout function not found"))}:c.type==="text-size-mobile"?$e.onclick=H=>{H.preventDefault(),H.stopPropagation(),console.log("Text Size Suggest Fix button clicked",c),typeof Pt=="function"?Pt(c):(console.error("handleSuggestFixTextSize is not a function"),alert("Error: handleSuggestFixTextSize function not found"))}:c.type==="position"?$e.onclick=H=>{H.preventDefault(),H.stopPropagation(),console.log("Position Suggest Fix button clicked",c),typeof no=="function"?no(c):(console.error("handleSuggestFixPosition is not a function"),alert("Error: handleSuggestFixPosition function not found"))}:c.type==="duplicate"||c.type==="component"?$e.onclick=H=>{H.preventDefault(),H.stopPropagation(),console.log("Component Suggest Fix button clicked",c),typeof io=="function"?io(c):(console.error("handleSuggestFixComponent is not a function"),alert("Error: handleSuggestFixComponent function not found"))}:c.type==="contrast"?$e.onclick=H=>{H.preventDefault(),H.stopPropagation(),console.log("Contrast Suggest Fix button clicked",c),typeof Rt=="function"?Rt(c):(console.error("handleSuggestFixContrast is not a function"),alert("Error: handleSuggestFixContrast function not found"))}:c.type==="group"?$e.onclick=H=>{H.preventDefault(),H.stopPropagation(),console.log("Group Suggest Fix button clicked",c),typeof oo=="function"?oo(c):(console.error("handleSuggestFixGroup is not a function"),alert("Error: handleSuggestFixGroup function not found"))}:c.type==="empty-frame"&&($e.onclick=H=>{H.preventDefault(),H.stopPropagation(),console.log("Empty Frame Suggest Fix button clicked",c),typeof lo=="function"?lo(c):(console.error("handleSuggestFixEmptyFrame is not a function"),alert("Error: handleSuggestFixEmptyFrame function not found"))}));let Ye=G.querySelector("button.btn-select-component");Ye&&(c.type==="duplicate"||c.type==="component")&&(function(H){Ye.onclick=re=>{re.preventDefault(),re.stopPropagation(),console.log("Select Component button clicked",H),typeof ao=="function"?ao(H):(console.error("handleSelectComponent is not a function"),alert("Error: handleSelectComponent function not found"))}})(c);let We=G.querySelector("button.btn-create-component");We&&(c.type==="duplicate"||c.type==="component")&&(function(H){We.onclick=re=>{re.preventDefault(),re.stopPropagation(),console.log("Create Component button clicked",H),typeof ro=="function"?ro(H):(console.error("handleCreateComponent is not a function"),alert("Error: handleCreateComponent function not found"))}})(c);let tt=G.querySelector("button.btn-rename");tt&&c.type==="naming"&&(function(H){tt.onclick=re=>{re.preventDefault(),re.stopPropagation(),console.log("Rename button clicked",H),typeof co=="function"?co(H):(console.error("handleRenameNode is not a function"),alert("Error: handleRenameNode function not found"))}})(c);let mt=G.querySelector("button.btn-remove-layer");mt&&(function(H){mt.onclick=re=>{re.preventDefault(),re.stopPropagation(),console.log("Remove Layer button clicked",H),typeof $t=="function"?$t(H):(console.error("handleRemoveLayer is not a function"),alert("Error: handleRemoveLayer function not found"))}})(c);let Ae=G.querySelector("button.btn-ignore");if(Ae&&c.type==="contrast"&&(Ae.removeAttribute("disabled"),Ae.onclick=H=>{H.preventDefault(),H.stopPropagation(),console.log("Ignore button clicked",c);try{typeof yo=="function"?yo(c):(console.error("handleIgnoreIssue is not a function"),alert("Error: handleIgnoreIssue function not found"))}catch(re){console.error("Error handling ignore:",re),alert(`Error: ${re.message}`)}}),c.type==="typography-style"){let H=G.querySelector("button.btn-create-style");H?(console.log("Attaching create style handler to button",{issueId:c.id,issueType:c.type,nodeName:c.nodeName}),(function(Ee){H.onclick=Fe=>{Fe.preventDefault(),Fe.stopPropagation(),console.log("Create Style button clicked",Ee),typeof So=="function"?So(Ee):(console.error("handleCreateTextStyle is not a function"),alert("Error: handleCreateTextStyle function not found"))}})(c)):console.error("Create Style button not found in DOM",{issueId:c.id,issueType:c.type,hasIssueEl:!!G,innerHTML:G.innerHTML.substring(0,200)});let re=G.querySelector("button.btn-suggest-fix");re&&c.bestMatch&&c.bestMatch.name&&c.type==="typography-style"&&(function(Ee){re.onclick=Fe=>{Fe.preventDefault(),Fe.stopPropagation();let ft=re.getAttribute("data-style-name");ft?Dt(Ee,ft):(console.error("Cannot apply: styleName is missing from button",Ee),alert("Error: Style name is missing"))}})(c),re&&c.bestMatch&&c.bestMatch.name&&c.type==="typography-check"&&(function(Ee){re.onclick=Fe=>{Fe.preventDefault(),Fe.stopPropagation(),Ee.bestMatch&&Ee.bestMatch.name?Dt(Ee,Ee.bestMatch.name):(console.error("Cannot apply: bestMatch.name is missing",Ee),alert("Error: Best match style name is missing"))}})(c);let he=G.querySelector("button.btn-fix");he&&c.type==="typography-style"&&(function(Ee){he.onclick=Fe=>{Fe.preventDefault(),Fe.stopPropagation(),parent.postMessage({pluginMessage:{type:"get-figma-text-styles",issueId:Ee.id}},"*"),window.pendingTypographyStyleIssue=Ee}})(c);let Ne=G.querySelector("button.btn-style-dropdown"),lt=G.querySelector(".style-dropdown-menu");if(Ne&&lt){let Ee=!1;Ne.onclick=Fe=>{Fe.preventDefault(),Fe.stopPropagation();let ft=lt.style.display!=="none";document.querySelectorAll(".style-dropdown-menu").forEach(Zo=>{Zo!==lt&&(Zo.style.display="none")}),ft?lt.style.display="none":(lt.style.display="block",Ee||(lt.innerHTML='<div style="padding: 8px 12px; color: #999; font-size: 12px; text-align: center;">Loading...</div>',parent.postMessage({pluginMessage:{type:"get-figma-text-styles",issueId:c.id}},"*")))},document.addEventListener("click",function(ft){G.contains(ft.target)||(lt.style.display="none")})}}});de.appendChild(pe),le.appendChild(de)}l||Ht({issues:e,issuesTimestamp:i,tokens:x.tokens,tokensTimestamp:x.tokensTimestamp,lastActiveTab:"issues",scanMode:x.scanMode||null,context:x.context||null})}function qn(e){if(console.log("filterAndSearchTokens called",{hasTokens:!!e,currentColorTypeFilter:Ve,currentSearch:ke}),!e)return null;let t={},o=!1;for(let[l,n]of Object.entries(e)){let s=n||[];if(console.log(`Processing ${l}, initial count:`,s.length),(l==="colors"||l==="gradients")&&Ve!=="all"&&(s=s.filter(a=>(a.colorType||"").toLowerCase().includes(Ve.toLowerCase())),console.log(`After color type filter (${Ve}):`,s.length)),ke.trim()){let a=ke.toLowerCase();s=s.map(i=>{let r=String(i.value||"").toLowerCase(),p=(i.nodes||[]).map(v=>v.name||"").join(" ").toLowerCase(),d=(i.colorType||"").toLowerCase(),y=r.includes(a),g=p.includes(a),f=d.includes(a);if(y||g||f){let v=[];return y&&v.push("value"),g&&v.push("nodeName"),f&&v.push("colorType"),Ke(Xe({},i),{_matchedBy:v,_matchedNodeNames:g?(i.nodes||[]).filter(h=>(h.name||"").toLowerCase().includes(a)).map(h=>h.name):[]})}return null}).filter(i=>i!==null),console.log(`After search filter (${l}):`,s.length)}s.length>0&&(o=!0),t[l]=s}return console.log("Final filtered tokens keys:",Object.keys(t)),{tokens:t,hasMatches:o}}function Pn(e){let t=document.getElementById("spacing-scale");if(!t)return;let o=document.getElementById("spacing-threshold"),l=o?parseInt(o.value,10):100,n=isNaN(l)?100:l,a=(e&&Array.isArray(e.spacing)?e.spacing:[]).map(r=>{let p=parseInt(String(r&&r.value!==void 0?r.value:"").trim(),10);return isNaN(p)?null:Math.abs(p)}).filter(r=>r!==null&&r<=n);if(!a.length)return;let i=Array.from(new Set(a)).sort((r,p)=>r-p);t.value=i.join(", ");try{t.focus(),t.setSelectionRange(t.value.length,t.value.length)}catch(r){}}function xt(e,t=!1,o={}){let{skipSave:l=!1,restoreTimestamp:n=null,skipTabSwitch:s=!1}=o;s||He("tokens");let a=Object.values(e||{}).reduce((L,M)=>L+(Array.isArray(M)?M.length:0),0);document.getElementById("tokens-count").textContent=a;let i=x.tokens!==e;x.tokens=e;let r=n||new Date().toISOString();x.tokensTimestamp=r,vt=!0,(t||i)&&(console.log("Resetting filters for new token data"),Le="all",Ve="all",Ue&&(Ue.value=""),ke="",Be&&(Be.style.display="none"),we&&we.length>0&&we.forEach(L=>{L.classList.remove("active"),L.getAttribute("data-filter")==="all"&&L.classList.add("active")}),pt&&(pt.value="all"));let p=document.getElementById("filter-controls"),d=document.getElementById("color-type-filter"),y=document.getElementById("filter-buttons");p&&(p.style.display=e&&Object.keys(e).length>0?"flex":"none"),d&&(d.style.display=e&&(e.colors||e.gradients)?"block":"none"),y&&(y.style.display="none");let g=document.getElementById("export-group");g.style.display=e&&Object.keys(e).length>0?"flex":"none",console.log("About to filter tokens with:",{currentColorTypeFilter:Ve,currentSearch:ke});let f=qn(e);if(Ct("tokens"),!e||Object.keys(e).length===0){me.innerHTML=`
              <div class="empty-state">
                <div class="icon">\u{1F4CB}</div>
                <p>No design tokens found</p>
              </div>
            `;return}if(!f){me.innerHTML=`
              <div class="empty-state">
                <div class="icon">\u{1F50D}</div>
                <p><strong>No results found</strong></p>
                <p style="margin-top: 8px; font-size: 12px;">Try changing the filter or search keyword.</p>
              </div>
            `;return}let v=f.tokens||{},h=f.hasMatches;if((ke.trim()||Ve!=="all")&&!h){me.innerHTML=`
              <div class="empty-state">
                <div class="icon">\u{1F50D}</div>
                <p><strong>No results found</strong></p>
                <p style="margin-top: 8px; font-size: 12px;">Try changing the filter or search keyword.</p>
              </div>
            `;return}let N={colors:{icon:"\u{1F3A8}",label:"Colors",values:v.colors||[]},gradients:{icon:"\u{1F308}",label:"Gradients",values:v.gradients||[]},spacing:{icon:"\u2194\uFE0F",label:"Spacing (px)",values:v.spacing||[]},borderRadius:{icon:"\u2B55",label:"Border Radius",values:v.borderRadius||[]},fontWeight:{icon:"\u{1F4AA}",label:"Font Weight",values:v.fontWeight||[]},lineHeight:{icon:"\u{1F4CF}",label:"Line Height (%)",values:v.lineHeight||[]},fontSize:{icon:"\u{1F4DD}",label:"Font Size",values:v.fontSize||[]},fontFamily:{icon:"\u{1F524}",label:"Font Family",values:v.fontFamily||[]}},U=document.createElement("div");U.className="results-header";let S=Object.values(N).reduce((L,M)=>L+M.values.length,0);U.innerHTML=`
            <h3>Design Tokens</h3>
            <div class="results-stats">
              <span class="stat">${S} Tokens</span>
            </div>
          `,me.appendChild(U);for(let[L,M]of Object.entries(N)){let V=document.createElement("div");V.className="issue-group collapsed";let de=document.createElement("div");de.className="issue-group-header",de.innerHTML=`
              <div class="issue-group-header-left">
                <button class="issue-group-toggle" type="button">
                  <span class="issue-group-toggle-icon">\u25B6</span>
                </button>
                <h4>${M.icon} ${M.label}</h4>
                <span class="badge">${M.values.length}</span>
              </div>
            `;let z=document.createElement("div");z.className="issue-group-content",z.style.display="none";let Z=de.querySelector(".issue-group-toggle"),E=()=>{V.classList.contains("collapsed")?(V.classList.remove("collapsed"),z.style.display="block",setTimeout(()=>{z.style.opacity="1"},10)):(z.style.opacity="0",setTimeout(()=>{V.classList.add("collapsed"),z.style.display="none"},200))};if(Z.onclick=Y=>{Y.stopPropagation(),E()},de.onclick=Y=>{Y.target!==Z&&!Z.contains(Y.target)&&E()},V.appendChild(de),Array.isArray(M.values)&&M.values.length>0){let Y=document.createElement("div");Y.className="token-list",M.values.forEach((ie,pe)=>{let c=pe+1,te=document.createElement("div");te.className="token-item";let I=ie.value,ae=ie.nodes||[],G=ae.length>0?ae[0]:null,Me=typeof ie.totalNodes=="number"?ie.totalNodes:ae.length,ze=ie.colorType||null,Te="";if(L==="colors"){let Ae=ze?`<span class="token-color-type">${u(ze)}</span>`:"";Te=`
                  <span class="token-number">#${c}</span>
                  <span class="token-color-preview" style="background-color: ${u(I)}"></span>
                  <code>${u(I)}</code>
                  ${Ae}
                `}else if(L==="gradients"){let Ae=ze?`<span class="token-color-type">${u(ze)}</span>`:"";Te=`
                  <span class="token-number">#${c}</span>
                  <span class="token-gradient-preview" style="background: ${u(I)}"></span>
                  <code>${u(I)}</code>
                  ${Ae}
                `}else Te=`<span class="token-number">#${c}</span><code>${u(String(I))}</code>`;let je=ie._matchedBy||[],$e=ie._matchedNodeNames||[],Ye=je.includes("nodeName"),We="";G&&G.name&&(Ye&&$e.length>0?We=`<div class="token-node-name token-matched-by-name">
                    <span class="match-indicator">\u{1F50D} Matched in:</span> ${$e.map(H=>`<span class="token-matched-node">${u(H)}</span>`).join(", ")}
                  </div>`:We=`<div class="token-node-name">Node: ${u(G.name)}</div>`);let tt="";if(L==="fontWeight"){let H=Array.isArray(ie.fontFamilies)?ie.fontFamilies:null;if(!H){let re={};ae.forEach(he=>{let Ne=he&&he.fontFamily?String(he.fontFamily):"Unknown";re[Ne]=(re[Ne]||0)+1}),H=Object.entries(re).map(([he,Ne])=>({family:he,count:Ne})).sort((he,Ne)=>Ne.count-he.count||he.family.localeCompare(Ne.family))}Array.isArray(H)&&H.length>0&&(tt=`
                    <div class="token-note">
                      <div class="token-note-label">Font-family:</div>
                      <ul class="token-note-list">${H.map(he=>`<li><code>${u(he.family)}</code> (${he.count})</li>`).join("")}</ul>
                    </div>
                  `)}te.innerHTML=`
                <div class="token-item-row">
                  <div class="token-value">
                    ${Te}
                  </div>
                  ${G?`
                    <div class="token-actions">
                      <button class="btn-select" data-id="${G.id}">Select</button>
                      ${Me>1?`<span class="token-node-count">(${Me})</span>`:""}
                    </div>
                  `:""}
                </div>
                ${We}
                ${tt}
              `;let mt=te.querySelector("button.btn-select");mt&&(mt.onclick=()=>{document.querySelectorAll(".btn-select.active").forEach(Ae=>Ae.classList.remove("active")),document.querySelectorAll(".issue.selected, .token-item.selected").forEach(Ae=>Ae.classList.remove("selected")),mt.classList.add("active"),te.classList.add("selected"),parent.postMessage({pluginMessage:{type:"select-node",id:G.id}},"*")}),Y.appendChild(te)}),z.appendChild(Y)}else{let Y=document.createElement("div");Y.className="token-empty-message",Y.textContent="No tokens in this group.",z.appendChild(Y)}V.appendChild(z),me.appendChild(V)}l||Ht({issues:x.issues,issuesTimestamp:x.timestamp,tokens:e,tokensTimestamp:r,lastActiveTab:"tokens",scanMode:x.scanMode||null,context:x.context||null})}function et(e){let t=document.getElementById("validation-error"),o=document.getElementById("validation-error-message"),l=document.getElementById("btn-close-validation-error");t&&o&&(o.textContent=e,t.style.display="block",b.style.display="block",w.style.display="none",m.style.display="none",b.disabled=!1,C.disabled=!1,setTimeout(()=>{t.style.display==="block"&&(t.style.display="none")},1e4),l&&(l.onclick=()=>{t.style.display="none"}))}function ko(e){var U,S,L,M,V,de,z;b.style.display="none",w.style.display="block",m.style.display="block",k.style.transition="none",k.style.width="0%",$.textContent="0%",setTimeout(()=>{k.style.transition="width 0.3s"},10),X();let t=document.getElementById("spacing-scale"),o=document.getElementById("spacing-threshold"),l=document.getElementById("color-scale"),n=document.getElementById("font-size-scale"),s=document.getElementById("font-size-threshold"),a=document.getElementById("line-height-scale"),i=document.getElementById("line-height-threshold"),r=document.getElementById("line-height-baseline-threshold"),p=t?t.value.trim():"",d=o?parseInt(o.value,10):100,y=l?l.value.trim():"",g=n?n.value.trim():"",f=s?parseInt(s.value,10):100,v=a?a.value.trim():"",h=i?parseInt(i.value,10):300,A=r?parseInt(r.value,10):120,N={checkStyle:((U=document.getElementById("rule-typo-style"))==null?void 0:U.checked)||!1,checkFontFamily:((S=document.getElementById("rule-font-family"))==null?void 0:S.checked)||!1,checkFontSize:((L=document.getElementById("rule-font-size"))==null?void 0:L.checked)||!1,checkFontWeight:((M=document.getElementById("rule-font-weight"))==null?void 0:M.checked)||!1,checkLineHeight:((V=document.getElementById("rule-line-height"))==null?void 0:V.checked)||!1,checkLetterSpacing:((de=document.getElementById("rule-letter-spacing"))==null?void 0:de.checked)||!1,checkWordSpacing:((z=document.getElementById("rule-word-spacing"))==null?void 0:z.checked)||!1};parent.postMessage({pluginMessage:{type:"scan",mode:e,spacingScale:p,spacingThreshold:d,colorScale:y,fontSizeScale:g,fontSizeThreshold:f,lineHeightScale:v,lineHeightThreshold:h,lineHeightBaselineThreshold:A,typographyStyles:Q,typographyRules:N,ignoredIssues:ge}},"*"),console.log("Message sent:",{type:"scan",mode:e})}b.onclick=()=>{var e;console.log("btnScan clicked");try{let t=document.getElementById("validation-error");t&&(t.style.display="none");let o=((e=document.querySelector('input[name="scope"]:checked'))==null?void 0:e.value)||"page",l=document.getElementById("spacing-scale"),n=document.getElementById("spacing-threshold"),s=document.getElementById("color-scale"),a=document.getElementById("font-size-scale"),i=document.getElementById("font-size-threshold"),r=document.getElementById("line-height-scale"),p=document.getElementById("line-height-threshold"),d=document.getElementById("line-height-baseline-threshold"),y=l?l.value.trim():"",g=n?parseInt(n.value,10):100,f=s?s.value.trim():"",v=a?a.value.trim():"",h=i?parseInt(i.value,10):100,A=r?r.value.trim():"",N=p?parseInt(p.value,10):300,U=d?parseInt(d.value,10):120;if(y&&!/^\d+(\s*,\s*\d+)*$/.test(y)){et("Spacing guidelines format is incorrect. Please enter the numbers separated by commas (e.g. 4, 8, 12, 16)");return}if(f){let S=f.split(",").map(V=>V.trim()).filter(V=>V),L=/^#[0-9a-fA-F]{3,8}$/,M=S.filter(V=>!L.test(V));if(M.length>0){et(`Color format is incorrect. Invalid colors: ${M.join(", ")}. Please use hex format only.`);return}}if(v&&!/^\d+(\s*,\s*\d+)*$/.test(v)){et("Font-size scale format is incorrect. Please enter the numbers separated by commas (e.g. 32, 24, 20, 18)");return}if(A){let S=A.split(",").map(M=>M.trim()).filter(M=>M);if(!S.every(M=>M.toLowerCase()==="auto"||/^\d+$/.test(M))||S.length===0){et('Line-height scale format is incorrect. Please enter "auto" and/or numbers separated by commas.');return}}if(isNaN(g)||g<0){et("Spacing threshold must be a number >= 0");return}if(isNaN(h)||h<0){et("Font-size threshold must be a number >= 0");return}if(isNaN(N)||N<0){et("Line-height threshold must be a number >= 0");return}if(isNaN(U)||U<0){et("Line-height baseline threshold must be a number >= 0");return}le.innerHTML=`
        <div class="scanning">
          <div class="spinner"></div>
          <p>Checking design size...</p>
        </div>
      `,He("issues"),b.disabled=!0,C.disabled=!0,x.scanMode=o,be(),ve={scope:o},parent.postMessage({pluginMessage:{type:"get-node-count",mode:o}},"*")}catch(t){console.error("Error in btnScan.onclick:",t),le.innerHTML=`<div class="error-message">Error: ${u(t.message)}</div>`,He("issues"),b.disabled=!1,C.disabled=!1}},C.onclick=()=>{var e;console.log("btnExtractTokens clicked");try{C.style.display="none",w.style.display="block",m.style.display="block",k.style.transition="none",k.style.width="0%",$.textContent="0%",setTimeout(()=>{k.style.transition="width 0.3s"},10);let t=((e=document.querySelector('input[name="scope"]:checked'))==null?void 0:e.value)||"page";me.innerHTML=`
        <div class="scanning">
          <div class="spinner"></div>
          <p>Extracting design tokens... Please wait</p>
        </div>
      `,He("tokens"),b.disabled=!0,C.disabled=!0,x.scanMode=t,parent.postMessage({pluginMessage:{type:"extract-tokens",mode:t}},"*"),console.log("Message sent:",{type:"extract-tokens",mode:t})}catch(t){console.error("Error in btnExtractTokens.onclick:",t),me.innerHTML=`<div class="error-message">Error: ${u(t.message)}</div>`,He("tokens"),b.disabled=!1,C.disabled=!1}},q.onclick=()=>{try{Pn(x.tokens)}catch(e){console.error("Failed to fill spacing guidelines from tokens",e)}},O.onclick=()=>{try{let e=x.tokens;if(!e||!Array.isArray(e.colors)||!e.colors.length){alert("No color tokens found. Please run 'Extract Design Tokens' first.");return}let t=document.getElementById("color-scale");if(!t)return;let l=(e.colors||[]).map(s=>String(s&&s.value!==void 0?s.value:"").trim().toUpperCase()).filter(s=>s&&s.startsWith("#"));if(!l.length)return;let n=Array.from(new Set(l)).sort((s,a)=>st(s)-st(a));t.value=n.join(", "),typeof qe=="function"&&qe();try{t.focus(),t.setSelectionRange(t.value.length,t.value.length)}catch(s){}}catch(e){console.error("Failed to fill color from tokens",e)}},D.onclick=()=>{parent.postMessage({pluginMessage:{type:"extract-color-styles"}},"*")};let wo=document.getElementById("btn-extract-color-variables");wo&&(wo.onclick=()=>{parent.postMessage({pluginMessage:{type:"extract-color-variables"}},"*")}),T.onclick=()=>{try{let e=x.tokens;if(!e||!Array.isArray(e.fontSize)||!e.fontSize.length){alert("No font size tokens found. Please run 'Extract Design Tokens' first.");return}let t=document.getElementById("font-size-scale");if(!t)return;let o=document.getElementById("font-size-threshold"),l=o?parseInt(o.value,10):100,n=isNaN(l)?100:l,s=e.fontSize.map(i=>parseInt(String(i&&i.value!==void 0?i.value:"").trim(),10)).filter(i=>!isNaN(i)&&i<=n);if(!s.length)return;let a=Array.from(new Set(s)).sort((i,r)=>r-i);t.value=a.join(", "),t.focus(),t.setSelectionRange(t.value.length,t.value.length)}catch(e){console.error("Failed to fill font size from tokens",e)}},R.onclick=()=>{try{let e=x.tokens;if(!e||!Array.isArray(e.lineHeight)||!e.lineHeight.length){alert("No line height tokens found. Please run 'Extract Design Tokens' first.");return}let t=document.getElementById("line-height-scale");if(!t)return;let o=document.getElementById("line-height-threshold"),l=o?parseInt(o.value,10):300,n=isNaN(l)?300:l,s=[];if(e.lineHeight.forEach(d=>{let y=String(d&&d.value!==void 0?d.value:"").trim();if(y==="auto")s.push("auto");else{let g=parseFloat(y);!isNaN(g)&&g<=n&&s.push(g)}}),!s.length)return;let a=s.includes("auto"),i=s.filter(d=>d!=="auto"),r=Array.from(new Set(i)).sort((d,y)=>d-y),p=a?["auto",...r]:r;t.value=p.join(", "),t.focus(),t.setSelectionRange(t.value.length,t.value.length)}catch(e){console.error("Failed to fill line height from tokens",e)}},W.onclick=()=>{try{if(!Q||!Array.isArray(Q)||Q.length===0){alert("No typography styles defined. Please add typography styles or extract from Figma first.");return}let e=document.getElementById("font-size-scale");if(!e)return;let t=Q.map(l=>{let n=parseInt(String(l.fontSize||"").trim(),10);return isNaN(n)?null:n}).filter(l=>l!==null);if(!t.length){alert("No valid font sizes found in typography styles.");return}let o=Array.from(new Set(t)).sort((l,n)=>n-l);e.value=o.join(", "),be(),e.focus(),e.setSelectionRange(e.value.length,e.value.length),console.log("Filled font size from typography:",o)}catch(e){console.error("Failed to fill font size from typography",e)}},F.onclick=()=>{try{if(!Q||!Array.isArray(Q)||Q.length===0){alert("No typography styles defined. Please add typography styles or extract from Figma first.");return}let e=document.getElementById("line-height-scale");if(!e)return;let t=[];if(Q.forEach(a=>{let i=String(a.lineHeight||"").trim();if(i==="auto")t.push("auto");else{let r=parseFloat(i.replace("%",""));isNaN(r)||t.push(r)}}),!t.length){alert("No valid line heights found in typography styles.");return}let o=t.includes("auto"),l=t.filter(a=>a!=="auto"),n=Array.from(new Set(l)).sort((a,i)=>a-i),s=o?["auto",...n]:n;e.value=s.join(", "),be(),e.focus(),e.setSelectionRange(e.value.length,e.value.length),console.log("Filled line height from typography:",s)}catch(e){console.error("Failed to fill line height from typography",e)}};let Wt=document.getElementById("typography-panel"),Co=document.getElementById("typography-panel-header"),Io=document.getElementById("typography-panel-toggle");Co&&Wt&&Io&&(Co.onclick=()=>{let e=Wt.classList.contains("collapsed");Wt.classList.toggle("collapsed");let t=Io.querySelector(".issue-group-toggle-icon");t&&(t.textContent="\u25B6")});let Ut=document.getElementById("settings-panel"),$o=document.getElementById("settings-panel-header"),St=document.getElementById("settings-panel-toggle");if($o&&Ut&&St){let e=()=>{let t=Ut.classList.contains("collapsed");Ut.classList.toggle("collapsed");let o=St.querySelector(".issue-group-toggle-icon");o&&(o.textContent="\u25B6")};$o.onclick=t=>{t.target===St||St.contains(t.target)||e()},St.onclick=t=>{t.stopPropagation(),e()}}function jt(){let e=document.getElementById("color-preview-panel"),t=document.getElementById("color-preview-panel-header"),o=document.getElementById("color-preview-panel-toggle");if(!e||!t||!o){console.log("Color preview panel elements not found, retrying..."),setTimeout(jt,100);return}console.log("Setting up color preview panel toggle");let l=()=>{let n=e.classList.contains("collapsed");e.classList.toggle("collapsed");let s=o.querySelector(".issue-group-toggle-icon");s&&(s.textContent="\u25B6"),console.log("Color preview panel toggled, isCollapsed:",!n)};t.onclick=n=>{n.preventDefault(),n.stopPropagation(),console.log("Color preview panel header clicked"),l()},o.onclick=n=>{n.preventDefault(),n.stopPropagation(),console.log("Color preview panel toggle button clicked"),l()}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",jt):jt();function qe(){let e=document.getElementById("color-scale"),t=document.getElementById("color-preview");if(!e||!t)return;let o=e.value.trim();if(t.innerHTML="",!o)return;let l=o.split(",").map(a=>a.trim()).filter(a=>a),n=1;l.forEach(a=>{let i=a.toUpperCase(),r=_[i];if(r&&/^No name \d+$/.test(r)){let p=parseInt(r.replace("No name ",""),10);p>=n&&(n=p+1)}});let s=1;l.forEach((a,i)=>{let r=/^#[0-9A-Fa-f]{3,8}$/.test(a),p=/^rgba?\(/.test(a);if(!r&&!p)return;let d=document.createElement("div");d.className="color-swatch-container";let y=document.createElement("div");y.className="color-swatch",y.style.background=a;let g=document.createElement("button");g.innerHTML="\xD7",g.className="color-swatch-close",g.onclick=function(U){var V;U.stopPropagation();let S=e.value.split(",").map(de=>de.trim()).filter(de=>de),L=(V=S[i])==null?void 0:V.toUpperCase(),M=S.filter((de,z)=>z!==i);e.value=M.join(", "),L&&_[L]&&delete _[L],qe(),typeof be=="function"&&be()};let f=a.toUpperCase(),v=_[f];if(!v){for(;Object.values(_).includes(`No name ${s}`);)s++;v=`No name ${s}`,_[f]=v,s++,typeof be=="function"&&be()}let h=document.createElement("div");h.className="color-swatch-label";let A=document.createElement("div");A.className="color-swatch-label-name",A.textContent=v,A.title="Click to edit name",A.style.cursor="pointer",A.onclick=function(U){U.stopPropagation();let S=document.createElement("input");S.type="text",S.value=v,S.className="color-swatch-name-input",S.style.cssText="width: 100%; font-size: 11px; padding: 2px 4px; border: 1px solid #3b82f6; border-radius: 4px; text-align: center; box-sizing: border-box;",A.style.display="none",A.parentNode.insertBefore(S,A),S.focus(),S.select();let L=()=>{let M=S.value.trim()||`No name ${s}`;_[f]=M,A.textContent=M,A.style.display="",S.remove(),typeof be=="function"&&be()};S.onblur=L,S.onkeydown=function(M){M.key==="Enter"?(M.preventDefault(),L()):M.key==="Escape"&&(A.style.display="",S.remove())}};let N=document.createElement("div");N.className="color-swatch-label-hex",N.textContent=f,h.appendChild(A),h.appendChild(N),y.appendChild(g),d.appendChild(y),d.appendChild(h),t.appendChild(d)})}function Rn(){var e,t,o,l,n,s;return{fontFamily:((e=document.getElementById("rule-font-family"))==null?void 0:e.checked)||!1,fontSize:((t=document.getElementById("rule-font-size"))==null?void 0:t.checked)||!1,fontWeight:((o=document.getElementById("rule-font-weight"))==null?void 0:o.checked)||!1,lineHeight:((l=document.getElementById("rule-line-height"))==null?void 0:l.checked)||!1,letterSpacing:((n=document.getElementById("rule-letter-spacing"))==null?void 0:n.checked)||!1,wordSpacing:((s=document.getElementById("rule-word-spacing"))==null?void 0:s.checked)||!1}}function Ge(){let e=document.getElementById("typography-table-body"),t=document.querySelector("#typography-table thead tr");if(!e||!t)return;let o=Rn(),l='<th class="typography-table-actions">Actions</th>';if(l+='<th class="typography-table-style-name" style="width: 120px;">Style Name</th>',o.fontFamily&&(l+='<th class="typography-table-font-family" style="width: 140px;">Font Family</th>'),o.fontSize&&(l+='<th class="typography-table-font-size" style="width: 80px;">Size (px)</th>'),o.fontWeight&&(l+='<th class="typography-table-font-weight" style="width: 100px;">Weight</th>'),o.lineHeight&&(l+='<th class="typography-table-line-height" style="width: 100px;">Line Height</th>'),o.letterSpacing&&(l+='<th class="typography-table-letter-spacing" style="width: 100px;">Letter Spacing</th>'),o.wordSpacing&&(l+='<th class="typography-table-word-spacing" style="width: 100px;">Word Spacing</th>'),t.innerHTML=l,Q.length===0){let n=Object.values(o).filter(s=>s).length+2;e.innerHTML=`
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
        </td>`),o.lineHeight&&(s+=`<td><input type="text" value="${u(n.lineHeight)}" data-field="lineHeight" placeholder="120% or auto"></td>`),o.letterSpacing&&(s+=`<td><input type="text" value="${u(n.letterSpacing||"0")}" data-field="letterSpacing" placeholder="0 or 0.5px"></td>`),o.wordSpacing&&(s+=`<td><input type="text" value="${u(n.wordSpacing||"0")}" data-field="wordSpacing" placeholder="0"></td>`),s+="</tr>",s}).join(""),e.querySelectorAll("input, select").forEach(n=>{n.addEventListener("change",s=>{let a=s.target.closest("tr"),i=parseInt(a.dataset.id),r=s.target.dataset.field,p=s.target.value;Dn(i,r,p)})})}window.addTypographyStyle=function(){let e={id:Qe++,name:"New Style",fontFamily:"Inter",fontSize:16,fontWeight:"Regular",lineHeight:"150%",letterSpacing:"0",wordSpacing:"0"};Q.push(e),Ge(),be()};function Dn(e,t,o){let l=Q.find(n=>n.id===e);l&&(t==="fontSize"?l[t]=parseInt(o)||16:l[t]=o,be())}window.deleteTypographyStyle=function(e){confirm("Delete this typography style?")&&(Q=Q.filter(t=>t.id!==e),X(),Ge(),be())},window.selectTypographyStyle=function(e){parent.postMessage({pluginMessage:{type:"select-text-style",styleId:e}},"*")};let Eo=document.getElementById("btn-add-typo-style");Eo&&(Eo.onclick=()=>addTypographyStyle());let Mo=document.getElementById("btn-extract-typo-desktop");Mo&&(Mo.onclick=()=>{parent.postMessage({pluginMessage:{type:"extract-typography-styles",mode:"desktop"}},"*")});let zo=document.getElementById("btn-extract-typo-tablet");zo&&(zo.onclick=()=>{parent.postMessage({pluginMessage:{type:"extract-typography-styles",mode:"tablet"}},"*")});let Fo=document.getElementById("btn-extract-typo-mobile");Fo&&(Fo.onclick=()=>{parent.postMessage({pluginMessage:{type:"extract-typography-styles",mode:"mobile"}},"*")});let To=document.getElementById("btn-extract-typo-all");To&&(To.onclick=()=>{parent.postMessage({pluginMessage:{type:"extract-typography-styles",mode:"all"}},"*")});let No=document.getElementById("btn-reset-typo-table");No&&(No.onclick=()=>{confirm(`\u26A0\uFE0F Reset typography table to default styles?

This will:
\u2022 Clear all current styles
\u2022 Restore default H1-H6 and Body styles

This action cannot be undone.`)&&(Q=[{id:1,name:"H1",fontFamily:"Inter",fontSize:48,fontWeight:"Bold",lineHeight:"120%",letterSpacing:"0",wordSpacing:"0"},{id:2,name:"H2",fontFamily:"Inter",fontSize:36,fontWeight:"Bold",lineHeight:"130%",letterSpacing:"0",wordSpacing:"0"},{id:3,name:"H3",fontFamily:"Inter",fontSize:30,fontWeight:"Semi Bold",lineHeight:"130%",letterSpacing:"0",wordSpacing:"0"},{id:4,name:"H4",fontFamily:"Inter",fontSize:24,fontWeight:"Semi Bold",lineHeight:"140%",letterSpacing:"0",wordSpacing:"0"},{id:5,name:"H5",fontFamily:"Inter",fontSize:20,fontWeight:"Semi Bold",lineHeight:"140%",letterSpacing:"0",wordSpacing:"0"},{id:6,name:"H6",fontFamily:"Inter",fontSize:16,fontWeight:"Semi Bold",lineHeight:"150%",letterSpacing:"0",wordSpacing:"0"},{id:7,name:"Body",fontFamily:"Inter",fontSize:14,fontWeight:"Regular",lineHeight:"150%",letterSpacing:"0",wordSpacing:"0"}],Qe=8,Ge(),be(),alert("\u2705 Typography table has been reset to default styles!"))}),Ge(),["rule-font-family","rule-font-size","rule-font-weight","rule-line-height","rule-letter-spacing","rule-word-spacing"].forEach(e=>{let t=document.getElementById(e);t&&t.addEventListener("change",()=>{Ge(),be()})});let Bo=document.getElementById("color-scale");Bo&&(Bo.addEventListener("input",()=>{qe()}),qe());let Wn=an({maxHistory:10,postPluginMessage:e=>parent.postMessage({pluginMessage:e},"*"),getCurrentReportData:()=>x,setIsViewingTokens:e=>{vt=!!e},renderResults:Ze,renderTokens:xt}),{saveScanHistory:Ao,requestScanHistory:Lo,renderScanHistory:Ot,restoreReportFromHistory:il,loadLastScanModeOnce:Un,setHistory:jn,clearLocalHistory:On}=Wn,Vn=document.getElementById("export-group"),Mt=document.getElementById("export-dropdown");j.onclick=e=>{e.stopPropagation(),Mt.style.display=Mt.style.display==="block"?"none":"block"},document.querySelectorAll(".export-option").forEach(e=>{e.onclick=t=>{t.stopPropagation();let o=e.getAttribute("data-format");sn({format:o,reportData:x,getTypeDisplayName:It,colorNameMap:_}),Mt.style.display="none"}}),document.addEventListener("click",e=>{Vn.contains(e.target)||(Mt.style.display="none")});let Ue,Be,we,pt;function zt(e){if(!e)return;let t=e.filter(i=>i.severity==="error"&&!i.ignored).length,o=e.filter(i=>i.severity==="warn"&&!i.ignored).length,l=e.filter(i=>!i.ignored).length,n=document.getElementById("filter-count-all"),s=document.getElementById("filter-count-error"),a=document.getElementById("filter-count-warn");n&&(n.textContent=l),s&&(s.textContent=t),a&&(a.textContent=o)}function Ft(){console.log("applyFilters called",{isViewingTokens:vt,hasTokens:!!x.tokens,hasIssues:!!x.issues,currentFilter:Le,currentSearch:ke,currentColorTypeFilter:Ve});let e=document.querySelector(".report-tab.active"),t=e?e.getAttribute("data-tab"):null;t==="animations"?(console.log("Applying search to animations"),typeof window.searchAnimations=="function"&&window.searchAnimations(ke)):t==="tokens"&&x.tokens?(console.log("Applying filters to tokens"),xt(x.tokens,!1,{skipTabSwitch:!0})):t==="issues"&&x.issues?(console.log("Applying filters to issues"),Ze(x.issues,!1,{skipTabSwitch:!0})):vt&&x.tokens?(console.log("Applying filters to tokens (fallback)"),xt(x.tokens,!1,{skipTabSwitch:!0})):x.issues&&(console.log("Applying filters to issues (fallback)"),Ze(x.issues,!1,{skipTabSwitch:!0}))}function Vt(){if(console.log("setupFilterHandlers called"),Ue=document.getElementById("search-input"),Be=document.getElementById("btn-clear-search"),we=document.querySelectorAll(".filter-btn"),pt=document.getElementById("color-type-select"),console.log("Elements found:",{searchInput:!!Ue,btnClearSearch:!!Be,filterButtons:we?we.length:0,colorTypeSelect:!!pt}),!Ue||!Be||!we||we.length===0){console.warn("Filter elements not found, retrying...",{searchInput:!!Ue,btnClearSearch:!!Be,filterButtons:we?we.length:0}),setTimeout(Vt,100);return}console.log("Setting up search input handler"),Ue.addEventListener("input",e=>{let t=e.target.value;console.log("Search input changed:",t),ke=t,console.log("currentSearch set to:",ke),Be&&(Be.style.display=ke.trim()?"block":"none"),Ft()}),Be&&(console.log("Setting up clear search button handler"),Be.onclick=e=>{console.log("Clear search clicked"),e.preventDefault(),e.stopPropagation(),Ue&&(Ue.value=""),ke="",Be.style.display="none",Ft()}),console.log("Setting up filter buttons handlers, count:",we.length),we.forEach((e,t)=>{console.log(`Setting up filter button ${t}:`,e.getAttribute("data-filter")),e.onclick=o=>{o.preventDefault(),o.stopPropagation();let l=e.getAttribute("data-filter"),n=e.classList.contains("active");console.log("Filter button clicked:",l,"isActive:",n),n&&l!=="all"?(e.classList.remove("active"),Le="all",we.forEach(s=>{s.getAttribute("data-filter")==="all"&&s.classList.add("active")})):(we.forEach(s=>s.classList.remove("active")),e.classList.add("active"),Le=l),console.log("currentFilter set to:",Le),Ft()}}),pt&&(console.log("Setting up color type select handler"),pt.addEventListener("change",e=>{console.log("Color type changed:",e.target.value),Ve=e.target.value,Ft()})),console.log("Filter handlers setup complete")}console.log("Setting up filter handlers, DOM readyState:",document.readyState),document.readyState==="loading"?(console.log("DOM still loading, waiting for DOMContentLoaded"),document.addEventListener("DOMContentLoaded",()=>{console.log("DOMContentLoaded fired, setting up handlers"),Vt(),Kt(),Qt(),Lo()})):(console.log("DOM already ready, setting up handlers immediately"),Vt(),Kt(),Qt(),Lo()),ce&&(w.onclick=()=>{console.log("Cancel operation clicked"),parent.postMessage({pluginMessage:{type:"cancel-scan"}},"*"),b.style.display="block",b.disabled=!1,C.style.display="block",C.disabled=!1,w.style.display="none",m.style.display="none"},ne.onclick=()=>{if(confirm(`\u26A0\uFE0F Are you sure you want to reset all settings to default and clear history?

This will:
\u2022 Reset all input values to default
\u2022 Clear scan history
\u2022 Clear current reports

This action cannot be undone.`)){document.getElementById("spacing-scale").value="0, 4, 8, 12, 16, 24, 32, 40, 48, 64, 72, 80, 88, 96",document.getElementById("spacing-threshold").value="100",document.getElementById("color-scale").value="",document.getElementById("font-size-scale").value="32, 24, 20, 18, 16, 14, 12",document.getElementById("font-size-threshold").value="100",document.getElementById("line-height-scale").value="auto, 100, 110, 120, 130, 140, 150, 160, 170",document.getElementById("line-height-threshold").value="300",document.getElementById("line-height-baseline-threshold").value="120",Q=[{id:1,name:"H1",fontFamily:"Inter",fontSize:48,fontWeight:"Bold",lineHeight:"120%",letterSpacing:"0",wordSpacing:"0"},{id:2,name:"H2",fontFamily:"Inter",fontSize:36,fontWeight:"Bold",lineHeight:"130%",letterSpacing:"0",wordSpacing:"0"},{id:3,name:"H3",fontFamily:"Inter",fontSize:30,fontWeight:"Semi Bold",lineHeight:"130%",letterSpacing:"0",wordSpacing:"0"},{id:4,name:"H4",fontFamily:"Inter",fontSize:24,fontWeight:"Semi Bold",lineHeight:"140%",letterSpacing:"0",wordSpacing:"0"},{id:5,name:"H5",fontFamily:"Inter",fontSize:20,fontWeight:"Semi Bold",lineHeight:"140%",letterSpacing:"0",wordSpacing:"0"},{id:6,name:"H6",fontFamily:"Inter",fontSize:16,fontWeight:"Semi Bold",lineHeight:"150%",letterSpacing:"0",wordSpacing:"0"},{id:7,name:"Body",fontFamily:"Inter",fontSize:14,fontWeight:"Regular",lineHeight:"150%",letterSpacing:"0",wordSpacing:"0"}],Qe=8,Ge(),document.getElementById("rule-typo-style").checked=!0,document.getElementById("rule-font-family").checked=!0,document.getElementById("rule-font-size").checked=!0,document.getElementById("rule-font-weight").checked=!0,document.getElementById("rule-line-height").checked=!0,document.getElementById("rule-letter-spacing").checked=!1,document.getElementById("rule-word-spacing").checked=!1,Ge(),qe(),x={issues:null,tokens:null,scanMode:null,timestamp:null,context:null,lastActiveTab:"issues"},Ct("issues"),Ct("tokens"),He("issues"),On(),parent.postMessage({pluginMessage:{type:"clear-history"}},"*");let e=document.getElementById("history-panel");e&&e.style.display!=="none"&&Ot(),be(),alert("\u2705 All settings have been reset to default and history has been cleared!")}},ce.onclick=()=>{let e=document.getElementById("history-panel");if(e){let t=e.style.display!=="none";e.style.display=t?"none":"flex",t||Ot()}}),K&&(K.onclick=()=>{let e=document.getElementById("history-panel");e&&(e.style.display="none")});let Ho=document.getElementById("btn-save-settings"),Pe=document.getElementById("save-settings-modal"),xe=document.getElementById("setting-name-input"),Tt=document.getElementById("btn-confirm-save-settings"),qo=document.getElementById("btn-cancel-save-settings"),Po=document.getElementById("btn-close-save-settings");Ho&&(Ho.onclick=()=>{parent.postMessage({pluginMessage:{type:"get-project-name"}},"*"),Pe&&(Pe.style.display="flex",xe&&(xe.value="",xe.focus(),xe.onkeydown=e=>{e.key==="Enter"&&(e.preventDefault(),Tt&&Tt.click())}))}),Po&&(Po.onclick=()=>{Pe&&(Pe.style.display="none")}),qo&&(qo.onclick=()=>{Pe&&(Pe.style.display="none")});let Ce=document.getElementById("replace-confirm-modal"),Ro=document.getElementById("replace-setting-name"),Do=document.getElementById("btn-confirm-replace"),Wo=document.getElementById("btn-cancel-replace"),Uo=document.getElementById("btn-close-replace-confirm"),Ie=null;function jo(e,t){parent.postMessage({pluginMessage:{type:"save-settings",name:e,values:t,forceReplace:!0}},"*")}Tt&&(Tt.onclick=()=>{var o,l,n,s,a,i,r,p,d,y,g,f,v,h,A,N;let e=(o=xe==null?void 0:xe.value)==null?void 0:o.trim();if(!e){alert("\u26A0\uFE0F Please enter a setting name");return}let t={spacingScale:((l=document.getElementById("spacing-scale"))==null?void 0:l.value)||"",spacingThreshold:((n=document.getElementById("spacing-threshold"))==null?void 0:n.value)||"100",colorScale:((s=document.getElementById("color-scale"))==null?void 0:s.value)||"",colorNameMap:_,ignoredIssues:ge,fontSizeScale:((a=document.getElementById("font-size-scale"))==null?void 0:a.value)||"",fontSizeThreshold:((i=document.getElementById("font-size-threshold"))==null?void 0:i.value)||"100",lineHeightScale:((r=document.getElementById("line-height-scale"))==null?void 0:r.value)||"",lineHeightThreshold:((p=document.getElementById("line-height-threshold"))==null?void 0:p.value)||"300",lineHeightBaselineThreshold:((d=document.getElementById("line-height-baseline-threshold"))==null?void 0:d.value)||"120",typographyStyles:Q,typographyRules:{checkStyle:((y=document.getElementById("rule-typo-style"))==null?void 0:y.checked)||!0,checkFontFamily:((g=document.getElementById("rule-font-family"))==null?void 0:g.checked)||!0,checkFontSize:((f=document.getElementById("rule-font-size"))==null?void 0:f.checked)||!0,checkFontWeight:((v=document.getElementById("rule-font-weight"))==null?void 0:v.checked)||!0,checkLineHeight:((h=document.getElementById("rule-line-height"))==null?void 0:h.checked)||!0,checkLetterSpacing:((A=document.getElementById("rule-letter-spacing"))==null?void 0:A.checked)||!1,checkWordSpacing:((N=document.getElementById("rule-word-spacing"))==null?void 0:N.checked)||!1}};Ie={name:e,values:t},parent.postMessage({pluginMessage:{type:"check-setting-name",name:e}},"*")}),Do&&(Do.onclick=()=>{Ie&&(jo(Ie.name,Ie.values),Ie=null),Ce&&(Ce.style.display="none")}),Wo&&(Wo.onclick=()=>{Ie=null,Ce&&(Ce.style.display="none"),xe&&(xe.focus(),xe.select())}),Uo&&(Uo.onclick=()=>{Ie=null,Ce&&(Ce.style.display="none"),xe&&(xe.focus(),xe.select())}),Ce&&(Ce.onclick=e=>{e.target===Ce&&(Ie=null,Ce.style.display="none",xe&&(xe.focus(),xe.select()))});let Oo=document.getElementById("btn-load-settings"),Re=document.getElementById("load-settings-modal"),kt=document.getElementById("settings-list"),Gt=document.getElementById("settings-empty-state"),Vo=document.getElementById("btn-close-load-settings");function Go(e){if(!(!kt||!Gt)){if(!e||e.length===0){kt.innerHTML="",Gt.style.display="block";return}Gt.style.display="none",kt.innerHTML=e.map(t=>{let o=new Date(t.updatedAt||t.createdAt),l=o.toLocaleDateString()+" "+o.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});return`
        <div class="settings-item" data-setting-name="${u(t.name)}">
          <div class="settings-item-info">
            <div class="settings-item-name">${u(t.name)}</div>
            <div class="settings-item-date">Updated: ${l}</div>
          </div>
          <div class="settings-item-actions">
            <button class="btn-remove-setting" data-setting-name="${u(t.name)}" title="Remove">\u{1F5D1}\uFE0F</button>
          </div>
        </div>
      `}).join(""),kt.querySelectorAll(".settings-item").forEach(t=>{let o=t.getAttribute("data-setting-name");t.onclick=l=>{l.target.closest(".btn-remove-setting")||(parent.postMessage({pluginMessage:{type:"load-settings",name:o}},"*"),Re&&(Re.style.display="none"))}}),kt.querySelectorAll(".btn-remove-setting").forEach(t=>{t.onclick=o=>{o.stopPropagation();let l=t.getAttribute("data-setting-name");confirm(`\u26A0\uFE0F Are you sure you want to remove "${l}"?`)&&parent.postMessage({pluginMessage:{type:"remove-settings",name:l}},"*")}})}}Oo&&(Oo.onclick=()=>{parent.postMessage({pluginMessage:{type:"get-saved-settings"}},"*"),Re&&(Re.style.display="flex")}),Vo&&(Vo.onclick=()=>{Re&&(Re.style.display="none")});let _o=document.getElementById("btn-export-settings");_o&&(_o.onclick=()=>{var s,a,i,r,p,d,y,g,f,v,h,A,N,U,S;let e=((s=document.getElementById("color-scale"))==null?void 0:s.value)||"",t=e.split(",").map(L=>L.trim().toUpperCase()).filter(L=>L&&L.startsWith("#")),o=Xe({},_),l=1;Object.values(o).forEach(L=>{if(L&&/^No name \d+$/.test(L)){let M=parseInt(L.replace("No name ",""),10);M>=l&&(l=M+1)}}),t.forEach(L=>{o[L]||(o[L]=`No name ${l}`,l++)});let n={spacingScale:((a=document.getElementById("spacing-scale"))==null?void 0:a.value)||"",spacingThreshold:((i=document.getElementById("spacing-threshold"))==null?void 0:i.value)||"100",colorScale:e,colorNameMap:o,ignoredIssues:ge,fontSizeScale:((r=document.getElementById("font-size-scale"))==null?void 0:r.value)||"",fontSizeThreshold:((p=document.getElementById("font-size-threshold"))==null?void 0:p.value)||"100",lineHeightScale:((d=document.getElementById("line-height-scale"))==null?void 0:d.value)||"",lineHeightThreshold:((y=document.getElementById("line-height-threshold"))==null?void 0:y.value)||"300",lineHeightBaselineThreshold:((g=document.getElementById("line-height-baseline-threshold"))==null?void 0:g.value)||"120",typographyStyles:Q,typographyRules:{checkStyle:((f=document.getElementById("rule-typo-style"))==null?void 0:f.checked)||!0,checkFontFamily:((v=document.getElementById("rule-font-family"))==null?void 0:v.checked)||!0,checkFontSize:((h=document.getElementById("rule-font-size"))==null?void 0:h.checked)||!0,checkFontWeight:((A=document.getElementById("rule-font-weight"))==null?void 0:A.checked)||!0,checkLineHeight:((N=document.getElementById("rule-line-height"))==null?void 0:N.checked)||!0,checkLetterSpacing:((U=document.getElementById("rule-letter-spacing"))==null?void 0:U.checked)||!1,checkWordSpacing:((S=document.getElementById("rule-word-spacing"))==null?void 0:S.checked)||!1}};parent.postMessage({pluginMessage:{type:"get-project-name"}},"*"),window.pendingExportValues=n});let Jo=document.getElementById("btn-import-settings"),ut=document.getElementById("import-settings-modal"),_e=document.getElementById("import-settings-file-input"),Yo=document.getElementById("btn-select-import-file"),Je=document.getElementById("import-file-info"),Xo=document.getElementById("import-file-name"),De=document.getElementById("btn-confirm-import"),_t=document.getElementById("btn-cancel-import"),Jt=document.getElementById("btn-close-import-settings"),gt=null,Se=null;if(Jo&&(Jo.onclick=()=>{gt=null,Se=null,_e&&(_e.value=""),Je&&(Je.style.display="none"),De&&(De.disabled=!0),ut&&(ut.style.display="flex")}),Yo&&_e&&(Yo.onclick=()=>{_e.click()}),_e&&(_e.onchange=e=>{let t=e.target.files[0];if(!t)return;if(!t.name.endsWith(".json")){alert("\u26A0\uFE0F Please select a JSON file");return}gt=t,Xo&&(Xo.textContent=t.name),Je&&(Je.style.display="block"),De&&(De.disabled=!1);let o=new FileReader;o.onload=l=>{try{Se=JSON.parse(l.target.result),console.log("Imported settings data:",Se)}catch(n){alert("\u274C Error parsing JSON file: "+n.message),gt=null,Se=null,Je&&(Je.style.display="none"),De&&(De.disabled=!0)}},o.onerror=()=>{alert("\u274C Error reading file"),gt=null,Se=null},o.readAsText(t)}),De&&(De.onclick=()=>{if(!Se){alert("\u274C No file data to import");return}console.log("Import file data:",Se);let e=null;if(Array.isArray(Se)){if(Se.length===0){alert("\u274C No settings found in file");return}if(e=Se[0].values,!e){alert("\u274C Invalid settings format. No values found in setting object.");return}}else if(Se.values)e=Se.values;else if(Se.spacingScale!==void 0||Se.colorScale!==void 0)e=Se;else{alert("\u274C Invalid settings file format. Expected an array of settings, a single setting object, or a values object."),console.error("Invalid import data structure:",Se);return}if(!e||typeof e!="object"){alert("\u274C Invalid settings format. No values found.");return}console.log("Applying values:",e),qt(e),be(),ut&&(ut.style.display="none"),gt=null,Se=null,_e&&(_e.value=""),Je&&(Je.style.display="none"),De&&(De.disabled=!0),alert("\u2705 Settings imported and applied to input fields successfully")}),_t||Jt){let e=()=>{ut&&(ut.style.display="none"),gt=null,Se=null,_e&&(_e.value=""),Je&&(Je.style.display="none"),De&&(De.disabled=!0)};_t&&(_t.onclick=e),Jt&&(Jt.onclick=e)}Pe&&(Pe.onclick=e=>{e.target===Pe&&(Pe.style.display="none")}),Re&&(Re.onclick=e=>{e.target===Re&&(Re.style.display="none")}),ee.onclick=()=>{parent.postMessage({pluginMessage:{type:"close"}},"*")},window.onmessage=e=>{var o,l;console.log("Received message:",e.data);let t=e.data.pluginMessage;if(t&&t.type==="fix-issue-result"){if(console.log("[fix-issue-result] Received:",{issueId:t.issueId,success:t.success,message:t.message}),ye(t.issueId,t.message,t.success),!t.success){console.log("[fix-issue-result] Error detected, showing error modal...");let n=t.message||"An error occurred while fixing the issue.";console.log("[fix-issue-result] Error message:",n);try{Yt(n),console.log("[fix-issue-result] Error modal should be displayed")}catch(s){console.error("[fix-issue-result] Error showing error modal:",s),alert("Error: "+n)}}if(t.success){if(console.log("[fix-issue-result] Starting remove process for issueId:",t.issueId),console.log("[fix-issue-result] issueId type:",typeof t.issueId,"value:",t.issueId),x&&x.issues){let d=x.issues.length;x.issues=x.issues.filter(g=>String(g.id)!==String(t.issueId));let y=d-x.issues.length;console.log("[fix-issue-result] Removed",y,"issue(s) from data. Remaining issues:",x.issues.length)}let n=`.issue[data-issue-id="${t.issueId}"]`;console.log("[fix-issue-result] Trying selector1:",n);let s=document.querySelectorAll(n);console.log("[fix-issue-result] Found",s.length,"issue element(s) with this ID");let a=`button.btn-fix[data-id="${t.issueId}"]`,i=`button.btn-suggest-fix[data-id="${t.issueId}"]`;[...document.querySelectorAll(a),...document.querySelectorAll(i)].forEach(d=>{let y=d.closest(".issue");y&&!Array.from(s).includes(y)&&s.push(y)});let p=Array.from(new Set(Array.from(s)));if(console.log("[fix-issue-result] Total unique issue elements to remove:",p.length),p.length>0){let d=new Map;p.forEach((y,g)=>{console.log(`[fix-issue-result] Issue element ${g}:`,y),console.log(`[fix-issue-result] Issue element ${g} data-issue-id:`,y.getAttribute("data-issue-id")),console.log(`[fix-issue-result] Issue element ${g} data-issue-type:`,y.getAttribute("data-issue-type"));let f=y.closest(".issue-group");if(f){let v=f.getAttribute("data-issue-type");if(!d.has(v)){let A=f.querySelector(".badge");if(A){let N=parseInt(A.textContent)||0;d.set(v,{groupEl:f,badge:A,currentCount:N,removeCount:0})}}let h=d.get(v);h&&h.removeCount++}}),p.forEach((y,g)=>{y.style.transition="opacity 0.3s ease-out",y.style.opacity="0",setTimeout(()=>{y.parentNode&&(console.log(`[fix-issue-result] Removing element ${g} from DOM...`),y.remove())},300)}),setTimeout(()=>{let y=document.querySelectorAll(n);console.log("[fix-issue-result] After remove, remaining elements:",y.length),d.forEach((g,f)=>{let v=Math.max(0,g.currentCount-g.removeCount);g.badge.textContent=v,console.log(`[fix-issue-result] Updated badge for group "${f}" from ${g.currentCount} to ${v}`),v===0&&(g.groupEl.style.display="none",console.log(`[fix-issue-result] Hiding group "${f}" (no issues left)`))}),console.log("[fix-issue-result] Calling updateIssueCounts()..."),dt(),console.log("[fix-issue-result] updateIssueCounts() completed"),console.log("[fix-issue-result] Re-rendering issues to sync UI..."),x&&x.issues&&Ze(x.issues,!1)},350)}else console.log("[fix-issue-result] No issue elements found! Trying to update counts anyway..."),dt(),x&&x.issues&&Ze(x.issues,!1)}return}if(t&&t.type==="create-text-style-result"){ye(t.issueId,t.message,t.success),t.success&&setTimeout(()=>{var s;let n=document.querySelector(`.issue[data-issue-id="${t.issueId}"]`)||((s=document.querySelector(`button.btn-create-style[data-id="${t.issueId}"]`))==null?void 0:s.closest(".issue"));n&&(n.style.transition="opacity 0.5s ease-out",n.style.opacity="0",setTimeout(()=>{if(n.parentNode){n.remove();let a=n.closest(".issue-group");if(a){let i=a.querySelector(".badge");if(i){let r=parseInt(i.textContent)||0,p=Math.max(0,r-1);i.textContent=p,p===0&&(a.style.display="none")}}}},500))},5e3);return}if(t&&t.type==="components-for-issue-loaded"){console.log("=== [components-for-issue-loaded] HANDLER CALLED ==="),console.log("[components-for-issue-loaded] Received message",t);let n=window.pendingComponentIssue;if(console.log("[components-for-issue-loaded] Pending issue:",n,"Message issueId:",t.issueId),console.log("[components-for-issue-loaded] Similar components:",t.similarComponents),n){let s=document.querySelector(`.issue[data-issue-id="${n.id}"]`);if(s){let a=s.querySelector("button.btn-suggest-fix");a&&(a.disabled=!1,a.style.opacity="1",a.style.cursor="pointer",a.dataset.originalText&&(a.textContent=a.dataset.originalText,delete a.dataset.originalText))}}if(t.similarComponents&&t.similarComponents.length>0){console.log("[components-for-issue-loaded] Showing suggest modal with",t.similarComponents.length,"similar components");let s=n||{id:t.issueId,nodeName:"Unnamed"};try{In(s,t.similarComponents),console.log("[components-for-issue-loaded] Modal function called successfully")}catch(a){console.error("[components-for-issue-loaded] Error showing modal:",a),alert("Error showing component suggestion modal: "+a.message)}window.pendingComponentIssue=null;return}else{console.warn("[components-for-issue-loaded] No similar components found"),alert("No similar components found. Please use 'Select Component' to choose from all components or 'Create New Component' to create a new one."),window.pendingComponentIssue=null;return}}if(t&&t.type==="all-components-loaded"){console.log("=== [all-components-loaded] HANDLER CALLED ==="),console.log("[all-components-loaded] Received message",t);let n=window.pendingSelectComponentIssue;if(console.log("[all-components-loaded] Pending issue:",n),console.log("[all-components-loaded] Message issueId:",t.issueId,typeof t.issueId),console.log("[all-components-loaded] Pending issueId:",n==null?void 0:n.id,typeof(n==null?void 0:n.id)),console.log("[all-components-loaded] Components:",t.components),console.log("[all-components-loaded] Components length:",t.components?t.components.length:0),n){let s=document.querySelector(`.issue[data-issue-id="${n.id}"]`);if(s){let a=s.querySelector("button.btn-select-component");a&&(a.disabled=!1,a.style.opacity="1",a.style.cursor="pointer",a.dataset.originalText&&(a.textContent=a.dataset.originalText,delete a.dataset.originalText))}}if(t.components&&t.components.length>0){console.log("[all-components-loaded] \u2713 Showing select modal with",t.components.length,"components");let s=n||{id:t.issueId,nodeName:"Unnamed"};console.log("[all-components-loaded] Issue to use:",s),console.log("[all-components-loaded] Calling showComponentSelectModal...");try{$n(s,t.components),console.log("[all-components-loaded] \u2713 Modal function called successfully")}catch(a){console.error("[all-components-loaded] \u2717 Error showing modal:",a),console.error("[all-components-loaded] Error stack:",a.stack),alert("Error showing component selection modal: "+a.message)}window.pendingSelectComponentIssue=null;return}else{console.warn("[all-components-loaded] \u2717 No components available"),alert("No components found. Please use 'Create New Component' to create a new one."),window.pendingSelectComponentIssue=null;return}}if(t&&t.type==="figma-text-styles-loaded"){let n=window.pendingSuggestTextSizeIssue;if(n&&n.id===t.issueId){let p=n.fontSize||12,d=(t.styles||[]).filter(f=>f.fontSize>=14);if(d.length===0){let f=nt(n);f?Et(n,p,f,null,null):alert("No suitable text size match found (need >= 14px for ADA compliance). Please add font sizes to Font Size input or create text styles in Figma."),window.pendingSuggestTextSizeIssue=null;return}let y=null,g=1/0;d.forEach(f=>{let v=Math.abs(f.fontSize-p);v<g&&(g=v,y=f)}),y?Et(n,p,y.fontSize,null,y):alert("No suitable text style found (need >= 14px for ADA compliance)"),window.pendingSuggestTextSizeIssue=null;return}let s=window.pendingTextSizeIssue;if(s&&s.id===t.issueId){Mn(s,t.styles||[]),window.pendingTextSizeIssue=null;return}let a=window.pendingTypographyStyleIssue;if(a&&a.id===t.issueId){if(t.error||!t.styles||t.styles.length===0){let p=document.querySelector(`.issue[data-issue-id="${t.issueId}"]`);if(p){let d=p.querySelector("button.btn-fix"),y=p.querySelector("button.btn-suggest-fix");d&&(d.style.display="none"),y&&(y.style.display="none")}window.pendingTypographyStyleIssue=null;return}uo(a,t.styles||[]),window.pendingTypographyStyleIssue=null;return}let i=window.pendingTypographyCheckIssue;if(i&&i.id===t.issueId){if(t.error||!t.styles||t.styles.length===0){let p=document.querySelector(`.issue[data-issue-id="${t.issueId}"]`);if(p){let d=p.querySelector("button.btn-style-dropdown"),y=p.querySelector("button.btn-suggest-fix");d&&(d.style.display="none"),y&&(y.style.display="none")}window.pendingTypographyCheckIssue=null;return}uo(i,t.styles||[]),window.pendingTypographyCheckIssue=null;return}let r=document.querySelector(`.style-dropdown-menu[data-issue-id="${t.issueId}"]`);if(r){let p=r.closest(".issue"),d=p?p.getAttribute("data-issue-id"):null,y=p?p.getAttribute("data-issue-type"):null;if(t.error){r.innerHTML=`<div style="padding: 8px 12px; color: #ef4444; font-size: 12px;">Error: ${u(t.error)}</div>`;let g=p?p.querySelector("button.btn-style-dropdown"):null;g&&(g.style.display="none");let f=p?p.querySelector("button.btn-suggest-fix"):null;f&&(y==="typography-style"||y==="typography-check")&&(f.style.display="none")}else if(t.styles&&t.styles.length>0){let g=null;if(d&&x&&x.issues){let f=x.issues.find(v=>v.id===d);f&&f.bestMatch&&(g=f.bestMatch.name)}r.innerHTML=t.styles.map(f=>`
            <div class="style-dropdown-item" data-issue-id="${t.issueId}" data-style-id="${f.id}" data-style-name="${u(f.name)}" style="padding: 8px 12px; cursor: pointer; font-size: 12px; ${g===f.name?"background: #e3f2fd; font-weight: 600;":""}" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='${g===f.name?"#e3f2fd":"white"}'">
              ${u(f.name)} ${g===f.name?"\u2B50":""}
            </div>
          `).join(""),r.querySelectorAll(".style-dropdown-item").forEach(f=>{f.onclick=v=>{v.preventDefault(),v.stopPropagation();try{let N=f.getAttribute("data-issue-id");N&&parent.postMessage({pluginMessage:{type:"select-node",id:N}},"*")}catch(N){console.error("Failed to auto-select node for style dropdown item:",N)}let h=f.getAttribute("data-style-id"),A=f.getAttribute("data-style-name");if(p&&x&&x.issues){let N=x.issues.find(U=>U.id===d);if(N){let U=t.styles.find(S=>S.id===h);U&&(r.style.display="none",xo(N,U))}}}})}else{r.innerHTML='<div style="padding: 8px 12px; color: #999; font-size: 12px;">No text styles found in Figma</div>';let g=p?p.querySelector("button.btn-style-dropdown"):null;g&&(g.style.display="none");let f=p?p.querySelector("button.btn-suggest-fix"):null;f&&(y==="typography-style"||y==="typography-check")&&(f.style.display="none")}}return}if(t&&t.type==="contrast-colors-loaded"){let n=window.pendingContrastIssue;n&&n.id===t.issueId&&(zn(n,t.colors||[]),window.pendingContrastIssue=null);return}if(t&&t.type==="apply-typography-style-result"){if(ye(t.issueId,t.message,t.success),t.success||Yt(t.message||"An error occurred while applying the style."),t.success){if(console.log("[apply-typography-style-result] Starting remove process for issueId:",t.issueId),console.log("[apply-typography-style-result] issueId type:",typeof t.issueId,"value:",t.issueId),x&&x.issues){let y=x.issues.length;x.issues=x.issues.filter(f=>String(f.id)!==String(t.issueId));let g=y-x.issues.length;console.log("[apply-typography-style-result] Removed",g,"issue(s) from data. Remaining issues:",x.issues.length)}let n=`.issue[data-issue-id="${t.issueId}"]`;console.log("[apply-typography-style-result] Trying selector1:",n);let s=document.querySelectorAll(n);console.log("[apply-typography-style-result] Found",s.length,"issue element(s) with this ID");let a=`button.btn-suggest-apply[data-id="${t.issueId}"]`,i=`button.btn-fix[data-id="${t.issueId}"]`,r=`button.btn-suggest-fix[data-id="${t.issueId}"]`;[...document.querySelectorAll(a),...document.querySelectorAll(i),...document.querySelectorAll(r)].forEach(y=>{let g=y.closest(".issue");g&&!Array.from(s).includes(g)&&s.push(g)});let d=Array.from(new Set(Array.from(s)));if(console.log("[apply-typography-style-result] Total unique issue elements to remove:",d.length),d.length>0){let y=new Map;d.forEach((g,f)=>{console.log(`[apply-typography-style-result] Issue element ${f}:`,g),console.log(`[apply-typography-style-result] Issue element ${f} data-issue-id:`,g.getAttribute("data-issue-id")),console.log(`[apply-typography-style-result] Issue element ${f} data-issue-type:`,g.getAttribute("data-issue-type"));let v=g.closest(".issue-group");if(v){let h=v.getAttribute("data-issue-type");if(!y.has(h)){let N=v.querySelector(".badge");if(N){let U=parseInt(N.textContent)||0;y.set(h,{groupEl:v,badge:N,currentCount:U,removeCount:0})}}let A=y.get(h);A&&A.removeCount++}}),d.forEach((g,f)=>{g.style.transition="opacity 0.3s ease-out",g.style.opacity="0",setTimeout(()=>{g.parentNode&&(console.log(`[apply-typography-style-result] Removing element ${f} from DOM...`),g.remove())},300)}),setTimeout(()=>{let g=document.querySelectorAll(n);console.log("[apply-typography-style-result] After remove, remaining elements:",g.length),y.forEach((f,v)=>{let h=Math.max(0,f.currentCount-f.removeCount);f.badge.textContent=h,console.log(`[apply-typography-style-result] Updated badge for group "${v}" from ${f.currentCount} to ${h}`),h===0&&(f.groupEl.style.display="none",console.log(`[apply-typography-style-result] Hiding group "${v}" (no issues left)`))}),console.log("[apply-typography-style-result] Calling updateIssueCounts()..."),dt(),console.log("[apply-typography-style-result] updateIssueCounts() completed"),console.log("[apply-typography-style-result] Re-rendering issues to sync UI..."),x&&x.issues&&Ze(x.issues,!1)},350)}else console.log("[apply-typography-style-result] No issue elements found! Trying to update counts anyway..."),dt(),x&&x.issues&&Ze(x.issues,!1)}return}if(t&&t.type==="scan-progress"){k&&$&&(k.style.width=t.progress+"%",$.textContent=t.progress+"% ("+t.current+"/"+t.total+")");return}if(t&&t.type==="node-count-result"){let n=t.count||0,s=t.mode||"page";n>Oe?confirm(`\u26A0\uFE0F Large Design Warning

This ${s==="page"?"page":"selection"} contains ${n.toLocaleString()} nodes.

Scanning large designs may take a while and could slow down Figma.

Do you want to continue?`)&&ve?ko(ve.scope):(b&&(b.disabled=!1,b.textContent="Scan Issues"),m&&(m.style.display="none")):ve&&ko(ve.scope),ve=null;return}if(t&&t.type==="last-report"){t.report?cn(t.report):console.log("No last report stored");return}if(t&&t.type==="history-data"){jn(t.history),Un();let n=document.getElementById("history-panel");n&&n.style.display!=="none"&&Ot();return}if(t&&t.type==="input-values-data"){t.values?(qt(t.values),console.log("Restored input values:",t.values)):console.log("No saved input values to restore");return}if(t&&t.type==="project-name"){let n=t.name||"settings";if(window.pendingExportValues){let s=window.pendingExportValues;window.pendingExportValues=null;let a={name:n,values:s,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},i=JSON.stringify([a],null,2),r=new Blob([i],{type:"application/json"}),p=URL.createObjectURL(r),d=document.createElement("a");d.href=p;let y=n.replace(/[^a-z0-9]/gi,"_").toLowerCase();d.download=`${y}-settings.json`,document.body.appendChild(d),d.click(),document.body.removeChild(d),URL.revokeObjectURL(p),console.log("\u2705 Settings exported successfully");return}xe&&(xe.value=n);return}if(t&&t.type==="check-setting-name-result"){t.exists?(Ro&&Ie&&(Ro.textContent=t.name||Ie.name),Ce&&(Ce.style.display="flex")):Ie&&(jo(Ie.name,Ie.values),Ie=null);return}if(t&&t.type==="save-settings-result"){t.success?(Ce&&(Ce.style.display="none"),Pe&&(Pe.style.display="none"),xe&&(xe.value=""),Ie=null,Re&&Re.style.display!=="none"&&parent.postMessage({pluginMessage:{type:"get-saved-settings"}},"*")):(alert("\u274C Failed to save settings: "+(t.error||"Unknown error")),Ce&&(Ce.style.display="none"),Ie=null);return}if(t&&t.type==="saved-settings-list"){Go(t.settings||[]);return}if(t&&t.type==="project-name"){let n=t.name||"settings";if(window.pendingExportValues){let s=window.pendingExportValues;window.pendingExportValues=null;let a={name:n,values:s,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},i=JSON.stringify([a],null,2),r=new Blob([i],{type:"application/json"}),p=URL.createObjectURL(r),d=document.createElement("a");d.href=p;let y=n.replace(/[^a-z0-9]/gi,"_").toLowerCase();d.download=`${y}-settings.json`,document.body.appendChild(d),d.click(),document.body.removeChild(d),URL.revokeObjectURL(p),console.log("\u2705 Settings exported successfully")}return}if(t&&t.type==="load-settings-result"){t.success&&t.values?(qt(t.values),be()):alert("\u274C Failed to load settings: "+(t.error||"Unknown error"));return}if(t&&t.type==="remove-settings-result"){t.success?Go(t.settings||[]):alert("\u274C Failed to remove settings: "+(t.error||"Unknown error"));return}if(t&&t.type==="report"){b.style.display="block",b.disabled=!1,w.style.display="none",m.style.display="none",C.disabled=!1;let n=t.issues||[];x.context=t.context||null,Ze(n);let s=((o=document.querySelector('input[name="scope"]:checked'))==null?void 0:o.value)||"page";Ao(s,"issues",{issues:n},t.context||null)}if(t&&t.type==="tokens-report")if(C.style.display="block",C.disabled=!1,w.style.display="none",m.style.display="none",b.disabled=!1,t.error)me.innerHTML=`<div class="error-message">Error: ${u(t.error)}</div>`,He("tokens");else{x.context=t.context||null,xt(t.tokens),q.disabled=!(t.tokens&&Array.isArray(t.tokens.spacing)&&t.tokens.spacing.length>0),O.disabled=!(t.tokens&&Array.isArray(t.tokens.colors)&&t.tokens.colors.length>0),T.disabled=!(t.tokens&&Array.isArray(t.tokens.fontSize)&&t.tokens.fontSize.length>0),R.disabled=!(t.tokens&&Array.isArray(t.tokens.lineHeight)&&t.tokens.lineHeight.length>0);let n=((l=document.querySelector('input[name="scope"]:checked'))==null?void 0:l.value)||"page";Ao(n,"tokens",{tokens:t.tokens},t.context||null)}if(t&&t.type==="typography-styles-extracted")if(t.styles&&Array.isArray(t.styles)&&t.styles.length>0){let n=t.mode==="desktop"?"Desktop":t.mode==="tablet"?"Tablet":t.mode==="mobile"?"Mobile":"All";Q=t.styles.map((s,a)=>({id:a+1,name:s.name,styleId:s.styleId,fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing||"0",wordSpacing:s.wordSpacing||"0"})),Qe=Q.length+1,X(),Ge(),be(),alert(`\u2705 Successfully imported ${t.styles.length} ${n} typography styles from Figma!

Styles: ${t.styles.map(s=>s.name).join(", ")}`)}else{let n=t.mode==="desktop"?"Desktop":t.mode==="tablet"?"Tablet":t.mode==="mobile"?"Mobile":"";alert(`\u26A0\uFE0F No ${n.toLowerCase()} text styles found in this Figma file.

Make sure you have defined text styles in your design system.`)}if(t&&t.type==="color-styles-extracted")if(t.colors&&Array.isArray(t.colors)&&t.colors.length>0){let n=document.getElementById("color-scale");if(!n)return;let a=Array.from(new Set(t.colors.map(i=>i.hex))).sort((i,r)=>st(i)-st(r));_={},t.colors.forEach(i=>{i.hex&&i.name&&(_[i.hex.toUpperCase()]=i.name)}),n.value=a.join(", "),typeof qe=="function"&&qe(),be();try{n.focus(),n.setSelectionRange(n.value.length,n.value.length)}catch(i){}alert(`\u2705 Successfully imported ${t.colors.length} color styles from Figma!

Colors: ${t.colors.map(i=>i.name+" ("+i.hex+")").join(", ")}`)}else alert(`\u26A0\uFE0F No color styles found in this Figma file.

Make sure you have defined color styles (paint styles) in your design system.`);if(t&&t.type==="color-variables-extracted")if(t.colors&&Array.isArray(t.colors)&&t.colors.length>0){let n=document.getElementById("color-scale");if(!n)return;let a=Array.from(new Set(t.colors.map(i=>i.hex))).sort((i,r)=>st(i)-st(r));_={},t.colors.forEach(i=>{i.hex&&i.name&&(_[i.hex.toUpperCase()]=i.name)}),n.value=a.join(", "),typeof qe=="function"&&qe(),be();try{n.focus(),n.setSelectionRange(n.value.length,n.value.length)}catch(i){}alert(`\u2705 Successfully imported ${t.colors.length} color variables from Figma!

Colors: ${t.colors.map(i=>i.name+" ("+i.hex+")").join(", ")}`)}else alert(`\u26A0\uFE0F No color variables found in this Figma file.

Make sure you have defined color variables in your design system.`)}})();})();
