function Q(e){return c(e)&&"key"in e}function R(e,t){return e==="path"&&typeof t=="string"}function c(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function D(e){return c(e)?"explicitList"in e||"template"in e:!1}function m(e){return c(e)&&("path"in e||"literal"in e&&typeof e.literal=="string"||"literalString"in e)}function X(e){return c(e)&&("path"in e||"literal"in e&&typeof e.literal=="number"||"literalNumber"in e)}function Y(e){return c(e)&&("path"in e||"literal"in e&&typeof e.literal=="boolean"||"literalBoolean"in e)}function g(e){return!(!c(e)||!("id"in e&&"type"in e&&"properties"in e))}function M(e){return c(e)&&"url"in e&&m(e.url)}function T(e){return c(e)&&"child"in e&&g(e.child)&&"action"in e}function S(e){return c(e)?"child"in e?g(e.child):"children"in e?Array.isArray(e.children)&&e.children.every(g):!1:!1}function E(e){return c(e)&&"label"in e&&m(e.label)&&"value"in e&&Y(e.value)}function O(e){return c(e)&&"children"in e&&Array.isArray(e.children)&&e.children.every(g)}function N(e){return c(e)&&"value"in e&&m(e.value)}function V(e){return c(e)}function k(e){return c(e)&&"url"in e&&m(e.url)}function P(e){return c(e)&&"name"in e&&m(e.name)}function _(e){return c(e)&&"children"in e&&Array.isArray(e.children)&&e.children.every(g)}function B(e){return c(e)&&"entryPointChild"in e&&g(e.entryPointChild)&&"contentChild"in e&&g(e.contentChild)}function K(e){return c(e)&&"selections"in e}function F(e){return c(e)&&"children"in e&&Array.isArray(e.children)&&e.children.every(g)}function L(e){return c(e)&&"value"in e&&X(e.value)}function Z(e){return c(e)&&"title"in e&&m(e.title)&&"child"in e&&g(e.child)}function U(e){return c(e)&&"tabItems"in e&&Array.isArray(e.tabItems)&&e.tabItems.every(Z)}function W(e){return c(e)&&"text"in e&&m(e.text)}function G(e){return c(e)&&"label"in e&&m(e.label)}function J(e){return c(e)&&"url"in e&&m(e.url)}const lt=Object.freeze(Object.defineProperty({__proto__:null,isComponentArrayReference:D,isObject:c,isPath:R,isResolvedAudioPlayer:M,isResolvedButton:T,isResolvedCard:S,isResolvedCheckbox:E,isResolvedColumn:O,isResolvedDateTimeInput:N,isResolvedDivider:V,isResolvedIcon:P,isResolvedImage:k,isResolvedList:_,isResolvedModal:B,isResolvedMultipleChoice:K,isResolvedRow:F,isResolvedSlider:L,isResolvedTabs:U,isResolvedText:W,isResolvedTextField:G,isResolvedVideo:J,isValueMap:Q},Symbol.toStringTag,{value:"Module"})),x=class x{constructor(t={mapCtor:Map,arrayCtor:Array,setCtor:Set,objCtor:Object}){this.opts=t,this.mapCtor=Map,this.arrayCtor=Array,this.setCtor=Set,this.objCtor=Object,this.arrayCtor=t.arrayCtor,this.mapCtor=t.mapCtor,this.setCtor=t.setCtor,this.objCtor=t.objCtor,this.surfaces=new t.mapCtor}getSurfaces(){return this.surfaces}clearSurfaces(){this.surfaces.clear()}processMessages(t){for(const r of t)r.beginRendering&&this.handleBeginRendering(r.beginRendering,r.beginRendering.surfaceId),r.surfaceUpdate&&this.handleSurfaceUpdate(r.surfaceUpdate,r.surfaceUpdate.surfaceId),r.dataModelUpdate&&this.handleDataModelUpdate(r.dataModelUpdate,r.dataModelUpdate.surfaceId),r.deleteSurface&&this.handleDeleteSurface(r.deleteSurface)}getData(t,r,n=x.DEFAULT_SURFACE_ID){const o=this.getOrCreateSurface(n);if(!o)return null;let i;return r==="."||r===""?i=t.dataContextPath??"/":i=this.resolvePath(r,t.dataContextPath),this.getDataByPath(o.dataModel,i)}setData(t,r,n,o=x.DEFAULT_SURFACE_ID){if(!t){console.warn("No component node set");return}const i=this.getOrCreateSurface(o);if(!i)return;let l;r==="."||r===""?l=t.dataContextPath??"/":l=this.resolvePath(r,t.dataContextPath),this.setDataByPath(i.dataModel,l,n)}resolvePath(t,r){return t.startsWith("/")?t:r&&r!=="/"?r.endsWith("/")?`${r}${t}`:`${r}/${t}`:`/${t}`}parseIfJsonString(t){if(typeof t!="string")return t;const r=t.trim();if(r.startsWith("{")&&r.endsWith("}")||r.startsWith("[")&&r.endsWith("]"))try{return JSON.parse(t)}catch(n){return console.warn(`Failed to parse potential JSON string: "${t.substring(0,50)}..."`,n),t}return t}convertKeyValueArrayToMap(t){const r=new this.mapCtor;for(const n of t){if(!c(n)||!("key"in n))continue;const o=n.key,i=this.findValueKey(n);if(!i)continue;let l=n[i];i==="valueMap"&&Array.isArray(l)?l=this.convertKeyValueArrayToMap(l):typeof l=="string"&&(l=this.parseIfJsonString(l)),this.setDataByPath(r,o,l)}return r}setDataByPath(t,r,n){if(Array.isArray(n)&&(n.length===0||c(n[0])&&"key"in n[0]))if(n.length===1&&c(n[0])&&n[0].key==="."){const p=n[0],f=this.findValueKey(p);f?(n=p[f],f==="valueMap"&&Array.isArray(n)?n=this.convertKeyValueArrayToMap(n):typeof n=="string"&&(n=this.parseIfJsonString(n))):n=this.convertKeyValueArrayToMap(n)}else n=this.convertKeyValueArrayToMap(n);const o=this.normalizePath(r).split("/").filter(p=>p);if(o.length===0){if(n instanceof Map||c(n)){!(n instanceof Map)&&c(n)&&(n=new this.mapCtor(Object.entries(n))),t.clear();for(const[p,f]of n.entries())t.set(p,f)}else console.error("Cannot set root of DataModel to a non-Map value.");return}let i=t;for(let p=0;p<o.length-1;p++){const f=o[p];let s;i instanceof Map?s=i.get(f):Array.isArray(i)&&/^\d+$/.test(f)&&(s=i[parseInt(f,10)]),(s===void 0||typeof s!="object"||s===null)&&(s=new this.mapCtor,i instanceof this.mapCtor?i.set(f,s):Array.isArray(i)&&(i[parseInt(f,10)]=s)),i=s}const l=o[o.length-1],h=n;i instanceof this.mapCtor?i.set(l,h):Array.isArray(i)&&/^\d+$/.test(l)&&(i[parseInt(l,10)]=h)}normalizePath(t){return"/"+t.replace(/\[(\d+)\]/g,".$1").split(".").filter(o=>o.length>0).join("/")}getDataByPath(t,r){const n=this.normalizePath(r).split("/").filter(i=>i);let o=t;for(const i of n){if(o==null)return null;if(o instanceof Map)o=o.get(i);else if(Array.isArray(o)&&/^\d+$/.test(i))o=o[parseInt(i,10)];else if(c(o))o=o[i];else return null}return o}getOrCreateSurface(t){let r=this.surfaces.get(t);return r||(r=new this.objCtor({rootComponentId:null,componentTree:null,dataModel:new this.mapCtor,components:new this.mapCtor,styles:new this.objCtor}),this.surfaces.set(t,r)),r}handleBeginRendering(t,r){const n=this.getOrCreateSurface(r);n.rootComponentId=t.root,n.styles=t.styles??{},this.rebuildComponentTree(n)}handleSurfaceUpdate(t,r){const n=this.getOrCreateSurface(r);for(const o of t.components)n.components.set(o.id,o);this.rebuildComponentTree(n)}handleDataModelUpdate(t,r){const n=this.getOrCreateSurface(r),o=t.path??"/";this.setDataByPath(n.dataModel,o,t.contents),this.rebuildComponentTree(n)}handleDeleteSurface(t){this.surfaces.delete(t.surfaceId)}rebuildComponentTree(t){if(!t.rootComponentId){t.componentTree=null;return}const r=new this.setCtor;t.componentTree=this.buildNodeRecursive(t.rootComponentId,t,r,"/","")}findValueKey(t){return Object.keys(t).find(r=>r.startsWith("value"))}buildNodeRecursive(t,r,n,o,i=""){const l=`${t}${i}`,{components:h}=r;if(!h.has(t))return null;if(n.has(l))throw new Error(`Circular dependency for component "${l}".`);n.add(l);const p=h.get(t),f=p.component??{},s=Object.keys(f)[0],b=f[s],a=new this.objCtor;if(c(b))for(const[j,v]of Object.entries(b))a[j]=this.resolvePropertyValue(v,r,n,o,i);n.delete(l);const d={id:l,dataContextPath:o,weight:p.weight??"initial"};switch(s){case"Text":if(!W(a))throw new Error(`Invalid data; expected ${s}`);return new this.objCtor({...d,type:"Text",properties:a});case"Image":if(!k(a))throw new Error(`Invalid data; expected ${s}`);return new this.objCtor({...d,type:"Image",properties:a});case"Icon":if(!P(a))throw new Error(`Invalid data; expected ${s}`);return new this.objCtor({...d,type:"Icon",properties:a});case"Video":if(!J(a))throw new Error(`Invalid data; expected ${s}`);return new this.objCtor({...d,type:"Video",properties:a});case"AudioPlayer":if(!M(a))throw new Error(`Invalid data; expected ${s}`);return new this.objCtor({...d,type:"AudioPlayer",properties:a});case"Row":if(!F(a))throw new Error(`Invalid data; expected ${s}`);return new this.objCtor({...d,type:"Row",properties:a});case"Column":if(!O(a))throw new Error(`Invalid data; expected ${s}`);return new this.objCtor({...d,type:"Column",properties:a});case"List":if(!_(a))throw new Error(`Invalid data; expected ${s}`);return new this.objCtor({...d,type:"List",properties:a});case"Card":if(!S(a))throw new Error(`Invalid data; expected ${s}`);return new this.objCtor({...d,type:"Card",properties:a});case"Tabs":if(!U(a))throw new Error(`Invalid data; expected ${s}`);return new this.objCtor({...d,type:"Tabs",properties:a});case"Divider":if(!V(a))throw new Error(`Invalid data; expected ${s}`);return new this.objCtor({...d,type:"Divider",properties:a});case"Modal":if(!B(a))throw new Error(`Invalid data; expected ${s}`);return new this.objCtor({...d,type:"Modal",properties:a});case"Button":if(!T(a))throw new Error(`Invalid data; expected ${s}`);return new this.objCtor({...d,type:"Button",properties:a});case"CheckBox":if(!E(a))throw new Error(`Invalid data; expected ${s}`);return new this.objCtor({...d,type:"CheckBox",properties:a});case"TextField":if(!G(a))throw new Error(`Invalid data; expected ${s}`);return new this.objCtor({...d,type:"TextField",properties:a});case"DateTimeInput":if(!N(a))throw new Error(`Invalid data; expected ${s}`);return new this.objCtor({...d,type:"DateTimeInput",properties:a});case"MultipleChoice":if(!K(a))throw new Error(`Invalid data; expected ${s}`);return new this.objCtor({...d,type:"MultipleChoice",properties:a});case"Slider":if(!L(a))throw new Error(`Invalid data; expected ${s}`);return new this.objCtor({...d,type:"Slider",properties:a});default:return new this.objCtor({...d,type:s,properties:a})}}resolvePropertyValue(t,r,n,o,i=""){if(typeof t=="string"&&r.components.has(t))return this.buildNodeRecursive(t,r,n,o,i);if(D(t)){if(t.explicitList)return t.explicitList.map(l=>this.buildNodeRecursive(l,r,n,o,i));if(t.template){const l=this.resolvePath(t.template.dataBinding,o),h=this.getDataByPath(r.dataModel,l),p=t.template;if(Array.isArray(h))return h.map((s,b)=>{const j=`:${[...o.split("/").filter(q=>/^\d+$/.test(q)),b].join(":")}`,v=`${l}/${b}`;return this.buildNodeRecursive(p.componentId,r,n,v,j)});const f=this.mapCtor;return h instanceof f?Array.from(h.keys(),s=>{const b=`:${s}`,a=`${l}/${s}`;return this.buildNodeRecursive(p.componentId,r,n,a,b)}):new this.arrayCtor}}if(Array.isArray(t))return t.map(l=>this.resolvePropertyValue(l,r,n,o,i));if(c(t)){const l=new this.objCtor;for(const[h,p]of Object.entries(t)){let f=p;if(R(h,p)&&o!=="/"){f=p.replace(/^\.?\/item/,"").replace(/^\.?\/text/,"").replace(/^\.?\/label/,"").replace(/^\.?\//,""),l[h]=f;continue}l[h]=this.resolvePropertyValue(f,r,n,o,i)}return l}return t}};x.DEFAULT_SURFACE_ID="@default";let I=x;const H=[0,5,10,15,20,25,30,35,40,50,60,70,80,90,95,98,99,100],tt=`
  &:not([disabled]) {
    cursor: pointer;
    opacity: var(--opacity, 0);
    transition: opacity var(--speed, 0.2s) cubic-bezier(0, 0, 0.3, 1);

    &:hover,
    &:focus {
      opacity: 1;
    }
  }`,et=`
  ${new Array(21).fill(0).map((e,t)=>`.behavior-ho-${t*5} {
          --opacity: ${t/20};
          ${tt}
        }`).join(`
`)}

  .behavior-o-s {
    overflow: scroll;
  }

  .behavior-o-a {
    overflow: auto;
  }

  .behavior-o-h {
    overflow: hidden;
  }

  .behavior-sw-n {
    scrollbar-width: none;
  }
`,u=4,rt=`
  ${new Array(25).fill(0).map((e,t)=>`
        .border-bw-${t} { border-width: ${t}px; }
        .border-btw-${t} { border-top-width: ${t}px; }
        .border-bbw-${t} { border-bottom-width: ${t}px; }
        .border-blw-${t} { border-left-width: ${t}px; }
        .border-brw-${t} { border-right-width: ${t}px; }

        .border-ow-${t} { outline-width: ${t}px; }
        .border-br-${t} { border-radius: ${t*u}px; overflow: hidden;}`).join(`
`)}

  .border-br-50pc {
    border-radius: 50%;
  }

  .border-bs-s {
    border-style: solid;
  }
`;function ct(...e){const t={};for(const r of e)for(const[n,o]of Object.entries(r)){const i=n.split("-").with(-1,"").join("-"),l=Object.keys(t).filter(h=>h.startsWith(i));for(const h of l)delete t[h];t[n]=o}return t}function pt(e,t,...r){const n=structuredClone(e);for(const o of r)for(const i of Object.keys(o)){const l=i.split("-").with(-1,"").join("-");for(const[h,p]of Object.entries(n)){if(t.includes(h))continue;let f=!1;for(let s=0;s<p.length;s++)p[s].startsWith(l)&&(f=!0,p[s]=i);f||p.push(i)}}return n}function y(e){return e.startsWith("nv")?`--nv-${e.slice(2)}`:`--${e[0]}-${e.slice(1)}`}const w=e=>`
    ${e.map(t=>{const r=A(t);return`.color-bc-${t} { border-color: light-dark(var(${y(t)}), var(${y(r)})); }`}).join(`
`)}

    ${e.map(t=>{const r=A(t),n=[`.color-bgc-${t} { background-color: light-dark(var(${y(t)}), var(${y(r)})); }`,`.color-bbgc-${t}::backdrop { background-color: light-dark(var(${y(t)}), var(${y(r)})); }`];for(let o=.1;o<1;o+=.1)n.push(`.color-bbgc-${t}_${(o*100).toFixed(0)}::backdrop {
            background-color: light-dark(oklch(from var(${y(t)}) l c h / calc(alpha * ${o.toFixed(1)})), oklch(from var(${y(r)}) l c h / calc(alpha * ${o.toFixed(1)})) );
          }
        `);return n.join(`
`)}).join(`
`)}

  ${e.map(t=>{const r=A(t);return`.color-c-${t} { color: light-dark(var(${y(t)}), var(${y(r)})); }`}).join(`
`)}
  `,A=e=>{const t=e.match(/^([a-z]+)(\d+)$/);if(!t)return e;const[,r,n]=t,i=100-parseInt(n,10),l=H.reduce((h,p)=>Math.abs(p-i)<Math.abs(h-i)?p:h);return`${r}${l}`},$=e=>H.map(t=>`${e}${t}`),nt=[w($("p")),w($("s")),w($("t")),w($("n")),w($("nv")),w($("e")),`
    .color-bgc-transparent {
      background-color: transparent;
    }

    :host {
      color-scheme: var(--color-scheme);
    }
  `],ot=`
  .g-icon {
    font-family: "Material Symbols Outlined", "Google Symbols";
    font-weight: normal;
    font-style: normal;
    font-display: optional;
    font-size: 20px;
    width: 1em;
    height: 1em;
    user-select: none;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-feature-settings: "liga";
    -webkit-font-smoothing: antialiased;
    overflow: hidden;

    font-variation-settings: "FILL" 0, "wght" 300, "GRAD" 0, "opsz" 48,
      "ROND" 100;

    &.filled {
      font-variation-settings: "FILL" 1, "wght" 300, "GRAD" 0, "opsz" 48,
        "ROND" 100;
    }

    &.filled-heavy {
      font-variation-settings: "FILL" 1, "wght" 700, "GRAD" 0, "opsz" 48,
        "ROND" 100;
    }
  }
`,it=`
  :host {
    ${new Array(16).fill(0).map((e,t)=>`--g-${t+1}: ${(t+1)*u}px;`).join(`
`)}
  }

  ${new Array(49).fill(0).map((e,t)=>{const r=t-24,n=r<0?`n${Math.abs(r)}`:r.toString();return`
        .layout-p-${n} { --padding: ${r*u}px; padding: var(--padding); }
        .layout-pt-${n} { padding-top: ${r*u}px; }
        .layout-pr-${n} { padding-right: ${r*u}px; }
        .layout-pb-${n} { padding-bottom: ${r*u}px; }
        .layout-pl-${n} { padding-left: ${r*u}px; }

        .layout-m-${n} { --margin: ${r*u}px; margin: var(--margin); }
        .layout-mt-${n} { margin-top: ${r*u}px; }
        .layout-mr-${n} { margin-right: ${r*u}px; }
        .layout-mb-${n} { margin-bottom: ${r*u}px; }
        .layout-ml-${n} { margin-left: ${r*u}px; }

        .layout-t-${n} { top: ${r*u}px; }
        .layout-r-${n} { right: ${r*u}px; }
        .layout-b-${n} { bottom: ${r*u}px; }
        .layout-l-${n} { left: ${r*u}px; }`}).join(`
`)}

  ${new Array(25).fill(0).map((e,t)=>`
        .layout-g-${t} { gap: ${t*u}px; }`).join(`
`)}

  ${new Array(8).fill(0).map((e,t)=>`
        .layout-grd-col${t+1} { grid-template-columns: ${"1fr ".repeat(t+1).trim()}; }`).join(`
`)}

  .layout-pos-a {
    position: absolute;
  }

  .layout-pos-rel {
    position: relative;
  }

  .layout-dsp-none {
    display: none;
  }

  .layout-dsp-block {
    display: block;
  }

  .layout-dsp-grid {
    display: grid;
  }

  .layout-dsp-iflex {
    display: inline-flex;
  }

  .layout-dsp-flexvert {
    display: flex;
    flex-direction: column;
  }

  .layout-dsp-flexhor {
    display: flex;
    flex-direction: row;
  }

  .layout-fw-w {
    flex-wrap: wrap;
  }

  .layout-al-fs {
    align-items: start;
  }

  .layout-al-fe {
    align-items: end;
  }

  .layout-al-c {
    align-items: center;
  }

  .layout-as-n {
    align-self: normal;
  }

  .layout-js-c {
    justify-self: center;
  }

  .layout-sp-c {
    justify-content: center;
  }

  .layout-sp-ev {
    justify-content: space-evenly;
  }

  .layout-sp-bt {
    justify-content: space-between;
  }

  .layout-sp-s {
    justify-content: start;
  }

  .layout-sp-e {
    justify-content: end;
  }

  .layout-ji-e {
    justify-items: end;
  }

  .layout-r-none {
    resize: none;
  }

  .layout-fs-c {
    field-sizing: content;
  }

  .layout-fs-n {
    field-sizing: none;
  }

  .layout-flx-0 {
    flex: 0 0 auto;
  }

  .layout-flx-1 {
    flex: 1 0 auto;
  }

  .layout-c-s {
    contain: strict;
  }

  /** Widths **/

  ${new Array(10).fill(0).map((e,t)=>{const r=(t+1)*10;return`.layout-w-${r} { width: ${r}%; max-width: ${r}%; }`}).join(`
`)}

  ${new Array(16).fill(0).map((e,t)=>{const r=t*u;return`.layout-wp-${t} { width: ${r}px; }`}).join(`
`)}

  /** Heights **/

  ${new Array(10).fill(0).map((e,t)=>{const r=(t+1)*10;return`.layout-h-${r} { height: ${r}%; }`}).join(`
`)}

  ${new Array(16).fill(0).map((e,t)=>{const r=t*u;return`.layout-hp-${t} { height: ${r}px; }`}).join(`
`)}

  .layout-el-cv {
    & img,
    & video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      margin: 0;
    }
  }

  .layout-ar-sq {
    aspect-ratio: 1 / 1;
  }

  .layout-ex-fb {
    margin: calc(var(--padding) * -1) 0 0 calc(var(--padding) * -1);
    width: calc(100% + var(--padding) * 2);
    height: calc(100% + var(--padding) * 2);
  }
`,at=`
  ${new Array(21).fill(0).map((e,t)=>`.opacity-el-${t*5} { opacity: ${t/20}; }`).join(`
`)}
`,st=`
  :host {
    --default-font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    --default-font-family-mono: "Courier New", Courier, monospace;
  }

  .typography-f-s {
    font-family: var(--font-family, var(--default-font-family));
    font-optical-sizing: auto;
    font-variation-settings: "slnt" 0, "wdth" 100, "GRAD" 0;
  }

  .typography-f-sf {
    font-family: var(--font-family-flex, var(--default-font-family));
    font-optical-sizing: auto;
  }

  .typography-f-c {
    font-family: var(--font-family-mono, var(--default-font-family));
    font-optical-sizing: auto;
    font-variation-settings: "slnt" 0, "wdth" 100, "GRAD" 0;
  }

  .typography-v-r {
    font-variation-settings: "slnt" 0, "wdth" 100, "GRAD" 0, "ROND" 100;
  }

  .typography-ta-s {
    text-align: start;
  }

  .typography-ta-c {
    text-align: center;
  }

  .typography-fs-n {
    font-style: normal;
  }

  .typography-fs-i {
    font-style: italic;
  }

  .typography-sz-ls {
    font-size: 11px;
    line-height: 16px;
  }

  .typography-sz-lm {
    font-size: 12px;
    line-height: 16px;
  }

  .typography-sz-ll {
    font-size: 14px;
    line-height: 20px;
  }

  .typography-sz-bs {
    font-size: 12px;
    line-height: 16px;
  }

  .typography-sz-bm {
    font-size: 14px;
    line-height: 20px;
  }

  .typography-sz-bl {
    font-size: 16px;
    line-height: 24px;
  }

  .typography-sz-ts {
    font-size: 14px;
    line-height: 20px;
  }

  .typography-sz-tm {
    font-size: 16px;
    line-height: 24px;
  }

  .typography-sz-tl {
    font-size: 22px;
    line-height: 28px;
  }

  .typography-sz-hs {
    font-size: 24px;
    line-height: 32px;
  }

  .typography-sz-hm {
    font-size: 28px;
    line-height: 36px;
  }

  .typography-sz-hl {
    font-size: 32px;
    line-height: 40px;
  }

  .typography-sz-ds {
    font-size: 36px;
    line-height: 44px;
  }

  .typography-sz-dm {
    font-size: 45px;
    line-height: 52px;
  }

  .typography-sz-dl {
    font-size: 57px;
    line-height: 64px;
  }

  .typography-ws-p {
    white-space: pre-line;
  }

  .typography-ws-nw {
    white-space: nowrap;
  }

  .typography-td-none {
    text-decoration: none;
  }

  /** Weights **/

  ${new Array(9).fill(0).map((e,t)=>{const r=(t+1)*100;return`.typography-w-${r} { font-weight: ${r}; }`}).join(`
`)}
`,ht=[et,rt,nt,ot,it,at,st].flat(1/0).join(`
`),C=class C extends CustomEvent{constructor(t,r){super(C.EVENT_NAME,{bubbles:!0,composed:!0,...r,detail:{...t,eventType:C.EVENT_NAME}})}};C.EVENT_NAME="a2ui-validation-input";let z=C;export{I as A,lt as G,z as a,pt as b,ct as m,ht as s};
