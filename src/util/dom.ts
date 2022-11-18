type TypeBase<T, K> = T | Array<T> | ((el: K) => T);

type TypeRecord<T> = {
  [ key in keyof T ]?: T[key]
}

export type ElementClass<K> = TypeBase<string | { [key: string]: boolean | ((el: K) => boolean) }, K>;

export type ElementStyle<K> = TypeBase<string | TypeRecord<CSSStyleDeclaration>, K>;

export type ElementAttributes<K> = TypeBase<Record<string, (string | ((el: K) => string))>, K>;

export type ElementProperties<K> = TypeBase<Record<string, any>, K>;

export type ElementEvent<K> = TypeBase<Record<string, (el: K, e: Event) => void>, K>;

export type ElementProps<K> = {
  cls?: ElementClass<K>,
  class?: ElementClass<K>,
  style?: ElementStyle<K>,
  attrs?: ElementAttributes<K>,
  attributes?: ElementAttributes<K>,
  properties?: ElementProperties<K>,
  on?: ElementEvent<K>,
  event?: ElementEvent<K>,
  listener?: ElementEvent<K>,
  text?: string,
  html?: string,
  click?: (el: K, e: Event) => void,
  change?: (el: K, e: Event) => void,
  value?: any,
  create?: (el: K) => void,
  mount?: (el: K) => void
};

export function generateClass<K extends HTMLElement>(el: K, cls?: ElementClass<K>) {
  if (!cls) return;
  if (typeof (cls) == "string") {
    el.setAttribute("class", cls);
  } else if (Array.isArray(cls)) {
    for (let i of cls) {
      generateClass(el, i);
    }
  } else if (typeof (cls) == "function") {
    generateClass(el, cls(el));
  } else if (typeof (cls) == "object") {
    const result = [];
    for (let i in cls) {
      if (typeof (cls[i]) == "boolean" && (cls[i] as boolean)) {
        result.push(i);
      } else if (typeof (cls[i]) == "function" && (cls[i] as Function)(el)) {
        result.push(i);
      }
    }
  }
};

export function generateStyle<K extends HTMLElement>(el: K, style?: ElementStyle<K>) {
  if (!style) return;
  if (typeof (style) == "string") {
    el.setAttribute("style", style);
  } else if (Array.isArray(style)) {
    for (let i of style) {
      generateStyle(el, i);
    }
  } else if (typeof (style) == "function") {
    generateStyle(el, style(el));
  } else if (typeof (style) == "object") {
    for (let i in style) {
      (el.style as any)[i] = style[i];
    }
  }
};

export function generateAttrs<K extends HTMLElement>(el: K, attrs?: ElementAttributes<K>) {
  if (!attrs) return;
  if (Array.isArray(attrs)) {
    for (let i of attrs) {
      generateAttrs(el, i);
    }
  } else if (typeof (attrs) == "function") {
    generateAttrs(el, attrs(el));
  } else if (typeof (attrs) == "object") {
    for (let i in attrs) {
      if (typeof (attrs[i]) == "function") {
        el.setAttribute(i, (attrs[i] as Function)(el));
      } else if (typeof (attrs[i]) == "string") {
        el.setAttribute(i, (attrs[i] as string));
      }
    }
  }
};

function isWritable<T extends Object>(obj: T, key: keyof T) {
  const desc = Object.getOwnPropertyDescriptor(obj, key) || {}
  return Boolean(desc.writable)
}

export function generateProperties<K extends HTMLElement>(el: K, properties?: ElementProperties<K>) {
  if (!properties) return;
  if (Array.isArray(properties)) {
    for (let i of properties) {
      generateProperties(el, i);
    }
  } else if (typeof (properties) == "function") {
    generateProperties(el, properties(el));
  } else if (typeof (properties) == "object") {
    for (let i in properties) {
      const prop = i as keyof HTMLElement;
      if (isWritable(el, prop)) {
        (el as any)[prop] = properties[prop];
      }
    }
  }
};

export function generateEvent<K extends HTMLElement>(el: K, event?: ElementEvent<K>) {
  if (!event) return;
  if (Array.isArray(event)) {
    for (let i of event) {
      generateEvent(el, i);
    }
  } else if (typeof (event) == "function") {
    generateEvent(el, event(el));
  } else if (typeof (event) == "object") {
    for (let i in event) {
      el.addEventListener(i, (e) => {
        event[i](el, e);
      });
    }
  }
};

export function createElement<K extends keyof HTMLElementTagNameMap>(tag: K | HTMLElementTagNameMap[K], data?: ElementProps<HTMLElementTagNameMap[K]> | string | null, children?: HTMLElement | Array<HTMLElement | null> | null) {
  const el = typeof (tag) == "string" ? document.createElement(tag) : tag;
  if (typeof (data) == "string") {
    el.innerText = data;
  } else if (data) {
    if (data.create) data.create(el);
    generateClass(el, data.cls);
    generateClass(el, data.class);
    generateStyle(el, data.style);
    generateAttrs(el, data.attrs);
    generateAttrs(el, data.attributes);
    generateProperties(el, data.properties);
    generateEvent(el, data.on);
    generateEvent(el, data.event);
    generateEvent(el, data.listener);
    if (data.text) el.innerText = data.text;
    if (data.html) el.innerHTML = data.html;
    if (data.value) (el as any).value = data.value;
    if (data.click) el.addEventListener("click", (e) => { if (data.click) data.click(el, e) });
    if (data.change) el.addEventListener("change", (e) => { if (data.change) data.change(el, e) });
    if (data.mount) data.mount(el);
  }
  if (children) {
    if (Array.isArray(children)) {
      for (let i of children) {
        if (i) el.append(i);
      }
    } else {
      el.append(children);
    }
  }
  return el;
}