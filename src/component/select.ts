import { App, Modal, Setting } from "obsidian";

import { v4 as uuid } from 'uuid';

import { createElement } from "../util/dom";

export type SelectEvent = {
  create?: (modal: SelectModal) => void,
  content?: (modal: SelectModal) => void,
  mount?: (modal: SelectModal) => void
}

export type SelectOption = {
  text: string,
  value?: any
}

export type SelectButton = {
  text: string,
  icon?: string,
  click: (modal: SelectModal) => void
}

export type SelectCallback = (modal: SelectModal, data: SelectOption) => void;

export class SelectModal extends Modal {

  title: string = "Select";
  content: string = "";
  options: Array<SelectOption> = [];
  buttons: Array<SelectButton> = [];
  width?: string;
  height?: string;
  event: SelectEvent = {};
  storage: { [key: string]: any } = {};
  callback: SelectCallback = () => {};

  id = uuid();

  constructor(app: App, config: {
    title?: string,
    content?: string,
    options: Array<SelectOption>,
    buttons?: Array<SelectButton>,
    width?: string,
    height?: string,
    event?: SelectEvent,
    storage?: { [key: string]: any },
    callback: SelectCallback
  }) {
    super(app);
    this.title = config.title || this.title;
    this.content = config.content || this.content;
    this.options = config.options || this.options;
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

  selectElement: HTMLSelectElement;
  create() {
    let { contentEl } = this;

    if (this.width) this.modalEl.style.width = this.width;
    if (this.height) this.modalEl.style.height = this.height;

    contentEl.empty();

    if (this.event.create) this.event.create(this);

    contentEl.createEl("h1", { text: this.title });
    contentEl.createEl("p", { text: this.content });

    const area = createElement(contentEl.createEl("div"), { style: { paddingBottom: "10px" } });

    if (this.options.length) {
      this.selectElement = createElement("select", {
        class: "dropdown"
      }, this.options.map((i) => {
        return createElement("option", { text: i.text, value: i.value })
      }));
      area.append(this.selectElement)
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
        for (let i of this.options) {
          if (i.value === this.selectElement.value) {
            this.callback(this, i);
            break;
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