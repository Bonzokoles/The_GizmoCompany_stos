var Le=n=>{throw TypeError(n)};var Me=(n,s,r)=>s.has(n)||Le("Cannot "+r),He=(n,s)=>Object(s)!==s?Le('Cannot use the "in" operator on this value'):n.has(s),O=(n,s,r)=>(Me(n,s,"read from private field"),r?r.call(n):s.get(n)),z=(n,s,r)=>s.has(n)?Le("Cannot add the same private member more than once"):s instanceof WeakSet?s.add(n):s.set(n,r),I=(n,s,r,e)=>(Me(n,s,"write to private field"),e?e.call(n,r):s.set(n,r),r),U=(n,s,r)=>(Me(n,s,"access private method"),r);import{A as Y,G as Vt,s as Nt,m as ot,a as Rt,b as Ut}from"./vendor-a2ui-web_core-PQIk8tiJ.js";import{S as At,a as Lt,b as Mt,c as Ht,e as Bt}from"./vendor-signal-utils-BnbsRLRX.js";import"./vendor-signal-polyfill-DsVT-Chx.js";import{r as Wt,i as Z,n as V,t as q,a as et,e as Zt}from"./vendor-lit-reactive-element-B_lF-hrR.js";import{A as P,o as qt,b as y,D as Gt,e as W,a as X,n as Yt,c as Jt,i as Kt,E as Qt,d as Xt,f as es}from"./vendor-lit-html-BeezPM88.js";import{i as ts}from"./vendor-lit-element-D7P5tD8e.js";import{e as ss}from"./vendor-lit-labs-signals-B1Ih4o1v.js";import{n as mt,c as gt}from"./vendor-lit-context-BWPl8kFR.js";const is={bubbles:!0,cancelable:!0,composed:!0},Ae=class Ae extends CustomEvent{constructor(s){super(Ae.eventName,{detail:s,...is}),this.payload=s}};Ae.eventName="a2uiaction";let tt=Ae;function as(){return new Y({arrayCtor:Ht,mapCtor:Mt,objCtor:Lt,setCtor:At})}const ks={createSignalA2uiMessageProcessor:as,A2uiMessageProcessor:Y,Guards:Vt},rs=mt(Symbol("A2UITheme")),ns=rs,J=Wt(Nt);class ls{constructor(){this.schemas=new Map,this.registry=new Map}register(s,r,e,a){if(!/^[a-zA-Z0-9]+$/.test(s))throw new Error(`[Registry] Invalid typeName '${s}'. Must be alphanumeric.`);this.registry.set(s,r),a&&this.schemas.set(s,a);const b=e||`a2ui-custom-${s.toLowerCase()}`,f=customElements.getName(r);if(f){if(f!==b)throw new Error(`Component ${s} is already registered as ${f}, but requested as ${b}.`);return}customElements.get(b)||customElements.define(b,r)}get(s){return this.registry.get(s)}getInlineCatalog(){const s={};for(const[r,e]of this.schemas)s[r]=e;return{components:s}}}const ct=new ls;var te=function(n,s,r){for(var e=arguments.length>2,a=0;a<s.length;a++)r=e?s[a].call(n,r):s[a].call(n);return e?r:void 0},le=function(n,s,r,e,a,b){function f(d){if(d!==void 0&&typeof d!="function")throw new TypeError("Function expected");return d}for(var h=e.kind,g=h==="getter"?"get":h==="setter"?"set":"value",p=!s&&n?e.static?n:n.prototype:null,u=s||(p?Object.getOwnPropertyDescriptor(p,e.name):{}),t,_=!1,m=r.length-1;m>=0;m--){var c={};for(var o in e)c[o]=o==="access"?{}:e[o];for(var o in e.access)c.access[o]=e.access[o];c.addInitializer=function(d){if(_)throw new TypeError("Cannot add initializers after decoration has completed");b.push(f(d||null))};var i=(0,r[m])(h==="accessor"?{get:u.get,set:u.set}:u[g],c);if(h==="accessor"){if(i===void 0)continue;if(i===null||typeof i!="object")throw new TypeError("Object expected");(t=f(i.get))&&(u.get=t),(t=f(i.set))&&(u.set=t),(t=f(i.init))&&a.unshift(t)}else(t=f(i))&&(h==="field"?a.unshift(t):u[g]=t)}p&&Object.defineProperty(p,e.name,u),_=!0};let K=(()=>{var $,A,ee,w,D,F,ie,ae,re,H;let n=[q("a2ui-root")],s,r=[],e,a=ss(ts),b=[],f,h=[],g=[],p,u=[],t=[],_,m=[],c=[],o,i=[],d=[],L,k=[],j=[],S,N=[],R=[],x,T=[],M=[],E;return H=class extends a{constructor(){super(...arguments);z(this,$,(te(this,b),te(this,h,null)));z(this,A,(te(this,g),te(this,u,null)));z(this,ee,(te(this,t),te(this,m,void 0)));z(this,w,(te(this,c),te(this,i,null)));z(this,D,(te(this,d),te(this,k,null)));z(this,F,(te(this,j),te(this,N,"")));z(this,ie,(te(this,R),te(this,T,!1)));z(this,ae,(te(this,M),1));z(this,re,null)}get surfaceId(){return O(this,$)}set surfaceId(C){I(this,$,C)}get component(){return O(this,A)}set component(C){I(this,A,C)}get theme(){return O(this,ee)}set theme(C){I(this,ee,C)}get childComponents(){return O(this,w)}set childComponents(C){I(this,w,C)}get processor(){return O(this,D)}set processor(C){I(this,D,C)}get dataContextPath(){return O(this,F)}set dataContextPath(C){I(this,F,C)}get enableCustomElements(){return O(this,ie)}set enableCustomElements(C){I(this,ie,C)}set weight(C){I(this,ae,C),this.style.setProperty("--weight",`${C}`)}get weight(){return O(this,ae)}willUpdate(C){C.has("childComponents")&&(O(this,re)&&O(this,re).call(this),I(this,re,Bt(()=>{const v=this.childComponents??null,l=this.renderComponentTree(v);Gt(l,this,{host:this})})))}disconnectedCallback(){super.disconnectedCallback(),O(this,re)&&O(this,re).call(this)}renderComponentTree(C){return C?Array.isArray(C)?y` ${qt(C,v=>{if(this.enableCustomElements){const Q=ct.get(v.type)||customElements.get(v.type);if(Q){const B=v,G=new Q;G.id=B.id,B.slotName&&(G.slot=B.slotName),G.component=B,G.weight=B.weight??"initial",G.processor=this.processor,G.surfaceId=this.surfaceId,G.dataContextPath=B.dataContextPath??"/";for(const[de,ve]of Object.entries(v.properties))G[de]=ve;return y`${G}`}}switch(v.type){case"List":{const l=v,Q=l.properties.children;return y`<a2ui-list
            id=${l.id}
            slot=${l.slotName?l.slotName:P}
            .component=${l}
            .weight=${l.weight??"initial"}
            .direction=${l.properties.direction??"vertical"}
            .processor=${this.processor}
            .surfaceId=${this.surfaceId}
            .childComponents=${Q}
            .enableCustomElements=${this.enableCustomElements}
          ></a2ui-list>`}case"Card":{const l=v;let Q=l.properties.children;return!Q&&l.properties.child&&(Q=[l.properties.child]),y`<a2ui-card
            id=${l.id}
            slot=${l.slotName?l.slotName:P}
            .component=${l}
            .weight=${l.weight??"initial"}
            .processor=${this.processor}
            .surfaceId=${this.surfaceId}
            .childComponents=${Q}
            .dataContextPath=${l.dataContextPath??""}
            .enableCustomElements=${this.enableCustomElements}
          ></a2ui-card>`}case"Column":{const l=v;return y`<a2ui-column
            id=${l.id}
            slot=${l.slotName?l.slotName:P}
            .component=${l}
            .weight=${l.weight??"initial"}
            .processor=${this.processor}
            .surfaceId=${this.surfaceId}
            .childComponents=${l.properties.children??null}
            .dataContextPath=${l.dataContextPath??""}
            .alignment=${l.properties.alignment??"stretch"}
            .distribution=${l.properties.distribution??"start"}
            .enableCustomElements=${this.enableCustomElements}
          ></a2ui-column>`}case"Row":{const l=v;return y`<a2ui-row
            id=${l.id}
            slot=${l.slotName?l.slotName:P}
            .component=${l}
            .weight=${l.weight??"initial"}
            .processor=${this.processor}
            .surfaceId=${this.surfaceId}
            .childComponents=${l.properties.children??null}
            .dataContextPath=${l.dataContextPath??""}
            .alignment=${l.properties.alignment??"stretch"}
            .distribution=${l.properties.distribution??"start"}
            .enableCustomElements=${this.enableCustomElements}
          ></a2ui-row>`}case"Image":{const l=v;return y`<a2ui-image
            id=${l.id}
            slot=${l.slotName?l.slotName:P}
            .component=${l}
            .weight=${l.weight??"initial"}
            .processor=${this.processor}
            .surfaceId=${this.surfaceId}
            .url=${l.properties.url??null}
            .dataContextPath=${l.dataContextPath??""}
            .usageHint=${l.properties.usageHint}
            .fit=${l.properties.fit}
            .enableCustomElements=${this.enableCustomElements}
          ></a2ui-image>`}case"Icon":{const l=v;return y`<a2ui-icon
            id=${l.id}
            slot=${l.slotName?l.slotName:P}
            .component=${l}
            .weight=${l.weight??"initial"}
            .processor=${this.processor}
            .surfaceId=${this.surfaceId}
            .name=${l.properties.name??null}
            .dataContextPath=${l.dataContextPath??""}
            .enableCustomElements=${this.enableCustomElements}
          ></a2ui-icon>`}case"AudioPlayer":{const l=v;return y`<a2ui-audioplayer
            id=${l.id}
            slot=${l.slotName?l.slotName:P}
            .component=${l}
            .weight=${l.weight??"initial"}
            .processor=${this.processor}
            .surfaceId=${this.surfaceId}
            .url=${l.properties.url??null}
            .dataContextPath=${l.dataContextPath??""}
            .enableCustomElements=${this.enableCustomElements}
          ></a2ui-audioplayer>`}case"Button":{const l=v;return y`<a2ui-button
            id=${l.id}
            slot=${l.slotName?l.slotName:P}
            .component=${l}
            .weight=${l.weight??"initial"}
            .processor=${this.processor}
            .surfaceId=${this.surfaceId}
            .dataContextPath=${l.dataContextPath??""}
            .action=${l.properties.action}
            .childComponents=${[l.properties.child]}
            .enableCustomElements=${this.enableCustomElements}
          ></a2ui-button>`}case"Text":{const l=v;return y`<a2ui-text
            id=${l.id}
            slot=${l.slotName?l.slotName:P}
            .component=${l}
            .weight=${l.weight??"initial"}
            .model=${this.processor}
            .surfaceId=${this.surfaceId}
            .processor=${this.processor}
            .dataContextPath=${l.dataContextPath}
            .text=${l.properties.text}
            .usageHint=${l.properties.usageHint}
            .enableCustomElements=${this.enableCustomElements}
          ></a2ui-text>`}case"CheckBox":{const l=v;return y`<a2ui-checkbox
            id=${l.id}
            slot=${l.slotName?l.slotName:P}
            .component=${l}
            .weight=${l.weight??"initial"}
            .processor=${this.processor}
            .surfaceId=${this.surfaceId}
            .dataContextPath=${l.dataContextPath??""}
            .label=${l.properties.label}
            .value=${l.properties.value}
            .enableCustomElements=${this.enableCustomElements}
          ></a2ui-checkbox>`}case"DateTimeInput":{const l=v;return y`<a2ui-datetimeinput
            id=${l.id}
            slot=${l.slotName?l.slotName:P}
            .component=${l}
            .weight=${l.weight??"initial"}
            .processor=${this.processor}
            .surfaceId=${this.surfaceId}
            .dataContextPath=${l.dataContextPath??""}
            .enableDate=${l.properties.enableDate??!0}
            .enableTime=${l.properties.enableTime??!0}
            .value=${l.properties.value}
            .enableCustomElements=${this.enableCustomElements}
          ></a2ui-datetimeinput>`}case"Divider":{const l=v;return y`<a2ui-divider
            id=${l.id}
            slot=${l.slotName?l.slotName:P}
            .component=${l}
            .weight=${l.weight??"initial"}
            .processor=${this.processor}
            .surfaceId=${this.surfaceId}
            .dataContextPath=${l.dataContextPath}
            .thickness=${l.properties.thickness}
            .axis=${l.properties.axis}
            .color=${l.properties.color}
            .enableCustomElements=${this.enableCustomElements}
          ></a2ui-divider>`}case"MultipleChoice":{const l=v;return y`<a2ui-multiplechoice
            id=${l.id}
            slot=${l.slotName?l.slotName:P}
            .component=${l}
            .weight=${l.weight??"initial"}
            .processor=${this.processor}
            .surfaceId=${this.surfaceId}
            .dataContextPath=${l.dataContextPath}
            .options=${l.properties.options}
            .maxAllowedSelections=${l.properties.maxAllowedSelections}
            .selections=${l.properties.selections}
            .variant=${l.properties.variant}
            .filterable=${l.properties.filterable}
            .enableCustomElements=${this.enableCustomElements}
          ></a2ui-multiplechoice>`}case"Slider":{const l=v;return y`<a2ui-slider
            id=${l.id}
            slot=${l.slotName?l.slotName:P}
            .component=${l}
            .weight=${l.weight??"initial"}
            .processor=${this.processor}
            .surfaceId=${this.surfaceId}
            .dataContextPath=${l.dataContextPath}
            .value=${l.properties.value}
            .minValue=${l.properties.minValue}
            .maxValue=${l.properties.maxValue}
            .enableCustomElements=${this.enableCustomElements}
          ></a2ui-slider>`}case"TextField":{const l=v;return y`<a2ui-textfield
            id=${l.id}
            slot=${l.slotName?l.slotName:P}
            .component=${l}
            .weight=${l.weight??"initial"}
            .processor=${this.processor}
            .surfaceId=${this.surfaceId}
            .dataContextPath=${l.dataContextPath}
            .label=${l.properties.label}
            .text=${l.properties.text}
            .type=${l.properties.type}
            .validationRegexp=${l.properties.validationRegexp}
            .enableCustomElements=${this.enableCustomElements}
          ></a2ui-textfield>`}case"Video":{const l=v;return y`<a2ui-video
            id=${l.id}
            slot=${l.slotName?l.slotName:P}
            .component=${l}
            .weight=${l.weight??"initial"}
            .processor=${this.processor}
            .surfaceId=${this.surfaceId}
            .dataContextPath=${l.dataContextPath}
            .url=${l.properties.url}
            .enableCustomElements=${this.enableCustomElements}
          ></a2ui-video>`}case"Tabs":{const l=v,Q=[],B=[];if(l.properties.tabItems)for(const G of l.properties.tabItems)Q.push(G.title),B.push(G.child);return y`<a2ui-tabs
            id=${l.id}
            slot=${l.slotName?l.slotName:P}
            .component=${l}
            .weight=${l.weight??"initial"}
            .processor=${this.processor}
            .surfaceId=${this.surfaceId}
            .dataContextPath=${l.dataContextPath}
            .titles=${Q}
            .childComponents=${B}
            .enableCustomElements=${this.enableCustomElements}
          ></a2ui-tabs>`}case"Modal":{const l=v,Q=[l.properties.entryPointChild,l.properties.contentChild];return l.properties.entryPointChild.slotName="entry",y`<a2ui-modal
            id=${l.id}
            slot=${l.slotName?l.slotName:P}
            .component=${l}
            .weight=${l.weight??"initial"}
            .processor=${this.processor}
            .surfaceId=${this.surfaceId}
            .dataContextPath=${l.dataContextPath}
            .childComponents=${Q}
            .enableCustomElements=${this.enableCustomElements}
          ></a2ui-modal>`}default:return this.renderCustomComponent(v)}})}`:P:P}renderCustomComponent(C){if(!this.enableCustomElements)return;const v=C,Q=ct.get(C.type)||customElements.get(C.type);if(!Q)return y`Unknown element ${C.type}`;const B=new Q;B.id=v.id,v.slotName&&(B.slot=v.slotName),B.component=v,B.weight=v.weight??"initial",B.processor=this.processor,B.surfaceId=this.surfaceId,B.dataContextPath=v.dataContextPath??"/";for(const[G,de]of Object.entries(C.properties))B[G]=de;return y`${B}`}render(){return y`<slot></slot>`}},$=new WeakMap,A=new WeakMap,ee=new WeakMap,w=new WeakMap,D=new WeakMap,F=new WeakMap,ie=new WeakMap,ae=new WeakMap,re=new WeakMap,e=H,(()=>{const C=typeof Symbol=="function"&&Symbol.metadata?Object.create(a[Symbol.metadata]??null):void 0;f=[V()],p=[V()],_=[gt({context:ns})],o=[V({attribute:!1})],L=[V({attribute:!1})],S=[V()],x=[V()],E=[V()],le(H,null,f,{kind:"accessor",name:"surfaceId",static:!1,private:!1,access:{has:v=>"surfaceId"in v,get:v=>v.surfaceId,set:(v,l)=>{v.surfaceId=l}},metadata:C},h,g),le(H,null,p,{kind:"accessor",name:"component",static:!1,private:!1,access:{has:v=>"component"in v,get:v=>v.component,set:(v,l)=>{v.component=l}},metadata:C},u,t),le(H,null,_,{kind:"accessor",name:"theme",static:!1,private:!1,access:{has:v=>"theme"in v,get:v=>v.theme,set:(v,l)=>{v.theme=l}},metadata:C},m,c),le(H,null,o,{kind:"accessor",name:"childComponents",static:!1,private:!1,access:{has:v=>"childComponents"in v,get:v=>v.childComponents,set:(v,l)=>{v.childComponents=l}},metadata:C},i,d),le(H,null,L,{kind:"accessor",name:"processor",static:!1,private:!1,access:{has:v=>"processor"in v,get:v=>v.processor,set:(v,l)=>{v.processor=l}},metadata:C},k,j),le(H,null,S,{kind:"accessor",name:"dataContextPath",static:!1,private:!1,access:{has:v=>"dataContextPath"in v,get:v=>v.dataContextPath,set:(v,l)=>{v.dataContextPath=l}},metadata:C},N,R),le(H,null,x,{kind:"accessor",name:"enableCustomElements",static:!1,private:!1,access:{has:v=>"enableCustomElements"in v,get:v=>v.enableCustomElements,set:(v,l)=>{v.enableCustomElements=l}},metadata:C},T,M),le(H,null,E,{kind:"setter",name:"weight",static:!1,private:!1,access:{has:v=>"weight"in v,set:(v,l)=>{v.weight=l}},metadata:C},null,b),le(null,s={value:e},n,{kind:"class",name:e.name,metadata:C},null,r),e=s.value,C&&Object.defineProperty(e,Symbol.metadata,{enumerable:!0,configurable:!0,writable:!0,value:C})})(),H.styles=[J,Z`
      :host {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 80%;
      }
    `],te(e,r),e})();var ut=function(n,s,r,e,a,b){function f(d){if(d!==void 0&&typeof d!="function")throw new TypeError("Function expected");return d}for(var h=e.kind,g=h==="getter"?"get":h==="setter"?"set":"value",p=!s&&n?e.static?n:n.prototype:null,u=s||(p?Object.getOwnPropertyDescriptor(p,e.name):{}),t,_=!1,m=r.length-1;m>=0;m--){var c={};for(var o in e)c[o]=o==="access"?{}:e[o];for(var o in e.access)c.access[o]=e.access[o];c.addInitializer=function(d){if(_)throw new TypeError("Cannot add initializers after decoration has completed");b.push(f(d||null))};var i=(0,r[m])(h==="accessor"?{get:u.get,set:u.set}:u[g],c);if(h==="accessor"){if(i===void 0)continue;if(i===null||typeof i!="object")throw new TypeError("Object expected");(t=f(i.get))&&(u.get=t),(t=f(i.set))&&(u.set=t),(t=f(i.init))&&a.unshift(t)}else(t=f(i))&&(h==="field"?a.unshift(t):u[g]=t)}p&&Object.defineProperty(p,e.name,u),_=!0},Be=function(n,s,r){for(var e=arguments.length>2,a=0;a<s.length;a++)r=e?s[a].call(n,r):s[a].call(n);return e?r:void 0};(()=>{var g,p,_t,t;let n=[q("a2ui-audioplayer")],s,r=[],e,a=K,b,f=[],h=[];return t=class extends a{constructor(){super(...arguments);z(this,p);z(this,g,Be(this,f,null));Be(this,h)}get url(){return O(this,g)}set url(c){I(this,g,c)}render(){var c,o;return y`<section
      class=${W(this.theme.components.AudioPlayer)}
      style=${(c=this.theme.additionalStyles)!=null&&c.AudioPlayer?X((o=this.theme.additionalStyles)==null?void 0:o.AudioPlayer):P}
    >
      ${U(this,p,_t).call(this)}
    </section>`}},g=new WeakMap,p=new WeakSet,_t=function(){if(!this.url)return P;if(this.url&&typeof this.url=="object"){if("literalString"in this.url)return y`<audio controls src=${this.url.literalString} />`;if("literal"in this.url)return y`<audio controls src=${this.url.literal} />`;if(this.url&&"path"in this.url&&this.url.path){if(!this.processor||!this.component)return y`(no processor)`;const c=this.processor.getData(this.component,this.url.path,this.surfaceId??Y.DEFAULT_SURFACE_ID);return c?typeof c!="string"?y`Invalid audio URL`:y`<audio controls src=${c} />`:y`Invalid audio URL`}}return y`(empty)`},e=t,(()=>{const c=typeof Symbol=="function"&&Symbol.metadata?Object.create(a[Symbol.metadata]??null):void 0;b=[V()],ut(t,null,b,{kind:"accessor",name:"url",static:!1,private:!1,access:{has:o=>"url"in o,get:o=>o.url,set:(o,i)=>{o.url=i}},metadata:c},f,h),ut(null,s={value:e},n,{kind:"class",name:e.name,metadata:c},null,r),e=s.value,c&&Object.defineProperty(e,Symbol.metadata,{enumerable:!0,configurable:!0,writable:!0,value:c})})(),t.styles=[J,Z`
      * {
        box-sizing: border-box;
      }

      :host {
        display: block;
        flex: var(--weight);
        min-height: 0;
        overflow: auto;
      }

      audio {
        display: block;
        width: 100%;
      }
    `],Be(e,r),e})();var dt=function(n,s,r,e,a,b){function f(d){if(d!==void 0&&typeof d!="function")throw new TypeError("Function expected");return d}for(var h=e.kind,g=h==="getter"?"get":h==="setter"?"set":"value",p=!s&&n?e.static?n:n.prototype:null,u=s||(p?Object.getOwnPropertyDescriptor(p,e.name):{}),t,_=!1,m=r.length-1;m>=0;m--){var c={};for(var o in e)c[o]=o==="access"?{}:e[o];for(var o in e.access)c.access[o]=e.access[o];c.addInitializer=function(d){if(_)throw new TypeError("Cannot add initializers after decoration has completed");b.push(f(d||null))};var i=(0,r[m])(h==="accessor"?{get:u.get,set:u.set}:u[g],c);if(h==="accessor"){if(i===void 0)continue;if(i===null||typeof i!="object")throw new TypeError("Object expected");(t=f(i.get))&&(u.get=t),(t=f(i.set))&&(u.set=t),(t=f(i.init))&&a.unshift(t)}else(t=f(i))&&(h==="field"?a.unshift(t):u[g]=t)}p&&Object.defineProperty(p,e.name,u),_=!0},We=function(n,s,r){for(var e=arguments.length>2,a=0;a<s.length;a++)r=e?s[a].call(n,r):s[a].call(n);return e?r:void 0};(()=>{var g,p;let n=[q("a2ui-button")],s,r=[],e,a=K,b,f=[],h=[];return p=class extends a{constructor(){super(...arguments);z(this,g,We(this,f,null));We(this,h)}get action(){return O(this,g)}set action(_){I(this,g,_)}render(){var _,m;return y`<button
      class=${W(this.theme.components.Button)}
      style=${(_=this.theme.additionalStyles)!=null&&_.Button?X((m=this.theme.additionalStyles)==null?void 0:m.Button):P}
      @click=${()=>{if(!this.action)return;const c=new tt({eventType:"a2ui.action",action:this.action,dataContextPath:this.dataContextPath,sourceComponentId:this.id,sourceComponent:this.component});this.dispatchEvent(c)}}
    >
      <slot></slot>
    </button>`}},g=new WeakMap,e=p,(()=>{const _=typeof Symbol=="function"&&Symbol.metadata?Object.create(a[Symbol.metadata]??null):void 0;b=[V()],dt(p,null,b,{kind:"accessor",name:"action",static:!1,private:!1,access:{has:m=>"action"in m,get:m=>m.action,set:(m,c)=>{m.action=c}},metadata:_},f,h),dt(null,s={value:e},n,{kind:"class",name:e.name,metadata:_},null,r),e=s.value,_&&Object.defineProperty(e,Symbol.metadata,{enumerable:!0,configurable:!0,writable:!0,value:_})})(),p.styles=[J,Z`
      :host {
        display: block;
        flex: var(--weight);
        min-height: 0;
      }
    `],We(e,r),e})();var os=function(n,s,r,e,a,b){function f(d){if(d!==void 0&&typeof d!="function")throw new TypeError("Function expected");return d}for(var h=e.kind,g=h==="getter"?"get":h==="setter"?"set":"value",p=!s&&n?e.static?n:n.prototype:null,u=s||(p?Object.getOwnPropertyDescriptor(p,e.name):{}),t,_=!1,m=r.length-1;m>=0;m--){var c={};for(var o in e)c[o]=o==="access"?{}:e[o];for(var o in e.access)c.access[o]=e.access[o];c.addInitializer=function(d){if(_)throw new TypeError("Cannot add initializers after decoration has completed");b.push(f(d||null))};var i=(0,r[m])(h==="accessor"?{get:u.get,set:u.set}:u[g],c);if(h==="accessor"){if(i===void 0)continue;if(i===null||typeof i!="object")throw new TypeError("Object expected");(t=f(i.get))&&(u.get=t),(t=f(i.set))&&(u.set=t),(t=f(i.init))&&a.unshift(t)}else(t=f(i))&&(h==="field"?a.unshift(t):u[g]=t)}p&&Object.defineProperty(p,e.name,u),_=!0},cs=function(n,s,r){for(var e=arguments.length>2,a=0;a<s.length;a++)r=e?s[a].call(n,r):s[a].call(n);return e?r:void 0};(()=>{var b;let n=[q("a2ui-card")],s,r=[],e,a=K;return b=class extends a{render(){var h,g;return y` <section
      class=${W(this.theme.components.Card)}
      style=${(h=this.theme.additionalStyles)!=null&&h.Card?X((g=this.theme.additionalStyles)==null?void 0:g.Card):P}
    >
      <slot></slot>
    </section>`}},e=b,(()=>{const h=typeof Symbol=="function"&&Symbol.metadata?Object.create(a[Symbol.metadata]??null):void 0;os(null,s={value:e},n,{kind:"class",name:e.name,metadata:h},null,r),e=s.value,h&&Object.defineProperty(e,Symbol.metadata,{enumerable:!0,configurable:!0,writable:!0,value:h})})(),b.styles=[J,Z`
      * {
        box-sizing: border-box;
      }

      :host {
        display: block;
        flex: var(--weight);
        min-height: 0;
        overflow: auto;
      }

      section {
        height: 100%;
        width: 100%;
        min-height: 0;
        overflow: auto;

        ::slotted(*) {
          height: 100%;
          width: 100%;
        }
      }
    `],cs(e,r),e})();function _e(n,s,r,e){if(n!==null&&typeof n=="object"){if("literalString"in n)return n.literalString??"";if("literal"in n&&n.literal!==void 0)return n.literal??"";if(n&&"path"in n&&n.path){if(!r||!s)return"(no model)";const a=r.getData(s,n.path,e??Y.DEFAULT_SURFACE_ID);return a===null||typeof a!="string"?"":a}}return""}function us(n,s,r,e){if(n!==null&&typeof n=="object"){if("literalNumber"in n)return n.literalNumber??0;if("literal"in n&&n.literal!==void 0)return n.literal??0;if(n&&"path"in n&&n.path){if(!r||!s)return-1;let a=r.getData(s,n.path,e??Y.DEFAULT_SURFACE_ID);return typeof a=="string"&&(a=Number.parseInt(a,10),Number.isNaN(a)&&(a=null)),a===null||typeof a!="number"?-1:a}}return 0}var Ze=function(n,s,r,e,a,b){function f(d){if(d!==void 0&&typeof d!="function")throw new TypeError("Function expected");return d}for(var h=e.kind,g=h==="getter"?"get":h==="setter"?"set":"value",p=!s&&n?e.static?n:n.prototype:null,u=s||(p?Object.getOwnPropertyDescriptor(p,e.name):{}),t,_=!1,m=r.length-1;m>=0;m--){var c={};for(var o in e)c[o]=o==="access"?{}:e[o];for(var o in e.access)c.access[o]=e.access[o];c.addInitializer=function(d){if(_)throw new TypeError("Cannot add initializers after decoration has completed");b.push(f(d||null))};var i=(0,r[m])(h==="accessor"?{get:u.get,set:u.set}:u[g],c);if(h==="accessor"){if(i===void 0)continue;if(i===null||typeof i!="object")throw new TypeError("Object expected");(t=f(i.get))&&(u.get=t),(t=f(i.set))&&(u.set=t),(t=f(i.init))&&a.unshift(t)}else(t=f(i))&&(h==="field"?a.unshift(t):u[g]=t)}p&&Object.defineProperty(p,e.name,u),_=!0},be=function(n,s,r){for(var e=arguments.length>2,a=0;a<s.length;a++)r=e?s[a].call(n,r):s[a].call(n);return e?r:void 0};(()=>{var t,_,m,vt,Fe,i;let n=[q("a2ui-checkbox")],s,r=[],e,a=K,b,f=[],h=[],g,p=[],u=[];return i=class extends a{constructor(){super(...arguments);z(this,m);z(this,t,be(this,f,null));z(this,_,(be(this,h),be(this,p,null)));be(this,u)}get value(){return O(this,t)}set value(k){I(this,t,k)}get label(){return O(this,_)}set label(k){I(this,_,k)}render(){if(this.value&&typeof this.value=="object"){if("literalBoolean"in this.value&&this.value.literalBoolean)return U(this,m,Fe).call(this,this.value.literalBoolean);if("literal"in this.value&&this.value.literal!==void 0)return U(this,m,Fe).call(this,this.value.literal);if(this.value&&"path"in this.value&&this.value.path){if(!this.processor||!this.component)return y`(no model)`;const k=this.processor.getData(this.component,this.value.path,this.surfaceId??Y.DEFAULT_SURFACE_ID);return k===null?y`Invalid label`:typeof k!="boolean"?y`Invalid label`:U(this,m,Fe).call(this,k)}}return P}},t=new WeakMap,_=new WeakMap,m=new WeakSet,vt=function(k){!this.value||!this.processor||"path"in this.value&&this.value.path&&this.processor.setData(this.component,this.value.path,k,this.surfaceId??Y.DEFAULT_SURFACE_ID)},Fe=function(k){var j,S;return y` <section
      class=${W(this.theme.components.CheckBox.container)}
      style=${(j=this.theme.additionalStyles)!=null&&j.CheckBox?X((S=this.theme.additionalStyles)==null?void 0:S.CheckBox):P}
    >
      <input
        class=${W(this.theme.components.CheckBox.element)}
        autocomplete="off"
        @input=${N=>{N.target instanceof HTMLInputElement&&U(this,m,vt).call(this,N.target.checked)}}
        id="data"
        type="checkbox"
        .checked=${k}
      />
      <label class=${W(this.theme.components.CheckBox.label)} for="data"
        >${_e(this.label,this.component,this.processor,this.surfaceId)}</label
      >
    </section>`},e=i,(()=>{const k=typeof Symbol=="function"&&Symbol.metadata?Object.create(a[Symbol.metadata]??null):void 0;b=[V()],g=[V()],Ze(i,null,b,{kind:"accessor",name:"value",static:!1,private:!1,access:{has:j=>"value"in j,get:j=>j.value,set:(j,S)=>{j.value=S}},metadata:k},f,h),Ze(i,null,g,{kind:"accessor",name:"label",static:!1,private:!1,access:{has:j=>"label"in j,get:j=>j.label,set:(j,S)=>{j.label=S}},metadata:k},p,u),Ze(null,s={value:e},n,{kind:"class",name:e.name,metadata:k},null,r),e=s.value,k&&Object.defineProperty(e,Symbol.metadata,{enumerable:!0,configurable:!0,writable:!0,value:k})})(),i.styles=[J,Z`
      * {
        box-sizing: border-box;
      }

      :host {
        display: block;
        flex: var(--weight);
        min-height: 0;
        overflow: auto;
      }

      input {
        display: block;
        width: 100%;
      }

      .description {
        font-size: 14px;
        margin-bottom: 4px;
      }
    `],be(e,r),e})();var qe=function(n,s,r,e,a,b){function f(d){if(d!==void 0&&typeof d!="function")throw new TypeError("Function expected");return d}for(var h=e.kind,g=h==="getter"?"get":h==="setter"?"set":"value",p=!s&&n?e.static?n:n.prototype:null,u=s||(p?Object.getOwnPropertyDescriptor(p,e.name):{}),t,_=!1,m=r.length-1;m>=0;m--){var c={};for(var o in e)c[o]=o==="access"?{}:e[o];for(var o in e.access)c.access[o]=e.access[o];c.addInitializer=function(d){if(_)throw new TypeError("Cannot add initializers after decoration has completed");b.push(f(d||null))};var i=(0,r[m])(h==="accessor"?{get:u.get,set:u.set}:u[g],c);if(h==="accessor"){if(i===void 0)continue;if(i===null||typeof i!="object")throw new TypeError("Object expected");(t=f(i.get))&&(u.get=t),(t=f(i.set))&&(u.set=t),(t=f(i.init))&&a.unshift(t)}else(t=f(i))&&(h==="field"?a.unshift(t):u[g]=t)}p&&Object.defineProperty(p,e.name,u),_=!0},ye=function(n,s,r){for(var e=arguments.length>2,a=0;a<s.length;a++)r=e?s[a].call(n,r):s[a].call(n);return e?r:void 0};(()=>{var t,_,m;let n=[q("a2ui-column")],s,r=[],e,a=K,b,f=[],h=[],g,p=[],u=[];return m=class extends a{constructor(){super(...arguments);z(this,t,ye(this,f,"stretch"));z(this,_,(ye(this,h),ye(this,p,"start")));ye(this,u)}get alignment(){return O(this,t)}set alignment(i){I(this,t,i)}get distribution(){return O(this,_)}set distribution(i){I(this,_,i)}render(){var i,d;return y`<section
      class=${W(this.theme.components.Column)}
      style=${(i=this.theme.additionalStyles)!=null&&i.Column?X((d=this.theme.additionalStyles)==null?void 0:d.Column):P}
    >
      <slot></slot>
    </section>`}},t=new WeakMap,_=new WeakMap,e=m,(()=>{const i=typeof Symbol=="function"&&Symbol.metadata?Object.create(a[Symbol.metadata]??null):void 0;b=[V({reflect:!0,type:String})],g=[V({reflect:!0,type:String})],qe(m,null,b,{kind:"accessor",name:"alignment",static:!1,private:!1,access:{has:d=>"alignment"in d,get:d=>d.alignment,set:(d,L)=>{d.alignment=L}},metadata:i},f,h),qe(m,null,g,{kind:"accessor",name:"distribution",static:!1,private:!1,access:{has:d=>"distribution"in d,get:d=>d.distribution,set:(d,L)=>{d.distribution=L}},metadata:i},p,u),qe(null,s={value:e},n,{kind:"class",name:e.name,metadata:i},null,r),e=s.value,i&&Object.defineProperty(e,Symbol.metadata,{enumerable:!0,configurable:!0,writable:!0,value:i})})(),m.styles=[J,Z`
      * {
        box-sizing: border-box;
      }

      :host {
        display: flex;
        flex: var(--weight);
      }

      section {
        display: flex;
        flex-direction: column;
        min-width: 100%;
        height: 100%;
      }

      :host([alignment="start"]) section {
        align-items: start;
      }

      :host([alignment="center"]) section {
        align-items: center;
      }

      :host([alignment="end"]) section {
        align-items: end;
      }

      :host([alignment="stretch"]) section {
        align-items: stretch;
      }

      :host([distribution="start"]) section {
        justify-content: start;
      }

      :host([distribution="center"]) section {
        justify-content: center;
      }

      :host([distribution="end"]) section {
        justify-content: end;
      }

      :host([distribution="spaceBetween"]) section {
        justify-content: space-between;
      }

      :host([distribution="spaceAround"]) section {
        justify-content: space-around;
      }

      :host([distribution="spaceEvenly"]) section {
        justify-content: space-evenly;
      }
    `],ye(e,r),e})();var $e=function(n,s,r,e,a,b){function f(d){if(d!==void 0&&typeof d!="function")throw new TypeError("Function expected");return d}for(var h=e.kind,g=h==="getter"?"get":h==="setter"?"set":"value",p=!s&&n?e.static?n:n.prototype:null,u=s||(p?Object.getOwnPropertyDescriptor(p,e.name):{}),t,_=!1,m=r.length-1;m>=0;m--){var c={};for(var o in e)c[o]=o==="access"?{}:e[o];for(var o in e.access)c.access[o]=e.access[o];c.addInitializer=function(d){if(_)throw new TypeError("Cannot add initializers after decoration has completed");b.push(f(d||null))};var i=(0,r[m])(h==="accessor"?{get:u.get,set:u.set}:u[g],c);if(h==="accessor"){if(i===void 0)continue;if(i===null||typeof i!="object")throw new TypeError("Object expected");(t=f(i.get))&&(u.get=t),(t=f(i.set))&&(u.set=t),(t=f(i.init))&&a.unshift(t)}else(t=f(i))&&(h==="field"?a.unshift(t):u[g]=t)}p&&Object.defineProperty(p,e.name,u),_=!0},oe=function(n,s,r){for(var e=arguments.length>2,a=0;a<s.length;a++)r=e?s[a].call(n,r):s[a].call(n);return e?r:void 0};(()=>{var d,L,k,j,S,bt,Ve,Ne,yt,ge,st,$;let n=[q("a2ui-datetimeinput")],s,r=[],e,a=K,b,f=[],h=[],g,p=[],u=[],t,_=[],m=[],c,o=[],i=[];return $=class extends a{constructor(){super(...arguments);z(this,S);z(this,d,oe(this,f,null));z(this,L,(oe(this,h),oe(this,p,null)));z(this,k,(oe(this,u),oe(this,_,!0)));z(this,j,(oe(this,m),oe(this,o,!0)));oe(this,i)}get value(){return O(this,d)}set value(w){I(this,d,w)}get label(){return O(this,L)}set label(w){I(this,L,w)}get enableDate(){return O(this,k)}set enableDate(w){I(this,k,w)}get enableTime(){return O(this,j)}set enableTime(w){I(this,j,w)}render(){if(this.value&&typeof this.value=="object"){if("literalString"in this.value&&this.value.literalString)return U(this,S,Ve).call(this,this.value.literalString);if("literal"in this.value&&this.value.literal!==void 0)return U(this,S,Ve).call(this,this.value.literal);if(this.value&&"path"in this.value&&this.value.path){if(!this.processor||!this.component)return y`(no model)`;const w=this.processor.getData(this.component,this.value.path,this.surfaceId??Y.DEFAULT_SURFACE_ID);return typeof w!="string"?y`(invalid)`:U(this,S,Ve).call(this,w)}}return P}},d=new WeakMap,L=new WeakMap,k=new WeakMap,j=new WeakMap,S=new WeakSet,bt=function(w){!this.value||!this.processor||"path"in this.value&&this.value.path&&this.processor.setData(this.component,this.value.path,w,this.surfaceId??Y.DEFAULT_SURFACE_ID)},Ve=function(w){var D,F;return y`<section
      class=${W(this.theme.components.DateTimeInput.container)}
    >
      <label
        for="data"
        class=${W(this.theme.components.DateTimeInput.label)}
        >${U(this,S,st).call(this)}</label
      >
      <input
        autocomplete="off"
        class=${W(this.theme.components.DateTimeInput.element)}
        style=${(D=this.theme.additionalStyles)!=null&&D.DateTimeInput?X((F=this.theme.additionalStyles)==null?void 0:F.DateTimeInput):P}
        @input=${ie=>{ie.target instanceof HTMLInputElement&&U(this,S,bt).call(this,ie.target.value)}}
        id="data"
        name="data"
        .value=${U(this,S,yt).call(this,w)}
        .placeholder=${U(this,S,st).call(this)}
        .type=${U(this,S,Ne).call(this)}
      />
    </section>`},Ne=function(){return this.enableDate&&this.enableTime?"datetime-local":this.enableDate?"date":this.enableTime?"time":"datetime-local"},yt=function(w){const D=U(this,S,Ne).call(this),F=w?new Date(w):null;if(!F||isNaN(F.getTime()))return"";const ie=U(this,S,ge).call(this,F.getFullYear()),ae=U(this,S,ge).call(this,F.getMonth()+1),re=U(this,S,ge).call(this,F.getDate()),H=U(this,S,ge).call(this,F.getHours()),je=U(this,S,ge).call(this,F.getMinutes());return D==="date"?`${ie}-${ae}-${re}`:D==="time"?`${H}:${je}`:`${ie}-${ae}-${re}T${H}:${je}`},ge=function(w){return w.toString().padStart(2,"0")},st=function(){const w=U(this,S,Ne).call(this);return w==="date"?"Date":w==="time"?"Time":"Date & Time"},e=$,(()=>{const w=typeof Symbol=="function"&&Symbol.metadata?Object.create(a[Symbol.metadata]??null):void 0;b=[V()],g=[V()],t=[V({reflect:!1,type:Boolean})],c=[V({reflect:!1,type:Boolean})],$e($,null,b,{kind:"accessor",name:"value",static:!1,private:!1,access:{has:D=>"value"in D,get:D=>D.value,set:(D,F)=>{D.value=F}},metadata:w},f,h),$e($,null,g,{kind:"accessor",name:"label",static:!1,private:!1,access:{has:D=>"label"in D,get:D=>D.label,set:(D,F)=>{D.label=F}},metadata:w},p,u),$e($,null,t,{kind:"accessor",name:"enableDate",static:!1,private:!1,access:{has:D=>"enableDate"in D,get:D=>D.enableDate,set:(D,F)=>{D.enableDate=F}},metadata:w},_,m),$e($,null,c,{kind:"accessor",name:"enableTime",static:!1,private:!1,access:{has:D=>"enableTime"in D,get:D=>D.enableTime,set:(D,F)=>{D.enableTime=F}},metadata:w},o,i),$e(null,s={value:e},n,{kind:"class",name:e.name,metadata:w},null,r),e=s.value,w&&Object.defineProperty(e,Symbol.metadata,{enumerable:!0,configurable:!0,writable:!0,value:w})})(),$.styles=[J,Z`
      * {
        box-sizing: border-box;
      }

      :host {
        display: block;
        flex: var(--weight);
        min-height: 0;
        overflow: auto;
      }

      input {
        display: block;
        border-radius: 8px;
        padding: 8px;
        border: 1px solid #ccc;
        width: 100%;
      }
    `],oe(e,r),e})();var ds=function(n,s,r,e,a,b){function f(d){if(d!==void 0&&typeof d!="function")throw new TypeError("Function expected");return d}for(var h=e.kind,g=h==="getter"?"get":h==="setter"?"set":"value",p=!s&&n?e.static?n:n.prototype:null,u=s||(p?Object.getOwnPropertyDescriptor(p,e.name):{}),t,_=!1,m=r.length-1;m>=0;m--){var c={};for(var o in e)c[o]=o==="access"?{}:e[o];for(var o in e.access)c.access[o]=e.access[o];c.addInitializer=function(d){if(_)throw new TypeError("Cannot add initializers after decoration has completed");b.push(f(d||null))};var i=(0,r[m])(h==="accessor"?{get:u.get,set:u.set}:u[g],c);if(h==="accessor"){if(i===void 0)continue;if(i===null||typeof i!="object")throw new TypeError("Object expected");(t=f(i.get))&&(u.get=t),(t=f(i.set))&&(u.set=t),(t=f(i.init))&&a.unshift(t)}else(t=f(i))&&(h==="field"?a.unshift(t):u[g]=t)}p&&Object.defineProperty(p,e.name,u),_=!0},hs=function(n,s,r){for(var e=arguments.length>2,a=0;a<s.length;a++)r=e?s[a].call(n,r):s[a].call(n);return e?r:void 0};(()=>{var b;let n=[q("a2ui-divider")],s,r=[],e,a=K;return b=class extends a{render(){var h,g;return y`<hr
      class=${W(this.theme.components.Divider)}
      style=${(h=this.theme.additionalStyles)!=null&&h.Divider?X((g=this.theme.additionalStyles)==null?void 0:g.Divider):P}
    />`}},e=b,(()=>{const h=typeof Symbol=="function"&&Symbol.metadata?Object.create(a[Symbol.metadata]??null):void 0;ds(null,s={value:e},n,{kind:"class",name:e.name,metadata:h},null,r),e=s.value,h&&Object.defineProperty(e,Symbol.metadata,{enumerable:!0,configurable:!0,writable:!0,value:h})})(),b.styles=[J,Z`
      :host {
        display: block;
        min-height: 0;
        overflow: auto;
      }

      hr {
        height: 1px;
        background: #ccc;
        border: none;
      }
    `],hs(e,r),e})();var ht=function(n,s,r,e,a,b){function f(d){if(d!==void 0&&typeof d!="function")throw new TypeError("Function expected");return d}for(var h=e.kind,g=h==="getter"?"get":h==="setter"?"set":"value",p=!s&&n?e.static?n:n.prototype:null,u=s||(p?Object.getOwnPropertyDescriptor(p,e.name):{}),t,_=!1,m=r.length-1;m>=0;m--){var c={};for(var o in e)c[o]=o==="access"?{}:e[o];for(var o in e.access)c.access[o]=e.access[o];c.addInitializer=function(d){if(_)throw new TypeError("Cannot add initializers after decoration has completed");b.push(f(d||null))};var i=(0,r[m])(h==="accessor"?{get:u.get,set:u.set}:u[g],c);if(h==="accessor"){if(i===void 0)continue;if(i===null||typeof i!="object")throw new TypeError("Object expected");(t=f(i.get))&&(u.get=t),(t=f(i.set))&&(u.set=t),(t=f(i.init))&&a.unshift(t)}else(t=f(i))&&(h==="field"?a.unshift(t):u[g]=t)}p&&Object.defineProperty(p,e.name,u),_=!0},Ge=function(n,s,r){for(var e=arguments.length>2,a=0;a<s.length;a++)r=e?s[a].call(n,r):s[a].call(n);return e?r:void 0};(()=>{var g,p,$t,t;let n=[q("a2ui-icon")],s,r=[],e,a=K,b,f=[],h=[];return t=class extends a{constructor(){super(...arguments);z(this,p);z(this,g,Ge(this,f,null));Ge(this,h)}get name(){return O(this,g)}set name(c){I(this,g,c)}render(){var c,o;return y`<section
      class=${W(this.theme.components.Icon)}
      style=${(c=this.theme.additionalStyles)!=null&&c.Icon?X((o=this.theme.additionalStyles)==null?void 0:o.Icon):P}
    >
      ${U(this,p,$t).call(this)}
    </section>`}},g=new WeakMap,p=new WeakSet,$t=function(){if(!this.name)return P;const c=o=>(o=o.replace(/([A-Z])/gm,"_$1").toLocaleLowerCase(),y`<span class="g-icon">${o}</span>`);if(this.name&&typeof this.name=="object"){if("literalString"in this.name){const o=this.name.literalString??"";return c(o)}else if("literal"in this.name){const o=this.name.literal??"";return c(o)}else if(this.name&&"path"in this.name&&this.name.path){if(!this.processor||!this.component)return y`(no model)`;const o=this.processor.getData(this.component,this.name.path,this.surfaceId??Y.DEFAULT_SURFACE_ID);return o?typeof o!="string"?y`Invalid icon name`:c(o):y`Invalid icon name`}}return y`(empty)`},e=t,(()=>{const c=typeof Symbol=="function"&&Symbol.metadata?Object.create(a[Symbol.metadata]??null):void 0;b=[V()],ht(t,null,b,{kind:"accessor",name:"name",static:!1,private:!1,access:{has:o=>"name"in o,get:o=>o.name,set:(o,i)=>{o.name=i}},metadata:c},f,h),ht(null,s={value:e},n,{kind:"class",name:e.name,metadata:c},null,r),e=s.value,c&&Object.defineProperty(e,Symbol.metadata,{enumerable:!0,configurable:!0,writable:!0,value:c})})(),t.styles=[J,Z`
      * {
        box-sizing: border-box;
      }

      :host {
        display: block;
        flex: var(--weight);
        min-height: 0;

      }

      .g-icon {
        font-family: 'Material Symbols Outlined';
        font-weight: normal;
        font-style: normal;
        font-size: 24px;
        display: inline-block;
        line-height: 1;
        text-transform: none;
        letter-spacing: normal;
        word-wrap: normal;
        white-space: nowrap;
        direction: ltr;
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
        -moz-osx-font-smoothing: grayscale;
        font-feature-settings: 'liga';
      }
    `],Ge(e,r),e})();var Oe=function(n,s,r,e,a,b){function f(d){if(d!==void 0&&typeof d!="function")throw new TypeError("Function expected");return d}for(var h=e.kind,g=h==="getter"?"get":h==="setter"?"set":"value",p=!s&&n?e.static?n:n.prototype:null,u=s||(p?Object.getOwnPropertyDescriptor(p,e.name):{}),t,_=!1,m=r.length-1;m>=0;m--){var c={};for(var o in e)c[o]=o==="access"?{}:e[o];for(var o in e.access)c.access[o]=e.access[o];c.addInitializer=function(d){if(_)throw new TypeError("Cannot add initializers after decoration has completed");b.push(f(d||null))};var i=(0,r[m])(h==="accessor"?{get:u.get,set:u.set}:u[g],c);if(h==="accessor"){if(i===void 0)continue;if(i===null||typeof i!="object")throw new TypeError("Object expected");(t=f(i.get))&&(u.get=t),(t=f(i.set))&&(u.set=t),(t=f(i.init))&&a.unshift(t)}else(t=f(i))&&(h==="field"?a.unshift(t):u[g]=t)}p&&Object.defineProperty(p,e.name,u),_=!0},fe=function(n,s,r){for(var e=arguments.length>2,a=0;a<s.length;a++)r=e?s[a].call(n,r):s[a].call(n);return e?r:void 0};(()=>{var c,o,i,d,wt,k;let n=[q("a2ui-image")],s,r=[],e,a=K,b,f=[],h=[],g,p=[],u=[],t,_=[],m=[];return k=class extends a{constructor(){super(...arguments);z(this,d);z(this,c,fe(this,f,null));z(this,o,(fe(this,h),fe(this,p,null)));z(this,i,(fe(this,u),fe(this,_,null)));fe(this,m)}get url(){return O(this,c)}set url(N){I(this,c,N)}get usageHint(){return O(this,o)}set usageHint(N){I(this,o,N)}get fit(){return O(this,i)}set fit(N){I(this,i,N)}render(){var R;const N=ot(this.theme.components.Image.all,this.usageHint?this.theme.components.Image[this.usageHint]:{});return y`<section
      class=${W(N)}
      style=${X({...((R=this.theme.additionalStyles)==null?void 0:R.Image)??{},"--object-fit":this.fit??"fill"})}
    >
      ${U(this,d,wt).call(this)}
    </section>`}},c=new WeakMap,o=new WeakMap,i=new WeakMap,d=new WeakSet,wt=function(){if(!this.url)return P;const N=R=>y`<img src=${R} />`;if(this.url&&typeof this.url=="object"){if("literalString"in this.url){const R=this.url.literalString??"";return N(R)}else if("literal"in this.url){const R=this.url.literal??"";return N(R)}else if(this.url&&"path"in this.url&&this.url.path){if(!this.processor||!this.component)return y`(no model)`;const R=this.processor.getData(this.component,this.url.path,this.surfaceId??Y.DEFAULT_SURFACE_ID);return R?typeof R!="string"?y`Invalid image URL`:N(R):y`Invalid image URL`}}return y`(empty)`},e=k,(()=>{const N=typeof Symbol=="function"&&Symbol.metadata?Object.create(a[Symbol.metadata]??null):void 0;b=[V()],g=[V()],t=[V()],Oe(k,null,b,{kind:"accessor",name:"url",static:!1,private:!1,access:{has:R=>"url"in R,get:R=>R.url,set:(R,x)=>{R.url=x}},metadata:N},f,h),Oe(k,null,g,{kind:"accessor",name:"usageHint",static:!1,private:!1,access:{has:R=>"usageHint"in R,get:R=>R.usageHint,set:(R,x)=>{R.usageHint=x}},metadata:N},p,u),Oe(k,null,t,{kind:"accessor",name:"fit",static:!1,private:!1,access:{has:R=>"fit"in R,get:R=>R.fit,set:(R,x)=>{R.fit=x}},metadata:N},_,m),Oe(null,s={value:e},n,{kind:"class",name:e.name,metadata:N},null,r),e=s.value,N&&Object.defineProperty(e,Symbol.metadata,{enumerable:!0,configurable:!0,writable:!0,value:N})})(),k.styles=[J,Z`
      * {
        box-sizing: border-box;
      }

      :host {
        display: block;
        flex: var(--weight);
        min-height: 0;
        overflow: auto;
      }

      img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: var(--object-fit, fill);
      }
    `],fe(e,r),e})();var ft=function(n,s,r,e,a,b){function f(d){if(d!==void 0&&typeof d!="function")throw new TypeError("Function expected");return d}for(var h=e.kind,g=h==="getter"?"get":h==="setter"?"set":"value",p=!s&&n?e.static?n:n.prototype:null,u=s||(p?Object.getOwnPropertyDescriptor(p,e.name):{}),t,_=!1,m=r.length-1;m>=0;m--){var c={};for(var o in e)c[o]=o==="access"?{}:e[o];for(var o in e.access)c.access[o]=e.access[o];c.addInitializer=function(d){if(_)throw new TypeError("Cannot add initializers after decoration has completed");b.push(f(d||null))};var i=(0,r[m])(h==="accessor"?{get:u.get,set:u.set}:u[g],c);if(h==="accessor"){if(i===void 0)continue;if(i===null||typeof i!="object")throw new TypeError("Object expected");(t=f(i.get))&&(u.get=t),(t=f(i.set))&&(u.set=t),(t=f(i.init))&&a.unshift(t)}else(t=f(i))&&(h==="field"?a.unshift(t):u[g]=t)}p&&Object.defineProperty(p,e.name,u),_=!0},Ye=function(n,s,r){for(var e=arguments.length>2,a=0;a<s.length;a++)r=e?s[a].call(n,r):s[a].call(n);return e?r:void 0};(()=>{var g,p;let n=[q("a2ui-list")],s,r=[],e,a=K,b,f=[],h=[];return p=class extends a{constructor(){super(...arguments);z(this,g,Ye(this,f,"vertical"));Ye(this,h)}get direction(){return O(this,g)}set direction(_){I(this,g,_)}render(){var _,m;return y`<section
      class=${W(this.theme.components.List)}
      style=${(_=this.theme.additionalStyles)!=null&&_.List?X((m=this.theme.additionalStyles)==null?void 0:m.List):P}
    >
      <slot></slot>
    </section>`}},g=new WeakMap,e=p,(()=>{const _=typeof Symbol=="function"&&Symbol.metadata?Object.create(a[Symbol.metadata]??null):void 0;b=[V({reflect:!0,type:String})],ft(p,null,b,{kind:"accessor",name:"direction",static:!1,private:!1,access:{has:m=>"direction"in m,get:m=>m.direction,set:(m,c)=>{m.direction=c}},metadata:_},f,h),ft(null,s={value:e},n,{kind:"class",name:e.name,metadata:_},null,r),e=s.value,_&&Object.defineProperty(e,Symbol.metadata,{enumerable:!0,configurable:!0,writable:!0,value:_})})(),p.styles=[J,Z`
      * {
        box-sizing: border-box;
      }

      :host {
        display: block;
        flex: var(--weight);
        min-height: 0;
        overflow: auto;
      }

      :host([direction="vertical"]) section {
        display: grid;
      }

      :host([direction="horizontal"]) section {
        display: flex;
        max-width: 100%;
        overflow-x: scroll;
        overflow-y: hidden;
        scrollbar-width: none;

        > ::slotted(*) {
          flex: 1 0 fit-content;
          max-width: min(80%, 400px);
        }
      }
    `],Ye(e,r),e})();var he=function(n,s,r,e,a,b){function f(d){if(d!==void 0&&typeof d!="function")throw new TypeError("Function expected");return d}for(var h=e.kind,g=h==="getter"?"get":h==="setter"?"set":"value",p=!s&&n?e.static?n:n.prototype:null,u=s||(p?Object.getOwnPropertyDescriptor(p,e.name):{}),t,_=!1,m=r.length-1;m>=0;m--){var c={};for(var o in e)c[o]=o==="access"?{}:e[o];for(var o in e.access)c.access[o]=e.access[o];c.addInitializer=function(d){if(_)throw new TypeError("Cannot add initializers after decoration has completed");b.push(f(d||null))};var i=(0,r[m])(h==="accessor"?{get:u.get,set:u.set}:u[g],c);if(h==="accessor"){if(i===void 0)continue;if(i===null||typeof i!="object")throw new TypeError("Object expected");(t=f(i.get))&&(u.get=t),(t=f(i.set))&&(u.set=t),(t=f(i.init))&&a.unshift(t)}else(t=f(i))&&(h==="field"?a.unshift(t):u[g]=t)}p&&Object.defineProperty(p,e.name,u),_=!0},se=function(n,s,r){for(var e=arguments.length>2,a=0;a<s.length;a++)r=e?s[a].call(n,r):s[a].call(n);return e?r:void 0};(()=>{var M,E,$,A,ee,w,D,F,it,xt,at,H;let n=[q("a2ui-multiplechoice")],s,r=[],e,a=K,b,f=[],h=[],g,p=[],u=[],t,_=[],m=[],c,o=[],i=[],d,L=[],k=[],j,S=[],N=[],R,x=[],T=[];return H=class extends a{constructor(){super(...arguments);z(this,F);z(this,M,se(this,f,null));z(this,E,(se(this,h),se(this,p,[])));z(this,$,(se(this,u),se(this,_,[])));z(this,A,(se(this,m),se(this,o,"checkbox")));z(this,ee,(se(this,i),se(this,L,!1)));z(this,w,(se(this,k),se(this,S,!1)));z(this,D,(se(this,N),se(this,x,"")));se(this,T)}get description(){return O(this,M)}set description(C){I(this,M,C)}get options(){return O(this,E)}set options(C){I(this,E,C)}get selections(){return O(this,$)}set selections(C){I(this,$,C)}get variant(){return O(this,A)}set variant(C){I(this,A,C)}get filterable(){return O(this,ee)}set filterable(C){I(this,ee,C)}get isOpen(){return O(this,w)}set isOpen(C){I(this,w,C)}get filterText(){return O(this,D)}set filterText(C){I(this,D,C)}getCurrentSelections(){if(Array.isArray(this.selections))return this.selections;if(!this.processor||!this.component)return[];const C=this.processor.getData(this.component,this.selections.path,this.surfaceId??Y.DEFAULT_SURFACE_ID);return Array.isArray(C)?C:[]}toggleSelection(C){const v=this.getCurrentSelections();v.includes(C)?U(this,F,it).call(this,v.filter(l=>l!==C)):U(this,F,it).call(this,[...v,C]),this.requestUpdate()}render(){const C=this.getCurrentSelections(),v=this.options.filter(B=>this.filterText?_e(B.label,this.component,this.processor,this.surfaceId).toLowerCase().includes(this.filterText.toLowerCase()):!0);if(this.variant==="chips")return y`
          <div class="container">
            ${this.description?y`<div class="header-text" style="margin-bottom: 8px;">${this.description}</div>`:P}
            ${this.filterable?U(this,F,at).call(this):P}
            <div class="chips-container">
              ${v.map(B=>{const G=_e(B.label,this.component,this.processor,this.surfaceId),de=C.includes(B.value);return y`
                  <div 
                    class="chip ${de?"selected":""}"
                    @click=${ve=>{ve.stopPropagation(),this.toggleSelection(B.value)}}
                  >
                    ${de?U(this,F,xt).call(this):P}
                    <span>${G}</span>
                  </div>
                `})}
            </div>
             ${v.length===0?y`<div style="padding: 8px; font-style: italic; color: var(--md-sys-color-outline);">No options found</div>`:P}
          </div>
        `;const l=C.length,Q=l>0?`${l} Selected`:this.description??"Select items";return y`
      <div class="container">
        <div 
          class="dropdown-header" 
          @click=${()=>this.isOpen=!this.isOpen}
        >
          <span class="header-text">${Q}</span>
          <span class="chevron ${this.isOpen?"open":""}">
            <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor">
              <path d="M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z"/>
            </svg>
          </span>
        </div>

        <div class="dropdown-wrapper ${this.isOpen?"open":""}">
          ${this.filterable?U(this,F,at).call(this):P}
          <div class="options-scroll-container">
            ${v.map(B=>{const G=_e(B.label,this.component,this.processor,this.surfaceId),de=C.includes(B.value);return y`
                <div 
                  class="option-item ${de?"selected":""}"
                  @click=${ve=>{ve.stopPropagation(),this.toggleSelection(B.value)}}
                >
                  <div class="checkbox">
                    <span class="checkbox-icon">✓</span>
                  </div>
                  <span>${G}</span>
                </div>
              `})}
             ${v.length===0?y`<div style="padding: 16px; text-align: center; color: var(--md-sys-color-outline);">No options found</div>`:P}
          </div>
        </div>
      </div>
    `}},M=new WeakMap,E=new WeakMap,$=new WeakMap,A=new WeakMap,ee=new WeakMap,w=new WeakMap,D=new WeakMap,F=new WeakSet,it=function(C){!this.selections||!this.processor||"path"in this.selections&&this.selections.path&&this.processor.setData(this.component,this.selections.path,C,this.surfaceId??Y.DEFAULT_SURFACE_ID)},xt=function(){return y`
      <svg class="chip-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
        <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
      </svg>
    `},at=function(){return y`
      <div class="filter-container">
        <input 
          type="text" 
          class="filter-input" 
          placeholder="Filter options..." 
          .value=${this.filterText}
          @input=${C=>{const v=C.target;this.filterText=v.value}}
          @click=${C=>C.stopPropagation()}
        />
      </div>
    `},e=H,(()=>{const C=typeof Symbol=="function"&&Symbol.metadata?Object.create(a[Symbol.metadata]??null):void 0;b=[V()],g=[V()],t=[V()],c=[V()],d=[V({type:Boolean})],j=[et()],R=[et()],he(H,null,b,{kind:"accessor",name:"description",static:!1,private:!1,access:{has:v=>"description"in v,get:v=>v.description,set:(v,l)=>{v.description=l}},metadata:C},f,h),he(H,null,g,{kind:"accessor",name:"options",static:!1,private:!1,access:{has:v=>"options"in v,get:v=>v.options,set:(v,l)=>{v.options=l}},metadata:C},p,u),he(H,null,t,{kind:"accessor",name:"selections",static:!1,private:!1,access:{has:v=>"selections"in v,get:v=>v.selections,set:(v,l)=>{v.selections=l}},metadata:C},_,m),he(H,null,c,{kind:"accessor",name:"variant",static:!1,private:!1,access:{has:v=>"variant"in v,get:v=>v.variant,set:(v,l)=>{v.variant=l}},metadata:C},o,i),he(H,null,d,{kind:"accessor",name:"filterable",static:!1,private:!1,access:{has:v=>"filterable"in v,get:v=>v.filterable,set:(v,l)=>{v.filterable=l}},metadata:C},L,k),he(H,null,j,{kind:"accessor",name:"isOpen",static:!1,private:!1,access:{has:v=>"isOpen"in v,get:v=>v.isOpen,set:(v,l)=>{v.isOpen=l}},metadata:C},S,N),he(H,null,R,{kind:"accessor",name:"filterText",static:!1,private:!1,access:{has:v=>"filterText"in v,get:v=>v.filterText,set:(v,l)=>{v.filterText=l}},metadata:C},x,T),he(null,s={value:e},n,{kind:"class",name:e.name,metadata:C},null,r),e=s.value,C&&Object.defineProperty(e,Symbol.metadata,{enumerable:!0,configurable:!0,writable:!0,value:C})})(),H.styles=[J,Z`
      * {
        box-sizing: border-box;
      }

      :host {
        display: block;
        flex: var(--weight);
        min-height: 0;
        position: relative;
        font-family: 'Google Sans', 'Roboto', sans-serif;
      }

      .container {
        display: flex;
        flex-direction: column;
        gap: 4px;
        position: relative;
      }

      /* Header / Trigger */
      .dropdown-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: var(--md-sys-color-surface);
        border: 1px solid var(--md-sys-color-outline-variant);
        border-radius: 8px;
        cursor: pointer;
        user-select: none;
        transition: background-color 0.2s;
        box-shadow: var(--md-sys-elevation-level1);
      }

      .dropdown-header:hover {
        background: var(--md-sys-color-surface-container-low);
      }

      .header-text {
        font-size: 1rem;
        color: var(--md-sys-color-on-surface);
        font-weight: 400;
      }

      .chevron {
        color: var(--md-sys-color-primary);
        font-size: 1.2rem;
        transition: transform 0.2s ease;
      }

      .chevron.open {
        transform: rotate(180deg);
      }

      /* Dropdown Wrapper */
      .dropdown-wrapper {
        background: var(--md-sys-color-surface);
        border: 1px solid var(--md-sys-color-outline-variant);
        border-radius: 8px;
        box-shadow: var(--md-sys-elevation-level2);
        padding: 0;
        display: none;
        flex-direction: column;
        margin-top: 4px;
        max-height: 300px;
        transition: opacity 0.2s ease-out;
        overflow: hidden; /* contain children */
      }

      .dropdown-wrapper.open {
        display: flex;
        border: 1px solid var(--md-sys-color-outline-variant);
      }

      /* Scrollable Area for Options */
      .options-scroll-container {
        overflow-y: auto;
        flex: 1; /* take remaining height */
        display: flex;
        flex-direction: column;
      }

      /* Filter Input */
      .filter-container {
        padding: 8px;
        border-bottom: 1px solid var(--md-sys-color-outline-variant);
        background: var(--md-sys-color-surface);
        z-index: 1; /* ensure top of stack */
        flex-shrink: 0; /* don't shrink */
      }

      .filter-input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid var(--md-sys-color-outline);
        border-radius: 4px;
        font-family: inherit;
        font-size: 0.9rem;
        background: var(--md-sys-color-surface-container-low);
        color: var(--md-sys-color-on-surface);
      }

      .filter-input:focus {
        outline: none;
        border-color: var(--md-sys-color-primary);
      }

      /* Option Item (Checkbox style) */
      .option-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        cursor: pointer;
        color: var(--md-sys-color-on-surface);
        font-size: 0.95rem;
        transition: background-color 0.1s;
      }

      .option-item:hover {
        background: var(--md-sys-color-surface-container-highest);
      }

      /* Custom Checkbox */
      .checkbox {
        width: 18px;
        height: 18px;
        border: 2px solid var(--md-sys-color-outline);
        border-radius: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        flex-shrink: 0;
      }

      .option-item.selected .checkbox {
        background: var(--md-sys-color-primary);
        border-color: var(--md-sys-color-primary);
      }

      .checkbox-icon {
        color: var(--md-sys-color-on-primary);
        font-size: 14px;
        font-weight: bold;
        opacity: 0;
        transform: scale(0.5);
        transition: all 0.2s;
      }

      .option-item.selected .checkbox-icon {
        opacity: 1;
        transform: scale(1);
      }

      /* Chips Layout */
      .chips-container {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 4px 0;
      }

      .chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 16px;
        border: 1px solid var(--md-sys-color-outline);
        border-radius: 16px;
        cursor: pointer;
        user-select: none;
        background: var(--md-sys-color-surface);
        color: var(--md-sys-color-on-surface);
        transition: all 0.2s ease;
        font-size: 0.9rem;
      }

      .chip:hover {
        background: var(--md-sys-color-surface-container-high);
      }

      .chip.selected {
        background: var(--md-sys-color-secondary-container);
        color: var(--md-sys-color-on-secondary-container);
        border-color: var(--md-sys-color-secondary-container);
      }
      
      .chip.selected:hover {
         background: var(--md-sys-color-secondary-container-high);
      }

      .chip-icon {
        display: none;
        width: 18px;
        height: 18px;
      }
      
      .chip.selected .chip-icon {
        display: block;
        fill: currentColor;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-8px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `],se(e,r),e})();var Je=function(n,s,r,e,a,b){function f(d){if(d!==void 0&&typeof d!="function")throw new TypeError("Function expected");return d}for(var h=e.kind,g=h==="getter"?"get":h==="setter"?"set":"value",p=!s&&n?e.static?n:n.prototype:null,u=s||(p?Object.getOwnPropertyDescriptor(p,e.name):{}),t,_=!1,m=r.length-1;m>=0;m--){var c={};for(var o in e)c[o]=o==="access"?{}:e[o];for(var o in e.access)c.access[o]=e.access[o];c.addInitializer=function(d){if(_)throw new TypeError("Cannot add initializers after decoration has completed");b.push(f(d||null))};var i=(0,r[m])(h==="accessor"?{get:u.get,set:u.set}:u[g],c);if(h==="accessor"){if(i===void 0)continue;if(i===null||typeof i!="object")throw new TypeError("Object expected");(t=f(i.get))&&(u.get=t),(t=f(i.set))&&(u.set=t),(t=f(i.init))&&a.unshift(t)}else(t=f(i))&&(h==="field"?a.unshift(t):u[g]=t)}p&&Object.defineProperty(p,e.name,u),_=!0},we=function(n,s,r){for(var e=arguments.length>2,a=0;a<s.length;a++)r=e?s[a].call(n,r):s[a].call(n);return e?r:void 0},Ie=function(n,s,r){return typeof s=="symbol"&&(s=s.description?"[".concat(s.description,"]"):""),Object.defineProperty(n,"name",{configurable:!0,value:r?"".concat(r," ",s):s})};(()=>{var m,c,rt,Re,d,Te,kt,nt,S;let n=[q("a2ui-modal")],s,r=[],e,a=K,b,f=[],h=[],g,p,u=[],t=[],_;return S=class extends a{constructor(){super(...arguments);z(this,c);z(this,m,we(this,f,!1));z(this,d,(we(this,h),we(this,u,null)));we(this,t)}render(){var x,T;return O(this,c,rt)?y`<dialog
      class=${W(this.theme.components.Modal.backdrop)}
      @click=${M=>{const[E]=M.composedPath();E instanceof HTMLDialogElement&&U(this,c,nt).call(this)}}
      ${Yt(M=>{requestAnimationFrame(()=>{!(M&&M instanceof HTMLDialogElement)||M.open||M.showModal()})})}
    >
      <section
        class=${W(this.theme.components.Modal.element)}
        style=${(x=this.theme.additionalStyles)!=null&&x.Modal?X((T=this.theme.additionalStyles)==null?void 0:T.Modal):P}
      >
        <div id="controls">
          <button
            @click=${()=>{U(this,c,nt).call(this)}}
          >
            <span class="g-icon">close</span>
          </button>
        </div>
        <slot></slot>
      </section>
    </dialog>`:y`<section
        @click=${()=>{I(this,c,!0,Re)}}
      >
        <slot name="entry"></slot>
      </section>`}},m=new WeakMap,c=new WeakSet,rt=function(){return g.get.call(this)},Re=function(x){return g.set.call(this,x)},d=new WeakMap,Te=function(){return _.get.call(this)},kt=function(x){return _.set.call(this,x)},nt=function(){O(this,c,Te)&&(O(this,c,Te).open&&O(this,c,Te).close(),I(this,c,!1,Re))},e=S,(()=>{const x=typeof Symbol=="function"&&Symbol.metadata?Object.create(a[Symbol.metadata]??null):void 0;b=[et()],p=[Zt("dialog")],Je(S,g={get:Ie(function(){return O(this,m)},"#showModal","get"),set:Ie(function(T){I(this,m,T)},"#showModal","set")},b,{kind:"accessor",name:"#showModal",static:!1,private:!0,access:{has:T=>He(c,T),get:T=>O(T,c,rt),set:(T,M)=>{I(T,c,M,Re)}},metadata:x},f,h),Je(S,_={get:Ie(function(){return O(this,d)},"#modalRef","get"),set:Ie(function(T){I(this,d,T)},"#modalRef","set")},p,{kind:"accessor",name:"#modalRef",static:!1,private:!0,access:{has:T=>He(c,T),get:T=>O(T,c,Te),set:(T,M)=>{I(T,c,M,kt)}},metadata:x},u,t),Je(null,s={value:e},n,{kind:"class",name:e.name,metadata:x},null,r),e=s.value,x&&Object.defineProperty(e,Symbol.metadata,{enumerable:!0,configurable:!0,writable:!0,value:x})})(),S.styles=[J,Z`
      * {
        box-sizing: border-box;
      }

      dialog {
        padding: 0 0 0 0;
        border: none;
        background: none;

        & section {
          & #controls {
            display: flex;
            justify-content: end;
            margin-bottom: 4px;

            & button {
              padding: 0;
              background: none;
              width: 20px;
              height: 20px;
              pointer: cursor;
              border: none;
              cursor: pointer;
            }
          }
        }
      }
    `],we(e,r),e})();var Ke=function(n,s,r,e,a,b){function f(d){if(d!==void 0&&typeof d!="function")throw new TypeError("Function expected");return d}for(var h=e.kind,g=h==="getter"?"get":h==="setter"?"set":"value",p=!s&&n?e.static?n:n.prototype:null,u=s||(p?Object.getOwnPropertyDescriptor(p,e.name):{}),t,_=!1,m=r.length-1;m>=0;m--){var c={};for(var o in e)c[o]=o==="access"?{}:e[o];for(var o in e.access)c.access[o]=e.access[o];c.addInitializer=function(d){if(_)throw new TypeError("Cannot add initializers after decoration has completed");b.push(f(d||null))};var i=(0,r[m])(h==="accessor"?{get:u.get,set:u.set}:u[g],c);if(h==="accessor"){if(i===void 0)continue;if(i===null||typeof i!="object")throw new TypeError("Object expected");(t=f(i.get))&&(u.get=t),(t=f(i.set))&&(u.set=t),(t=f(i.init))&&a.unshift(t)}else(t=f(i))&&(h==="field"?a.unshift(t):u[g]=t)}p&&Object.defineProperty(p,e.name,u),_=!0},xe=function(n,s,r){for(var e=arguments.length>2,a=0;a<s.length;a++)r=e?s[a].call(n,r):s[a].call(n);return e?r:void 0};(()=>{var t,_,m;let n=[q("a2ui-row")],s,r=[],e,a=K,b,f=[],h=[],g,p=[],u=[];return m=class extends a{constructor(){super(...arguments);z(this,t,xe(this,f,"stretch"));z(this,_,(xe(this,h),xe(this,p,"start")));xe(this,u)}get alignment(){return O(this,t)}set alignment(i){I(this,t,i)}get distribution(){return O(this,_)}set distribution(i){I(this,_,i)}render(){var i,d;return y`<section
      class=${W(this.theme.components.Row)}
      style=${(i=this.theme.additionalStyles)!=null&&i.Row?X((d=this.theme.additionalStyles)==null?void 0:d.Row):P}
    >
      <slot></slot>
    </section>`}},t=new WeakMap,_=new WeakMap,e=m,(()=>{const i=typeof Symbol=="function"&&Symbol.metadata?Object.create(a[Symbol.metadata]??null):void 0;b=[V({reflect:!0,type:String})],g=[V({reflect:!0,type:String})],Ke(m,null,b,{kind:"accessor",name:"alignment",static:!1,private:!1,access:{has:d=>"alignment"in d,get:d=>d.alignment,set:(d,L)=>{d.alignment=L}},metadata:i},f,h),Ke(m,null,g,{kind:"accessor",name:"distribution",static:!1,private:!1,access:{has:d=>"distribution"in d,get:d=>d.distribution,set:(d,L)=>{d.distribution=L}},metadata:i},p,u),Ke(null,s={value:e},n,{kind:"class",name:e.name,metadata:i},null,r),e=s.value,i&&Object.defineProperty(e,Symbol.metadata,{enumerable:!0,configurable:!0,writable:!0,value:i})})(),m.styles=[J,Z`
      * {
        box-sizing: border-box;
      }

      :host {
        display: flex;
        flex: var(--weight);
      }

      section {
        display: flex;
        flex-direction: row;
        width: 100%;
        min-height: 100%;
      }

      :host([alignment="start"]) section {
        align-items: start;
      }

      :host([alignment="center"]) section {
        align-items: center;
      }

      :host([alignment="end"]) section {
        align-items: end;
      }

      :host([alignment="stretch"]) section {
        align-items: stretch;
      }

      :host([distribution="start"]) section {
        justify-content: start;
      }

      :host([distribution="center"]) section {
        justify-content: center;
      }

      :host([distribution="end"]) section {
        justify-content: end;
      }

      :host([distribution="spaceBetween"]) section {
        justify-content: space-between;
      }

      :host([distribution="spaceAround"]) section {
        justify-content: space-around;
      }

      :host([distribution="spaceEvenly"]) section {
        justify-content: space-evenly;
      }
    `],xe(e,r),e})();var me=function(n,s,r,e,a,b){function f(d){if(d!==void 0&&typeof d!="function")throw new TypeError("Function expected");return d}for(var h=e.kind,g=h==="getter"?"get":h==="setter"?"set":"value",p=!s&&n?e.static?n:n.prototype:null,u=s||(p?Object.getOwnPropertyDescriptor(p,e.name):{}),t,_=!1,m=r.length-1;m>=0;m--){var c={};for(var o in e)c[o]=o==="access"?{}:e[o];for(var o in e.access)c.access[o]=e.access[o];c.addInitializer=function(d){if(_)throw new TypeError("Cannot add initializers after decoration has completed");b.push(f(d||null))};var i=(0,r[m])(h==="accessor"?{get:u.get,set:u.set}:u[g],c);if(h==="accessor"){if(i===void 0)continue;if(i===null||typeof i!="object")throw new TypeError("Object expected");(t=f(i.get))&&(u.get=t),(t=f(i.set))&&(u.set=t),(t=f(i.init))&&a.unshift(t)}else(t=f(i))&&(h==="field"?a.unshift(t):u[g]=t)}p&&Object.defineProperty(p,e.name,u),_=!0},ne=function(n,s,r){for(var e=arguments.length>2,a=0;a<s.length;a++)r=e?s[a].call(n,r):s[a].call(n);return e?r:void 0};(()=>{var j,S,N,R,x,T,Ct,Ue,$;let n=[q("a2ui-slider")],s,r=[],e,a=K,b,f=[],h=[],g,p=[],u=[],t,_=[],m=[],c,o=[],i=[],d,L=[],k=[];return $=class extends a{constructor(){super(...arguments);z(this,T);z(this,j,ne(this,f,null));z(this,S,(ne(this,h),ne(this,p,0)));z(this,N,(ne(this,u),ne(this,_,0)));z(this,R,(ne(this,m),ne(this,o,null)));z(this,x,(ne(this,i),ne(this,L,null)));ne(this,k)}get value(){return O(this,j)}set value(w){I(this,j,w)}get minValue(){return O(this,S)}set minValue(w){I(this,S,w)}get maxValue(){return O(this,N)}set maxValue(w){I(this,N,w)}get label(){return O(this,R)}set label(w){I(this,R,w)}get inputType(){return O(this,x)}set inputType(w){I(this,x,w)}render(){if(this.value&&typeof this.value=="object"){if("literalNumber"in this.value&&this.value.literalNumber)return U(this,T,Ue).call(this,this.value.literalNumber);if("literal"in this.value&&this.value.literal!==void 0)return U(this,T,Ue).call(this,this.value.literal);if(this.value&&"path"in this.value&&this.value.path){if(!this.processor||!this.component)return y`(no processor)`;const w=this.processor.getData(this.component,this.value.path,this.surfaceId??Y.DEFAULT_SURFACE_ID);return w===null?y`Invalid value`:typeof w!="string"&&typeof w!="number"?y`Invalid value`:U(this,T,Ue).call(this,w)}}return P}},j=new WeakMap,S=new WeakMap,N=new WeakMap,R=new WeakMap,x=new WeakMap,T=new WeakSet,Ct=function(w){!this.value||!this.processor||"path"in this.value&&this.value.path&&this.processor.setData(this.component,this.value.path,w,this.surfaceId??Y.DEFAULT_SURFACE_ID)},Ue=function(w){var D,F,ie;return y`<section
      class=${W(this.theme.components.Slider.container)}
    >
      <label class=${W(this.theme.components.Slider.label)} for="data">
        ${((D=this.label)==null?void 0:D.literalString)??""}
      </label>
      <input
        autocomplete="off"
        class=${W(this.theme.components.Slider.element)}
        style=${(F=this.theme.additionalStyles)!=null&&F.Slider?X((ie=this.theme.additionalStyles)==null?void 0:ie.Slider):P}
        @input=${ae=>{ae.target instanceof HTMLInputElement&&U(this,T,Ct).call(this,ae.target.value)}}
        id="data"
        name="data"
        .value=${w}
        type="range"
        min=${this.minValue??"0"}
        max=${this.maxValue??"0"}
      />
      <span class=${W(this.theme.components.Slider.label)}
        >${this.value?us(this.value,this.component,this.processor,this.surfaceId):"0"}</span
      >
    </section>`},e=$,(()=>{const w=typeof Symbol=="function"&&Symbol.metadata?Object.create(a[Symbol.metadata]??null):void 0;b=[V()],g=[V()],t=[V()],c=[V()],d=[V()],me($,null,b,{kind:"accessor",name:"value",static:!1,private:!1,access:{has:D=>"value"in D,get:D=>D.value,set:(D,F)=>{D.value=F}},metadata:w},f,h),me($,null,g,{kind:"accessor",name:"minValue",static:!1,private:!1,access:{has:D=>"minValue"in D,get:D=>D.minValue,set:(D,F)=>{D.minValue=F}},metadata:w},p,u),me($,null,t,{kind:"accessor",name:"maxValue",static:!1,private:!1,access:{has:D=>"maxValue"in D,get:D=>D.maxValue,set:(D,F)=>{D.maxValue=F}},metadata:w},_,m),me($,null,c,{kind:"accessor",name:"label",static:!1,private:!1,access:{has:D=>"label"in D,get:D=>D.label,set:(D,F)=>{D.label=F}},metadata:w},o,i),me($,null,d,{kind:"accessor",name:"inputType",static:!1,private:!1,access:{has:D=>"inputType"in D,get:D=>D.inputType,set:(D,F)=>{D.inputType=F}},metadata:w},L,k),me(null,s={value:e},n,{kind:"class",name:e.name,metadata:w},null,r),e=s.value,w&&Object.defineProperty(e,Symbol.metadata,{enumerable:!0,configurable:!0,writable:!0,value:w})})(),$.styles=[J,Z`
      * {
        box-sizing: border-box;
      }

      :host {
        display: block;
        flex: var(--weight);
      }

      input {
        display: block;
        width: 100%;
      }

      .description {
      }
    `],ne(e,r),e})();var ke=function(n,s,r,e,a,b){function f(d){if(d!==void 0&&typeof d!="function")throw new TypeError("Function expected");return d}for(var h=e.kind,g=h==="getter"?"get":h==="setter"?"set":"value",p=!s&&n?e.static?n:n.prototype:null,u=s||(p?Object.getOwnPropertyDescriptor(p,e.name):{}),t,_=!1,m=r.length-1;m>=0;m--){var c={};for(var o in e)c[o]=o==="access"?{}:e[o];for(var o in e.access)c.access[o]=e.access[o];c.addInitializer=function(d){if(_)throw new TypeError("Cannot add initializers after decoration has completed");b.push(f(d||null))};var i=(0,r[m])(h==="accessor"?{get:u.get,set:u.set}:u[g],c);if(h==="accessor"){if(i===void 0)continue;if(i===null||typeof i!="object")throw new TypeError("Object expected");(t=f(i.get))&&(u.get=t),(t=f(i.set))&&(u.set=t),(t=f(i.init))&&a.unshift(t)}else(t=f(i))&&(h==="field"?a.unshift(t):u[g]=t)}p&&Object.defineProperty(p,e.name,u),_=!0},ce=function(n,s,r){for(var e=arguments.length>2,a=0;a<s.length;a++)r=e?s[a].call(n,r):s[a].call(n);return e?r:void 0};(()=>{var d,L,k,j,St,N,Tt,x;let n=[q("a2ui-surface")],s,r=[],e,a=K,b,f=[],h=[],g,p=[],u=[],t,_=[],m=[],c,o=[],i=[];return x=class extends a{constructor(){super(...arguments);z(this,j);z(this,d,ce(this,f,null));z(this,L,(ce(this,h),ce(this,p,null)));z(this,k,(ce(this,u),ce(this,_,null)));z(this,N,(ce(this,m),ce(this,o,!1)));ce(this,i)}get surfaceId(){return O(this,d)}set surfaceId(E){I(this,d,E)}get surface(){return O(this,L)}set surface(E){I(this,L,E)}get processor(){return O(this,k)}set processor(E){I(this,k,E)}get enableCustomElements(){return O(this,N)}set enableCustomElements(E){I(this,N,E)}render(){return this.surface?y`${[U(this,j,St).call(this),U(this,j,Tt).call(this)]}`:P}},d=new WeakMap,L=new WeakMap,k=new WeakMap,j=new WeakSet,St=function(){var E;return(E=this.surface)!=null&&E.styles.logoUrl?y`<div id="surface-logo">
      <img src=${this.surface.styles.logoUrl} />
    </div>`:P},N=new WeakMap,Tt=function(){var $,A;const E={};if(($=this.surface)!=null&&$.styles)for(const[ee,w]of Object.entries(this.surface.styles))switch(ee){case"primaryColor":{E["--p-100"]="#ffffff",E["--p-99"]=`color-mix(in srgb, ${w} 2%, white 98%)`,E["--p-98"]=`color-mix(in srgb, ${w} 4%, white 96%)`,E["--p-95"]=`color-mix(in srgb, ${w} 10%, white 90%)`,E["--p-90"]=`color-mix(in srgb, ${w} 20%, white 80%)`,E["--p-80"]=`color-mix(in srgb, ${w} 40%, white 60%)`,E["--p-70"]=`color-mix(in srgb, ${w} 60%, white 40%)`,E["--p-60"]=`color-mix(in srgb, ${w} 80%, white 20%)`,E["--p-50"]=w,E["--p-40"]=`color-mix(in srgb, ${w} 80%, black 20%)`,E["--p-35"]=`color-mix(in srgb, ${w} 70%, black 30%)`,E["--p-30"]=`color-mix(in srgb, ${w} 60%, black 40%)`,E["--p-25"]=`color-mix(in srgb, ${w} 50%, black 50%)`,E["--p-20"]=`color-mix(in srgb, ${w} 40%, black 60%)`,E["--p-15"]=`color-mix(in srgb, ${w} 30%, black 70%)`,E["--p-10"]=`color-mix(in srgb, ${w} 20%, black 80%)`,E["--p-5"]=`color-mix(in srgb, ${w} 10%, black 90%)`,E["--0"]="#00000";break}case"font":{E["--font-family"]=w,E["--font-family-flex"]=w;break}}return y`<a2ui-root
      style=${X(E)}
      .surfaceId=${this.surfaceId}
      .processor=${this.processor}
      .childComponents=${(A=this.surface)!=null&&A.componentTree?[this.surface.componentTree]:null}
      .enableCustomElements=${this.enableCustomElements}
    ></a2ui-root>`},e=x,(()=>{const E=typeof Symbol=="function"&&Symbol.metadata?Object.create(a[Symbol.metadata]??null):void 0;b=[V()],g=[V()],t=[V()],c=[V()],ke(x,null,b,{kind:"accessor",name:"surfaceId",static:!1,private:!1,access:{has:$=>"surfaceId"in $,get:$=>$.surfaceId,set:($,A)=>{$.surfaceId=A}},metadata:E},f,h),ke(x,null,g,{kind:"accessor",name:"surface",static:!1,private:!1,access:{has:$=>"surface"in $,get:$=>$.surface,set:($,A)=>{$.surface=A}},metadata:E},p,u),ke(x,null,t,{kind:"accessor",name:"processor",static:!1,private:!1,access:{has:$=>"processor"in $,get:$=>$.processor,set:($,A)=>{$.processor=A}},metadata:E},_,m),ke(x,null,c,{kind:"accessor",name:"enableCustomElements",static:!1,private:!1,access:{has:$=>"enableCustomElements"in $,get:$=>$.enableCustomElements,set:($,A)=>{$.enableCustomElements=A}},metadata:E},o,i),ke(null,s={value:e},n,{kind:"class",name:e.name,metadata:E},null,r),e=s.value,E&&Object.defineProperty(e,Symbol.metadata,{enumerable:!0,configurable:!0,writable:!0,value:E})})(),x.styles=[Z`
      :host {
        display: flex;
        min-height: 0;
        max-height: 100%;
        flex-direction: column;
        gap: 16px;
      }

      #surface-logo {
        display: flex;
        justify-content: center;

        & img {
          width: 50%;
          max-width: 220px;
        }
      }

      a2ui-root {
        flex: 1;
      }
    `],ce(e,r),e})();var Qe=function(n,s,r,e,a,b){function f(d){if(d!==void 0&&typeof d!="function")throw new TypeError("Function expected");return d}for(var h=e.kind,g=h==="getter"?"get":h==="setter"?"set":"value",p=!s&&n?e.static?n:n.prototype:null,u=s||(p?Object.getOwnPropertyDescriptor(p,e.name):{}),t,_=!1,m=r.length-1;m>=0;m--){var c={};for(var o in e)c[o]=o==="access"?{}:e[o];for(var o in e.access)c.access[o]=e.access[o];c.addInitializer=function(d){if(_)throw new TypeError("Cannot add initializers after decoration has completed");b.push(f(d||null))};var i=(0,r[m])(h==="accessor"?{get:u.get,set:u.set}:u[g],c);if(h==="accessor"){if(i===void 0)continue;if(i===null||typeof i!="object")throw new TypeError("Object expected");(t=f(i.get))&&(u.get=t),(t=f(i.set))&&(u.set=t),(t=f(i.init))&&a.unshift(t)}else(t=f(i))&&(h==="field"?a.unshift(t):u[g]=t)}p&&Object.defineProperty(p,e.name,u),_=!0},Ce=function(n,s,r){for(var e=arguments.length>2,a=0;a<s.length;a++)r=e?s[a].call(n,r):s[a].call(n);return e?r:void 0};(()=>{var t,_,m,Et,Dt,i;let n=[q("a2ui-tabs")],s,r=[],e,a=K,b,f=[],h=[],g,p=[],u=[];return i=class extends a{constructor(){super(...arguments);z(this,m);z(this,t,Ce(this,f,null));z(this,_,(Ce(this,h),Ce(this,p,0)));Ce(this,u)}get titles(){return O(this,t)}set titles(k){I(this,t,k)}get selected(){return O(this,_)}set selected(k){I(this,_,k)}willUpdate(k){if(super.willUpdate(k),k.has("selected")){for(const S of this.children)S.removeAttribute("slot");const j=this.children[this.selected];if(!j)return;j.slot="current"}}render(){var k,j;return y`<section
      class=${W(this.theme.components.Tabs.container)}
      style=${(k=this.theme.additionalStyles)!=null&&k.Tabs?X((j=this.theme.additionalStyles)==null?void 0:j.Tabs):P}
    >
      ${[U(this,m,Et).call(this),U(this,m,Dt).call(this)]}
    </section>`}},t=new WeakMap,_=new WeakMap,m=new WeakSet,Et=function(){return this.titles?y`<div
      id="buttons"
      class=${W(this.theme.components.Tabs.element)}
    >
      ${Jt(this.titles,(k,j)=>{let S="";if("literalString"in k&&k.literalString)S=k.literalString;else if("literal"in k&&k.literal!==void 0)S=k.literal;else if(k&&"path"in k&&k.path){if(!this.processor||!this.component)return y`(no model)`;const R=this.processor.getData(this.component,k.path,this.surfaceId??Y.DEFAULT_SURFACE_ID);if(typeof R!="string")return y`(invalid)`;S=R}let N;return this.selected===j?N=ot(this.theme.components.Tabs.controls.all,this.theme.components.Tabs.controls.selected):N={...this.theme.components.Tabs.controls.all},y`<button
          ?disabled=${this.selected===j}
          class=${W(N)}
          @click=${()=>{this.selected=j}}
        >
          ${S}
        </button>`})}
    </div>`:P},Dt=function(){return y`<slot name="current"></slot>`},e=i,(()=>{const k=typeof Symbol=="function"&&Symbol.metadata?Object.create(a[Symbol.metadata]??null):void 0;b=[V()],g=[V()],Qe(i,null,b,{kind:"accessor",name:"titles",static:!1,private:!1,access:{has:j=>"titles"in j,get:j=>j.titles,set:(j,S)=>{j.titles=S}},metadata:k},f,h),Qe(i,null,g,{kind:"accessor",name:"selected",static:!1,private:!1,access:{has:j=>"selected"in j,get:j=>j.selected,set:(j,S)=>{j.selected=S}},metadata:k},p,u),Qe(null,s={value:e},n,{kind:"class",name:e.name,metadata:k},null,r),e=s.value,k&&Object.defineProperty(e,Symbol.metadata,{enumerable:!0,configurable:!0,writable:!0,value:k})})(),i.styles=[J,Z`
      :host {
        display: block;
        flex: var(--weight);
      }
    `],Ce(e,r),e})();var Se=function(n,s,r,e,a,b){function f(d){if(d!==void 0&&typeof d!="function")throw new TypeError("Function expected");return d}for(var h=e.kind,g=h==="getter"?"get":h==="setter"?"set":"value",p=!s&&n?e.static?n:n.prototype:null,u=s||(p?Object.getOwnPropertyDescriptor(p,e.name):{}),t,_=!1,m=r.length-1;m>=0;m--){var c={};for(var o in e)c[o]=o==="access"?{}:e[o];for(var o in e.access)c.access[o]=e.access[o];c.addInitializer=function(d){if(_)throw new TypeError("Cannot add initializers after decoration has completed");b.push(f(d||null))};var i=(0,r[m])(h==="accessor"?{get:u.get,set:u.set}:u[g],c);if(h==="accessor"){if(i===void 0)continue;if(i===null||typeof i!="object")throw new TypeError("Object expected");(t=f(i.get))&&(u.get=t),(t=f(i.set))&&(u.set=t),(t=f(i.init))&&a.unshift(t)}else(t=f(i))&&(h==="field"?a.unshift(t):u[g]=t)}p&&Object.defineProperty(p,e.name,u),_=!0},ue=function(n,s,r){for(var e=arguments.length>2,a=0;a<s.length;a++)r=e?s[a].call(n,r):s[a].call(n);return e?r:void 0};(()=>{var d,L,k,j,S,zt,jt,x;let n=[q("a2ui-textfield")],s,r=[],e,a=K,b,f=[],h=[],g,p=[],u=[],t,_=[],m=[],c,o=[],i=[];return x=class extends a{constructor(){super(...arguments);z(this,S);z(this,d,ue(this,f,null));z(this,L,(ue(this,h),ue(this,p,null)));z(this,k,(ue(this,u),ue(this,_,null)));z(this,j,(ue(this,m),ue(this,o,null)));ue(this,i)}get text(){return O(this,d)}set text(E){I(this,d,E)}get label(){return O(this,L)}set label(E){I(this,L,E)}get inputType(){return O(this,k)}set inputType(E){I(this,k,E)}get validationRegexp(){return O(this,j)}set validationRegexp(E){I(this,j,E)}render(){const E=_e(this.label,this.component,this.processor,this.surfaceId),$=_e(this.text,this.component,this.processor,this.surfaceId);return U(this,S,jt).call(this,$,E)}},d=new WeakMap,L=new WeakMap,k=new WeakMap,j=new WeakMap,S=new WeakSet,zt=function(E){!this.text||!this.processor||"path"in this.text&&this.text.path&&this.processor.setData(this.component,this.text.path,E,this.surfaceId??Y.DEFAULT_SURFACE_ID)},jt=function(E,$){var A,ee;return y` <section
      class=${W(this.theme.components.TextField.container)}
    >
      ${$&&$!==""?y`<label
            class=${W(this.theme.components.TextField.label)}
            for="data"
            >${$}</label
          >`:P}
      <input
        autocomplete="off"
        class=${W(this.theme.components.TextField.element)}
        style=${(A=this.theme.additionalStyles)!=null&&A.TextField?X((ee=this.theme.additionalStyles)==null?void 0:ee.TextField):P}
        @input=${w=>{w.target instanceof HTMLInputElement&&(this.dispatchEvent(new Rt({componentId:this.id,value:w.target.value,valid:w.target.checkValidity()})),U(this,S,zt).call(this,w.target.value))}}
        name="data"
        id="data"
        .value=${E}
        .placeholder=${"Please enter a value"}
        pattern=${this.validationRegexp||P}
        type=${this.inputType==="number"?"number":"text"}
      />
    </section>`},e=x,(()=>{const E=typeof Symbol=="function"&&Symbol.metadata?Object.create(a[Symbol.metadata]??null):void 0;b=[V()],g=[V()],t=[V()],c=[V()],Se(x,null,b,{kind:"accessor",name:"text",static:!1,private:!1,access:{has:$=>"text"in $,get:$=>$.text,set:($,A)=>{$.text=A}},metadata:E},f,h),Se(x,null,g,{kind:"accessor",name:"label",static:!1,private:!1,access:{has:$=>"label"in $,get:$=>$.label,set:($,A)=>{$.label=A}},metadata:E},p,u),Se(x,null,t,{kind:"accessor",name:"inputType",static:!1,private:!1,access:{has:$=>"inputType"in $,get:$=>$.inputType,set:($,A)=>{$.inputType=A}},metadata:E},_,m),Se(x,null,c,{kind:"accessor",name:"validationRegexp",static:!1,private:!1,access:{has:$=>"validationRegexp"in $,get:$=>$.validationRegexp,set:($,A)=>{$.validationRegexp=A}},metadata:E},o,i),Se(null,s={value:e},n,{kind:"class",name:e.name,metadata:E},null,r),e=s.value,E&&Object.defineProperty(e,Symbol.metadata,{enumerable:!0,configurable:!0,writable:!0,value:E})})(),x.styles=[J,Z`
      * {
        box-sizing: border-box;
      }

      :host {
        display: flex;
        flex: var(--weight);
      }

      input {
        display: block;
        width: 100%;
      }
      
      input:invalid {
        border-color: var(--color-error);
        color: var(--color-error);
        outline-color: var(--color-error);
      }
      
      input:invalid:focus {
        border-color: var(--color-error);
        outline-color: var(--color-error);
      }

      label {
        display: block;
        margin-bottom: 4px;
      }
    `],ue(e,r),e})();var De,ze;const Ee=class Ee extends Kt{constructor(){super(...arguments);z(this,De,null);z(this,ze,null)}update(r,[e,a,b]){const f=JSON.stringify(b==null?void 0:b.tagClassMap);return O(this,De)===e&&f===O(this,ze)?Qt:(I(this,De,e),I(this,ze,f),this.render(e,a,b))}render(r,e,a){return e?Xt(e(r,a)):(Ee.defaultMarkdownWarningLogged||(console.warn("[MarkdownDirective]",`can't render markdown because no markdown renderer is configured.
`,"Use `@a2ui/markdown-it`, or your own markdown renderer."),Ee.defaultMarkdownWarningLogged=!0),y`<span class="no-markdown-renderer">${r}</span>`)}};De=new WeakMap,ze=new WeakMap,Ee.defaultMarkdownWarningLogged=!1;let lt=Ee;const fs=es(lt),ps=mt(Symbol("A2UIMarkdown"));var Pe=function(n,s,r,e,a,b){function f(d){if(d!==void 0&&typeof d!="function")throw new TypeError("Function expected");return d}for(var h=e.kind,g=h==="getter"?"get":h==="setter"?"set":"value",p=!s&&n?e.static?n:n.prototype:null,u=s||(p?Object.getOwnPropertyDescriptor(p,e.name):{}),t,_=!1,m=r.length-1;m>=0;m--){var c={};for(var o in e)c[o]=o==="access"?{}:e[o];for(var o in e.access)c.access[o]=e.access[o];c.addInitializer=function(d){if(_)throw new TypeError("Cannot add initializers after decoration has completed");b.push(f(d||null))};var i=(0,r[m])(h==="accessor"?{get:u.get,set:u.set}:u[g],c);if(h==="accessor"){if(i===void 0)continue;if(i===null||typeof i!="object")throw new TypeError("Object expected");(t=f(i.get))&&(u.get=t),(t=f(i.set))&&(u.set=t),(t=f(i.init))&&a.unshift(t)}else(t=f(i))&&(h==="field"?a.unshift(t):u[g]=t)}p&&Object.defineProperty(p,e.name,u),_=!0},pe=function(n,s,r){for(var e=arguments.length>2,a=0;a<s.length;a++)r=e?s[a].call(n,r):s[a].call(n);return e?r:void 0};(()=>{var c,o,i,d,Ot,It,Pt,S;let n=[q("a2ui-text")],s,r=[],e,a=K,b,f=[],h=[],g,p=[],u=[],t,_=[],m=[];return S=class extends a{constructor(){super(...arguments);z(this,d);z(this,c,pe(this,f,null));z(this,o,(pe(this,h),pe(this,p,null)));z(this,i,(pe(this,u),pe(this,_,void 0)));pe(this,m)}get text(){return O(this,c)}set text(x){I(this,c,x)}get usageHint(){return O(this,o)}set usageHint(x){I(this,o,x)}get markdownRenderer(){return O(this,i)}set markdownRenderer(x){I(this,i,x)}render(){var T;const x=ot(this.theme.components.Text.all,this.usageHint?this.theme.components.Text[this.usageHint]:{});return y`<section
      class=${W(x)}
      style=${(T=this.theme.additionalStyles)!=null&&T.Text?X(U(this,d,Pt).call(this)):P}
    >
      ${U(this,d,Ot).call(this)}
    </section>`}},c=new WeakMap,o=new WeakMap,i=new WeakMap,d=new WeakSet,Ot=function(){let x=null;if(this.text&&typeof this.text=="object"){if("literalString"in this.text&&this.text.literalString)x=this.text.literalString;else if("literal"in this.text&&this.text.literal!==void 0)x=this.text.literal;else if(this.text&&"path"in this.text&&this.text.path){if(!this.processor||!this.component)return y`(no model)`;const M=this.processor.getData(this.component,this.text.path,this.surfaceId??Y.DEFAULT_SURFACE_ID);M!=null&&(x=M.toString())}}if(x==null)return y`(empty)`;let T=x;switch(this.usageHint){case"h1":T=`# ${T}`;break;case"h2":T=`## ${T}`;break;case"h3":T=`### ${T}`;break;case"h4":T=`#### ${T}`;break;case"h5":T=`##### ${T}`;break;case"caption":T=`*${T}*`;break}return y`${fs(T,this.markdownRenderer,{tagClassMap:Ut(this.theme.markdown,["ol","ul","li"],{})})}`},It=function(x){return typeof x!="object"||Array.isArray(x)||!x?!1:["h1","h2","h3","h4","h5","h6","caption","body"].every(M=>M in x)},Pt=function(){var M;let x={};const T=(M=this.theme.additionalStyles)==null?void 0:M.Text;if(!T)return x;if(U(this,d,It).call(this,T)){const E=this.usageHint??"body";x=T[E]}else x=T;return x},e=S,(()=>{const x=typeof Symbol=="function"&&Symbol.metadata?Object.create(a[Symbol.metadata]??null):void 0;b=[V()],g=[V({reflect:!0,attribute:"usage-hint"})],t=[gt({context:ps})],Pe(S,null,b,{kind:"accessor",name:"text",static:!1,private:!1,access:{has:T=>"text"in T,get:T=>T.text,set:(T,M)=>{T.text=M}},metadata:x},f,h),Pe(S,null,g,{kind:"accessor",name:"usageHint",static:!1,private:!1,access:{has:T=>"usageHint"in T,get:T=>T.usageHint,set:(T,M)=>{T.usageHint=M}},metadata:x},p,u),Pe(S,null,t,{kind:"accessor",name:"markdownRenderer",static:!1,private:!1,access:{has:T=>"markdownRenderer"in T,get:T=>T.markdownRenderer,set:(T,M)=>{T.markdownRenderer=M}},metadata:x},_,m),Pe(null,s={value:e},n,{kind:"class",name:e.name,metadata:x},null,r),e=s.value,x&&Object.defineProperty(e,Symbol.metadata,{enumerable:!0,configurable:!0,writable:!0,value:x})})(),S.styles=[J,Z`
      :host {
        display: block;
        flex: var(--weight);
      }

      h1,
      h2,
      h3,
      h4,
      h5 {
        line-height: inherit;
        font: inherit;
      }
    `],pe(e,r),e})();var pt=function(n,s,r,e,a,b){function f(d){if(d!==void 0&&typeof d!="function")throw new TypeError("Function expected");return d}for(var h=e.kind,g=h==="getter"?"get":h==="setter"?"set":"value",p=!s&&n?e.static?n:n.prototype:null,u=s||(p?Object.getOwnPropertyDescriptor(p,e.name):{}),t,_=!1,m=r.length-1;m>=0;m--){var c={};for(var o in e)c[o]=o==="access"?{}:e[o];for(var o in e.access)c.access[o]=e.access[o];c.addInitializer=function(d){if(_)throw new TypeError("Cannot add initializers after decoration has completed");b.push(f(d||null))};var i=(0,r[m])(h==="accessor"?{get:u.get,set:u.set}:u[g],c);if(h==="accessor"){if(i===void 0)continue;if(i===null||typeof i!="object")throw new TypeError("Object expected");(t=f(i.get))&&(u.get=t),(t=f(i.set))&&(u.set=t),(t=f(i.init))&&a.unshift(t)}else(t=f(i))&&(h==="field"?a.unshift(t):u[g]=t)}p&&Object.defineProperty(p,e.name,u),_=!0},Xe=function(n,s,r){for(var e=arguments.length>2,a=0;a<s.length;a++)r=e?s[a].call(n,r):s[a].call(n);return e?r:void 0};(()=>{var g,p,Ft,t;let n=[q("a2ui-video")],s,r=[],e,a=K,b,f=[],h=[];return t=class extends a{constructor(){super(...arguments);z(this,p);z(this,g,Xe(this,f,null));Xe(this,h)}get url(){return O(this,g)}set url(c){I(this,g,c)}render(){var c,o;return y`<section
      class=${W(this.theme.components.Video)}
      style=${(c=this.theme.additionalStyles)!=null&&c.Video?X((o=this.theme.additionalStyles)==null?void 0:o.Video):P}
    >
      ${U(this,p,Ft).call(this)}
    </section>`}},g=new WeakMap,p=new WeakSet,Ft=function(){if(!this.url)return P;if(this.url&&typeof this.url=="object"){if("literalString"in this.url)return y`<video controls src=${this.url.literalString} />`;if("literal"in this.url)return y`<video controls src=${this.url.literal} />`;if(this.url&&"path"in this.url&&this.url.path){if(!this.processor||!this.component)return y`(no processor)`;const c=this.processor.getData(this.component,this.url.path,this.surfaceId??Y.DEFAULT_SURFACE_ID);return c?typeof c!="string"?y`Invalid video URL`:y`<video controls src=${c} />`:y`Invalid video URL`}}return y`(empty)`},e=t,(()=>{const c=typeof Symbol=="function"&&Symbol.metadata?Object.create(a[Symbol.metadata]??null):void 0;b=[V()],pt(t,null,b,{kind:"accessor",name:"url",static:!1,private:!1,access:{has:o=>"url"in o,get:o=>o.url,set:(o,i)=>{o.url=i}},metadata:c},f,h),pt(null,s={value:e},n,{kind:"class",name:e.name,metadata:c},null,r),e=s.value,c&&Object.defineProperty(e,Symbol.metadata,{enumerable:!0,configurable:!0,writable:!0,value:c})})(),t.styles=[J,Z`
      * {
        box-sizing: border-box;
      }

      :host {
        display: block;
        flex: var(--weight);
        min-height: 0;
        overflow: auto;
      }

      video {
        display: block;
        width: 100%;
      }
    `],Xe(e,r),e})();export{ks as D};
