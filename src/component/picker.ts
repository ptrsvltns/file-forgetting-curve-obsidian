import { App, Modal, Setting } from "obsidian";

import { v4 as uuid } from 'uuid';

import { createElement } from "../util/dom";

export type PickerEvent = {
  create?: (modal: PickerModal) => void,
  content?: (modal: PickerModal) => void,
  mount?: (modal: PickerModal) => void
}

export type PickerOption = {
  text: string,
  value?: any
}

export type PickerButton = {
  text: string,
  icon?: string,
  click: (modal: PickerModal) => void
}

export type PickerCallback = (modal: PickerModal, data: PickerOption | Array<PickerOption>) => void;

export class PickerModal extends Modal {

  title: string = "Picker";
  content: string = "";
  options: Array<PickerOption> = [];
  buttons: Array<PickerButton> = [];
  multiple: boolean = false;
  width?: string;
  height?: string;
  event: PickerEvent = {};
  storage: { [key: string]: any } = {};
  callback: PickerCallback = () => {};

  id = uuid();

  constructor(app: App, config: {
    title?: string,
    content?: string,
    options: Array<PickerOption>,
    multiple?: boolean,
    buttons?: Array<PickerButton>,
    width?: string,
    height?: string,
    event?: PickerEvent,
    storage?: { [key: string]: any },
    callback: PickerCallback
  }) {
    super(app);
    this.title = config.title || this.title;
    this.content = config.content || this.content;
    this.options = config.options || this.options;
    this.multiple = config.multiple === true;
    this.buttons = config.buttons || this.buttons;
    this.width = config.width || this.width;
    this.height = config.height || this.height;
    this.event = config.event || this.event;
    this.storage = config.storage || this.storage;
    this.callback = config.callback;
  }

  onOpen() {
    this.create();
  }

  createEmpty() {
    return createElement("div", {
      text: "Empty",
      style: {
        width: "100%",
        padding: "40px 0",
        textAlign: "center"
      }
    });
  }

  create() {
    let { contentEl } = this;

    if (this.width) this.modalEl.style.width = this.width;
    if (this.height) this.modalEl.style.height = this.height;

    contentEl.empty();

    if (this.event.create) this.event.create(this);

    contentEl.createEl("h1", { text: this.title });
    contentEl.createEl("p", { text: this.content });

    const area = createElement(contentEl.createEl("div"));

    const list: Array<HTMLInputElement> = [];
    if (this.options.length) {
      let first: HTMLInputElement | null = null;
      for (let option of this.options) {
        let input: HTMLInputElement = createElement("input", {
          attrs: { type: this.multiple ? "checkbox" : "radio", name: this.id, text: option.text },
        });
        list.push(input);
        area.append(createElement("label", {
          style: { whiteSpace: "nowrap" }
        }, [
          input,
          createElement("div", {
            text: option.text,
            style: {
              display: "inline-block",
              padding: "0 10px 0 5px"
            }
          })
        ]));
        if (!first) first = input;
      }
      if (!this.multiple && first) first.checked = true;
    } else {
      area.append(this.createEmpty());
    }

    if (this.event.content) this.event.content(this);

    const space = contentEl.createEl("div");
    space.style.height = "30px";

    const buttons = new Setting(contentEl);
    for (let i of this.buttons) {
      ((i) => {
        buttons.addButton(button => {
          button.setButtonText(i.text)
            .onClick(() => {
              i.click(this);
            })
          if (i.icon) button.setIcon(i.icon)
          return button;
        })
      })(i);
    }
    buttons.addButton((button) => button.setButtonText("OK")
      .onClick(() => {
        if (this.multiple) {
          const result: Array<PickerOption> = [];
          for (let input of list) {
            if (input.checked) {
              const text = input.getAttribute("text");
              for (let i of this.options) {
                if (i.text === text) {
                  result.push(i);
                  break;
                }
              }
            }
          }
          this.callback(this, result);
        } else {
          for (let input of list) {
            if (input.checked) {
              const text = input.getAttribute("text");
              for (let i of this.options) {
                if (i.text === text) {
                  this.callback(this, i);
                  break;
                }
              }
            }
          }
        }
        this.close();
      }))
    if (this.event.mount) this.event.mount(this);
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}