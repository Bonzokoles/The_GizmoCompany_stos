import"./vendor-lit-html-BeezPM88.js";import{S as i}from"./vendor-signal-polyfill-DsVT-Chx.js";/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const n=Symbol("SignalWatcherBrand"),r=new FinalizationRegistry(({watcher:s,signal:t})=>{s.unwatch(t)}),h=new WeakMap;function c(s){return s[n]===!0?(console.warn("SignalWatcher should not be applied to the same class more than once."),s):class extends s{constructor(){super(...arguments),this._$St=new i.State(0),this._$Si=!1,this._$So=!0,this._$Sh=new Set}_$Sl(){if(this._$Su!==void 0)return;this._$Sv=new i.Computed(()=>{this._$St.get(),super.performUpdate()});const t=this._$Su=new i.subtle.Watcher(function(){const e=h.get(this);e!==void 0&&(e._$Si===!1&&e.requestUpdate(),this.watch())});h.set(t,this),r.register(this,{watcher:t,signal:this._$Sv}),t.watch(this._$Sv)}_$Sp(){this._$Su!==void 0&&(this._$Su.unwatch(this._$Sv),this._$Sv=void 0,this._$Su=void 0)}performUpdate(){this.isUpdatePending&&(this._$Sl(),this._$Si=!0,this._$St.set(this._$St.get()+1),this._$Si=!1,this._$Sv.get())}update(t){try{this._$So?(this._$So=!1,super.update(t)):this._$Sh.forEach(e=>e.commit())}finally{this.isUpdatePending=!1,this._$Sh.clear()}}requestUpdate(t,e,a){this._$So=!0,super.requestUpdate(t,e,a)}connectedCallback(){super.connectedCallback(),this.requestUpdate()}disconnectedCallback(){super.disconnectedCallback(),queueMicrotask(()=>{this.isConnected===!1&&this._$Sp()})}_(t){this._$Sh.add(t);const e=this._$So;this.requestUpdate(),this._$So=e}m(t){this._$Sh.delete(t)}}}/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */i.State;i.Computed;export{c as e};
