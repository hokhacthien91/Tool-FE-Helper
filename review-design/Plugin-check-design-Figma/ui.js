(()=>{var Cn=Object.defineProperty,wn=Object.defineProperties;var In=Object.getOwnPropertyDescriptors;var Eo=Object.getOwnPropertySymbols;var $n=Object.prototype.hasOwnProperty,En=Object.prototype.propertyIsEnumerable;var Mo=(b,C,y)=>C in b?Cn(b,C,{enumerable:!0,configurable:!0,writable:!0,value:y}):b[C]=y,To=(b,C)=>{for(var y in C||(C={}))$n.call(C,y)&&Mo(b,y,C[y]);if(Eo)for(var y of Eo(C))En.call(C,y)&&Mo(b,y,C[y]);return b},Fo=(b,C)=>wn(b,In(C));function zo(){function b(C){try{let y=C.target&&C.target.closest?C.target.closest("button"):null;if(!y)return;let k=y.closest?y.closest(".issue"):null;if(!k||!(y.closest&&y.closest(".issue-actions")))return;let v=y.getAttribute("data-id")||k.getAttribute("data-issue-id");if(!v)return;parent.postMessage({pluginMessage:{type:"select-node",id:v}},"*")}catch(y){console.error("autoSelectNodeFromIssueClick error:",y)}}document.addEventListener("click",b,!0)}function _(b,C,y){if(!C)return;let k=document.querySelector(`.issue[data-issue-id="${b}"]`);if(!k){let z=document.querySelector(`button.btn-fix[data-id="${b}"]`);z&&(k=z.closest(".issue"))}if(!k)return;let w=k.querySelector(".fix-message");w&&w.remove();let v=document.createElement("div");v.className="fix-message",v.style.cssText=`
      margin-top: 8px;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      background: ${y?"#d4edda":"#f8d7da"};
      color: ${y?"#155724":"#721c24"};
      border: 1px solid ${y?"#c3e6cb":"#f5c6cb"};
      animation: slideIn 0.3s ease-out;
    `,v.textContent=C;let E=k.querySelector(".issue-header");E?E.parentNode.insertBefore(v,E.nextSibling):k.appendChild(v),setTimeout(()=>{v.style.animation="slideOut 0.3s ease-out",setTimeout(()=>{v.parentNode&&v.remove()},300)},5e3)}function d(b){return b==null?"":String(b).replace(/[&<>"']/g,function(y){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[y]})}function Tt(b){console.log("[showErrorModal] Called with message:",b);let C=document.getElementById("error-modal-overlay");C&&(console.log("[showErrorModal] Removing existing modal"),C.remove());let y=document.createElement("div");y.className="modal-overlay",y.id="error-modal-overlay",console.log("[showErrorModal] Created overlay element");let k=document.createElement("div");k.className="modal-dialog",k.style.maxWidth="450px";let w=String(b||"").replace(/^[❌⚠️✅]\s*/,"").trim();k.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title" style="color: #dc3545;">\u26A0\uFE0F Error</h2>
      </div>
      <div class="modal-body">
        <div style="padding: 16px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; margin-bottom: 16px;">
          <div style="font-size: 14px; color: #721c24; line-height: 1.6;">
            ${d(w)}
          </div>
        </div>
        <div style="font-size: 12px; color: #666; line-height: 1.5;">
          Please check the issue and try again. If the problem persists, you may need to switch to Design Mode or edit the main component directly.
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-primary" id="error-modal-ok-btn" style="background: #dc3545; border-color: #dc3545; color: white;">OK</button>
      </div>
    `,y.appendChild(k),document.body.appendChild(y),console.log("[showErrorModal] Appended overlay to body, overlay visible:",y.offsetParent!==null),y.style.display="flex",y.style.visibility="visible",y.style.opacity="1";let v=k.querySelector("#error-modal-ok-btn"),E=k.querySelector(".modal-close");if(console.log("[showErrorModal] Found buttons:",{okBtn:!!v,closeBtn:!!E}),!v){console.error("[showErrorModal] OK button not found!");return}let z=()=>{y.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{y.parentNode&&y.remove()},200)};v.onclick=z,E&&(E.onclick=z),y.onclick=H=>{H.target===y&&z()},setTimeout(()=>{v.focus()},100),console.log("[showErrorModal] Modal setup complete")}function Ue(b){if(!b)return 0;let C=String(b).replace("#","");if(C.length<6)return 0;let y=parseInt(C.substring(0,2),16),k=parseInt(C.substring(2,4),16),w=parseInt(C.substring(4,6),16);return isNaN(y)||isNaN(k)||isNaN(w)?0:(y*299+k*587+w*114)/1e3}function bt(b,C){let y=String(b||"").replace("#",""),k=String(C||"").replace("#","");if(y.length<6||k.length<6)return 1/0;let w=parseInt(y.substring(0,2),16),v=parseInt(y.substring(2,4),16),E=parseInt(y.substring(4,6),16),z=parseInt(k.substring(0,2),16),H=parseInt(k.substring(2,4),16),M=parseInt(k.substring(4,6),16);if([w,v,E,z,H,M].some(W=>isNaN(W)))return 1/0;let A=z-w,q=H-v,L=M-E;return Math.sqrt(A*A+q*q+L*L)}function No(b){let C=String(b||"").replace("#","");if(C.length<6)return 0;let y=parseInt(C.substring(0,2),16)/255,k=parseInt(C.substring(2,4),16)/255,w=parseInt(C.substring(4,6),16)/255;if(isNaN(y)||isNaN(k)||isNaN(w))return 0;let v=y<=.03928?y/12.92:Math.pow((y+.055)/1.055,2.4),E=k<=.03928?k/12.92:Math.pow((k+.055)/1.055,2.4),z=w<=.03928?w/12.92:Math.pow((w+.055)/1.055,2.4);return .2126*v+.7152*E+.0722*z}function vt(b,C){let y=No(b),k=No(C),w=Math.max(y,k),v=Math.min(y,k);return(w+.05)/(v+.05)}function Ze(b){if(!b||!b.message)return null;let y=(b.message||"").match(/Color (#[0-9A-Fa-f]{6})/),k=y?y[1].toUpperCase():null;if(!k)return null;let w=document.getElementById("color-scale");if(!w||!w.value.trim())return null;let v=w.value.split(",").map(H=>H.trim().toUpperCase()).filter(H=>H&&H.startsWith("#"));if(v.length===0)return null;let E=null,z=1/0;return v.forEach(H=>{let M=bt(k,H);M<z&&(z=M,E=H)}),z>100?null:E}function Qe(b){if(!b||!b.message)return null;let y=(b.message||"").match(/\((\d+)px\)/);if(!y)return null;let k=parseInt(y[1],10);if(isNaN(k))return null;let w=document.getElementById("spacing-scale");if(!w||!w.value.trim())return null;let v=w.value.split(",").map(M=>parseInt(M.trim(),10)).filter(M=>!isNaN(M)&&M>=0).sort((M,A)=>M-A);if(v.length===0)return null;let E=null,z=1/0;v.forEach(M=>{let A=Math.abs(M-k);A<z&&(z=A,E=M)});let H=Math.max(k*.2,10);return z>H?null:E}function Mn(b,C){if(!b||b.length===0){alert("No typography styles available. Please add styles in Typography Settings.");return}let y=document.createElement("div");y.className="modal-overlay",y.style.zIndex="10001";let k=document.createElement("div");k.className="modal-dialog",k.style.maxWidth="300px",k.style.padding="0",k.innerHTML=`
      <div class="modal-header" style="padding: 16px;">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title" style="font-size: 14px;">Choose Typography Style</h2>
      </div>
      <div style="max-height: 300px; overflow-y: auto;">
        ${b.map(v=>{let E=d(v.name||""),z=d(v.fontFamily||""),H=d(v.fontSize||""),M=d(v.fontWeight||"");return`
          <div class="style-dropdown-item" data-style-id="${v.id}" style="padding: 12px 16px; cursor: pointer; font-size: 13px; border-bottom: 1px solid #f0f0f0;" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='white'">
            <div style="font-weight: 600; color: #333;">${E}</div>
            <div style="font-size: 11px; color: #666; margin-top: 4px;">
              ${z} ${H}px ${M}
            </div>
          </div>
        `}).join("")}
      </div>
    `,y.appendChild(k),document.body.appendChild(y);let w=()=>{y.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{y.parentNode&&y.remove()},200)};k.querySelector(".modal-close").onclick=w,y.onclick=v=>{v.target===y&&w()},k.querySelectorAll(".style-dropdown-item").forEach(v=>{v.onclick=E=>{E.preventDefault(),E.stopPropagation();let z=parseInt(v.getAttribute("data-style-id"),10),H=b.find(M=>M.id===z);H&&C&&(C(H),w())}})}function Bo(b,C){if(!b||!b.bestMatch){console.error("showTypographyFixModal: missing issue or bestMatch");return}let y=b.nodeProps||{},k=b.bestMatch,w=y.fontFamily||"",v=y.fontSize!==null&&y.fontSize!==void 0?y.fontSize:"",E=y.fontWeight||"",z=y.lineHeight||"",H=y.letterSpacing!==null&&y.letterSpacing!==void 0?y.letterSpacing:"",M=w,A=v,q=E,L=z,W=H;k.differences&&k.differences.forEach(B=>{B.property==="Font Family"&&B.expected?M=B.expected:B.property==="Font Size"&&B.expected?A=B.expected.replace("px",""):B.property==="Font Weight"&&B.expected?q=B.expected:B.property==="Line Height"&&B.expected?L=B.expected:B.property==="Letter Spacing"&&B.expected&&(W=B.expected)});let G=document.createElement("div");G.className="modal-overlay",G.id="typography-fix-modal-overlay";let V=document.createElement("div");V.className="modal-dialog",V.style.maxWidth="500px",V.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Fix Typography Style</h2>
        <p class="modal-subtitle">Node: ${d(b.nodeName||"Unnamed")} \u2192 Suggested: ${d(k.name)}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">
            Edit values below and click Apply to fix:
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Font Family</label>
            <input type="text" class="modal-input" id="fix-font-family" value="${d(M)}" style="width: 100%;" />
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Font Size (px)</label>
            <input type="number" class="modal-input" id="fix-font-size" value="${d(A)}" style="width: 100%;" />
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Font Weight</label>
            <select class="modal-input" id="fix-font-weight" style="width: 100%;">
              <option value="Regular" ${q==="Regular"?"selected":""}>Regular</option>
              <option value="Medium" ${q==="Medium"?"selected":""}>Medium</option>
              <option value="SemiBold" ${q==="SemiBold"||q==="Semi Bold"?"selected":""}>SemiBold</option>
              <option value="Bold" ${q==="Bold"?"selected":""}>Bold</option>
            </select>
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Line Height (% or px or auto)</label>
            <input type="text" class="modal-input" id="fix-line-height" value="${d(L)}" style="width: 100%;" placeholder="e.g. 120%, 24px, auto" />
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Letter Spacing (px or %)</label>
            <input type="text" class="modal-input" id="fix-letter-spacing" value="${d(W)}" style="width: 100%;" placeholder="e.g. 0, 0.5px, 1%" />
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
    `,G.appendChild(V),document.body.appendChild(G);let me=V.querySelector("#fix-font-family"),oe=V.querySelector("#fix-font-size"),ee=V.querySelector("#fix-font-weight"),j=V.querySelector("#fix-line-height"),O=V.querySelector("#fix-letter-spacing"),F=V.querySelector("#choose-typo-style-btn"),J=V.querySelector("#typography-fix-modal-cancel-btn"),D=V.querySelector("#typography-fix-modal-apply-btn"),Z=V.querySelector(".modal-close");setTimeout(()=>{me.focus()},100);let S=()=>{G.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{G.parentNode&&G.remove()},200)};J.onclick=S,Z.onclick=S,G.onclick=B=>{B.target===G&&S()},F.onclick=()=>{Mn(C,B=>{B&&(me.value=B.fontFamily||"",oe.value=B.fontSize||"",ee.value=B.fontWeight||"Regular",j.value=B.lineHeight||"",O.value=B.letterSpacing||"0")})},D.onclick=()=>{let B={fontFamily:me.value.trim(),fontSize:oe.value.trim(),fontWeight:ee.value,lineHeight:j.value.trim(),letterSpacing:O.value.trim()};if(!B.fontFamily){me.focus(),me.style.borderColor="#ff3b30",setTimeout(()=>{me.style.borderColor="#0071e3"},2e3);return}if(!B.fontSize||isNaN(parseFloat(B.fontSize))){oe.focus(),oe.style.borderColor="#ff3b30",setTimeout(()=>{oe.style.borderColor="#0071e3"},2e3);return}S(),_(b.id,"\u23F3 Fixing...",!0),parent.postMessage({pluginMessage:{type:"fix-issue",issue:b,fixData:B}},"*")}}function Ao(b,C,y,k){let w=document.createElement("div");w.className="modal-overlay",w.id="spacing-picker-modal-overlay";let v=document.createElement("div");v.className="modal-dialog",v.style.maxWidth="400px";let E=k.map(L=>`
        <div class="spacing-picker-item" data-value="${L}" style="
          padding: 12px;
          margin-bottom: 8px;
          border: 2px solid ${y===L?"#0071e3":"#ddd"};
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: white;
          transition: all 0.2s;
        " onmouseover="this.style.borderColor='#0071e3'; this.style.boxShadow='0 2px 8px rgba(0,113,227,0.2)'" onmouseout="this.style.borderColor='${y===L?"#0071e3":"#ddd"}'; this.style.boxShadow='none'">
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
            ">${L}px</div>
            <div style="font-weight: 600; font-size: 14px; color: #333;">
              ${L}px
            </div>
          </div>
          ${y===L?'<div style="color: #0071e3; font-weight: 600;">Current</div>':""}
        </div>
      `).join(""),z=String(C||"").replace(/([A-Z])/g," $1").replace(/^./,L=>L.toUpperCase()).trim();v.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Choose Spacing Value</h2>
        <p class="modal-subtitle">Node: ${d(b.nodeName||"Unnamed")} - ${d(z)}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current Value:</div>
          <div style="font-size: 16px; font-weight: 600; color: #333;">${y}px</div>
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
          ${E}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="spacing-picker-modal-cancel-btn">Cancel</button>
      </div>
    `,w.appendChild(v),document.body.appendChild(w);let H=v.querySelector("#spacing-picker-modal-cancel-btn"),M=v.querySelector(".modal-close"),A=v.querySelectorAll(".spacing-picker-item"),q=()=>{w.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{w.parentNode&&w.remove()},200)};H.onclick=q,M.onclick=q,w.onclick=L=>{L.target===w&&q()},A.forEach(L=>{L.onclick=W=>{W.preventDefault(),W.stopPropagation();let G=parseInt(L.getAttribute("data-value"),10);q(),Ft(b,C,y,G)}})}function Ft(b,C,y,k){let w=String(C||"").replace(/([A-Z])/g," $1").replace(/^./,q=>q.toUpperCase()).trim(),v=document.createElement("div");v.className="modal-overlay",v.id="spacing-fix-confirm-modal-overlay";let E=document.createElement("div");E.className="modal-dialog",E.style.maxWidth="400px",E.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Confirm Spacing Change</h2>
        <p class="modal-subtitle">Node: ${d(b.nodeName||"Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">Change ${d(w)} from:</div>
          <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px; margin-bottom: 12px;">
            <div style="
              width: 50px;
              height: 50px;
              border-radius: 6px;
              background: #f0f0f0;
              border: 2px solid #ddd;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              font-weight: 600;
              color: #333;
            ">${y}px</div>
            <div>
              <div style="font-weight: 600; font-size: 16px; color: #333;">${y}px</div>
            </div>
          </div>
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">To:</div>
          <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #e3f2fd; border-radius: 6px;">
            <div style="
              width: 50px;
              height: 50px;
              border-radius: 6px;
              background: #e3f2fd;
              border: 2px solid #0071e3;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              font-weight: 600;
              color: #0071e3;
            ">${k}px</div>
            <div>
              <div style="font-weight: 600; font-size: 16px; color: #333;">${k}px</div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="spacing-fix-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="spacing-fix-confirm-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `,v.appendChild(E),document.body.appendChild(v);let z=E.querySelector("#spacing-fix-confirm-cancel-btn"),H=E.querySelector("#spacing-fix-confirm-apply-btn"),M=E.querySelector(".modal-close"),A=()=>{v.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{v.parentNode&&v.remove()},200)};z.onclick=A,M.onclick=A,v.onclick=q=>{q.target===v&&A()},H.onclick=()=>{A(),_(b.id,"\u23F3 Fixing spacing...",!0),parent.postMessage({pluginMessage:{type:"fix-spacing-issue",issue:b,propertyName:C,value:k}},"*")}}function et(b){try{let C=parseInt(b.slice(1,3),16),y=parseInt(b.slice(3,5),16),k=parseInt(b.slice(5,7),16);return(C*299+y*587+k*114)/1e3>128?"#000000":"#ffffff"}catch(C){return"#000000"}}function zt(b,C,y,k="",w=""){return et(b),`
      <div class="color-picker-item" data-color="${d(b)}" style="
        padding: 12px;
        margin-bottom: 8px;
        border: 2px solid ${y};
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
        background: white;
        transition: all 0.2s;
      " onmouseover="this.style.borderColor='#0071e3'; this.style.boxShadow='0 2px 8px rgba(0,113,227,0.2)'" onmouseout="this.style.borderColor='${y}'; this.style.boxShadow='none'">
        <div style="
          width: 48px;
          height: 48px;
          border-radius: 6px;
          background: ${d(b)};
          border: 2px solid #ddd;
          flex-shrink: 0;
        "></div>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 14px; color: #333; margin-bottom: 4px;">
            ${C||d(b)}
          </div>
          <div style="font-size: 12px; color: #666; font-family: 'SF Mono', Monaco, monospace;">
            ${d(b)}
          </div>
          ${k?`<div style="font-size: 11px; color: #666; margin-top: 4px;">${k}</div>`:""}
        </div>
        ${w?`<div style="color: #0071e3; font-weight: 600; margin-left: auto;">${w}</div>`:""}
      </div>
    `}function Lo(b,C,y,k={}){if(!C){let L=(b.message||"").match(/Color (#[0-9A-Fa-f]{6})/);C=L?L[1].toUpperCase():null}if(!C){alert("Cannot determine current color from issue message");return}let w=document.createElement("div");w.className="modal-overlay",w.id="color-picker-modal-overlay";let v=document.createElement("div");v.className="modal-dialog",v.style.maxWidth="400px";let E=y.map(q=>{let L=k[q]||"";return zt(q,L||q,C===q?"#0071e3":"#ddd","",C===q?"Current":"")}).join("");v.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Choose Color</h2>
        <p class="modal-subtitle">Node: ${d(b.nodeName||"Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current Color:</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 32px; height: 32px; border-radius: 4px; background: ${d(C)}; border: 1px solid #ddd;"></div>
            <div style="font-family: 'SF Mono', Monaco, monospace; font-size: 13px; font-weight: 600;">${d(C)}</div>
          </div>
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
          ${E}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="color-picker-modal-cancel-btn">Cancel</button>
      </div>
    `,w.appendChild(v),document.body.appendChild(w);let z=v.querySelector("#color-picker-modal-cancel-btn"),H=v.querySelector(".modal-close"),M=v.querySelectorAll(".color-picker-item"),A=()=>{w.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{w.parentNode&&w.remove()},200)};z.onclick=A,H.onclick=A,w.onclick=q=>{q.target===w&&A()},M.forEach(q=>{q.onclick=L=>{L.preventDefault(),L.stopPropagation();let W=q.getAttribute("data-color");A(),Nt(b,C,W,k)}})}function Nt(b,C,y,k={}){let w=k[y]||y,v=document.createElement("div");v.className="modal-overlay",v.id="color-fix-confirm-modal-overlay";let E=document.createElement("div");E.className="modal-dialog",E.style.maxWidth="400px",E.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Confirm Color Change</h2>
        <p class="modal-subtitle">Node: ${d(b.nodeName||"Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">Change color from:</div>
          <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px; margin-bottom: 12px;">
            <div style="width: 48px; height: 48px; border-radius: 6px; background: ${d(C)}; border: 2px solid #ddd;"></div>
            <div>
              <div style="font-weight: 600; font-size: 14px; color: #333;">${d(C)}</div>
            </div>
          </div>
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">To:</div>
          <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #e3f2fd; border-radius: 6px;">
            <div style="width: 48px; height: 48px; border-radius: 6px; background: ${d(y)}; border: 2px solid #0071e3;"></div>
            <div>
              <div style="font-weight: 600; font-size: 14px; color: #333;">${d(w)}</div>
              <div style="font-size: 12px; color: #666; font-family: 'SF Mono', Monaco, monospace;">${d(y)}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="color-fix-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="color-fix-confirm-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `,v.appendChild(E),document.body.appendChild(v);let z=E.querySelector("#color-fix-confirm-cancel-btn"),H=E.querySelector("#color-fix-confirm-apply-btn"),M=E.querySelector(".modal-close"),A=()=>{v.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{v.parentNode&&v.remove()},200)};z.onclick=A,M.onclick=A,v.onclick=q=>{q.target===v&&A()},H.onclick=()=>{A(),_(b.id,"\u23F3 Fixing color...",!0),parent.postMessage({pluginMessage:{type:"fix-color-issue",issue:b,color:y}},"*")}}function Bt({reportData:b,getTypeDisplayName:C}){let y=b||{},k=y.issues||[],w=y.tokens||null,v=y.timestamp||Date.now(),E=new Date(v).toLocaleString("vi-VN"),z="Design Review",H=A=>{try{return typeof C=="function"?C(A):String(A||"")}catch(q){return String(A||"")}},M=`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Design Review Report - ${E}</title>
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
      <div class="meta">Generated: ${E} | Page: ${z}</div>
    </div>`;if(k&&k.length>0){let A={error:k.filter(L=>L.severity==="error").length,warn:k.filter(L=>L.severity==="warn").length,total:k.length},q=k.reduce((L,W)=>(L[W.type]=L[W.type]||[],L[W.type].push(W),L),{});M+=`
    <div class="section">
      <h2 class="section-title">\u{1F4CA} Summary</h2>
      <div class="stats">
        ${A.error>0?`<div class="stat-card error"><div class="value">${A.error}</div><div class="label">Errors</div></div>`:""}
        ${A.warn>0?`<div class="stat-card warn"><div class="value">${A.warn}</div><div class="label">Warnings</div></div>`:""}
        <div class="stat-card"><div class="value">${A.total}</div><div class="label">Total Issues</div></div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">\u{1F50D} Issues</h2>
      <div class="export-filter-group">
        <button class="export-filter-btn active" data-severity="all">All</button>
        <button class="export-filter-btn" data-severity="error">Errors</button>
        <button class="export-filter-btn" data-severity="warn">Warnings</button>
      </div>`;for(let[L,W]of Object.entries(q)){let G=d(H(L));M+=`
      <div class="issue-group collapsed" data-type="${L}" data-label="${G}">
        <div class="issue-group-header">
          <button class="issue-group-toggle" type="button">+</button>
          <span>${G} (${W.length})</span>
        </div>
        <div class="issue-group-content">`,W.forEach(V=>{M+=`
          <div class="issue ${V.severity}">
            <div class="issue-type">${String(V.severity||"").toUpperCase()}</div>
            <div class="issue-message">${d(V.message)}</div>
            ${V.nodeName?`<div class="issue-node">Node: ${d(V.nodeName)}</div>`:""}
          </div>`}),M+=`
        </div>
      </div>`}M+=`
    </div>`}if(w){M+=`
    <div class="section">
      <h2 class="section-title">\u{1F3A8} Design Tokens</h2>`;let A={colors:{label:"Colors",values:w.colors||[]},gradients:{label:"Gradients",values:w.gradients||[]},borderRadius:{label:"Border Radius",values:w.borderRadius||[]},fontWeight:{label:"Font Weight",values:w.fontWeight||[]},lineHeight:{label:"Line Height (%)",values:w.lineHeight||[]},fontSize:{label:"Font Size",values:w.fontSize||[]},fontFamily:{label:"Font Family",values:w.fontFamily||[]}};for(let[q,L]of Object.entries(A)){if(M+=`
      <div class="issue-group collapsed">
        <div class="issue-group-header">
          <button class="issue-group-toggle" type="button">+</button>
          <span>${L.label} (${L.values.length})</span>
        </div>
        <div class="issue-group-content">`,!L.values||L.values.length===0){M+=`
          <div class="token-empty-message">No tokens in this group.</div>`,M+=`
        </div>
      </div>`;continue}M+=`
          <div class="token-list">`,L.values.forEach(W=>{let G=W.value,V=typeof W.totalNodes=="number"?W.totalNodes:W.nodes?W.nodes.length:0,me=W.colorType||"";if(q==="colors")M+=`
          <div class="token-item">
            <div class="token-value">
              <span class="token-color-preview" style="background-color: ${d(G)}"></span>
              ${d(G)}
              ${me?`<span class="token-color-type">${d(me)}</span>`:""}
            </div>
            ${V>1?`<div class="token-node-count">Used in ${V} nodes</div>`:""}
          </div>`;else if(q==="gradients")M+=`
          <div class="token-item">
            <div class="token-value">
              <span class="token-color-preview" style="background: ${d(G)}"></span>
              ${d(G)}
              ${me?`<span class="token-color-type">${d(me)}</span>`:""}
            </div>
            ${V>1?`<div class="token-node-count">Used in ${V} nodes</div>`:""}
          </div>`;else{let oe="";if(q==="fontWeight"){let ee=Array.isArray(W.fontFamilies)?W.fontFamilies:null;if(!ee){let j={};(Array.isArray(W.nodes)?W.nodes:[]).forEach(F=>{let J=F&&F.fontFamily?String(F.fontFamily):"Unknown";j[J]=(j[J]||0)+1}),ee=Object.entries(j).map(([F,J])=>({family:F,count:J})).sort((F,J)=>J.count-F.count||F.family.localeCompare(J.family))}Array.isArray(ee)&&ee.length>0&&(oe=`<div class="token-node-count" style="margin-top: 6px;">Font-family:<br/>${ee.map(O=>`${d(O.family)} (${O.count})`).join("<br/>")}</div>`)}M+=`
          <div class="token-item">
            <div class="token-value">${d(String(G))}</div>
            ${V>1?`<div class="token-node-count">Used in ${V} nodes</div>`:""}
            ${oe}
          </div>`}}),M+=`
          </div>
        </div>
      </div>`}M+=`
    </div>`}return M+=`
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
</html>`,M}function Tn(){let b=new Date,C=b.getFullYear(),y=String(b.getMonth()+1).padStart(2,"0"),k=String(b.getDate()).padStart(2,"0"),w=String(b.getHours()).padStart(2,"0"),v=String(b.getMinutes()).padStart(2,"0"),E=String(b.getSeconds()).padStart(2,"0");return`design-review-report-${C}-${y}-${k}-${w}-${v}-${E}`}function Ho({format:b,reportData:C,getTypeDisplayName:y,filenameBase:k}={}){let w=C||{};if(!w.issues&&!w.tokens){alert("No data to export!");return}let v=k||Tn();if(b==="html"){let E=Bt({reportData:w,getTypeDisplayName:y}),z=new Blob([E],{type:"text/html"}),H=URL.createObjectURL(z),M=document.createElement("a");M.href=H,M.download=`${v}.html`,M.click(),URL.revokeObjectURL(H);return}if(b==="pdf"){let E=Bt({reportData:w,getTypeDisplayName:y});try{let z=window.open("","_blank");if(!z){alert("Popup blocked. Downloading HTML - you can open the file and select Print to create PDF.");let H=new Blob([E],{type:"text/html"}),M=URL.createObjectURL(H),A=document.createElement("a");A.href=M,A.download=`${v}.html`,A.click(),URL.revokeObjectURL(M);return}z.document.open(),z.document.write(E),z.document.close(),z.onload=()=>{setTimeout(()=>{z.print()},250)},setTimeout(()=>{z.document&&z.document.readyState==="complete"&&z.print()},500)}catch(z){console.error("Error opening print window:",z),alert("Cannot open print window. Downloading HTML - you can open the file and select Print to create PDF.");let H=new Blob([E],{type:"text/html"}),M=URL.createObjectURL(H),A=document.createElement("a");A.href=M,A.download=`${v}.html`,A.click(),URL.revokeObjectURL(M)}return}if(b==="json"){let E=JSON.stringify(w,null,2),z=new Blob([E],{type:"application/json"}),H=URL.createObjectURL(z),M=document.createElement("a");M.href=H,M.download=`${v}.json`,M.click(),URL.revokeObjectURL(H);return}}function qo({maxHistory:b=10,postPluginMessage:C,getCurrentReportData:y,setIsViewingTokens:k,renderResults:w,renderTokens:v}={}){let E=[],z=!1,H=j=>{try{typeof C=="function"&&C(j)}catch(O){console.error("scanHistory postPluginMessage error:",O)}};function M(j){E=(Array.isArray(j)?j:[]).slice(0,b)}function A(){E=[],z=!1}function q(){return E||[]}function L(j,O,F,J){try{if(O==="issues"&&(!F.issues||F.issues.length===0)){console.log("Skipping save - no issues data");return}if(O==="tokens"&&(!F.tokens||Object.keys(F.tokens).length===0)){console.log("Skipping save - no tokens data");return}let D={id:Date.now().toString(),mode:j,type:O,timestamp:new Date().toISOString(),context:J||null,data:{issues:F.issues||null,tokens:F.tokens||null,issuesCount:F.issues?F.issues.length:0,tokensCount:F.tokens?Object.keys(F.tokens).reduce((S,B)=>{var ve;return S+(((ve=F.tokens[B])==null?void 0:ve.length)||0)},0):0}};E.unshift(D),E=E.slice(0,b);let Z=document.getElementById("history-panel");Z&&Z.style.display!=="none"&&oe(),H({type:"save-history-entry",entry:D})}catch(D){console.error("Error saving scan history:",D)}}function W(){H({type:"get-history"})}function G(){try{let j=q();if(j.length>0){let O=j[0],F=document.querySelector(`input[name="scope"][value="${O.mode}"]`);F&&(F.checked=!0,console.log("Loaded last scan mode:",O.mode))}}catch(j){console.error("Error loading last scan mode:",j)}}function V(){z||(G(),z=!0)}function me(j){try{let O=new Date(j),J=new Date-O,D=Math.floor(J/6e4),Z=Math.floor(J/36e5),S=Math.floor(J/864e5);return D<1?"Just now":D<60?`${D} minutes ago`:Z<24?`${Z} hours ago`:S<7?`${S} days ago`:O.toLocaleString("en-US",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}catch(O){return j}}function oe(){let j=document.getElementById("history-list");if(!j){console.error("history-list element not found");return}let O=q();if(console.log("Rendering scan history:",O.length,"entries"),O.length===0){j.innerHTML=`
              <div class="history-empty">
                <div class="icon">\u{1F4CB}</div>
                <p>No scan history</p>
                <p style="font-size: 11px; margin-top: 8px;">Scans will be saved automatically</p>
              </div>
            `;return}j.innerHTML=O.map(F=>{var je,tt;let J=me(F.timestamp),D=F.mode==="page"?"Page":"Selection",Z=F.type==="issues"?"Issues":"Tokens",S=F.type==="issues"?"issues":"tokens",B=F.context&&F.context.label?F.context.label:`${D} scan`,ve="";if(F.type==="issues"){let ae=((je=F.data.issues)==null?void 0:je.filter(Oe=>Oe.severity==="error").length)||0,rt=((tt=F.data.issues)==null?void 0:tt.filter(Oe=>Oe.severity==="warn").length)||0;ve=`
                <span>\u274C ${ae} errors</span>
                <span>\u26A0\uFE0F ${rt} warnings</span>
                <span>\u{1F4CA} ${F.data.issuesCount} total</span>
              `}else ve=`
                <span>\u{1F3A8} ${F.data.tokensCount} tokens</span>
              `;return`
              <div class="history-item" data-id="${F.id}">
                <div class="history-item-header">
                  <span class="history-item-type ${S}">${Z}</span>
                  <span class="history-item-time">${J}</span>
                </div>
                <div class="history-item-info">${d(B)}</div>
                <div class="history-item-stats">${ve}</div>
              </div>
            `}).join(""),j.querySelectorAll(".history-item").forEach(F=>{F.onclick=()=>{let J=F.getAttribute("data-id");ee(J)}})}function ee(j){try{let F=q().find(S=>S.id===j);if(!F){alert("Scan history entry not found!");return}let J=document.querySelector(`input[name="scope"][value="${F.mode}"]`);J&&(J.checked=!0);let D=typeof y=="function"?y():null;if(!D){console.warn("restoreReportFromHistory: currentReportData is not available");return}D.scanMode=F.mode,D.context=F.context||null,F.type==="issues"&&F.data.issues?(D.issues=F.data.issues,D.tokens=null,typeof k=="function"&&k(!1),typeof w=="function"&&w(F.data.issues,!0,{restoreTimestamp:F.timestamp})):F.type==="tokens"&&F.data.tokens&&(D.issues=null,D.tokens=F.data.tokens,typeof k=="function"&&k(!0),typeof v=="function"&&v(F.data.tokens,!0,{restoreTimestamp:F.timestamp}));let Z=document.getElementById("history-panel");Z&&(Z.style.display="none"),console.log("Report restored from history:",j)}catch(O){console.error("Error restoring report from history:",O),alert("Error restoring report: "+O.message)}}return{setHistory:M,clearLocalHistory:A,getScanHistory:q,saveScanHistory:L,requestScanHistory:W,loadLastScanMode:G,loadLastScanModeOnce:V,renderScanHistory:oe,restoreReportFromHistory:ee}}console.log("Header.js222");console.log("ui.js loaded");(function(){console.log("Initializing ui.js...");let b=document.getElementById("btn-scan"),C=document.getElementById("btn-cancel-scan"),y=document.getElementById("scan-progress"),k=document.getElementById("scan-progress-bar"),w=document.getElementById("scan-progress-text"),v=document.getElementById("btn-extract-tokens"),E=document.getElementById("btn-fill-spacing-scale"),z=document.getElementById("btn-fill-color-scale"),H=document.getElementById("btn-extract-color-styles"),M=document.getElementById("btn-fill-font-size-scale"),A=document.getElementById("btn-fill-line-height-scale"),q=document.getElementById("btn-fill-font-size-from-typo"),L=document.getElementById("btn-fill-line-height-from-typo"),W=document.getElementById("btn-export"),G=document.getElementById("btn-history"),V=document.getElementById("btn-close-history"),me=document.getElementById("btn-reset-all"),oe=document.getElementById("results-issues"),ee=document.getElementById("results-tokens"),j=document.getElementById("btn-close"),O=document.querySelectorAll(".report-tab"),F=document.querySelectorAll(".report-content"),J="issues";if(!b||!v||!oe||!ee||!j||!W||!G||!E||!z||!M||!A){console.error("Required elements not found",{btnScan:b,btnExtractTokens:v,btnFillSpacingScale:E,btnFillColorScale:z,btnFillFontSizeScale:M,btnFillLineHeightScale:A,resultsIssues:oe,resultsTokens:ee,btnClose:j,btnExport:W,btnHistory:G});return}zo();let D={},Z={},S={issues:null,tokens:null,scanMode:null,timestamp:null,tokensTimestamp:null,context:null},B=[{id:1,name:"H1",fontFamily:"Inter",fontSize:48,fontWeight:"Bold",lineHeight:"120%",letterSpacing:"0",wordSpacing:"0"},{id:2,name:"H2",fontFamily:"Inter",fontSize:36,fontWeight:"Bold",lineHeight:"130%",letterSpacing:"0",wordSpacing:"0"},{id:3,name:"H3",fontFamily:"Inter",fontSize:28,fontWeight:"SemiBold",lineHeight:"130%",letterSpacing:"0",wordSpacing:"0"},{id:4,name:"H4",fontFamily:"Inter",fontSize:24,fontWeight:"SemiBold",lineHeight:"140%",letterSpacing:"0",wordSpacing:"0"},{id:5,name:"H5",fontFamily:"Inter",fontSize:20,fontWeight:"Medium",lineHeight:"140%",letterSpacing:"0",wordSpacing:"0"},{id:6,name:"H6",fontFamily:"Inter",fontSize:18,fontWeight:"Medium",lineHeight:"140%",letterSpacing:"0",wordSpacing:"0"},{id:7,name:"Body",fontFamily:"Inter",fontSize:16,fontWeight:"Regular",lineHeight:"150%",letterSpacing:"0",wordSpacing:"0"}],ve=8;function je(e){e&&parent.postMessage({pluginMessage:{type:"save-last-report",report:e}},"*")}function tt(){parent.postMessage({pluginMessage:{type:"get-last-report"}},"*")}function ae(){var t,o,s,n,l,i,a,r,p,u,f,m,g,h,x;let e={spacingScale:((t=document.getElementById("spacing-scale"))==null?void 0:t.value)||"",spacingThreshold:((o=document.getElementById("spacing-threshold"))==null?void 0:o.value)||"100",colorScale:((s=document.getElementById("color-scale"))==null?void 0:s.value)||"",colorNameMap:D,ignoredIssues:Z,fontSizeScale:((n=document.getElementById("font-size-scale"))==null?void 0:n.value)||"",fontSizeThreshold:((l=document.getElementById("font-size-threshold"))==null?void 0:l.value)||"100",lineHeightScale:((i=document.getElementById("line-height-scale"))==null?void 0:i.value)||"",lineHeightThreshold:((a=document.getElementById("line-height-threshold"))==null?void 0:a.value)||"300",lineHeightBaselineThreshold:((r=document.getElementById("line-height-baseline-threshold"))==null?void 0:r.value)||"120",typographyStyles:B,typographyRules:{checkStyle:((p=document.getElementById("rule-typo-style"))==null?void 0:p.checked)||!0,checkFontFamily:((u=document.getElementById("rule-font-family"))==null?void 0:u.checked)||!0,checkFontSize:((f=document.getElementById("rule-font-size"))==null?void 0:f.checked)||!0,checkFontWeight:((m=document.getElementById("rule-font-weight"))==null?void 0:m.checked)||!0,checkLineHeight:((g=document.getElementById("rule-line-height"))==null?void 0:g.checked)||!0,checkLetterSpacing:((h=document.getElementById("rule-letter-spacing"))==null?void 0:h.checked)||!1,checkWordSpacing:((x=document.getElementById("rule-word-spacing"))==null?void 0:x.checked)||!1}};parent.postMessage({pluginMessage:{type:"save-input-values",values:e}},"*")}function rt(){parent.postMessage({pluginMessage:{type:"get-input-values"}},"*")}function Oe(e){if(!e)return;let t=document.getElementById("spacing-scale"),o=document.getElementById("spacing-threshold"),s=document.getElementById("color-scale"),n=document.getElementById("font-size-scale"),l=document.getElementById("font-size-threshold"),i=document.getElementById("line-height-scale"),a=document.getElementById("line-height-threshold"),r=document.getElementById("line-height-baseline-threshold");if(t&&e.spacingScale!==void 0&&(t.value=e.spacingScale),o&&e.spacingThreshold!==void 0&&(o.value=e.spacingThreshold),e.colorNameMap&&typeof e.colorNameMap=="object"?D=e.colorNameMap:D={},e.ignoredIssues&&typeof e.ignoredIssues=="object"?Z=e.ignoredIssues:Z={},s&&e.colorScale!==void 0&&(s.value=e.colorScale,typeof Se=="function"&&Se()),n&&e.fontSizeScale!==void 0&&(n.value=e.fontSizeScale),l&&e.fontSizeThreshold!==void 0&&(l.value=e.fontSizeThreshold),i&&e.lineHeightScale!==void 0&&(i.value=e.lineHeightScale),a&&e.lineHeightThreshold!==void 0&&(a.value=e.lineHeightThreshold),r&&e.lineHeightBaselineThreshold!==void 0&&(r.value=e.lineHeightBaselineThreshold),e.typographyStyles&&Array.isArray(e.typographyStyles)&&(B=e.typographyStyles,ve=Math.max(...B.map(p=>p.id||0),0)+1,Me()),e.typographyRules){let p=e.typographyRules;document.getElementById("rule-typo-style")&&(document.getElementById("rule-typo-style").checked=p.checkStyle!==!1),document.getElementById("rule-font-family")&&(document.getElementById("rule-font-family").checked=p.checkFontFamily!==!1),document.getElementById("rule-font-size")&&(document.getElementById("rule-font-size").checked=p.checkFontSize!==!1),document.getElementById("rule-font-weight")&&(document.getElementById("rule-font-weight").checked=p.checkFontWeight!==!1),document.getElementById("rule-line-height")&&(document.getElementById("rule-line-height").checked=p.checkLineHeight!==!1),document.getElementById("rule-letter-spacing")&&(document.getElementById("rule-letter-spacing").checked=p.checkLetterSpacing===!0),document.getElementById("rule-word-spacing")&&(document.getElementById("rule-word-spacing").checked=p.checkWordSpacing===!0),Me()}}function Po(e){if(!e){console.log("No last report to apply");return}if(e.scanMode){let t=document.querySelector(`input[name="scope"][value="${e.scanMode}"]`);t&&(t.checked=!0)}S.scanMode=e.scanMode||S.scanMode,S.context=e.context||S.context,e.issues&&Array.isArray(e.issues)&&(console.log("Applying saved issues report"),Ae(e.issues,!0,{skipSave:!0,restoreTimestamp:e.issuesTimestamp})),e.tokens&&(console.log("Applying saved tokens report"),ut(e.tokens,!0,{skipSave:!0,restoreTimestamp:e.tokensTimestamp})),e.lastActiveTab?Ie(e.lastActiveTab):e.issues?Ie("issues"):e.tokens&&Ie("tokens")}let xe="all",de="",Ee="all",ot=!1;console.log("All elements found, setting up event listeners"),O.forEach(e=>{e.addEventListener("click",()=>{let t=e.dataset.tab;O.forEach(o=>o.classList.remove("active")),e.classList.add("active"),F.forEach(o=>o.classList.remove("active")),document.getElementById(`results-${t}`).classList.add("active"),J=t,(S.issues||S.tokens)&&je({issues:S.issues,issuesTimestamp:S.timestamp,tokens:S.tokens,tokensTimestamp:S.tokensTimestamp,lastActiveTab:t,scanMode:S.scanMode||null,context:S.context||null})})});function ct(e=null){let t=e?document.getElementById(`results-${e}`):oe;t&&(t.innerHTML="")}function Ie(e){O.forEach(t=>{t.dataset.tab===e?t.classList.add("active"):t.classList.remove("active")}),F.forEach(t=>{t.id===`results-${e}`?t.classList.add("active"):t.classList.remove("active")}),J=e}function Ro(e){return e==="error"?"\u274C":e==="warn"?"\u26A0\uFE0F":"\u2139\uFE0F"}function At(e){return{naming:"\u{1F3F7}\uFE0F",autolayout:"\u{1F4D0}",spacing:"\u{1F4CF}",color:"\u{1F3A8}",typography:"\u270D\uFE0F","typography-style":"\u{1F3A8}","typography-check":"\u{1F4DD}","typography-pass":"\u2705","typography-info":"\u2705","line-height":"\u{1F4DD}",position:"\u{1F4CD}",duplicate:"\u{1F504}",group:"\u{1F4E6}",component:"\u{1F9E9}","empty-frame":"\u{1F4ED}","nested-group":"\u{1F4DA}",contrast:"\u{1F308}","text-size-mobile":"\u{1F4F1}"}[e]||"\u{1F50D}"}function dt(e){return{naming:"Naming Layer",autolayout:"Auto Layout",spacing:"Spacing",color:"Color",typography:"Font Size","typography-style":"Text Style (variable)","typography-check":"Typography Style Match","typography-pass":"Typography \u2713 Matched","line-height":"Line Height",position:"Position Layer",duplicate:"Duplicate Layer",group:"Group Layer",component:"Component Reusable","empty-frame":"Empty Frame Layer","nested-group":"Nested Group Layer",contrast:"Contrast (ADA AA)","text-size-mobile":"Text Size (ADA)"}[e]||e.replace(/-/g," ")}function Wo(e){let t=document.createElement("div");t.className=`issue ${e.severity}`;let o="";e.type==="typography-check"&&e.nodeProps&&(o='<div class="typography-details" style="margin-top: 8px; padding: 8px; background: rgba(0,0,0,0.05); border-radius: 4px; font-size: 11px;">',o+='<div class="current-properties"><div style="margin-bottom: 6px;"><strong>Current Properties:</strong></div>',o+='<div style="padding-left: 0; line-height: 1.6;">',e.nodeProps.fontFamily&&(o+=`\u2022 Font Family: <code>${d(e.nodeProps.fontFamily)}</code><br>`),e.nodeProps.fontSize!==null&&e.nodeProps.fontSize!==void 0&&(o+=`\u2022 Font Size: <code>${e.nodeProps.fontSize}px</code><br>`),e.nodeProps.fontWeight&&(o+=`\u2022 Font Weight: <code>${d(e.nodeProps.fontWeight)}</code><br>`),e.nodeProps.lineHeight&&(o+=`\u2022 Line Height: <code>${d(e.nodeProps.lineHeight)}</code><br>`),e.nodeProps.letterSpacing!==null&&e.nodeProps.letterSpacing!==void 0&&(o+=`\u2022 Letter Spacing: <code>${d(e.nodeProps.letterSpacing)}</code><br>`),o+="</div></div>",e.bestMatch&&e.severity==="error"?(o+=`<div class="closest-match"><div style="margin-bottom: 6px;"><strong>Closest Match: "${d(e.bestMatch.name)}" (${e.bestMatch.percentage}%)</strong></div>`,o+='<div style="padding-left: 0; line-height: 1.6;">',e.bestMatch.differences.forEach(i=>{let a=i.matches?"\u2713":"\u2717",r=i.matches?"green":"red";o+=`<span style="color: ${r}">${a} ${i.property}: <code>${d(i.current)}</code> \u2192 <code>${d(i.expected)}</code></span><br>`}),o+="</div></div>"):e.severity==="info"&&e.styleName&&(o+=`<div style="margin-top: 8px; color: green;"><strong>\u2713 All properties match style "${d(e.styleName)}"</strong></div>`),o+="</div>"),t.setAttribute("data-issue-id",e.id),t.innerHTML=`
      <div class="issue-header">
              <div>
                <span class="issue-type">${At(e.type)} ${dt(e.type)}</span>
      <div class="issue-body">${d(e.message)}</div>
                ${e.nodeName?`<div class="issue-node">Node: ${d(e.nodeName)}</div>`:""}
                ${o}
              </div>
              <div class="issue-actions">
                <button class="btn-select" data-id="${e.id}">Select</button>
                ${e.bestMatch&&e.type==="typography-check"?`
                  <button class="btn-suggest-fix" data-id="${e.id}" data-style-name="${d(e.bestMatch.name)}">Suggest Fix now</button>
                  <button class="btn-style-dropdown" data-id="${e.id}" data-issue-id="${e.id}">Select Style</button>
                `:""}
              </div>
      </div>
    `;let s=t.querySelector("button.btn-select");s&&(s.onclick=()=>{parent.postMessage({pluginMessage:{type:"select-node",id:e.id}},"*")});let n=t.querySelector("button.btn-suggest-fix");n&&e.type==="typography-check"&&e.bestMatch&&(function(i){n.onclick=a=>{a.preventDefault(),a.stopPropagation(),kt(i,i.bestMatch.name)}})(e);let l=t.querySelector("button.btn-style-dropdown");return l&&e.type==="typography-check"&&(function(i){l.onclick=a=>{a.preventDefault(),a.stopPropagation(),parent.postMessage({pluginMessage:{type:"get-figma-text-styles",issueId:i.id}},"*"),window.pendingTypographyCheckIssue=i}})(e),t}function Do(e){let t=Ze(e);if(!t){alert("No suitable color match found");return}let s=(e.message||"").match(/Color (#[0-9A-Fa-f]{6})/),n=s?s[1].toUpperCase():null;Nt(e,n,t,D)}function Uo(e){let t=Qe(e);if(!t){alert("No suitable spacing match found");return}let o=e.message||"",s=o.match(/Padding\s+(\w+)\s+\((\d+)px\)/);if(!s){console.error("Cannot parse spacing issue message:",o),alert("Cannot determine spacing property from issue message. Message: "+o);return}let n=s[1],l=parseInt(s[2]);Ft(e,n,l,t)}function Ve(e){return!e||e.type!=="autolayout"?null:{action:"enable-autolayout"}}function Lt(e){if(!Ve(e)){alert("Cannot suggest fix for this autolayout issue");return}jo(e)}function jo(e){let t=document.createElement("div");t.className="modal-overlay",t.id="autolayout-fix-confirm-modal-overlay";let o=document.createElement("div");o.className="modal-dialog",o.style.maxWidth="450px",o.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Confirm Auto Layout Enable</h2>
        <p class="modal-subtitle">Node: ${d(e.nodeName||"Unnamed")}</p>
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
    `,t.appendChild(o),document.body.appendChild(t);let s=o.querySelector("#autolayout-fix-confirm-cancel-btn"),n=o.querySelector("#autolayout-fix-confirm-apply-btn"),l=o.querySelector(".modal-close"),i=()=>{t.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{t.parentNode&&t.remove()},200)};s.onclick=i,l.onclick=i,t.onclick=a=>{a.target===t&&i()},n.onclick=()=>{i(),_(e.id,"\u23F3 Enabling auto layout...",!0),parent.postMessage({pluginMessage:{type:"fix-autolayout-issue",issue:e}},"*")}}function Oo(e,t={}){let{onApply:o,onIgnore:s,onCancel:n,progress:l}=t,i=l?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${l.current}/${l.total}</div>`:"",a=document.createElement("div");a.className="modal-overlay",a.id="autolayout-fix-confirm-modal-overlay";let r=document.createElement("div");r.className="modal-dialog",r.style.maxWidth="450px",r.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Confirm Auto Layout Enable</h2>
        <p class="modal-subtitle">Node: ${d(e.nodeName||"Unnamed")}</p>
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
    `,a.appendChild(r),document.body.appendChild(a);let p=r.querySelector("#autolayout-fix-cancel-btn"),u=r.querySelector("#autolayout-fix-apply-btn"),f=r.querySelector("#autolayout-fix-ignore-btn"),m=r.querySelector(".modal-close"),g=()=>{a.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{a.parentNode&&a.remove()},200)};p.onclick=()=>{g(),n&&n()},m.onclick=()=>{g(),n&&n()},a.onclick=h=>{h.target===a&&(g(),n&&n())},f.onclick=()=>{g(),s&&s()},u.onclick=()=>{g(),_(e.id,"\u23F3 Enabling auto layout...",!0),parent.postMessage({pluginMessage:{type:"fix-autolayout-issue",issue:e}},"*"),o&&o()}}function Vo(e){return{action:"convert-group"}}function Ht(e){if(!Vo(e)){alert("Cannot suggest fix for this group issue");return}Go(e)}function Go(e){let t=document.createElement("div");t.className="modal-overlay",t.id="group-fix-modal-overlay";let o=document.createElement("div");o.className="modal-dialog",o.style.maxWidth="450px",o.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Convert Group to Frame</h2>
        <p class="modal-subtitle">Node: ${d(e.nodeName||"Unnamed")}</p>
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
    `,t.appendChild(o),document.body.appendChild(t);let s=o.querySelector("#group-fix-cancel-btn"),n=o.querySelector(".modal-close"),l=o.querySelector("#group-fix-apply-btn"),i=()=>{t.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{t.parentNode&&t.remove()},200)};s.onclick=i,n.onclick=i,t.onclick=a=>{a.target===t&&i()},l.onclick=()=>{l.disabled=!0,l.textContent="Applying...",parent.postMessage({pluginMessage:{type:"fix-group-issue",issue:e}},"*"),i()}}function Yo(e,t={}){let{onApply:o,onIgnore:s,onCancel:n,progress:l}=t,i=l?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${l.current}/${l.total}</div>`:"",a=document.createElement("div");a.className="modal-overlay",a.id="group-fix-modal-overlay";let r=document.createElement("div");r.className="modal-dialog",r.style.maxWidth="450px",r.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Convert Group to Frame</h2>
        <p class="modal-subtitle">Node: ${d(e.nodeName||"Unnamed")}</p>
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
    `,a.appendChild(r),document.body.appendChild(a);let p=r.querySelector("#group-fix-cancel-btn"),u=r.querySelector("#group-fix-apply-btn"),f=r.querySelector("#group-fix-ignore-btn"),m=r.querySelector(".modal-close"),g=()=>{a.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{a.parentNode&&a.remove()},200)};p.onclick=()=>{g(),n&&n()},m.onclick=()=>{g(),n&&n()},a.onclick=h=>{h.target===a&&(g(),n&&n())},f.onclick=()=>{g(),s&&s()},u.onclick=()=>{u.disabled=!0,u.textContent="Applying...",parent.postMessage({pluginMessage:{type:"fix-group-issue",issue:e}},"*"),g(),o&&o()}}function qe(e){return!e||e.type!=="position"?null:{action:"fix-position"}}function Ge(e){return!e||e.type!=="duplicate"&&e.type!=="component"?null:{action:"suggest-component"}}function Ye(e){return!e||e.type!=="empty-frame"?null:{action:"fix-empty-frame"}}function qt(e){if(!qe(e)){alert("Cannot suggest fix for this position issue");return}Xo(e)}function Pt(e){if(!Ye(e)){alert("Cannot suggest fix for this empty frame issue");return}Ko(e)}function Xo(e){let t=e.message||"",o=t.match(/x:(-?\d+)/),s=t.match(/y:(-?\d+)/),n=o?parseInt(o[1],10):0,l=s?parseInt(s[1],10):0,i=document.createElement("div");i.className="modal-overlay",i.id="position-fix-confirm-modal-overlay";let a=document.createElement("div");a.className="modal-dialog",a.style.maxWidth="400px",a.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Fix Position Issue</h2>
        <p class="modal-subtitle">Node: ${d(e.nodeName||"Unnamed")}</p>
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
              \u2022 Y: <code>${l}px</code>
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
    `,i.appendChild(a),document.body.appendChild(i);let r=a.querySelector("#position-fix-confirm-cancel-btn"),p=a.querySelector("#position-fix-confirm-apply-btn"),u=a.querySelector(".modal-close"),f=()=>{i.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{i.parentNode&&i.remove()},200)};r.onclick=f,u.onclick=f,i.onclick=m=>{m.target===i&&f()},p.onclick=()=>{f(),_(e.id,"\u23F3 Fixing position...",!0),parent.postMessage({pluginMessage:{type:"fix-position-issue",issue:e}},"*")}}function _o(e,t={}){let{onApply:o,onIgnore:s,onCancel:n,progress:l}=t,i=l?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${l.current}/${l.total}</div>`:"",a=e.message||"",r=a.match(/x:(-?\d+)/),p=a.match(/y:(-?\d+)/),u=r?parseInt(r[1],10):0,f=p?parseInt(p[1],10):0,m=document.createElement("div");m.className="modal-overlay",m.id="position-fix-confirm-modal-overlay";let g=document.createElement("div");g.className="modal-dialog",g.style.maxWidth="400px",g.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Fix Position Issue</h2>
        <p class="modal-subtitle">Node: ${d(e.nodeName||"Unnamed")}</p>
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
              \u2022 X: <code>${u}px</code><br>
              \u2022 Y: <code>${f}px</code>
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
    `,m.appendChild(g),document.body.appendChild(m);let h=g.querySelector("#position-fix-cancel-btn"),x=g.querySelector("#position-fix-apply-btn"),$=g.querySelector("#position-fix-ignore-btn"),T=g.querySelector(".modal-close"),I=()=>{m.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{m.parentNode&&m.remove()},200)};h.onclick=()=>{I(),n&&n()},T.onclick=()=>{I(),n&&n()},m.onclick=P=>{P.target===m&&(I(),n&&n())},$.onclick=()=>{I(),s&&s()},x.onclick=()=>{I(),_(e.id,"\u23F3 Fixing position...",!0),parent.postMessage({pluginMessage:{type:"fix-position-issue",issue:e}},"*"),o&&o()}}function Rt(e){Jo(e)}function Jo(e){let t=document.createElement("div");t.className="modal-overlay",t.id="remove-layer-confirm-modal-overlay";let o=document.createElement("div");o.className="modal-dialog",o.style.maxWidth="400px",o.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Remove Layer</h2>
        <p class="modal-subtitle">Node: ${d(e.nodeName||"Unnamed")}</p>
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
    `,t.appendChild(o),document.body.appendChild(t);let s=o.querySelector("#remove-layer-confirm-cancel-btn"),n=o.querySelector("#remove-layer-confirm-apply-btn"),l=o.querySelector(".modal-close"),i=()=>{t.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{t.parentNode&&t.remove()},200)};s.onclick=i,l.onclick=i,t.onclick=a=>{a.target===t&&i()},n.onclick=()=>{i(),_(e.id,"\u23F3 Removing layer...",!0),parent.postMessage({pluginMessage:{type:"remove-position-layer",issue:e}},"*")}}function Ko(e){let t=e.message||"",o=t.includes("Empty frame"),s=t.includes("redundant"),n=s?"Remove Redundant Frame":"Remove Empty Frame",l=s?"This will remove the redundant frame and keep its single child. The child will inherit the frame's name if it was unnamed.":"This will remove the empty frame. If it has a child, the child will be kept.",i=document.createElement("div");i.className="modal-overlay",i.id="empty-frame-fix-modal-overlay";let a=document.createElement("div");a.className="modal-dialog",a.style.maxWidth="450px",a.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">${n}</h2>
        <p class="modal-subtitle">Node: ${d(e.nodeName||"Unnamed")}</p>
      </div>
      <div class="modal-body">
        <p style="margin: 0 0 16px 0; color: #333; line-height: 1.5;">
          ${l}
        </p>
        <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current:</div>
          <div style="font-size: 13px; color: #333; font-weight: 500;">${d(e.message)}</div>
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
    `,document.body.appendChild(i),i.appendChild(a);let r=a.querySelector("#empty-frame-fix-cancel-btn"),p=a.querySelector(".modal-close"),u=a.querySelector("#empty-frame-fix-apply-btn"),f=()=>{i.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{i.parentNode&&i.remove()},200)};r.onclick=f,p.onclick=f,i.onclick=m=>{m.target===i&&f()},u.onclick=()=>{u.disabled=!0,u.textContent="Applying...",parent.postMessage({pluginMessage:{type:"fix-empty-frame-issue",issue:e}},"*"),f()}}function Zo(e,t={}){let{onApply:o,onIgnore:s,onCancel:n,progress:l}=t,i=l?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${l.current}/${l.total}</div>`:"",a=e.message||"",r=a.includes("Empty frame"),p=a.includes("redundant"),u=p?"Remove Redundant Frame":"Remove Empty Frame",f=p?"This will remove the redundant frame and keep its single child. The child will inherit the frame's name if it was unnamed.":"This will remove the empty frame. If it has a child, the child will be kept.",m=document.createElement("div");m.className="modal-overlay",m.id="empty-frame-fix-modal-overlay";let g=document.createElement("div");g.className="modal-dialog",g.style.maxWidth="450px",g.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">${u}</h2>
        <p class="modal-subtitle">Node: ${d(e.nodeName||"Unnamed")}</p>
      </div>
      ${i}
      <div class="modal-body">
        <p style="margin: 0 0 16px 0; color: #333; line-height: 1.5;">
          ${f}
        </p>
        <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current:</div>
          <div style="font-size: 13px; color: #333; font-weight: 500;">${d(e.message)}</div>
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
    `,document.body.appendChild(m),m.appendChild(g);let h=g.querySelector("#empty-frame-fix-cancel-btn"),x=g.querySelector("#empty-frame-fix-apply-btn"),$=g.querySelector("#empty-frame-fix-ignore-btn"),T=g.querySelector(".modal-close"),I=()=>{m.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{m.parentNode&&m.remove()},200)};h.onclick=()=>{I(),n&&n()},T.onclick=()=>{I(),n&&n()},m.onclick=P=>{P.target===m&&(I(),n&&n())},$.onclick=()=>{I(),s&&s()},x.onclick=()=>{x.disabled=!0,x.textContent="Applying...",parent.postMessage({pluginMessage:{type:"fix-empty-frame-issue",issue:e}},"*"),I(),o&&o()}}function Wt(e){if(console.log("handleSuggestFixComponent called",e),!e||!e.id){console.error("Invalid issue in handleSuggestFixComponent",e),alert("Error: Invalid issue data");return}window.pendingComponentIssue=e,console.log("Stored pendingComponentIssue:",window.pendingComponentIssue);let t=document.querySelector(`.issue[data-issue-id="${e.id}"]`);if(t){let o=t.querySelector("button.btn-suggest-fix");if(o){let s=o.textContent;o.disabled=!0,o.textContent="Loading...",o.style.opacity="0.6",o.style.cursor="wait",o.dataset.originalText=s}}console.log("Sending get-components-for-issue message",{issueId:e.id,issue:e}),parent.postMessage({pluginMessage:{type:"get-components-for-issue",issue:e}},"*")}function Dt(e){if(console.log("handleSelectComponent called",e),!e||!e.id){console.error("Invalid issue in handleSelectComponent",e),alert("Error: Invalid issue data");return}window.pendingSelectComponentIssue=e,console.log("Stored pendingSelectComponentIssue:",window.pendingSelectComponentIssue);let t=document.querySelector(`.issue[data-issue-id="${e.id}"]`);if(t){let o=t.querySelector("button.btn-select-component");if(o){let s=o.textContent;o.disabled=!0,o.textContent="Loading...",o.style.opacity="0.6",o.dataset.originalText=s}}console.log("Sending get-all-components message",{issueId:e.id,issue:e}),parent.postMessage({pluginMessage:{type:"get-all-components",issue:e}},"*")}function Ut(e){en(e)}function jt(e){Qo(e)}function Qo(e){let t=document.createElement("div");t.className="modal-overlay",t.id="rename-modal-overlay";let o=document.createElement("div");o.className="modal-dialog",o.style.maxWidth="400px";let s=e.nodeName||"",n=s.replace(/^(Frame|Group)\s*/i,"").trim()||"";o.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Rename Node</h2>
        <p class="modal-subtitle">Current: ${d(s)}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 8px; font-size: 13px; font-weight: 600; color: #333;">New Name:</label>
          <input type="text" id="rename-input" placeholder="Enter meaningful name" style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px;" value="${d(n)}" autocomplete="off">
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 12px;">
          Enter a meaningful name that describes the purpose of this layer (e.g., "Header", "Button", "Card").
        </p>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="rename-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="rename-apply-btn">Rename</button>
      </div>
    `,t.appendChild(o),document.body.appendChild(t);let l=o.querySelector("#rename-cancel-btn"),i=o.querySelector("#rename-apply-btn"),a=o.querySelector(".modal-close"),r=o.querySelector("#rename-input");setTimeout(()=>{r.focus(),r.select()},100);let p=()=>{t.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{t.parentNode&&t.remove()},200)};l.onclick=p,a.onclick=p,t.onclick=u=>{u.target===t&&p()},r.addEventListener("keydown",u=>{u.key==="Enter"&&(u.preventDefault(),i.click())}),i.onclick=()=>{let u=r.value.trim();if(!u){alert("Please enter a name"),r.focus();return}if(/^(Frame|Group)\s*$/i.test(u)&&!confirm("The name still contains default naming (Frame/Group). Do you want to continue?")){r.focus();return}p(),_(e.id,"\u23F3 Renaming...",!0),parent.postMessage({pluginMessage:{type:"rename-node",issue:e,newName:u}},"*")}}function en(e){let t=document.createElement("div");t.className="modal-overlay",t.id="create-component-modal-overlay";let o=document.createElement("div");o.className="modal-dialog",o.style.maxWidth="400px",o.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Create New Component</h2>
        <p class="modal-subtitle">Node: ${d(e.nodeName||"Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 8px; font-size: 13px; font-weight: 600; color: #333;">Component Name:</label>
          <input type="text" id="create-component-name-input" placeholder="Enter component name" style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px;" value="${d(e.nodeName||"")}">
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 12px;">
          This will convert the frame to a component and replace all duplicate frames with instances of this component.
        </p>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="create-component-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="create-component-apply-btn">Create</button>
      </div>
    `,t.appendChild(o),document.body.appendChild(t);let s=o.querySelector("#create-component-cancel-btn"),n=o.querySelector("#create-component-apply-btn"),l=o.querySelector(".modal-close"),i=o.querySelector("#create-component-name-input");setTimeout(()=>i.focus(),100);let a=()=>{t.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{t.parentNode&&t.remove()},200)};s.onclick=a,l.onclick=a,t.onclick=r=>{r.target===t&&a()},n.onclick=()=>{let r=i.value.trim();if(!r){alert("Please enter a component name");return}a(),_(e.id,"\u23F3 Creating component...",!0),parent.postMessage({pluginMessage:{type:"create-component-from-issue",issue:e,componentName:r}},"*")}}function tn(e,t){if(console.log("[showComponentSuggestModal] Called with",{issue:e,similarComponents:t}),!t||t.length===0){console.warn("[showComponentSuggestModal] No similar components provided"),alert("No similar components found.");return}let o=t[0];console.log("[showComponentSuggestModal] Using best match:",o),Ot(e,o,"This is the most similar component found.")}function on(e,t){if(console.log("[showComponentSelectModal] Called with",{issue:e,components:t}),!t||t.length===0){console.warn("[showComponentSelectModal] No components provided"),alert("No components available.");return}let o=document.createElement("div");o.className="modal-overlay",o.id="component-select-modal-overlay";let s=document.createElement("div");s.className="modal-dialog",s.style.maxWidth="500px";let n=t.map(h=>`
        <div class="component-picker-item" data-component-id="${h.id}" data-component-name="${d(h.name.toLowerCase())}" style="
          padding: 12px;
          margin-bottom: 8px;
          border: 2px solid #ddd;
          border-radius: 8px;
          cursor: pointer;
          background: white;
          transition: all 0.2s;
        " onmouseover="this.style.borderColor='#0071e3'; this.style.boxShadow='0 2px 8px rgba(0,113,227,0.2)'" onmouseout="this.style.borderColor='#ddd'; this.style.boxShadow='none'">
          <div style="font-weight: 600; font-size: 14px; color: #333;">${d(h.name)}</div>
          <div style="font-size: 11px; color: #666; margin-top: 4px;">
            ${h.description||"Component"}
          </div>
        </div>
      `).join(""),l=t.length>5,i=l?`
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
    `:"";s.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Select Component</h2>
        <p class="modal-subtitle">Node: ${d(e.nodeName||"Unnamed")}</p>
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
    `,o.appendChild(s),document.body.appendChild(o),console.log("[showComponentSelectModal] Modal added to DOM"),console.log("[showComponentSelectModal] Overlay element:",o),console.log("[showComponentSelectModal] Dialog element:",s),o.style.display="flex",o.style.opacity="1",o.style.zIndex="10000";let a=s.querySelector("#component-select-cancel-btn"),r=s.querySelector(".modal-close"),p=s.querySelectorAll(".component-picker-item"),u=s.querySelector("#component-search-input"),f=s.querySelector("#component-list-container"),m=s.querySelector("#component-search-results-count");console.log("[showComponentSelectModal] Found",p.length,"component items"),console.log("[showComponentSelectModal] Cancel button:",a,"Close button:",r),u&&l&&(u.addEventListener("input",h=>{let x=h.target.value.toLowerCase().trim(),$=0;p.forEach(T=>{let I=T.getAttribute("data-component-name")||"";x===""||I.includes(x)?(T.style.display="block",$++):T.style.display="none"}),m&&(x!==""?(m.textContent=`Showing ${$} of ${t.length} components`,m.style.display="block"):m.style.display="none")}),setTimeout(()=>u.focus(),100));let g=()=>{console.log("[showComponentSelectModal] Closing modal"),o.style.animation="fadeIn 0.2s ease-out reverse",o.style.opacity="0",setTimeout(()=>{o.parentNode&&(o.remove(),console.log("[showComponentSelectModal] Modal removed from DOM"))},200)};a?a.onclick=h=>{h.preventDefault(),h.stopPropagation(),g()}:console.error("[showComponentSelectModal] Cancel button not found!"),r?r.onclick=h=>{h.preventDefault(),h.stopPropagation(),g()}:console.error("[showComponentSelectModal] Close button not found!"),o.onclick=h=>{h.target===o&&g()},p.forEach((h,x)=>{h.onclick=$=>{$.preventDefault(),$.stopPropagation(),console.log("[showComponentSelectModal] Component item clicked",x);let T=h.getAttribute("data-component-id");console.log("[showComponentSelectModal] Component ID:",T);let I=t.find(P=>P.id===T);console.log("[showComponentSelectModal] Found component:",I),I?(g(),Ot(e,I,null)):console.error("[showComponentSelectModal] Component not found for ID:",T)}}),setTimeout(()=>{o.style.animation="fadeIn 0.2s ease-out",o.style.opacity="1",console.log("[showComponentSelectModal] Animation triggered, overlay visible:",o.offsetParent!==null)},10),console.log("[showComponentSelectModal] Modal setup complete")}function Ot(e,t,o){let s=document.createElement("div");s.className="modal-overlay",s.id="component-apply-confirm-modal-overlay";let n=document.createElement("div");n.className="modal-dialog",n.style.maxWidth="400px",n.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Apply Component</h2>
        <p class="modal-subtitle">Node: ${d(e.nodeName||"Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <p style="margin-bottom: 12px; color: #666; font-size: 13px;">
            This will replace the frame with an instance of the selected component.
          </p>
          <div style="padding: 12px; background: #e3f2fd; border-radius: 6px;">
            <div style="font-size: 12px; color: #1976d2; margin-bottom: 8px;"><strong>Selected Component:</strong></div>
            <div style="font-size: 14px; color: #333; font-weight: 600;">${d(t.name)}</div>
            ${t.description?`<div style="font-size: 11px; color: #666; margin-top: 4px;">${d(t.description)}</div>`:""}
          </div>
          ${o?`<p style="color: #666; font-size: 12px; margin-top: 12px;">${d(o)}</p>`:""}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="component-apply-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="component-apply-apply-btn">Apply</button>
      </div>
    `,s.appendChild(n),document.body.appendChild(s);let l=n.querySelector("#component-apply-cancel-btn"),i=n.querySelector("#component-apply-apply-btn"),a=n.querySelector(".modal-close"),r=()=>{s.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{s.parentNode&&s.remove()},200)};l.onclick=r,a.onclick=r,s.onclick=p=>{p.target===s&&r()},i.onclick=()=>{r(),_(e.id,"\u23F3 Applying component...",!0),parent.postMessage({pluginMessage:{type:"apply-component-to-issue",issue:e,componentId:t.id}},"*")}}function Pe(e){if(!e||!e.fontSize)return null;let t=e.fontSize,o=14,s=document.getElementById("font-size-scale");if(s&&s.value.trim()){let n=s.value.split(",").map(l=>parseInt(l.trim(),10)).filter(l=>!isNaN(l)&&l>=o).sort((l,i)=>l-i);if(n.length>0){let l=null,i=1/0;n.forEach(r=>{if(r>=o){let p=Math.abs(r-t);p<i&&(i=p,l=r)}});let a=Math.max(t*.5,10);if(l&&i<=a)return l}}return t<o?o:null}function Xe(e){if(!e||!e.textColor||!e.backgroundColor)return null;let t=e.textColor.toUpperCase(),o=e.backgroundColor.toUpperCase(),s=e.minContrast||4.5,n=document.getElementById("color-scale");if(!n||!n.value.trim())return null;let l=n.value.split(",").map(p=>p.trim().toUpperCase()).filter(p=>p&&p.startsWith("#"));if(l.length===0)return null;let i=null,a=0,r=1/0;return l.forEach(p=>{let u=vt(p,o);if(u>=s){let f=bt(t,p);(u>a||u===a&&f<r)&&(a=u,i=p,r=f)}}),i}function Vt(e,t){if(!t||t.length===0){alert("No text styles found in Figma. Please create text styles first.");return}let o=document.createElement("div");o.className="modal-overlay",o.id="text-style-picker-typography-modal-overlay";let s=document.createElement("div");s.className="modal-dialog",s.style.maxWidth="500px";let n=e.nodeProps||{},l=n.fontFamily||"Unknown",i=n.fontSize!==null&&n.fontSize!==void 0?`${n.fontSize}px`:"Unknown",a=n.fontWeight||"Unknown",r=n.lineHeight||"Unknown",p=n.letterSpacing!==null&&n.letterSpacing!==void 0?n.letterSpacing:"Unknown",u=null;e.bestMatch&&(u=e.bestMatch.name);let f=t.map($=>{let T=u===$.name;return`
        <div class="style-picker-item" data-style-id="${$.id}" data-font-size="${$.fontSize}" style="
          padding: 12px;
          margin-bottom: 8px;
          border: 2px solid ${T?"#0071e3":"#ddd"};
          border-radius: 8px;
          cursor: pointer;
          background: white;
          transition: all 0.2s;
        " onmouseover="this.style.borderColor='#0071e3'; this.style.boxShadow='0 2px 8px rgba(0,113,227,0.2)'" onmouseout="this.style.borderColor='${T?"#0071e3":"#ddd"}'; this.style.boxShadow='none'">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
            <div>
              <div style="font-weight: 600; font-size: 14px; color: #333;">${d($.name)} ${T?"\u2B50":""}</div>
              <div style="font-size: 11px; color: #666; margin-top: 4px;">
                ${d($.fontFamily)} ${$.fontSize}px ${d($.fontWeight)}
              </div>
            </div>
            ${T?'<div style="color: #0071e3; font-weight: 600; font-size: 12px;">Best Match</div>':""}
          </div>
          <div style="font-size: 11px; color: #666; padding-top: 8px; border-top: 1px solid #eee;">
            <div style="margin-bottom: 4px;"><strong>Details:</strong></div>
            <div style="padding-left: 8px; line-height: 1.6;">
              \u2022 Font Family: <code>${d($.fontFamily)}</code><br>
              \u2022 Font Size: <code>${$.fontSize}px</code><br>
              \u2022 Font Weight: <code>${d($.fontWeight)}</code><br>
              \u2022 Line Height: <code>${d($.lineHeight)}</code><br>
              \u2022 Letter Spacing: <code>${d($.letterSpacing||"0")}</code>
            </div>
          </div>
        </div>
      `}).join("");s.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Choose Text Style</h2>
        <p class="modal-subtitle">Node: ${d(e.nodeName||"Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;"><strong>Current Properties:</strong></div>
          <div style="font-size: 11px; color: #666; padding-left: 8px; line-height: 1.6;">
            \u2022 Font Family: <code>${d(l)}</code><br>
            \u2022 Font Size: <code>${d(i)}</code><br>
            \u2022 Font Weight: <code>${d(a)}</code><br>
            \u2022 Line Height: <code>${d(r)}</code><br>
            \u2022 Letter Spacing: <code>${d(p)}</code>
          </div>
        </div>
        <div style="max-height: 400px; overflow-y: auto;">
          ${f}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="text-style-picker-typography-modal-cancel-btn">Cancel</button>
      </div>
    `,o.appendChild(s),document.body.appendChild(o);let m=s.querySelector("#text-style-picker-typography-modal-cancel-btn"),g=s.querySelector(".modal-close"),h=s.querySelectorAll(".style-picker-item"),x=()=>{o.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{o.parentNode&&o.remove()},200)};m.onclick=x,g.onclick=x,o.onclick=$=>{$.target===o&&x()},h.forEach($=>{$.onclick=T=>{T.preventDefault(),T.stopPropagation();let I=$.getAttribute("data-style-id"),P=t.find(R=>R.id===I);P&&(o.style.display="none",nn(e,P,o))}})}function nn(e,t,o){let s=document.createElement("div");s.className="modal-overlay",s.id="typography-style-confirm-modal-overlay";let n=document.createElement("div");n.className="modal-dialog",n.style.maxWidth="500px";let l=e.nodeProps||{},i=l.fontFamily||"Unknown",a=l.fontSize!==null&&l.fontSize!==void 0?`${l.fontSize}px`:"Unknown",r=l.fontWeight||"Unknown",p=l.lineHeight||"Unknown",u=l.letterSpacing!==null&&l.letterSpacing!==void 0?l.letterSpacing:"Unknown";n.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Confirm Text Style Application</h2>
        <p class="modal-subtitle">Node: ${d(e.nodeName||"Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">Apply Text Style:</div>
          <div style="padding: 12px; background: #e3f2fd; border-left: 3px solid #0071e3; border-radius: 6px;">
            <div style="font-weight: 600; font-size: 16px; color: #333; margin-bottom: 8px;">${d(t.name)}</div>
            <div style="font-size: 12px; color: #666; line-height: 1.6;">
              \u2022 Font Family: <code>${d(t.fontFamily)}</code><br>
              \u2022 Font Size: <code>${t.fontSize}px</code><br>
              \u2022 Font Weight: <code>${d(t.fontWeight)}</code><br>
              \u2022 Line Height: <code>${d(t.lineHeight)}</code><br>
              \u2022 Letter Spacing: <code>${d(t.letterSpacing||"0")}</code>
            </div>
          </div>
        </div>
        <div style="padding: 12px; background: #f5f5f5; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;"><strong>Current Properties:</strong></div>
          <div style="font-size: 11px; color: #666; padding-left: 8px; line-height: 1.6;">
            \u2022 Font Family: <code>${d(i)}</code><br>
            \u2022 Font Size: <code>${d(a)}</code><br>
            \u2022 Font Weight: <code>${d(r)}</code><br>
            \u2022 Line Height: <code>${d(p)}</code><br>
            \u2022 Letter Spacing: <code>${d(u)}</code>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="typography-style-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="typography-style-confirm-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `,s.appendChild(n),document.body.appendChild(s);let f=n.querySelector("#typography-style-confirm-cancel-btn"),m=n.querySelector("#typography-style-confirm-apply-btn"),g=n.querySelector(".modal-close"),h=()=>{s.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{s.parentNode&&s.remove(),o&&o.parentNode&&(o.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{o.parentNode&&o.remove()},200))},200)},x=()=>{s.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{s.parentNode&&s.remove(),o&&(o.style.display="flex")},200)};f.onclick=x,g.onclick=x,s.onclick=$=>{$.target===s&&x()},m.onclick=()=>{h(),_(e.id,"\u23F3 Applying style...",!0),Qt(e,t)}}function ln(e,t){let o=t.filter(u=>u.fontSize>=14);if(o.length===0){let u=Pe(e);u?pt(e,e.fontSize||12,u,null,null):alert("No text styles found with fontSize >= 14px. Please add font sizes to Font Size input or create text styles in Figma.");return}let s=document.createElement("div");s.className="modal-overlay",s.id="text-style-picker-modal-overlay";let n=document.createElement("div");n.className="modal-dialog",n.style.maxWidth="400px";let l=o.map(u=>`
        <div class="style-picker-item" data-style-id="${u.id}" data-font-size="${u.fontSize}" style="
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
            <div style="font-weight: 600; font-size: 14px; color: #333;">${d(u.name)}</div>
            <div style="font-size: 12px; color: #666; margin-top: 4px;">
              ${d(u.fontFamily)} ${d(u.fontSize)}px ${d(u.fontWeight)}
            </div>
          </div>
          <div style="color: #28a745; font-weight: 600; font-size: 12px;">\u2713 ADA</div>
        </div>
      `).join("");n.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Choose Text Style</h2>
        <p class="modal-subtitle">Node: ${d(e.nodeName||"Unnamed")} - Select style with fontSize >= 14px</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current Font Size:</div>
          <div style="font-size: 16px; font-weight: 600; color: #333;">${e.fontSize||12}px</div>
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
          ${l}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="text-style-picker-modal-cancel-btn">Cancel</button>
      </div>
    `,s.appendChild(n),document.body.appendChild(s);let i=n.querySelector("#text-style-picker-modal-cancel-btn"),a=n.querySelector(".modal-close"),r=n.querySelectorAll(".style-picker-item"),p=()=>{s.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{s.parentNode&&s.remove()},200)};i.onclick=p,a.onclick=p,s.onclick=u=>{u.target===s&&p()},r.forEach(u=>{u.onclick=f=>{f.preventDefault(),f.stopPropagation();let m=u.getAttribute("data-style-id"),g=parseInt(u.getAttribute("data-font-size")),h=o.find(x=>x.id===m);h&&(s.style.display="none",pt(e,e.fontSize||12,g,s,h))}})}function sn(e,t){let o=document.getElementById("color-scale"),s=o&&o.value.trim()?o.value.split(",").map(x=>x.trim().toUpperCase()).filter(x=>x&&x.startsWith("#")):[],n=[];if(t.filter(x=>x.source==="variable").forEach(x=>{n.push({source:"Variable",name:x.name,hex:x.hex,id:x.id,variable:x.variable})}),t.filter(x=>x.source==="style").forEach(x=>{n.push({source:"Style",name:x.name,hex:x.hex,id:x.id,style:x.style})}),s.forEach(x=>{let $=D[x]||x;n.push({source:"Input",name:$,hex:x,id:null})}),n.length===0){alert("No colors available. Please add colors to Color input or create color styles/variables in Figma.");return}let l=e.backgroundColor||"#FFFFFF",i=e.minContrast||4.5,a=e.textColor||"#000000",r=document.createElement("div");r.className="modal-overlay",r.id="contrast-color-picker-modal-overlay";let p=document.createElement("div");p.className="modal-dialog",p.style.maxWidth="400px";let u=n.map(x=>{let $=vt(x.hex,l),T=$>=i,I=T?"#28a745":"#ddd",P=`${d(x.name)} <span style="font-size: 11px; color: #666;">(${d(x.source)})</span>`,R=`<span style="color: ${T?"#28a745":"#dc3545"};">Contrast: ${$.toFixed(2)}:1 ${T?"\u2713":"\u2717"} (need >= ${i}:1)</span>`;return zt(x.hex,P,I,R)}).join("");p.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Choose Color</h2>
        <p class="modal-subtitle">Node: ${d(e.nodeName||"Unnamed")} - Select color that passes contrast</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current Text Color:</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 32px; height: 32px; border-radius: 4px; background: ${d(a)}; border: 1px solid #ddd;"></div>
            <div style="font-family: 'SF Mono', Monaco, monospace; font-size: 13px; font-weight: 600;">${d(a)}</div>
            <div style="font-size: 11px; color: #dc3545;">Contrast: ${e.contrast?e.contrast.toFixed(2):"N/A"}:1 (fails)</div>
          </div>
          <div style="font-size: 11px; color: #666; margin-top: 4px;">Background: ${d(l)}</div>
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
          ${u}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="contrast-color-picker-modal-cancel-btn">Cancel</button>
      </div>
    `,r.appendChild(p),document.body.appendChild(r);let f=p.querySelector("#contrast-color-picker-modal-cancel-btn"),m=p.querySelector(".modal-close"),g=p.querySelectorAll(".color-picker-item"),h=()=>{r.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{r.parentNode&&r.remove()},200)};f.onclick=h,m.onclick=h,r.onclick=x=>{x.target===r&&h()},g.forEach(x=>{x.onclick=$=>{$.preventDefault(),$.stopPropagation();let T=x.getAttribute("data-color");r.style.display="none",Xt(e,a,T,r)}})}function Gt(e){parent.postMessage({pluginMessage:{type:"get-figma-text-styles",issueId:e.id}},"*"),window.pendingTextSizeIssue=e}function xt(e){parent.postMessage({pluginMessage:{type:"get-figma-text-styles",issueId:e.id}},"*"),window.pendingSuggestTextSizeIssue=e}function pt(e,t,o,s,n){let l=document.createElement("div");l.className="modal-overlay",l.id="text-size-fix-confirm-modal-overlay";let i=document.createElement("div");i.className="modal-dialog",i.style.maxWidth="400px";let a=n?`
      <div style="margin-top: 16px; padding: 12px; background: #e8f5e9; border-radius: 6px; border-left: 3px solid #28a745;">
        <div style="font-size: 12px; color: #666; margin-bottom: 4px;">\u{1F4DD} Text Style s\u1EBD \u0111\u01B0\u1EE3c \xE1p d\u1EE5ng:</div>
        <div style="font-weight: 600; font-size: 14px; color: #333;">${d(n.name)}</div>
        <div style="font-size: 11px; color: #666; margin-top: 4px;">
          ${d(n.fontFamily)} ${n.fontSize}px ${d(n.fontWeight)}
        </div>
      </div>
    `:"";i.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Confirm Text Size Change</h2>
        <p class="modal-subtitle">Node: ${d(e.nodeName||"Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">Change font size from:</div>
          <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px; margin-bottom: 12px;">
            <div style="font-weight: 600; font-size: 18px; color: #333;">${t}px</div>
            <div style="font-size: 12px; color: #999;">(Too small)</div>
          </div>
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">To:</div>
          <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #e3f2fd; border-radius: 6px;">
            <div style="font-weight: 600; font-size: 18px; color: #0071e3;">${o}px</div>
            <div style="font-size: 12px; color: #28a745;">\u2713 ADA compliant (>= 14px)</div>
          </div>
        </div>
        ${a}
      </div>
      <div class="modal-footer">
        ${window.pendingTextSizeFixAllCallbacks?'<button class="modal-btn modal-btn-cancel" id="text-size-fix-ignore-btn" style="background: #6c757d; border-color: #6c757d; color: white;">Ignore</button>':""}
        <button class="modal-btn modal-btn-cancel" id="text-size-fix-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="text-size-fix-confirm-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `,l.appendChild(i),document.body.appendChild(l);let r=i.querySelector("#text-size-fix-confirm-cancel-btn"),p=i.querySelector("#text-size-fix-confirm-apply-btn"),u=i.querySelector("#text-size-fix-ignore-btn"),f=i.querySelector(".modal-close"),m=window.pendingTextSizeFixAllCallbacks||null,g=()=>{l.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{l.parentNode&&l.remove(),s&&(s.style.display="block")},200)},h=()=>{l.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{l.parentNode&&l.remove(),s&&s.parentNode&&(s.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{s.parentNode&&s.remove()},200))},200)};r.onclick=()=>{m&&m.onCancel?(h(),window.pendingTextSizeFixAllCallbacks=null,m.onCancel()):g()},f.onclick=()=>{m&&m.onCancel?(h(),window.pendingTextSizeFixAllCallbacks=null,m.onCancel()):g()},l.onclick=x=>{x.target===l&&(m&&m.onCancel?(h(),window.pendingTextSizeFixAllCallbacks=null,m.onCancel()):g())},u&&(u.onclick=()=>{h(),m&&m.onIgnore&&(window.pendingTextSizeFixAllCallbacks=null,m.onIgnore())}),p.onclick=()=>{h(),_(e.id,"\u23F3 Fixing text size...",!0),n&&n.id?parent.postMessage({pluginMessage:{type:"apply-figma-text-style",issue:e,styleId:n.id,styleName:n.name}},"*"):parent.postMessage({pluginMessage:{type:"fix-text-size-issue",issue:e,fontSize:o}},"*"),m&&m.onApply&&(window.pendingTextSizeFixAllCallbacks=null,m.onApply())}}function Yt(e){parent.postMessage({pluginMessage:{type:"get-contrast-colors",issue:e}},"*"),window.pendingContrastIssue=e}function St(e){let t=Xe(e);if(!t){alert("No suitable color found that passes contrast requirements");return}Xt(e,e.textColor,t,null)}function Xt(e,t,o,s){let n=D[o]||o,l=e.backgroundColor||"#FFFFFF",i=e.minContrast||4.5,a=vt(o,l),r=document.createElement("div");r.className="modal-overlay",r.id="contrast-fix-confirm-modal-overlay";let p=document.createElement("div");p.className="modal-dialog",p.style.maxWidth="400px",p.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Confirm Color Change</h2>
        <p class="modal-subtitle">Node: ${d(e.nodeName||"Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">Change text color from:</div>
          <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px; margin-bottom: 12px;">
            <div style="width: 48px; height: 48px; border-radius: 6px; background: ${d(t)}; border: 2px solid #ddd;"></div>
            <div>
              <div style="font-weight: 600; font-size: 14px; color: #333;">${d(t)}</div>
              <div style="font-size: 11px; color: #dc3545;">Contrast: ${e.contrast?e.contrast.toFixed(2):"N/A"}:1 (fails)</div>
            </div>
          </div>
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">To:</div>
          <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #e3f2fd; border-radius: 6px; margin-bottom: 12px;">
            <div style="width: 48px; height: 48px; border-radius: 6px; background: ${d(o)}; border: 2px solid #0071e3;"></div>
            <div>
              <div style="font-weight: 600; font-size: 14px; color: #333;">${d(n)}</div>
              <div style="font-size: 11px; color: #666; font-family: 'SF Mono', Monaco, monospace;">${d(o)}</div>
              <div style="font-size: 11px; color: #28a745; margin-top: 4px;">Contrast: ${a.toFixed(2)}:1 \u2713 (passes >= ${i}:1)</div>
            </div>
          </div>
          <div style="padding: 8px; background: #f0f0f0; border-radius: 4px; font-size: 11px; color: #666;">
            Background: ${d(l)}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        ${window.pendingContrastFixAllCallbacks?'<button class="modal-btn modal-btn-cancel" id="contrast-fix-ignore-btn" style="background: #6c757d; border-color: #6c757d; color: white;">Ignore</button>':""}
        <button class="modal-btn modal-btn-cancel" id="contrast-fix-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="contrast-fix-confirm-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `,r.appendChild(p),document.body.appendChild(r);let u=p.querySelector("#contrast-fix-confirm-cancel-btn"),f=p.querySelector("#contrast-fix-confirm-apply-btn"),m=p.querySelector("#contrast-fix-ignore-btn"),g=p.querySelector(".modal-close"),h=window.pendingContrastFixAllCallbacks||null,x=()=>{r.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{r.parentNode&&r.remove(),s&&(s.style.display="block")},200)};u.onclick=()=>{h&&h.onCancel?(x(),window.pendingContrastFixAllCallbacks=null,h.onCancel()):x()},g.onclick=()=>{h&&h.onCancel?(x(),window.pendingContrastFixAllCallbacks=null,h.onCancel()):x()},r.onclick=$=>{$.target===r&&(h&&h.onCancel?(x(),window.pendingContrastFixAllCallbacks=null,h.onCancel()):x())},m&&(m.onclick=()=>{x(),h&&h.onIgnore&&(window.pendingContrastFixAllCallbacks=null,h.onIgnore())}),f.onclick=()=>{x(),_(e.id,"\u23F3 Fixing contrast...",!0),parent.postMessage({pluginMessage:{type:"fix-contrast-issue",issue:e,color:o}},"*"),h&&h.onApply&&(window.pendingContrastFixAllCallbacks=null,h.onApply())}}function _t(e){try{if(Z[e.id]===!0){if(delete Z[e.id],S&&S.issues){let o=S.issues.find(s=>s.id===e.id);if(o){o.ignored=!1;let s=o.originalSeverity||(o.severity==="info"?"error":o.severity);o.severity=s,o.originalSeverity=void 0,e.severity=s,e.ignored=!1}}ae(),Jt(e,!1),_e(),parent.postMessage({pluginMessage:{type:"notify",message:"\u2705 Issue un-ignored"}},"*")}else{if(!confirm(`Ignore this contrast issue?

Node: ${e.nodeName||"Unnamed"}

This issue will be marked as "Pass with ignore custom" and won't be counted as an error.`))return;if(S&&S.issues){let o=S.issues.find(s=>s.id===e.id);o&&(o.originalSeverity||(o.originalSeverity=o.severity),o.ignored=!0,o.severity="info",e.ignored=!0,e.originalSeverity=o.originalSeverity,e.severity="info")}Z[e.id]=!0,ae(),Jt(e,!0),_e(),parent.postMessage({pluginMessage:{type:"notify",message:"\u2705 Issue ignored"}},"*")}}catch(t){console.error("Error in handleIgnoreIssue:",t),parent.postMessage({pluginMessage:{type:"notify",message:`\u274C Error: ${t.message}`}},"*")}}function Jt(e,t){let o=document.querySelector(`.issue[data-issue-id="${e.id}"]`);if(o)if(t){let s=e.originalSeverity||"error";o.className=o.className.replace(/\b(error|warn)\b/g,"info");let n=o.querySelector(".issue-type");if(n){let i=n.querySelector(".issue-number");if(i){let a=i.textContent;n.innerHTML=`<span class="issue-number">${a}</span> \u2139\uFE0F INFO`}else n.innerHTML=n.innerHTML.replace(/❌|⚠️/g,"\u2139\uFE0F").replace(/ERROR|WARNING/g,"INFO")}if(!o.querySelector(".issue-ignored-tag")){let i=o.querySelector(".issue-body"),a=o.querySelector(".issue-node"),r=document.createElement("div");if(r.className="issue-ignored-tag",r.style.cssText="margin-top: 4px; padding: 4px 8px; background: #e3f2fd; color: #28a745; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-block;",r.textContent="\u2713 Pass with ignore custom",a)a.parentNode.insertBefore(r,a.nextSibling);else if(i)i.parentNode.insertBefore(r,i.nextSibling);else{let p=o.querySelector(".issue-header");p?p.parentNode.insertBefore(r,p.nextSibling):o.appendChild(r)}}let l=document.querySelector(`button.btn-ignore[data-id="${e.id}"]`);l&&(l.removeAttribute("disabled"),l.innerHTML="Ignored",l.style.cssText="padding: 6px 12px; border: 1px solid #28a745; background: #28a745; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s; color: white;")}else{let s=e.originalSeverity||(e.severity==="info"?"error":e.severity);o.className=o.className.replace(/\binfo\b/g,s);let n=o.querySelector(".issue-type");if(n){let a=s==="error"?"\u274C":s==="warn"?"\u26A0\uFE0F":"\u2139\uFE0F",r=s.toUpperCase(),p=n.querySelector(".issue-number");if(p){let u=p.textContent;n.innerHTML=`<span class="issue-number">${u}</span> ${a} ${r}`}else n.innerHTML=n.innerHTML.replace(/ℹ️/g,a).replace(/INFO/g,r)}let l=o.querySelector(".issue-ignored-tag");l&&l.remove();let i=document.querySelector(`button.btn-ignore[data-id="${e.id}"]`);i&&(i.removeAttribute("disabled"),i.innerHTML="Ignore",i.style.cssText="padding: 6px 12px; border: 1px solid #6c757d; background: #6c757d; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s; color: white;")}}function _e(){if(!S||!S.issues)return;let e=S.issues,t={error:e.filter(s=>s.severity==="error"&&!s.ignored).length,warn:e.filter(s=>s.severity==="warn"&&!s.ignored).length,total:e.length},o=document.querySelector(".results-header");if(o){let s=o.querySelector(".results-stats");s&&(s.innerHTML=`
          ${t.error>0?`<span class="stat error">${t.error} Error</span>`:""}
          ${t.warn>0?`<span class="stat warn">${t.warn} Warning</span>`:""}
          <span class="stat">${t.total} Total</span>
        `)}document.querySelectorAll(".issue-group").forEach(s=>{let n=s.querySelector(".badge");if(n){let l=s.getAttribute("data-issue-type");if(l){let a=e.filter(r=>r.type===l).filter(r=>r.ignored?!1:r.severity==="error"||r.severity==="warn").length;n.textContent=a}}})}function an(e){let t=e.message||"",o=t.match(/Padding\s+(\w+)\s+\((\d+)px\)/),s=null,n=null;if(o?(s=o[1],n=parseInt(o[2])):(o=t.match(/Gap\s+\(itemSpacing:\s+(\d+)px\)/),o&&(s="itemSpacing",n=parseInt(o[1]))),!o||!s||n===null){console.error("Cannot parse spacing issue message:",t),alert("Cannot determine spacing property from issue message. Message: "+t);return}let l=document.getElementById("spacing-scale");if(!l||!l.value.trim()){alert("No spacing scale defined. Please add spacing values to the Spacing input.");return}let i=l.value.split(",").map(a=>parseInt(a.trim(),10)).filter(a=>!isNaN(a)&&a>=0).sort((a,r)=>a-r);if(i.length===0){alert("No valid spacing values found in Spacing input.");return}Ao(e,s,n,i)}function rn(e){let o=(e.message||"").match(/Color (#[0-9A-Fa-f]{6})/),s=o?o[1].toUpperCase():null;if(!s){alert("Cannot determine current color from issue message");return}let n=document.getElementById("color-scale");if(!n||!n.value.trim()){alert("No color scale defined. Please add colors to the Color input.");return}let l=n.value.split(",").map(i=>i.trim().toUpperCase()).filter(i=>i&&i.startsWith("#"));if(l.length===0){alert("No valid colors found in Color input.");return}Lo(e,s,l,D)}function cn(e){var t;if(e.type==="typography-check"&&e.bestMatch){Bo(e,B);return}if(_(e.id,"\u23F3 Fixing...",!0),!e.bestMatch&&e.type!=="typography-check"){let o=prompt(`Cannot auto-fix this issue.

Issue: ${e.message}

Please provide fix instructions or press Cancel.`);if(o)parent.postMessage({pluginMessage:{type:"fix-issue",issue:e,manualFix:o}},"*");else{let s=document.querySelector(`.issue[data-issue-id="${e.id}"]`)||((t=document.querySelector(`button.btn-fix[data-id="${e.id}"]`))==null?void 0:t.closest(".issue"));if(s){let n=s.querySelector(".fix-message");n&&n.remove()}}return}parent.postMessage({pluginMessage:{type:"fix-issue",issue:e}},"*")}function Kt(e,t){let o=document.createElement("div");o.className="modal-overlay",o.id="create-style-modal-overlay";let s=document.createElement("div");s.className="modal-dialog";let n=e.nodeName||"Unnamed";if(e.message&&e.message.includes("(")&&e.message.includes("nodes")){let u=e.message.match(/\((\d+) nodes\)/);u&&(n=`${n} (${u[1]} nodes)`)}s.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Create Style</h2>
        <p class="modal-subtitle">${d(n)}</p>
      </div>
      <div class="modal-body">
        <input 
          type="text" 
          class="modal-input" 
          id="style-name-input" 
          placeholder="Style Name" 
          value="${d(e.nodeName||"New Style")}"
          autofocus
        />
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="modal-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="modal-create-btn">Create</button>
      </div>
    `,o.appendChild(s),document.body.appendChild(o);let l=s.querySelector("#style-name-input"),i=s.querySelector("#modal-cancel-btn"),a=s.querySelector("#modal-create-btn"),r=s.querySelector(".modal-close");setTimeout(()=>{l.focus(),l.select()},100),l.onkeydown=u=>{u.key==="Enter"?(u.preventDefault(),a.click()):u.key==="Escape"&&(u.preventDefault(),i.click())};let p=()=>{o.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{o.parentNode&&o.remove()},200)};i.onclick=p,r.onclick=p,o.onclick=u=>{u.target===o&&p()},a.onclick=()=>{let u=l.value.trim();if(!u){l.focus(),l.style.borderColor="#ff3b30",setTimeout(()=>{l.style.borderColor="#0071e3"},2e3);return}p(),t&&t(u)}}function Zt(e,t,o={}){if(!e||!t){console.error("showSuggestApplyModal: missing issue or styleName");return}let{onApply:s,onIgnore:n,onCancel:l,showIgnore:i=!1,progress:a}=o,r=B.find(Y=>Y.name===t);if(!r){alert(`Style "${t}" not found`);return}let p=e.nodeProps||{},u=p.fontFamily||"Unknown",f=p.fontSize!==null&&p.fontSize!==void 0?`${p.fontSize}px`:"Unknown",m=p.fontWeight||"Unknown",g=p.lineHeight||"Unknown",h=p.letterSpacing!==null&&p.letterSpacing!==void 0?p.letterSpacing:"Unknown",x=r.fontFamily||"Unknown",$=r.fontSize?`${r.fontSize}px`:"Unknown",T=r.fontWeight||"Unknown",I=r.lineHeight||"Unknown",P=r.letterSpacing!==null&&r.letterSpacing!==void 0?r.letterSpacing:"Unknown",R=document.createElement("div");R.className="modal-overlay",R.id="suggest-apply-modal-overlay";let te=document.createElement("div");te.className="modal-dialog",te.style.maxWidth="500px";let se=`
      <div style="margin-top: 16px; font-size: 13px;">
        <div style="margin-bottom: 12px; font-weight: 600; color: #333;">Comparison:</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: left; padding: 8px; font-weight: 600; color: #666;">Property</th>
              <th style="text-align: left; padding: 8px; font-weight: 600; color: #666;">Current</th>
              <th style="text-align: left; padding: 8px; font-weight: 600; color: #28a745;">Suggested</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 8px; color: #666;">Font Family</td>
              <td style="padding: 8px;"><code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px;">${d(u)}</code></td>
              <td style="padding: 8px;"><code style="background: #d4edda; padding: 2px 6px; border-radius: 3px; color: #155724;">${d(x)}</code></td>
            </tr>
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 8px; color: #666;">Font Size</td>
              <td style="padding: 8px;"><code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px;">${d(f)}</code></td>
              <td style="padding: 8px;"><code style="background: #d4edda; padding: 2px 6px; border-radius: 3px; color: #155724;">${d($)}</code></td>
            </tr>
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 8px; color: #666;">Font Weight</td>
              <td style="padding: 8px;"><code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px;">${d(m)}</code></td>
              <td style="padding: 8px;"><code style="background: #d4edda; padding: 2px 6px; border-radius: 3px; color: #155724;">${d(T)}</code></td>
            </tr>
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 8px; color: #666;">Line Height</td>
              <td style="padding: 8px;"><code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px;">${d(g)}</code></td>
              <td style="padding: 8px;"><code style="background: #d4edda; padding: 2px 6px; border-radius: 3px; color: #155724;">${d(I)}</code></td>
            </tr>
            <tr>
              <td style="padding: 8px; color: #666;">Letter Spacing</td>
              <td style="padding: 8px;"><code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px;">${d(h)}</code></td>
              <td style="padding: 8px;"><code style="background: #d4edda; padding: 2px 6px; border-radius: 3px; color: #155724;">${d(P)}</code></td>
            </tr>
          </tbody>
        </table>
      </div>
    `,re=a?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${a.current}/${a.total}</div>`:"";te.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Apply Suggested Style</h2>
        <p class="modal-subtitle">Node: ${d(e.nodeName||"Unnamed")}</p>
      </div>
      ${re}
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 14px; font-weight: 600; color: #333; margin-bottom: 8px;">
            Suggested Style: <span style="color: #28a745;">${d(t)}</span>
          </div>
          ${e.bestMatch&&e.bestMatch.percentage?`
            <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
              Match: <strong>${e.bestMatch.percentage}%</strong>
            </div>
          `:""}
        </div>
        ${se}
      </div>
      <div class="modal-footer">
        ${i?'<button class="modal-btn modal-btn-cancel" id="suggest-modal-ignore-btn" style="background: #6c757d; border-color: #6c757d; color: white;">Ignore</button>':""}
        <button class="modal-btn modal-btn-cancel" id="suggest-modal-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="suggest-modal-apply-btn" style="background: #28a745; border-color: #28a745;">Apply Style</button>
      </div>
    `,R.appendChild(te),document.body.appendChild(R);let ge=te.querySelector("#suggest-modal-cancel-btn"),Te=te.querySelector("#suggest-modal-apply-btn"),Fe=te.querySelector("#suggest-modal-ignore-btn"),K=te.querySelector(".modal-close"),ne=()=>{R.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{R.parentNode&&R.remove()},200)};ge.onclick=()=>{ne(),i&&o.onCancel&&typeof o.onCancel=="function"&&o.onCancel()},K.onclick=()=>{ne(),i&&o.onCancel&&typeof o.onCancel=="function"&&o.onCancel()},R.onclick=Y=>{Y.target===R&&(ne(),i&&o.onCancel&&typeof o.onCancel=="function"&&o.onCancel())},Te.onclick=()=>{ne(),_(e.id,"\u23F3 Applying style...",!0),parent.postMessage({pluginMessage:{type:"apply-typography-style",issue:e,style:r}},"*"),s&&typeof s=="function"&&s()},Fe&&(Fe.onclick=()=>{ne(),n&&typeof n=="function"&&n()})}function dn(e,t){if(!t||t.length===0){alert("No issues to process");return}let o=0,s=0,n=0,l=!1;function i(){let p=`\u2705 \u0110\xE3 xong!

\u0110\xE3 x\u1EED l\xFD ${o} item(s):
\u2022 Applied: ${s}
\u2022 Ignored: ${n}`;alert(p)}function a(){if(l||o>=t.length){i();return}let r=t[o];o++,parent.postMessage({pluginMessage:{type:"select-node",id:r.id}},"*");let p={current:o,total:t.length};if(r.type==="typography-check"||r.type==="typography-style")Zt(r,r.bestMatch.name,{showIgnore:!0,progress:p,onApply:()=>{s++,setTimeout(()=>{a()},500)},onIgnore:()=>{n++,a()},onCancel:()=>{l=!0,i()}});else if(r.type==="color"){let u=Ze(r),m=(r.message||"").match(/Color (#[0-9A-Fa-f]{6})/),g=m?m[1].toUpperCase():null;pn(r,g,u,{progress:p,onApply:()=>{s++,setTimeout(()=>{a()},500)},onIgnore:()=>{n++,a()},onCancel:()=>{l=!0,i()}})}else if(r.type==="spacing"){let u=Qe(r),m=(r.message||"").match(/Padding\s+(\w+)\s+\((\d+)px\)/);if(m){let g=m[1],h=parseInt(m[2]);un(r,g,h,u,{progress:p,onApply:()=>{s++,setTimeout(()=>{a()},500)},onIgnore:()=>{n++,a()},onCancel:()=>{l=!0,i()}})}else n++,a()}else r.type==="autolayout"?Oo(r,{progress:p,onApply:()=>{s++,setTimeout(()=>{a()},500)},onIgnore:()=>{n++,a()},onCancel:()=>{l=!0,i()}}):r.type==="position"?_o(r,{progress:p,onApply:()=>{s++,setTimeout(()=>{a()},500)},onIgnore:()=>{n++,a()},onCancel:()=>{l=!0,i()}}):r.type==="group"?Yo(r,{progress:p,onApply:()=>{s++,setTimeout(()=>{a()},500)},onIgnore:()=>{n++,a()},onCancel:()=>{l=!0,i()}}):r.type==="empty-frame"?Zo(r,{progress:p,onApply:()=>{s++,setTimeout(()=>{a()},500)},onIgnore:()=>{n++,a()},onCancel:()=>{l=!0,i()}}):r.type==="text-size-mobile"?(window.pendingTextSizeFixAllCallbacks={progress:p,onApply:()=>{s++,setTimeout(()=>{a()},500)},onIgnore:()=>{n++,a()},onCancel:()=>{l=!0,i()}},xt(r)):r.type==="contrast"?(window.pendingContrastFixAllCallbacks={progress:p,onApply:()=>{s++,setTimeout(()=>{a()},500)},onIgnore:()=>{n++,a()},onCancel:()=>{l=!0,i()}},St(r)):(n++,a())}a()}function pn(e,t,o,s={}){let{onApply:n,onIgnore:l,onCancel:i,progress:a}=s,r=a?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${a.current}/${a.total}</div>`:"",p=document.createElement("div");p.className="modal-overlay";let u=document.createElement("div");u.className="modal-dialog",u.style.maxWidth="450px";let f=D[o]||o;u.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Apply Suggested Color</h2>
        <p class="modal-subtitle">Node: ${d(e.nodeName||"Unnamed")}</p>
      </div>
      ${r}
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">Color Change:</div>
          <div style="display: flex; align-items: center; gap: 16px; padding: 16px; background: #f5f5f5; border-radius: 8px;">
            <div style="text-align: center;">
              <div style="width: 64px; height: 64px; border-radius: 8px; background: ${d(t)}; border: 2px solid #ddd; margin-bottom: 8px;"></div>
              <div style="font-size: 11px; color: #666;">Current</div>
              <div style="font-size: 12px; font-weight: 600; color: #333; font-family: 'SF Mono', Monaco, monospace; margin-top: 4px;">${d(t)}</div>
            </div>
            <div style="font-size: 24px; color: #666;">\u2192</div>
            <div style="text-align: center;">
              <div style="width: 64px; height: 64px; border-radius: 8px; background: ${d(o)}; border: 2px solid #0071e3;"></div>
              <div style="font-size: 11px; color: #666;">Suggested</div>
              <div style="font-weight: 600; font-size: 14px; color: #333;">${d(f)}</div>
              <div style="font-size: 12px; color: #666; font-family: 'SF Mono', Monaco, monospace;">${d(o)}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="color-fix-ignore-btn" style="background: #6c757d; border-color: #6c757d; color: white;">Ignore</button>
        <button class="modal-btn modal-btn-cancel" id="color-fix-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="color-fix-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `,p.appendChild(u),document.body.appendChild(p);let m=u.querySelector("#color-fix-cancel-btn"),g=u.querySelector("#color-fix-apply-btn"),h=u.querySelector("#color-fix-ignore-btn"),x=u.querySelector(".modal-close"),$=()=>{p.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{p.parentNode&&p.remove()},200)};m.onclick=()=>{$(),i&&i()},x.onclick=()=>{$(),i&&i()},p.onclick=T=>{T.target===p&&($(),i&&i())},h.onclick=()=>{$(),l&&l()},g.onclick=()=>{$(),_(e.id,"\u23F3 Fixing color...",!0),parent.postMessage({pluginMessage:{type:"fix-color-issue",issue:e,color:o}},"*"),n&&n()}}function un(e,t,o,s,n={}){let{onApply:l,onIgnore:i,onCancel:a,progress:r}=n,p=r?`<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${r.current}/${r.total}</div>`:"",u=document.createElement("div");u.className="modal-overlay";let f=document.createElement("div");f.className="modal-dialog",f.style.maxWidth="450px",f.innerHTML=`
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">\xD7</button>
        <h2 class="modal-title">Apply Suggested Spacing</h2>
        <p class="modal-subtitle">Node: ${d(e.nodeName||"Unnamed")}</p>
      </div>
      ${p}
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">Spacing Change:</div>
          <div style="display: flex; align-items: center; gap: 16px; padding: 16px; background: #f5f5f5; border-radius: 8px;">
            <div style="text-align: center;">
              <div style="font-weight: 600; font-size: 18px; color: #333;">${o}px</div>
              <div style="font-size: 11px; color: #666; margin-top: 4px;">Current</div>
            </div>
            <div style="font-size: 24px; color: #666;">\u2192</div>
            <div style="text-align: center;">
              <div style="font-weight: 600; font-size: 18px; color: #333;">${s}px</div>
              <div style="font-size: 11px; color: #666; margin-top: 4px;">Suggested</div>
            </div>
          </div>
          <div style="font-size: 12px; color: #666; margin-top: 8px;">Property: <strong>${d(t)}</strong></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="spacing-fix-ignore-btn" style="background: #6c757d; border-color: #6c757d; color: white;">Ignore</button>
        <button class="modal-btn modal-btn-cancel" id="spacing-fix-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="spacing-fix-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `,u.appendChild(f),document.body.appendChild(u);let m=f.querySelector("#spacing-fix-cancel-btn"),g=f.querySelector("#spacing-fix-apply-btn"),h=f.querySelector("#spacing-fix-ignore-btn"),x=f.querySelector(".modal-close"),$=()=>{u.style.animation="fadeIn 0.2s ease-out reverse",setTimeout(()=>{u.parentNode&&u.remove()},200)};m.onclick=()=>{$(),a&&a()},x.onclick=()=>{$(),a&&a()},u.onclick=T=>{T.target===u&&($(),a&&a())},h.onclick=()=>{$(),i&&i()},g.onclick=()=>{$(),_(e.id,"\u23F3 Fixing spacing...",!0),parent.postMessage({pluginMessage:{type:"fix-spacing-issue",issue:e,propertyName:t,value:s}},"*"),l&&l()}}function Qt(e,t){if(!e||!t){console.error("handleApplyFigmaTextStyle: missing issue or style");return}_(e.id,"\u23F3 Applying style...",!0),parent.postMessage({pluginMessage:{type:"apply-figma-text-style",issue:e,styleId:t.id,styleName:t.name}},"*")}function kt(e,t){if(!e||!t){console.error("handleApplyTypographyStyle: missing issue or styleName");return}Zt(e,t)}function eo(e){if(console.log("handleCreateTextStyle called",e),!e){console.error("handleCreateTextStyle: issue is null/undefined");return}Kt(e,t=>{console.log("handleCreateTextStyle: sending message",{type:"create-text-style",issueId:e.id,styleName:t}),_(e.id,"\u23F3 Creating style...",!0),parent.postMessage({pluginMessage:{type:"create-text-style",issue:e,styleName:t}},"*")})}function Fn(e,t){if(e==="typography-style"){let n={nodeName:`${t.length} text node(s)`,message:`Found ${t.length} text node(s) without text style`};Kt(n,l=>{t.forEach(i=>{_(i.id,"\u23F3 Creating style...",!0)}),parent.postMessage({pluginMessage:{type:"create-text-style-all",issues:t,styleName:l}},"*")});return}let o=t.filter(n=>n.bestMatch&&n.type==="typography-check"),s=t.filter(n=>!n.bestMatch||n.type!=="typography-check");if(o.length===0){alert(`No auto-fixable issues found in ${dt(e)}.

All ${t.length} issues require manual intervention.`);return}s.length>0&&!confirm(`Found ${o.length} auto-fixable issues and ${s.length} issues that require manual fix.

Do you want to auto-fix the ${o.length} issues now?

The ${s.length} issues will need to be fixed manually.`)||parent.postMessage({pluginMessage:{type:"fix-all-issues",issues:o,issueType:e}},"*")}function gn(e){console.log("filterAndSearchIssues called",{totalIssues:e.length,currentFilter:xe,currentSearch:de});let t=e;if(xe!=="all"&&(t=t.filter(o=>o.severity===xe),console.log("After severity filter:",t.length)),de.trim()){let o=de.toLowerCase();t=t.filter(s=>{let n=(s.message||"").toLowerCase(),l=(s.nodeName||"").toLowerCase(),i=(s.type||"").toLowerCase();return n.includes(o)||l.includes(o)||i.includes(o)}),console.log("After search filter:",t.length)}return console.log("Final filtered issues:",t.length),t}function Ae(e=[],t=!1,o={}){let{skipSave:s=!1,restoreTimestamp:n=null}=o;Ie("issues"),document.getElementById("issues-count").textContent=e.length,e&&Array.isArray(e)&&e.forEach(I=>{Z[I.id]===!0&&(I.ignored=!0,I.originalSeverity||(I.originalSeverity=I.severity),I.severity="info")});let l=S.issues!==e;S.issues=e;let i=n||new Date().toISOString();S.timestamp=i,ot=!1,(t||l)&&(console.log("Resetting filters for new data"),xe="all",Ee="all",$e&&($e.value=""),de="",he&&(he.style.display="none"),ce&&ce.length>0&&ce.forEach(I=>{I.classList.remove("active"),I.getAttribute("data-filter")==="all"&&I.classList.add("active")}));let a=document.getElementById("filter-controls"),r=document.getElementById("color-type-filter"),p=document.getElementById("filter-buttons");a.style.display=e.length>0?"flex":"none",r.style.display="none",p.style.display="flex";let u=document.getElementById("export-group");u.style.display=e.length>0?"flex":"none",console.log("About to filter with:",{currentFilter:xe,currentSearch:de});let f=gn(e),m=new Set;if(l||(document.querySelectorAll(".issue-group").forEach(P=>{let R=P.getAttribute("data-issue-type");R&&!P.classList.contains("collapsed")&&m.add(R)}),console.log("Saved expanded groups:",Array.from(m))),ct("issues"),f.length===0&&e.length===0){oe.innerHTML=`
              <div class="empty-state success">
                <div class="icon">\u2705</div>
                <p><strong>No issues found!</strong></p>
                <p style="margin-top: 8px; font-size: 12px;">Your design passed all configured checks.</p>
              </div>
            `;return}if(f.length===0&&e.length>0&&xe!=="all"){oe.innerHTML=`
              <div class="empty-state">
                <div class="icon">\u{1F50D}</div>
                <p><strong>No results found</strong></p>
                <p style="margin-top: 8px; font-size: 12px;">Try changing the filter or search keyword.</p>
              </div>
            `;return}let g={error:f.filter(I=>I.severity==="error"&&!I.ignored).length,warn:f.filter(I=>I.severity==="warn"&&!I.ignored).length,total:f.length,originalTotal:e.length},h=document.createElement("div");h.className="results-header",h.innerHTML=`
            <h3>Check Result</h3>
            <div class="results-stats">
              ${g.error>0?`<span class="stat error">${g.error} Error</span>`:""}
              ${g.warn>0?`<span class="stat warn">${g.warn} Warning</span>`:""}
              <span class="stat">${g.total} Total</span>
              ${g.originalTotal!==g.total?`<span class="stat" style="opacity: 0.6;">(${g.originalTotal} total)</span>`:""}
            </div>
          `,oe.appendChild(h);let x=f.reduce((I,P)=>(I[P.type]=I[P.type]||[],I[P.type].push(P),I),{}),$=e.reduce((I,P)=>(I[P.type]=I[P.type]||[],I[P.type].push(P),I),{}),T=["naming","autolayout","spacing","color","typography","typography-style","typography-check","line-height","position","duplicate","group","component","empty-frame","nested-group","contrast","text-size-mobile"];for(let I of T){let P=x[I]||[],R=P.length,te=P.filter(c=>c.ignored?!1:c.severity==="error"||c.severity==="warn").length;if(R===0&&e.length===0||R===0&&xe!=="all")continue;let se=document.createElement("div"),re=m.has(I);se.className=re?"issue-group":"issue-group collapsed",se.setAttribute("data-issue-type",I);let ge=document.createElement("div");ge.className="issue-group-header";let Te=($[I]||[]).some(c=>{if(!c)return!1;switch(c.type){case"color":return Ze(c)!==null;case"spacing":return Qe(c)!==null;case"autolayout":return typeof Ve=="function"&&Ve(c)!==null;case"text-size-mobile":return typeof Pe=="function"&&Pe(c)!==null;case"contrast":return typeof Xe=="function"&&Xe(c)!==null;case"typography-style":case"typography-check":return c.bestMatch!==null;case"position":return typeof qe=="function"&&qe(c)!==null;case"duplicate":case"component":return typeof Ge=="function"&&Ge(c)!==null;case"group":return!0;case"empty-frame":return typeof Ye=="function"&&Ye(c)!==null;default:return!1}});ge.innerHTML=`
              <div class="issue-group-header-left">
                <button class="issue-group-toggle" type="button">
                  <span class="issue-group-toggle-icon">\u25B6</span>
                </button>
                <h4>${At(I)} ${dt(I)}</h4>
                <span class="badge">${te}</span>
              </div>
              ${R>0&&I!=="typography"&&I!=="line-height"&&I!=="naming"&&I!=="typography-style"&&I!=="component"&&I!=="duplicate"&&Te?`<button class="btn-fix-all" data-type="${I}">Fix all now</button>`:""}
            `;let Fe=ge.querySelector(".issue-group-toggle"),K=()=>{se.classList.contains("collapsed")?(se.classList.remove("collapsed"),Y.style.display="block",setTimeout(()=>{Y.style.opacity="1"},10)):(Y.style.opacity="0",setTimeout(()=>{se.classList.add("collapsed"),Y.style.display="none"},200))};Fe.onclick=c=>{c.stopPropagation(),K()},ge.onclick=c=>{c.target!==Fe&&!Fe.contains(c.target)&&K()};let ne=ge.querySelector(".btn-fix-all");ne&&(ne.onclick=c=>{c.preventDefault(),c.stopPropagation();let ze=($[I]||[]).filter(ie=>{if(!ie)return!1;switch(ie.type){case"color":return Ze(ie)!==null;case"spacing":return Qe(ie)!==null;case"autolayout":return typeof Ve=="function"&&Ve(ie)!==null;case"text-size-mobile":return typeof Pe=="function"&&Pe(ie)!==null;case"contrast":return typeof Xe=="function"&&Xe(ie)!==null;case"typography-style":case"typography-check":return ie.bestMatch!==null;case"position":return typeof qe=="function"&&qe(ie)!==null;case"duplicate":case"component":return typeof Ge=="function"&&Ge(ie)!==null;case"group":return!0;case"empty-frame":return typeof Ye=="function"&&Ye(ie)!==null;default:return!1}});if(ze.length===0){alert("No issues with suggest fix available");return}dn(I,ze)}),se.appendChild(ge);let Y=document.createElement("div");if(Y.className="issue-group-content",re?(Y.style.display="block",Y.style.opacity="1"):Y.style.display="none",R===0){let c=document.createElement("div");c.className="issue info",c.style.opacity="0.7",c.innerHTML=`
                <div class="issue-header">
                  <div>
                    <span class="issue-type">\u2705 PASSED</span>
                    <div class="issue-body">No issues in this type.</div>
                  </div>
                </div>
              `,Y.appendChild(c)}else x[I].forEach((c,ze)=>{let ie=ze+1,Ne=Z[c.id]===!0;if(Ne&&(c.originalSeverity||(c.originalSeverity=c.severity),c.severity="info",c.ignored=!0),c.type==="typography-check"){let N=document.createElement("div");Y.appendChild(N);let U=Wo(c);if(U){let Q=document.createElement("span");Q.className="issue-number",Q.textContent=`#${ie}`,Q.style.cssText="position: absolute; left: 8px; top: 8px; font-weight: bold; opacity: 0.5; font-size: 11px;",U.style.position="relative",U.style.paddingLeft="40px",U.insertBefore(Q,U.firstChild),Y.replaceChild(U,N)}return}let X=document.createElement("div"),ft=Ne?"info":c.severity;X.className=`issue ${ft}`,X.setAttribute("data-issue-id",c.id);let Re=d(c.message);if(c.type==="contrast"){let N=[];if(c.textColor&&N.push(`Text color: <code style="background: ${d(c.textColor)}; padding: 2px 6px; border-radius: 3px; color: ${et(c.textColor)};">${d(c.textColor)}</code> (${c.textColorNode||c.nodeName||"Unnamed"})`),c.backgroundColor){let U="Background:",Q="",fe="";c.isGradient&&c.gradientString?(U="Background (gradient):",Q=`<code style="background: ${d(c.backgroundColor)}; padding: 2px 6px; border-radius: 3px; color: ${et(c.backgroundColor)}; font-family: 'SF Mono', Monaco, monospace; font-size: 11px;">${d(c.gradientString)}</code>`,fe=" <span style='font-size: 11px; color: #999;'>(average: "+d(c.backgroundColor)+")</span>"):Q=`<code style="background: ${d(c.backgroundColor)}; padding: 2px 6px; border-radius: 3px; color: ${et(c.backgroundColor)};">${d(c.backgroundColor)}</code>`,c.fromSibling&&(fe+=" <span style='font-size: 11px; color: #3b82f6;'>(from sibling layer)</span>"),N.push(`${U} ${Q}${fe} (${c.backgroundColorNode||"Unknown"})`)}N.length>0&&(Re+=`<div style="margin-top: 8px; font-size: 12px; color: #666;">${N.join(" | ")}</div>`)}X.innerHTML=`
                <div class="issue-header">
                  <div>
                    <span class="issue-type">
                      <span class="issue-number">#${ie}</span>
                      ${Ro(Ne?"info":c.severity)} ${Ne?"INFO":c.severity.toUpperCase()}
                    </span>
                    <div class="issue-body">${Re}</div>
                    ${c.nodeName?`<div class="issue-node">Node: ${d(c.nodeName)}</div>`:""}
                    ${c.type==="typography"||c.type==="line-height"?`<div style="margin-top: 8px; padding: 8px 12px; background: #fff3cd; border-left: 3px solid #ffc107; border-radius: 4px; font-size: 12px; color: #856404; line-height: 1.5;"><strong>Note:</strong> Check 'Typography Style Match' to resolve this issue.</div>`:""}
                    ${c.ignored?'<div class="issue-ignored-tag" style="margin-top: 4px; padding: 4px 8px; background: #e3f2fd; color: #1976d2; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-block;">\u2713 Pass with ignore custom</div>':""}
                  </div>
                  <div class="issue-actions">
                    <button class="btn-select" data-id="${c.id}">Select</button>
                    ${c.type==="color"?`
                      ${Ze(c)?`<button class="btn-suggest-fix" data-id="${c.id}">Suggest Fix now</button>`:""}
                      <button class="btn-fix" data-id="${c.id}">Select Color</button>
                    `:""}
                    ${c.type==="spacing"?`
                      ${Qe(c)?`<button class="btn-suggest-fix" data-id="${c.id}">Suggest Fix now</button>`:""}
                      <button class="btn-fix" data-id="${c.id}">Select Spacing</button>
                    `:""}
                    ${c.type==="autolayout"?`
                      ${Ve(c)?`<button class="btn-suggest-fix" data-id="${c.id}">Suggest Fix now</button>`:""}
                      <button class="btn-fix" data-id="${c.id}">Select</button>
                    `:""}
                    ${c.type==="text-size-mobile"?`
                      ${Pe(c)?`<button class="btn-suggest-fix" data-id="${c.id}">Suggest Fix now</button>`:""}
                      <button class="btn-fix" data-id="${c.id}">Select Style</button>
                    `:""}
                    ${c.type==="contrast"?`
                      ${Xe(c)?`<button class="btn-suggest-fix" data-id="${c.id}">Suggest Fix now</button>`:""}
                      <button class="btn-fix" data-id="${c.id}">Select Color</button>
                      <button class="btn-ignore" data-id="${c.id}" ${c.ignored?'style="background: #28a745; border-color: #28a745;"':""}>${c.ignored?"Ignored":"Ignore"}</button>
                    `:""}
                    ${c.type==="typography-style"?`
                      ${c.bestMatch?`
                        <button class="btn-suggest-fix" data-id="${c.id}" data-style-name="${d(c.bestMatch.name)}">Suggest Fix now</button>
                      `:""}
                      <button class="btn-fix" data-id="${c.id}">Select Style</button>
                      <button class="btn-create-style" data-id="${c.id}" data-issue-type="${c.type}">Create Style</button>
                    `:""}
                    ${c.type==="position"?`
                      ${qe(c)?`<button class="btn-suggest-fix" data-id="${c.id}">Suggest Fix now</button>`:""}
                      <button class="btn-remove-layer" data-id="${c.id}">Remove Layer</button>
                    `:""}
                    ${c.type==="duplicate"?`
                      ${Ge(c)?`<button class="btn-suggest-fix" data-id="${c.id}">Suggest Fix now</button>`:""}
                      <button class="btn-select-component" data-id="${c.id}">Select Component</button>
                      <button class="btn-create-component" data-id="${c.id}">Create New Component</button>
                    `:""}
                    ${c.type==="component"?`
                      ${Ge(c)?`<button class="btn-suggest-fix" data-id="${c.id}">Suggest Fix now</button>`:""}
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
                      ${Ye(c)?`<button class="btn-suggest-fix" data-id="${c.id}">Suggest Fix now</button>`:""}
                    `:""}
                  </div>
                </div>
              `,Y.appendChild(X),X.setAttribute("data-issue-id",c.id),X.setAttribute("data-issue-type",c.type);let We=X.querySelector("button.btn-select");We&&(We.onclick=()=>{parent.postMessage({pluginMessage:{type:"select-node",id:c.id}},"*")});let He=X.querySelector("button.btn-fix");He&&(c.type==="color"?He.onclick=()=>{rn(c)}:c.type==="spacing"?He.onclick=()=>{an(c)}:c.type==="text-size-mobile"?He.onclick=N=>{N.preventDefault(),N.stopPropagation(),console.log("Text Size Fix button clicked",c),typeof Gt=="function"?Gt(c):(console.error("handleFixTextSizeIssue is not a function"),alert("Error: handleFixTextSizeIssue function not found"))}:c.type==="contrast"?He.onclick=N=>{N.preventDefault(),N.stopPropagation(),console.log("Contrast Fix button clicked",c),typeof Yt=="function"?Yt(c):(console.error("handleFixContrastIssue is not a function"),alert("Error: handleFixContrastIssue function not found"))}:He.onclick=()=>{cn(c)});let be=X.querySelector("button.btn-suggest-fix");be&&(c.type==="color"?be.onclick=()=>{Do(c)}:c.type==="spacing"?be.onclick=()=>{Uo(c)}:c.type==="autolayout"?be.onclick=N=>{N.preventDefault(),N.stopPropagation(),console.log("Autolayout Suggest Fix button clicked",c),typeof Lt=="function"?Lt(c):(console.error("handleSuggestFixAutolayout is not a function"),alert("Error: handleSuggestFixAutolayout function not found"))}:c.type==="text-size-mobile"?be.onclick=N=>{N.preventDefault(),N.stopPropagation(),console.log("Text Size Suggest Fix button clicked",c),typeof xt=="function"?xt(c):(console.error("handleSuggestFixTextSize is not a function"),alert("Error: handleSuggestFixTextSize function not found"))}:c.type==="position"?be.onclick=N=>{N.preventDefault(),N.stopPropagation(),console.log("Position Suggest Fix button clicked",c),typeof qt=="function"?qt(c):(console.error("handleSuggestFixPosition is not a function"),alert("Error: handleSuggestFixPosition function not found"))}:c.type==="duplicate"||c.type==="component"?be.onclick=N=>{N.preventDefault(),N.stopPropagation(),console.log("Component Suggest Fix button clicked",c),typeof Wt=="function"?Wt(c):(console.error("handleSuggestFixComponent is not a function"),alert("Error: handleSuggestFixComponent function not found"))}:c.type==="contrast"?be.onclick=N=>{N.preventDefault(),N.stopPropagation(),console.log("Contrast Suggest Fix button clicked",c),typeof St=="function"?St(c):(console.error("handleSuggestFixContrast is not a function"),alert("Error: handleSuggestFixContrast function not found"))}:c.type==="group"?be.onclick=N=>{N.preventDefault(),N.stopPropagation(),console.log("Group Suggest Fix button clicked",c),typeof Ht=="function"?Ht(c):(console.error("handleSuggestFixGroup is not a function"),alert("Error: handleSuggestFixGroup function not found"))}:c.type==="empty-frame"&&(be.onclick=N=>{N.preventDefault(),N.stopPropagation(),console.log("Empty Frame Suggest Fix button clicked",c),typeof Pt=="function"?Pt(c):(console.error("handleSuggestFixEmptyFrame is not a function"),alert("Error: handleSuggestFixEmptyFrame function not found"))}));let ht=X.querySelector("button.btn-select-component");ht&&(c.type==="duplicate"||c.type==="component")&&(function(N){ht.onclick=U=>{U.preventDefault(),U.stopPropagation(),console.log("Select Component button clicked",N),typeof Dt=="function"?Dt(N):(console.error("handleSelectComponent is not a function"),alert("Error: handleSelectComponent function not found"))}})(c);let Ke=X.querySelector("button.btn-create-component");Ke&&(c.type==="duplicate"||c.type==="component")&&(function(N){Ke.onclick=U=>{U.preventDefault(),U.stopPropagation(),console.log("Create Component button clicked",N),typeof Ut=="function"?Ut(N):(console.error("handleCreateComponent is not a function"),alert("Error: handleCreateComponent function not found"))}})(c);let st=X.querySelector("button.btn-rename");st&&c.type==="naming"&&(function(N){st.onclick=U=>{U.preventDefault(),U.stopPropagation(),console.log("Rename button clicked",N),typeof jt=="function"?jt(N):(console.error("handleRenameNode is not a function"),alert("Error: handleRenameNode function not found"))}})(c);let it=X.querySelector("button.btn-remove-layer");it&&c.type==="position"&&(function(N){it.onclick=U=>{U.preventDefault(),U.stopPropagation(),console.log("Remove Layer button clicked",N),typeof Rt=="function"?Rt(N):(console.error("handleRemovePositionLayer is not a function"),alert("Error: handleRemovePositionLayer function not found"))}})(c);let Be=X.querySelector("button.btn-ignore");if(Be&&c.type==="contrast"&&(Be.removeAttribute("disabled"),Be.onclick=N=>{N.preventDefault(),N.stopPropagation(),console.log("Ignore button clicked",c);try{typeof _t=="function"?_t(c):(console.error("handleIgnoreIssue is not a function"),alert("Error: handleIgnoreIssue function not found"))}catch(U){console.error("Error handling ignore:",U),alert(`Error: ${U.message}`)}}),c.type==="typography-style"){let N=X.querySelector("button.btn-create-style");N?(console.log("Attaching create style handler to button",{issueId:c.id,issueType:c.type,nodeName:c.nodeName}),(function(we){N.onclick=ye=>{ye.preventDefault(),ye.stopPropagation(),console.log("Create Style button clicked",we),typeof eo=="function"?eo(we):(console.error("handleCreateTextStyle is not a function"),alert("Error: handleCreateTextStyle function not found"))}})(c)):console.error("Create Style button not found in DOM",{issueId:c.id,issueType:c.type,hasIssueEl:!!X,innerHTML:X.innerHTML.substring(0,200)});let U=X.querySelector("button.btn-suggest-fix");U&&c.bestMatch&&c.type==="typography-style"&&(function(we){U.onclick=ye=>{ye.preventDefault(),ye.stopPropagation();let at=U.getAttribute("data-style-name");kt(we,at)}})(c),U&&c.bestMatch&&c.type==="typography-check"&&(function(we){U.onclick=ye=>{ye.preventDefault(),ye.stopPropagation(),kt(we,we.bestMatch.name)}})(c);let Q=X.querySelector("button.btn-fix");Q&&c.type==="typography-style"&&(function(we){Q.onclick=ye=>{ye.preventDefault(),ye.stopPropagation(),parent.postMessage({pluginMessage:{type:"get-figma-text-styles",issueId:we.id}},"*"),window.pendingTypographyStyleIssue=we}})(c);let fe=X.querySelector("button.btn-style-dropdown"),De=X.querySelector(".style-dropdown-menu");if(fe&&De){let we=!1;fe.onclick=ye=>{ye.preventDefault(),ye.stopPropagation();let at=De.style.display!=="none";document.querySelectorAll(".style-dropdown-menu").forEach($o=>{$o!==De&&($o.style.display="none")}),at?De.style.display="none":(De.style.display="block",we||(De.innerHTML='<div style="padding: 8px 12px; color: #999; font-size: 12px; text-align: center;">Loading...</div>',parent.postMessage({pluginMessage:{type:"get-figma-text-styles",issueId:c.id}},"*")))},document.addEventListener("click",function(at){X.contains(at.target)||(De.style.display="none")})}}});se.appendChild(Y),oe.appendChild(se)}s||je({issues:e,issuesTimestamp:i,tokens:S.tokens,tokensTimestamp:S.tokensTimestamp,lastActiveTab:"issues",scanMode:S.scanMode||null,context:S.context||null})}function mn(e){if(console.log("filterAndSearchTokens called",{hasTokens:!!e,currentColorTypeFilter:Ee,currentSearch:de}),!e)return null;let t={},o=!1;for(let[s,n]of Object.entries(e)){let l=n||[];if(console.log(`Processing ${s}, initial count:`,l.length),(s==="colors"||s==="gradients")&&Ee!=="all"&&(l=l.filter(i=>(i.colorType||"").toLowerCase().includes(Ee.toLowerCase())),console.log(`After color type filter (${Ee}):`,l.length)),de.trim()){let i=de.toLowerCase();l=l.map(a=>{let r=String(a.value||"").toLowerCase(),p=(a.nodes||[]).map(h=>h.name||"").join(" ").toLowerCase(),u=(a.colorType||"").toLowerCase(),f=r.includes(i),m=p.includes(i),g=u.includes(i);if(f||m||g){let h=[];return f&&h.push("value"),m&&h.push("nodeName"),g&&h.push("colorType"),Fo(To({},a),{_matchedBy:h,_matchedNodeNames:m?(a.nodes||[]).filter(x=>(x.name||"").toLowerCase().includes(i)).map(x=>x.name):[]})}return null}).filter(a=>a!==null),console.log(`After search filter (${s}):`,l.length)}l.length>0&&(o=!0),t[s]=l}return console.log("Final filtered tokens keys:",Object.keys(t)),{tokens:t,hasMatches:o}}function yn(e){let t=document.getElementById("spacing-scale");if(!t)return;let s=(e&&Array.isArray(e.spacing)?e.spacing:[]).map(l=>{let i=parseInt(String(l&&l.value!==void 0?l.value:"").trim(),10);return isNaN(i)?null:Math.abs(i)}).filter(l=>l!==null);if(!s.length)return;let n=Array.from(new Set(s)).sort((l,i)=>l-i);t.value=n.join(", ");try{t.focus(),t.setSelectionRange(t.value.length,t.value.length)}catch(l){}}function ut(e,t=!1,o={}){let{skipSave:s=!1,restoreTimestamp:n=null}=o;Ie("tokens");let l=Object.values(e||{}).reduce((P,R)=>P+(Array.isArray(R)?R.length:0),0);document.getElementById("tokens-count").textContent=l;let i=S.tokens!==e;S.tokens=e;let a=n||new Date().toISOString();S.tokensTimestamp=a,ot=!0,(t||i)&&(console.log("Resetting filters for new token data"),xe="all",Ee="all",$e&&($e.value=""),de="",he&&(he.style.display="none"),ce&&ce.length>0&&ce.forEach(P=>{P.classList.remove("active"),P.getAttribute("data-filter")==="all"&&P.classList.add("active")}),Je&&(Je.value="all"));let r=document.getElementById("filter-controls"),p=document.getElementById("color-type-filter"),u=document.getElementById("filter-buttons");r.style.display=e&&Object.keys(e).length>0?"flex":"none",p.style.display=e&&(e.colors||e.gradients)?"block":"none",u.style.display="none";let f=document.getElementById("export-group");f.style.display=e&&Object.keys(e).length>0?"flex":"none",console.log("About to filter tokens with:",{currentColorTypeFilter:Ee,currentSearch:de});let m=mn(e);if(ct("tokens"),!e||Object.keys(e).length===0){ee.innerHTML=`
              <div class="empty-state">
                <div class="icon">\u{1F4CB}</div>
                <p>No design tokens found</p>
              </div>
            `;return}if(!m){ee.innerHTML=`
              <div class="empty-state">
                <div class="icon">\u{1F50D}</div>
                <p><strong>No results found</strong></p>
                <p style="margin-top: 8px; font-size: 12px;">Try changing the filter or search keyword.</p>
              </div>
            `;return}let g=m.tokens||{},h=m.hasMatches;if((de.trim()||Ee!=="all")&&!h){ee.innerHTML=`
              <div class="empty-state">
                <div class="icon">\u{1F50D}</div>
                <p><strong>No results found</strong></p>
                <p style="margin-top: 8px; font-size: 12px;">Try changing the filter or search keyword.</p>
              </div>
            `;return}let $={colors:{icon:"\u{1F3A8}",label:"Colors",values:g.colors||[]},gradients:{icon:"\u{1F308}",label:"Gradients",values:g.gradients||[]},spacing:{icon:"\u2194\uFE0F",label:"Spacing (px)",values:g.spacing||[]},borderRadius:{icon:"\u2B55",label:"Border Radius",values:g.borderRadius||[]},fontWeight:{icon:"\u{1F4AA}",label:"Font Weight",values:g.fontWeight||[]},lineHeight:{icon:"\u{1F4CF}",label:"Line Height (%)",values:g.lineHeight||[]},fontSize:{icon:"\u{1F4DD}",label:"Font Size",values:g.fontSize||[]},fontFamily:{icon:"\u{1F524}",label:"Font Family",values:g.fontFamily||[]}},T=document.createElement("div");T.className="results-header";let I=Object.values($).reduce((P,R)=>P+R.values.length,0);T.innerHTML=`
            <h3>Design Tokens</h3>
            <div class="results-stats">
              <span class="stat">${I} Tokens</span>
            </div>
          `,ee.appendChild(T);for(let[P,R]of Object.entries($)){let te=document.createElement("div");te.className="issue-group collapsed";let se=document.createElement("div");se.className="issue-group-header",se.innerHTML=`
              <div class="issue-group-header-left">
                <button class="issue-group-toggle" type="button">
                  <span class="issue-group-toggle-icon">\u25B6</span>
                </button>
                <h4>${R.icon} ${R.label}</h4>
                <span class="badge">${R.values.length}</span>
              </div>
            `;let re=document.createElement("div");re.className="issue-group-content",re.style.display="none";let ge=se.querySelector(".issue-group-toggle"),Te=()=>{te.classList.contains("collapsed")?(te.classList.remove("collapsed"),re.style.display="block",setTimeout(()=>{re.style.opacity="1"},10)):(re.style.opacity="0",setTimeout(()=>{te.classList.add("collapsed"),re.style.display="none"},200))};if(ge.onclick=K=>{K.stopPropagation(),Te()},se.onclick=K=>{K.target!==ge&&!ge.contains(K.target)&&Te()},te.appendChild(se),Array.isArray(R.values)&&R.values.length>0){let K=document.createElement("div");K.className="token-list",R.values.forEach((ne,Y)=>{let c=Y+1,ze=document.createElement("div");ze.className="token-item";let ie=ne.value,Ne=ne.nodes||[],X=Ne.length>0?Ne[0]:null,ft=typeof ne.totalNodes=="number"?ne.totalNodes:Ne.length,Re=ne.colorType||null,We="";if(P==="colors"){let Be=Re?`<span class="token-color-type">${d(Re)}</span>`:"";We=`
                  <span class="token-number">#${c}</span>
                  <span class="token-color-preview" style="background-color: ${d(ie)}"></span>
                  <code>${d(ie)}</code>
                  ${Be}
                `}else if(P==="gradients"){let Be=Re?`<span class="token-color-type">${d(Re)}</span>`:"";We=`
                  <span class="token-number">#${c}</span>
                  <span class="token-gradient-preview" style="background: ${d(ie)}"></span>
                  <code>${d(ie)}</code>
                  ${Be}
                `}else We=`<span class="token-number">#${c}</span><code>${d(String(ie))}</code>`;let He=ne._matchedBy||[],be=ne._matchedNodeNames||[],ht=He.includes("nodeName"),Ke="";X&&X.name&&(ht&&be.length>0?Ke=`<div class="token-node-name token-matched-by-name">
                    <span class="match-indicator">\u{1F50D} Matched in:</span> ${be.map(N=>`<span class="token-matched-node">${d(N)}</span>`).join(", ")}
                  </div>`:Ke=`<div class="token-node-name">Node: ${d(X.name)}</div>`);let st="";if(P==="fontWeight"){let N=Array.isArray(ne.fontFamilies)?ne.fontFamilies:null;if(!N){let U={};Ne.forEach(Q=>{let fe=Q&&Q.fontFamily?String(Q.fontFamily):"Unknown";U[fe]=(U[fe]||0)+1}),N=Object.entries(U).map(([Q,fe])=>({family:Q,count:fe})).sort((Q,fe)=>fe.count-Q.count||Q.family.localeCompare(fe.family))}Array.isArray(N)&&N.length>0&&(st=`
                    <div class="token-note">
                      <div class="token-note-label">Font-family:</div>
                      <ul class="token-note-list">${N.map(Q=>`<li><code>${d(Q.family)}</code> (${Q.count})</li>`).join("")}</ul>
                    </div>
                  `)}ze.innerHTML=`
                <div class="token-item-row">
                  <div class="token-value">
                    ${We}
                  </div>
                  ${X?`
                    <div class="token-actions">
                      <button class="btn-select" data-id="${X.id}">Select</button>
                      ${ft>1?`<span class="token-node-count">(${ft})</span>`:""}
                    </div>
                  `:""}
                </div>
                ${Ke}
                ${st}
              `;let it=ze.querySelector("button.btn-select");it&&(it.onclick=()=>{parent.postMessage({pluginMessage:{type:"select-node",id:X.id}},"*")}),K.appendChild(ze)}),re.appendChild(K)}else{let K=document.createElement("div");K.className="token-empty-message",K.textContent="No tokens in this group.",re.appendChild(K)}te.appendChild(re),ee.appendChild(te)}s||je({issues:S.issues,issuesTimestamp:S.timestamp,tokens:e,tokensTimestamp:a,lastActiveTab:"tokens",scanMode:S.scanMode||null,context:S.context||null})}function Le(e){let t=document.getElementById("validation-error"),o=document.getElementById("validation-error-message"),s=document.getElementById("btn-close-validation-error");t&&o&&(o.textContent=e,t.style.display="block",b.style.display="block",C.style.display="none",y.style.display="none",b.disabled=!1,v.disabled=!1,setTimeout(()=>{t.style.display==="block"&&(t.style.display="none")},1e4),s&&(s.onclick=()=>{t.style.display="none"}))}b.onclick=()=>{var e,t,o,s,n,l,i,a;console.log("btnScan clicked");try{let r=document.getElementById("validation-error");r&&(r.style.display="none"),b.style.display="none",C.style.display="block",y.style.display="block",k.style.transition="none",k.style.width="0%",w.textContent="0%",setTimeout(()=>{k.style.transition="width 0.3s"},10);let p=((e=document.querySelector('input[name="scope"]:checked'))==null?void 0:e.value)||"page",u=document.getElementById("spacing-scale"),f=document.getElementById("spacing-threshold"),m=document.getElementById("color-scale"),g=document.getElementById("font-size-scale"),h=document.getElementById("font-size-threshold"),x=document.getElementById("line-height-scale"),$=document.getElementById("line-height-threshold"),T=document.getElementById("line-height-baseline-threshold"),I=u?u.value.trim():"",P=f?parseInt(f.value,10):100,R=m?m.value.trim():"",te=g?g.value.trim():"",se=h?parseInt(h.value,10):100,re=x?x.value.trim():"",ge=$?parseInt($.value,10):300,Te=T?parseInt(T.value,10):120;if(I&&!/^\d+(\s*,\s*\d+)*$/.test(I)){Le("Spacing guidelines format is incorrect. Please enter the numbers separated by commas (e.g. 4, 8, 12, 16)");return}if(R){let K=R.split(",").map(c=>c.trim()).filter(c=>c),ne=/^#[0-9a-fA-F]{3,8}$/,Y=K.filter(c=>!ne.test(c));if(Y.length>0){Le(`Color format is incorrect. Invalid colors: ${Y.join(", ")}. Please use hex format only (e.g., #000000, #FFFFFF).`);return}}if(te&&!/^\d+(\s*,\s*\d+)*$/.test(te)){Le("Font-size scale format is incorrect. Please enter the numbers separated by commas (e.g. 32, 24, 20, 18)");return}if(re){let K=re.split(",").map(Y=>Y.trim()).filter(Y=>Y);if(!K.every(Y=>Y.toLowerCase()==="auto"||/^\d+$/.test(Y))||K.length===0){Le('Line-height scale format is incorrect. Please enter "auto" and/or numbers separated by commas. "auto" can be placed anywhere (e.g. auto, 100, 120 or 100, auto, 150)');return}}if(isNaN(P)||P<0){Le("Spacing threshold must be a number >= 0");return}if(isNaN(se)||se<0){Le("Font-size threshold must be a number >= 0");return}if(isNaN(ge)||ge<0){Le("Line-height threshold must be a number >= 0");return}if(isNaN(Te)||Te<0){Le("Line-height baseline threshold must be a number >= 0");return}oe.innerHTML=`
        <div class="scanning">
          <div class="spinner"></div>
          <p>Scanning design... Please wait</p>
        </div>
      `,Ie("issues"),b.disabled=!0,v.disabled=!0,S.scanMode=p,ae();let Fe={checkStyle:((t=document.getElementById("rule-typo-style"))==null?void 0:t.checked)||!1,checkFontFamily:((o=document.getElementById("rule-font-family"))==null?void 0:o.checked)||!1,checkFontSize:((s=document.getElementById("rule-font-size"))==null?void 0:s.checked)||!1,checkFontWeight:((n=document.getElementById("rule-font-weight"))==null?void 0:n.checked)||!1,checkLineHeight:((l=document.getElementById("rule-line-height"))==null?void 0:l.checked)||!1,checkLetterSpacing:((i=document.getElementById("rule-letter-spacing"))==null?void 0:i.checked)||!1,checkWordSpacing:((a=document.getElementById("rule-word-spacing"))==null?void 0:a.checked)||!1};parent.postMessage({pluginMessage:{type:"scan",mode:p,spacingScale:I,spacingThreshold:P,colorScale:R,fontSizeScale:te,fontSizeThreshold:se,lineHeightScale:re,lineHeightThreshold:ge,lineHeightBaselineThreshold:Te,typographyStyles:B,typographyRules:Fe,ignoredIssues:Z}},"*"),console.log("Message sent:",{type:"scan",mode:p})}catch(r){console.error("Error in btnScan.onclick:",r),oe.innerHTML=`<div class="error-message">Error: ${d(r.message)}</div>`,Ie("issues"),b.disabled=!1,v.disabled=!1}},v.onclick=()=>{var e;console.log("btnExtractTokens clicked");try{v.style.display="none",C.style.display="block",y.style.display="block",k.style.transition="none",k.style.width="0%",w.textContent="0%",setTimeout(()=>{k.style.transition="width 0.3s"},10);let t=((e=document.querySelector('input[name="scope"]:checked'))==null?void 0:e.value)||"page";ee.innerHTML=`
        <div class="scanning">
          <div class="spinner"></div>
          <p>Extracting design tokens... Please wait</p>
        </div>
      `,Ie("tokens"),b.disabled=!0,v.disabled=!0,S.scanMode=t,parent.postMessage({pluginMessage:{type:"extract-tokens",mode:t}},"*"),console.log("Message sent:",{type:"extract-tokens",mode:t})}catch(t){console.error("Error in btnExtractTokens.onclick:",t),ee.innerHTML=`<div class="error-message">Error: ${d(t.message)}</div>`,Ie("tokens"),b.disabled=!1,v.disabled=!1}},E.onclick=()=>{try{yn(S.tokens)}catch(e){console.error("Failed to fill spacing guidelines from tokens",e)}},z.onclick=()=>{try{let e=S.tokens;if(!e||!Array.isArray(e.colors)||!e.colors.length){alert("No color tokens found. Please run 'Extract Design Tokens' first.");return}let t=document.getElementById("color-scale");if(!t)return;let s=(e.colors||[]).map(l=>String(l&&l.value!==void 0?l.value:"").trim().toUpperCase()).filter(l=>l&&l.startsWith("#"));if(!s.length)return;let n=Array.from(new Set(s)).sort((l,i)=>Ue(l)-Ue(i));t.value=n.join(", "),typeof Se=="function"&&Se();try{t.focus(),t.setSelectionRange(t.value.length,t.value.length)}catch(l){}}catch(e){console.error("Failed to fill color from tokens",e)}},H.onclick=()=>{parent.postMessage({pluginMessage:{type:"extract-color-styles"}},"*")};let to=document.getElementById("btn-extract-color-variables");to&&(to.onclick=()=>{parent.postMessage({pluginMessage:{type:"extract-color-variables"}},"*")}),M.onclick=()=>{try{let e=S.tokens;if(!e||!Array.isArray(e.fontSize)||!e.fontSize.length){alert("No font size tokens found. Please run 'Extract Design Tokens' first.");return}let t=document.getElementById("font-size-scale");if(!t)return;let o=e.fontSize.map(n=>parseInt(String(n&&n.value!==void 0?n.value:"").trim(),10)).filter(n=>!isNaN(n));if(!o.length)return;let s=Array.from(new Set(o)).sort((n,l)=>l-n);t.value=s.join(", "),t.focus(),t.setSelectionRange(t.value.length,t.value.length)}catch(e){console.error("Failed to fill font size from tokens",e)}},A.onclick=()=>{try{let e=S.tokens;if(!e||!Array.isArray(e.lineHeight)||!e.lineHeight.length){alert("No line height tokens found. Please run 'Extract Design Tokens' first.");return}let t=document.getElementById("line-height-scale");if(!t)return;let o=[];if(e.lineHeight.forEach(a=>{let r=String(a&&a.value!==void 0?a.value:"").trim();if(r==="auto")o.push("auto");else{let p=parseFloat(r);isNaN(p)||o.push(p)}}),!o.length)return;let s=o.includes("auto"),n=o.filter(a=>a!=="auto"),l=Array.from(new Set(n)).sort((a,r)=>a-r),i=s?["auto",...l]:l;t.value=i.join(", "),t.focus(),t.setSelectionRange(t.value.length,t.value.length)}catch(e){console.error("Failed to fill line height from tokens",e)}},q.onclick=()=>{try{if(!B||!Array.isArray(B)||B.length===0){alert("No typography styles defined. Please add typography styles or extract from Figma first.");return}let e=document.getElementById("font-size-scale");if(!e)return;let t=B.map(s=>{let n=parseInt(String(s.fontSize||"").trim(),10);return isNaN(n)?null:n}).filter(s=>s!==null);if(!t.length){alert("No valid font sizes found in typography styles.");return}let o=Array.from(new Set(t)).sort((s,n)=>n-s);e.value=o.join(", "),ae(),e.focus(),e.setSelectionRange(e.value.length,e.value.length),console.log("Filled font size from typography:",o)}catch(e){console.error("Failed to fill font size from typography",e)}},L.onclick=()=>{try{if(!B||!Array.isArray(B)||B.length===0){alert("No typography styles defined. Please add typography styles or extract from Figma first.");return}let e=document.getElementById("line-height-scale");if(!e)return;let t=[];if(B.forEach(i=>{let a=String(i.lineHeight||"").trim();if(a==="auto")t.push("auto");else{let r=parseFloat(a.replace("%",""));isNaN(r)||t.push(r)}}),!t.length){alert("No valid line heights found in typography styles.");return}let o=t.includes("auto"),s=t.filter(i=>i!=="auto"),n=Array.from(new Set(s)).sort((i,a)=>i-a),l=o?["auto",...n]:n;e.value=l.join(", "),ae(),e.focus(),e.setSelectionRange(e.value.length,e.value.length),console.log("Filled line height from typography:",l)}catch(e){console.error("Failed to fill line height from typography",e)}};let Ct=document.getElementById("typography-panel"),oo=document.getElementById("typography-panel-header"),no=document.getElementById("typography-panel-toggle");oo&&Ct&&no&&(oo.onclick=()=>{let e=Ct.classList.contains("collapsed");Ct.classList.toggle("collapsed");let t=no.querySelector(".issue-group-toggle-icon");t&&(t.textContent="\u25B6")});let wt=document.getElementById("settings-panel"),lo=document.getElementById("settings-panel-header"),nt=document.getElementById("settings-panel-toggle");if(lo&&wt&&nt){let e=()=>{let t=wt.classList.contains("collapsed");wt.classList.toggle("collapsed");let o=nt.querySelector(".issue-group-toggle-icon");o&&(o.textContent="\u25B6")};lo.onclick=t=>{t.target===nt||nt.contains(t.target)||e()},nt.onclick=t=>{t.stopPropagation(),e()}}function It(){let e=document.getElementById("color-preview-panel"),t=document.getElementById("color-preview-panel-header"),o=document.getElementById("color-preview-panel-toggle");if(!e||!t||!o){console.log("Color preview panel elements not found, retrying..."),setTimeout(It,100);return}console.log("Setting up color preview panel toggle");let s=()=>{let n=e.classList.contains("collapsed");e.classList.toggle("collapsed");let l=o.querySelector(".issue-group-toggle-icon");l&&(l.textContent="\u25B6"),console.log("Color preview panel toggled, isCollapsed:",!n)};t.onclick=n=>{n.preventDefault(),n.stopPropagation(),console.log("Color preview panel header clicked"),s()},o.onclick=n=>{n.preventDefault(),n.stopPropagation(),console.log("Color preview panel toggle button clicked"),s()}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",It):It();function Se(){let e=document.getElementById("color-scale"),t=document.getElementById("color-preview");if(!e||!t)return;let o=e.value.trim();if(t.innerHTML="",!o)return;o.split(",").map(n=>n.trim()).filter(n=>n).forEach((n,l)=>{let i=/^#[0-9A-Fa-f]{3,8}$/.test(n),a=/^rgba?\(/.test(n);if(!i&&!a)return;let r=document.createElement("div");r.className="color-swatch-container";let p=document.createElement("div");p.className="color-swatch",p.style.background=n;let u=document.createElement("button");u.innerHTML="\xD7",u.className="color-swatch-close",u.onclick=function(h){h.stopPropagation();let $=e.value.split(",").map(T=>T.trim()).filter(T=>T).filter((T,I)=>I!==l);e.value=$.join(", "),Se(),typeof ae=="function"&&ae()};let f=n.toUpperCase(),m=D[f],g=document.createElement("div");g.className="color-swatch-label",m?g.innerHTML=`
          <div class="color-swatch-label-name">${d(m)}</div>
          <div class="color-swatch-label-hex">${d(f)}</div>
        `:g.innerHTML=`<div class="color-swatch-label-hex">${d(f)}</div>`,p.appendChild(u),r.appendChild(p),r.appendChild(g),t.appendChild(r)})}function fn(){var e,t,o,s,n,l;return{fontFamily:((e=document.getElementById("rule-font-family"))==null?void 0:e.checked)||!1,fontSize:((t=document.getElementById("rule-font-size"))==null?void 0:t.checked)||!1,fontWeight:((o=document.getElementById("rule-font-weight"))==null?void 0:o.checked)||!1,lineHeight:((s=document.getElementById("rule-line-height"))==null?void 0:s.checked)||!1,letterSpacing:((n=document.getElementById("rule-letter-spacing"))==null?void 0:n.checked)||!1,wordSpacing:((l=document.getElementById("rule-word-spacing"))==null?void 0:l.checked)||!1}}function Me(){let e=document.getElementById("typography-table-body"),t=document.querySelector("#typography-table thead tr");if(!e||!t)return;let o=fn(),s='<th class="typography-table-actions">Actions</th>';if(s+='<th class="typography-table-style-name" style="width: 120px;">Style Name</th>',o.fontFamily&&(s+='<th class="typography-table-font-family" style="width: 140px;">Font Family</th>'),o.fontSize&&(s+='<th class="typography-table-font-size" style="width: 80px;">Size (px)</th>'),o.fontWeight&&(s+='<th class="typography-table-font-weight" style="width: 100px;">Weight</th>'),o.lineHeight&&(s+='<th class="typography-table-line-height" style="width: 100px;">Line Height</th>'),o.letterSpacing&&(s+='<th class="typography-table-letter-spacing" style="width: 100px;">Letter Spacing</th>'),o.wordSpacing&&(s+='<th class="typography-table-word-spacing" style="width: 100px;">Word Spacing</th>'),t.innerHTML=s,B.length===0){let n=Object.values(o).filter(l=>l).length+2;e.innerHTML=`
        <tr>
          <td colspan="${n}" class="typography-empty-message">
            No typography styles defined. Click "Add Typography Style" to create one.
          </td>
        </tr>
      `;return}e.innerHTML=B.map(n=>{let l=`<tr data-id="${n.id}">`;return l+='<td class="typography-table-actions">',n.styleId&&(l+=`<button class="btn-table-action" onclick="selectTypographyStyle('${n.styleId}')" title="Select layer in Figma" style="background: #0071e3; color: white;">\u{1F441}</button>`),l+=`<button class="btn-table-action delete" onclick="deleteTypographyStyle(${n.id})" title="Delete">\u{1F5D1}</button>
        </td>`,l+=`<td><input type="text" value="${d(n.name)}" data-field="name"></td>`,o.fontFamily&&(l+=`<td><input type="text" value="${d(n.fontFamily)}" data-field="fontFamily"></td>`),o.fontSize&&(l+=`<td><input type="number" value="${n.fontSize}" data-field="fontSize" min="1"></td>`),o.fontWeight&&(l+=`<td>
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
        </td>`),o.lineHeight&&(l+=`<td><input type="text" value="${d(n.lineHeight)}" data-field="lineHeight" placeholder="120% or auto"></td>`),o.letterSpacing&&(l+=`<td><input type="text" value="${d(n.letterSpacing||"0")}" data-field="letterSpacing" placeholder="0 or 0.5px"></td>`),o.wordSpacing&&(l+=`<td><input type="text" value="${d(n.wordSpacing||"0")}" data-field="wordSpacing" placeholder="0"></td>`),l+="</tr>",l}).join(""),e.querySelectorAll("input, select").forEach(n=>{n.addEventListener("change",l=>{let i=l.target.closest("tr"),a=parseInt(i.dataset.id),r=l.target.dataset.field,p=l.target.value;hn(a,r,p)})})}window.addTypographyStyle=function(){let e={id:ve++,name:"New Style",fontFamily:"Inter",fontSize:16,fontWeight:"Regular",lineHeight:"150%",letterSpacing:"0",wordSpacing:"0"};B.push(e),Me(),ae()};function hn(e,t,o){let s=B.find(n=>n.id===e);s&&(t==="fontSize"?s[t]=parseInt(o)||16:s[t]=o,ae())}window.deleteTypographyStyle=function(e){confirm("Delete this typography style?")&&(B=B.filter(t=>t.id!==e),Me(),ae())},window.selectTypographyStyle=function(e){parent.postMessage({pluginMessage:{type:"select-text-style",styleId:e}},"*")};let so=document.getElementById("btn-add-typo-style");so&&(so.onclick=()=>addTypographyStyle());let io=document.getElementById("btn-extract-typo-desktop");io&&(io.onclick=()=>{parent.postMessage({pluginMessage:{type:"extract-typography-styles",mode:"desktop"}},"*")});let ao=document.getElementById("btn-extract-typo-tablet");ao&&(ao.onclick=()=>{parent.postMessage({pluginMessage:{type:"extract-typography-styles",mode:"tablet"}},"*")});let ro=document.getElementById("btn-extract-typo-mobile");ro&&(ro.onclick=()=>{parent.postMessage({pluginMessage:{type:"extract-typography-styles",mode:"mobile"}},"*")});let co=document.getElementById("btn-extract-typo-all");co&&(co.onclick=()=>{parent.postMessage({pluginMessage:{type:"extract-typography-styles",mode:"all"}},"*")});let po=document.getElementById("btn-reset-typo-table");po&&(po.onclick=()=>{confirm(`\u26A0\uFE0F Reset typography table to default styles?

This will:
\u2022 Clear all current styles
\u2022 Restore default H1-H6 and Body styles

This action cannot be undone.`)&&(B=[{id:1,name:"H1",fontFamily:"Inter",fontSize:48,fontWeight:"Bold",lineHeight:"120%",letterSpacing:"0",wordSpacing:"0"},{id:2,name:"H2",fontFamily:"Inter",fontSize:36,fontWeight:"Bold",lineHeight:"130%",letterSpacing:"0",wordSpacing:"0"},{id:3,name:"H3",fontFamily:"Inter",fontSize:30,fontWeight:"Semi Bold",lineHeight:"130%",letterSpacing:"0",wordSpacing:"0"},{id:4,name:"H4",fontFamily:"Inter",fontSize:24,fontWeight:"Semi Bold",lineHeight:"140%",letterSpacing:"0",wordSpacing:"0"},{id:5,name:"H5",fontFamily:"Inter",fontSize:20,fontWeight:"Semi Bold",lineHeight:"140%",letterSpacing:"0",wordSpacing:"0"},{id:6,name:"H6",fontFamily:"Inter",fontSize:16,fontWeight:"Semi Bold",lineHeight:"150%",letterSpacing:"0",wordSpacing:"0"},{id:7,name:"Body",fontFamily:"Inter",fontSize:14,fontWeight:"Regular",lineHeight:"150%",letterSpacing:"0",wordSpacing:"0"}],ve=8,Me(),ae(),alert("\u2705 Typography table has been reset to default styles!"))}),Me(),["rule-font-family","rule-font-size","rule-font-weight","rule-line-height","rule-letter-spacing","rule-word-spacing"].forEach(e=>{let t=document.getElementById(e);t&&t.addEventListener("change",()=>{Me(),ae()})});let uo=document.getElementById("color-scale");uo&&(uo.addEventListener("input",()=>{Se()}),Se());let bn=qo({maxHistory:10,postPluginMessage:e=>parent.postMessage({pluginMessage:e},"*"),getCurrentReportData:()=>S,setIsViewingTokens:e=>{ot=!!e},renderResults:Ae,renderTokens:ut}),{saveScanHistory:go,requestScanHistory:mo,renderScanHistory:$t,restoreReportFromHistory:Nn,loadLastScanModeOnce:vn,setHistory:xn,clearLocalHistory:Sn}=bn,kn=document.getElementById("export-group"),gt=document.getElementById("export-dropdown");W.onclick=e=>{e.stopPropagation(),gt.style.display=gt.style.display==="block"?"none":"block"},document.querySelectorAll(".export-option").forEach(e=>{e.onclick=t=>{t.stopPropagation();let o=e.getAttribute("data-format");Ho({format:o,reportData:S,getTypeDisplayName:dt}),gt.style.display="none"}}),document.addEventListener("click",e=>{kn.contains(e.target)||(gt.style.display="none")});let $e,he,ce,Je;function mt(){console.log("applyFilters called",{isViewingTokens:ot,hasTokens:!!S.tokens,hasIssues:!!S.issues,currentFilter:xe,currentSearch:de,currentColorTypeFilter:Ee}),ot&&S.tokens?(console.log("Applying filters to tokens"),ut(S.tokens,!1)):S.issues&&(console.log("Applying filters to issues"),Ae(S.issues,!1))}function Et(){if(console.log("setupFilterHandlers called"),$e=document.getElementById("search-input"),he=document.getElementById("btn-clear-search"),ce=document.querySelectorAll(".filter-btn"),Je=document.getElementById("color-type-select"),console.log("Elements found:",{searchInput:!!$e,btnClearSearch:!!he,filterButtons:ce?ce.length:0,colorTypeSelect:!!Je}),!$e||!he||!ce||ce.length===0){console.warn("Filter elements not found, retrying...",{searchInput:!!$e,btnClearSearch:!!he,filterButtons:ce?ce.length:0}),setTimeout(Et,100);return}console.log("Setting up search input handler"),$e.addEventListener("input",e=>{let t=e.target.value;console.log("Search input changed:",t),de=t,console.log("currentSearch set to:",de),he&&(he.style.display=de.trim()?"block":"none"),mt()}),he&&(console.log("Setting up clear search button handler"),he.onclick=e=>{console.log("Clear search clicked"),e.preventDefault(),e.stopPropagation(),$e&&($e.value=""),de="",he.style.display="none",mt()}),console.log("Setting up filter buttons handlers, count:",ce.length),ce.forEach((e,t)=>{console.log(`Setting up filter button ${t}:`,e.getAttribute("data-filter")),e.onclick=o=>{o.preventDefault(),o.stopPropagation();let s=e.getAttribute("data-filter"),n=e.classList.contains("active");console.log("Filter button clicked:",s,"isActive:",n),n&&s!=="all"?(e.classList.remove("active"),xe="all",ce.forEach(l=>{l.getAttribute("data-filter")==="all"&&l.classList.add("active")})):(ce.forEach(l=>l.classList.remove("active")),e.classList.add("active"),xe=s),console.log("currentFilter set to:",xe),mt()}}),Je&&(console.log("Setting up color type select handler"),Je.addEventListener("change",e=>{console.log("Color type changed:",e.target.value),Ee=e.target.value,mt()})),console.log("Filter handlers setup complete")}console.log("Setting up filter handlers, DOM readyState:",document.readyState),document.readyState==="loading"?(console.log("DOM still loading, waiting for DOMContentLoaded"),document.addEventListener("DOMContentLoaded",()=>{console.log("DOMContentLoaded fired, setting up handlers"),Et(),tt(),rt(),mo()})):(console.log("DOM already ready, setting up handlers immediately"),Et(),tt(),rt(),mo()),G&&(C.onclick=()=>{console.log("Cancel operation clicked"),parent.postMessage({pluginMessage:{type:"cancel-scan"}},"*"),b.style.display="block",b.disabled=!1,v.style.display="block",v.disabled=!1,C.style.display="none",y.style.display="none"},me.onclick=()=>{if(confirm(`\u26A0\uFE0F Are you sure you want to reset all settings to default and clear history?

This will:
\u2022 Reset all input values to default
\u2022 Clear scan history
\u2022 Clear current reports

This action cannot be undone.`)){document.getElementById("spacing-scale").value="0, 4, 8, 12, 16, 24, 32, 40, 48, 64, 72, 80, 88, 96",document.getElementById("spacing-threshold").value="100",document.getElementById("color-scale").value="",document.getElementById("font-size-scale").value="32, 24, 20, 18, 16, 14, 12",document.getElementById("font-size-threshold").value="100",document.getElementById("line-height-scale").value="auto, 100, 110, 120, 130, 140, 150, 160, 170",document.getElementById("line-height-threshold").value="300",document.getElementById("line-height-baseline-threshold").value="120",B=[{id:1,name:"H1",fontFamily:"Inter",fontSize:48,fontWeight:"Bold",lineHeight:"120%",letterSpacing:"0",wordSpacing:"0"},{id:2,name:"H2",fontFamily:"Inter",fontSize:36,fontWeight:"Bold",lineHeight:"130%",letterSpacing:"0",wordSpacing:"0"},{id:3,name:"H3",fontFamily:"Inter",fontSize:30,fontWeight:"Semi Bold",lineHeight:"130%",letterSpacing:"0",wordSpacing:"0"},{id:4,name:"H4",fontFamily:"Inter",fontSize:24,fontWeight:"Semi Bold",lineHeight:"140%",letterSpacing:"0",wordSpacing:"0"},{id:5,name:"H5",fontFamily:"Inter",fontSize:20,fontWeight:"Semi Bold",lineHeight:"140%",letterSpacing:"0",wordSpacing:"0"},{id:6,name:"H6",fontFamily:"Inter",fontSize:16,fontWeight:"Semi Bold",lineHeight:"150%",letterSpacing:"0",wordSpacing:"0"},{id:7,name:"Body",fontFamily:"Inter",fontSize:14,fontWeight:"Regular",lineHeight:"150%",letterSpacing:"0",wordSpacing:"0"}],ve=8,Me(),document.getElementById("rule-typo-style").checked=!0,document.getElementById("rule-font-family").checked=!0,document.getElementById("rule-font-size").checked=!0,document.getElementById("rule-font-weight").checked=!0,document.getElementById("rule-line-height").checked=!0,document.getElementById("rule-letter-spacing").checked=!1,document.getElementById("rule-word-spacing").checked=!1,Me(),Se(),S={issues:null,tokens:null,scanMode:null,timestamp:null,context:null,lastActiveTab:"issues"},ct("issues"),ct("tokens"),Ie("issues"),Sn(),parent.postMessage({pluginMessage:{type:"clear-history"}},"*");let e=document.getElementById("history-panel");e&&e.style.display!=="none"&&$t(),ae(),alert("\u2705 All settings have been reset to default and history has been cleared!")}},G.onclick=()=>{let e=document.getElementById("history-panel");if(e){let t=e.style.display!=="none";e.style.display=t?"none":"flex",t||$t()}}),V&&(V.onclick=()=>{let e=document.getElementById("history-panel");e&&(e.style.display="none")});let yo=document.getElementById("btn-save-settings"),ke=document.getElementById("save-settings-modal"),le=document.getElementById("setting-name-input"),yt=document.getElementById("btn-confirm-save-settings"),fo=document.getElementById("btn-cancel-save-settings"),ho=document.getElementById("btn-close-save-settings");yo&&(yo.onclick=()=>{parent.postMessage({pluginMessage:{type:"get-project-name"}},"*"),ke&&(ke.style.display="flex",le&&(le.value="",le.focus(),le.onkeydown=e=>{e.key==="Enter"&&(e.preventDefault(),yt&&yt.click())}))}),ho&&(ho.onclick=()=>{ke&&(ke.style.display="none")}),fo&&(fo.onclick=()=>{ke&&(ke.style.display="none")});let pe=document.getElementById("replace-confirm-modal"),bo=document.getElementById("replace-setting-name"),vo=document.getElementById("btn-confirm-replace"),xo=document.getElementById("btn-cancel-replace"),So=document.getElementById("btn-close-replace-confirm"),ue=null;function ko(e,t){parent.postMessage({pluginMessage:{type:"save-settings",name:e,values:t,forceReplace:!0}},"*")}yt&&(yt.onclick=()=>{var o,s,n,l,i,a,r,p,u,f,m,g,h,x,$,T;let e=(o=le==null?void 0:le.value)==null?void 0:o.trim();if(!e){alert("\u26A0\uFE0F Please enter a setting name");return}let t={spacingScale:((s=document.getElementById("spacing-scale"))==null?void 0:s.value)||"",spacingThreshold:((n=document.getElementById("spacing-threshold"))==null?void 0:n.value)||"100",colorScale:((l=document.getElementById("color-scale"))==null?void 0:l.value)||"",colorNameMap:D,ignoredIssues:Z,fontSizeScale:((i=document.getElementById("font-size-scale"))==null?void 0:i.value)||"",fontSizeThreshold:((a=document.getElementById("font-size-threshold"))==null?void 0:a.value)||"100",lineHeightScale:((r=document.getElementById("line-height-scale"))==null?void 0:r.value)||"",lineHeightThreshold:((p=document.getElementById("line-height-threshold"))==null?void 0:p.value)||"300",lineHeightBaselineThreshold:((u=document.getElementById("line-height-baseline-threshold"))==null?void 0:u.value)||"120",typographyStyles:B,typographyRules:{checkStyle:((f=document.getElementById("rule-typo-style"))==null?void 0:f.checked)||!0,checkFontFamily:((m=document.getElementById("rule-font-family"))==null?void 0:m.checked)||!0,checkFontSize:((g=document.getElementById("rule-font-size"))==null?void 0:g.checked)||!0,checkFontWeight:((h=document.getElementById("rule-font-weight"))==null?void 0:h.checked)||!0,checkLineHeight:((x=document.getElementById("rule-line-height"))==null?void 0:x.checked)||!0,checkLetterSpacing:(($=document.getElementById("rule-letter-spacing"))==null?void 0:$.checked)||!1,checkWordSpacing:((T=document.getElementById("rule-word-spacing"))==null?void 0:T.checked)||!1}};ue={name:e,values:t},parent.postMessage({pluginMessage:{type:"check-setting-name",name:e}},"*")}),vo&&(vo.onclick=()=>{ue&&(ko(ue.name,ue.values),ue=null),pe&&(pe.style.display="none")}),xo&&(xo.onclick=()=>{ue=null,pe&&(pe.style.display="none"),le&&(le.focus(),le.select())}),So&&(So.onclick=()=>{ue=null,pe&&(pe.style.display="none"),le&&(le.focus(),le.select())}),pe&&(pe.onclick=e=>{e.target===pe&&(ue=null,pe.style.display="none",le&&(le.focus(),le.select()))});let Co=document.getElementById("btn-load-settings"),Ce=document.getElementById("load-settings-modal"),lt=document.getElementById("settings-list"),Mt=document.getElementById("settings-empty-state"),wo=document.getElementById("btn-close-load-settings");function Io(e){if(!(!lt||!Mt)){if(!e||e.length===0){lt.innerHTML="",Mt.style.display="block";return}Mt.style.display="none",lt.innerHTML=e.map(t=>{let o=new Date(t.updatedAt||t.createdAt),s=o.toLocaleDateString()+" "+o.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});return`
        <div class="settings-item" data-setting-name="${d(t.name)}">
          <div class="settings-item-info">
            <div class="settings-item-name">${d(t.name)}</div>
            <div class="settings-item-date">Updated: ${s}</div>
          </div>
          <div class="settings-item-actions">
            <button class="btn-remove-setting" data-setting-name="${d(t.name)}" title="Remove">\u{1F5D1}\uFE0F</button>
          </div>
        </div>
      `}).join(""),lt.querySelectorAll(".settings-item").forEach(t=>{let o=t.getAttribute("data-setting-name");t.onclick=s=>{s.target.closest(".btn-remove-setting")||(parent.postMessage({pluginMessage:{type:"load-settings",name:o}},"*"),Ce&&(Ce.style.display="none"))}}),lt.querySelectorAll(".btn-remove-setting").forEach(t=>{t.onclick=o=>{o.stopPropagation();let s=t.getAttribute("data-setting-name");confirm(`\u26A0\uFE0F Are you sure you want to remove "${s}"?`)&&parent.postMessage({pluginMessage:{type:"remove-settings",name:s}},"*")}})}}Co&&(Co.onclick=()=>{parent.postMessage({pluginMessage:{type:"get-saved-settings"}},"*"),Ce&&(Ce.style.display="flex")}),wo&&(wo.onclick=()=>{Ce&&(Ce.style.display="none")}),ke&&(ke.onclick=e=>{e.target===ke&&(ke.style.display="none")}),Ce&&(Ce.onclick=e=>{e.target===Ce&&(Ce.style.display="none")}),j.onclick=()=>{parent.postMessage({pluginMessage:{type:"close"}},"*")},window.onmessage=e=>{var o,s;console.log("Received message:",e.data);let t=e.data.pluginMessage;if(t&&t.type==="fix-issue-result"){if(console.log("[fix-issue-result] Received:",{issueId:t.issueId,success:t.success,message:t.message}),_(t.issueId,t.message,t.success),!t.success){console.log("[fix-issue-result] Error detected, showing error modal...");let n=t.message||"An error occurred while fixing the issue.";console.log("[fix-issue-result] Error message:",n);try{Tt(n),console.log("[fix-issue-result] Error modal should be displayed")}catch(l){console.error("[fix-issue-result] Error showing error modal:",l),alert("Error: "+n)}}if(t.success){if(console.log("[fix-issue-result] Starting remove process for issueId:",t.issueId),console.log("[fix-issue-result] issueId type:",typeof t.issueId,"value:",t.issueId),S&&S.issues){let u=S.issues.length;S.issues=S.issues.filter(m=>String(m.id)!==String(t.issueId));let f=u-S.issues.length;console.log("[fix-issue-result] Removed",f,"issue(s) from data. Remaining issues:",S.issues.length)}let n=`.issue[data-issue-id="${t.issueId}"]`;console.log("[fix-issue-result] Trying selector1:",n);let l=document.querySelectorAll(n);console.log("[fix-issue-result] Found",l.length,"issue element(s) with this ID");let i=`button.btn-fix[data-id="${t.issueId}"]`,a=`button.btn-suggest-fix[data-id="${t.issueId}"]`;[...document.querySelectorAll(i),...document.querySelectorAll(a)].forEach(u=>{let f=u.closest(".issue");f&&!Array.from(l).includes(f)&&l.push(f)});let p=Array.from(new Set(Array.from(l)));if(console.log("[fix-issue-result] Total unique issue elements to remove:",p.length),p.length>0){let u=new Map;p.forEach((f,m)=>{console.log(`[fix-issue-result] Issue element ${m}:`,f),console.log(`[fix-issue-result] Issue element ${m} data-issue-id:`,f.getAttribute("data-issue-id")),console.log(`[fix-issue-result] Issue element ${m} data-issue-type:`,f.getAttribute("data-issue-type"));let g=f.closest(".issue-group");if(g){let h=g.getAttribute("data-issue-type");if(!u.has(h)){let $=g.querySelector(".badge");if($){let T=parseInt($.textContent)||0;u.set(h,{groupEl:g,badge:$,currentCount:T,removeCount:0})}}let x=u.get(h);x&&x.removeCount++}}),p.forEach((f,m)=>{f.style.transition="opacity 0.3s ease-out",f.style.opacity="0",setTimeout(()=>{f.parentNode&&(console.log(`[fix-issue-result] Removing element ${m} from DOM...`),f.remove())},300)}),setTimeout(()=>{let f=document.querySelectorAll(n);console.log("[fix-issue-result] After remove, remaining elements:",f.length),u.forEach((m,g)=>{let h=Math.max(0,m.currentCount-m.removeCount);m.badge.textContent=h,console.log(`[fix-issue-result] Updated badge for group "${g}" from ${m.currentCount} to ${h}`),h===0&&(m.groupEl.style.display="none",console.log(`[fix-issue-result] Hiding group "${g}" (no issues left)`))}),console.log("[fix-issue-result] Calling updateIssueCounts()..."),_e(),console.log("[fix-issue-result] updateIssueCounts() completed"),console.log("[fix-issue-result] Re-rendering issues to sync UI..."),S&&S.issues&&Ae(S.issues,!1)},350)}else console.log("[fix-issue-result] No issue elements found! Trying to update counts anyway..."),_e(),S&&S.issues&&Ae(S.issues,!1)}return}if(t&&t.type==="create-text-style-result"){_(t.issueId,t.message,t.success),t.success&&setTimeout(()=>{var l;let n=document.querySelector(`.issue[data-issue-id="${t.issueId}"]`)||((l=document.querySelector(`button.btn-create-style[data-id="${t.issueId}"]`))==null?void 0:l.closest(".issue"));n&&(n.style.transition="opacity 0.5s ease-out",n.style.opacity="0",setTimeout(()=>{if(n.parentNode){n.remove();let i=n.closest(".issue-group");if(i){let a=i.querySelector(".badge");if(a){let r=parseInt(a.textContent)||0,p=Math.max(0,r-1);a.textContent=p,p===0&&(i.style.display="none")}}}},500))},5e3);return}if(t&&t.type==="components-for-issue-loaded"){console.log("=== [components-for-issue-loaded] HANDLER CALLED ==="),console.log("[components-for-issue-loaded] Received message",t);let n=window.pendingComponentIssue;if(console.log("[components-for-issue-loaded] Pending issue:",n,"Message issueId:",t.issueId),console.log("[components-for-issue-loaded] Similar components:",t.similarComponents),n){let l=document.querySelector(`.issue[data-issue-id="${n.id}"]`);if(l){let i=l.querySelector("button.btn-suggest-fix");i&&(i.disabled=!1,i.style.opacity="1",i.style.cursor="pointer",i.dataset.originalText&&(i.textContent=i.dataset.originalText,delete i.dataset.originalText))}}if(t.similarComponents&&t.similarComponents.length>0){console.log("[components-for-issue-loaded] Showing suggest modal with",t.similarComponents.length,"similar components");let l=n||{id:t.issueId,nodeName:"Unnamed"};try{tn(l,t.similarComponents),console.log("[components-for-issue-loaded] Modal function called successfully")}catch(i){console.error("[components-for-issue-loaded] Error showing modal:",i),alert("Error showing component suggestion modal: "+i.message)}window.pendingComponentIssue=null;return}else{console.warn("[components-for-issue-loaded] No similar components found"),alert("No similar components found. Please use 'Select Component' to choose from all components or 'Create New Component' to create a new one."),window.pendingComponentIssue=null;return}}if(t&&t.type==="all-components-loaded"){console.log("=== [all-components-loaded] HANDLER CALLED ==="),console.log("[all-components-loaded] Received message",t);let n=window.pendingSelectComponentIssue;if(console.log("[all-components-loaded] Pending issue:",n),console.log("[all-components-loaded] Message issueId:",t.issueId,typeof t.issueId),console.log("[all-components-loaded] Pending issueId:",n==null?void 0:n.id,typeof(n==null?void 0:n.id)),console.log("[all-components-loaded] Components:",t.components),console.log("[all-components-loaded] Components length:",t.components?t.components.length:0),n){let l=document.querySelector(`.issue[data-issue-id="${n.id}"]`);if(l){let i=l.querySelector("button.btn-select-component");i&&(i.disabled=!1,i.style.opacity="1",i.style.cursor="pointer",i.dataset.originalText&&(i.textContent=i.dataset.originalText,delete i.dataset.originalText))}}if(t.components&&t.components.length>0){console.log("[all-components-loaded] \u2713 Showing select modal with",t.components.length,"components");let l=n||{id:t.issueId,nodeName:"Unnamed"};console.log("[all-components-loaded] Issue to use:",l),console.log("[all-components-loaded] Calling showComponentSelectModal...");try{on(l,t.components),console.log("[all-components-loaded] \u2713 Modal function called successfully")}catch(i){console.error("[all-components-loaded] \u2717 Error showing modal:",i),console.error("[all-components-loaded] Error stack:",i.stack),alert("Error showing component selection modal: "+i.message)}window.pendingSelectComponentIssue=null;return}else{console.warn("[all-components-loaded] \u2717 No components available"),alert("No components found. Please use 'Create New Component' to create a new one."),window.pendingSelectComponentIssue=null;return}}if(t&&t.type==="figma-text-styles-loaded"){let n=window.pendingSuggestTextSizeIssue;if(n&&n.id===t.issueId){let p=n.fontSize||12,u=(t.styles||[]).filter(g=>g.fontSize>=14);if(u.length===0){let g=Pe(n);g?pt(n,p,g,null,null):alert("No suitable text size match found (need >= 14px for ADA compliance). Please add font sizes to Font Size input or create text styles in Figma."),window.pendingSuggestTextSizeIssue=null;return}let f=null,m=1/0;u.forEach(g=>{let h=Math.abs(g.fontSize-p);h<m&&(m=h,f=g)}),f?pt(n,p,f.fontSize,null,f):alert("No suitable text style found (need >= 14px for ADA compliance)"),window.pendingSuggestTextSizeIssue=null;return}let l=window.pendingTextSizeIssue;if(l&&l.id===t.issueId){ln(l,t.styles||[]),window.pendingTextSizeIssue=null;return}let i=window.pendingTypographyStyleIssue;if(i&&i.id===t.issueId){if(t.error||!t.styles||t.styles.length===0){let p=document.querySelector(`.issue[data-issue-id="${t.issueId}"]`);if(p){let u=p.querySelector("button.btn-fix"),f=p.querySelector("button.btn-suggest-fix");u&&(u.style.display="none"),f&&(f.style.display="none")}window.pendingTypographyStyleIssue=null;return}Vt(i,t.styles||[]),window.pendingTypographyStyleIssue=null;return}let a=window.pendingTypographyCheckIssue;if(a&&a.id===t.issueId){if(t.error||!t.styles||t.styles.length===0){let p=document.querySelector(`.issue[data-issue-id="${t.issueId}"]`);if(p){let u=p.querySelector("button.btn-style-dropdown"),f=p.querySelector("button.btn-suggest-fix");u&&(u.style.display="none"),f&&(f.style.display="none")}window.pendingTypographyCheckIssue=null;return}Vt(a,t.styles||[]),window.pendingTypographyCheckIssue=null;return}let r=document.querySelector(`.style-dropdown-menu[data-issue-id="${t.issueId}"]`);if(r){let p=r.closest(".issue"),u=p?p.getAttribute("data-issue-id"):null,f=p?p.getAttribute("data-issue-type"):null;if(t.error){r.innerHTML=`<div style="padding: 8px 12px; color: #dc3545; font-size: 12px;">Error: ${d(t.error)}</div>`;let m=p?p.querySelector("button.btn-style-dropdown"):null;m&&(m.style.display="none");let g=p?p.querySelector("button.btn-suggest-fix"):null;g&&(f==="typography-style"||f==="typography-check")&&(g.style.display="none")}else if(t.styles&&t.styles.length>0){let m=null;if(u&&S&&S.issues){let g=S.issues.find(h=>h.id===u);g&&g.bestMatch&&(m=g.bestMatch.name)}r.innerHTML=t.styles.map(g=>`
            <div class="style-dropdown-item" data-issue-id="${t.issueId}" data-style-id="${g.id}" data-style-name="${d(g.name)}" style="padding: 8px 12px; cursor: pointer; font-size: 12px; ${m===g.name?"background: #e3f2fd; font-weight: 600;":""}" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='${m===g.name?"#e3f2fd":"white"}'">
              ${d(g.name)} ${m===g.name?"\u2B50":""}
            </div>
          `).join(""),r.querySelectorAll(".style-dropdown-item").forEach(g=>{g.onclick=h=>{h.preventDefault(),h.stopPropagation();try{let T=g.getAttribute("data-issue-id");T&&parent.postMessage({pluginMessage:{type:"select-node",id:T}},"*")}catch(T){console.error("Failed to auto-select node for style dropdown item:",T)}let x=g.getAttribute("data-style-id"),$=g.getAttribute("data-style-name");if(p&&S&&S.issues){let T=S.issues.find(I=>I.id===u);if(T){let I=t.styles.find(P=>P.id===x);I&&(r.style.display="none",Qt(T,I))}}}})}else{r.innerHTML='<div style="padding: 8px 12px; color: #999; font-size: 12px;">No text styles found in Figma</div>';let m=p?p.querySelector("button.btn-style-dropdown"):null;m&&(m.style.display="none");let g=p?p.querySelector("button.btn-suggest-fix"):null;g&&(f==="typography-style"||f==="typography-check")&&(g.style.display="none")}}return}if(t&&t.type==="contrast-colors-loaded"){let n=window.pendingContrastIssue;n&&n.id===t.issueId&&(sn(n,t.colors||[]),window.pendingContrastIssue=null);return}if(t&&t.type==="apply-typography-style-result"){if(_(t.issueId,t.message,t.success),t.success||Tt(t.message||"An error occurred while applying the style."),t.success){if(console.log("[apply-typography-style-result] Starting remove process for issueId:",t.issueId),console.log("[apply-typography-style-result] issueId type:",typeof t.issueId,"value:",t.issueId),S&&S.issues){let f=S.issues.length;S.issues=S.issues.filter(g=>String(g.id)!==String(t.issueId));let m=f-S.issues.length;console.log("[apply-typography-style-result] Removed",m,"issue(s) from data. Remaining issues:",S.issues.length)}let n=`.issue[data-issue-id="${t.issueId}"]`;console.log("[apply-typography-style-result] Trying selector1:",n);let l=document.querySelectorAll(n);console.log("[apply-typography-style-result] Found",l.length,"issue element(s) with this ID");let i=`button.btn-suggest-apply[data-id="${t.issueId}"]`,a=`button.btn-fix[data-id="${t.issueId}"]`,r=`button.btn-suggest-fix[data-id="${t.issueId}"]`;[...document.querySelectorAll(i),...document.querySelectorAll(a),...document.querySelectorAll(r)].forEach(f=>{let m=f.closest(".issue");m&&!Array.from(l).includes(m)&&l.push(m)});let u=Array.from(new Set(Array.from(l)));if(console.log("[apply-typography-style-result] Total unique issue elements to remove:",u.length),u.length>0){let f=new Map;u.forEach((m,g)=>{console.log(`[apply-typography-style-result] Issue element ${g}:`,m),console.log(`[apply-typography-style-result] Issue element ${g} data-issue-id:`,m.getAttribute("data-issue-id")),console.log(`[apply-typography-style-result] Issue element ${g} data-issue-type:`,m.getAttribute("data-issue-type"));let h=m.closest(".issue-group");if(h){let x=h.getAttribute("data-issue-type");if(!f.has(x)){let T=h.querySelector(".badge");if(T){let I=parseInt(T.textContent)||0;f.set(x,{groupEl:h,badge:T,currentCount:I,removeCount:0})}}let $=f.get(x);$&&$.removeCount++}}),u.forEach((m,g)=>{m.style.transition="opacity 0.3s ease-out",m.style.opacity="0",setTimeout(()=>{m.parentNode&&(console.log(`[apply-typography-style-result] Removing element ${g} from DOM...`),m.remove())},300)}),setTimeout(()=>{let m=document.querySelectorAll(n);console.log("[apply-typography-style-result] After remove, remaining elements:",m.length),f.forEach((g,h)=>{let x=Math.max(0,g.currentCount-g.removeCount);g.badge.textContent=x,console.log(`[apply-typography-style-result] Updated badge for group "${h}" from ${g.currentCount} to ${x}`),x===0&&(g.groupEl.style.display="none",console.log(`[apply-typography-style-result] Hiding group "${h}" (no issues left)`))}),console.log("[apply-typography-style-result] Calling updateIssueCounts()..."),_e(),console.log("[apply-typography-style-result] updateIssueCounts() completed"),console.log("[apply-typography-style-result] Re-rendering issues to sync UI..."),S&&S.issues&&Ae(S.issues,!1)},350)}else console.log("[apply-typography-style-result] No issue elements found! Trying to update counts anyway..."),_e(),S&&S.issues&&Ae(S.issues,!1)}return}if(t&&t.type==="scan-progress"){k&&w&&(k.style.width=t.progress+"%",w.textContent=t.progress+"% ("+t.current+"/"+t.total+")");return}if(t&&t.type==="last-report"){t.report?Po(t.report):console.log("No last report stored");return}if(t&&t.type==="history-data"){xn(t.history),vn();let n=document.getElementById("history-panel");n&&n.style.display!=="none"&&$t();return}if(t&&t.type==="input-values-data"){t.values?(Oe(t.values),console.log("Restored input values:",t.values)):console.log("No saved input values to restore");return}if(t&&t.type==="project-name"){le&&(le.value=t.name||"");return}if(t&&t.type==="check-setting-name-result"){t.exists?(bo&&ue&&(bo.textContent=t.name||ue.name),pe&&(pe.style.display="flex")):ue&&(ko(ue.name,ue.values),ue=null);return}if(t&&t.type==="save-settings-result"){t.success?(pe&&(pe.style.display="none"),ke&&(ke.style.display="none"),le&&(le.value=""),ue=null,Ce&&Ce.style.display!=="none"&&parent.postMessage({pluginMessage:{type:"get-saved-settings"}},"*")):(alert("\u274C Failed to save settings: "+(t.error||"Unknown error")),pe&&(pe.style.display="none"),ue=null);return}if(t&&t.type==="saved-settings-list"){Io(t.settings||[]);return}if(t&&t.type==="load-settings-result"){t.success&&t.values?(Oe(t.values),ae()):alert("\u274C Failed to load settings: "+(t.error||"Unknown error"));return}if(t&&t.type==="remove-settings-result"){t.success?Io(t.settings||[]):alert("\u274C Failed to remove settings: "+(t.error||"Unknown error"));return}if(t&&t.type==="report"){b.style.display="block",b.disabled=!1,C.style.display="none",y.style.display="none",v.disabled=!1;let n=t.issues||[];S.context=t.context||null,Ae(n);let l=((o=document.querySelector('input[name="scope"]:checked'))==null?void 0:o.value)||"page";go(l,"issues",{issues:n},t.context||null)}if(t&&t.type==="tokens-report")if(v.style.display="block",v.disabled=!1,C.style.display="none",y.style.display="none",b.disabled=!1,t.error)ee.innerHTML=`<div class="error-message">Error: ${d(t.error)}</div>`,Ie("tokens");else{S.context=t.context||null,ut(t.tokens),E.disabled=!(t.tokens&&Array.isArray(t.tokens.spacing)&&t.tokens.spacing.length>0),z.disabled=!(t.tokens&&Array.isArray(t.tokens.colors)&&t.tokens.colors.length>0),M.disabled=!(t.tokens&&Array.isArray(t.tokens.fontSize)&&t.tokens.fontSize.length>0),A.disabled=!(t.tokens&&Array.isArray(t.tokens.lineHeight)&&t.tokens.lineHeight.length>0);let n=((s=document.querySelector('input[name="scope"]:checked'))==null?void 0:s.value)||"page";go(n,"tokens",{tokens:t.tokens},t.context||null)}if(t&&t.type==="typography-styles-extracted")if(t.styles&&Array.isArray(t.styles)&&t.styles.length>0){let n=t.mode==="desktop"?"Desktop":t.mode==="tablet"?"Tablet":t.mode==="mobile"?"Mobile":"All";B=t.styles.map((l,i)=>({id:i+1,name:l.name,styleId:l.styleId,fontFamily:l.fontFamily,fontSize:l.fontSize,fontWeight:l.fontWeight,lineHeight:l.lineHeight,letterSpacing:l.letterSpacing||"0",wordSpacing:l.wordSpacing||"0"})),ve=B.length+1,Me(),ae(),alert(`\u2705 Successfully imported ${t.styles.length} ${n} typography styles from Figma!

Styles: ${t.styles.map(l=>l.name).join(", ")}`)}else{let n=t.mode==="desktop"?"Desktop":t.mode==="tablet"?"Tablet":t.mode==="mobile"?"Mobile":"";alert(`\u26A0\uFE0F No ${n.toLowerCase()} text styles found in this Figma file.

Make sure you have defined text styles in your design system.`)}if(t&&t.type==="color-styles-extracted")if(t.colors&&Array.isArray(t.colors)&&t.colors.length>0){let n=document.getElementById("color-scale");if(!n)return;let i=Array.from(new Set(t.colors.map(a=>a.hex))).sort((a,r)=>Ue(a)-Ue(r));D={},t.colors.forEach(a=>{a.hex&&a.name&&(D[a.hex.toUpperCase()]=a.name)}),n.value=i.join(", "),typeof Se=="function"&&Se(),ae();try{n.focus(),n.setSelectionRange(n.value.length,n.value.length)}catch(a){}alert(`\u2705 Successfully imported ${t.colors.length} color styles from Figma!

Colors: ${t.colors.map(a=>a.name+" ("+a.hex+")").join(", ")}`)}else alert(`\u26A0\uFE0F No color styles found in this Figma file.

Make sure you have defined color styles (paint styles) in your design system.`);if(t&&t.type==="color-variables-extracted")if(t.colors&&Array.isArray(t.colors)&&t.colors.length>0){let n=document.getElementById("color-scale");if(!n)return;let i=Array.from(new Set(t.colors.map(a=>a.hex))).sort((a,r)=>Ue(a)-Ue(r));D={},t.colors.forEach(a=>{a.hex&&a.name&&(D[a.hex.toUpperCase()]=a.name)}),n.value=i.join(", "),typeof Se=="function"&&Se(),ae();try{n.focus(),n.setSelectionRange(n.value.length,n.value.length)}catch(a){}alert(`\u2705 Successfully imported ${t.colors.length} color variables from Figma!

Colors: ${t.colors.map(a=>a.name+" ("+a.hex+")").join(", ")}`)}else alert(`\u26A0\uFE0F No color variables found in this Figma file.

Make sure you have defined color variables in your design system.`)}})();})();
