(()=>{var ys=Object.defineProperty,hs=Object.defineProperties;var bs=Object.getOwnPropertyDescriptors;var gn=Object.getOwnPropertySymbols;var vs=Object.prototype.hasOwnProperty,xs=Object.prototype.propertyIsEnumerable;var mn=(w,T,b)=>T in w?ys(w,T,{enumerable:!0,configurable:!0,writable:!0,value:b}):w[T]=b,We=(w,T)=>{for(var b in T||(T={}))vs.call(T,b)&&mn(w,b,T[b]);if(gn)for(var b of gn(T))xs.call(T,b)&&mn(w,b,T[b]);return w},Ye=(w,T)=>hs(w,bs(T));function fn(){function w(T){try{let b=T.target&&T.target.closest?T.target.closest("button"):null;if(!b)return;let I=b.closest?b.closest(".issue"):null;if(!I||!(b.closest&&b.closest(".issue-actions")))return;let z=b.getAttribute("data-id")||I.getAttribute("data-issue-id");if(!z)return;parent.postMessage({pluginMessage:{type:"select-node",id:z}},"*")}catch(b){console.error("autoSelectNodeFromIssueClick error:",b)}}document.addEventListener("click",w,!0)}function ae(w,T,b){if(!T)return;let I=document.querySelector(`.issue[data-issue-id="${w}"]`);if(!I){let Y=document.querySelector(`button.btn-fix[data-id="${w}"]`);Y&&(I=Y.closest(".issue"))}if(!I)return;let A=I.querySelector(".fix-message");A&&A.remove();let z=document.createElement("div");z.className="fix-message",z.style.cssText=`
      margin-top: 8px;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      background: ${b?"#d4edda":"#f8d7da"};
      color: ${b?"#155724":"#721c24"};
      border: 1px solid ${b?"#c3e6cb":"#f5c6cb"};
      animation: slideIn 0.3s ease-out;
    `,z.textContent=T;let D=I.querySelector(".issue-header");D?D.parentNode.insertBefore(z,D.nextSibling):I.appendChild(z),setTimeout(()=>{z.style.animation="slideOut 0.3s ease-out",setTimeout(()=>{z.parentNode&&z.remove()},300)},5e3)}function p(w){return w==null?"":String(w).replace(/[&<>"']/g,function(b){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[b]})}function qt(w){console.log("[showErrorModal] Called with message:",w);let T=document.getElementById("error-modal-overlay");T&&(console.log("[showErrorModal] Removing existing modal"),T.remove());let b=document.createElement("div");b.className="modal-overlay",b.id="error-modal-overlay",console.log("[showErrorModal] Created overlay element");let I=document.createElement("div");I.className="modal-dialog",I.style.maxWidth="450px";let A=String(w||"").replace(/^[❌⚠️✅]\s*/,"").trim();I.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title" style="color: #dc3545;">\u26A0\uFE0F Error</h2>
      </div>
      <div class="modal-body">
        <div style="padding: 16px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; margin-bottom: 16px;">
          <div style="font-size: 14px; color: #721c24; line-height: 1.6;">
            ${p(A)}
          </div>
        </div>
        <div style="font-size: 12px; color: #666; line-height: 1.5;">
          Please check the issue and try again. If the problem persists, you may need to switch to Design Mode or edit the main component directly.
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-primary" id="error-modal-ok-btn" style="background: #dc3545; border-color: #dc3545; color: white;">OK</button>
      </div>
    `,b.appendChild(I),document.body.appendChild(b),console.log("[showErrorModal] Appended overlay to body, overlay visible:",b.offsetParent!==null),b.style.display="flex",b.style.visibility="visible",b.style.opacity="1";let z=I.querySelector("#error-modal-ok-btn"),D=I.querySelector(".modal-close");if(console.log("[showErrorModal] Found buttons:",{okBtn:!!z,closeBtn:!!D}),!z){console.error("[showErrorModal] OK button not found!");return}let Y=()=>{b.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{b.parentNode&&b.remove()},200)};z.onclick=Y,D&&(D.onclick=Y),b.onclick=O=>{O.target===b&&Y()},setTimeout(()=>{z.focus()},100),console.log("[showErrorModal] Modal setup complete")}function ct(w){if(!w)return 0;let T=String(w).replace("#","");if(T.length<6)return 0;let b=parseInt(T.substring(0,2),16),I=parseInt(T.substring(2,4),16),A=parseInt(T.substring(4,6),16);return isNaN(b)||isNaN(I)||isNaN(A)?0:(b*299+I*587+A*114)/1e3}function Pt(w,T){let b=String(w||"").replace("#",""),I=String(T||"").replace("#","");if(b.length<6||I.length<6)return 1/0;let A=parseInt(b.substring(0,2),16),z=parseInt(b.substring(2,4),16),D=parseInt(b.substring(4,6),16),Y=parseInt(I.substring(0,2),16),O=parseInt(I.substring(2,4),16),q=parseInt(I.substring(4,6),16);if([A,z,D,Y,O,q].some(_=>isNaN(_)))return 1/0;let W=Y-A,V=O-z,H=q-D;return Math.sqrt(W*W+V*V+H*H)}function yn(w){let T=String(w||"").replace("#","");if(T.length<6)return 0;let b=parseInt(T.substring(0,2),16)/255,I=parseInt(T.substring(2,4),16)/255,A=parseInt(T.substring(4,6),16)/255;if(isNaN(b)||isNaN(I)||isNaN(A))return 0;let z=b<=.03928?b/12.92:Math.pow((b+.055)/1.055,2.4),D=I<=.03928?I/12.92:Math.pow((I+.055)/1.055,2.4),Y=A<=.03928?A/12.92:Math.pow((A+.055)/1.055,2.4);return .2126*z+.7152*D+.0722*Y}function Rt(w,T){let b=yn(w),I=yn(T),A=Math.max(b,I),z=Math.min(b,I);return(A+.05)/(z+.05)}function St(w){if(!w||!w.message)return null;let b=(w.message||"").match(/Color (#[0-9A-Fa-f]{6})/),I=b?b[1].toUpperCase():null;if(!I)return null;let A=document.getElementById("color-scale");if(!A||!A.value.trim())return null;let z=A.value.split(",").map(O=>O.trim().toUpperCase()).filter(O=>O&&O.startsWith("#"));if(z.length===0)return null;let D=null,Y=1/0;return z.forEach(O=>{let q=Pt(I,O);q<Y&&(Y=q,D=O)}),Y>100?null:D}function kt(w){if(!w||!w.message)return null;let b=(w.message||"").match(/\((\d+)px\)/);if(!b)return null;let I=parseInt(b[1],10);if(isNaN(I))return null;let A=document.getElementById("spacing-scale");if(!A||!A.value.trim())return null;let z=A.value.split(",").map(q=>parseInt(q.trim(),10)).filter(q=>!isNaN(q)&&q>=0).sort((q,W)=>q-W);if(z.length===0)return null;let D=null,Y=1/0;z.forEach(q=>{let W=Math.abs(q-I);W<Y&&(Y=W,D=q)});let O=Math.max(I*.2,10);return Y>O?null:D}function Ss(w,T){if(!w||w.length===0){alert("No typography styles available. Please add styles in Typography Settings.");return}let b=document.createElement("div");b.className="modal-overlay",b.style.zIndex="10001";let I=document.createElement("div");I.className="modal-dialog",I.style.maxWidth="300px",I.style.padding="0",I.innerHTML=`
      <div class="modal-header" style="padding: 16px;">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title" style="font-size: 14px;">Choose Typography Style</h2>
      </div>
      <div style="max-height: 300px; overflow-y: auto;">
        ${w.map(z=>{let D=p(z.name||""),Y=p(z.fontFamily||""),O=p(z.fontSize||""),q=p(z.fontWeight||"");return`
          <div class="style-dropdown-item" data-style-id="${z.id}" style="padding: 12px 16px; cursor: pointer; font-size: 13px; border-bottom: 1px solid #f0f0f0;" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='white'">
            <div style="font-weight: 600; color: #333;">${D}</div>
            <div style="font-size: 11px; color: #666; margin-top: 4px;">
              ${Y} ${O}px ${q}
            </div>
          </div>
        `}).join("")}
      </div>
    `,b.appendChild(I),document.body.appendChild(b);let A=()=>{b.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{b.parentNode&&b.remove()},200)};I.querySelector(".modal-close").onclick=A,b.onclick=z=>{z.target===b&&A()},I.querySelectorAll(".style-dropdown-item").forEach(z=>{z.onclick=D=>{D.preventDefault(),D.stopPropagation();let Y=parseInt(z.getAttribute("data-style-id"),10),O=w.find(q=>q.id===Y);O&&T&&(T(O),A())}})}function hn(w,T){if(!w||!w.bestMatch){console.error("showTypographyFixModal: missing issue or bestMatch");return}let b=w.nodeProps||{},I=w.bestMatch,A=b.fontFamily||"",z=b.fontSize!==null&&b.fontSize!==void 0?b.fontSize:"",D=b.fontWeight||"",Y=b.lineHeight||"",O=b.letterSpacing!==null&&b.letterSpacing!==void 0?b.letterSpacing:"",q=A,W=z,V=D,H=Y,_=O;I.differences&&I.differences.forEach(Z=>{Z.property==="Font Family"&&Z.expected?q=Z.expected:Z.property==="Font Size"&&Z.expected?W=Z.expected.replace("px",""):Z.property==="Font Weight"&&Z.expected?V=Z.expected:Z.property==="Line Height"&&Z.expected?H=Z.expected:Z.property==="Letter Spacing"&&Z.expected&&(_=Z.expected)});let pe=document.createElement("div");pe.className="modal-overlay",pe.id="typography-fix-modal-overlay";let te=document.createElement("div");te.className="modal-dialog",te.style.maxWidth="500px",te.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Fix Typography Style</h2>
        <p class="modal-subtitle">Node: ${p(w.nodeName||"Unnamed")} \u2192 Suggested: ${p(I.name)}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">
            Edit values below and click Apply to fix:
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Font Family</label>
            <input type="text" class="modal-input" id="fix-font-family" value="${p(q)}" style="width: 100%;" />
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Font Size (px)</label>
            <input type="number" class="modal-input" id="fix-font-size" value="${p(W)}" style="width: 100%;" />
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Font Weight</label>
            <select class="modal-input" id="fix-font-weight" style="width: 100%;">
              <option value="Regular" ${V==="Regular"?"selected":""}>Regular</option>
              <option value="Medium" ${V==="Medium"?"selected":""}>Medium</option>
              <option value="SemiBold" ${V==="SemiBold"||V==="Semi Bold"?"selected":""}>SemiBold</option>
              <option value="Bold" ${V==="Bold"?"selected":""}>Bold</option>
            </select>
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Line Height (% or px or auto)</label>
            <input type="text" class="modal-input" id="fix-line-height" value="${p(H)}" style="width: 100%;" placeholder="e.g. 120%, 24px, auto" />
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Letter Spacing (px or %)</label>
            <input type="text" class="modal-input" id="fix-letter-spacing" value="${p(_)}" style="width: 100%;" placeholder="e.g. 0, 0.5px, 1%" />
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
    `,pe.appendChild(te),document.body.appendChild(pe);let re=te.querySelector("#fix-font-family"),ce=te.querySelector("#fix-font-size"),me=te.querySelector("#fix-font-weight"),se=te.querySelector("#fix-line-height"),de=te.querySelector("#fix-letter-spacing"),R=te.querySelector("#choose-typo-style-btn"),ue=te.querySelector("#typography-fix-modal-cancel-btn"),J=te.querySelector("#typography-fix-modal-apply-btn"),ge=te.querySelector(".modal-close");setTimeout(()=>{re.focus()},100);let h=()=>{pe.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{pe.parentNode&&pe.remove()},200)};ue.onclick=h,ge.onclick=h,pe.onclick=Z=>{Z.target===pe&&h()},R.onclick=()=>{Ss(T,Z=>{Z&&(re.value=Z.fontFamily||"",ce.value=Z.fontSize||"",me.value=Z.fontWeight||"Regular",se.value=Z.lineHeight||"",de.value=Z.letterSpacing||"0")})},J.onclick=()=>{let Z={fontFamily:re.value.trim(),fontSize:ce.value.trim(),fontWeight:me.value,lineHeight:se.value.trim(),letterSpacing:de.value.trim()};if(!Z.fontFamily){re.focus(),re.style.borderColor="#ff3b30",setTimeout(()=>{re.style.borderColor="#0071e3"},2e3);return}if(!Z.fontSize||isNaN(parseFloat(Z.fontSize))){ce.focus(),ce.style.borderColor="#ff3b30",setTimeout(()=>{ce.style.borderColor="#0071e3"},2e3);return}h(),ae(w.id,"\u23F3 Fixing...",!0),parent.postMessage({pluginMessage:{type:"fix-issue",issue:w,fixData:Z}},"*")}}function ks(w,T){if(w===T)return 100;let b=100,I=Math.abs(w-T);return Math.max(0,Math.round((1-I/b)*100))}function bn(w,T,b,I){let A=document.createElement("div");A.className="modal-overlay",A.id="spacing-picker-modal-overlay";let z=document.createElement("div");z.className="modal-dialog",z.style.maxWidth="400px";let D=I.map(H=>`
        <div class="spacing-picker-item" data-value="${H}" style="
          padding: 12px;
          margin-bottom: 8px;
          border: 1px solid ${b===H?"#0071e3":"#ddd"};
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: white;
          transition: all 0.2s;
        " onmouseover="this.style.borderColor='#0071e3'; this.style.boxShadow='0 2px 8px rgba(0,113,227,0.2)'" onmouseout="this.style.borderColor='${b===H?"#0071e3":"#ddd"}'; this.style.boxShadow='none'">
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
            ">${H}px</div>
            <div style="font-weight: 600; font-size: 12px; color: #333;">
              ${H}px
            </div>
          </div>
          ${b===H?'<div style="color: #0071e3; font-weight: 600;">Current</div>':""}
        </div>
      `).join(""),Y=String(T||"").replace(/([A-Z])/g," $1").replace(/^./,H=>H.toUpperCase()).trim();z.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Choose Spacing Value</h2>
        <p class="modal-subtitle">Node: ${p(w.nodeName||"Unnamed")} - ${p(Y)}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current Value:</div>
          <div style="font-size: 16px; font-weight: 600; color: #333;">${b}px</div>
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
          ${D}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="spacing-picker-modal-cancel-btn">Cancel</button>
      </div>
    `,A.appendChild(z),document.body.appendChild(A);let O=z.querySelector("#spacing-picker-modal-cancel-btn"),q=z.querySelector(".modal-close"),W=z.querySelectorAll(".spacing-picker-item"),V=()=>{A.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{A.parentNode&&A.remove()},200)};O.onclick=V,q.onclick=V,A.onclick=H=>{H.target===A&&V()},W.forEach(H=>{H.onclick=_=>{_.preventDefault(),_.stopPropagation();let pe=parseInt(H.getAttribute("data-value"),10);V(),Dt(w,T,b,pe)}})}function Dt(w,T,b,I,A=[],z={}){let{onApply:D,onIgnore:Y,onCancel:O,showIgnore:q=!1,progress:W}=z,V=String(T||"").replace(/([A-Z])/g," $1").replace(/^./,Q=>Q.toUpperCase()).trim(),_=(A.length>0?A:[0,4,8,12,16,24,32,40,48,64,72,80,88,96]).map(Q=>({value:Q,similarity:ks(b,Q),diff:Math.abs(b-Q)})).sort((Q,fe)=>I!==void 0&&Q.value===I?-1:I!==void 0&&fe.value===I?1:Q.diff-fe.diff).slice(0,5);if(_.length===0){alert("No spacing values available");return}let pe=_[0].value,te=(Q,fe)=>{let xe=Q.value!==b;return`
      <div class="spacing-option-item" data-value="${Q.value}" style="
        padding: 10px 12px;
        margin-bottom: 6px;
        border: 1px solid ${fe?"#0071e3":"#e0e0e0"};
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
          border: 1px solid ${fe?"#0071e3":"#ddd"};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          color: ${fe?"#0071e3":"#666"};
          flex-shrink: 0;
        ">${Q.value}</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 13px; color: #333;">${Q.value}px</div>
          <div style="font-size: 10px; color: ${xe?"#721c24":"#155724"};">
            ${xe?`\u26A0 \u0394${Q.value>b?"+":""}${Q.value-b}px`:"\u2713 Same"}
          </div>
        </div>
        <span style="font-size: 11px; color: #666; background: #f0f0f0; padding: 2px 8px; border-radius: 10px;">${Q.similarity}%</span>
      </div>
    `},re=document.createElement("div");re.className="modal-overlay",re.id="spacing-fix-confirm-modal-overlay";let ce=document.createElement("div");ce.className="modal-dialog",ce.style.maxWidth="420px";let me=W?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${W.current}/${W.total}</div>`:"",se=_.map((Q,fe)=>te(Q,fe===0)).join("");ce.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Apply Suggested Spacing</h2>
        <p class="modal-subtitle">Node: ${p(w.nodeName||"Unnamed")} - ${p(V)}</p>
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
          ">${b}</div>
          <div>
            <div style="font-size: 11px; color: #666;">Current ${p(V)}:</div>
            <div style="font-size: 14px; font-weight: 600;">${b}px</div>
          </div>
        </div>
        <div style="font-size: 12px; font-weight: 600; color: #333; margin-bottom: 8px;">
          Select a value to apply (Top 5 closest):
        </div>
        <div id="spacing-options-container" style="max-height: 280px; overflow-y: auto;">
          ${se}
        </div>
      </div>
      <div class="modal-footer">
        ${q?'<button class="modal-btn modal-btn-cancel" id="spacing-fix-ignore-btn" style="background: #6c757d; border-color: #6c757d; color: white;">Ignore</button>':""}
        <button class="modal-btn modal-btn-cancel" id="spacing-fix-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="spacing-fix-confirm-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `,re.appendChild(ce),document.body.appendChild(re);let de=ce.querySelector("#spacing-fix-confirm-cancel-btn"),R=ce.querySelector("#spacing-fix-confirm-apply-btn"),ue=ce.querySelector("#spacing-fix-ignore-btn"),J=ce.querySelector(".modal-close"),ge=ce.querySelector("#spacing-options-container"),h=Q=>{pe=Q,ge.querySelectorAll(".spacing-option-item").forEach(xe=>{let K=parseInt(xe.getAttribute("data-value"),10)===Q;xe.style.border=K?"2px solid #0071e3":"2px solid #e0e0e0",xe.style.background=K?"#e3f2fd":"white";let nt=xe.querySelector('input[type="radio"]');nt&&(nt.checked=K)})};(()=>{ge.querySelectorAll(".spacing-option-item").forEach(fe=>{fe.onclick=xe=>{xe.preventDefault();let Xe=parseInt(fe.getAttribute("data-value"),10);h(Xe)}})})();let ie=()=>{re.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{re.parentNode&&re.remove()},200)};de.onclick=()=>{ie(),O&&typeof O=="function"&&O()},J.onclick=()=>{ie(),O&&typeof O=="function"&&O()},re.onclick=Q=>{Q.target===re&&(ie(),O&&typeof O=="function"&&O())},R.onclick=()=>{ie(),ae(w.id,"\u23F3 Fixing spacing...",!0),parent.postMessage({pluginMessage:{type:"fix-spacing-issue",issue:w,propertyName:T,value:pe}},"*"),D&&typeof D=="function"&&D()},ue&&(ue.onclick=()=>{ie(),Y&&typeof Y=="function"&&Y()})}function wt(w){try{let T=parseInt(w.slice(1,3),16),b=parseInt(w.slice(3,5),16),I=parseInt(w.slice(5,7),16);return(T*299+b*587+I*114)/1e3>128?"#000000":"#ffffff"}catch(T){return"#000000"}}function ws(w,T){let b=w.replace("#",""),I=T.replace("#",""),A=parseInt(b.substr(0,2),16),z=parseInt(b.substr(2,2),16),D=parseInt(b.substr(4,2),16),Y=parseInt(I.substr(0,2),16),O=parseInt(I.substr(2,2),16),q=parseInt(I.substr(4,2),16);return Math.sqrt(Math.pow(A-Y,2)+Math.pow(z-O,2)+Math.pow(D-q,2))}function Cs(w,T){let I=ws(w,T);return Math.round((1-I/441.67)*100)}function ro(w,T,b,I="",A=""){return wt(w),`
      <div class="color-picker-item" data-color="${p(w)}" style="
        padding: 7px;
        margin-bottom: 8px;
        border: 1px solid ${b};
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
        background: white;
        transition: all 0.2s;
      " onmouseover="this.style.borderColor='#0071e3'; this.style.boxShadow='0 2px 8px rgba(0,113,227,0.2)'" onmouseout="this.style.borderColor='${b}'; this.style.boxShadow='none'">
        <div style="
          width: 36px;
          height: 36px;
          border-radius: 6px;
          background: ${p(w)};
          border: 1px solid #ddd;
          flex-shrink: 0;
        "></div>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 12px; color: #333; margin-bottom: 4px;">
            ${T||p(w)}
          </div>
          <div style="font-size: 10px; color: #666; font-family: 'SF Mono', Monaco, monospace;">
            ${p(w)}
          </div>
          ${I?`<div style="font-size: 11px; color: #666; margin-top: 4px;">${I}</div>`:""}
        </div>
        ${A?`<div style="color: #0071e3; font-weight: 600; margin-left: auto;">${A}</div>`:""}
      </div>
    `}function vn(w,T,b,I={}){if(!T){let H=(w.message||"").match(/Color (#[0-9A-Fa-f]{6})/);T=H?H[1].toUpperCase():null}if(!T){alert("Cannot determine current color from issue message");return}let A=document.createElement("div");A.className="modal-overlay",A.id="color-picker-modal-overlay";let z=document.createElement("div");z.className="modal-dialog",z.style.maxWidth="400px";let D=b.map(V=>{let H=I[V]||"";return ro(V,H||V,T===V?"#0071e3":"#ddd","",T===V?"Current":"")}).join("");z.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Choose Color</h2>
        <p class="modal-subtitle">Node: ${p(w.nodeName||"Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current Color:</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 32px; height: 32px; border-radius: 4px; background: ${p(T)}; border: 1px solid #ddd;"></div>
            <div style="font-family: 'SF Mono', Monaco, monospace; font-size: 11px; font-weight: 600;">${p(T)}</div>
          </div>
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
          ${D}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="color-picker-modal-cancel-btn">Cancel</button>
      </div>
    `,A.appendChild(z),document.body.appendChild(A);let Y=z.querySelector("#color-picker-modal-cancel-btn"),O=z.querySelector(".modal-close"),q=z.querySelectorAll(".color-picker-item"),W=()=>{A.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{A.parentNode&&A.remove()},200)};Y.onclick=W,O.onclick=W,A.onclick=V=>{V.target===A&&W()},q.forEach(V=>{V.onclick=H=>{H.preventDefault(),H.stopPropagation();let _=V.getAttribute("data-color");W(),Wt(w,T,_,I)}})}function Wt(w,T,b,I={},A=[],z={}){let{onApply:D,onIgnore:Y,onCancel:O,showIgnore:q=!1,progress:W}=z,V=A.length>0?A:Object.keys(I);V.length===0&&b&&(V=[b]);let H=V.map(ie=>({color:ie,name:I[ie]||ie,similarity:Cs(T,ie)})).sort((ie,Q)=>b&&ie.color===b?-1:b&&Q.color===b?1:Q.similarity-ie.similarity).slice(0,5);if(H.length===0){alert("No colors available");return}let _=H[0].color,pe=(ie,Q)=>`
      <div class="color-option-item" data-color="${p(ie.color)}" style="
        padding: 10px 12px;
        margin-bottom: 6px;
        border: 1px solid ${Q?"#0071e3":"#e0e0e0"};
        border-radius: 8px;
        cursor: pointer;
        background: ${Q?"#e3f2fd":"white"};
        display: flex;
        align-items: center;
        gap: 12px;
        transition: all 0.15s;
      ">
        <input type="radio" name="color-option" ${Q?"checked":""} style="margin: 0; cursor: pointer;" />
        <div style="
          width: 36px;
          height: 36px;
          border-radius: 6px;
          background: ${p(ie.color)};
          border: 1px solid ${Q?"#0071e3":"#ddd"};
          flex-shrink: 0;
        "></div>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 13px; color: #333;">${p(ie.name)}</div>
          <div style="font-size: 11px; color: #666; font-family: 'SF Mono', Monaco, monospace;">${p(ie.color)}</div>
        </div>
        <span style="font-size: 11px; color: #666; background: #f0f0f0; padding: 2px 8px; border-radius: 10px;">${ie.similarity}%</span>
      </div>
    `,te=document.createElement("div");te.className="modal-overlay",te.id="color-fix-confirm-modal-overlay";let re=document.createElement("div");re.className="modal-dialog",re.style.maxWidth="420px";let ce=W?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${W.current}/${W.total}</div>`:"",me=H.map((ie,Q)=>pe(ie,Q===0)).join("");re.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Apply Suggested Color</h2>
        <p class="modal-subtitle">Node: ${p(w.nodeName||"Unnamed")}</p>
      </div>
      ${ce}
      <div class="modal-body">
        <div style="margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 6px; display: flex; align-items: center; gap: 10px;">
          <div style="
            width: 32px;
            height: 32px;
            border-radius: 4px;
            background: ${p(T)};
            border: 1px solid #ddd;
          "></div>
          <div>
            <div style="font-size: 11px; color: #666;">Current:</div>
            <div style="font-size: 12px; font-weight: 600; font-family: 'SF Mono', Monaco, monospace;">${p(T)}</div>
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
        ${q?'<button class="modal-btn modal-btn-cancel" id="color-fix-ignore-btn" style="background: #6c757d; border-color: #6c757d; color: white;">Ignore</button>':""}
        <button class="modal-btn modal-btn-cancel" id="color-fix-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="color-fix-confirm-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `,te.appendChild(re),document.body.appendChild(te);let se=re.querySelector("#color-fix-confirm-cancel-btn"),de=re.querySelector("#color-fix-confirm-apply-btn"),R=re.querySelector("#color-fix-ignore-btn"),ue=re.querySelector(".modal-close"),J=re.querySelector("#color-options-container"),ge=ie=>{_=ie,J.querySelectorAll(".color-option-item").forEach(fe=>{let Xe=fe.getAttribute("data-color")===ie;fe.style.border=Xe?"2px solid #0071e3":"2px solid #e0e0e0",fe.style.background=Xe?"#e3f2fd":"white";let K=fe.querySelector('input[type="radio"]');K&&(K.checked=Xe)})};(()=>{J.querySelectorAll(".color-option-item").forEach(Q=>{Q.onclick=fe=>{fe.preventDefault();let xe=Q.getAttribute("data-color");ge(xe)}})})();let Z=()=>{te.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{te.parentNode&&te.remove()},200)};se.onclick=()=>{Z(),O&&typeof O=="function"&&O()},ue.onclick=()=>{Z(),O&&typeof O=="function"&&O()},te.onclick=ie=>{ie.target===te&&(Z(),O&&typeof O=="function"&&O())},de.onclick=()=>{Z(),ae(w.id,"\u23F3 Fixing color...",!0),parent.postMessage({pluginMessage:{type:"fix-color-issue",issue:w,color:_}},"*"),D&&typeof D=="function"&&D()},R&&(R.onclick=()=>{Z(),Y&&typeof Y=="function"&&Y()})}function co({reportData:w,getTypeDisplayName:T}){let b=w||{},I=b.issues||[],A=b.tokens||null,z=b.timestamp||Date.now(),D=new Date(z).toLocaleString("vi-VN"),Y="Design Review",O=W=>{try{return typeof T=="function"?T(W):String(W||"")}catch(V){return String(W||"")}},q=`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Design Review Report - ${D}</title>
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
      <div class="meta">Generated: ${D} | Page: ${Y}</div>
    </div>`;if(I&&I.length>0){let W={error:I.filter(H=>H.severity==="error").length,warn:I.filter(H=>H.severity==="warn").length,total:I.length},V=I.reduce((H,_)=>(H[_.type]=H[_.type]||[],H[_.type].push(_),H),{});q+=`
    <div class="section">
      <h2 class="section-title">\u{1F4CA} Summary</h2>
      <div class="stats">
        ${W.error>0?`<div class="stat-card error"><div class="value">${W.error}</div><div class="label">Errors</div></div>`:""}
        ${W.warn>0?`<div class="stat-card warn"><div class="value">${W.warn}</div><div class="label">Warnings</div></div>`:""}
        <div class="stat-card"><div class="value">${W.total}</div><div class="label">Total Issues</div></div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">\u{1F50D} Issues</h2>
      <div class="export-filter-group">
        <button class="export-filter-btn active" data-severity="all">All</button>
        <button class="export-filter-btn" data-severity="error">Errors</button>
        <button class="export-filter-btn" data-severity="warn">Warnings</button>
      </div>`;for(let[H,_]of Object.entries(V)){let pe=p(O(H));q+=`
      <div class="issue-group collapsed" data-type="${H}" data-label="${pe}">
        <div class="issue-group-header">
          <button class="issue-group-toggle" type="button">+</button>
          <span>${pe} (${_.length})</span>
        </div>
        <div class="issue-group-content">`,_.forEach(te=>{q+=`
          <div class="issue ${te.severity}">
            <div class="issue-type">${String(te.severity||"").toUpperCase()}</div>
            <div class="issue-message">${p(te.message)}</div>
            ${te.nodeName?`<div class="issue-node">Node: ${p(te.nodeName)}</div>`:""}
          </div>`}),q+=`
        </div>
      </div>`}q+=`
    </div>`}if(A){q+=`
    <div class="section">
      <h2 class="section-title">\u{1F3A8} Design Tokens</h2>`;let W={colors:{label:"Colors",values:A.colors||[]},gradients:{label:"Gradients",values:A.gradients||[]},borderRadius:{label:"Border Radius",values:A.borderRadius||[]},fontWeight:{label:"Font Weight",values:A.fontWeight||[]},lineHeight:{label:"Line Height (%)",values:A.lineHeight||[]},fontSize:{label:"Font Size",values:A.fontSize||[]},fontFamily:{label:"Font Family",values:A.fontFamily||[]}};for(let[V,H]of Object.entries(W)){if(q+=`
      <div class="issue-group collapsed">
        <div class="issue-group-header">
          <button class="issue-group-toggle" type="button">+</button>
          <span>${H.label} (${H.values.length})</span>
        </div>
        <div class="issue-group-content">`,!H.values||H.values.length===0){q+=`
          <div class="token-empty-message">No tokens in this group.</div>`,q+=`
        </div>
      </div>`;continue}q+=`
          <div class="token-list">`,H.values.forEach(_=>{let pe=_.value,te=typeof _.totalNodes=="number"?_.totalNodes:_.nodes?_.nodes.length:0,re=_.colorType||"";if(V==="colors")q+=`
          <div class="token-item">
            <div class="token-value">
              <span class="token-color-preview" style="background-color: ${p(pe)}"></span>
              ${p(pe)}
              ${re?`<span class="token-color-type">${p(re)}</span>`:""}
            </div>
            ${te>1?`<div class="token-node-count">Used in ${te} nodes</div>`:""}
          </div>`;else if(V==="gradients")q+=`
          <div class="token-item">
            <div class="token-value">
              <span class="token-color-preview" style="background: ${p(pe)}"></span>
              ${p(pe)}
              ${re?`<span class="token-color-type">${p(re)}</span>`:""}
            </div>
            ${te>1?`<div class="token-node-count">Used in ${te} nodes</div>`:""}
          </div>`;else{let ce="";if(V==="fontWeight"){let me=Array.isArray(_.fontFamilies)?_.fontFamilies:null;if(!me){let se={};(Array.isArray(_.nodes)?_.nodes:[]).forEach(R=>{let ue=R&&R.fontFamily?String(R.fontFamily):"Unknown";se[ue]=(se[ue]||0)+1}),me=Object.entries(se).map(([R,ue])=>({family:R,count:ue})).sort((R,ue)=>ue.count-R.count||R.family.localeCompare(ue.family))}Array.isArray(me)&&me.length>0&&(ce=`<div class="token-node-count" style="margin-top: 6px;">Font-family:<br/>${me.map(de=>`${p(de.family)} (${de.count})`).join("<br/>")}</div>`)}q+=`
          <div class="token-item">
            <div class="token-value">${p(String(pe))}</div>
            ${te>1?`<div class="token-node-count">Used in ${te} nodes</div>`:""}
            ${ce}
          </div>`}}),q+=`
          </div>
        </div>
      </div>`}q+=`
    </div>`}return q+=`
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
</html>`,q}function Is(){let w=new Date,T=w.getFullYear(),b=String(w.getMonth()+1).padStart(2,"0"),I=String(w.getDate()).padStart(2,"0"),A=String(w.getHours()).padStart(2,"0"),z=String(w.getMinutes()).padStart(2,"0"),D=String(w.getSeconds()).padStart(2,"0");return`design-review-report-${T}-${b}-${I}-${A}-${z}-${D}`}function $s(w,T){if(!w||!Array.isArray(w.colors))return w;let b=T||{};return Ye(We({},w),{colors:w.colors.map(I=>Ye(We({},I),{name:b[String(I.value).toUpperCase()]||"No name"}))})}function xn({format:w,reportData:T,getTypeDisplayName:b,filenameBase:I,colorNameMap:A}={}){var Y,O;let z=T||{};if(!z.issues&&!z.tokens){alert("No data to export!");return}let D=I||Is();if(w==="html"){let q=co({reportData:z,getTypeDisplayName:b}),W=new Blob([q],{type:"text/html"}),V=URL.createObjectURL(W),H=document.createElement("a");H.href=V,H.download=`${D}.html`,H.click(),URL.revokeObjectURL(V);return}if(w==="pdf"){let q=co({reportData:z,getTypeDisplayName:b});try{let W=window.open("","_blank");if(!W){alert("Popup blocked. Downloading HTML - you can open the file and select Print to create PDF.");let V=new Blob([q],{type:"text/html"}),H=URL.createObjectURL(V),_=document.createElement("a");_.href=H,_.download=`${D}.html`,_.click(),URL.revokeObjectURL(H);return}W.document.open(),W.document.write(q),W.document.close(),W.onload=()=>{setTimeout(()=>{W.print()},250)},setTimeout(()=>{W.document&&W.document.readyState==="complete"&&W.print()},500)}catch(W){console.error("Error opening print window:",W),alert("Cannot open print window. Downloading HTML - you can open the file and select Print to create PDF.");let V=new Blob([q],{type:"text/html"}),H=URL.createObjectURL(V),_=document.createElement("a");_.href=H,_.download=`${D}.html`,_.click(),URL.revokeObjectURL(H)}return}if(w==="json"){console.log("Export JSON - colorNameMap:",A),console.log("Export JSON - tokens.colors:",(Y=z.tokens)==null?void 0:Y.colors);let q=Ye(We({},z),{tokens:$s(z.tokens,A)});console.log("Export JSON - enriched colors:",(O=q.tokens)==null?void 0:O.colors);let W=JSON.stringify(q,null,2),V=new Blob([W],{type:"application/json"}),H=URL.createObjectURL(V),_=document.createElement("a");_.href=H,_.download=`${D}.json`,_.click(),URL.revokeObjectURL(H);return}}function Sn({maxHistory:w=10,postPluginMessage:T,getCurrentReportData:b,setIsViewingTokens:I,renderResults:A,renderTokens:z}={}){let D=[],Y=!1,O=se=>{try{typeof T=="function"&&T(se)}catch(de){console.error("scanHistory postPluginMessage error:",de)}};function q(se){D=(Array.isArray(se)?se:[]).slice(0,w)}function W(){D=[],Y=!1}function V(){return D||[]}function H(se,de,R,ue){try{if(de==="issues"&&(!R.issues||R.issues.length===0)){console.log("Skipping save - no issues data");return}if(de==="tokens"&&(!R.tokens||Object.keys(R.tokens).length===0)){console.log("Skipping save - no tokens data");return}let J={id:Date.now().toString(),mode:se,type:de,timestamp:new Date().toISOString(),context:ue||null,data:{issues:R.issues||null,tokens:R.tokens||null,issuesCount:R.issues?R.issues.length:0,tokensCount:R.tokens?Object.keys(R.tokens).reduce((h,Z)=>{var ie;return h+(((ie=R.tokens[Z])==null?void 0:ie.length)||0)},0):0}};D.unshift(J),D=D.slice(0,w);let ge=document.getElementById("history-panel");ge&&ge.style.display!=="none"&&ce(),O({type:"save-history-entry",entry:J})}catch(J){console.error("Error saving scan history:",J)}}function _(){O({type:"get-history"})}function pe(){try{let se=V();if(se.length>0){let de=se[0],R=document.querySelector(`input[name="scope"][value="${de.mode}"]`);R&&(R.checked=!0,console.log("Loaded last scan mode:",de.mode))}}catch(se){console.error("Error loading last scan mode:",se)}}function te(){Y||(pe(),Y=!0)}function re(se){try{let de=new Date(se),ue=new Date-de,J=Math.floor(ue/6e4),ge=Math.floor(ue/36e5),h=Math.floor(ue/864e5);return J<1?"Just now":J<60?`${J} minutes ago`:ge<24?`${ge} hours ago`:h<7?`${h} days ago`:de.toLocaleString("en-US",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}catch(de){return se}}function ce(){let se=document.getElementById("history-list");if(!se){console.error("history-list element not found");return}let de=V();if(console.log("Rendering scan history:",de.length,"entries"),de.length===0){se.innerHTML=`
              <div class="history-empty">
                <div class="icon">\u{1F4CB}</div>
                <p>No scan history</p>
                <p style="font-size: 11px; margin-top: 8px;">Scans will be saved automatically</p>
              </div>
            `;return}se.innerHTML=de.map(R=>{var Q,fe;let ue=re(R.timestamp),J=R.mode==="page"?"Page":"Selection",ge=R.type==="issues"?"Issues":"Tokens",h=R.type==="issues"?"issues":"tokens",Z=R.context&&R.context.label?R.context.label:`${J} scan`,ie="";if(R.type==="issues"){let xe=((Q=R.data.issues)==null?void 0:Q.filter(K=>K.severity==="error").length)||0,Xe=((fe=R.data.issues)==null?void 0:fe.filter(K=>K.severity==="warn").length)||0;ie=`
                <span>\u274C ${xe} errors</span>
                <span>\u26A0\uFE0F ${Xe} warnings</span>
                <span>\u{1F4CA} ${R.data.issuesCount} total</span>
              `}else ie=`
                <span>\u{1F3A8} ${R.data.tokensCount} tokens</span>
              `;return`
              <div class="history-item" data-id="${R.id}">
                <div class="history-item-header">
                  <span class="history-item-type ${h}">${ge}</span>
                  <span class="history-item-time">${ue}</span>
                </div>
                <div class="history-item-info">${p(Z)}</div>
                <div class="history-item-stats">${ie}</div>
              </div>
            `}).join(""),se.querySelectorAll(".history-item").forEach(R=>{R.onclick=()=>{let ue=R.getAttribute("data-id");me(ue)}})}function me(se){try{let R=V().find(h=>h.id===se);if(!R){alert("Scan history entry not found!");return}let ue=document.querySelector(`input[name="scope"][value="${R.mode}"]`);ue&&(ue.checked=!0);let J=typeof b=="function"?b():null;if(!J){console.warn("restoreReportFromHistory: currentReportData is not available");return}J.scanMode=R.mode,J.context=R.context||null,R.type==="issues"&&R.data.issues?(J.issues=R.data.issues,J.tokens=null,typeof I=="function"&&I(!1),typeof A=="function"&&A(R.data.issues,!0,{restoreTimestamp:R.timestamp})):R.type==="tokens"&&R.data.tokens&&(J.issues=null,J.tokens=R.data.tokens,typeof I=="function"&&I(!0),typeof z=="function"&&z(R.data.tokens,!0,{restoreTimestamp:R.timestamp}));let ge=document.getElementById("history-panel");ge&&(ge.style.display="none"),console.log("Report restored from history:",se)}catch(de){console.error("Error restoring report from history:",de),alert("Error restoring report: "+de.message)}}return{setHistory:q,clearLocalHistory:W,getScanHistory:V,saveScanHistory:H,requestScanHistory:_,loadLastScanMode:pe,loadLastScanModeOnce:te,renderScanHistory:ce,restoreReportFromHistory:me}}var kn=4;console.log("Header.js22121211thien2");console.log("ui.js loaded");(function(){console.log("Initializing ui.js...");let w=document.getElementById("btn-scan"),T=document.getElementById("btn-cancel-scan"),b=document.getElementById("scan-progress"),I=document.getElementById("scan-progress-bar"),A=document.getElementById("scan-progress-text"),z=document.getElementById("btn-extract-tokens"),D=document.getElementById("btn-fill-spacing-scale"),Y=document.getElementById("btn-fill-color-scale"),O=document.getElementById("btn-extract-color-styles"),q=document.getElementById("btn-fill-font-size-scale"),W=document.getElementById("btn-fill-line-height-scale"),V=document.getElementById("btn-fill-font-size-from-typo"),H=document.getElementById("btn-fill-line-height-from-typo"),_=document.getElementById("btn-export"),pe=document.getElementById("btn-history"),te=document.getElementById("btn-close-history"),re=document.getElementById("btn-reset-all"),ce=document.getElementById("results-issues"),me=document.getElementById("results-tokens"),se=document.getElementById("btn-close"),de=document.querySelectorAll(".report-tab"),R=document.querySelectorAll(".report-content"),ue="issues";if(!w||!z||!ce||!me||!se||!_||!pe||!D||!Y||!q||!W){console.error("Required elements not found",{btnScan:w,btnExtractTokens:z,btnFillSpacingScale:D,btnFillColorScale:Y,btnFillFontSizeScale:q,btnFillLineHeightScale:W,resultsIssues:ce,resultsTokens:me,btnClose:se,btnExport:_,btnHistory:pe});return}fn();let J={},ge={},h={issues:null,tokens:null,scanMode:null,timestamp:null,tokensTimestamp:null,context:null},Z=new Map,ie=1e3;function Q(){Z.clear()}function fe(e,t){if(Z.has(e))return Z.get(e);let o=t();return Z.size>=ie&&Array.from(Z.keys()).slice(0,100).forEach(n=>Z.delete(n)),Z.set(e,o),o}let xe=null,Xe=5e3,K=[{id:1,name:"H1",fontFamily:"Inter",fontSize:48,fontWeight:"Bold",lineHeight:"120%",letterSpacing:"0",wordSpacing:"0"},{id:2,name:"H2",fontFamily:"Inter",fontSize:36,fontWeight:"Bold",lineHeight:"130%",letterSpacing:"0",wordSpacing:"0"},{id:3,name:"H3",fontFamily:"Inter",fontSize:28,fontWeight:"SemiBold",lineHeight:"130%",letterSpacing:"0",wordSpacing:"0"},{id:4,name:"H4",fontFamily:"Inter",fontSize:24,fontWeight:"SemiBold",lineHeight:"140%",letterSpacing:"0",wordSpacing:"0"},{id:5,name:"H5",fontFamily:"Inter",fontSize:20,fontWeight:"Medium",lineHeight:"140%",letterSpacing:"0",wordSpacing:"0"},{id:6,name:"H6",fontFamily:"Inter",fontSize:18,fontWeight:"Medium",lineHeight:"140%",letterSpacing:"0",wordSpacing:"0"},{id:7,name:"Body",fontFamily:"Inter",fontSize:16,fontWeight:"Regular",lineHeight:"150%",letterSpacing:"0",wordSpacing:"0"}],nt=8;function wn(e,t){let o=c=>c==null||c==="Unknown"?"":String(c).toLowerCase().trim(),l=c=>c!=null&&c!=="Unknown"&&String(c).trim()!=="",n=0;l(e.fontFamily)&&l(t.fontFamily)&&o(e.fontFamily)===o(t.fontFamily)&&(n+=25),e.fontSize!==null&&e.fontSize!==void 0&&t.fontSize&&(Math.abs(e.fontSize-t.fontSize)===0?n+=30:Math.abs(e.fontSize-t.fontSize)<=2?n+=25:Math.abs(e.fontSize-t.fontSize)<=4?n+=20:Math.abs(e.fontSize-t.fontSize)<=8&&(n+=10)),l(e.fontWeight)&&l(t.fontWeight)&&o(e.fontWeight)===o(t.fontWeight)&&(n+=20),l(e.lineHeight)&&l(t.lineHeight)&&o(e.lineHeight)===o(t.lineHeight)&&(n+=15);let s=o(e.letterSpacing),i=o(t.letterSpacing||"0"),a=c=>c==="0"||c==="0px"||c==="0%"||c==="";return(l(e.letterSpacing)||l(t.letterSpacing))&&(a(s)&&a(i)||s===i)&&(n+=10),n}function Tt(e){var n;if(!e||!e.bestMatch||!e.bestMatch.name)return!1;let t=(n=e.nodeProps)==null?void 0:n.fontSize;if(t==null)return!0;let o=K==null?void 0:K.find(s=>s.name===e.bestMatch.name);if(!o||!o.fontSize)return!0;let l=Math.abs(t-o.fontSize);return l>kn?(console.log(`[isValidTypographySuggestion] Font-size difference (${l}px) exceeds threshold (${kn}px) for issue:`,e.id,`Current: ${t}px, Suggested: ${o.fontSize}px`),!1):!0}function Ut(e){e&&parent.postMessage({pluginMessage:{type:"save-last-report",report:e}},"*")}function po(){parent.postMessage({pluginMessage:{type:"get-last-report"}},"*")}function ve(){var t,o,l,n,s,i,a,c,g,d,v,f,y,m,u,k;let e={spacingScale:((t=document.getElementById("spacing-scale"))==null?void 0:t.value)||"",spacingThreshold:((o=document.getElementById("spacing-threshold"))==null?void 0:o.value)||"100",colorScale:((l=document.getElementById("color-scale"))==null?void 0:l.value)||"",colorNameMap:J,ignoredIssues:ge,fontSizeScale:((n=document.getElementById("font-size-scale"))==null?void 0:n.value)||"",fontSizeThreshold:((s=document.getElementById("font-size-threshold"))==null?void 0:s.value)||"100",lineHeightScale:((i=document.getElementById("line-height-scale"))==null?void 0:i.value)||"",lineHeightThreshold:((a=document.getElementById("line-height-threshold"))==null?void 0:a.value)||"300",lineHeightBaselineThreshold:((c=document.getElementById("line-height-baseline-threshold"))==null?void 0:c.value)||"120",typographyStyles:K,skipNames:((g=document.getElementById("scan-skip-names"))==null?void 0:g.value)||"",typographyRules:{checkStyle:((d=document.getElementById("rule-typo-style"))==null?void 0:d.checked)||!0,checkFontFamily:((v=document.getElementById("rule-font-family"))==null?void 0:v.checked)||!0,checkFontSize:((f=document.getElementById("rule-font-size"))==null?void 0:f.checked)||!0,checkFontWeight:((y=document.getElementById("rule-font-weight"))==null?void 0:y.checked)||!0,checkLineHeight:((m=document.getElementById("rule-line-height"))==null?void 0:m.checked)||!0,checkLetterSpacing:((u=document.getElementById("rule-letter-spacing"))==null?void 0:u.checked)||!1,checkWordSpacing:((k=document.getElementById("rule-word-spacing"))==null?void 0:k.checked)||!1}};parent.postMessage({pluginMessage:{type:"save-input-values",values:e}},"*")}function uo(){parent.postMessage({pluginMessage:{type:"get-input-values"}},"*")}function Ot(e){if(!e)return;let t=document.getElementById("spacing-scale"),o=document.getElementById("spacing-threshold"),l=document.getElementById("color-scale"),n=document.getElementById("font-size-scale"),s=document.getElementById("font-size-threshold"),i=document.getElementById("line-height-scale"),a=document.getElementById("line-height-threshold"),c=document.getElementById("line-height-baseline-threshold");t&&e.spacingScale!==void 0&&(t.value=e.spacingScale),o&&e.spacingThreshold!==void 0&&(o.value=e.spacingThreshold),e.colorNameMap&&typeof e.colorNameMap=="object"?J=e.colorNameMap:J={},e.ignoredIssues&&typeof e.ignoredIssues=="object"?ge=e.ignoredIssues:ge={},l&&e.colorScale!==void 0&&(l.value=e.colorScale,typeof je=="function"&&je()),n&&e.fontSizeScale!==void 0&&(n.value=e.fontSizeScale),s&&e.fontSizeThreshold!==void 0&&(s.value=e.fontSizeThreshold),i&&e.lineHeightScale!==void 0&&(i.value=e.lineHeightScale),a&&e.lineHeightThreshold!==void 0&&(a.value=e.lineHeightThreshold),c&&e.lineHeightBaselineThreshold!==void 0&&(c.value=e.lineHeightBaselineThreshold);let g=document.getElementById("scan-skip-names");if(g&&e.skipNames!==void 0&&(g.value=e.skipNames),e.typographyStyles&&Array.isArray(e.typographyStyles)&&(K=e.typographyStyles,nt=Math.max(...K.map(d=>d.id||0),0)+1,Qe()),e.typographyRules){let d=e.typographyRules;document.getElementById("rule-typo-style")&&(document.getElementById("rule-typo-style").checked=d.checkStyle!==!1),document.getElementById("rule-font-family")&&(document.getElementById("rule-font-family").checked=d.checkFontFamily!==!1),document.getElementById("rule-font-size")&&(document.getElementById("rule-font-size").checked=d.checkFontSize!==!1),document.getElementById("rule-font-weight")&&(document.getElementById("rule-font-weight").checked=d.checkFontWeight!==!1),document.getElementById("rule-line-height")&&(document.getElementById("rule-line-height").checked=d.checkLineHeight!==!1),document.getElementById("rule-letter-spacing")&&(document.getElementById("rule-letter-spacing").checked=d.checkLetterSpacing===!0),document.getElementById("rule-word-spacing")&&(document.getElementById("rule-word-spacing").checked=d.checkWordSpacing===!0),Qe()}}function Cn(e){if(!e){console.log("No last report to apply");return}if(e.scanMode){let t=document.querySelector(`input[name="scope"][value="${e.scanMode}"]`);t&&(t.checked=!0)}h.scanMode=e.scanMode||h.scanMode,h.context=e.context||h.context,e.issues&&Array.isArray(e.issues)&&(console.log("Applying saved issues report"),He(e.issues,!0,{skipSave:!0,restoreTimestamp:e.issuesTimestamp})),e.tokens&&(console.log("Applying saved tokens report"),$t(e.tokens,!0,{skipSave:!0,restoreTimestamp:e.tokensTimestamp})),e.lastActiveTab?Oe(e.lastActiveTab):e.issues?Oe("issues"):e.tokens&&Oe("tokens")}let Ue="all",Ie="",Ze="all",Ct=!1;console.log("All elements found, setting up event listeners"),de.forEach(e=>{e.addEventListener("click",()=>{let t=e.dataset.tab;Oe(t),t!=="settings"&&(h.issues||h.tokens)&&Ut({issues:h.issues,issuesTimestamp:h.timestamp,tokens:h.tokens,tokensTimestamp:h.tokensTimestamp,lastActiveTab:t,scanMode:h.scanMode||null,context:h.context||null})})});function It(e=null){let t=e?document.getElementById(`results-${e}`):ce;t&&(t.innerHTML="")}function Oe(e){de.forEach(n=>{n.dataset.tab===e?n.classList.add("active"):n.classList.remove("active")}),R.forEach(n=>{n.id===`results-${e}`?n.classList.add("active"):n.classList.remove("active")});let t=document.getElementById("filter-controls"),o=document.getElementById("filter-buttons"),l=document.getElementById("color-type-filter");if(t){if(e==="settings")t.style.display="none";else if(e==="animations"){let n=typeof window.hasAnimationData=="function"&&window.hasAnimationData();t.style.display=n?"flex":"none",o&&(o.style.display="none"),l&&(l.style.display="none")}else if(e==="tokens")(me&&me.querySelector(".token-group")||h.tokens)&&(t.style.display="flex"),o&&(o.style.display="none"),l&&h.tokens&&(h.tokens.colors||h.tokens.gradients)?l.style.display="block":l&&(l.style.display="none");else if(e==="issues"){let n=ce&&ce.querySelector(".issue-group"),s=h.issues&&h.issues.length>0;(n||s)&&(t.style.display="flex",o&&(o.style.display="flex")),l&&(l.style.display="none"),s&&typeof At=="function"&&At(h.issues)}}ue=e}function In(e){return e==="error"?"\u274C":e==="warn"?"\u26A0\uFE0F":"\u2139\uFE0F"}document.documentElement.dataset.showIcons="false";function Es(e){return document.documentElement.dataset.showIcons!=="true"?"":{naming:"\u{1F3F7}\uFE0F",autolayout:"\u{1F4D0}",spacing:"\u{1F4CF}",color:"\u{1F3A8}","color-variable":"\u{1F517}",typography:"\u270D\uFE0F","typography-style":"\u{1F3A8}","typography-check":"\u{1F4DD}","typography-pass":"\u2705","typography-info":"\u2705","line-height":"\u{1F4DD}",position:"\u{1F4CD}",duplicate:"\u{1F504}",group:"\u{1F4E6}",component:"\u{1F9E9}","empty-frame":"\u{1F4ED}","nested-group":"\u{1F4DA}",contrast:"\u{1F308}","text-size-mobile":"\u{1F4F1}"}[e]||"\u{1F50D}"}function zt(e){return{naming:"Naming Layer",autolayout:"Auto Layout",spacing:"Spacing",color:"Color","color-variable":"Color Variable",typography:"Font Size","typography-style":"Text Style","typography-check":"Typography Style Match","typography-pass":"Typography \u2713 Matched","line-height":"Line Height",position:"Position Layer",duplicate:"Duplicate Layer",group:"Group Layer",component:"Component Reusable","empty-frame":"Empty Frame Layer","nested-group":"Nested Group Layer",contrast:"Contrast (ADA AA)","text-size-mobile":"Text Size (ADA)"}[e]||e.replace(/-/g," ")}function jt(e){let t=document.createElement("div");t.className=`issue ${e.severity}`;let o="";e.type==="typography-check"&&e.nodeProps&&(o='<div class="typography-details" style="margin-top: 8px; padding: 8px; background: rgba(0,0,0,0.05); border-radius: 4px; font-size: 11px;">',o+='<div class="current-properties"><div style="margin-bottom: 6px;"><strong>Current Properties:</strong></div>',o+='<div style="padding-left: 0; line-height: 1.6;">',e.nodeProps.fontFamily&&(o+=`\u2022 Font Family: <code>${p(e.nodeProps.fontFamily)}</code><br>`),e.nodeProps.fontSize!==null&&e.nodeProps.fontSize!==void 0&&(o+=`\u2022 Font Size: <code>${e.nodeProps.fontSize}px</code><br>`),e.nodeProps.fontWeight&&(o+=`\u2022 Font Weight: <code>${p(e.nodeProps.fontWeight)}</code><br>`),e.nodeProps.lineHeight&&(o+=`\u2022 Line Height: <code>${p(e.nodeProps.lineHeight)}</code><br>`),e.nodeProps.letterSpacing!==null&&e.nodeProps.letterSpacing!==void 0&&(o+=`\u2022 Letter Spacing: <code>${p(e.nodeProps.letterSpacing)}</code><br>`),o+="</div></div>",e.bestMatch&&e.bestMatch.name&&e.severity==="error"?(o+=`<div class="closest-match"><div style="margin-bottom: 6px;"><strong>Closest Match: "${p(e.bestMatch.name)}" (${e.bestMatch.percentage||0}%)</strong></div>`,o+='<div style="padding-left: 0; line-height: 1.6;">',(e.bestMatch.differences||[]).forEach(a=>{let c=a.matches?"\u2713":"\u2717",g=a.matches?"green":"red";o+=`<span style="color: ${g}">${c} ${a.property}: <code>${p(a.current)}</code> \u2192 <code>${p(a.expected)}</code></span><br>`}),o+="</div></div>"):e.severity==="info"&&e.styleName&&(o+=`<div style="margin-top: 8px; color: green;"><strong>\u2713 All properties match style "${p(e.styleName)}"</strong></div>`),o+="</div>"),t.setAttribute("data-issue-id",e.id),t.innerHTML=`
      <div class="issue-header">
              <div>
                <span class="issue-type">${zt(e.type)}</span>
      <div class="issue-body">${p(e.message)}</div>
                ${e.nodeName?`<div class="issue-node">Node: ${p(e.nodeName)}</div>`:""}
                ${o}
              </div>
              <div class="issue-actions">
                <button class="btn-select" data-id="${e.id}">Select</button>
                ${e.bestMatch&&e.bestMatch.name&&e.type==="typography-check"&&Tt(e)?`
                  <button class="btn-suggest-fix" data-id="${e.id}" data-style-name="${p(e.bestMatch.name)}">Suggest Fix now</button>
                `:""}
                ${e.type==="typography-check"?`
                  <button class="btn-style-dropdown" data-id="${e.id}" data-issue-id="${e.id}">Select Style</button>
                `:""}
                ${(e.severity==="error"||e.severity==="warn")&&e.type==="typography-check"?`
                  <button class="btn-remove-layer" data-id="${e.id}">Remove Layer</button>
                `:""}
              </div>
      </div>
    `;let l=t.querySelector("button.btn-select");l&&(l.onclick=()=>{document.querySelectorAll(".btn-select.active").forEach(a=>a.classList.remove("active")),document.querySelectorAll(".issue.selected").forEach(a=>a.classList.remove("selected")),l.classList.add("active"),t.classList.add("selected"),parent.postMessage({pluginMessage:{type:"select-node",id:e.id}},"*")});let n=t.querySelector("button.btn-suggest-fix");n&&e.type==="typography-check"&&e.bestMatch&&e.bestMatch.name&&(function(a){n.onclick=c=>{c.preventDefault(),c.stopPropagation(),a.bestMatch&&a.bestMatch.name?Kt(a,a.bestMatch.name):(console.error("Cannot apply: bestMatch.name is missing",a),alert("Error: Best match style name is missing"))}})(e);let s=t.querySelector("button.btn-style-dropdown");s&&e.type==="typography-check"&&(function(a){s.onclick=c=>{c.preventDefault(),c.stopPropagation(),parent.postMessage({pluginMessage:{type:"get-figma-text-styles",issueId:a.id}},"*"),window.pendingTypographyCheckIssue=a}})(e);let i=t.querySelector("button.btn-remove-layer");return i&&e.type==="typography-check"&&(function(a){i.onclick=c=>{c.preventDefault(),c.stopPropagation(),console.log("Remove Layer button clicked for typography-check",a),typeof Nt=="function"?Nt(a):(console.error("handleRemoveLayer is not a function"),alert("Error: handleRemoveLayer function not found"))}})(e),t}let Vt=["typography-check","typography-style"];function $n(e){var l;let t=new Map,o=[];for(let n of e){if(!Vt.includes(n.type)||n.severity==="info"||!n.nodeProps){o.push(n);continue}let s=[];if(n.subIssues&&n.subIssues.length>0)for(let i of n.subIssues)s.push(Ye(We({},n),{id:i.id,nodeName:i.nodeName,nodeProps:i.nodeProps||n.nodeProps,subIssues:void 0,affectedCount:1}));else s.push(n);for(let i of s){let a=i.nodeProps||{},c=[a.fontFamily||"",(l=a.fontSize)!=null?l:"",a.fontWeight||"",a.lineHeight||"",a.letterSpacing||""].join("|");t.has(c)||t.set(c,{key:c,issues:[],nodeProps:a,bestMatch:i.bestMatch,severity:i.severity,message:i.message,type:i.type}),t.get(c).issues.push(i)}}return{typographyGroups:[...t.values()],otherIssues:o}}let Gt=["color-variable","color"];function En(e){if(e.colorHex)return e.colorHex.toUpperCase();let t=(e.message||"").match(/#[0-9A-Fa-f]{6}/);return t?t[0].toUpperCase():""}function Mn(e){if(e.colorTarget)return e.colorTarget;let t=(e.message||"").toLowerCase();return t.startsWith("stroke")?"stroke":t.startsWith("effect")?"effect":"fill"}function Tn(e){let t=new Map,o=[];for(let l of e){if(!Gt.includes(l.type)){o.push(l);continue}let n=[];if(l.subIssues&&l.subIssues.length>0)for(let s of l.subIssues)n.push(Ye(We({},l),{id:s.id,nodeName:s.nodeName,colorHex:s.colorHex||l.colorHex,colorOpacity:s.colorOpacity!=null?s.colorOpacity:l.colorOpacity,colorTarget:s.colorTarget||l.colorTarget,fillIndex:s.fillIndex!=null?s.fillIndex:l.fillIndex,strokeIndex:s.strokeIndex!=null?s.strokeIndex:l.strokeIndex,matchingVariable:s.matchingVariable||l.matchingVariable,subIssues:void 0,affectedCount:1}));else n.push(l);for(let s of n){let i=En(s),a=Mn(s),c=s.matchingVariable?s.matchingVariable.name:"",g=`${s.type}|${i}|${a}|${c}`;t.has(g)||t.set(g,{key:g,issues:[],colorHex:i,colorTarget:a,matchingVariable:s.matchingVariable,severity:s.severity,type:s.type}),t.get(g).issues.push(s)}}return{colorGroups:[...t.values()],otherIssues:o}}let _t=["typography","line-height","text-size-mobile","position"];function zn(e){let t=e||"";return t=t.replace(/ on text "[^"]*"/g,""),t=t.replace(/ on "[^"]*"/g,""),t=t.replace(/\s*Text:\s*"[^"]*"\s*$/,""),t=t.replace(/\s*\(\d+ nodes?\)\s*$/,""),t.trim()}function Nn(e){let t=new Map,o=[];for(let l of e){if(!_t.includes(l.type)){o.push(l);continue}let n=[];if(l.subIssues&&l.subIssues.length>0)for(let s of l.subIssues)n.push(Ye(We({},l),{id:s.id,nodeName:s.nodeName,nodeProps:s.nodeProps||l.nodeProps,subIssues:void 0,affectedCount:1}));else n.push(l);for(let s of n){let i=zn(s.message,s.nodeName);t.has(i)||t.set(i,{key:i,issues:[],message:i,severity:s.severity,type:s.type,nodeProps:s.nodeProps||null,bestMatch:s.bestMatch||null}),t.get(i).issues.push(s)}}return{simpleGroups:[...t.values()],otherIssues:o}}function Bn(e){let t=document.createElement("div");t.className=`issue-grouped-card ${e.severity}`,t.setAttribute("data-group-key",e.key),t.setAttribute("data-issue-count",e.issues.length),t.setAttribute("data-severity",e.severity);let o=e.issues.length,l=e.message||"",n="",s="";if(e.type==="typography"){let u=l.match(/fontSize\s+(\d+(?:\.\d+)?px)/i);u&&(n=u[1]),s="Font Size"}else if(e.type==="line-height"){let u=l.match(/Line-height\s+([\d.]+%|"AUTO")/i);u&&(n=u[1].replace(/"/g,"")),s="Line Height"}else if(e.type==="text-size-mobile"){let u=l.match(/\((\d+(?:\.\d+)?px)\)/);u&&(n=u[1]),s="Text Size (ADA)"}else if(e.type==="position"){let u=l.match(/\(x:(-?\d+),\s*y:(-?\d+)\)/);u&&(n=`x:${u[1]}, y:${u[2]}`),s="Position"}let i=e.type==="text-size-mobile",a="",c=null;if(i&&e.nodeProps){let u=e.nodeProps;if(K&&K.length>0){let k=$=>$==null?"":String($).toLowerCase().trim(),S=0;for(let $ of K){if(!$.fontSize||$.fontSize<=12)continue;let E=0;if(k(u.fontFamily)===k($.fontFamily)&&(E+=25),u.fontSize!=null&&$.fontSize){let G=Math.abs(u.fontSize-$.fontSize);G===0?E+=30:G<=2?E+=25:G<=4?E+=20:G<=8&&(E+=10)}k(u.fontWeight)===k($.fontWeight)&&(E+=20),k(u.lineHeight)===k($.lineHeight)&&(E+=15);let M=k(u.letterSpacing),F=k($.letterSpacing||"0"),P=G=>G===""||G==="0"||G==="0px"||G==="0%";(P(M)&&P(F)||M===F)&&(E+=10),E>S&&(S=E,c={name:$.name,percentage:E,styleId:$.styleId})}}if(!c&&e.bestMatch&&e.bestMatch.name&&(c={name:e.bestMatch.name,percentage:e.bestMatch.percentage||0}),c&&c.name){let k=c.percentage||0;a=`
          <div class="issue-grouped-suggestion">
            <span class="issue-grouped-suggestion-label">Suggestion</span>
            <div class="issue-grouped-suggestion-item">
              <span class="issue-grouped-suggestion-preview">Ag</span>
              <span class="issue-grouped-suggestion-name">${p(c.name)}</span>
              <span class="issue-grouped-suggestion-pct">(${k}%)</span>
              <button class="btn-suggest-fix-all" data-group-key="${p(e.key)}">${o>1?"Apply All":"Apply"}</button>
            </div>
          </div>
        `}}let g=e.issues.map((u,k)=>{let S=u.nodeName||`Node ${k+1}`;return`<div class="issue-grouped-node-item" data-node-id="${u.id}" title="${p(S)}">
        <span class="issue-grouped-node-name">${p(S)}</span>
      </div>`}).join("");t.innerHTML=`
      <div class="issue-grouped-header">
        ${n?`
          <div class="issue-grouped-props">
            <span class="issue-grouped-font">${s}</span>
            <span class="issue-grouped-size">${p(n)}</span>
          </div>
        `:""}
        <div class="issue-body" style="margin-top:4px;">${p(l)}</div>
      </div>
      <div class="issue-grouped-nodes">
        <button class="issue-grouped-nodes-toggle" type="button">
          <span class="issue-grouped-count">${o} layer${o!==1?"s":""}</span>
          <span class="issue-grouped-nodes-arrow">\u25B6</span>
        </button>
        <div class="issue-grouped-nodes-list" style="display: none;">
          ${g}
        </div>
      </div>
      ${a}
      <div class="issue-grouped-actions">
        <button class="btn-select-all" data-group-key="${p(e.key)}">${o>1?"Select All":"Select"}</button>
        ${i?`<button class="btn-style-dropdown-all" data-group-key="${p(e.key)}">Select Style</button>`:""}
        <button class="btn-remove-layer-all" data-group-key="${p(e.key)}">${o>1?"Remove All":"Remove"}</button>
      </div>
    `;let d=t.querySelector(".issue-grouped-nodes-toggle"),v=t.querySelector(".issue-grouped-nodes-list"),f=t.querySelector(".issue-grouped-nodes-arrow");d&&v&&(d.onclick=()=>{let u=v.style.display==="none";v.style.display=u?"block":"none",f&&(f.textContent=u?"\u25BC":"\u25B6")}),t.querySelectorAll(".issue-grouped-node-item").forEach(u=>{u.onclick=()=>{let k=u.getAttribute("data-node-id");k&&(parent.postMessage({pluginMessage:{type:"focus-node",id:k}},"*"),t.querySelectorAll(".issue-grouped-node-item").forEach(S=>S.classList.remove("active")),u.classList.add("active"))}});let y=t.querySelector(".btn-select-all");if(y&&(y.onclick=()=>{let u=e.issues.map(k=>k.id);parent.postMessage({pluginMessage:{type:"select-nodes",ids:u}},"*")}),i){let u=t.querySelector(".btn-suggest-fix-all");u&&(u.onclick=S=>{S.preventDefault(),S.stopPropagation(),go(e)});let k=t.querySelector(".btn-style-dropdown-all");k&&(k.onclick=S=>{S.preventDefault(),S.stopPropagation(),parent.postMessage({pluginMessage:{type:"get-figma-text-styles",issueId:e.issues[0].id}},"*"),window.pendingTypographyCheckIssue=e.issues[0],window.pendingTypographyCheckGroup=e})}let m=t.querySelector(".btn-remove-layer-all");return m&&(m.onclick=u=>{u.preventDefault(),u.stopPropagation(),confirm(`Remove ${o} layer(s)?`)&&e.issues.forEach(k=>{parent.postMessage({pluginMessage:{type:"remove-layer",id:k.id}},"*")})}),t}function Fn(e){let t=document.createElement("div");t.className=`issue-grouped-card ${e.severity}`,t.setAttribute("data-group-key",e.key),t.setAttribute("data-issue-count",e.issues.length),t.setAttribute("data-severity",e.severity);let o=e.nodeProps||{},l=e.issues.length,n=[o.fontFamily||"",o.fontWeight||""].filter(Boolean).join(" "),s=[o.fontSize!=null?`${o.fontSize}`:"",o.lineHeight||""].filter(Boolean).join("/"),i=null;if(K&&K.length>0){let S=E=>E==null?"":String(E).toLowerCase().trim(),$=0;for(let E of K){let M=0;if(S(o.fontFamily)===S(E.fontFamily)&&(M+=25),o.fontSize!=null&&E.fontSize){let B=Math.abs(o.fontSize-E.fontSize);B===0?M+=30:B<=2?M+=25:B<=4?M+=20:B<=8&&(M+=10)}S(o.fontWeight)===S(E.fontWeight)&&(M+=20),S(o.lineHeight)===S(E.lineHeight)&&(M+=15);let F=S(o.letterSpacing),P=S(E.letterSpacing||"0"),G=B=>B===""||B==="0"||B==="0px"||B==="0%";(G(F)&&G(P)||F===P)&&(M+=10),M>$&&($=M,i={name:E.name,percentage:M,styleId:E.styleId})}}!i&&e.bestMatch&&e.bestMatch.name&&(i={name:e.bestMatch.name,percentage:e.bestMatch.percentage||0});let a="";if(i&&i.name){let S=i.percentage||0;a=`
        <div class="issue-grouped-suggestion">
          <span class="issue-grouped-suggestion-label">Suggestion</span>
          <div class="issue-grouped-suggestion-item">
            <span class="issue-grouped-suggestion-preview">Ag</span>
            <span class="issue-grouped-suggestion-name">${p(i.name)}</span>
            <span class="issue-grouped-suggestion-pct">(${S}%)</span>
            <button class="btn-suggest-fix-all" data-group-key="${p(e.key)}">${l>1?"Apply All":"Apply"}</button>
          </div>
        </div>
      `}let c=e.issues.map((S,$)=>{let E=S.nodeName||S.textPreview||`Node ${$+1}`;return`<div class="issue-grouped-node-item" data-node-id="${S.id}" title="${p(E)}">
        <span class="issue-grouped-node-name">${p(E)}</span>
      </div>`}).join("");t.innerHTML=`
      <div class="issue-grouped-header">
        <div class="issue-grouped-props">
          <span class="issue-grouped-font">${p(n)}</span>
          ${s?`<span class="issue-grouped-size">${p(s)}</span>`:""}
        </div>
      </div>
      <div class="issue-grouped-nodes">
        <button class="issue-grouped-nodes-toggle" type="button">
          <span class="issue-grouped-count">${l} layer${l!==1?"s":""}</span>
          <span class="issue-grouped-nodes-arrow">\u25B6</span>
        </button>
        <div class="issue-grouped-nodes-list" style="display: none;">
          ${c}
        </div>
      </div>
      ${a}
      <div class="issue-grouped-actions">
        <button class="btn-select-all" data-group-key="${p(e.key)}">${l>1?"Select All":"Select"}</button>
        <button class="btn-style-dropdown-all" data-group-key="${p(e.key)}">Select Style</button>
        <button class="btn-create-style-all btn-suggest-fix" data-group-key="${p(e.key)}">Create Style</button>
        <button class="btn-remove-layer-all" data-group-key="${p(e.key)}">${l>1?"Remove All":"Remove"}</button>
      </div>
    `;let g=t.querySelector(".issue-grouped-nodes-toggle"),d=t.querySelector(".issue-grouped-nodes-list"),v=t.querySelector(".issue-grouped-nodes-arrow");g&&d&&(g.onclick=()=>{let S=d.style.display==="none";d.style.display=S?"block":"none",v&&(v.textContent=S?"\u25BC":"\u25B6")}),t.querySelectorAll(".issue-grouped-node-item").forEach(S=>{S.onclick=()=>{let $=S.getAttribute("data-node-id");$&&(parent.postMessage({pluginMessage:{type:"select-node",id:$}},"*"),t.querySelectorAll(".issue-grouped-node-item").forEach(E=>E.classList.remove("active")),S.classList.add("active"))}});let f=t.querySelector(".btn-select-all");f&&(f.onclick=()=>{let S=e.issues.map($=>$.id);parent.postMessage({pluginMessage:{type:"select-nodes",ids:S}},"*")});let y=t.querySelector(".btn-suggest-fix-all");y&&(y.onclick=S=>{S.preventDefault(),S.stopPropagation(),go(e)});let m=t.querySelector(".btn-style-dropdown-all");m&&(m.onclick=S=>{S.preventDefault(),S.stopPropagation(),parent.postMessage({pluginMessage:{type:"get-figma-text-styles",issueId:e.issues[0].id}},"*"),window.pendingTypographyCheckIssue=e.issues[0],window.pendingTypographyCheckGroup=e});let u=t.querySelector(".btn-create-style-all");u&&(u.onclick=S=>{S.preventDefault(),S.stopPropagation(),typeof Fo=="function"&&Fo("typography-style",e.issues)});let k=t.querySelector(".btn-remove-layer-all");return k&&(k.onclick=S=>{S.preventDefault(),S.stopPropagation(),confirm(`Remove ${l} layer(s)?`)&&e.issues.forEach($=>{parent.postMessage({pluginMessage:{type:"remove-layer",id:$.id}},"*")})}),t}function go(e){if(!e||!e.issues||e.issues.length===0)return;let t=e.issues[0];Xt(t,null,{batchGroup:e,onApply:null})}function An(e){let t=document.createElement("div");t.className=`issue-grouped-card ${e.severity}`,t.setAttribute("data-group-key",e.key),t.setAttribute("data-issue-count",e.issues.length),t.setAttribute("data-severity",e.severity);let o=e.issues.length,l=e.colorHex||"#000000",n=e.colorTarget||"fill",s=n==="stroke"?"Stroke":n==="effect"?"Effect":"Fill",i=e.matchingVariable,a=e.type==="color-variable",g=(e.issues[0]&&e.issues[0].message||"").replace(/ on "[^"]*"/g,"").replace(/ on '[^']*'/g,"").trim(),d=e.issues.map((M,F)=>{let P=M.nodeName||`Node ${F+1}`;return`<div class="issue-grouped-node-item" data-node-id="${M.id}" title="${p(P)}">
        <span class="issue-grouped-node-name">${p(P)}</span>
      </div>`}).join(""),v="";a&&i&&i.name&&(v=`
        <div class="issue-grouped-suggestion">
          <span class="issue-grouped-suggestion-label">Matching Variable</span>
          <div class="issue-grouped-suggestion-item">
            <span class="issue-grouped-color-swatch" style="background:${l};"></span>
            <span class="issue-grouped-suggestion-name">${p(i.name)}</span>
            <button class="btn-suggest-fix-all btn-bind-all" data-group-key="${p(e.key)}">${o>1?"Bind All":"Bind"}</button>
          </div>
        </div>
      `);let f=`<button class="btn-select-all" data-group-key="${p(e.key)}">${o>1?"Select All":"Select"}</button>`;f+=`<button class="btn-style-dropdown-all btn-select-variable-all" data-group-key="${p(e.key)}">Select Variable</button>`,f+=`<button class="btn-remove-layer-all" data-group-key="${p(e.key)}">${o>1?"Remove All":"Remove"}</button>`,t.innerHTML=`
      <div class="issue-grouped-header">
        <div class="issue-grouped-props">
          <span class="issue-grouped-color-swatch" style="background:${l};"></span>
          <span class="issue-grouped-font">${p(l)}</span>
          <span class="issue-grouped-size">${p(s)}</span>
        </div>
        ${g?`<div class="issue-body" style="margin-top:4px;">${p(g)}</div>`:""}
      </div>
      <div class="issue-grouped-nodes">
        <button class="issue-grouped-nodes-toggle" type="button">
          <span class="issue-grouped-count">${o} layer${o!==1?"s":""}</span>
          <span class="issue-grouped-nodes-arrow">\u25B6</span>
        </button>
        <div class="issue-grouped-nodes-list" style="display: none;">
          ${d}
        </div>
      </div>
      ${v}
      <div class="issue-grouped-actions">
        ${f}
      </div>
    `;let y=t.querySelector(".issue-grouped-nodes-toggle"),m=t.querySelector(".issue-grouped-nodes-list"),u=t.querySelector(".issue-grouped-nodes-arrow");y&&m&&(y.onclick=()=>{let M=m.style.display==="none";m.style.display=M?"block":"none",u&&(u.textContent=M?"\u25BC":"\u25B6")}),t.querySelectorAll(".issue-grouped-node-item").forEach(M=>{M.onclick=()=>{let F=M.getAttribute("data-node-id");F&&(parent.postMessage({pluginMessage:{type:"focus-node",id:F}},"*"),t.querySelectorAll(".issue-grouped-node-item").forEach(P=>P.classList.remove("active")),M.classList.add("active"))}});let k=t.querySelector(".btn-select-all");k&&(k.onclick=()=>{let M=e.issues.map(F=>F.id);parent.postMessage({pluginMessage:{type:"select-nodes",ids:M}},"*")});let S=t.querySelector(".btn-bind-all");S&&i&&i.id&&(S.onclick=M=>{if(M.preventDefault(),M.stopPropagation(),e.issues.some(G=>G.colorOpacity&&G.colorOpacity<1)&&!confirm("Some layers have opacity < 100%. Binding a variable will reset opacity. Continue?"))return;let P=e.issues.map(G=>({id:G.id,colorTarget:G.colorTarget,fillIndex:G.fillIndex,strokeIndex:G.strokeIndex}));ae(e.issues[0].id,`\u23F3 Binding "${i.name}" to ${o} layer(s)...`,!0),parent.postMessage({pluginMessage:{type:"bind-color-variable-batch",issues:P,variableId:i.id,variableName:i.name}},"*")});let $=t.querySelector(".btn-select-variable-all");$&&($.onclick=M=>{M.preventDefault(),M.stopPropagation(),No(e.issues[0],{batchGroup:e})});let E=t.querySelector(".btn-remove-layer-all");return E&&(E.onclick=M=>{M.preventDefault(),M.stopPropagation(),confirm(`Remove ${o} layer(s)?`)&&e.issues.forEach(F=>{parent.postMessage({pluginMessage:{type:"remove-layer",id:F.id}},"*")})}),t}function Ln(e){let t=St(e);if(!t){alert("No suitable color match found");return}let l=(e.message||"").match(/Color (#[0-9A-Fa-f]{6})/),n=l?l[1].toUpperCase():null;Wt(e,n,t,J)}function Hn(e){let t=kt(e);if(!t){alert("No suitable spacing match found");return}let o=e.message||"",l=o.match(/Padding\s+(\w+)\s+\((\d+)px\)/);if(!l){console.error("Cannot parse spacing issue message:",o),alert("Cannot determine spacing property from issue message. Message: "+o);return}let n=l[1],s=parseInt(l[2]);Dt(e,n,s,t)}function dt(e){return!e||e.type!=="autolayout"?null:{action:"enable-autolayout"}}function mo(e){if(!dt(e)){alert("Cannot suggest fix for this autolayout issue");return}qn(e)}function qn(e){let t=document.createElement("div");t.className="modal-overlay",t.id="autolayout-fix-confirm-modal-overlay";let o=document.createElement("div");o.className="modal-dialog",o.style.maxWidth="450px",o.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Confirm Auto Layout Enable</h2>
        <p class="modal-subtitle">Node: ${p(e.nodeName||"Unnamed")}</p>
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
    `,t.appendChild(o),document.body.appendChild(t);let l=o.querySelector("#autolayout-fix-confirm-cancel-btn"),n=o.querySelector("#autolayout-fix-confirm-apply-btn"),s=o.querySelector(".modal-close"),i=()=>{t.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{t.parentNode&&t.remove()},200)};l.onclick=i,s.onclick=i,t.onclick=a=>{a.target===t&&i()},n.onclick=()=>{i(),ae(e.id,"\u23F3 Enabling auto layout...",!0),parent.postMessage({pluginMessage:{type:"fix-autolayout-issue",issue:e}},"*")}}function Pn(e,t={}){let{onApply:o,onIgnore:l,onCancel:n,progress:s}=t,i=s?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${s.current}/${s.total}</div>`:"",a=document.createElement("div");a.className="modal-overlay",a.id="autolayout-fix-confirm-modal-overlay";let c=document.createElement("div");c.className="modal-dialog",c.style.maxWidth="450px",c.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Confirm Auto Layout Enable</h2>
        <p class="modal-subtitle">Node: ${p(e.nodeName||"Unnamed")}</p>
      </div>
      ${i}
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
    `,a.appendChild(c),document.body.appendChild(a);let g=c.querySelector("#autolayout-fix-cancel-btn"),d=c.querySelector("#autolayout-fix-apply-btn"),v=c.querySelector("#autolayout-fix-ignore-btn"),f=c.querySelector(".modal-close"),y=()=>{a.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{a.parentNode&&a.remove()},200)};g.onclick=()=>{y(),n&&n()},f.onclick=()=>{y(),n&&n()},a.onclick=m=>{m.target===a&&(y(),n&&n())},v.onclick=()=>{y(),l&&l()},d.onclick=()=>{y(),ae(e.id,"\u23F3 Enabling auto layout...",!0),parent.postMessage({pluginMessage:{type:"fix-autolayout-issue",issue:e}},"*"),o&&o()}}function Rn(e){return{action:"convert-group"}}function fo(e){if(!Rn(e)){alert("Cannot suggest fix for this group issue");return}Dn(e)}function Dn(e){let t=document.createElement("div");t.className="modal-overlay",t.id="group-fix-modal-overlay";let o=document.createElement("div");o.className="modal-dialog",o.style.maxWidth="450px",o.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Convert Group to Frame</h2>
        <p class="modal-subtitle">Node: ${p(e.nodeName||"Unnamed")}</p>
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
    `,t.appendChild(o),document.body.appendChild(t);let l=o.querySelector("#group-fix-cancel-btn"),n=o.querySelector(".modal-close"),s=o.querySelector("#group-fix-apply-btn"),i=()=>{t.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{t.parentNode&&t.remove()},200)};l.onclick=i,n.onclick=i,t.onclick=a=>{a.target===t&&i()},s.onclick=()=>{s.disabled=!0,s.textContent="Applying...",parent.postMessage({pluginMessage:{type:"fix-group-issue",issue:e}},"*"),i()}}function Wn(e,t={}){let{onApply:o,onIgnore:l,onCancel:n,progress:s}=t,i=s?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${s.current}/${s.total}</div>`:"",a=document.createElement("div");a.className="modal-overlay",a.id="group-fix-modal-overlay";let c=document.createElement("div");c.className="modal-dialog",c.style.maxWidth="450px",c.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Convert Group to Frame</h2>
        <p class="modal-subtitle">Node: ${p(e.nodeName||"Unnamed")}</p>
      </div>
      ${i}
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
    `,a.appendChild(c),document.body.appendChild(a);let g=c.querySelector("#group-fix-cancel-btn"),d=c.querySelector("#group-fix-apply-btn"),v=c.querySelector("#group-fix-ignore-btn"),f=c.querySelector(".modal-close"),y=()=>{a.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{a.parentNode&&a.remove()},200)};g.onclick=()=>{y(),n&&n()},f.onclick=()=>{y(),n&&n()},a.onclick=m=>{m.target===a&&(y(),n&&n())},v.onclick=()=>{y(),l&&l()},d.onclick=()=>{d.disabled=!0,d.textContent="Applying...",parent.postMessage({pluginMessage:{type:"fix-group-issue",issue:e}},"*"),y(),o&&o()}}function lt(e){return!e||e.type!=="position"?null:{action:"fix-position"}}function pt(e){return!e||e.type!=="duplicate"&&e.type!=="component"?null:{action:"suggest-component"}}function ut(e){return!e||e.type!=="empty-frame"?null:{action:"fix-empty-frame"}}function yo(e){if(!lt(e)){alert("Cannot suggest fix for this position issue");return}Un(e)}function ho(e){if(!ut(e)){alert("Cannot suggest fix for this empty frame issue");return}jn(e)}function Un(e){let t=e.message||"",o=t.match(/x:(-?\d+)/),l=t.match(/y:(-?\d+)/),n=o?parseInt(o[1],10):0,s=l?parseInt(l[1],10):0,i=document.createElement("div");i.className="modal-overlay",i.id="position-fix-confirm-modal-overlay";let a=document.createElement("div");a.className="modal-dialog",a.style.maxWidth="400px",a.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Fix Position Issue</h2>
        <p class="modal-subtitle">Node: ${p(e.nodeName||"Unnamed")}</p>
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
    `,i.appendChild(a),document.body.appendChild(i);let c=a.querySelector("#position-fix-confirm-cancel-btn"),g=a.querySelector("#position-fix-confirm-apply-btn"),d=a.querySelector(".modal-close"),v=()=>{i.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{i.parentNode&&i.remove()},200)};c.onclick=v,d.onclick=v,i.onclick=f=>{f.target===i&&v()},g.onclick=()=>{v(),ae(e.id,"\u23F3 Fixing position...",!0),parent.postMessage({pluginMessage:{type:"fix-position-issue",issue:e}},"*")}}function On(e,t={}){let{onApply:o,onIgnore:l,onCancel:n,progress:s}=t,i=s?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${s.current}/${s.total}</div>`:"",a=e.message||"",c=a.match(/x:(-?\d+)/),g=a.match(/y:(-?\d+)/),d=c?parseInt(c[1],10):0,v=g?parseInt(g[1],10):0,f=document.createElement("div");f.className="modal-overlay",f.id="position-fix-confirm-modal-overlay";let y=document.createElement("div");y.className="modal-dialog",y.style.maxWidth="400px",y.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Fix Position Issue</h2>
        <p class="modal-subtitle">Node: ${p(e.nodeName||"Unnamed")}</p>
      </div>
      ${i}
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <p style="margin-bottom: 12px; color: #666; font-size: 13px;">
            This layer has a negative position which may cause layout issues.
          </p>
          <div style="padding: 12px; background: #f5f5f5; border-radius: 6px; margin-bottom: 12px;">
            <div style="font-size: 12px; color: #666; margin-bottom: 8px;"><strong>Current Position:</strong></div>
            <div style="font-size: 11px; color: #666; padding-left: 8px; line-height: 1.6;">
              \u2022 X: <code>${d}px</code><br>
              \u2022 Y: <code>${v}px</code>
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
    `,f.appendChild(y),document.body.appendChild(f);let m=y.querySelector("#position-fix-cancel-btn"),u=y.querySelector("#position-fix-apply-btn"),k=y.querySelector("#position-fix-ignore-btn"),S=y.querySelector(".modal-close"),$=()=>{f.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{f.parentNode&&f.remove()},200)};m.onclick=()=>{$(),n&&n()},S.onclick=()=>{$(),n&&n()},f.onclick=E=>{E.target===f&&($(),n&&n())},k.onclick=()=>{$(),l&&l()},u.onclick=()=>{$(),ae(e.id,"\u23F3 Fixing position...",!0),parent.postMessage({pluginMessage:{type:"fix-position-issue",issue:e}},"*"),o&&o()}}function Ms(e){bo(e)}function Nt(e){bo(e)}function bo(e){let t=document.createElement("div");t.className="modal-overlay",t.id="remove-layer-confirm-modal-overlay";let o=document.createElement("div");o.className="modal-dialog",o.style.maxWidth="400px",o.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Remove Layer</h2>
        <p class="modal-subtitle">Node: ${p(e.nodeName||"Unnamed")}</p>
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
    `,t.appendChild(o),document.body.appendChild(t);let l=o.querySelector("#remove-layer-confirm-cancel-btn"),n=o.querySelector("#remove-layer-confirm-apply-btn"),s=o.querySelector(".modal-close"),i=()=>{t.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{t.parentNode&&t.remove()},200)};l.onclick=i,s.onclick=i,t.onclick=a=>{a.target===t&&i()},n.onclick=()=>{i(),ae(e.id,"\u23F3 Removing layer...",!0),parent.postMessage({pluginMessage:{type:"remove-layer",issue:e}},"*")}}function jn(e){let t=e.message||"",o=t.includes("Empty frame"),l=t.includes("redundant"),n=l?"Remove Redundant Frame":"Remove Empty Frame",s=l?"This will remove the redundant frame and keep its single child. The child will inherit the frame's name if it was unnamed.":"This will remove the empty frame. If it has a child, the child will be kept.",i=document.createElement("div");i.className="modal-overlay",i.id="empty-frame-fix-modal-overlay";let a=document.createElement("div");a.className="modal-dialog",a.style.maxWidth="450px",a.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">${n}</h2>
        <p class="modal-subtitle">Node: ${p(e.nodeName||"Unnamed")}</p>
      </div>
      <div class="modal-body">
        <p style="margin: 0 0 16px 0; color: #333; line-height: 1.5;">
          ${s}
        </p>
        <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current:</div>
          <div style="font-size: 13px; color: #333; font-weight: 500;">${p(e.message)}</div>
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
    `,document.body.appendChild(i),i.appendChild(a);let c=a.querySelector("#empty-frame-fix-cancel-btn"),g=a.querySelector(".modal-close"),d=a.querySelector("#empty-frame-fix-apply-btn"),v=()=>{i.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{i.parentNode&&i.remove()},200)};c.onclick=v,g.onclick=v,i.onclick=f=>{f.target===i&&v()},d.onclick=()=>{d.disabled=!0,d.textContent="Applying...",parent.postMessage({pluginMessage:{type:"fix-empty-frame-issue",issue:e}},"*"),v()}}function Vn(e,t={}){let{onApply:o,onIgnore:l,onCancel:n,progress:s}=t,i=s?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${s.current}/${s.total}</div>`:"",a=e.message||"",c=a.includes("Empty frame"),g=a.includes("redundant"),d=g?"Remove Redundant Frame":"Remove Empty Frame",v=g?"This will remove the redundant frame and keep its single child. The child will inherit the frame's name if it was unnamed.":"This will remove the empty frame. If it has a child, the child will be kept.",f=document.createElement("div");f.className="modal-overlay",f.id="empty-frame-fix-modal-overlay";let y=document.createElement("div");y.className="modal-dialog",y.style.maxWidth="450px",y.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">${d}</h2>
        <p class="modal-subtitle">Node: ${p(e.nodeName||"Unnamed")}</p>
      </div>
      ${i}
      <div class="modal-body">
        <p style="margin: 0 0 16px 0; color: #333; line-height: 1.5;">
          ${v}
        </p>
        <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current:</div>
          <div style="font-size: 13px; color: #333; font-weight: 500;">${p(e.message)}</div>
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
    `,document.body.appendChild(f),f.appendChild(y);let m=y.querySelector("#empty-frame-fix-cancel-btn"),u=y.querySelector("#empty-frame-fix-apply-btn"),k=y.querySelector("#empty-frame-fix-ignore-btn"),S=y.querySelector(".modal-close"),$=()=>{f.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{f.parentNode&&f.remove()},200)};m.onclick=()=>{$(),n&&n()},S.onclick=()=>{$(),n&&n()},f.onclick=E=>{E.target===f&&($(),n&&n())},k.onclick=()=>{$(),l&&l()},u.onclick=()=>{u.disabled=!0,u.textContent="Applying...",parent.postMessage({pluginMessage:{type:"fix-empty-frame-issue",issue:e}},"*"),$(),o&&o()}}function vo(e){if(console.log("handleSuggestFixComponent called",e),!e||!e.id){console.error("Invalid issue in handleSuggestFixComponent",e),alert("Error: Invalid issue data");return}window.pendingComponentIssue=e,console.log("Stored pendingComponentIssue:",window.pendingComponentIssue);let t=document.querySelector(`.issue[data-issue-id="${e.id}"]`);if(t){let o=t.querySelector("button.btn-suggest-fix");if(o){let l=o.textContent;o.disabled=!0,o.textContent="Loading...",o.style.opacity="0.6",o.style.cursor="wait",o.dataset.originalText=l}}console.log("Sending get-components-for-issue message",{issueId:e.id,issue:e}),parent.postMessage({pluginMessage:{type:"get-components-for-issue",issue:e}},"*")}function xo(e){if(console.log("handleSelectComponent called",e),!e||!e.id){console.error("Invalid issue in handleSelectComponent",e),alert("Error: Invalid issue data");return}window.pendingSelectComponentIssue=e,console.log("Stored pendingSelectComponentIssue:",window.pendingSelectComponentIssue);let t=document.querySelector(`.issue[data-issue-id="${e.id}"]`);if(t){let o=t.querySelector("button.btn-select-component");if(o){let l=o.textContent;o.disabled=!0,o.textContent="Loading...",o.style.opacity="0.6",o.dataset.originalText=l}}console.log("Sending get-all-components message",{issueId:e.id,issue:e}),parent.postMessage({pluginMessage:{type:"get-all-components",issue:e}},"*")}function So(e){_n(e)}function ko(e){Gn(e)}function Gn(e){let t=document.createElement("div");t.className="modal-overlay",t.id="rename-modal-overlay";let o=document.createElement("div");o.className="modal-dialog",o.style.maxWidth="400px";let l=e.nodeName||"",n=l.replace(/^(Frame|Group)\s*/i,"").trim()||"";o.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Rename Node</h2>
        <p class="modal-subtitle">Current: ${p(l)}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 8px; font-size: 13px; font-weight: 600; color: #333;">New Name:</label>
          <input type="text" id="rename-input" placeholder="Enter meaningful name" style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px;" value="${p(n)}" autocomplete="off">
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 12px;">
          Enter a meaningful name that describes the purpose of this layer (e.g., "Header", "Button", "Card").
        </p>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="rename-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="rename-apply-btn">Rename</button>
      </div>
    `,t.appendChild(o),document.body.appendChild(t);let s=o.querySelector("#rename-cancel-btn"),i=o.querySelector("#rename-apply-btn"),a=o.querySelector(".modal-close"),c=o.querySelector("#rename-input");setTimeout(()=>{c.focus(),c.select()},100);let g=()=>{t.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{t.parentNode&&t.remove()},200)};s.onclick=g,a.onclick=g,t.onclick=d=>{d.target===t&&g()},c.addEventListener("keydown",d=>{d.key==="Enter"&&(d.preventDefault(),i.click())}),i.onclick=()=>{let d=c.value.trim();if(!d){alert("Please enter a name"),c.focus();return}if(/^(Frame|Group)\s*$/i.test(d)&&!confirm("The name still contains default naming (Frame/Group). Do you want to continue?")){c.focus();return}g(),ae(e.id,"\u23F3 Renaming...",!0),parent.postMessage({pluginMessage:{type:"rename-node",issue:e,newName:d}},"*")}}function _n(e){let t=document.createElement("div");t.className="modal-overlay",t.id="create-component-modal-overlay";let o=document.createElement("div");o.className="modal-dialog",o.style.maxWidth="400px",o.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Create New Component</h2>
        <p class="modal-subtitle">Node: ${p(e.nodeName||"Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 8px; font-size: 13px; font-weight: 600; color: #333;">Component Name:</label>
          <input type="text" id="create-component-name-input" placeholder="Enter component name" style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px;" value="${p(e.nodeName||"")}">
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 12px;">
          This will convert the frame to a component and replace all duplicate frames with instances of this component.
        </p>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="create-component-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="create-component-apply-btn">Create</button>
      </div>
    `,t.appendChild(o),document.body.appendChild(t);let l=o.querySelector("#create-component-cancel-btn"),n=o.querySelector("#create-component-apply-btn"),s=o.querySelector(".modal-close"),i=o.querySelector("#create-component-name-input");setTimeout(()=>i.focus(),100);let a=()=>{t.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{t.parentNode&&t.remove()},200)};l.onclick=a,s.onclick=a,t.onclick=c=>{c.target===t&&a()},n.onclick=()=>{let c=i.value.trim();if(!c){alert("Please enter a component name");return}a(),ae(e.id,"\u23F3 Creating component...",!0),parent.postMessage({pluginMessage:{type:"create-component-from-issue",issue:e,componentName:c}},"*")}}function Yn(e,t){if(console.log("[showComponentSuggestModal] Called with",{issue:e,similarComponents:t}),!t||t.length===0){console.warn("[showComponentSuggestModal] No similar components provided"),alert("No similar components found.");return}let o=t[0];console.log("[showComponentSuggestModal] Using best match:",o),wo(e,o,"This is the most similar component found.")}function Jn(e,t){if(console.log("[showComponentSelectModal] Called with",{issue:e,components:t}),!t||t.length===0){console.warn("[showComponentSelectModal] No components provided"),alert("No components available.");return}let o=document.createElement("div");o.className="modal-overlay",o.id="component-select-modal-overlay";let l=document.createElement("div");l.className="modal-dialog",l.style.maxWidth="500px";let n=t.map(m=>`
        <div class="component-picker-item" data-component-id="${m.id}" data-component-name="${p(m.name.toLowerCase())}" style="
          padding: 12px;
          margin-bottom: 8px;
          border: 2px solid #ddd;
          border-radius: 8px;
          cursor: pointer;
          background: white;
          transition: all 0.2s;
        " onmouseover="this.style.borderColor='#0071e3'; this.style.boxShadow='0 2px 8px rgba(0,113,227,0.2)'" onmouseout="this.style.borderColor='#ddd'; this.style.boxShadow='none'">
          <div style="font-weight: 600; font-size: 12px; color: #333;">${p(m.name)}</div>
          <div style="font-size: 11px; color: #666; margin-top: 4px;">
            ${m.description||"Component"}
          </div>
        </div>
      `).join(""),s=t.length>5,i=s?`
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
        <p class="modal-subtitle">Node: ${p(e.nodeName||"Unnamed")}</p>
      </div>
      <div class="modal-body">
        ${i}
        <div id="component-list-container" style="max-height: 400px; overflow-y: auto;">
          ${n}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="component-select-cancel-btn">Cancel</button>
      </div>
    `,o.appendChild(l),document.body.appendChild(o),console.log("[showComponentSelectModal] Modal added to DOM"),console.log("[showComponentSelectModal] Overlay element:",o),console.log("[showComponentSelectModal] Dialog element:",l),o.style.display="flex",o.style.opacity="1",o.style.zIndex="10000";let a=l.querySelector("#component-select-cancel-btn"),c=l.querySelector(".modal-close"),g=l.querySelectorAll(".component-picker-item"),d=l.querySelector("#component-search-input"),v=l.querySelector("#component-list-container"),f=l.querySelector("#component-search-results-count");console.log("[showComponentSelectModal] Found",g.length,"component items"),console.log("[showComponentSelectModal] Cancel button:",a,"Close button:",c),d&&s&&(d.addEventListener("input",m=>{let u=m.target.value.toLowerCase().trim(),k=0;g.forEach(S=>{let $=S.getAttribute("data-component-name")||"";u===""||$.includes(u)?(S.style.display="block",k++):S.style.display="none"}),f&&(u!==""?(f.textContent=`Showing ${k} of ${t.length} components`,f.style.display="block"):f.style.display="none")}),setTimeout(()=>d.focus(),100));let y=()=>{console.log("[showComponentSelectModal] Closing modal"),o.style.animation="fadeIn 0.2s ease-out reverse",o.style.opacity="0",setTimeout(()=>{o.parentNode&&(o.remove(),console.log("[showComponentSelectModal] Modal removed from DOM"))},200)};a?a.onclick=m=>{m.preventDefault(),m.stopPropagation(),y()}:console.error("[showComponentSelectModal] Cancel button not found!"),c?c.onclick=m=>{m.preventDefault(),m.stopPropagation(),y()}:console.error("[showComponentSelectModal] Close button not found!"),o.onclick=m=>{m.target===o&&y()},g.forEach((m,u)=>{m.onclick=k=>{k.preventDefault(),k.stopPropagation(),console.log("[showComponentSelectModal] Component item clicked",u);let S=m.getAttribute("data-component-id");console.log("[showComponentSelectModal] Component ID:",S);let $=t.find(E=>E.id===S);console.log("[showComponentSelectModal] Found component:",$),$?(y(),wo(e,$,null)):console.error("[showComponentSelectModal] Component not found for ID:",S)}}),setTimeout(()=>{o.style.animation="fadeIn 0.2s ease-out",o.style.opacity="1",console.log("[showComponentSelectModal] Animation triggered, overlay visible:",o.offsetParent!==null)},10),console.log("[showComponentSelectModal] Modal setup complete")}function wo(e,t,o){let l=document.createElement("div");l.className="modal-overlay",l.id="component-apply-confirm-modal-overlay";let n=document.createElement("div");n.className="modal-dialog",n.style.maxWidth="400px",n.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Apply Component</h2>
        <p class="modal-subtitle">Node: ${p(e.nodeName||"Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <p style="margin-bottom: 12px; color: #666; font-size: 13px;">
            This will replace the frame with an instance of the selected component.
          </p>
          <div style="padding: 12px; background: #e3f2fd; border-radius: 6px;">
            <div style="font-size: 12px; color: #1976d2; margin-bottom: 8px;"><strong>Selected Component:</strong></div>
            <div style="font-size: 14px; color: #333; font-weight: 600;">${p(t.name)}</div>
            ${t.description?`<div style="font-size: 11px; color: #666; margin-top: 4px;">${p(t.description)}</div>`:""}
          </div>
          ${o?`<p style="color: #666; font-size: 12px; margin-top: 12px;">${p(o)}</p>`:""}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="component-apply-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="component-apply-apply-btn">Apply</button>
      </div>
    `,l.appendChild(n),document.body.appendChild(l);let s=n.querySelector("#component-apply-cancel-btn"),i=n.querySelector("#component-apply-apply-btn"),a=n.querySelector(".modal-close"),c=()=>{l.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{l.parentNode&&l.remove()},200)};s.onclick=c,a.onclick=c,l.onclick=g=>{g.target===l&&c()},i.onclick=()=>{c(),ae(e.id,"\u23F3 Applying component...",!0),parent.postMessage({pluginMessage:{type:"apply-component-to-issue",issue:e,componentId:t.id}},"*")}}function it(e){if(!e||!e.fontSize)return null;let t=e.fontSize,o=14,l=document.getElementById("font-size-scale");if(l&&l.value.trim()){let n=l.value.split(",").map(s=>parseInt(s.trim(),10)).filter(s=>!isNaN(s)&&s>=o).sort((s,i)=>s-i);if(n.length>0){let s=null,i=1/0;n.forEach(c=>{if(c>=o){let g=Math.abs(c-t);g<i&&(i=g,s=c)}});let a=Math.max(t*.5,10);if(s&&i<=a)return s}}return t<o?o:null}function gt(e){if(!e||!e.textColor||!e.backgroundColor)return null;let t=e.textColor.toUpperCase(),o=e.backgroundColor.toUpperCase(),l=e.minContrast||4.5,n=document.getElementById("color-scale");if(!n||!n.value.trim())return null;let s=n.value.split(",").map(g=>g.trim().toUpperCase()).filter(g=>g&&g.startsWith("#"));if(s.length===0)return null;let i=null,a=0,c=1/0;return s.forEach(g=>{let d=Rt(g,o);if(d>=l){let v=Pt(t,g);(d>a||d===a&&v<c)&&(a=d,i=g,c=v)}}),i}function Co(e,t){if(!t||t.length===0){alert("No text styles found in Figma. Please create text styles first.");return}let o=document.createElement("div");o.className="modal-overlay",o.id="text-style-picker-typography-modal-overlay";let l=document.createElement("div");l.className="modal-dialog",l.style.maxWidth="500px";let n=e.nodeProps||{},s=n.fontFamily||"Unknown",i=n.fontSize!==null&&n.fontSize!==void 0?n.fontSize:null,a=i!==null?`${i}px`:"Unknown",c=n.fontWeight||"Unknown",g=n.lineHeight||"Unknown",d=n.letterSpacing!==null&&n.letterSpacing!==void 0?n.letterSpacing:"Unknown",v=null;e.bestMatch&&e.bestMatch.name&&(v=e.bestMatch.name);let f=B=>{if(B==null||B==="Unknown")return"";let C=String(B).toLowerCase().trim(),x=C.match(/^([+-]?\d*\.?\d+)(px|%)?$/);if(x){let N=parseFloat(x[1]);if(Math.abs(N)<1e-6)return"0";let j=x[2]||"px";return`${Math.round(N*100)/100}${j}`}return C},y=B=>{let C=`picker_${f(s)}_${i}_${f(c)}_${f(g)}_${f(d)}_${B.id}`;return fe(C,()=>{let x=0;if(f(s)===f(B.fontFamily)&&(x+=25),i!==null&&B.fontSize){let N=Math.abs(i-B.fontSize);N===0?x+=30:N<=2?x+=25:N<=4?x+=20:N<=8&&(x+=10)}return f(c)===f(B.fontWeight)&&(x+=20),f(g)===f(B.lineHeight)&&(x+=15),f(d)===f(B.letterSpacing||"0")&&(x+=10),x})},m=[...t].sort((B,C)=>y(C)-y(B));m.length>0&&(v=m[0].name);let u=(B,C)=>f(B)!==f(C),k=B=>{let C=v===B.name,x=y(B),N=u(s,B.fontFamily),j=u(a,`${B.fontSize}px`),oe=u(c,B.fontWeight),ke=u(g,B.lineHeight),he=u(d,B.letterSpacing||"0"),Te="color: #155724;",Ee="color: #721c24; background: #f8d7da; padding: 1px 4px; border-radius: 3px; font-weight: 600;";return`
        <div class="style-picker-item" data-style-id="${B.id}" data-style-name="${p(B.name)}" data-font-size="${B.fontSize}" data-similarity="${x}" style="
          padding: 12px;
          margin-bottom: 8px;
          border: 1px solid ${C?"#0071e3":"#ddd"};
          border-radius: 8px;
          cursor: pointer;
          background: white;
          transition: all 0.2s;
        " onmouseover="this.style.borderColor='#0071e3'; this.style.boxShadow='0 2px 8px rgba(0,113,227,0.2)'" onmouseout="this.style.borderColor='${C?"#0071e3":"#ddd"}'; this.style.boxShadow='none'">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
            <div>
              <div style="font-weight: 600; font-size: 12px; color: #333;">${p(B.name)} ${C?"\u2B50":""}</div>
              <div style="font-size: 11px; color: #666; margin-top: 4px;">
                ${p(B.fontFamily)} ${B.fontSize}px ${p(B.fontWeight)}
              </div>
            </div>
            <div style="text-align: right;">
              ${C?'<div style="color: #0071e3; font-weight: 600; font-size: 11px;">Best Match</div>':""}
              <div style="color: #666; font-size: 10px; margin-top: 2px;">${x}% match</div>
            </div>
          </div>
          <div style="font-size: 11px; color: #666; padding-top: 8px; border-top: 1px solid #eee;">
            <div style="margin-bottom: 4px;"><strong>Details:</strong></div>
            <div style="padding-left: 8px; line-height: 1.8;">
              \u2022 Font Family: <code style="${N?Ee:Te}">${N?"\u26A0 ":"\u2713 "}${p(B.fontFamily)}</code><br>
              \u2022 Font Size: <code style="${j?Ee:Te}">${j?"\u26A0 ":"\u2713 "}${B.fontSize}px</code><br>
              \u2022 Font Weight: <code style="${oe?Ee:Te}">${oe?"\u26A0 ":"\u2713 "}${p(B.fontWeight)}</code><br>
              \u2022 Line Height: <code style="${ke?Ee:Te}">${ke?"\u26A0 ":"\u2713 "}${p(B.lineHeight)}</code><br>
              \u2022 Letter Spacing: <code style="${he?Ee:Te}">${he?"\u26A0 ":"\u2713 "}${p(B.letterSpacing||"0")}</code>
            </div>
          </div>
        </div>
      `},S=m.map(B=>k(B)).join("");l.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Choose Text Style</h2>
        <p class="modal-subtitle">Node: ${p(e.nodeName||"Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;"><strong>Current Properties:</strong></div>
          <div style="font-size: 11px; color: #666; padding-left: 8px; line-height: 1.6;">
            \u2022 Font Family: <code>${p(s)}</code><br>
            \u2022 Font Size: <code>${p(a)}</code><br>
            \u2022 Font Weight: <code>${p(c)}</code><br>
            \u2022 Line Height: <code>${p(g)}</code><br>
            \u2022 Letter Spacing: <code>${p(d)}</code>
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
          ${S}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="text-style-picker-typography-modal-cancel-btn">Cancel</button>
      </div>
    `,o.appendChild(l),document.body.appendChild(o);let $=l.querySelector("#text-style-picker-typography-modal-cancel-btn"),E=l.querySelector(".modal-close"),M=l.querySelector("#style-search-input"),F=l.querySelector("#style-list-container"),P=()=>{o.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{o.parentNode&&o.remove()},200)};$.onclick=P,E.onclick=P,o.onclick=B=>{B.target===o&&P()},M.oninput=B=>{let C=B.target.value.toLowerCase().trim(),x=m.filter(N=>N.name.toLowerCase().includes(C));F.innerHTML=x.map(N=>k(N)).join(""),G()};let G=()=>{l.querySelectorAll(".style-picker-item").forEach(C=>{C.onclick=x=>{x.preventDefault(),x.stopPropagation();let N=C.getAttribute("data-style-id"),j=t.find(oe=>oe.id===N);j&&(o.style.display="none",Xn(e,j,o))}})};G(),setTimeout(()=>{M.focus()},100)}function Xn(e,t,o){let l=document.createElement("div");l.className="modal-overlay",l.id="typography-style-confirm-modal-overlay";let n=document.createElement("div");n.className="modal-dialog",n.style.maxWidth="500px";let s=e.nodeProps||{},i=s.fontFamily||"Unknown",a=s.fontSize!==null&&s.fontSize!==void 0?`${s.fontSize}px`:"Unknown",c=s.fontWeight||"Unknown",g=s.lineHeight||"Unknown",d=s.letterSpacing!==null&&s.letterSpacing!==void 0?s.letterSpacing:"Unknown";n.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Confirm Text Style Application</h2>
        <p class="modal-subtitle">Node: ${p(e.nodeName||"Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">Apply Text Style:</div>
          <div style="padding: 12px; background: #e3f2fd; border-left: 3px solid #0071e3; border-radius: 6px;">
            <div style="font-weight: 600; font-size: 16px; color: #333; margin-bottom: 8px;">${p(t.name)}</div>
            <div style="font-size: 12px; color: #666; line-height: 1.6;">
              \u2022 Font Family: <code>${p(t.fontFamily)}</code><br>
              \u2022 Font Size: <code>${t.fontSize}px</code><br>
              \u2022 Font Weight: <code>${p(t.fontWeight)}</code><br>
              \u2022 Line Height: <code>${p(t.lineHeight)}</code><br>
              \u2022 Letter Spacing: <code>${p(t.letterSpacing||"0")}</code>
            </div>
          </div>
        </div>
        <div style="padding: 12px; background: #f5f5f5; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;"><strong>Current Properties:</strong></div>
          <div style="font-size: 11px; color: #666; padding-left: 8px; line-height: 1.6;">
            \u2022 Font Family: <code>${p(i)}</code><br>
            \u2022 Font Size: <code>${p(a)}</code><br>
            \u2022 Font Weight: <code>${p(c)}</code><br>
            \u2022 Line Height: <code>${p(g)}</code><br>
            \u2022 Letter Spacing: <code>${p(d)}</code>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="typography-style-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="typography-style-confirm-apply-btn" style="background: #22c55e; border-color: #22c55e;">Apply</button>
      </div>
    `,l.appendChild(n),document.body.appendChild(l);let v=n.querySelector("#typography-style-confirm-cancel-btn"),f=n.querySelector("#typography-style-confirm-apply-btn"),y=n.querySelector(".modal-close"),m=()=>{l.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{l.parentNode&&l.remove(),o&&o.parentNode&&(o.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{o.parentNode&&o.remove()},200))},200)},u=()=>{l.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{l.parentNode&&l.remove(),o&&(o.style.display="flex")},200)};v.onclick=u,y.onclick=u,l.onclick=k=>{k.target===l&&u()},f.onclick=()=>{m();let k=window.pendingTypographyCheckGroup;k&&k.issues&&k.issues.length>1?(k.issues.forEach(S=>{ae(S.id,"\u23F3 Applying style...",!0),Zt(S,t)}),window.pendingTypographyCheckGroup=null):(ae(e.id,"\u23F3 Applying style...",!0),Zt(e,t))}}function Zn(e,t){let o=t.filter(d=>d.fontSize>=14);if(o.length===0){let d=it(e);d?Bt(e,e.fontSize||12,d,null,null):alert("No text styles found with fontSize >= 14px. Please add font sizes to Font Size input or create text styles in Figma.");return}let l=document.createElement("div");l.className="modal-overlay",l.id="text-style-picker-modal-overlay";let n=document.createElement("div");n.className="modal-dialog",n.style.maxWidth="400px";let s=o.map(d=>`
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
            <div style="font-weight: 600; font-size: 12px; color: #333;">${p(d.name)}</div>
            <div style="font-size: 10px; color: #666; margin-top: 4px;">
              ${p(d.fontFamily)} ${p(d.fontSize)}px ${p(d.fontWeight)}
            </div>
          </div>
          <div style="color: #22c55e; font-weight: 600; font-size: 12px;">\u2713 ADA</div>
        </div>
      `).join("");n.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Choose Text Style</h2>
        <p class="modal-subtitle">Node: ${p(e.nodeName||"Unnamed")} - Select style with fontSize >= 14px</p>
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
    `,l.appendChild(n),document.body.appendChild(l);let i=n.querySelector("#text-style-picker-modal-cancel-btn"),a=n.querySelector(".modal-close"),c=n.querySelectorAll(".style-picker-item"),g=()=>{l.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{l.parentNode&&l.remove()},200)};i.onclick=g,a.onclick=g,l.onclick=d=>{d.target===l&&g()},c.forEach(d=>{d.onclick=v=>{v.preventDefault(),v.stopPropagation();let f=d.getAttribute("data-style-id"),y=parseInt(d.getAttribute("data-font-size")),m=o.find(u=>u.id===f);m&&(l.style.display="none",Bt(e,e.fontSize||12,y,l,m))}})}function Kn(e,t){let o=document.getElementById("color-scale"),l=o&&o.value.trim()?o.value.split(",").map(u=>u.trim().toUpperCase()).filter(u=>u&&u.startsWith("#")):[],n=[];if(t.filter(u=>u.source==="variable").forEach(u=>{n.push({source:"Variable",name:u.name,hex:u.hex,id:u.id,variable:u.variable})}),t.filter(u=>u.source==="style").forEach(u=>{n.push({source:"Style",name:u.name,hex:u.hex,id:u.id,style:u.style})}),l.forEach(u=>{let k=J[u]||u;n.push({source:"Input",name:k,hex:u,id:null})}),n.length===0){alert("No colors available. Please add colors to Color input or create color styles/variables in Figma.");return}let s=e.backgroundColor||"#FFFFFF",i=e.minContrast||4.5,a=e.textColor||"#000000",c=document.createElement("div");c.className="modal-overlay",c.id="contrast-color-picker-modal-overlay";let g=document.createElement("div");g.className="modal-dialog",g.style.maxWidth="400px";let d=n.map(u=>{let k=Rt(u.hex,s),S=k>=i,$=S?"#22c55e":"#ddd",E=`${p(u.name)} <span style="font-size: 11px; color: #666;">(${p(u.source)})</span>`,M=`<span style="color: ${S?"#22c55e":"#ef4444"};">Contrast: ${k.toFixed(2)}:1 ${S?"\u2713":"\u2717"} (need >= ${i}:1)</span>`;return ro(u.hex,E,$,M)}).join("");g.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Choose Color</h2>
        <p class="modal-subtitle">Node: ${p(e.nodeName||"Unnamed")} - Select color that passes contrast</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current Text Color:</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 32px; height: 32px; border-radius: 4px; background: ${p(a)}; border: 1px solid #ddd;"></div>
            <div style="font-family: 'SF Mono', Monaco, monospace; font-size: 11px; font-weight: 600;">${p(a)}</div>
            <div style="font-size: 11px; color: #ef4444;">Contrast: ${e.contrast?e.contrast.toFixed(2):"N/A"}:1 (fails)</div>
          </div>
          <div style="font-size: 11px; color: #666; margin-top: 4px;">Background: ${p(s)}</div>
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
          ${d}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="contrast-color-picker-modal-cancel-btn">Cancel</button>
      </div>
    `,c.appendChild(g),document.body.appendChild(c);let v=g.querySelector("#contrast-color-picker-modal-cancel-btn"),f=g.querySelector(".modal-close"),y=g.querySelectorAll(".color-picker-item"),m=()=>{c.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{c.parentNode&&c.remove()},200)};v.onclick=m,f.onclick=m,c.onclick=u=>{u.target===c&&m()},y.forEach(u=>{u.onclick=k=>{k.preventDefault(),k.stopPropagation();let S=u.getAttribute("data-color");c.style.display="none",Eo(e,a,S,c)}})}function Io(e){parent.postMessage({pluginMessage:{type:"get-figma-text-styles",issueId:e.id}},"*"),window.pendingTextSizeIssue=e}function Yt(e){parent.postMessage({pluginMessage:{type:"get-figma-text-styles",issueId:e.id}},"*"),window.pendingSuggestTextSizeIssue=e}function Bt(e,t,o,l,n){let s=(x,N)=>{if(x===N)return 100;let j=20,oe=Math.abs(x-N);return Math.max(0,Math.round((1-oe/j)*100))},a=[14,16,18,20,24,28,32,36,40,48].map(x=>({size:x,similarity:s(t,x),diff:Math.abs(t-x)})).sort((x,N)=>o!==void 0&&x.size===o?-1:o!==void 0&&N.size===o?1:x.diff-N.diff).slice(0,5),c=a.length>0?a[0].size:o,g=(x,N)=>{let j=x.size>=14;return`
        <div class="text-size-option-item" data-size="${x.size}" style="
          padding: 6px 8px;
          margin-bottom: 6px;
          border: 1px solid ${N?"#0071e3":"#e0e0e0"};
          border-radius: 8px;
          cursor: pointer;
          background: ${N?"#e3f2fd":"white"};
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.15s;
        ">
          <input type="radio" name="text-size-option" ${N?"checked":""} style="margin: 0; cursor: pointer; display: none;" />
          <div style="
            width: 40px;
            height: 40px;
            border-radius: 6px;
            background: ${N?"#e3f2fd":"#f0f0f0"};
            border: 1px solid ${N?"#0071e3":"#ddd"};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 600;
            color: ${N?"#0071e3":"#666"};
            flex-shrink: 0;
          ">${x.size}</div>
          <div style="flex: 1;">
            <div style="font-weight: 600; font-size: 11px; color: #333;">${x.size}px</div>
            <div style="font-size: 10px; color: ${j?"#155724":"#721c24"};">
              ${j?"\u2713 ADA compliant":"\u26A0 Below minimum"}
            </div>
          </div>
          <span style="font-size: 11px; color: #666; background: #f0f0f0; padding: 2px 8px; border-radius: 10px;">${x.similarity}%</span>
        </div>
      `},d=document.createElement("div");d.className="modal-overlay",d.id="text-size-fix-confirm-modal-overlay";let v=document.createElement("div");v.className="modal-dialog",v.style.maxWidth="420px";let f=window.pendingTextSizeFixAllCallbacks||null,y=f&&f.progress?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${f.progress.current}/${f.progress.total}</div>`:"",m=n?`
      <div style="margin-top: 12px; padding: 10px; background: #f0fdf4; border-radius: 6px; border-left: 3px solid #22c55e;">
        <div style="font-size: 11px; color: #666; margin-bottom: 4px;">\u{1F4DD} Text Style s\u1EBD \u0111\u01B0\u1EE3c \xE1p d\u1EE5ng:</div>
        <div style="font-weight: 600; font-size: 13px; color: #333;">${p(n.name)}</div>
        <div style="font-size: 10px; color: #666; margin-top: 4px;">
          ${p(n.fontFamily)} ${n.fontSize}px ${p(n.fontWeight)}
        </div>
      </div>
    `:"",u=a.map((x,N)=>g(x,N===0)).join("");v.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Apply Suggested Text Size</h2>
        <p class="modal-subtitle">Node: ${p(e.nodeName||"Unnamed")}</p>
      </div>
      ${y}
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
          ${u}
        </div>
        ${m}
      </div>
      <div class="modal-footer">
        ${window.pendingTextSizeFixAllCallbacks?'<button class="modal-btn modal-btn-cancel" id="text-size-fix-ignore-btn" style="background: #64748b; border-color: #64748b; color: white;">Ignore</button>':""}
        <button class="modal-btn modal-btn-cancel" id="text-size-fix-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="text-size-fix-confirm-apply-btn" style="background: #22c55e; border-color: #22c55e;">Apply</button>
      </div>
    `,d.appendChild(v),document.body.appendChild(d);let k=v.querySelector("#text-size-fix-confirm-cancel-btn"),S=v.querySelector("#text-size-fix-confirm-apply-btn"),$=v.querySelector("#text-size-fix-ignore-btn"),E=v.querySelector(".modal-close"),M=v.querySelector("#text-size-options-container"),F=f,P=x=>{c=x,M.querySelectorAll(".text-size-option-item").forEach(j=>{let ke=parseInt(j.getAttribute("data-size"),10)===x;j.style.border=ke?"2px solid #0071e3":"2px solid #e0e0e0",j.style.background=ke?"#e3f2fd":"white";let he=j.querySelector('input[type="radio"]');he&&(he.checked=ke)})};(()=>{M.querySelectorAll(".text-size-option-item").forEach(N=>{N.onclick=j=>{j.preventDefault();let oe=parseInt(N.getAttribute("data-size"),10);P(oe)}})})();let B=()=>{d.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{d.parentNode&&d.remove(),l&&(l.style.display="block")},200)},C=()=>{d.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{d.parentNode&&d.remove(),l&&l.parentNode&&(l.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{l.parentNode&&l.remove()},200))},200)};k.onclick=()=>{F&&F.onCancel?(C(),window.pendingTextSizeFixAllCallbacks=null,F.onCancel()):B()},E.onclick=()=>{F&&F.onCancel?(C(),window.pendingTextSizeFixAllCallbacks=null,F.onCancel()):B()},d.onclick=x=>{x.target===d&&(F&&F.onCancel?(C(),window.pendingTextSizeFixAllCallbacks=null,F.onCancel()):B())},$&&($.onclick=()=>{C(),F&&F.onIgnore&&(window.pendingTextSizeFixAllCallbacks=null,F.onIgnore())}),S.onclick=()=>{C(),ae(e.id,"\u23F3 Fixing text size...",!0),n&&n.id?parent.postMessage({pluginMessage:{type:"apply-figma-text-style",issue:e,styleId:n.id,styleName:n.name}},"*"):parent.postMessage({pluginMessage:{type:"fix-text-size-issue",issue:e,fontSize:c}},"*"),F&&F.onApply&&(window.pendingTextSizeFixAllCallbacks=null,F.onApply())}}function $o(e){parent.postMessage({pluginMessage:{type:"get-contrast-colors",issue:e}},"*"),window.pendingContrastIssue=e}function Jt(e){let t=gt(e);if(!t){alert("No suitable color found that passes contrast requirements");return}Eo(e,e.textColor,t,null)}function Eo(e,t,o,l){let n=e.backgroundColor||"#FFFFFF",s=e.minContrast||4.5,i=(x,N)=>{let j=x.replace("#",""),oe=N.replace("#",""),ke=parseInt(j.substr(0,2),16),he=parseInt(j.substr(2,2),16),Te=parseInt(j.substr(4,2),16),Ee=parseInt(oe.substr(0,2),16),Ae=parseInt(oe.substr(2,2),16),L=parseInt(oe.substr(4,2),16);return Math.sqrt(Math.pow(ke-Ee,2)+Math.pow(he-Ae,2)+Math.pow(Te-L,2))},a=(x,N)=>{let oe=i(x,N);return Math.round((1-oe/441.67)*100)},g=Object.keys(J).map(x=>{let N=Rt(x,n);return{color:x,name:J[x]||x,contrast:N,passes:N>=s,similarity:a(t,x),distance:i(t,x)}}).filter(x=>x.passes).sort((x,N)=>o&&x.color===o?-1:o&&N.color===o?1:x.distance-N.distance).slice(0,5),d=g.length>0?g[0].color:o,v=(x,N)=>`
        <div class="contrast-color-option-item" data-color="${p(x.color)}" style="
          padding: 10px 12px;
          margin-bottom: 6px;
          border: 1px solid ${N?"#0071e3":"#e0e0e0"};
          border-radius: 8px;
          cursor: pointer;
          background: ${N?"#e3f2fd":"white"};
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.15s;
        ">
          <input type="radio" name="contrast-color-option" ${N?"checked":""} style="margin: 0; cursor: pointer;" />
          <div style="
            width: 36px;
            height: 36px;
            border-radius: 6px;
            background: ${p(x.color)};
            border: 1px solid ${N?"#0071e3":"#ddd"};
            flex-shrink: 0;
          "></div>
          <div style="flex: 1;">
            <div style="font-weight: 600; font-size: 13px; color: #333;">${p(x.name)}</div>
            <div style="font-size: 10px; color: #666; font-family: 'SF Mono', Monaco, monospace;">${p(x.color)}</div>
            <div style="font-size: 10px; color: #22c55e; margin-top: 2px;">\u2713 ${x.contrast.toFixed(2)}:1</div>
          </div>
          <span style="font-size: 11px; color: #666; background: #f0f0f0; padding: 2px 8px; border-radius: 10px;">${x.similarity}%</span>
        </div>
      `,f=window.pendingContrastFixAllCallbacks||null,y=f&&f.progress?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${f.progress.current}/${f.progress.total}</div>`:"",m=document.createElement("div");m.className="modal-overlay",m.id="contrast-fix-confirm-modal-overlay";let u=document.createElement("div");u.className="modal-dialog",u.style.maxWidth="420px";let k=g.length>0?g.map((x,N)=>v(x,N===0)).join(""):`<div style="padding: 20px; text-align: center; color: #666;">No colors available that pass contrast requirements (>= ${s}:1)</div>`;u.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Apply Suggested Contrast Color</h2>
        <p class="modal-subtitle">Node: ${p(e.nodeName||"Unnamed")}</p>
      </div>
      ${y}
      <div class="modal-body">
        <div style="margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 6px;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <div style="
              width: 32px;
              height: 32px;
              border-radius: 4px;
              background: ${p(t)};
              border: 1px solid #ddd;
            "></div>
            <div>
              <div style="font-size: 11px; color: #666;">Current:</div>
              <div style="font-size: 12px; font-weight: 600; font-family: 'SF Mono', Monaco, monospace;">${p(t)}</div>
              <div style="font-size: 10px; color: #ef4444;">Contrast: ${e.contrast?e.contrast.toFixed(2):"N/A"}:1 \u2717</div>
            </div>
          </div>
          <div style="font-size: 10px; color: #666; padding: 4px 8px; background: #e0e0e0; border-radius: 4px; display: inline-block;">
            Background: ${p(n)} | Minimum: ${s}:1
          </div>
        </div>
        <div style="font-size: 12px; font-weight: 600; color: #333; margin-bottom: 8px;">
          Select a color to apply (Top 5 passing contrast):
        </div>
        <div id="contrast-color-options-container" style="max-height: 280px; overflow-y: auto;">
          ${k}
        </div>
      </div>
      <div class="modal-footer">
        ${window.pendingContrastFixAllCallbacks?'<button class="modal-btn modal-btn-cancel" id="contrast-fix-ignore-btn" style="background: #64748b; border-color: #64748b; color: white;">Ignore</button>':""}
        <button class="modal-btn modal-btn-cancel" id="contrast-fix-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="contrast-fix-confirm-apply-btn" style="background: #22c55e; border-color: #22c55e;" ${g.length===0?"disabled":""}>Apply</button>
      </div>
    `,m.appendChild(u),document.body.appendChild(m);let S=u.querySelector("#contrast-fix-confirm-cancel-btn"),$=u.querySelector("#contrast-fix-confirm-apply-btn"),E=u.querySelector("#contrast-fix-ignore-btn"),M=u.querySelector(".modal-close"),F=u.querySelector("#contrast-color-options-container"),P=f,G=x=>{d=x,F.querySelectorAll(".contrast-color-option-item").forEach(j=>{let ke=j.getAttribute("data-color")===x;j.style.border=ke?"2px solid #0071e3":"2px solid #e0e0e0",j.style.background=ke?"#e3f2fd":"white";let he=j.querySelector('input[type="radio"]');he&&(he.checked=ke)})};(()=>{F.querySelectorAll(".contrast-color-option-item").forEach(N=>{N.onclick=j=>{j.preventDefault();let oe=N.getAttribute("data-color");G(oe)}})})();let C=()=>{m.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{m.parentNode&&m.remove(),l&&(l.style.display="block")},200)};S.onclick=()=>{P&&P.onCancel?(C(),window.pendingContrastFixAllCallbacks=null,P.onCancel()):C()},M.onclick=()=>{P&&P.onCancel?(C(),window.pendingContrastFixAllCallbacks=null,P.onCancel()):C()},m.onclick=x=>{x.target===m&&(P&&P.onCancel?(C(),window.pendingContrastFixAllCallbacks=null,P.onCancel()):C())},E&&(E.onclick=()=>{C(),P&&P.onIgnore&&(window.pendingContrastFixAllCallbacks=null,P.onIgnore())}),$.onclick=()=>{g.length!==0&&(C(),ae(e.id,"\u23F3 Fixing contrast...",!0),parent.postMessage({pluginMessage:{type:"fix-contrast-issue",issue:e,color:d}},"*"),P&&P.onApply&&(window.pendingContrastFixAllCallbacks=null,P.onApply()))}}function Mo(e){try{if(ge[e.id]===!0){if(delete ge[e.id],h&&h.issues){let o=h.issues.find(l=>l.id===e.id);if(o){o.ignored=!1;let l=o.originalSeverity||(o.severity==="info"?"error":o.severity);o.severity=l,o.originalSeverity=void 0,e.severity=l,e.ignored=!1}}ve(),To(e,!1),Ke(),parent.postMessage({pluginMessage:{type:"notify",message:"\u2705 Issue un-ignored"}},"*")}else{if(!confirm(`Ignore this contrast issue?

Node: ${e.nodeName||"Unnamed"}

This issue will be marked as "Pass with ignore custom" and won't be counted as an error.`))return;if(h&&h.issues){let o=h.issues.find(l=>l.id===e.id);o&&(o.originalSeverity||(o.originalSeverity=o.severity),o.ignored=!0,o.severity="info",e.ignored=!0,e.originalSeverity=o.originalSeverity,e.severity="info")}ge[e.id]=!0,ve(),To(e,!0),Ke(),parent.postMessage({pluginMessage:{type:"notify",message:"\u2705 Issue ignored"}},"*")}}catch(t){console.error("Error in handleIgnoreIssue:",t),parent.postMessage({pluginMessage:{type:"notify",message:`\u274C Error: ${t.message}`}},"*")}}function To(e,t){let o=document.querySelector(`.issue[data-issue-id="${e.id}"]`);if(o)if(t){let l=e.originalSeverity||"error";o.className=o.className.replace(/\b(error|warn)\b/g,"info");let n=o.querySelector(".issue-type");if(n){let i=n.querySelector(".issue-number");if(i){let a=i.textContent;n.innerHTML=`<span class="issue-number">${a}</span> \u2139\uFE0F INFO`}else n.innerHTML=n.innerHTML.replace(/❌|⚠️/g,"\u2139\uFE0F").replace(/ERROR|WARNING/g,"INFO")}if(!o.querySelector(".issue-ignored-tag")){let i=o.querySelector(".issue-body"),a=o.querySelector(".issue-node"),c=document.createElement("div");if(c.className="issue-ignored-tag",c.style.cssText="margin-top: 4px; padding: 4px 8px; background: #e3f2fd; color: #22c55e; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-block;",c.textContent="\u2713 Pass with ignore custom",a)a.parentNode.insertBefore(c,a.nextSibling);else if(i)i.parentNode.insertBefore(c,i.nextSibling);else{let g=o.querySelector(".issue-header");g?g.parentNode.insertBefore(c,g.nextSibling):o.appendChild(c)}}let s=document.querySelector(`button.btn-ignore[data-id="${e.id}"]`);s&&(s.removeAttribute("disabled"),s.innerHTML="Ignored",s.style.cssText="padding: 6px 12px; border: 1px solid #22c55e; background: #22c55e; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s; color: white;")}else{let l=e.originalSeverity||(e.severity==="info"?"error":e.severity);o.className=o.className.replace(/\binfo\b/g,l);let n=o.querySelector(".issue-type");if(n){let a=l==="error"?"\u274C":l==="warn"?"\u26A0\uFE0F":"\u2139\uFE0F",c=l.toUpperCase(),g=n.querySelector(".issue-number");if(g){let d=g.textContent;n.innerHTML=`<span class="issue-number">${d}</span> ${a} ${c}`}else n.innerHTML=n.innerHTML.replace(/ℹ️/g,a).replace(/INFO/g,c)}let s=o.querySelector(".issue-ignored-tag");s&&s.remove();let i=document.querySelector(`button.btn-ignore[data-id="${e.id}"]`);i&&(i.removeAttribute("disabled"),i.innerHTML="Ignore",i.style.cssText="padding: 6px 12px; border: 1px solid #64748b; background: #64748b; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s; color: white;")}}function Ke(){if(!h||!h.issues)return;let e=h.issues,t={error:e.filter(o=>o.severity==="error"&&!o.ignored).length,warn:e.filter(o=>o.severity==="warn"&&!o.ignored).length,total:e.length};At(e),document.querySelectorAll(".issue-group").forEach(o=>{let l=o.querySelector(".badge");if(l){let n=o.getAttribute("data-issue-type");if(n){let i=e.filter(a=>a.type===n).filter(a=>a.ignored?!1:a.severity==="error"||a.severity==="warn").length;l.textContent=i}}})}function Qn(e){let t=e.message||"",o=t.match(/Padding\s+(\w+)\s+\((\d+)px\)/),l=null,n=null;if(o?(l=o[1],n=parseInt(o[2])):(o=t.match(/Gap\s+\(itemSpacing:\s+(\d+)px\)/),o&&(l="itemSpacing",n=parseInt(o[1]))),!o||!l||n===null){console.error("Cannot parse spacing issue message:",t),alert("Cannot determine spacing property from issue message. Message: "+t);return}let s=document.getElementById("spacing-scale");if(!s||!s.value.trim()){alert("No spacing scale defined. Please add spacing values to the Spacing input.");return}let i=s.value.split(",").map(a=>parseInt(a.trim(),10)).filter(a=>!isNaN(a)&&a>=0).sort((a,c)=>a-c);if(i.length===0){alert("No valid spacing values found in Spacing input.");return}bn(e,l,n,i)}function es(e){let o=(e.message||"").match(/Color (#[0-9A-Fa-f]{6})/),l=o?o[1].toUpperCase():null;if(!l){alert("Cannot determine current color from issue message");return}let n=document.getElementById("color-scale");if(!n||!n.value.trim()){alert("No color scale defined. Please add colors to the Color input.");return}let s=n.value.split(",").map(i=>i.trim().toUpperCase()).filter(i=>i&&i.startsWith("#"));if(s.length===0){alert("No valid colors found in Color input.");return}vn(e,l,s,J)}function ts(e){var t;if(e.type==="typography-check"&&e.bestMatch){hn(e,K);return}if(ae(e.id,"\u23F3 Fixing...",!0),!e.bestMatch&&e.type!=="typography-check"){let o=prompt(`Cannot auto-fix this issue.

Issue: ${e.message}

Please provide fix instructions or press Cancel.`);if(o)parent.postMessage({pluginMessage:{type:"fix-issue",issue:e,manualFix:o}},"*");else{let l=document.querySelector(`.issue[data-issue-id="${e.id}"]`)||((t=document.querySelector(`button.btn-fix[data-id="${e.id}"]`))==null?void 0:t.closest(".issue"));if(l){let n=l.querySelector(".fix-message");n&&n.remove()}}return}parent.postMessage({pluginMessage:{type:"fix-issue",issue:e}},"*")}function zo(e,t){let o=document.createElement("div");o.className="modal-overlay",o.id="create-style-modal-overlay";let l=document.createElement("div");l.className="modal-dialog";let n=e.nodeName||"Unnamed";if(e.message&&e.message.includes("(")&&e.message.includes("nodes")){let d=e.message.match(/\((\d+) nodes\)/);d&&(n=`${n} (${d[1]} nodes)`)}l.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Create Style</h2>
        <p class="modal-subtitle">${p(n)}</p>
      </div>
      <div class="modal-body">
        <input 
          type="text" 
          class="modal-input" 
          id="style-name-input" 
          placeholder="Style Name" 
          value="${p(e.nodeName||"New Style")}"
          autofocus
        />
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="modal-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="modal-create-btn">Create</button>
      </div>
    `,o.appendChild(l),document.body.appendChild(o);let s=l.querySelector("#style-name-input"),i=l.querySelector("#modal-cancel-btn"),a=l.querySelector("#modal-create-btn"),c=l.querySelector(".modal-close");setTimeout(()=>{s.focus(),s.select()},100),s.onkeydown=d=>{d.key==="Enter"?(d.preventDefault(),a.click()):d.key==="Escape"&&(d.preventDefault(),i.click())};let g=()=>{o.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{o.parentNode&&o.remove()},200)};i.onclick=g,c.onclick=g,o.onclick=d=>{d.target===o&&g()},a.onclick=()=>{let d=s.value.trim();if(!d){s.focus(),s.style.borderColor="#ff3b30",setTimeout(()=>{s.style.borderColor="#0071e3"},2e3);return}g(),t&&t(d)}}function Xt(e,t,o={}){if(console.log("[showSuggestApplyModal] Called with issue:",e,"styleName:",t,"options:",o),!e){console.error("[showSuggestApplyModal] Missing issue:",{issue:e,styleName:t});return}let{onApply:l,onIgnore:n,onCancel:s,showIgnore:i=!1,progress:a}=o,c=e.nodeProps||{},g=c.fontFamily||"Unknown",d=c.fontSize!==null&&c.fontSize!==void 0?c.fontSize:null,v=d!==null?`${d}px`:"Unknown",f=c.fontWeight||"Unknown",y=c.lineHeight||"Unknown",m=c.letterSpacing!==null&&c.letterSpacing!==void 0?c.letterSpacing:"Unknown",u=L=>L==null||L==="Unknown"?"":String(L).toLowerCase().trim(),k=L=>{let X=u(L);return X===""||X==="0"||X==="0px"||X==="0%"||X==="0em"},S=(L,X)=>u(L)!==u(X),$=L=>{let X=`typo_${u(g)}_${d}_${u(f)}_${u(y)}_${u(m)}_${L.id}`;return fe(X,()=>{let r=0;if(u(g)===u(L.fontFamily)&&(r+=25),d!==null&&L.fontSize){let ne=Math.abs(d-L.fontSize);ne===0?r+=30:ne<=2?r+=25:ne<=4?r+=20:ne<=8&&(r+=10)}return u(f)===u(L.fontWeight)&&(r+=20),u(y)===u(L.lineHeight)&&(r+=15),(k(m)&&k(L.letterSpacing||"0")||u(m)===u(L.letterSpacing||"0"))&&(r+=10),r})},M=[...e.type==="text-size-mobile"?K.filter(L=>L.fontSize>12):K].map(L=>Ye(We({},L),{similarity:$(L)})).sort((L,X)=>t&&L.name===t?-1:t&&X.name===t?1:X.similarity-L.similarity).slice(0,5);if(M.length===0){console.error("[showSuggestApplyModal] No typography styles available"),alert("No typography styles available");return}let F=M[0].id,P=(L,X,r)=>{let ne=S(g,L.fontFamily),le=S(v,`${L.fontSize}px`),be=S(f,L.fontWeight),ee=S(y,L.lineHeight),qe=k(m)&&k(L.letterSpacing||"0")?!1:S(m,L.letterSpacing||"0%"),Je="color: #155724;",De="color: #721c24; background: #f8d7da; padding: 2px 6px; border-radius: 4px; font-weight: 600;",we=r===0;return`
        <div class="style-option-item" data-style-id="${L.id}" style="
          padding: 14px 16px;
          margin-bottom: 10px;
          border: 1px solid ${X?"#0071e3":"#e0e0e0"};
          border-radius: 10px;
          cursor: pointer;
          background: ${X?"#f8fbff":"white"};
          transition: all 0.15s;
          border-left: 4px solid ${X?"#0071e3":"#e0e0e0"};
        ">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
              <input type="radio" name="style-option" ${X?"checked":""} style="margin: 0; cursor: pointer; width: 18px; height: 18px; display: none;" />
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-weight: 600; font-size: 12px; color: #333;">${p(L.name)}</span>
                  ${we?'<span style="color: #f5a623;">\u2B50</span>':""}
                </div>
                <div style="font-size: 12px; color: #666; margin-top: 2px;">
                  ${p(L.fontFamily)} ${L.fontSize}px ${p(L.fontWeight)}
                </div>
              </div>
            </div>
            <div style="text-align: right;">
              ${we?'<div style="color: #0071e3; font-size: 11px; font-weight: 600;">Best Match</div>':""}
              <div style="font-size: 12px; color: #666; background: #f0f0f0; padding: 3px 10px; border-radius: 12px; margin-top: 2px;">${L.similarity}% match</div>
            </div>
          </div>
          <div style="margin-left: 28px; padding: 0 12px; background: #f8f9fa; border-radius: 6px;">
            <div style="font-size: 11px; font-weight: 600; color: #333; margin-bottom: 8px;">Details:</div>
            <div style="font-size: 11px; color: #555; line-height: 1.2;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="color: #888; min-width: 90px;">\u2022 Font Family:</span>
                <span style="${ne?De:Je}">${ne?"\u26A0":"\u2713"} ${p(L.fontFamily)}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="color: #888; min-width: 90px;">\u2022 Font Size:</span>
                <span style="${le?De:Je}">${le?"\u26A0":"\u2713"} ${L.fontSize}px</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="color: #888; min-width: 90px;">\u2022 Font Weight:</span>
                <span style="${be?De:Je}">${be?"\u26A0":"\u2713"} ${p(L.fontWeight)}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="color: #888; min-width: 90px;">\u2022 Line Height:</span>
                <span style="${ee?De:Je}">${ee?"\u26A0":"\u2713"} ${p(L.lineHeight)}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="color: #888; min-width: 90px;">\u2022 Letter Spacing:</span>
                <span style="${qe?De:Je}">${qe?"\u26A0":"\u2713"} ${p(L.letterSpacing||"0%")}</span>
              </div>
            </div>
          </div>
        </div>
      `},G=document.createElement("div");G.className="modal-overlay",G.id="suggest-apply-modal-overlay";let B=document.createElement("div");B.className="modal-dialog",B.style.maxWidth="480px";let C=a?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${a.current}/${a.total}</div>`:"",x=M.map((L,X)=>P(L,X===0,X)).join("");B.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Apply Suggested Style</h2>
        <p class="modal-subtitle">Node: ${p(e.nodeName||"Unnamed")}</p>
      </div>
      ${C}
      <div class="modal-body">
        <div style="margin-bottom: 12px; padding: 12px; background: #fff8e6; border-radius: 8px; border-left: 4px solid #f5a623;">
          <div style="font-size: 11px; font-weight: 600; color: #666; margin-bottom: 6px;">Current Node Properties:</div>
          <div style="font-size: 12px; color: #333; line-height: 1.6;">
            <div><strong>Font:</strong> ${p(g)} \u2022 ${p(v)} \u2022 ${p(f)}</div>
            <div><strong>Line Height:</strong> ${p(y)} \u2022 <strong>Letter Spacing:</strong> ${p(m)}</div>
          </div>
        </div>
        <div style="font-size: 12px; font-weight: 600; color: #333; margin-bottom: 10px;">
          Select a style to apply (Top 5 matches):
        </div>
        <div id="style-options-container" style="max-height: 400px; overflow-y: auto;">
          ${x}
        </div>
      </div>
      <div class="modal-footer">
        ${i?'<button class="modal-btn modal-btn-cancel" id="suggest-modal-ignore-btn" style="background: #64748b; border-color: #64748b; color: white;">Ignore</button>':""}
        <button class="modal-btn modal-btn-cancel" id="suggest-modal-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="suggest-modal-apply-btn" style="background: #22c55e; border-color: #22c55e;">Apply Style</button>
      </div>
    `,G.appendChild(B),document.body.appendChild(G);let N=B.querySelector("#suggest-modal-cancel-btn"),j=B.querySelector("#suggest-modal-apply-btn"),oe=B.querySelector("#suggest-modal-ignore-btn"),ke=B.querySelector(".modal-close"),he=B.querySelector("#style-options-container"),Te=L=>{F=L,he.querySelectorAll(".style-option-item").forEach(r=>{let le=r.getAttribute("data-style-id")===String(L);r.style.border=le?"2px solid #0071e3":"2px solid #e0e0e0",r.style.borderLeft=le?"4px solid #0071e3":"4px solid #e0e0e0",r.style.background=le?"#f8fbff":"white";let be=r.querySelector('input[type="radio"]');be&&(be.checked=le)})};(()=>{he.querySelectorAll(".style-option-item").forEach(X=>{X.onclick=r=>{r.preventDefault();let ne=X.getAttribute("data-style-id");Te(ne)}})})();let Ae=()=>{G.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{G.parentNode&&G.remove()},200)};N.onclick=()=>{Ae(),i&&o.onCancel&&typeof o.onCancel=="function"&&o.onCancel()},ke.onclick=()=>{Ae(),i&&o.onCancel&&typeof o.onCancel=="function"&&o.onCancel()},G.onclick=L=>{L.target===G&&(Ae(),i&&o.onCancel&&typeof o.onCancel=="function"&&o.onCancel())},j.onclick=()=>{let L=M.find(r=>String(r.id)===String(F));if(!L){console.error("[showSuggestApplyModal] Selected style not found:",F);return}Ae();let X=o.batchGroup;if(X&&X.issues&&X.issues.length>1&&L.styleId){let r=X.issues.map(ne=>ne.id);ae(r[0],`\u23F3 Applying "${L.name}" to ${r.length} layers...`,!0),parent.postMessage({pluginMessage:{type:"apply-figma-text-style-batch",issueIds:r,styleId:L.styleId,styleName:L.name}},"*")}else ae(e.id,"\u23F3 Applying style...",!0),L.styleId?parent.postMessage({pluginMessage:{type:"apply-figma-text-style",issue:e,styleId:L.styleId,styleName:L.name}},"*"):parent.postMessage({pluginMessage:{type:"apply-typography-style",issue:e,style:L}},"*");l&&typeof l=="function"&&l()},oe&&(oe.onclick=()=>{Ae(),n&&typeof n=="function"&&n()})}function No(e,t){let o=t&&t.batchGroup,l=o?o.issues.length:1;parent.postMessage({pluginMessage:{type:"extract-color-variables"}},"*");function n(s){let i=s.data&&s.data.pluginMessage;if(!i||i.type!=="color-variables-extracted")return;window.removeEventListener("message",n);let a=i.colors||[];if(a.length===0){alert("No color variables found in this file.");return}let c=(e.colorHex||"").toUpperCase(),g=[...a].sort((k,S)=>{let $=k.hex.toUpperCase()===c?0:1,E=S.hex.toUpperCase()===c?0:1;return $!==E?$-E:k.name.localeCompare(S.name)}),d=document.createElement("div");d.className="modal-overlay",d.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);z-index:9999;display:flex;align-items:center;justify-content:center;";let v=document.createElement("div");v.style.cssText="background:#fff;border-radius:12px;padding:20px;max-width:400px;width:90%;max-height:70vh;display:flex;flex-direction:column;";let f=document.createElement("h3");f.style.cssText="margin:0 0 4px 0;font-size:16px;",f.textContent="Select Variable";let y=document.createElement("div");y.style.cssText="font-size:12px;color:#666;margin-bottom:12px;",y.textContent=o?`Color: ${c} \u2014 ${l} layer(s)`:`Color: ${c} on "${e.nodeName}"`;let m=document.createElement("div");m.style.cssText="overflow-y:auto;flex:1;",g.forEach(k=>{let S=k.hex.toUpperCase()===c,$=document.createElement("div");$.style.cssText=`display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;border:2px solid ${S?"#22c55e":"transparent"};margin-bottom:4px;background:${S?"#f0fdf4":"#fafafa"};`,$.innerHTML=`
          <div style="width:28px;height:28px;border-radius:6px;background:${k.hex};border:1px solid #ddd;flex-shrink:0;"></div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${k.name}</div>
            <div style="font-size:11px;color:#888;">${k.hex}${S?" \u2014 exact match":""}</div>
          </div>
        `,$.onclick=()=>{if(d.remove(),o&&o.issues.length>0){let E=o.issues.map(M=>({id:M.id,colorTarget:M.colorTarget,fillIndex:M.fillIndex,strokeIndex:M.strokeIndex}));ae(o.issues[0].id,`\u23F3 Binding "${k.name}" to ${l} layer(s)...`,!0),parent.postMessage({pluginMessage:{type:"bind-color-variable-by-name-batch",issues:E,variableName:k.name,variableHex:k.hex}},"*")}else ae(e.id,"\u23F3 Binding variable...",!0),parent.postMessage({pluginMessage:{type:"bind-color-variable-by-name",issue:e,variableName:k.name,variableHex:k.hex}},"*")},m.appendChild($)});let u=document.createElement("button");u.textContent="Cancel",u.style.cssText="margin-top:12px;padding:8px 16px;border:1px solid #ddd;border-radius:8px;background:#fff;cursor:pointer;font-size:13px;",u.onclick=()=>d.remove(),v.appendChild(f),v.appendChild(y),v.appendChild(m),v.appendChild(u),d.appendChild(v),d.onclick=k=>{k.target===d&&d.remove()},document.body.appendChild(d)}window.addEventListener("message",n)}function mt(e){if(!e||!e.nodeProps)return null;for(let t of K)if(wn(e.nodeProps,t)===100)return console.log("[100% Match] node:",e.id,e.nodeName,"| nodeProps:",JSON.stringify({f:e.nodeProps.fontFamily,s:e.nodeProps.fontSize,w:e.nodeProps.fontWeight,lh:e.nodeProps.lineHeight,ls:e.nodeProps.letterSpacing}),"| style:",t.name,JSON.stringify({f:t.fontFamily,s:t.fontSize,w:t.fontWeight,lh:t.lineHeight,ls:t.letterSpacing})),t;return null}function Ts(e){let t=(e||[]).filter(d=>d.type!=="typography-check"||!d.nodeProps?!1:mt(d)!==null);if(t.length===0){alert("No typography issues with 100% match found.");return}let o=0,l=0,n=0,s=document.getElementById("btn-fix-all-100");s&&(s.disabled=!0,s.textContent=`Fixing... (0/${t.length})`);function i(){s&&(s.textContent=`Fixing... (${o}/${t.length})`)}function a(){s&&(s.disabled=!1,s.textContent=`Fix all now (${t.length-l})`,l>=t.length&&(s.style.display="none")),alert(`\u2705 Done!

Processed ${t.length} item(s):
\u2022 Applied: ${l}
\u2022 Failed: ${n}`)}function c(d){let v=d.data&&d.data.pluginMessage;!v||v.type!=="apply-typography-style-result"||(o++,v.success?l++:n++,i(),o>=t.length?(window.removeEventListener("message",c),setTimeout(a,500)):setTimeout(()=>g(t[o]),300))}function g(d){let v=mt(d);if(!v){o++,n++,i(),o>=t.length?(window.removeEventListener("message",c),setTimeout(a,500)):setTimeout(()=>g(t[o]),300);return}ae(d.id,"\u23F3 Applying style...",!0),v.styleId?parent.postMessage({pluginMessage:{type:"apply-figma-text-style",issue:d,styleId:v.styleId,styleName:v.name}},"*"):parent.postMessage({pluginMessage:{type:"apply-typography-style",issue:d,style:v}},"*")}window.addEventListener("message",c),g(t[0])}window._batchFixInProgress=!1;function os(e){window._batchFixInProgress=!0;let t=["typography-check","typography-style"],o=(e||[]).filter(x=>t.includes(x.type)&&x.nodeProps&&mt(x)!==null),l=[];o.forEach(function(x){x.subIssues&&x.subIssues.length>1?x.subIssues.forEach(function(N){N.nodeProps&&mt(Object.assign({},x,N))!==null&&l.push(Object.assign({},x,N))}):l.push(x)});let n=(e||[]).some(x=>x.type==="color-variable"&&x.matchingVariable&&(!x.colorOpacity||x.colorOpacity>=1));if(console.log("[Fix All Now] Color variable fixable:",(e||[]).filter(x=>x.type==="color-variable"&&x.matchingVariable&&(!x.colorOpacity||x.colorOpacity>=1)).length,", Typography 100% match:",l.length),l.length===0&&!n){alert("No auto-fixable issues found.");return}let s=document.getElementById("btn-fix-all-100");s&&(s.disabled=!0,s.textContent="Fixing...");let i=0,a=0,c=0,g=0,d=!1,v=l.length+(n?1:0),f=0,y=document.getElementById("fix-all-progress");y&&y.remove();let m=document.createElement("div");m.id="fix-all-progress",m.className="fix-all-progress",m.innerHTML=`
      <div class="fix-all-progress-info">
        <span class="fix-all-progress-text">Fixing... 0/${v}</span>
        <button class="fix-all-progress-cancel" title="Cancel">\u2715</button>
      </div>
      <div class="fix-all-progress-bar"><div class="fix-all-progress-fill" style="width: 0%"></div></div>
    `;let u=document.getElementById("results-issues");u&&u.parentNode.insertBefore(m,u);let k=m.querySelector(".fix-all-progress-text"),S=m.querySelector(".fix-all-progress-fill"),$=m.querySelector(".fix-all-progress-cancel");$.onclick=()=>{d=!0,M()};function E(x){f++;let N=Math.round(f/v*100);k&&(k.textContent=x+" "+f+"/"+v),S&&(S.style.width=N+"%")}function M(){window._batchFixInProgress=!1,s&&(s.disabled=!1,s.textContent="Fix all now"),m&&m.parentNode&&m.remove(),c>0&&h&&h.issues&&(h.issues=h.issues.filter(j=>j.type!=="color-variable"||!j.matchingVariable)),setTimeout(function(){Ke(),h&&h.issues&&He(h.issues,!1)},300);let x=c+i,N=g+a;alert((d?`Cancelled!

`:`Done!

`)+"Color variables: "+c+" applied, "+g+` failed
Typography: `+i+" applied, "+a+` failed

Total: `+(x+N)+" processed")}function F(){s&&(s.textContent="Fixing colors...");function x(N){let j=N.data&&N.data.pluginMessage;!j||j.type!=="batch-bind-color-variables-result"||(window.removeEventListener("message",x),c=j.applied||0,g=j.failed||0,E("Colors done."),l.length>0&&!d?setTimeout(function(){G()},300):M())}window.addEventListener("message",x),parent.postMessage({pluginMessage:{type:"batch-bind-color-variables",skipOpacity:!0}},"*")}let P=0;function G(){s&&(s.textContent="Fixing Text Style..."),window.addEventListener("message",B),C(l[0])}function B(x){let N=x.data&&x.data.pluginMessage;!N||N.type!=="apply-typography-style-result"||(P++,N.success?i++:a++,E("Fixing Text Style"),d||P>=l.length?(window.removeEventListener("message",B),M()):setTimeout(function(){C(l[P])},300))}function C(x){let N=mt(x);if(!N){P++,a++,E("Fixing Text Style"),d||P>=l.length?(window.removeEventListener("message",B),M()):setTimeout(function(){C(l[P])},300);return}ae(x.id,"\u23F3 Applying style...",!0),N.styleId?parent.postMessage({pluginMessage:{type:"apply-figma-text-style",issue:x,styleId:N.styleId,styleName:N.name}},"*"):parent.postMessage({pluginMessage:{type:"apply-typography-style",issue:x,style:N}},"*")}n?F():l.length>0&&G()}function ns(e,t){if(!t||t.length===0){alert("No issues to process");return}window._batchFixInProgress=!0;let o=0,l=0,n=0,s=!1,i=document.getElementById("fix-all-progress");i&&i.remove();let a=document.createElement("div");a.id="fix-all-progress",a.className="fix-all-progress",a.innerHTML=`
      <div class="fix-all-progress-info">
        <span class="fix-all-progress-text">Fixing... 0/${t.length}</span>
        <button class="fix-all-progress-cancel" title="Cancel">\u2715</button>
      </div>
      <div class="fix-all-progress-bar"><div class="fix-all-progress-fill" style="width: 0%"></div></div>
    `;let c=document.getElementById("results-issues");c&&c.parentNode.insertBefore(a,c);let g=a.querySelector(".fix-all-progress-text"),d=a.querySelector(".fix-all-progress-fill"),v=a.querySelector(".fix-all-progress-cancel");v.onclick=()=>{s=!0};function f(){let u=Math.round(o/t.length*100);g&&(g.textContent="Fixing... "+o+"/"+t.length),d&&(d.style.width=u+"%")}function y(){window._batchFixInProgress=!1,a&&a.parentNode&&a.remove(),Ke(),h&&h.issues&&He(h.issues,!1);let k=(s?`Cancelled!

`:`Done!

`)+`Processed ${o} item(s):
\u2022 Applied: ${l}
\u2022 Ignored: ${n}`;alert(k)}function m(){if(s||o>=t.length){y();return}let u=t[o];o++,f(),parent.postMessage({pluginMessage:{type:"select-node",id:u.id}},"*");let k={current:o,total:t.length};if(u.type==="typography-check"||u.type==="typography-style"){let S=u.bestMatch&&u.bestMatch.name&&typeof u.bestMatch.name=="string"&&u.bestMatch.name.trim().length>0?u.bestMatch.name:null;if(!S){n++,m();return}Xt(u,S,{showIgnore:!0,progress:k,onApply:()=>{l++,setTimeout(()=>{m()},500)},onIgnore:()=>{n++,m()},onCancel:()=>{s=!0,y()}})}else if(u.type==="color"){let S=St(u),E=(u.message||"").match(/Color (#[0-9A-Fa-f]{6})/),M=E?E[1].toUpperCase():null;ss(u,M,S,{progress:k,onApply:()=>{l++,setTimeout(()=>{m()},500)},onIgnore:()=>{n++,m()},onCancel:()=>{s=!0,y()}})}else if(u.type==="spacing"){let S=kt(u),E=(u.message||"").match(/Padding\s+(\w+)\s+\((\d+)px\)/);if(E){let M=E[1],F=parseInt(E[2]);ls(u,M,F,S,{progress:k,onApply:()=>{l++,setTimeout(()=>{m()},500)},onIgnore:()=>{n++,m()},onCancel:()=>{s=!0,y()}})}else n++,m()}else if(u.type==="autolayout")Pn(u,{progress:k,onApply:()=>{l++,setTimeout(()=>{m()},500)},onIgnore:()=>{n++,m()},onCancel:()=>{s=!0,y()}});else if(u.type==="position")On(u,{progress:k,onApply:()=>{l++,setTimeout(()=>{m()},500)},onIgnore:()=>{n++,m()},onCancel:()=>{s=!0,y()}});else if(u.type==="group")Wn(u,{progress:k,onApply:()=>{l++,setTimeout(()=>{m()},500)},onIgnore:()=>{n++,m()},onCancel:()=>{s=!0,y()}});else if(u.type==="empty-frame")Vn(u,{progress:k,onApply:()=>{l++,setTimeout(()=>{m()},500)},onIgnore:()=>{n++,m()},onCancel:()=>{s=!0,y()}});else if(u.type==="text-size-mobile")window.pendingTextSizeFixAllCallbacks={progress:k,onApply:()=>{l++,setTimeout(()=>{m()},500)},onIgnore:()=>{n++,m()},onCancel:()=>{s=!0,y()}},Yt(u);else if(u.type==="contrast")window.pendingContrastFixAllCallbacks={progress:k,onApply:()=>{l++,setTimeout(()=>{m()},500)},onIgnore:()=>{n++,m()},onCancel:()=>{s=!0,y()}},Jt(u);else if(u.type==="color-variable")if(u.matchingVariable&&u.matchingVariable.id){let S=function($){let E=$.data&&$.data.pluginMessage;!E||E.type!=="bind-color-variable-result"||E.issueId===u.id&&(window.removeEventListener("message",S),E.success?l++:n++,setTimeout(()=>{m()},300))};ae(u.id,"\u23F3 Binding variable...",!0),window.addEventListener("message",S),parent.postMessage({pluginMessage:{type:"bind-color-variable",issue:u,variableId:u.matchingVariable.id}},"*")}else n++,m();else n++,m()}m()}function ss(e,t,o,l={}){let n=Object.keys(J);Wt(e,t,o,J,n,Ye(We({},l),{showIgnore:!0}))}function ls(e,t,o,l,n={}){let s=document.getElementById("spacing-scale"),i=[0,4,8,12,16,24,32,40,48,64,72,80,88,96];if(s&&s.value.trim()){let a=s.value.split(",").map(c=>parseInt(c.trim(),10)).filter(c=>!isNaN(c));a.length>0&&(i=a)}Dt(e,t,o,l,i,Ye(We({},n),{showIgnore:!0}))}function Zt(e,t){if(!e||!t){console.error("handleApplyFigmaTextStyle: missing issue or style");return}ae(e.id,"\u23F3 Applying style...",!0),parent.postMessage({pluginMessage:{type:"apply-figma-text-style",issue:e,styleId:t.id,styleName:t.name}},"*")}function Kt(e,t){if(!e||!t){console.error("handleApplyTypographyStyle: missing issue or styleName");return}Xt(e,t)}function Bo(e){if(console.log("handleCreateTextStyle called",e),!e){console.error("handleCreateTextStyle: issue is null/undefined");return}zo(e,t=>{console.log("handleCreateTextStyle: sending message",{type:"create-text-style",issueId:e.id,styleName:t}),ae(e.id,"\u23F3 Creating style...",!0),parent.postMessage({pluginMessage:{type:"create-text-style",issue:e,styleName:t}},"*")})}function Fo(e,t){if(e==="typography-style"){let n={nodeName:`${t.length} text node(s)`,message:`Found ${t.length} text node(s) without text style`};zo(n,s=>{t.forEach(i=>{ae(i.id,"\u23F3 Creating style...",!0)}),parent.postMessage({pluginMessage:{type:"create-text-style-all",issues:t,styleName:s}},"*")});return}let o=t.filter(n=>n.bestMatch&&n.type==="typography-check"),l=t.filter(n=>!n.bestMatch||n.type!=="typography-check");if(o.length===0){alert(`No auto-fixable issues found in ${zt(e)}.

All ${t.length} issues require manual intervention.`);return}l.length>0&&!confirm(`Found ${o.length} auto-fixable issues and ${l.length} issues that require manual fix.

Do you want to auto-fix the ${o.length} issues now?

The ${l.length} issues will need to be fixed manually.`)||parent.postMessage({pluginMessage:{type:"fix-all-issues",issues:o,issueType:e}},"*")}function is(e){console.log("filterAndSearchIssues called",{totalIssues:e.length,currentFilter:Ue,currentSearch:Ie});let t=e;if(Ue!=="all"&&(t=t.filter(o=>o.severity===Ue),console.log("After severity filter:",t.length)),Ie.trim()){let o=Ie.toLowerCase();t=t.filter(l=>{let n=(l.message||"").toLowerCase(),s=(l.nodeName||"").toLowerCase(),i=(l.type||"").toLowerCase();return n.includes(o)||s.includes(o)||i.includes(o)}),console.log("After search filter:",t.length)}return console.log("Final filtered issues:",t.length),t}function He(e=[],t=!1,o={}){let{skipSave:l=!1,restoreTimestamp:n=null,skipTabSwitch:s=!1}=o;s||Oe("issues"),document.getElementById("issues-count").textContent=e.length,e&&Array.isArray(e)&&e.forEach(C=>{ge[C.id]===!0&&(C.ignored=!0,C.originalSeverity||(C.originalSeverity=C.severity),C.severity="info")});let i=h.issues!==e;h.issues=e;let a=n||new Date().toISOString();h.timestamp=a,Ct=!1,(t||i)&&(console.log("Resetting filters for new data"),Ue="all",Ze="all",Re&&(Re.value=""),Ie="",Fe&&(Fe.style.display="none"),Me&&Me.length>0&&Me.forEach(C=>{C.classList.remove("active"),C.getAttribute("data-filter")==="all"&&C.classList.add("active")}));let c=document.getElementById("filter-controls"),g=document.getElementById("color-type-filter"),d=document.getElementById("filter-buttons");c&&(c.style.display=e.length>0?"flex":"none"),g&&(g.style.display="none"),d&&(d.style.display="flex");let v=document.getElementById("export-group");v.style.display=e.length>0?"flex":"none",console.log("About to filter with:",{currentFilter:Ue,currentSearch:Ie});let f=is(e),y=new Set;if(i||(document.querySelectorAll(".issue-group").forEach(x=>{let N=x.getAttribute("data-issue-type");N&&!x.classList.contains("collapsed")&&y.add(N)}),console.log("Saved expanded groups:",Array.from(y))),It("issues"),f.length===0&&e.length===0){ce.innerHTML=`
              <div class="empty-state success">
                <div class="icon">\u2705</div>
                <p><strong>No issues found!</strong></p>
                <p style="margin-top: 8px; font-size: 12px;">Your design passed all configured checks.</p>
              </div>
            `;return}if(f.length===0&&e.length>0&&Ue!=="all"){ce.innerHTML=`
              <div class="empty-state">
                <div class="icon">\u{1F50D}</div>
                <p><strong>No results found</strong></p>
                <p style="margin-top: 8px; font-size: 12px;">Try changing the filter or search keyword.</p>
              </div>
            `;return}let m={error:f.filter(C=>C.severity==="error"&&!C.ignored).length,warn:f.filter(C=>C.severity==="warn"&&!C.ignored).length,total:f.length,originalTotal:e.length},u=0,k=0;f.forEach(function(C){C.ignored||((C.type==="typography-check"||C.type==="typography-style")&&C.nodeProps&&mt(C)!==null&&u++,C.type==="color-variable"&&(console.log("[Header Count] color-variable:",C.id,"matchingVariable:",!!C.matchingVariable,"opacity:",C.colorOpacity),C.matchingVariable&&(!C.colorOpacity||C.colorOpacity>=1)&&k++))});let S=u+k;console.log("[Header Count] typo100:",u,"colorVar:",k,"total:",S);let $=document.createElement("div");$.className="results-header";let E=S>0;$.innerHTML=`<h3>Check Result</h3><button class="btn-fix-all" id="btn-fix-all-100"${E?"":' style="display:none"'}>Fix all now (${S})</button>`,ce.appendChild($);let M=$.querySelector("#btn-fix-all-100");M&&(M.onclick=C=>{C.preventDefault(),C.stopPropagation(),os(e)}),At(e);let F=f.reduce((C,x)=>(C[x.type]=C[x.type]||[],C[x.type].push(x),C),{}),P=e.reduce((C,x)=>(C[x.type]=C[x.type]||[],C[x.type].push(x),C),{}),G=["naming","autolayout","spacing","color","color-variable","typography","typography-style","typography-check","line-height","position","duplicate","group","component","empty-frame","nested-group","contrast","text-size-mobile"],B=h.disabledChecks||[];for(let C of G){if(B.includes(C))continue;let x=F[C]||[],N=x.length,j=x.filter(r=>r.ignored?!1:r.severity==="error"||r.severity==="warn").length;if(N===0&&e.length===0||N===0&&Ue!=="all")continue;let oe=document.createElement("div"),ke=y.has(C);oe.className=ke?"issue-group":"issue-group collapsed",oe.setAttribute("data-issue-type",C);let he=document.createElement("div");he.className="issue-group-header";let Te=(P[C]||[]).some(r=>{try{if(!r)return!1;switch(r.type){case"color":return St(r)!==null;case"spacing":return kt(r)!==null;case"autolayout":return typeof dt=="function"&&dt(r)!==null;case"text-size-mobile":return typeof it=="function"&&it(r)!==null;case"contrast":return typeof gt=="function"&&gt(r)!==null;case"typography-style":case"typography-check":return r.bestMatch&&r.bestMatch.name&&typeof r.bestMatch.name=="string"&&r.bestMatch.name.trim().length>0&&Tt(r);case"position":return typeof lt=="function"&&lt(r)!==null;case"duplicate":case"component":return typeof pt=="function"&&pt(r)!==null;case"group":return!0;case"empty-frame":return typeof ut=="function"&&ut(r)!==null;default:return!1}}catch(ne){return console.error("[hasSuggestFixButton] Error checking issue:",r,ne),!1}});he.innerHTML=`
              <div class="issue-group-header-left">
                <button class="issue-group-toggle" type="button">
                  <span class="issue-group-toggle-icon">\u25B6</span>
                </button>
                <h4>${zt(C)}</h4>
                <span class="badge">${j}</span>
              </div>
              ${N>0&&C!=="typography"&&C!=="line-height"&&C!=="naming"&&C!=="component"&&C!=="duplicate"&&Te?`<button class="btn-fix-all" data-type="${C}">Fix all now</button>`:""}
            `;let Ee=he.querySelector(".issue-group-toggle"),Ae=()=>{oe.classList.contains("collapsed")?(oe.classList.remove("collapsed"),X.style.display="block",setTimeout(()=>{X.style.opacity="1"},10)):(X.style.opacity="0",setTimeout(()=>{oe.classList.add("collapsed"),X.style.display="none"},200))};Ee.onclick=r=>{r.stopPropagation(),Ae()},he.onclick=r=>{r.target!==Ee&&!Ee.contains(r.target)&&Ae()};let L=he.querySelector(".btn-fix-all");L&&(L.onclick=r=>{try{r.preventDefault(),r.stopPropagation();let ne=(P[C]||[]).filter(le=>{if(!le)return!1;switch(le.type){case"color":return St(le)!==null;case"spacing":return kt(le)!==null;case"autolayout":return typeof dt=="function"&&dt(le)!==null;case"text-size-mobile":return typeof it=="function"&&it(le)!==null;case"contrast":return typeof gt=="function"&&gt(le)!==null;case"typography-style":case"typography-check":return le.bestMatch&&le.bestMatch.name&&typeof le.bestMatch.name=="string"&&le.bestMatch.name.trim().length>0&&Tt(le);case"position":return typeof lt=="function"&&lt(le)!==null;case"duplicate":case"component":return typeof pt=="function"&&pt(le)!==null;case"group":return!0;case"empty-frame":return typeof ut=="function"&&ut(le)!==null;default:return!1}});if(ne.length===0){alert("No issues with suggest fix available");return}console.log("[Fix All]",C,ne.length,"fixable issues"),ns(C,ne)}catch(ne){console.error("[Fix All] Error:",ne.message),alert("Error: "+ne.message)}}),oe.appendChild(he);let X=document.createElement("div");if(X.className="issue-group-content",ke?(X.style.display="block",X.style.opacity="1"):X.style.display="none",N===0){let r=document.createElement("div");r.className="issue info",r.style.opacity="0.7",r.innerHTML=`
                <div class="issue-header">
                  <div>
                    <span class="issue-type">\u2705 PASSED</span>
                    <div class="issue-body">No issues in this type.</div>
                  </div>
                </div>
              `,X.appendChild(r)}else{if(F[C].forEach((r,ne)=>{let le=ne+1,be=ge[r.id]===!0;if(be&&(r.originalSeverity||(r.originalSeverity=r.severity),r.severity="info",r.ignored=!0),Vt.includes(r.type)&&r.nodeProps||Gt.includes(r.type)||_t.includes(r.type))return;let ee=document.createElement("div"),qe=be?"info":r.severity;ee.className=`issue ${qe}`,ee.setAttribute("data-issue-id",r.id);let Je=p(r.message);if(r.type==="contrast"){let U=[];if(r.textColor&&U.push(`Text color: <code style="background: ${p(r.textColor)}; padding: 2px 6px; border-radius: 3px; color: ${wt(r.textColor)};">${p(r.textColor)}</code> (${r.textColorNode||r.nodeName||"Unnamed"})`),r.backgroundColor){let ye="Background:",bt="",vt="";r.isGradient&&r.gradientString?(ye="Background (gradient):",bt=`<code style="background: ${p(r.backgroundColor)}; padding: 2px 6px; border-radius: 3px; color: ${wt(r.backgroundColor)}; font-family: 'SF Mono', Monaco, monospace; font-size: 11px;">${p(r.gradientString)}</code>`,vt=" <span style='font-size: 11px; color: #999;'>(average: "+p(r.backgroundColor)+")</span>"):bt=`<code style="background: ${p(r.backgroundColor)}; padding: 2px 6px; border-radius: 3px; color: ${wt(r.backgroundColor)};">${p(r.backgroundColor)}</code>`,r.fromSibling&&(vt+=" <span style='font-size: 11px; color: #3b82f6;'>(from sibling layer)</span>"),U.push(`${ye} ${bt}${vt} (${r.backgroundColorNode||"Unknown"})`)}U.length>0&&(Je+=`<div style="margin-top: 8px; font-size: 10px; color: #666;">${U.join(" | ")}</div>`)}ee.innerHTML=`
                <div class="issue-header">
                  <div>
                    <span class="issue-type">
                      <span class="issue-number">#${le}</span>
                      ${In(be?"info":r.severity)} ${be?"INFO":r.severity.toUpperCase()}
                    </span>
                    <div class="issue-body">${Je}</div>
                    ${r.nodeName?`<div class="issue-node">Node: ${p(r.nodeName)}</div>`:""}
                    ${r.type==="typography"||r.type==="line-height"?`<div style="margin-top: 8px; padding: 8px 12px; background: #fff3cd; border-left: 3px solid #ffc107; border-radius: 4px; font-size: 10px; color: #856404; line-height: 1.5;"><strong>Note:</strong> Check 'Typography Style Match' to resolve this issue.</div>`:""}
                    ${r.ignored?'<div class="issue-ignored-tag" style="margin-top: 4px; padding: 4px 8px; background: #e3f2fd; color: #1976d2; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-block;">\u2713 Pass with ignore custom</div>':""}
                  </div>
                  <div class="issue-actions">
                    <button class="btn-select" data-id="${r.id}">Select</button>
                    ${r.type==="color"?`
                      ${St(r)?`<button class="btn-suggest-fix" data-id="${r.id}">Suggest Fix now</button>`:""}
                      <button class="btn-fix" data-id="${r.id}">Select Color</button>
                    `:""}
                    ${r.type==="color-variable"?`
                      ${r.matchingVariable?`<button class="btn-suggest-fix btn-bind-variable" data-id="${r.id}" data-variable-id="${r.matchingVariable.id}" data-variable-name="${p(r.matchingVariable.name)}">Bind Variable</button>`:""}
                      <button class="btn-fix btn-select-variable" data-id="${r.id}">Select Variable</button>
                    `:""}
                    ${r.type==="spacing"?`
                      ${kt(r)?`<button class="btn-suggest-fix" data-id="${r.id}">Suggest Fix now</button>`:""}
                      <button class="btn-fix" data-id="${r.id}">Select Spacing</button>
                    `:""}
                    ${r.type==="autolayout"?`
                      ${dt(r)?`<button class="btn-suggest-fix" data-id="${r.id}">Suggest Fix now</button>`:""}
                      <button class="btn-fix" data-id="${r.id}">Select</button>
                    `:""}
                    ${r.type==="text-size-mobile"?`
                      ${it(r)?`<button class="btn-suggest-fix" data-id="${r.id}">Suggest Fix now</button>`:""}
                      <button class="btn-fix" data-id="${r.id}">Select Style</button>
                    `:""}
                    ${r.type==="contrast"?`
                      ${gt(r)?`<button class="btn-suggest-fix" data-id="${r.id}">Suggest Fix now</button>`:""}
                      <button class="btn-fix" data-id="${r.id}">Select Color</button>
                      <button class="btn-ignore" data-id="${r.id}" ${r.ignored?'style="background: #22c55e; border-color: #22c55e;"':""}>${r.ignored?"Ignored":"Ignore"}</button>
                    `:""}
                    ${r.type==="typography-style"?`
                      ${r.bestMatch&&r.bestMatch.name&&Tt(r)?`
                        <button class="btn-suggest-fix" data-id="${r.id}" data-style-name="${p(r.bestMatch.name)}">Suggest Fix now</button>
                      `:""}
                      <button class="btn-fix" data-id="${r.id}">Select Style</button>
                      <button class="btn-create-style" data-id="${r.id}" data-issue-type="${r.type}">Create Style</button>
                    `:""}
                    ${r.type==="position"?`
                      ${lt(r)?`<button class="btn-suggest-fix" data-id="${r.id}">Suggest Fix now</button>`:""}
                      <button class="btn-remove-layer" data-id="${r.id}">Remove Layer</button>
                    `:""}
                    ${(r.severity==="error"||r.severity==="warn")&&r.type!=="position"?`
                      <button class="btn-remove-layer" data-id="${r.id}">Remove Layer</button>
                    `:""}
                    ${r.type==="duplicate"?`
                      ${pt(r)?`<button class="btn-suggest-fix" data-id="${r.id}">Suggest Fix now</button>`:""}
                      <button class="btn-select-component" data-id="${r.id}">Select Component</button>
                      <button class="btn-create-component" data-id="${r.id}">Create New Component</button>
                    `:""}
                    ${r.type==="component"?`
                      ${pt(r)?`<button class="btn-suggest-fix" data-id="${r.id}">Suggest Fix now</button>`:""}
                      <button class="btn-select-component" data-id="${r.id}">Select Component</button>
                      <button class="btn-create-component" data-id="${r.id}">Create New Component</button>
                    `:""}
                    ${r.type==="group"?`
                      <button class="btn-suggest-fix" data-id="${r.id}">Suggest Fix now</button>
                    `:""}
                    ${r.type==="naming"?`
                      <button class="btn-rename" data-id="${r.id}">Rename</button>
                    `:""}
                    ${r.type==="empty-frame"?`
                      ${ut(r)?`<button class="btn-suggest-fix" data-id="${r.id}">Suggest Fix now</button>`:""}
                    `:""}
                  </div>
                </div>
              `,X.appendChild(ee),ee.setAttribute("data-issue-id",r.id),ee.setAttribute("data-issue-type",r.type);let De=ee.querySelector("button.btn-select");De&&(De.onclick=()=>{document.querySelectorAll(".btn-select.active").forEach(U=>U.classList.remove("active")),document.querySelectorAll(".issue.selected").forEach(U=>U.classList.remove("selected")),De.classList.add("active"),ee.classList.add("selected"),parent.postMessage({pluginMessage:{type:"select-node",id:r.id}},"*")});let we=ee.querySelector("button.btn-fix");we&&(r.type==="color"?we.onclick=()=>{es(r)}:r.type==="spacing"?we.onclick=()=>{Qn(r)}:r.type==="text-size-mobile"?we.onclick=U=>{U.preventDefault(),U.stopPropagation(),console.log("Text Size Fix button clicked",r),typeof Io=="function"?Io(r):(console.error("handleFixTextSizeIssue is not a function"),alert("Error: handleFixTextSizeIssue function not found"))}:r.type==="contrast"?we.onclick=U=>{U.preventDefault(),U.stopPropagation(),console.log("Contrast Fix button clicked",r),typeof $o=="function"?$o(r):(console.error("handleFixContrastIssue is not a function"),alert("Error: handleFixContrastIssue function not found"))}:we.onclick=()=>{ts(r)});let Ce=ee.querySelector("button.btn-suggest-fix");Ce&&(r.type==="color"?Ce.onclick=()=>{Ln(r)}:r.type==="spacing"?Ce.onclick=()=>{Hn(r)}:r.type==="autolayout"?Ce.onclick=U=>{U.preventDefault(),U.stopPropagation(),console.log("Autolayout Suggest Fix button clicked",r),typeof mo=="function"?mo(r):(console.error("handleSuggestFixAutolayout is not a function"),alert("Error: handleSuggestFixAutolayout function not found"))}:r.type==="text-size-mobile"?Ce.onclick=U=>{U.preventDefault(),U.stopPropagation(),console.log("Text Size Suggest Fix button clicked",r),typeof Yt=="function"?Yt(r):(console.error("handleSuggestFixTextSize is not a function"),alert("Error: handleSuggestFixTextSize function not found"))}:r.type==="position"?Ce.onclick=U=>{U.preventDefault(),U.stopPropagation(),console.log("Position Suggest Fix button clicked",r),typeof yo=="function"?yo(r):(console.error("handleSuggestFixPosition is not a function"),alert("Error: handleSuggestFixPosition function not found"))}:r.type==="duplicate"||r.type==="component"?Ce.onclick=U=>{U.preventDefault(),U.stopPropagation(),console.log("Component Suggest Fix button clicked",r),typeof vo=="function"?vo(r):(console.error("handleSuggestFixComponent is not a function"),alert("Error: handleSuggestFixComponent function not found"))}:r.type==="contrast"?Ce.onclick=U=>{U.preventDefault(),U.stopPropagation(),console.log("Contrast Suggest Fix button clicked",r),typeof Jt=="function"?Jt(r):(console.error("handleSuggestFixContrast is not a function"),alert("Error: handleSuggestFixContrast function not found"))}:r.type==="group"?Ce.onclick=U=>{U.preventDefault(),U.stopPropagation(),console.log("Group Suggest Fix button clicked",r),typeof fo=="function"?fo(r):(console.error("handleSuggestFixGroup is not a function"),alert("Error: handleSuggestFixGroup function not found"))}:r.type==="empty-frame"?Ce.onclick=U=>{U.preventDefault(),U.stopPropagation(),console.log("Empty Frame Suggest Fix button clicked",r),typeof ho=="function"?ho(r):(console.error("handleSuggestFixEmptyFrame is not a function"),alert("Error: handleSuggestFixEmptyFrame function not found"))}:r.type==="color-variable"&&(Ce.onclick=U=>{if(U.preventDefault(),U.stopPropagation(),r.matchingVariable&&r.matchingVariable.id){if(r.colorOpacity&&r.colorOpacity<1){let ye=Math.round(r.colorOpacity*100);if(!confirm(`This layer has opacity ${ye}%. Binding a variable will reset opacity to 100%. Continue?`))return}ae(r.id,"\u23F3 Binding variable...",!0),parent.postMessage({pluginMessage:{type:"bind-color-variable",issue:r,variableId:r.matchingVariable.id}},"*")}}));let at=ee.querySelector("button.btn-select-component");at&&(r.type==="duplicate"||r.type==="component")&&(function(U){at.onclick=ye=>{ye.preventDefault(),ye.stopPropagation(),console.log("Select Component button clicked",U),typeof xo=="function"?xo(U):(console.error("handleSelectComponent is not a function"),alert("Error: handleSelectComponent function not found"))}})(r);let Pe=ee.querySelector("button.btn-create-component");Pe&&(r.type==="duplicate"||r.type==="component")&&(function(U){Pe.onclick=ye=>{ye.preventDefault(),ye.stopPropagation(),console.log("Create Component button clicked",U),typeof So=="function"?So(U):(console.error("handleCreateComponent is not a function"),alert("Error: handleCreateComponent function not found"))}})(r);let ot=ee.querySelector("button.btn-select-variable");ot&&r.type==="color-variable"&&(function(U){ot.onclick=ye=>{ye.preventDefault(),ye.stopPropagation(),No(U)}})(r);let dn=ee.querySelector("button.btn-rename");dn&&r.type==="naming"&&(function(U){dn.onclick=ye=>{ye.preventDefault(),ye.stopPropagation(),console.log("Rename button clicked",U),typeof ko=="function"?ko(U):(console.error("handleRenameNode is not a function"),alert("Error: handleRenameNode function not found"))}})(r);let pn=ee.querySelector("button.btn-remove-layer");pn&&(function(U){pn.onclick=ye=>{ye.preventDefault(),ye.stopPropagation(),console.log("Remove Layer button clicked",U),typeof Nt=="function"?Nt(U):(console.error("handleRemoveLayer is not a function"),alert("Error: handleRemoveLayer function not found"))}})(r);let ao=ee.querySelector("button.btn-ignore");if(ao&&r.type==="contrast"&&(ao.removeAttribute("disabled"),ao.onclick=U=>{U.preventDefault(),U.stopPropagation(),console.log("Ignore button clicked",r);try{typeof Mo=="function"?Mo(r):(console.error("handleIgnoreIssue is not a function"),alert("Error: handleIgnoreIssue function not found"))}catch(ye){console.error("Error handling ignore:",ye),alert(`Error: ${ye.message}`)}}),r.type==="typography-style"){let U=ee.querySelector("button.btn-create-style");U?(console.log("Attaching create style handler to button",{issueId:r.id,issueType:r.type,nodeName:r.nodeName}),(function(Be){U.onclick=Le=>{Le.preventDefault(),Le.stopPropagation(),console.log("Create Style button clicked",Be),typeof Bo=="function"?Bo(Be):(console.error("handleCreateTextStyle is not a function"),alert("Error: handleCreateTextStyle function not found"))}})(r)):console.error("Create Style button not found in DOM",{issueId:r.id,issueType:r.type,hasIssueEl:!!ee,innerHTML:ee.innerHTML.substring(0,200)});let ye=ee.querySelector("button.btn-suggest-fix");ye&&r.bestMatch&&r.bestMatch.name&&r.type==="typography-style"&&(function(Be){ye.onclick=Le=>{Le.preventDefault(),Le.stopPropagation();let xt=ye.getAttribute("data-style-name");xt?Kt(Be,xt):(console.error("Cannot apply: styleName is missing from button",Be),alert("Error: Style name is missing"))}})(r),ye&&r.bestMatch&&r.bestMatch.name&&r.type==="typography-check"&&(function(Be){ye.onclick=Le=>{Le.preventDefault(),Le.stopPropagation(),Be.bestMatch&&Be.bestMatch.name?Kt(Be,Be.bestMatch.name):(console.error("Cannot apply: bestMatch.name is missing",Be),alert("Error: Best match style name is missing"))}})(r);let bt=ee.querySelector("button.btn-fix");bt&&r.type==="typography-style"&&(function(Be){bt.onclick=Le=>{Le.preventDefault(),Le.stopPropagation(),parent.postMessage({pluginMessage:{type:"get-figma-text-styles",issueId:Be.id}},"*"),window.pendingTypographyStyleIssue=Be}})(r);let vt=ee.querySelector("button.btn-style-dropdown"),rt=ee.querySelector(".style-dropdown-menu");if(vt&&rt){let Be=!1;vt.onclick=Le=>{Le.preventDefault(),Le.stopPropagation();let xt=rt.style.display!=="none";document.querySelectorAll(".style-dropdown-menu").forEach(un=>{un!==rt&&(un.style.display="none")}),xt?rt.style.display="none":(rt.style.display="block",Be||(rt.innerHTML='<div style="padding: 8px 12px; color: #999; font-size: 12px; text-align: center;">Loading...</div>',parent.postMessage({pluginMessage:{type:"get-figma-text-styles",issueId:r.id}},"*")))},document.addEventListener("click",function(xt){ee.contains(xt.target)||(rt.style.display="none")})}}}),Vt.includes(C)){let ne=(F[C]||[]).filter(le=>!le.ignored&&le.severity!=="info"&&le.nodeProps);if(ne.length>0){let{typographyGroups:le,otherIssues:be}=$n(ne);be.forEach(ee=>{let qe=jt(ee);qe&&X.appendChild(qe)}),le.forEach(ee=>{let qe=Fn(ee);qe&&X.appendChild(qe)})}}if(Gt.includes(C)){let r=(F[C]||[]).filter(ne=>!ne.ignored);if(r.length>0){let{colorGroups:ne,otherIssues:le}=Tn(r);le.forEach(be=>{let ee=jt(be);ee&&X.appendChild(ee)}),ne.forEach(be=>{let ee=An(be);ee&&X.appendChild(ee)})}}if(_t.includes(C)){let r=(F[C]||[]).filter(ne=>!ne.ignored);if(r.length>0){let{simpleGroups:ne,otherIssues:le}=Nn(r);le.forEach(be=>{let ee=jt(be);ee&&X.appendChild(ee)}),ne.forEach(be=>{let ee=Bn(be);ee&&X.appendChild(ee)})}}}oe.appendChild(X),ce.appendChild(oe)}l||Ut({issues:e,issuesTimestamp:a,tokens:h.tokens,tokensTimestamp:h.tokensTimestamp,lastActiveTab:"issues",scanMode:h.scanMode||null,context:h.context||null})}function as(e){if(console.log("filterAndSearchTokens called",{hasTokens:!!e,currentColorTypeFilter:Ze,currentSearch:Ie}),!e)return null;let t={},o=!1;for(let[l,n]of Object.entries(e)){let s=n||[];if(console.log(`Processing ${l}, initial count:`,s.length),(l==="colors"||l==="gradients")&&Ze!=="all"&&(s=s.filter(i=>(i.colorType||"").toLowerCase().includes(Ze.toLowerCase())),console.log(`After color type filter (${Ze}):`,s.length)),Ie.trim()){let i=Ie.toLowerCase();s=s.map(a=>{let c=String(a.value||"").toLowerCase(),g=(a.nodes||[]).map(m=>m.name||"").join(" ").toLowerCase(),d=(a.colorType||"").toLowerCase(),v=c.includes(i),f=g.includes(i),y=d.includes(i);if(v||f||y){let m=[];return v&&m.push("value"),f&&m.push("nodeName"),y&&m.push("colorType"),Ye(We({},a),{_matchedBy:m,_matchedNodeNames:f?(a.nodes||[]).filter(u=>(u.name||"").toLowerCase().includes(i)).map(u=>u.name):[]})}return null}).filter(a=>a!==null),console.log(`After search filter (${l}):`,s.length)}s.length>0&&(o=!0),t[l]=s}return console.log("Final filtered tokens keys:",Object.keys(t)),{tokens:t,hasMatches:o}}function rs(e){let t=document.getElementById("spacing-scale");if(!t)return;let o=document.getElementById("spacing-threshold"),l=o?parseInt(o.value,10):100,n=isNaN(l)?100:l,i=(e&&Array.isArray(e.spacing)?e.spacing:[]).map(c=>{let g=parseInt(String(c&&c.value!==void 0?c.value:"").trim(),10);return isNaN(g)?null:Math.abs(g)}).filter(c=>c!==null&&c<=n);if(!i.length)return;let a=Array.from(new Set(i)).sort((c,g)=>c-g);t.value=a.join(", ");try{t.focus(),t.setSelectionRange(t.value.length,t.value.length)}catch(c){}}function $t(e,t=!1,o={}){let{skipSave:l=!1,restoreTimestamp:n=null,skipTabSwitch:s=!1}=o;s||Oe("tokens");let i=Object.values(e||{}).reduce((M,F)=>M+(Array.isArray(F)?F.length:0),0);document.getElementById("tokens-count").textContent=i;let a=h.tokens!==e;h.tokens=e;let c=n||new Date().toISOString();h.tokensTimestamp=c,Ct=!0,(t||a)&&(console.log("Resetting filters for new token data"),Ue="all",Ze="all",Re&&(Re.value=""),Ie="",Fe&&(Fe.style.display="none"),Me&&Me.length>0&&Me.forEach(M=>{M.classList.remove("active"),M.getAttribute("data-filter")==="all"&&M.classList.add("active")}),ft&&(ft.value="all"));let g=document.getElementById("filter-controls"),d=document.getElementById("color-type-filter"),v=document.getElementById("filter-buttons");g&&(g.style.display=e&&Object.keys(e).length>0?"flex":"none"),d&&(d.style.display=e&&(e.colors||e.gradients)?"block":"none"),v&&(v.style.display="none");let f=document.getElementById("export-group");f.style.display=e&&Object.keys(e).length>0?"flex":"none",console.log("About to filter tokens with:",{currentColorTypeFilter:Ze,currentSearch:Ie});let y=as(e);if(It("tokens"),!e||Object.keys(e).length===0){me.innerHTML=`
              <div class="empty-state">
                <div class="icon">\u{1F4CB}</div>
                <p>No design tokens found</p>
              </div>
            `;return}if(!y){me.innerHTML=`
              <div class="empty-state">
                <div class="icon">\u{1F50D}</div>
                <p><strong>No results found</strong></p>
                <p style="margin-top: 8px; font-size: 12px;">Try changing the filter or search keyword.</p>
              </div>
            `;return}let m=y.tokens||{},u=y.hasMatches;if((Ie.trim()||Ze!=="all")&&!u){me.innerHTML=`
              <div class="empty-state">
                <div class="icon">\u{1F50D}</div>
                <p><strong>No results found</strong></p>
                <p style="margin-top: 8px; font-size: 12px;">Try changing the filter or search keyword.</p>
              </div>
            `;return}let S={colors:{icon:"",label:"Colors",values:m.colors||[]},gradients:{icon:"",label:"Gradients",values:m.gradients||[]},spacing:{icon:"",label:"Spacing (px)",values:m.spacing||[]},borderRadius:{icon:"",label:"Border Radius",values:m.borderRadius||[]},fontWeight:{icon:"",label:"Font Weight",values:m.fontWeight||[]},lineHeight:{icon:"",label:"Line Height (%)",values:m.lineHeight||[]},fontSize:{icon:"",label:"Font Size",values:m.fontSize||[]},fontFamily:{icon:"",label:"Font Family",values:m.fontFamily||[]}},$=document.createElement("div");$.className="results-header";let E=Object.values(S).reduce((M,F)=>M+F.values.length,0);$.innerHTML=`
            <h3>Design Tokens</h3>
            <div class="results-stats">
              <span class="stat">${E} Tokens</span>
            </div>
          `,me.appendChild($);for(let[M,F]of Object.entries(S)){let P=document.createElement("div");P.className="issue-group collapsed";let G=document.createElement("div");G.className="issue-group-header",G.innerHTML=`
              <div class="issue-group-header-left">
                <button class="issue-group-toggle" type="button">
                  <span class="issue-group-toggle-icon">\u25B6</span>
                </button>
                <h4>${document.documentElement.dataset.showIcons==="true"?F.icon+" ":""}${F.label}</h4>
                <span class="badge">${F.values.length}</span>
              </div>
            `;let B=document.createElement("div");B.className="issue-group-content",B.style.display="none";let C=G.querySelector(".issue-group-toggle"),x=()=>{P.classList.contains("collapsed")?(P.classList.remove("collapsed"),B.style.display="block",setTimeout(()=>{B.style.opacity="1"},10)):(B.style.opacity="0",setTimeout(()=>{P.classList.add("collapsed"),B.style.display="none"},200))};if(C.onclick=j=>{j.stopPropagation(),x()},G.onclick=j=>{j.target!==C&&!C.contains(j.target)&&x()},P.appendChild(G),Array.isArray(F.values)&&F.values.length>0){let j=document.createElement("div");j.className="token-list",F.values.forEach((oe,ke)=>{let he=ke+1,Te=document.createElement("div");Te.className="token-item";let Ee=oe.value,Ae=oe.nodes||[],L=Ae.length>0?Ae[0]:null,X=typeof oe.totalNodes=="number"?oe.totalNodes:Ae.length,r=oe.colorType||null,ne="";if(M==="colors"){let we=r?`<span class="token-color-type">${p(r)}</span>`:"";ne=`
                  <span class="token-number">#${he}</span>
                  <span class="token-color-preview" style="background-color: ${p(Ee)}"></span>
                  <code>${p(Ee)}</code>
                  ${we}
                `}else if(M==="gradients"){let we=r?`<span class="token-color-type">${p(r)}</span>`:"";ne=`
                  <span class="token-number">#${he}</span>
                  <span class="token-gradient-preview" style="background: ${p(Ee)}"></span>
                  <code>${p(Ee)}</code>
                  ${we}
                `}else ne=`<span class="token-number">#${he}</span><code>${p(String(Ee))}</code>`;let le=oe._matchedBy||[],be=oe._matchedNodeNames||[],ee=le.includes("nodeName"),qe="";L&&L.name&&(ee&&be.length>0?qe=`<div class="token-node-name token-matched-by-name">
                    <span class="match-indicator">\u{1F50D} Matched in:</span> ${be.map(Ce=>`<span class="token-matched-node">${p(Ce)}</span>`).join(", ")}
                  </div>`:qe=`<div class="token-node-name">Node: ${p(L.name)}</div>`);let Je="";if(M==="fontWeight"){let Ce=Array.isArray(oe.fontFamilies)?oe.fontFamilies:null;if(!Ce){let at={};Ae.forEach(Pe=>{let ot=Pe&&Pe.fontFamily?String(Pe.fontFamily):"Unknown";at[ot]=(at[ot]||0)+1}),Ce=Object.entries(at).map(([Pe,ot])=>({family:Pe,count:ot})).sort((Pe,ot)=>ot.count-Pe.count||Pe.family.localeCompare(ot.family))}Array.isArray(Ce)&&Ce.length>0&&(Je=`
                    <div class="token-note">
                      <div class="token-note-label">Font-family:</div>
                      <ul class="token-note-list">${Ce.map(Pe=>`<li><code>${p(Pe.family)}</code> (${Pe.count})</li>`).join("")}</ul>
                    </div>
                  `)}Te.innerHTML=`
                <div class="token-item-row">
                  <div class="token-value">
                    ${ne}
                  </div>
                  ${L?`
                    <div class="token-actions">
                      <button class="btn-select" data-id="${L.id}">Select</button>
                      ${X>1?`<span class="token-node-count">(${X})</span>`:""}
                    </div>
                  `:""}
                </div>
                ${qe}
                ${Je}
              `;let De=Te.querySelector("button.btn-select");De&&(De.onclick=()=>{document.querySelectorAll(".btn-select.active").forEach(we=>we.classList.remove("active")),document.querySelectorAll(".issue.selected, .token-item.selected").forEach(we=>we.classList.remove("selected")),De.classList.add("active"),Te.classList.add("selected"),parent.postMessage({pluginMessage:{type:"select-node",id:L.id}},"*")}),j.appendChild(Te)}),B.appendChild(j)}else{let j=document.createElement("div");j.className="token-empty-message",j.textContent="No tokens in this group.",B.appendChild(j)}P.appendChild(B),me.appendChild(P)}l||Ut({issues:h.issues,issuesTimestamp:h.timestamp,tokens:e,tokensTimestamp:c,lastActiveTab:"tokens",scanMode:h.scanMode||null,context:h.context||null})}function st(e){let t=document.getElementById("validation-error"),o=document.getElementById("validation-error-message"),l=document.getElementById("btn-close-validation-error");t&&o&&(o.textContent=e,t.style.display="block",w.style.display="block",T.style.display="none",b.style.display="none",w.disabled=!1,z.disabled=!1,setTimeout(()=>{t.style.display==="block"&&(t.style.display="none")},1e4),l&&(l.onclick=()=>{t.style.display="none"}))}function Ao(e){var F,P,G,B,C,x,N;w.style.display="none",T.style.display="block",b.style.display="block",I.style.transition="none",I.style.width="0%",A.textContent="0%",setTimeout(()=>{I.style.transition="width 0.3s"},10),Q();let t=document.getElementById("spacing-scale"),o=document.getElementById("spacing-threshold"),l=document.getElementById("color-scale"),n=document.getElementById("font-size-scale"),s=document.getElementById("font-size-threshold"),i=document.getElementById("line-height-scale"),a=document.getElementById("line-height-threshold"),c=document.getElementById("line-height-baseline-threshold"),g=t?t.value.trim():"",d=o?parseInt(o.value,10):100,v=l?l.value.trim():"",f=n?n.value.trim():"",y=s?parseInt(s.value,10):100,m=i?i.value.trim():"",u=a?parseInt(a.value,10):300,k=c?parseInt(c.value,10):120,S={checkStyle:((F=document.getElementById("rule-typo-style"))==null?void 0:F.checked)||!1,checkFontFamily:((P=document.getElementById("rule-font-family"))==null?void 0:P.checked)||!1,checkFontSize:((G=document.getElementById("rule-font-size"))==null?void 0:G.checked)||!1,checkFontWeight:((B=document.getElementById("rule-font-weight"))==null?void 0:B.checked)||!1,checkLineHeight:((C=document.getElementById("rule-line-height"))==null?void 0:C.checked)||!1,checkLetterSpacing:((x=document.getElementById("rule-letter-spacing"))==null?void 0:x.checked)||!1,checkWordSpacing:((N=document.getElementById("rule-word-spacing"))==null?void 0:N.checked)||!1},$=document.getElementById("scan-skip-names"),E=$?$.value.trim():"not check design, sticky note, vector, Clip path group, Clip path",M=typeof window.getAppliedScanSettings=="function"?window.getAppliedScanSettings():{};parent.postMessage({pluginMessage:{type:"scan",mode:e,spacingScale:g,spacingThreshold:d,colorScale:v,fontSizeScale:f,fontSizeThreshold:y,lineHeightScale:m,lineHeightThreshold:u,lineHeightBaselineThreshold:k,typographyStyles:K,typographyRules:S,ignoredIssues:ge,skipNames:E,scanSettings:M}},"*"),console.log("Message sent:",{type:"scan",mode:e})}w.onclick=()=>{var e;console.log("btnScan clicked");try{let t=document.getElementById("validation-error");t&&(t.style.display="none");let o=((e=document.querySelector('input[name="scope"]:checked'))==null?void 0:e.value)||"page",l=document.getElementById("spacing-scale"),n=document.getElementById("spacing-threshold"),s=document.getElementById("color-scale"),i=document.getElementById("font-size-scale"),a=document.getElementById("font-size-threshold"),c=document.getElementById("line-height-scale"),g=document.getElementById("line-height-threshold"),d=document.getElementById("line-height-baseline-threshold"),v=l?l.value.trim():"",f=n?parseInt(n.value,10):100,y=s?s.value.trim():"",m=i?i.value.trim():"",u=a?parseInt(a.value,10):100,k=c?c.value.trim():"",S=g?parseInt(g.value,10):300,$=d?parseInt(d.value,10):120;if(v&&!/^\d+(\s*,\s*\d+)*$/.test(v)){st("Spacing guidelines format is incorrect. Please enter the numbers separated by commas (e.g. 4, 8, 12, 16)");return}if(y){let E=y.split(",").map(P=>P.trim()).filter(P=>P),M=/^#[0-9a-fA-F]{3,8}$/,F=E.filter(P=>!M.test(P));if(F.length>0){st(`Color format is incorrect. Invalid colors: ${F.join(", ")}. Please use hex format only.`);return}}if(m&&!/^\d+(\s*,\s*\d+)*$/.test(m)){st("Font-size scale format is incorrect. Please enter the numbers separated by commas (e.g. 32, 24, 20, 18)");return}if(k){let E=k.split(",").map(F=>F.trim()).filter(F=>F);if(!E.every(F=>F.toLowerCase()==="auto"||/^\d+$/.test(F))||E.length===0){st('Line-height scale format is incorrect. Please enter "auto" and/or numbers separated by commas.');return}}if(isNaN(f)||f<0){st("Spacing threshold must be a number >= 0");return}if(isNaN(u)||u<0){st("Font-size threshold must be a number >= 0");return}if(isNaN(S)||S<0){st("Line-height threshold must be a number >= 0");return}if(isNaN($)||$<0){st("Line-height baseline threshold must be a number >= 0");return}ce.innerHTML=`
        <div class="scanning">
          <div class="spinner"></div>
          <p>Checking design size...</p>
        </div>
      `,Oe("issues"),w.disabled=!0,z.disabled=!0,h.scanMode=o,ve(),xe={scope:o},parent.postMessage({pluginMessage:{type:"get-node-count",mode:o}},"*")}catch(t){console.error("Error in btnScan.onclick:",t),ce.innerHTML=`<div class="error-message">Error: ${p(t.message)}</div>`,Oe("issues"),w.disabled=!1,z.disabled=!1}},z.onclick=()=>{var e;console.log("btnExtractTokens clicked");try{z.style.display="none",T.style.display="block",b.style.display="block",I.style.transition="none",I.style.width="0%",A.textContent="0%",setTimeout(()=>{I.style.transition="width 0.3s"},10);let t=((e=document.querySelector('input[name="scope"]:checked'))==null?void 0:e.value)||"page";me.innerHTML=`
        <div class="scanning">
          <div class="spinner"></div>
          <p>Extracting design tokens... Please wait</p>
        </div>
      `,Oe("tokens"),w.disabled=!0,z.disabled=!0,h.scanMode=t,parent.postMessage({pluginMessage:{type:"extract-tokens",mode:t}},"*"),console.log("Message sent:",{type:"extract-tokens",mode:t})}catch(t){console.error("Error in btnExtractTokens.onclick:",t),me.innerHTML=`<div class="error-message">Error: ${p(t.message)}</div>`,Oe("tokens"),w.disabled=!1,z.disabled=!1}},D.onclick=()=>{try{rs(h.tokens)}catch(e){console.error("Failed to fill spacing guidelines from tokens",e)}},Y.onclick=()=>{try{let e=h.tokens;if(!e||!Array.isArray(e.colors)||!e.colors.length){alert("No color tokens found. Please run 'Extract Design Tokens' first.");return}let t=document.getElementById("color-scale");if(!t)return;let l=(e.colors||[]).map(s=>String(s&&s.value!==void 0?s.value:"").trim().toUpperCase()).filter(s=>s&&s.startsWith("#"));if(!l.length)return;let n=Array.from(new Set(l)).sort((s,i)=>ct(s)-ct(i));t.value=n.join(", "),typeof je=="function"&&je();try{t.focus(),t.setSelectionRange(t.value.length,t.value.length)}catch(s){}}catch(e){console.error("Failed to fill color from tokens",e)}},O.onclick=()=>{parent.postMessage({pluginMessage:{type:"extract-color-styles"}},"*")};let Lo=document.getElementById("btn-extract-color-variables");Lo&&(Lo.onclick=()=>{parent.postMessage({pluginMessage:{type:"extract-color-variables"}},"*")}),q.onclick=()=>{try{let e=h.tokens;if(!e||!Array.isArray(e.fontSize)||!e.fontSize.length){alert("No font size tokens found. Please run 'Extract Design Tokens' first.");return}let t=document.getElementById("font-size-scale");if(!t)return;let o=document.getElementById("font-size-threshold"),l=o?parseInt(o.value,10):100,n=isNaN(l)?100:l,s=e.fontSize.map(a=>parseInt(String(a&&a.value!==void 0?a.value:"").trim(),10)).filter(a=>!isNaN(a)&&a<=n);if(!s.length)return;let i=Array.from(new Set(s)).sort((a,c)=>c-a);t.value=i.join(", "),t.focus(),t.setSelectionRange(t.value.length,t.value.length)}catch(e){console.error("Failed to fill font size from tokens",e)}},W.onclick=()=>{try{let e=h.tokens;if(!e||!Array.isArray(e.lineHeight)||!e.lineHeight.length){alert("No line height tokens found. Please run 'Extract Design Tokens' first.");return}let t=document.getElementById("line-height-scale");if(!t)return;let o=document.getElementById("line-height-threshold"),l=o?parseInt(o.value,10):300,n=isNaN(l)?300:l,s=[];if(e.lineHeight.forEach(d=>{let v=String(d&&d.value!==void 0?d.value:"").trim();if(v==="auto")s.push("auto");else{let f=parseFloat(v);!isNaN(f)&&f<=n&&s.push(f)}}),!s.length)return;let i=s.includes("auto"),a=s.filter(d=>d!=="auto"),c=Array.from(new Set(a)).sort((d,v)=>d-v),g=i?["auto",...c]:c;t.value=g.join(", "),t.focus(),t.setSelectionRange(t.value.length,t.value.length)}catch(e){console.error("Failed to fill line height from tokens",e)}},V.onclick=()=>{try{if(!K||!Array.isArray(K)||K.length===0){alert("No typography styles defined. Please add typography styles or extract from Figma first.");return}let e=document.getElementById("font-size-scale");if(!e)return;let t=K.map(l=>{let n=parseInt(String(l.fontSize||"").trim(),10);return isNaN(n)?null:n}).filter(l=>l!==null);if(!t.length){alert("No valid font sizes found in typography styles.");return}let o=Array.from(new Set(t)).sort((l,n)=>n-l);e.value=o.join(", "),ve(),e.focus(),e.setSelectionRange(e.value.length,e.value.length),console.log("Filled font size from typography:",o)}catch(e){console.error("Failed to fill font size from typography",e)}},H.onclick=()=>{try{if(!K||!Array.isArray(K)||K.length===0){alert("No typography styles defined. Please add typography styles or extract from Figma first.");return}let e=document.getElementById("line-height-scale");if(!e)return;let t=[];if(K.forEach(i=>{let a=String(i.lineHeight||"").trim();if(a==="auto")t.push("auto");else{let c=parseFloat(a.replace("%",""));isNaN(c)||t.push(c)}}),!t.length){alert("No valid line heights found in typography styles.");return}let o=t.includes("auto"),l=t.filter(i=>i!=="auto"),n=Array.from(new Set(l)).sort((i,a)=>i-a),s=o?["auto",...n]:n;e.value=s.join(", "),ve(),e.focus(),e.setSelectionRange(e.value.length,e.value.length),console.log("Filled line height from typography:",s)}catch(e){console.error("Failed to fill line height from typography",e)}};let Qt=document.getElementById("typography-panel"),Ho=document.getElementById("typography-panel-header"),qo=document.getElementById("typography-panel-toggle");Ho&&Qt&&qo&&(Ho.onclick=()=>{let e=Qt.classList.contains("collapsed");Qt.classList.toggle("collapsed");let t=qo.querySelector(".issue-group-toggle-icon");t&&(t.textContent="\u25B6")});let eo=document.getElementById("settings-panel"),Po=document.getElementById("settings-panel-header"),Et=document.getElementById("settings-panel-toggle");if(Po&&eo&&Et){let e=()=>{let t=eo.classList.contains("collapsed");eo.classList.toggle("collapsed");let o=Et.querySelector(".issue-group-toggle-icon");o&&(o.textContent="\u25B6")};Po.onclick=t=>{t.target===Et||Et.contains(t.target)||e()},Et.onclick=t=>{t.stopPropagation(),e()}}function to(){let e=document.getElementById("color-preview-panel"),t=document.getElementById("color-preview-panel-header"),o=document.getElementById("color-preview-panel-toggle");if(!e||!t||!o){console.log("Color preview panel elements not found, retrying..."),setTimeout(to,100);return}console.log("Setting up color preview panel toggle");let l=()=>{let n=e.classList.contains("collapsed");e.classList.toggle("collapsed");let s=o.querySelector(".issue-group-toggle-icon");s&&(s.textContent="\u25B6"),console.log("Color preview panel toggled, isCollapsed:",!n)};t.onclick=n=>{n.preventDefault(),n.stopPropagation(),console.log("Color preview panel header clicked"),l()},o.onclick=n=>{n.preventDefault(),n.stopPropagation(),console.log("Color preview panel toggle button clicked"),l()}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",to):to();function je(){let e=document.getElementById("color-scale"),t=document.getElementById("color-preview");if(!e||!t)return;let o=e.value.trim();if(t.innerHTML="",!o)return;let l=o.split(",").map(i=>i.trim()).filter(i=>i),n=1;l.forEach(i=>{let a=i.toUpperCase(),c=J[a];if(c&&/^No name \d+$/.test(c)){let g=parseInt(c.replace("No name ",""),10);g>=n&&(n=g+1)}});let s=1;l.forEach((i,a)=>{let c=/^#[0-9A-Fa-f]{3,8}$/.test(i),g=/^rgba?\(/.test(i);if(!c&&!g)return;let d=document.createElement("div");d.className="color-swatch-container";let v=document.createElement("div");v.className="color-swatch",v.style.background=i;let f=document.createElement("button");f.innerHTML="\xD7",f.className="color-swatch-close",f.onclick=function($){var P;$.stopPropagation();let E=e.value.split(",").map(G=>G.trim()).filter(G=>G),M=(P=E[a])==null?void 0:P.toUpperCase(),F=E.filter((G,B)=>B!==a);e.value=F.join(", "),M&&J[M]&&delete J[M],je(),typeof ve=="function"&&ve()};let y=i.toUpperCase(),m=J[y];if(!m){for(;Object.values(J).includes(`No name ${s}`);)s++;m=`No name ${s}`,J[y]=m,s++,typeof ve=="function"&&ve()}let u=document.createElement("div");u.className="color-swatch-label";let k=document.createElement("div");k.className="color-swatch-label-name",k.textContent=m,k.title="Click to edit name",k.style.cursor="pointer",k.onclick=function($){$.stopPropagation();let E=document.createElement("input");E.type="text",E.value=m,E.className="color-swatch-name-input",E.style.cssText="width: 100%; font-size: 11px; padding: 2px 4px; border: 1px solid #3b82f6; border-radius: 4px; text-align: center; box-sizing: border-box;",k.style.display="none",k.parentNode.insertBefore(E,k),E.focus(),E.select();let M=()=>{let F=E.value.trim()||`No name ${s}`;J[y]=F,k.textContent=F,k.style.display="",E.remove(),typeof ve=="function"&&ve()};E.onblur=M,E.onkeydown=function(F){F.key==="Enter"?(F.preventDefault(),M()):F.key==="Escape"&&(k.style.display="",E.remove())}};let S=document.createElement("div");S.className="color-swatch-label-hex",S.textContent=y,u.appendChild(k),u.appendChild(S),v.appendChild(f),d.appendChild(v),d.appendChild(u),t.appendChild(d)})}function cs(){var e,t,o,l,n,s;return{fontFamily:((e=document.getElementById("rule-font-family"))==null?void 0:e.checked)||!1,fontSize:((t=document.getElementById("rule-font-size"))==null?void 0:t.checked)||!1,fontWeight:((o=document.getElementById("rule-font-weight"))==null?void 0:o.checked)||!1,lineHeight:((l=document.getElementById("rule-line-height"))==null?void 0:l.checked)||!1,letterSpacing:((n=document.getElementById("rule-letter-spacing"))==null?void 0:n.checked)||!1,wordSpacing:((s=document.getElementById("rule-word-spacing"))==null?void 0:s.checked)||!1}}function Qe(){let e=document.getElementById("typography-table-body"),t=document.querySelector("#typography-table thead tr");if(!e||!t)return;let o=cs(),l='<th class="typography-table-actions">Actions</th>';if(l+='<th class="typography-table-style-name" style="width: 120px;">Style Name</th>',o.fontFamily&&(l+='<th class="typography-table-font-family" style="width: 140px;">Font Family</th>'),o.fontSize&&(l+='<th class="typography-table-font-size" style="width: 80px;">Size (px)</th>'),o.fontWeight&&(l+='<th class="typography-table-font-weight" style="width: 100px;">Weight</th>'),o.lineHeight&&(l+='<th class="typography-table-line-height" style="width: 100px;">Line Height</th>'),o.letterSpacing&&(l+='<th class="typography-table-letter-spacing" style="width: 100px;">Letter Spacing</th>'),o.wordSpacing&&(l+='<th class="typography-table-word-spacing" style="width: 100px;">Word Spacing</th>'),t.innerHTML=l,K.length===0){let n=Object.values(o).filter(s=>s).length+2;e.innerHTML=`
        <tr>
          <td colspan="${n}" class="typography-empty-message">
            No typography styles defined. Click "Add Typography Style" to create one.
          </td>
        </tr>
      `;return}e.innerHTML=K.map(n=>{let s=`<tr data-id="${n.id}">`;return s+='<td class="typography-table-actions">',n.styleId&&(s+=`<button class="btn-table-action" onclick="selectTypographyStyle('${n.styleId}')" title="Select layer in Figma" style="background: #0071e3; color: white;">\u{1F441}</button>`),s+=`<button class="btn-table-action delete" onclick="deleteTypographyStyle(${n.id})" title="Delete">\u{1F5D1}</button>
        </td>`,s+=`<td><input type="text" value="${p(n.name)}" data-field="name"></td>`,o.fontFamily&&(s+=`<td><input type="text" value="${p(n.fontFamily)}" data-field="fontFamily"></td>`),o.fontSize&&(s+=`<td><input type="number" value="${n.fontSize}" data-field="fontSize" min="1"></td>`),o.fontWeight&&(s+=`<td>
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
        </td>`),o.lineHeight&&(s+=`<td><input type="text" value="${p(n.lineHeight)}" data-field="lineHeight" placeholder="120% or auto"></td>`),o.letterSpacing&&(s+=`<td><input type="text" value="${p(n.letterSpacing||"0")}" data-field="letterSpacing" placeholder="0 or 0.5px"></td>`),o.wordSpacing&&(s+=`<td><input type="text" value="${p(n.wordSpacing||"0")}" data-field="wordSpacing" placeholder="0"></td>`),s+="</tr>",s}).join(""),e.querySelectorAll("input, select").forEach(n=>{n.addEventListener("change",s=>{let i=s.target.closest("tr"),a=parseInt(i.dataset.id),c=s.target.dataset.field,g=s.target.value;ds(a,c,g)})})}window.addTypographyStyle=function(){let e={id:nt++,name:"New Style",fontFamily:"Inter",fontSize:16,fontWeight:"Regular",lineHeight:"150%",letterSpacing:"0",wordSpacing:"0"};K.push(e),Qe(),ve()};function ds(e,t,o){let l=K.find(n=>n.id===e);l&&(t==="fontSize"?l[t]=parseInt(o)||16:l[t]=o,ve())}window.deleteTypographyStyle=function(e){confirm("Delete this typography style?")&&(K=K.filter(t=>t.id!==e),Q(),Qe(),ve())},window.selectTypographyStyle=function(e){parent.postMessage({pluginMessage:{type:"select-text-style",styleId:e}},"*")};let Ro=document.getElementById("btn-add-typo-style");Ro&&(Ro.onclick=()=>addTypographyStyle());let Do=document.getElementById("btn-extract-typo-desktop");Do&&(Do.onclick=()=>{parent.postMessage({pluginMessage:{type:"extract-typography-styles",mode:"desktop"}},"*")});let Wo=document.getElementById("btn-extract-typo-tablet");Wo&&(Wo.onclick=()=>{parent.postMessage({pluginMessage:{type:"extract-typography-styles",mode:"tablet"}},"*")});let Uo=document.getElementById("btn-extract-typo-mobile");Uo&&(Uo.onclick=()=>{parent.postMessage({pluginMessage:{type:"extract-typography-styles",mode:"mobile"}},"*")});let Oo=document.getElementById("btn-extract-typo-all");Oo&&(Oo.onclick=()=>{parent.postMessage({pluginMessage:{type:"extract-typography-styles",mode:"all"}},"*")});let jo=document.getElementById("btn-reset-typo-table");jo&&(jo.onclick=()=>{confirm(`\u26A0\uFE0F Reset typography table to default styles?

This will:
\u2022 Clear all current styles
\u2022 Restore default H1-H6 and Body styles

This action cannot be undone.`)&&(K=[{id:1,name:"H1",fontFamily:"Inter",fontSize:48,fontWeight:"Bold",lineHeight:"120%",letterSpacing:"0",wordSpacing:"0"},{id:2,name:"H2",fontFamily:"Inter",fontSize:36,fontWeight:"Bold",lineHeight:"130%",letterSpacing:"0",wordSpacing:"0"},{id:3,name:"H3",fontFamily:"Inter",fontSize:30,fontWeight:"Semi Bold",lineHeight:"130%",letterSpacing:"0",wordSpacing:"0"},{id:4,name:"H4",fontFamily:"Inter",fontSize:24,fontWeight:"Semi Bold",lineHeight:"140%",letterSpacing:"0",wordSpacing:"0"},{id:5,name:"H5",fontFamily:"Inter",fontSize:20,fontWeight:"Semi Bold",lineHeight:"140%",letterSpacing:"0",wordSpacing:"0"},{id:6,name:"H6",fontFamily:"Inter",fontSize:16,fontWeight:"Semi Bold",lineHeight:"150%",letterSpacing:"0",wordSpacing:"0"},{id:7,name:"Body",fontFamily:"Inter",fontSize:14,fontWeight:"Regular",lineHeight:"150%",letterSpacing:"0",wordSpacing:"0"}],nt=8,Qe(),ve(),alert("\u2705 Typography table has been reset to default styles!"))}),Qe(),["rule-font-family","rule-font-size","rule-font-weight","rule-line-height","rule-letter-spacing","rule-word-spacing"].forEach(e=>{let t=document.getElementById(e);t&&t.addEventListener("change",()=>{Qe(),ve()})});let Vo=document.getElementById("color-scale");Vo&&(Vo.addEventListener("input",()=>{je()}),je());let ps=Sn({maxHistory:10,postPluginMessage:e=>parent.postMessage({pluginMessage:e},"*"),getCurrentReportData:()=>h,setIsViewingTokens:e=>{Ct=!!e},renderResults:He,renderTokens:$t}),{saveScanHistory:Go,requestScanHistory:_o,renderScanHistory:oo,restoreReportFromHistory:Ns,loadLastScanModeOnce:us,setHistory:gs,clearLocalHistory:ms}=ps,fs=document.getElementById("export-group"),Ft=document.getElementById("export-dropdown");_.onclick=e=>{e.stopPropagation(),Ft.style.display=Ft.style.display==="block"?"none":"block"},document.querySelectorAll(".export-option").forEach(e=>{e.onclick=t=>{t.stopPropagation();let o=e.getAttribute("data-format");xn({format:o,reportData:h,getTypeDisplayName:zt,colorNameMap:J}),Ft.style.display="none"}}),document.addEventListener("click",e=>{fs.contains(e.target)||(Ft.style.display="none")});let Re,Fe,Me,ft;function At(e){if(!e)return;let t=e.filter(a=>a.severity==="error"&&!a.ignored).length,o=e.filter(a=>a.severity==="warn"&&!a.ignored).length,l=e.filter(a=>!a.ignored).length,n=document.getElementById("filter-count-all"),s=document.getElementById("filter-count-error"),i=document.getElementById("filter-count-warn");n&&(n.textContent=l),s&&(s.textContent=t),i&&(i.textContent=o)}function Lt(){console.log("applyFilters called",{isViewingTokens:Ct,hasTokens:!!h.tokens,hasIssues:!!h.issues,currentFilter:Ue,currentSearch:Ie,currentColorTypeFilter:Ze});let e=document.querySelector(".report-tab.active"),t=e?e.getAttribute("data-tab"):null;t==="animations"?(console.log("Applying search to animations"),typeof window.searchAnimations=="function"&&window.searchAnimations(Ie)):t==="tokens"&&h.tokens?(console.log("Applying filters to tokens"),$t(h.tokens,!1,{skipTabSwitch:!0})):t==="issues"&&h.issues?(console.log("Applying filters to issues"),He(h.issues,!1,{skipTabSwitch:!0})):Ct&&h.tokens?(console.log("Applying filters to tokens (fallback)"),$t(h.tokens,!1,{skipTabSwitch:!0})):h.issues&&(console.log("Applying filters to issues (fallback)"),He(h.issues,!1,{skipTabSwitch:!0}))}function no(){if(console.log("setupFilterHandlers called"),Re=document.getElementById("search-input"),Fe=document.getElementById("btn-clear-search"),Me=document.querySelectorAll(".filter-btn"),ft=document.getElementById("color-type-select"),console.log("Elements found:",{searchInput:!!Re,btnClearSearch:!!Fe,filterButtons:Me?Me.length:0,colorTypeSelect:!!ft}),!Re||!Fe||!Me||Me.length===0){console.warn("Filter elements not found, retrying...",{searchInput:!!Re,btnClearSearch:!!Fe,filterButtons:Me?Me.length:0}),setTimeout(no,100);return}console.log("Setting up search input handler"),Re.addEventListener("input",e=>{let t=e.target.value;console.log("Search input changed:",t),Ie=t,console.log("currentSearch set to:",Ie),Fe&&(Fe.style.display=Ie.trim()?"block":"none"),Lt()}),Fe&&(console.log("Setting up clear search button handler"),Fe.onclick=e=>{console.log("Clear search clicked"),e.preventDefault(),e.stopPropagation(),Re&&(Re.value=""),Ie="",Fe.style.display="none",Lt()}),console.log("Setting up filter buttons handlers, count:",Me.length),Me.forEach((e,t)=>{console.log(`Setting up filter button ${t}:`,e.getAttribute("data-filter")),e.onclick=o=>{o.preventDefault(),o.stopPropagation();let l=e.getAttribute("data-filter"),n=e.classList.contains("active");console.log("Filter button clicked:",l,"isActive:",n),n&&l!=="all"?(e.classList.remove("active"),Ue="all",Me.forEach(s=>{s.getAttribute("data-filter")==="all"&&s.classList.add("active")})):(Me.forEach(s=>s.classList.remove("active")),e.classList.add("active"),Ue=l),console.log("currentFilter set to:",Ue),Lt()}}),ft&&(console.log("Setting up color type select handler"),ft.addEventListener("change",e=>{console.log("Color type changed:",e.target.value),Ze=e.target.value,Lt()})),console.log("Filter handlers setup complete")}console.log("Setting up filter handlers, DOM readyState:",document.readyState),document.readyState==="loading"?(console.log("DOM still loading, waiting for DOMContentLoaded"),document.addEventListener("DOMContentLoaded",()=>{console.log("DOMContentLoaded fired, setting up handlers"),no(),po(),uo(),_o()})):(console.log("DOM already ready, setting up handlers immediately"),no(),po(),uo(),_o()),pe&&(T.onclick=()=>{console.log("Cancel operation clicked"),parent.postMessage({pluginMessage:{type:"cancel-scan"}},"*"),w.style.display="block",w.disabled=!1,z.style.display="block",z.disabled=!1,T.style.display="none",b.style.display="none"},re.onclick=()=>{if(confirm(`\u26A0\uFE0F Are you sure you want to reset all settings to default and clear history?

This will:
\u2022 Reset all input values to default
\u2022 Clear scan history
\u2022 Clear current reports

This action cannot be undone.`)){document.getElementById("spacing-scale").value="0, 4, 8, 12, 16, 24, 32, 40, 48, 64, 72, 80, 88, 96",document.getElementById("spacing-threshold").value="100",document.getElementById("color-scale").value="",document.getElementById("font-size-scale").value="32, 24, 20, 18, 16, 14, 12",document.getElementById("font-size-threshold").value="100",document.getElementById("line-height-scale").value="auto, 100, 110, 120, 130, 140, 150, 160, 170",document.getElementById("line-height-threshold").value="300",document.getElementById("line-height-baseline-threshold").value="120",K=[{id:1,name:"H1",fontFamily:"Inter",fontSize:48,fontWeight:"Bold",lineHeight:"120%",letterSpacing:"0",wordSpacing:"0"},{id:2,name:"H2",fontFamily:"Inter",fontSize:36,fontWeight:"Bold",lineHeight:"130%",letterSpacing:"0",wordSpacing:"0"},{id:3,name:"H3",fontFamily:"Inter",fontSize:30,fontWeight:"Semi Bold",lineHeight:"130%",letterSpacing:"0",wordSpacing:"0"},{id:4,name:"H4",fontFamily:"Inter",fontSize:24,fontWeight:"Semi Bold",lineHeight:"140%",letterSpacing:"0",wordSpacing:"0"},{id:5,name:"H5",fontFamily:"Inter",fontSize:20,fontWeight:"Semi Bold",lineHeight:"140%",letterSpacing:"0",wordSpacing:"0"},{id:6,name:"H6",fontFamily:"Inter",fontSize:16,fontWeight:"Semi Bold",lineHeight:"150%",letterSpacing:"0",wordSpacing:"0"},{id:7,name:"Body",fontFamily:"Inter",fontSize:14,fontWeight:"Regular",lineHeight:"150%",letterSpacing:"0",wordSpacing:"0"}],nt=8,Qe(),document.getElementById("rule-typo-style").checked=!0,document.getElementById("rule-font-family").checked=!0,document.getElementById("rule-font-size").checked=!0,document.getElementById("rule-font-weight").checked=!0,document.getElementById("rule-line-height").checked=!0,document.getElementById("rule-letter-spacing").checked=!1,document.getElementById("rule-word-spacing").checked=!1,Qe(),je(),h={issues:null,tokens:null,scanMode:null,timestamp:null,context:null,lastActiveTab:"issues"},It("issues"),It("tokens"),It("animations"),Oe("issues");let e=document.getElementById("issues-count"),t=document.getElementById("tokens-count"),o=document.getElementById("animations-count");e&&(e.textContent="0"),t&&(t.textContent="0"),o&&(o.textContent="0");let l=document.getElementById("filter-count-all"),n=document.getElementById("filter-count-error"),s=document.getElementById("filter-count-warn");l&&(l.textContent="0"),n&&(n.textContent="0"),s&&(s.textContent="0"),Re&&(Re.value="",Ie=""),Fe&&(Fe.style.display="none");let i=document.getElementById("filter-controls"),a=document.getElementById("export-group");i&&(i.style.display="none"),a&&(a.style.display="none"),ms(),parent.postMessage({pluginMessage:{type:"clear-history"}},"*");let c=document.getElementById("history-panel");c&&c.style.display!=="none"&&oo(),typeof window.resetScanSettings=="function"&&window.resetScanSettings(),ve(),alert("\u2705 All settings have been reset to default and history has been cleared!")}},pe.onclick=()=>{let e=document.getElementById("history-panel");if(e){let t=e.style.display!=="none";e.style.display=t?"none":"flex",t||oo()}}),te&&(te.onclick=()=>{let e=document.getElementById("history-panel");e&&(e.style.display="none")});let Yo=document.getElementById("btn-save-settings"),Ve=document.getElementById("save-settings-modal"),Se=document.getElementById("setting-name-input"),Ht=document.getElementById("btn-confirm-save-settings"),Jo=document.getElementById("btn-cancel-save-settings"),Xo=document.getElementById("btn-close-save-settings");Yo&&(Yo.onclick=()=>{parent.postMessage({pluginMessage:{type:"get-project-name"}},"*"),Ve&&(Ve.style.display="flex",Se&&(Se.value="",Se.focus(),Se.onkeydown=e=>{e.key==="Enter"&&(e.preventDefault(),Ht&&Ht.click())}))}),Xo&&(Xo.onclick=()=>{Ve&&(Ve.style.display="none")}),Jo&&(Jo.onclick=()=>{Ve&&(Ve.style.display="none")});let ze=document.getElementById("replace-confirm-modal"),Zo=document.getElementById("replace-setting-name"),Ko=document.getElementById("btn-confirm-replace"),Qo=document.getElementById("btn-cancel-replace"),en=document.getElementById("btn-close-replace-confirm"),Ne=null;function tn(e,t){parent.postMessage({pluginMessage:{type:"save-settings",name:e,values:t,forceReplace:!0}},"*")}Ht&&(Ht.onclick=()=>{var o,l,n,s,i,a,c,g,d,v,f,y,m,u,k,S,$;let e=(o=Se==null?void 0:Se.value)==null?void 0:o.trim();if(!e){alert("\u26A0\uFE0F Please enter a setting name");return}let t={spacingScale:((l=document.getElementById("spacing-scale"))==null?void 0:l.value)||"",spacingThreshold:((n=document.getElementById("spacing-threshold"))==null?void 0:n.value)||"100",colorScale:((s=document.getElementById("color-scale"))==null?void 0:s.value)||"",colorNameMap:J,ignoredIssues:ge,fontSizeScale:((i=document.getElementById("font-size-scale"))==null?void 0:i.value)||"",fontSizeThreshold:((a=document.getElementById("font-size-threshold"))==null?void 0:a.value)||"100",lineHeightScale:((c=document.getElementById("line-height-scale"))==null?void 0:c.value)||"",lineHeightThreshold:((g=document.getElementById("line-height-threshold"))==null?void 0:g.value)||"300",lineHeightBaselineThreshold:((d=document.getElementById("line-height-baseline-threshold"))==null?void 0:d.value)||"120",typographyStyles:K,skipNames:((v=document.getElementById("scan-skip-names"))==null?void 0:v.value)||"",typographyRules:{checkStyle:((f=document.getElementById("rule-typo-style"))==null?void 0:f.checked)||!0,checkFontFamily:((y=document.getElementById("rule-font-family"))==null?void 0:y.checked)||!0,checkFontSize:((m=document.getElementById("rule-font-size"))==null?void 0:m.checked)||!0,checkFontWeight:((u=document.getElementById("rule-font-weight"))==null?void 0:u.checked)||!0,checkLineHeight:((k=document.getElementById("rule-line-height"))==null?void 0:k.checked)||!0,checkLetterSpacing:((S=document.getElementById("rule-letter-spacing"))==null?void 0:S.checked)||!1,checkWordSpacing:(($=document.getElementById("rule-word-spacing"))==null?void 0:$.checked)||!1}};Ne={name:e,values:t},parent.postMessage({pluginMessage:{type:"check-setting-name",name:e}},"*")}),Ko&&(Ko.onclick=()=>{Ne&&(tn(Ne.name,Ne.values),Ne=null),ze&&(ze.style.display="none")}),Qo&&(Qo.onclick=()=>{Ne=null,ze&&(ze.style.display="none"),Se&&(Se.focus(),Se.select())}),en&&(en.onclick=()=>{Ne=null,ze&&(ze.style.display="none"),Se&&(Se.focus(),Se.select())}),ze&&(ze.onclick=e=>{e.target===ze&&(Ne=null,ze.style.display="none",Se&&(Se.focus(),Se.select()))});let on=document.getElementById("btn-load-settings"),Ge=document.getElementById("load-settings-modal"),Mt=document.getElementById("settings-list"),so=document.getElementById("settings-empty-state"),nn=document.getElementById("btn-close-load-settings");function sn(e){if(!(!Mt||!so)){if(!e||e.length===0){Mt.innerHTML="",so.style.display="block";return}so.style.display="none",Mt.innerHTML=e.map(t=>{let o=new Date(t.updatedAt||t.createdAt),l=o.toLocaleDateString()+" "+o.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});return`
        <div class="settings-item" data-setting-name="${p(t.name)}">
          <div class="settings-item-info">
            <div class="settings-item-name">${p(t.name)}</div>
            <div class="settings-item-date">Updated: ${l}</div>
          </div>
          <div class="settings-item-actions">
            <button class="btn-remove-setting" data-setting-name="${p(t.name)}" title="Remove">\u{1F5D1}\uFE0F</button>
          </div>
        </div>
      `}).join(""),Mt.querySelectorAll(".settings-item").forEach(t=>{let o=t.getAttribute("data-setting-name");t.onclick=l=>{l.target.closest(".btn-remove-setting")||(parent.postMessage({pluginMessage:{type:"load-settings",name:o}},"*"),Ge&&(Ge.style.display="none"))}}),Mt.querySelectorAll(".btn-remove-setting").forEach(t=>{t.onclick=o=>{o.stopPropagation();let l=t.getAttribute("data-setting-name");confirm(`\u26A0\uFE0F Are you sure you want to remove "${l}"?`)&&parent.postMessage({pluginMessage:{type:"remove-settings",name:l}},"*")}})}}on&&(on.onclick=()=>{parent.postMessage({pluginMessage:{type:"get-saved-settings"}},"*"),Ge&&(Ge.style.display="flex")}),nn&&(nn.onclick=()=>{Ge&&(Ge.style.display="none")});let ln=document.getElementById("btn-export-settings");ln&&(ln.onclick=()=>{var s,i,a,c,g,d,v,f,y,m,u,k,S,$,E;let e=((s=document.getElementById("color-scale"))==null?void 0:s.value)||"",t=e.split(",").map(M=>M.trim().toUpperCase()).filter(M=>M&&M.startsWith("#")),o=We({},J),l=1;Object.values(o).forEach(M=>{if(M&&/^No name \d+$/.test(M)){let F=parseInt(M.replace("No name ",""),10);F>=l&&(l=F+1)}}),t.forEach(M=>{o[M]||(o[M]=`No name ${l}`,l++)});let n={spacingScale:((i=document.getElementById("spacing-scale"))==null?void 0:i.value)||"",spacingThreshold:((a=document.getElementById("spacing-threshold"))==null?void 0:a.value)||"100",colorScale:e,colorNameMap:o,ignoredIssues:ge,fontSizeScale:((c=document.getElementById("font-size-scale"))==null?void 0:c.value)||"",fontSizeThreshold:((g=document.getElementById("font-size-threshold"))==null?void 0:g.value)||"100",lineHeightScale:((d=document.getElementById("line-height-scale"))==null?void 0:d.value)||"",lineHeightThreshold:((v=document.getElementById("line-height-threshold"))==null?void 0:v.value)||"300",lineHeightBaselineThreshold:((f=document.getElementById("line-height-baseline-threshold"))==null?void 0:f.value)||"120",typographyStyles:K,typographyRules:{checkStyle:((y=document.getElementById("rule-typo-style"))==null?void 0:y.checked)||!0,checkFontFamily:((m=document.getElementById("rule-font-family"))==null?void 0:m.checked)||!0,checkFontSize:((u=document.getElementById("rule-font-size"))==null?void 0:u.checked)||!0,checkFontWeight:((k=document.getElementById("rule-font-weight"))==null?void 0:k.checked)||!0,checkLineHeight:((S=document.getElementById("rule-line-height"))==null?void 0:S.checked)||!0,checkLetterSpacing:(($=document.getElementById("rule-letter-spacing"))==null?void 0:$.checked)||!1,checkWordSpacing:((E=document.getElementById("rule-word-spacing"))==null?void 0:E.checked)||!1}};parent.postMessage({pluginMessage:{type:"get-project-name"}},"*"),window.pendingExportValues=n});let an=document.getElementById("btn-import-settings"),yt=document.getElementById("import-settings-modal"),et=document.getElementById("import-settings-file-input"),rn=document.getElementById("btn-select-import-file"),tt=document.getElementById("import-file-info"),cn=document.getElementById("import-file-name"),_e=document.getElementById("btn-confirm-import"),lo=document.getElementById("btn-cancel-import"),io=document.getElementById("btn-close-import-settings"),ht=null,$e=null;if(an&&(an.onclick=()=>{ht=null,$e=null,et&&(et.value=""),tt&&(tt.style.display="none"),_e&&(_e.disabled=!0),yt&&(yt.style.display="flex")}),rn&&et&&(rn.onclick=()=>{et.click()}),et&&(et.onchange=e=>{let t=e.target.files[0];if(!t)return;if(!t.name.endsWith(".json")){alert("\u26A0\uFE0F Please select a JSON file");return}ht=t,cn&&(cn.textContent=t.name),tt&&(tt.style.display="block"),_e&&(_e.disabled=!1);let o=new FileReader;o.onload=l=>{try{$e=JSON.parse(l.target.result),console.log("Imported settings data:",$e)}catch(n){alert("\u274C Error parsing JSON file: "+n.message),ht=null,$e=null,tt&&(tt.style.display="none"),_e&&(_e.disabled=!0)}},o.onerror=()=>{alert("\u274C Error reading file"),ht=null,$e=null},o.readAsText(t)}),_e&&(_e.onclick=()=>{if(!$e){alert("\u274C No file data to import");return}console.log("Import file data:",$e);let e=null;if(Array.isArray($e)){if($e.length===0){alert("\u274C No settings found in file");return}if(e=$e[0].values,!e){alert("\u274C Invalid settings format. No values found in setting object.");return}}else if($e.values)e=$e.values;else if($e.spacingScale!==void 0||$e.colorScale!==void 0)e=$e;else{alert("\u274C Invalid settings file format. Expected an array of settings, a single setting object, or a values object."),console.error("Invalid import data structure:",$e);return}if(!e||typeof e!="object"){alert("\u274C Invalid settings format. No values found.");return}console.log("Applying values:",e),Ot(e),ve(),yt&&(yt.style.display="none"),ht=null,$e=null,et&&(et.value=""),tt&&(tt.style.display="none"),_e&&(_e.disabled=!0),alert("\u2705 Settings imported and applied to input fields successfully")}),lo||io){let e=()=>{yt&&(yt.style.display="none"),ht=null,$e=null,et&&(et.value=""),tt&&(tt.style.display="none"),_e&&(_e.disabled=!0)};lo&&(lo.onclick=e),io&&(io.onclick=e)}Ve&&(Ve.onclick=e=>{e.target===Ve&&(Ve.style.display="none")}),Ge&&(Ge.onclick=e=>{e.target===Ge&&(Ge.style.display="none")}),se.onclick=()=>{parent.postMessage({pluginMessage:{type:"close"}},"*")},window.onmessage=e=>{var o,l;console.log("Received message:",e.data);let t=e.data.pluginMessage;if(t&&t.type==="fix-issue-result"){if(console.log("[fix-issue-result] Received:",{issueId:t.issueId,success:t.success,message:t.message}),ae(t.issueId,t.message,t.success),!t.success){console.log("[fix-issue-result] Error detected, showing error modal...");let n=t.message||"An error occurred while fixing the issue.";console.log("[fix-issue-result] Error message:",n);try{qt(n),console.log("[fix-issue-result] Error modal should be displayed")}catch(s){console.error("[fix-issue-result] Error showing error modal:",s),alert("Error: "+n)}}if(t.success)if(console.log("[fix-issue-result] Removing issueId:",t.issueId),h&&h.issues&&(h.issues=h.issues.filter(n=>String(n.id)!==String(t.issueId))),window._batchFixInProgress)console.log("[fix-issue-result] Batch fix in progress, skipping DOM update");else{let n=`.issue[data-issue-id="${t.issueId}"]`,s=document.querySelectorAll(n);[...document.querySelectorAll(`button.btn-fix[data-id="${t.issueId}"]`),...document.querySelectorAll(`button.btn-suggest-fix[data-id="${t.issueId}"]`)].forEach(c=>{let g=c.closest(".issue");g&&!Array.from(s).includes(g)&&s.push(g)});let a=Array.from(new Set(Array.from(s)));if(a.length>0){let c=new Map;a.forEach(g=>{let d=g.closest(".issue-group");if(d){let v=d.getAttribute("data-issue-type");if(!c.has(v)){let y=d.querySelector(".badge");if(y){let m=parseInt(y.textContent)||0;c.set(v,{groupEl:d,badge:y,currentCount:m,removeCount:0})}}let f=c.get(v);f&&f.removeCount++}}),a.forEach(g=>{g.style.transition="opacity 0.3s ease-out",g.style.opacity="0",setTimeout(()=>{g.parentNode&&g.remove()},300)}),setTimeout(()=>{c.forEach(g=>{let d=Math.max(0,g.currentCount-g.removeCount);g.badge.textContent=d,d===0&&(g.groupEl.style.display="none")}),Ke(),h&&h.issues&&He(h.issues,!1)},350)}else Ke(),h&&h.issues&&He(h.issues,!1)}return}if(t&&t.type==="create-text-style-result"){window._createStyleSuccessIds||(window._createStyleSuccessIds=[]),window._createStylePendingTimer||(window._createStylePendingTimer=null),t.success&&t.issueId&&window._createStyleSuccessIds.push(t.issueId),window._createStylePendingTimer&&clearTimeout(window._createStylePendingTimer),window._createStylePendingTimer=setTimeout(()=>{let n=window._createStyleSuccessIds||[];window._createStyleSuccessIds=[],window._createStylePendingTimer=null,n.length>0&&h&&h.issues&&(h.issues=h.issues.filter(s=>!(n.includes(s.id)||s.subIssues&&s.subIssues.length>0&&(s.subIssues=s.subIssues.filter(i=>!n.includes(i.id)),s.subIssues.length===0))),He(h.issues,!1))},500);return}if(t&&t.type==="components-for-issue-loaded"){console.log("=== [components-for-issue-loaded] HANDLER CALLED ==="),console.log("[components-for-issue-loaded] Received message",t);let n=window.pendingComponentIssue;if(console.log("[components-for-issue-loaded] Pending issue:",n,"Message issueId:",t.issueId),console.log("[components-for-issue-loaded] Similar components:",t.similarComponents),n){let s=document.querySelector(`.issue[data-issue-id="${n.id}"]`);if(s){let i=s.querySelector("button.btn-suggest-fix");i&&(i.disabled=!1,i.style.opacity="1",i.style.cursor="pointer",i.dataset.originalText&&(i.textContent=i.dataset.originalText,delete i.dataset.originalText))}}if(t.similarComponents&&t.similarComponents.length>0){console.log("[components-for-issue-loaded] Showing suggest modal with",t.similarComponents.length,"similar components");let s=n||{id:t.issueId,nodeName:"Unnamed"};try{Yn(s,t.similarComponents),console.log("[components-for-issue-loaded] Modal function called successfully")}catch(i){console.error("[components-for-issue-loaded] Error showing modal:",i),alert("Error showing component suggestion modal: "+i.message)}window.pendingComponentIssue=null;return}else{console.warn("[components-for-issue-loaded] No similar components found"),alert("No similar components found. Please use 'Select Component' to choose from all components or 'Create New Component' to create a new one."),window.pendingComponentIssue=null;return}}if(t&&t.type==="all-components-loaded"){console.log("=== [all-components-loaded] HANDLER CALLED ==="),console.log("[all-components-loaded] Received message",t);let n=window.pendingSelectComponentIssue;if(console.log("[all-components-loaded] Pending issue:",n),console.log("[all-components-loaded] Message issueId:",t.issueId,typeof t.issueId),console.log("[all-components-loaded] Pending issueId:",n==null?void 0:n.id,typeof(n==null?void 0:n.id)),console.log("[all-components-loaded] Components:",t.components),console.log("[all-components-loaded] Components length:",t.components?t.components.length:0),n){let s=document.querySelector(`.issue[data-issue-id="${n.id}"]`);if(s){let i=s.querySelector("button.btn-select-component");i&&(i.disabled=!1,i.style.opacity="1",i.style.cursor="pointer",i.dataset.originalText&&(i.textContent=i.dataset.originalText,delete i.dataset.originalText))}}if(t.components&&t.components.length>0){console.log("[all-components-loaded] \u2713 Showing select modal with",t.components.length,"components");let s=n||{id:t.issueId,nodeName:"Unnamed"};console.log("[all-components-loaded] Issue to use:",s),console.log("[all-components-loaded] Calling showComponentSelectModal...");try{Jn(s,t.components),console.log("[all-components-loaded] \u2713 Modal function called successfully")}catch(i){console.error("[all-components-loaded] \u2717 Error showing modal:",i),console.error("[all-components-loaded] Error stack:",i.stack),alert("Error showing component selection modal: "+i.message)}window.pendingSelectComponentIssue=null;return}else{console.warn("[all-components-loaded] \u2717 No components available"),alert("No components found. Please use 'Create New Component' to create a new one."),window.pendingSelectComponentIssue=null;return}}if(t&&t.type==="figma-text-styles-loaded"){let n=window.pendingSuggestTextSizeIssue;if(n&&n.id===t.issueId){let g=n.fontSize||12,d=(t.styles||[]).filter(y=>y.fontSize>=14);if(d.length===0){let y=it(n);y?Bt(n,g,y,null,null):alert("No suitable text size match found (need >= 14px for ADA compliance). Please add font sizes to Font Size input or create text styles in Figma."),window.pendingSuggestTextSizeIssue=null;return}let v=null,f=1/0;d.forEach(y=>{let m=Math.abs(y.fontSize-g);m<f&&(f=m,v=y)}),v?Bt(n,g,v.fontSize,null,v):alert("No suitable text style found (need >= 14px for ADA compliance)"),window.pendingSuggestTextSizeIssue=null;return}let s=window.pendingTextSizeIssue;if(s&&s.id===t.issueId){Zn(s,t.styles||[]),window.pendingTextSizeIssue=null;return}let i=window.pendingTypographyStyleIssue;if(i&&i.id===t.issueId){if(t.error||!t.styles||t.styles.length===0){let g=document.querySelector(`.issue[data-issue-id="${t.issueId}"]`);if(g){let d=g.querySelector("button.btn-fix"),v=g.querySelector("button.btn-suggest-fix");d&&(d.style.display="none"),v&&(v.style.display="none")}window.pendingTypographyStyleIssue=null;return}Co(i,t.styles||[]),window.pendingTypographyStyleIssue=null;return}let a=window.pendingTypographyCheckIssue;if(a&&a.id===t.issueId){if(t.error||!t.styles||t.styles.length===0){let d=document.querySelector(`.issue[data-issue-id="${t.issueId}"]`);if(d){let v=d.querySelector("button.btn-style-dropdown"),f=d.querySelector("button.btn-suggest-fix");v&&(v.style.display="none"),f&&(f.style.display="none")}window.pendingTypographyCheckIssue=null;return}let g=t.styles||[];a.type==="text-size-mobile"&&(g=g.filter(d=>d.fontSize>12)),Co(a,g),window.pendingTypographyCheckIssue=null;return}let c=document.querySelector(`.style-dropdown-menu[data-issue-id="${t.issueId}"]`);if(c){let g=c.closest(".issue"),d=g?g.getAttribute("data-issue-id"):null,v=g?g.getAttribute("data-issue-type"):null;if(t.error){c.innerHTML=`<div style="padding: 8px 12px; color: #ef4444; font-size: 12px;">Error: ${p(t.error)}</div>`;let f=g?g.querySelector("button.btn-style-dropdown"):null;f&&(f.style.display="none");let y=g?g.querySelector("button.btn-suggest-fix"):null;y&&(v==="typography-style"||v==="typography-check")&&(y.style.display="none")}else if(t.styles&&t.styles.length>0){let f=null;if(d&&h&&h.issues){let y=h.issues.find(m=>m.id===d);y&&y.bestMatch&&(f=y.bestMatch.name)}c.innerHTML=t.styles.map(y=>`
            <div class="style-dropdown-item" data-issue-id="${t.issueId}" data-style-id="${y.id}" data-style-name="${p(y.name)}" style="padding: 8px 12px; cursor: pointer; font-size: 12px; ${f===y.name?"background: #e3f2fd; font-weight: 600;":""}" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='${f===y.name?"#e3f2fd":"white"}'">
              ${p(y.name)} ${f===y.name?"\u2B50":""}
            </div>
          `).join(""),c.querySelectorAll(".style-dropdown-item").forEach(y=>{y.onclick=m=>{m.preventDefault(),m.stopPropagation();try{let S=y.getAttribute("data-issue-id");S&&parent.postMessage({pluginMessage:{type:"select-node",id:S}},"*")}catch(S){console.error("Failed to auto-select node for style dropdown item:",S)}let u=y.getAttribute("data-style-id"),k=y.getAttribute("data-style-name");if(g&&h&&h.issues){let S=h.issues.find($=>$.id===d);if(S){let $=t.styles.find(E=>E.id===u);$&&(c.style.display="none",Zt(S,$))}}}})}else{c.innerHTML='<div style="padding: 8px 12px; color: #999; font-size: 12px;">No text styles found in Figma</div>';let f=g?g.querySelector("button.btn-style-dropdown"):null;f&&(f.style.display="none");let y=g?g.querySelector("button.btn-suggest-fix"):null;y&&(v==="typography-style"||v==="typography-check")&&(y.style.display="none")}}return}if(t&&t.type==="contrast-colors-loaded"){let n=window.pendingContrastIssue;n&&n.id===t.issueId&&(Kn(n,t.colors||[]),window.pendingContrastIssue=null);return}if(t&&t.type==="apply-typography-style-result"){if(ae(t.issueId,t.message,t.success),t.success||qt(t.message||"An error occurred while applying the style."),t.success){let n=["typography-check","typography-style","typography"];h&&h.issues&&(h.issues=h.issues.filter(s=>!(String(s.id)===String(t.issueId)&&n.includes(s.type)))),window._batchFixInProgress||setTimeout(()=>{Ke(),h&&h.issues&&He(h.issues,!1)},350)}return}if(t&&t.type==="apply-typography-style-batch-result"){if(t.success&&t.successIds&&t.successIds.length>0){let n=["typography-check","typography-style","typography"],s=new Set(t.successIds.map(String));h&&h.issues&&(h.issues=h.issues.filter(i=>!(s.has(String(i.id))&&n.includes(i.type)))),ae(t.successIds[0],t.message,!0),setTimeout(()=>{Ke(),h&&h.issues&&He(h.issues,!1)},350)}else qt(t.message||"An error occurred while applying styles.");return}if(t&&t.type==="bind-color-variable-result"){ae(t.issueId,t.message,t.success),t.success&&(h&&h.issues&&(h.issues=h.issues.filter(n=>!(String(n.id)===String(t.issueId)&&n.type==="color-variable"))),window._batchFixInProgress||setTimeout(()=>{Ke(),h&&h.issues&&He(h.issues,!1)},350));return}if(t&&t.type==="bind-color-variable-batch-result"){if(t.success&&t.successIds&&t.successIds.length>0){let n=new Set(t.successIds.map(String));h&&h.issues&&(h.issues=h.issues.filter(s=>s.type!=="color-variable"?!0:!(n.has(String(s.id))||s.subIssues&&(s.subIssues=s.subIssues.filter(i=>!n.has(String(i.id))),s.subIssues.length===0)))),setTimeout(()=>{Ke(),h&&h.issues&&He(h.issues,!1)},350)}return}if(t&&t.type==="scan-progress"){I&&A&&(I.style.width=t.progress+"%",A.textContent=t.progress+"% ("+t.current+"/"+t.total+")");return}if(t&&t.type==="node-count-result"){let n=t.count||0,s=t.mode||"page";n>Xe?confirm(`\u26A0\uFE0F Large Design Warning

This ${s==="page"?"page":"selection"} contains ${n.toLocaleString()} nodes.

Scanning large designs may take a while and could slow down Figma.

Do you want to continue?`)&&xe?Ao(xe.scope):(w&&(w.disabled=!1,w.textContent="Scan Issues"),b&&(b.style.display="none")):xe&&Ao(xe.scope),xe=null;return}if(t&&t.type==="last-report"){t.report?Cn(t.report):console.log("No last report stored");return}if(t&&t.type==="history-data"){gs(t.history),us();let n=document.getElementById("history-panel");n&&n.style.display!=="none"&&oo();return}if(t&&t.type==="input-values-data"){t.values?(Ot(t.values),console.log("Restored input values:",t.values)):console.log("No saved input values to restore");return}if(t&&t.type==="project-name"){let n=t.name||"settings";if(window.pendingExportValues){let s=window.pendingExportValues;window.pendingExportValues=null;let i={name:n,values:s,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},a=JSON.stringify([i],null,2),c=new Blob([a],{type:"application/json"}),g=URL.createObjectURL(c),d=document.createElement("a");d.href=g;let v=n.replace(/[^a-z0-9]/gi,"_").toLowerCase();d.download=`${v}-settings.json`,document.body.appendChild(d),d.click(),document.body.removeChild(d),URL.revokeObjectURL(g),console.log("\u2705 Settings exported successfully");return}Se&&(Se.value=n);return}if(t&&t.type==="check-setting-name-result"){t.exists?(Zo&&Ne&&(Zo.textContent=t.name||Ne.name),ze&&(ze.style.display="flex")):Ne&&(tn(Ne.name,Ne.values),Ne=null);return}if(t&&t.type==="save-settings-result"){t.success?(ze&&(ze.style.display="none"),Ve&&(Ve.style.display="none"),Se&&(Se.value=""),Ne=null,Ge&&Ge.style.display!=="none"&&parent.postMessage({pluginMessage:{type:"get-saved-settings"}},"*")):(alert("\u274C Failed to save settings: "+(t.error||"Unknown error")),ze&&(ze.style.display="none"),Ne=null);return}if(t&&t.type==="saved-settings-list"){sn(t.settings||[]);return}if(t&&t.type==="project-name"){let n=t.name||"settings";if(window.pendingExportValues){let s=window.pendingExportValues;window.pendingExportValues=null;let i={name:n,values:s,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},a=JSON.stringify([i],null,2),c=new Blob([a],{type:"application/json"}),g=URL.createObjectURL(c),d=document.createElement("a");d.href=g;let v=n.replace(/[^a-z0-9]/gi,"_").toLowerCase();d.download=`${v}-settings.json`,document.body.appendChild(d),d.click(),document.body.removeChild(d),URL.revokeObjectURL(g),console.log("\u2705 Settings exported successfully")}return}if(t&&t.type==="load-settings-result"){t.success&&t.values?(Ot(t.values),ve()):alert("\u274C Failed to load settings: "+(t.error||"Unknown error"));return}if(t&&t.type==="remove-settings-result"){t.success?sn(t.settings||[]):alert("\u274C Failed to remove settings: "+(t.error||"Unknown error"));return}if(t&&t.type==="report"){w.style.display="block",w.disabled=!1,T.style.display="none",b.style.display="none",z.disabled=!1;let n=t.issues||[];h.context=t.context||null,h.disabledChecks=t.disabledChecks||[],He(n);let s=((o=document.querySelector('input[name="scope"]:checked'))==null?void 0:o.value)||"page";Go(s,"issues",{issues:n},t.context||null)}if(t&&t.type==="tokens-report")if(z.style.display="block",z.disabled=!1,T.style.display="none",b.style.display="none",w.disabled=!1,t.error)me.innerHTML=`<div class="error-message">Error: ${p(t.error)}</div>`,Oe("tokens");else{h.context=t.context||null,$t(t.tokens),D.disabled=!(t.tokens&&Array.isArray(t.tokens.spacing)&&t.tokens.spacing.length>0),Y.disabled=!(t.tokens&&Array.isArray(t.tokens.colors)&&t.tokens.colors.length>0),q.disabled=!(t.tokens&&Array.isArray(t.tokens.fontSize)&&t.tokens.fontSize.length>0),W.disabled=!(t.tokens&&Array.isArray(t.tokens.lineHeight)&&t.tokens.lineHeight.length>0);let n=((l=document.querySelector('input[name="scope"]:checked'))==null?void 0:l.value)||"page";Go(n,"tokens",{tokens:t.tokens},t.context||null)}if(t&&t.type==="typography-styles-extracted")if(t.styles&&Array.isArray(t.styles)&&t.styles.length>0){let n=t.mode==="desktop"?"Desktop":t.mode==="tablet"?"Tablet":t.mode==="mobile"?"Mobile":"All";K=t.styles.map((s,i)=>({id:i+1,name:s.name,styleId:s.styleId,fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing||"0",wordSpacing:s.wordSpacing||"0"})),nt=K.length+1,Q(),Qe(),ve(),alert(`\u2705 Successfully imported ${t.styles.length} ${n} typography styles from Figma!

Styles: ${t.styles.map(s=>s.name).join(", ")}`)}else{let n=t.mode==="desktop"?"Desktop":t.mode==="tablet"?"Tablet":t.mode==="mobile"?"Mobile":"";alert(`\u26A0\uFE0F No ${n.toLowerCase()} text styles found in this Figma file.

Make sure you have defined text styles in your design system.`)}if(t&&t.type==="color-styles-extracted")if(t.colors&&Array.isArray(t.colors)&&t.colors.length>0){let n=document.getElementById("color-scale");if(!n)return;let i=Array.from(new Set(t.colors.map(a=>a.hex))).sort((a,c)=>ct(a)-ct(c));J={},t.colors.forEach(a=>{a.hex&&a.name&&(J[a.hex.toUpperCase()]=a.name)}),n.value=i.join(", "),typeof je=="function"&&je(),ve();try{n.focus(),n.setSelectionRange(n.value.length,n.value.length)}catch(a){}alert(`\u2705 Successfully imported ${t.colors.length} color styles from Figma!

Colors: ${t.colors.map(a=>a.name+" ("+a.hex+")").join(", ")}`)}else alert(`\u26A0\uFE0F No color styles found in this Figma file.

Make sure you have defined color styles (paint styles) in your design system.`);if(t&&t.type==="color-variables-extracted")if(t.colors&&Array.isArray(t.colors)&&t.colors.length>0){let n=document.getElementById("color-scale");if(!n)return;let i=Array.from(new Set(t.colors.map(a=>a.hex))).sort((a,c)=>ct(a)-ct(c));J={},t.colors.forEach(a=>{a.hex&&a.name&&(J[a.hex.toUpperCase()]=a.name)}),n.value=i.join(", "),typeof je=="function"&&je(),ve();try{n.focus(),n.setSelectionRange(n.value.length,n.value.length)}catch(a){}alert(`\u2705 Successfully imported ${t.colors.length} color variables from Figma!

Colors: ${t.colors.map(a=>a.name+" ("+a.hex+")").join(", ")}`)}else alert(`\u26A0\uFE0F No color variables found in this Figma file.

Make sure you have defined color variables in your design system.`)}})();})();
